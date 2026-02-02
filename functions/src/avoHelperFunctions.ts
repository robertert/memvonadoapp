import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { VertexAI } from "@google-cloud/vertexai";
import { z } from "zod";
import {
  AvoQueryRequestSchema,
  AvoQueryResponseSchema,
  GetAvoQueryLimitResponseSchema,
  DAILY_AVO_QUERY_LIMIT,
} from "memvocado-types/schemas/api/avoHelper";
import { serializeTimestamps } from "./utils/serialization";

const db = getFirestore();

// Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Get today's date string in YYYY-MM-DD format
 * @return {string} Today's date string
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get AVO usage for the current day
 * @param {string} userId - User ID
 * @return {Promise<number>} AVO usage for the current day
 */
async function getAvoUsage(userId: string): Promise<number> {
  const today = getTodayDateString();
  const usageRef = db.doc(`users/${userId}/avoUsage/${today}`);
  const usageSnap = await usageRef.get();
  if (!usageSnap.exists) return 0;
  return usageSnap.data()?.count || 0;
}

/**
 * Increment AVO usage for the current day
 * @param {string} userId - User ID
 * @return {Promise<number>} AVO usage for the current day
 */
async function incrementAvoUsage(userId: string): Promise<number> {
  const today = getTodayDateString();
  const usageRef = db.doc(`users/${userId}/avoUsage/${today}`);
  await usageRef.set(
    {
      userId,
      date: today,
      count: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const usageSnap = await usageRef.get();
  return usageSnap.data()?.count || 1;
}

/**
 * Build AVO query prompt
 * @param {string} chipType - Chip type
 * @param {Object} cardContext - Card context
 * @param {string} responseLanguage - Response language
 * @param {string} customQuestion - Custom question
 * @return {string} AVO query prompt
 */
function buildAvoQueryPrompt(
  chipType: string,
  cardContext: { front: string; back: string; tags: string[]; deckName: string; frontLanguage?: string; backLanguage?: string },
  responseLanguage: string,
  customQuestion?: string | null
): string {
  const langMap: Record<string, string> = {
    pl: "Polish",
    en: "English",
    de: "German",
    es: "Spanish",
    fr: "French",
    it: "Italian",
    pt: "Portuguese"
  };
  const lang = langMap[responseLanguage] || "English";

  // Dodajemy informację o tym, żeby AVO był świadomy kontekstu edukacyjnego
  const cardInfo = `
--- CARD CONTENT ---
Front (Question/Term): "${cardContext.front}"
Back (Answer/Definition): "${cardContext.back}"
Deck Name: "${cardContext.deckName || "General Learning"}"
Tags: ${cardContext.tags.length > 0 ? cardContext.tags.join(", ") : "None"}
Languages: Front=${cardContext.frontLanguage || "Auto"}, Back=${cardContext.backLanguage || "Auto"}
--------------------`;

  // Base persona instructions
  const baseInstruction = `You are AVO, a friendly, energetic avocado mascot helping a student learn using flashcards. 
  Your goal is to be helpful, concise, and motivating. 
  **Crucial Instructions**:
  1. You must respond in **${lang}**.
  2. Keep your response under 300 words.
  3. Use formatting (bullet points, bold text) to make it scannable.
  4. Maintain educational accuracy while being friendly.
  5. **Safety & Appropriateness**: Ensure all content is suitable for students of all ages (PG-rated). Strictly avoid disruptive, disturbing, offensive, controversial, or NSFW themes/imagery.`;

  switch (chipType) {
    case "explain_answer":
      return `${baseInstruction}

${cardInfo}

**Task: Explain the answer/concept.**
Analyze the type of flashcard and provide the appropriate explanation:
1. **If it's Vocabulary/Language:** Explain the definition, grammar gender, etymology, or nuance. Why is this the correct translation?
2. **If it's an Exam Question/Fact (History, Science, Law):** Explain the reasoning behind the answer. Why is this fact true? Provide context or background info.
3. **If it's Code/Math:** Explain how the code works line-by-line or break down the formula/solution step-by-step.

Make the explanation clear and easy to understand for a student.`;

    case "mnemonic":
      return `${baseInstruction}

${cardInfo}

**Task: Create a Mnemonic Device.**
Help the student memorize the connection between the Front and the Back. 

**STRICT GUIDELINES FOR MNEMONICS (Do not hallucinate random stories):**
1. **Phonetic Anchors First:** For vocabulary, prioritize the "Keyword Method" (find a word in the student's language that *sounds like* the target word).
2. **Keep it Logical:** The mental image must have a clear link to the meaning. Do not generate random, incoherent absurdity.
3. **Simplicity Test:** If the mnemonic is more complex than the actual answer, do not use it.
4. **Appropriateness:** Keep associations "PG" (safe for work/school) and avoid overly disturbing imagery.

**Strategies to use:**
* **For Foreign Words:** Sound-alike word + Visualizing the meaning interacting with that sound.
* **For Lists:** An acronym (first letters).
* **For Abstract Facts:** A short, vivid story that causally links the Question to the Answer.

Provide 1-2 distinct, strong options. Explain *how* the association works briefly.`;

    case "use_in_sentence":
      return `${baseInstruction}

${cardInfo}

**Task: Contextual Usage.**
Show the student how to apply this knowledge in a real-world context:
1. **If it's Vocabulary:** Write 3 example sentences using the word (from Front or Back). Include translations if appropriate. Vary the tense and complexity.
2. **If it's a Concept/Fact (e.g., "Mitochondria"):** Describe a real-world scenario or a short paragraph where this concept is relevant or applied.
3. **If it's Code:** Provide a short, correct code snippet demonstrating how to use this function/syntax in a project.

Ensure the examples clarify the meaning/usage effectively.`;

    case "custom":
      return `${baseInstruction}

${cardInfo}

**Task: Answer User Question.**
The student asks: "${customQuestion ? customQuestion : "Tell me more about this."}"

**Guideline for answering:**
1. **Topic Anchor:** Use the flashcard content to understand *what topic* we are discussing.
2. **Expand Knowledge:** If the flashcard content is brief, incomplete, or just a summary (e.g., it says "formulas here" but doesn't list them), **use your own general knowledge** to provide the missing details, formulas, or explanations. 
3. **Do not limit yourself:** Do not say "this is not on the card". If the student asks for details related to the topic, provide them fully and accurately.
4. **Stay Relevant:** Only answer questions related to the educational topic of the card. If the question is completely unrelated (e.g., about weather), gently steer back.

Be helpful, educational, and act like a knowledgeable tutor who knows more than just what's written on the paper.`;

    default:
      return `${baseInstruction}\n\n${cardInfo}\n\nAnalyze this card and provide a helpful tip or summary to ensure the student understands the core concept.`;
  }
}

/**
 * AVO Query - answers student questions about flashcards
 */
export const avoQuery = onCall(
  { memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    const userId = auth.uid;

    const validationResult = AvoQueryRequestSchema.safeParse(request.data);
    if (!validationResult.success) {
      logger.error("AVO query validation failed", validationResult.error);
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: validationResult.error.issues,
      });
    }

    const { chipType, customQuestion, cardContext, responseLanguage } =
      validationResult.data;

    try {
      // Check daily limit
      const dailyLimit = await getUserAvoQueryLimit();
      const usedToday = await getAvoUsage(userId);
      if (usedToday >= dailyLimit) {
        logger.info("AVO query limit reached", { userId, usedToday });
        const response = {
          answer: responseLanguage === "pl"
            ? "Osiągnąłeś dzienny limit pytań. Wróć jutro!"
            : "You've reached your daily question limit. Come back tomorrow!",
          remainingToday: 0,
          isLimitReached: true,
        };
        return serializeTimestamps(AvoQueryResponseSchema.parse(response));
      }

      // Build prompt and call Gemini
      const prompt = buildAvoQueryPrompt(
        chipType,
        cardContext,
        responseLanguage,
        customQuestion
      );

      const model = vertexAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      });

      const answer =
        result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!answer) {
        throw new Error("No response from Gemini");
      }

      // Increment usage
      const newCount = await incrementAvoUsage(userId);
      const remainingAfter = Math.max(0, dailyLimit - newCount);

      logger.info("AVO query successful", {
        userId,
        chipType,
        usedToday: newCount,
        remainingToday: remainingAfter,
      });

      const response = {
        answer,
        remainingToday: remainingAfter,
        isLimitReached: remainingAfter === 0,
      };

      return serializeTimestamps(AvoQueryResponseSchema.parse(response));
    } catch (error) {
      logger.error("AVO query error", error);
      handleZodError(error, "avoQuery");

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to process AVO query");
    }
  }
);

/**
 * Get Limit for AVO Query
 * @param {string} userId - User ID
 * @return {Promise<number>} Daily Limit for AVO Query
 */
async function getUserAvoQueryLimit(): Promise<number> {
  const usageRef = db.doc(`admin/settings`);
  const usageSnap = await usageRef.get();
  return usageSnap.data()?.dailyAVOQueryLimit || DAILY_AVO_QUERY_LIMIT;
}


/**
 * Get AVO Query Limit - returns usage stats for the day
 */
export const getAvoQueryLimit = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const usedToday = await getAvoUsage(userId);
    const getLimit = await getUserAvoQueryLimit();
    const remainingToday = Math.max(0, getLimit - usedToday);

    const response = {
      usedToday,
      remainingToday,
      dailyLimit: getLimit,
      isLimitReached: remainingToday === 0,
    };

    return serializeTimestamps(GetAvoQueryLimitResponseSchema.parse(response));
  } catch (error) {
    logger.error("Error getting AVO query limit", error);
    handleZodError(error, "getAvoQueryLimit");

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to get AVO query limit");
  }
});

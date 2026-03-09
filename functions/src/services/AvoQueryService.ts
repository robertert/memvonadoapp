import { VertexAI } from "@google-cloud/vertexai";
import * as logger from "firebase-functions/logger";
import { DAILY_AVO_QUERY_LIMIT } from "memvocado-types/schemas/api/avoHelper";
import type { UsageRepository } from "../repositories/interfaces/UsageRepository";

const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function buildAvoQueryPrompt(
  chipType: string,
  cardContext: { front: string; back: string; tags: string[]; deckName: string; frontLanguage?: string; backLanguage?: string },
  responseLanguage: string,
  customQuestion?: string | null
): string {
  const langMap: Record<string, string> = {
    pl: "Polish", en: "English", de: "German", es: "Spanish", fr: "French", it: "Italian", pt: "Portuguese",
  };
  const lang = langMap[responseLanguage] || "English";

  const cardInfo = `
--- CARD CONTENT ---
Front (Question/Term): "${cardContext.front}"
Back (Answer/Definition): "${cardContext.back}"
Deck Name: "${cardContext.deckName || "General Learning"}"
Tags: ${cardContext.tags.length > 0 ? cardContext.tags.join(", ") : "None"}
Languages: Front=${cardContext.frontLanguage || "Auto"}, Back=${cardContext.backLanguage || "Auto"}
--------------------`;

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
      return `${baseInstruction}\n\n${cardInfo}\n\n**Task: Explain the answer/concept.**\nAnalyze the type of flashcard and provide the appropriate explanation:\n1. **If it's Vocabulary/Language:** Explain the definition, grammar gender, etymology, or nuance. Why is this the correct translation?\n2. **If it's an Exam Question/Fact (History, Science, Law):** Explain the reasoning behind the answer. Why is this fact true? Provide context or background info.\n3. **If it's Code/Math:** Explain how the code works line-by-line or break down the formula/solution step-by-step.\n\nMake the explanation clear and easy to understand for a student.`;

    case "mnemonic":
      return `${baseInstruction}\n\n${cardInfo}\n\n**Task: Create a Mnemonic Device.**\nHelp the student memorize the connection between the Front and the Back. \n\n**STRICT GUIDELINES FOR MNEMONICS (Do not hallucinate random stories):**\n1. **Phonetic Anchors First:** For vocabulary, prioritize the "Keyword Method" (find a word in the student's language that *sounds like* the target word).\n2. **Keep it Logical:** The mental image must have a clear link to the meaning. Do not generate random, incoherent absurdity.\n3. **Simplicity Test:** If the mnemonic is more complex than the actual answer, do not use it.\n4. **Appropriateness:** Keep associations "PG" (safe for work/school) and avoid overly disturbing imagery.\n\n**Strategies to use:**\n* **For Foreign Words:** Sound-alike word + Visualizing the meaning interacting with that sound.\n* **For Lists:** An acronym (first letters).\n* **For Abstract Facts:** A short, vivid story that causally links the Question to the Answer.\n\nProvide 1-2 distinct, strong options. Explain *how* the association works briefly.`;

    case "use_in_sentence":
      return `${baseInstruction}\n\n${cardInfo}\n\n**Task: Contextual Usage.**\nShow the student how to apply this knowledge in a real-world context:\n1. **If it's Vocabulary:** Write 3 example sentences using the word (from Front or Back). Include translations if appropriate. Vary the tense and complexity.\n2. **If it's a Concept/Fact (e.g., "Mitochondria"):** Describe a real-world scenario or a short paragraph where this concept is relevant or applied.\n3. **If it's Code:** Provide a short, correct code snippet demonstrating how to use this function/syntax in a project.\n\nEnsure the examples clarify the meaning/usage effectively.`;

    case "custom":
      return `${baseInstruction}\n\n${cardInfo}\n\n**Task: Answer User Question.**\nThe student asks: "${customQuestion ? customQuestion : "Tell me more about this."}"\n\n**Guideline for answering:**\n1. **Topic Anchor:** Use the flashcard content to understand *what topic* we are discussing.\n2. **Expand Knowledge:** If the flashcard content is brief, incomplete, or just a summary (e.g., it says "formulas here" but doesn't list them), **use your own general knowledge** to provide the missing details, formulas, or explanations. \n3. **Do not limit yourself:** Do not say "this is not on the card". If the student asks for details related to the topic, provide them fully and accurately.\n4. **Stay Relevant:** Only answer questions related to the educational topic of the card. If the question is completely unrelated (e.g., about weather), gently steer back.\n\nBe helpful, educational, and act like a knowledgeable tutor who knows more than just what's written on the paper.`;

    default:
      return `${baseInstruction}\n\n${cardInfo}\n\nAnalyze this card and provide a helpful tip or summary to ensure the student understands the core concept.`;
  }
}

export class AvoQueryService {
  constructor(private readonly usageRepo: UsageRepository) {}

  private async getDailyLimit(): Promise<number> {
    const limit = await this.usageRepo.getAdminLimit("dailyAVOQueryLimit");
    return limit || DAILY_AVO_QUERY_LIMIT;
  }

  async getLimit(userId: string): Promise<{
    usedToday: number;
    remainingToday: number;
    dailyLimit: number;
    isLimitReached: boolean;
  }> {
    const today = getTodayDateString();
    const [usedToday, dailyLimit] = await Promise.all([
      this.usageRepo.getUsage(userId, today),
      this.getDailyLimit(),
    ]);
    const remainingToday = Math.max(0, dailyLimit - usedToday);
    return { usedToday, remainingToday, dailyLimit, isLimitReached: remainingToday === 0 };
  }

  async query(params: {
    userId: string;
    chipType: string;
    customQuestion?: string | null;
    cardContext: { front: string; back: string; tags: string[]; deckName: string; frontLanguage?: string; backLanguage?: string };
    responseLanguage: string;
  }): Promise<{
    answer: string;
    remainingToday: number;
    isLimitReached: boolean;
  }> {
    const { userId, chipType, customQuestion, cardContext, responseLanguage } = params;
    const today = getTodayDateString();
    const dailyLimit = await this.getDailyLimit();
    const usedToday = await this.usageRepo.getUsage(userId, today);

    if (usedToday >= dailyLimit) {
      logger.info("AVO query limit reached", { userId, usedToday });
      return {
        answer: responseLanguage === "pl"
          ? "Osiągnąłeś dzienny limit pytań. Wróć jutro!"
          : "You've reached your daily question limit. Come back tomorrow!",
        remainingToday: 0,
        isLimitReached: true,
      };
    }

    const prompt = buildAvoQueryPrompt(chipType, cardContext, responseLanguage, customQuestion);
    const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    });

    const answer = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!answer) throw new Error("No response from Gemini");

    const newCount = await this.usageRepo.incrementUsage(userId, today);
    const remainingAfter = Math.max(0, dailyLimit - newCount);

    logger.info("AVO query successful", { userId, chipType, usedToday: newCount, remainingToday: remainingAfter });

    return { answer, remainingToday: remainingAfter, isLimitReached: remainingAfter === 0 };
  }
}

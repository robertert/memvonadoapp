import { TranslationServiceClient } from "@google-cloud/translate";
import { VertexAI } from "@google-cloud/vertexai";
import * as logger from "firebase-functions/logger";
import { DAILY_TRANSLATION_LIMIT } from "memvocado-types/schemas/api/translation";
import type { UsageRepository } from "../repositories/interfaces/UsageRepository";

const translationClient = new TranslationServiceClient();
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "memvocado";
const LOCATION = "global";

const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

/**
 * @return {string} Today's date as YYYY-MM-DD
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * @return {string} ISO string of tomorrow midnight UTC
 */
function getTomorrowMidnightUTC(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Service for text translation with daily usage limits.
 * @class
 */
export class TranslationService {
  /**
   * @param {UsageRepository} usageRepo - Usage repository
   */
  constructor(private readonly usageRepo: UsageRepository) { }

  /**
   * @param {string} userId - User ID
   * @return {Promise<object>} Current translation limit status
   */
  async getLimit(userId: string): Promise<{
    usedToday: number;
    remainingToday: number;
    dailyLimit: number;
    isLimitReached: boolean;
    resetsAt: string;
  }> {
    const today = getTodayDateString();
    const usedToday = await this.usageRepo.getUsage(userId, today);
    const remainingToday = Math.max(0, DAILY_TRANSLATION_LIMIT - usedToday);
    return {
      usedToday,
      remainingToday,
      dailyLimit: DAILY_TRANSLATION_LIMIT,
      isLimitReached: remainingToday === 0,
      resetsAt: getTomorrowMidnightUTC(),
    };
  }

  /**
   * @param {object} params - Translation parameters
   * @return {Promise<object>} Translation result
   */
  async translate(params: {
    userId: string;
    text: string;
    fromLanguage: string;
    toLanguage: string;
  }): Promise<{
    success: boolean;
    translatedText: string | null;
    fromLanguage: string;
    toLanguage: string;
    remainingToday: number;
    isLimitReached: boolean;
  }> {
    const { userId, text, fromLanguage, toLanguage } = params;
    const today = getTodayDateString();
    const usedToday = await this.usageRepo.getUsage(userId, today);
    const remainingBefore = DAILY_TRANSLATION_LIMIT - usedToday;

    if (remainingBefore <= 0) {
      logger.info("Translation limit reached", { userId, usedToday });
      return { success: false, translatedText: null, fromLanguage, toLanguage, remainingToday: 0, isLimitReached: true };
    }

    try {
      const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;
      const [response] = await translationClient.translateText({
        parent,
        contents: [text],
        mimeType: "text/plain",
        sourceLanguageCode: fromLanguage,
        targetLanguageCode: toLanguage,
      });

      const translatedText = response.translations?.[0]?.translatedText || null;
      if (!translatedText) throw new Error("No translation returned from API");

      const newCount = await this.usageRepo.incrementUsage(userId, today);
      const remainingAfter = Math.max(0, DAILY_TRANSLATION_LIMIT - newCount);

      logger.info("Translation successful", { userId, fromLanguage, toLanguage, usedToday: newCount, remainingToday: remainingAfter });

      return { success: true, translatedText, fromLanguage, toLanguage, remainingToday: remainingAfter, isLimitReached: remainingAfter === 0 };
    } catch (error) {
      logger.error("Translation error", error);
      const remaining = Math.max(0, DAILY_TRANSLATION_LIMIT - (await this.usageRepo.getUsage(userId, today)));
      return { success: false, translatedText: null, fromLanguage, toLanguage, remainingToday: remaining, isLimitReached: false };
    }
  }

  /**
   * @param {object} params - Suggestion parameters
   * @return {Promise<string[]>} Up to 3 translation suggestions from Gemini
   */
  async getSuggestions(params: {
    text: string;
    fromLanguage: string;
    toLanguage: string;
  }): Promise<string[]> {
    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 128,
      },
    });

    const prompt = `Translate the word or phrase from ${params.fromLanguage} to ${params.toLanguage}.
Provide up to 3 different natural translation options (e.g. formal, informal, colloquial where applicable).
Return ONLY a valid JSON array of strings, max 3 elements, no explanation.
Text: "${params.text}"`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const raw = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((s) => typeof s === "string" && s.trim()).slice(0, 3);
  }
}

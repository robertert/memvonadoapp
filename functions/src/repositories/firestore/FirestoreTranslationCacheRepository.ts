import { getFirestore } from "firebase-admin/firestore";
import type { TranslationCacheRepository } from "../interfaces/TranslationCacheRepository";

const db = getFirestore();

/**
 * Firestore implementation of the translation cache repository.
 */
export class FirestoreTranslationCacheRepository implements TranslationCacheRepository {
  /**
   * @param {string} text - Source text
   * @param {string} from - Source language code
   * @param {string} to - Target language code
   * @return {string} Firestore document ID
   */
  private docId(text: string, from: string, to: string): string {
    return `${text.toLowerCase().trim()}__${from}__${to}`;
  }

  /**
   * @param {string} text - Source text
   * @param {string} from - Source language code
   * @param {string} to - Target language code
   * @return {Promise<string[] | null>} Cached suggestions or null
   */
  async get(text: string, from: string, to: string): Promise<string[] | null> {
    const snap = await db.collection("translations_cache").doc(this.docId(text, from, to)).get();
    if (!snap.exists) return null;
    return snap.data()?.suggestions as string[] | null ?? null;
  }

  /**
   * @param {string} text - Source text
   * @param {string} from - Source language code
   * @param {string} to - Target language code
   * @param {string[]} suggestions - Suggestions to cache
   * @return {Promise<void>}
   */
  async set(text: string, from: string, to: string, suggestions: string[]): Promise<void> {
    await db.collection("translations_cache").doc(this.docId(text, from, to)).set({
      text: text.toLowerCase().trim(),
      fromLanguage: from,
      toLanguage: to,
      suggestions,
      cachedAt: new Date(),
    });
  }
}

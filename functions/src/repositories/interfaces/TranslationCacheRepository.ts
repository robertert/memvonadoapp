export interface TranslationCacheRepository {
  get(text: string, from: string, to: string): Promise<string[] | null>;
  set(text: string, from: string, to: string, suggestions: string[]): Promise<void>;
}

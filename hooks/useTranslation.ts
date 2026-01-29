import { useState, useCallback, useEffect } from "react";
import { cloudFunctions } from "@/services/cloudFunctions";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  DAILY_TRANSLATION_LIMIT,
} from "@/types/schemas/api/translation";

export interface UseTranslationReturn {
  translate: (
    text: string,
    from: string,
    to: string
  ) => Promise<string | null>;
  isTranslating: boolean;
  error: string | null;
  isSupported: (from: string, to: string) => boolean;
  remainingToday: number;
  isLimitReached: boolean;
  refreshLimit: () => Promise<void>;
}

/**
 * Hook for translating text with rate limiting
 *
 * Supported languages: en, pl, de, es, fr, it, pt
 * Daily limit: 200 translations per user
 */
export function useTranslation(): UseTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingToday, setRemainingToday] = useState(DAILY_TRANSLATION_LIMIT);
  const [isLimitReached, setIsLimitReached] = useState(false);

  // Check if both languages are supported
  const isSupported = useCallback((from: string, to: string): boolean => {
    const supportedSet = new Set(SUPPORTED_LANGUAGES);
    return (
      supportedSet.has(from as SupportedLanguage) &&
      supportedSet.has(to as SupportedLanguage) &&
      from !== to
    );
  }, []);

  // Refresh the limit status from backend
  const refreshLimit = useCallback(async () => {
    try {
      const result = await cloudFunctions.getTranslationLimit();
      setRemainingToday(result.remainingToday);
      setIsLimitReached(result.isLimitReached);
    } catch (err) {
      console.error("Error refreshing translation limit:", err);
    }
  }, []);

  // Fetch limit status on mount
  useEffect(() => {
    refreshLimit();
  }, [refreshLimit]);

  // Translate text
  const translate = useCallback(
    async (
      text: string,
      from: string,
      to: string
    ): Promise<string | null> => {
      // Validate input
      if (!text.trim()) {
        setError("Tekst do tlumaczenia nie moze byc pusty");
        return null;
      }

      if (!isSupported(from, to)) {
        setError("Nieobslugiwana kombinacja jezykow");
        return null;
      }

      // Check if limit is already reached
      if (isLimitReached) {
        setError("Osiagnieto dzienny limit tlumaczen (200). Sprobuj jutro.");
        return null;
      }

      setIsTranslating(true);
      setError(null);

      try {
        const result = await cloudFunctions.translateText(
          text,
          from as SupportedLanguage,
          to as SupportedLanguage
        );

        // Update remaining count
        setRemainingToday(result.remainingToday);
        setIsLimitReached(result.isLimitReached);

        // Check if limit was reached
        if (result.isLimitReached && !result.success) {
          setError("Osiagnieto dzienny limit tlumaczen (200). Sprobuj jutro.");
          return null;
        }

        // Check for translation failure
        if (!result.success || !result.translatedText) {
          setError("Nie udalo sie przetlumaczyc tekstu. Sprobuj ponownie.");
          return null;
        }

        return result.translatedText;
      } catch (err) {
        console.error("Translation error:", err);
        setError("Blad polaczenia. Sprawdz internet i sprobuj ponownie.");
        return null;
      } finally {
        setIsTranslating(false);
      }
    },
    [isSupported, isLimitReached]
  );

  return {
    translate,
    isTranslating,
    error,
    isSupported,
    remainingToday,
    isLimitReached,
    refreshLimit,
  };
}

export default useTranslation;

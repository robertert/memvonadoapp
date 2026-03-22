import { useState, useEffect, useRef, useCallback } from "react";
import { cloudFunctions } from "@/services/cloudFunctions";
import type { SupportedLanguage } from "@/types/schemas/api/translation";

export function useTranslationSuggestions(
  text: string,
  fromLanguage: SupportedLanguage,
  toLanguage: SupportedLanguage,
  filterValue?: string
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (t: string, from: SupportedLanguage, to: SupportedLanguage) => {
    if (!t.trim() || from === to) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await cloudFunctions.getTranslationSuggestions({
        text: t.trim(),
        fromLanguage: from,
        toLanguage: to,
      });
      setSuggestions(res.suggestions);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(() => {
      fetchSuggestions(text, fromLanguage, toLanguage);
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, fromLanguage, toLanguage, fetchSuggestions]);

  const displayed = filterValue?.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(filterValue.toLowerCase()))
    : suggestions;

  return { suggestions: displayed };
}

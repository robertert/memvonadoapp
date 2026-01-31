import { useState, useCallback, useContext } from "react";
import { cloudFunctions } from "@/services/cloudFunctions";
import { SettingsContext } from "@/store/settings-context";
import type { AvoChipType, AvoCardContext } from "@/types/schemas/api/avoHelper";

export interface AvoMessage {
  id: string;
  type: "user_chip" | "user_custom" | "avo_response";
  chipType?: AvoChipType;
  text: string;
  timestamp: number;
}

export type AvoMood = "neutral" | "happy" | "sad";

const CHIP_LABELS: Record<AvoChipType, string> = {
  explain_answer: "Wyjaśnij",
  mnemonic: "Mnemotechnika",
  use_in_sentence: "Użyj w zdaniu",
  custom: "Zapytaj...",
};

export function useAvoHelper() {
  const { avoLanguage } = useContext(SettingsContext);
  const [messages, setMessages] = useState<AvoMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState<AvoMood>("neutral");
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);

  const sendQuery = useCallback(
    async (
      chipType: AvoChipType,
      cardContext: AvoCardContext,
      customQuestion?: string
    ) => {
      // Add user message
      const userMsg: AvoMessage = {
        id: `user_${Date.now()}`,
        type: chipType === "custom" ? "user_custom" : "user_chip",
        chipType,
        text: chipType === "custom" && customQuestion
          ? customQuestion
          : CHIP_LABELS[chipType],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const result = await cloudFunctions.avoQuery(
          chipType,
          cardContext,
          avoLanguage,
          customQuestion
        );

        const avoMsg: AvoMessage = {
          id: `avo_${Date.now()}`,
          type: "avo_response",
          text: result.answer,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, avoMsg]);
        setRemainingQueries(result.remainingToday);
        setIsLimitReached(result.isLimitReached);
      } catch (error) {
        console.error(error);
        const errorMsg: AvoMessage = {
          id: `avo_err_${Date.now()}`,
          type: "avo_response",
          text: avoLanguage === "pl"
            ? "Ups, coś poszło nie tak. Spróbuj ponownie!"
            : "Oops, something went wrong. Try again!",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [avoLanguage]
  );

  const trackAnswer = useCallback((isCorrect: boolean) => {
    setMood((prev) => {
      if (isCorrect) return "happy";
      return "sad";
    });
    // Reset mood after a short delay
    setTimeout(() => setMood("neutral"), 2000);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setIsOpen(false);
    setMood("neutral");
    setRemainingQueries(null);
    setIsLimitReached(false);
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    mood,
    remainingQueries,
    isLimitReached,
    sendQuery,
    trackAnswer,
    toggle,
    close,
    resetSession,
  };
}

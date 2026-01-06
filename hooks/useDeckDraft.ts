import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "@/constants/settings";
import { generageRandomUid } from "@/constants/colors";
import type { CardCore } from "@/types";

interface EditableCard extends CardCore {
  id: string;
  isNew: boolean;
  isDirty?: boolean;
}

interface DraftData {
  title: string;
  cards: EditableCard[];
  deckCategory: string;
  frontLanguage: string;
  backLanguage: string;
  savedAt: number;
}

const DRAFT_KEY = "deck_draft";

export function useDeckDraft(
  cards: EditableCard[],
  title: string,
  deckCategory: string,
  frontLanguage: string,
  backLanguage: string
) {
  const [draftFound, setDraftFound] = useState<DraftData | null>(null);
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft on mount (only for create mode)
  const loadDraft = async (cardsFromParams?: string) => {
    try {
      if (cardsFromParams) {
        // If cards are passed via params, load them directly
        const gotCards = JSON.parse(cardsFromParams).map((card: any) => ({
          id: generageRandomUid(),
          cardData: {
            front: card.front,
            back: card.back,
          },
          tags: card.tags || [],
          isNew: true,
        })) as EditableCard[];
        return gotCards;
      } else {
        // Check if draft exists in AsyncStorage
        const draftData = await AsyncStorage.getItem(DRAFT_KEY);
        if (draftData) {
          try {
            const draft = JSON.parse(draftData) as DraftData;
            if (draft.title || (draft.cards && draft.cards.length > 0)) {
              // Draft found - show modal to ask user
              setDraftFound(draft);
              setShowDraftModal(true);
              return null; // Return null to indicate modal should be shown
            }
          } catch (parseError) {
            console.error("Error parsing draft:", parseError);
            // Clear corrupted draft
            await AsyncStorage.removeItem(DRAFT_KEY);
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error loading draft:", error);
      return null;
    }
  };

  // Save draft to AsyncStorage (autosave)
  const saveDraft = async () => {
    try {
      const hasContent = title.trim().length > 0 || cards.length > 0;
      if (!hasContent) {
        // Clear draft if empty
        await AsyncStorage.removeItem(DRAFT_KEY);
        return;
      }

      const draft: DraftData = {
        title,
        cards: cards.map((card) => ({
          id: card.id,
          cardData: card.cardData,
          tags: card.tags,
          isNew: card.isNew,
          isDirty: card.isDirty,
        })),
        deckCategory,
        frontLanguage,
        backLanguage,
        savedAt: Date.now(),
      };

      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  // Clear draft
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  // Handle user choice: continue with draft
  const handleContinueDraft = () => {
    if (draftFound) {
      const cardsWithId = (draftFound.cards || []).map((card: any) => ({
        id: card.id || generageRandomUid(),
        cardData: card.cardData || { front: "", back: "" },
        tags: card.tags || [],
        isNew: card.isNew !== undefined ? card.isNew : true,
        isDirty: card.isDirty || false,
      })) as EditableCard[];

      setShowDraftModal(false);
      const draft = draftFound;
      setDraftFound(null);

      return {
        title: draft.title || "",
        cards: cardsWithId,
        deckCategory: draft.deckCategory || CATEGORY_OPTIONS[0],
        frontLanguage: draft.frontLanguage || LANGUAGE_OPTIONS[0]?.code || "en",
        backLanguage:
          draft.backLanguage ||
          LANGUAGE_OPTIONS[1]?.code ||
          LANGUAGE_OPTIONS[0]?.code ||
          "pl",
      };
    }
    setShowDraftModal(false);
    setDraftFound(null);
    return null;
  };

  // Handle user choice: start fresh
  const handleStartFresh = async () => {
    // Clear the draft
    await clearDraft();
    setShowDraftModal(false);
    setDraftFound(null);
  };

  // Autosave draft (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if there's actual content
    const hasContent = title.trim().length > 0 || cards.length > 0;
    if (!hasContent) return;

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000); // 2 seconds debounce

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cards, title, deckCategory, frontLanguage, backLanguage]);

  return {
    draftFound,
    showDraftModal,
    loadDraft,
    saveDraft,
    clearDraft,
    handleContinueDraft,
    handleStartFresh,
  };
}

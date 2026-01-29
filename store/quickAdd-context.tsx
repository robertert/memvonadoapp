import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage keys
const LAST_USED_DECK_KEY = "quick_add_last_deck";
const PENDING_QUICK_ADD_KEY = "quick_add_pending";

// Types
export type QuickAddSource = "widget" | "ocr" | "deeplink" | "manual";

export interface QuickAddParams {
  front?: string;
  back?: string;
  deckId?: string;
  source?: QuickAddSource;
  autoTranslate?: boolean;
}

interface QuickAddContextType {
  // Modal state
  isVisible: boolean;
  params: QuickAddParams;

  // Actions
  showQuickAdd: (params?: QuickAddParams) => void;
  hideQuickAdd: () => void;

  // Last used deck
  lastUsedDeckId: string | null;
  setLastUsedDeckId: (deckId: string) => void;

  // Pending deep link handling (for when app is not logged in)
  setPendingQuickAdd: (params: QuickAddParams) => Promise<void>;
  consumePendingQuickAdd: () => Promise<QuickAddParams | null>;
}

export const QuickAddContext = createContext<QuickAddContextType>({
  isVisible: false,
  params: {},
  showQuickAdd: () => {},
  hideQuickAdd: () => {},
  lastUsedDeckId: null,
  setLastUsedDeckId: () => {},
  setPendingQuickAdd: async () => {},
  consumePendingQuickAdd: async () => null,
});

// Custom hook for easy access
export function useQuickAdd() {
  return useContext(QuickAddContext);
}

interface QuickAddProviderProps {
  children: ReactNode;
}

export function QuickAddProvider({
  children,
}: QuickAddProviderProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [params, setParams] = useState<QuickAddParams>({});
  const [lastUsedDeckId, setLastUsedDeckIdState] = useState<string | null>(null);

  // Load last used deck on mount
  useEffect(() => {
    const loadLastUsedDeck = async () => {
      try {
        const deckId = await AsyncStorage.getItem(LAST_USED_DECK_KEY);
        if (deckId) {
          setLastUsedDeckIdState(deckId);
        }
      } catch (error) {
        console.error("Error loading last used deck:", error);
      }
    };
    loadLastUsedDeck();
  }, []);

  const showQuickAdd = useCallback((newParams?: QuickAddParams) => {
    setParams(newParams || {});
    setIsVisible(true);
  }, []);

  const hideQuickAdd = useCallback(() => {
    setIsVisible(false);
    setParams({});
  }, []);

  const setLastUsedDeckId = useCallback(async (deckId: string) => {
    try {
      await AsyncStorage.setItem(LAST_USED_DECK_KEY, deckId);
      setLastUsedDeckIdState(deckId);
    } catch (error) {
      console.error("Error saving last used deck:", error);
    }
  }, []);

  // Store pending quick add for post-login handling
  const setPendingQuickAdd = useCallback(async (pendingParams: QuickAddParams) => {
    try {
      await AsyncStorage.setItem(
        PENDING_QUICK_ADD_KEY,
        JSON.stringify(pendingParams)
      );
    } catch (error) {
      console.error("Error saving pending quick add:", error);
    }
  }, []);

  // Consume and clear pending quick add
  const consumePendingQuickAdd = useCallback(async () => {
    try {
      const pending = await AsyncStorage.getItem(PENDING_QUICK_ADD_KEY);
      if (pending) {
        await AsyncStorage.removeItem(PENDING_QUICK_ADD_KEY);
        return JSON.parse(pending) as QuickAddParams;
      }
      return null;
    } catch (error) {
      console.error("Error consuming pending quick add:", error);
      return null;
    }
  }, []);

  const value: QuickAddContextType = {
    isVisible,
    params,
    showQuickAdd,
    hideQuickAdd,
    lastUsedDeckId,
    setLastUsedDeckId,
    setPendingQuickAdd,
    consumePendingQuickAdd,
  };

  return (
    <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
  );
}

export default QuickAddProvider;

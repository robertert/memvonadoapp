import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { useCardLogic } from "../app/stack/useCardLogic";
import { UserContext } from "../store/user-context";

// Mock data
const mockUserContext = {
  id: "test-user-id",
  name: "Test User",
  getUser: jest.fn(),
  delUser: jest.fn(),
};

const mockDeck = {
  id: "test-deck-id",
  title: "Test Deck",
  description: "Test deck description",
};

const mockCard = {
  id: "card-1",
  cardData: {
    front: "What is the capital of France?",
    back: "Paris",
    tags: ["geography", "capitals"],
  },
  firstLearn: {
    isNew: true,
    due: Date.now(),
    state: 0,
    consecutiveGood: 0,
  },
  cardAlgo: {
    difficulty: 2.5,
    stability: 0,
    reps: 0,
    lapses: 0,
    scheduled_days: 0,
    elapsed_days: 0,
    last_review: Date.now(),
    state: 0,
    due: Date.now(),
  },
};

const mockUserSettings = {
  dailyGoal: 10,
  dailyNew: 5,
};

// Mock implementations are in jest.setup.js

// Test wrapper with UserContext
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider value={mockUserContext}>
    {children}
  </UserContext.Provider>
);

describe("useCardLogic", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue({
      deck: mockDeck,
    });
    (global.mockCloudFunctions.getUserSettings as jest.Mock).mockResolvedValue({
      settings: mockUserSettings,
    });
    (global.mockCloudFunctions.getDueDeckCards as jest.Mock).mockResolvedValue({
      cards: [],
    });
    (global.mockCloudFunctions.getNewDeckCards as jest.Mock).mockResolvedValue({
      cards: [mockCard],
    });
    (
      global.mockCloudFunctions.updateCardProgress as jest.Mock
    ).mockResolvedValue({});
  });

  describe("Inicjalizacja", () => {
    it("powinien zainicjalizować się z domyślnymi wartościami", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      expect(result.current.cardLogicState.isLoading).toBe(true);
      expect(result.current.cardLogicState.cards).toEqual([]);
      expect(result.current.cardLogicState.doneCards).toEqual([]);
      expect(result.current.cardLogicState.progress).toEqual({
        easy: 0,
        hard: 0,
        good: 0,
        wrong: 0,
        todo: 10,
        all: 20,
      });
    });

    it("powinien załadować karty po inicjalizacji", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(global.mockCloudFunctions.getDeckDetails).toHaveBeenCalledWith(
        "test-deck-id"
      );
      expect(global.mockCloudFunctions.getUserSettings).toHaveBeenCalledWith(
        "test-user-id"
      );
      expect(global.mockCloudFunctions.getDueDeckCards).toHaveBeenCalled();
      expect(global.mockCloudFunctions.getNewDeckCards).toHaveBeenCalled();
    });
  });

  describe("Obsługa błędów", () => {
    it("powinien obsłużyć błąd podczas ładowania kart", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockRejectedValue(
        new Error("Failed to fetch deck")
      );

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
      expect(result.current.cardLogicState.isLoading).toBe(false);
    });

    it("powinien wyczyścić błąd po wywołaniu clearError", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockRejectedValue(
        new Error("Failed to fetch deck")
      );

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe("Funkcje pomocnicze", () => {
    it("powinien zwrócić wszystkie wymagane funkcje", () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.setCards).toBe("function");
      expect(typeof result.current.setIsBack).toBe("function");
      expect(typeof result.current.setTooltip).toBe("function");
      expect(typeof result.current.setProgress).toBe("function");
      expect(typeof result.current.newCard).toBe("function");
      expect(typeof result.current.updateCards).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  describe("Stan kart", () => {
    it("powinien aktualizować stan kart", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const newCards = [mockCard];
      act(() => {
        result.current.setCards(newCards);
      });

      expect(result.current.cardLogicState.cards).toEqual(newCards);
    });

    it("powinien aktualizować stan isBack", () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setIsBack(true);
      });

      expect(result.current.cardLogicState.isBack).toBe(true);
    });

    it("powinien aktualizować tooltip", () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      const newTooltip = {
        shown: true,
        color: "red",
        textColor: "white",
        text: "Test tooltip",
      };

      act(() => {
        result.current.setTooltip(newTooltip);
      });

      expect(result.current.cardLogicState.tooltip).toEqual(newTooltip);
    });

    it("powinien aktualizować progress", () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      const newProgress = {
        easy: 5,
        hard: 3,
        good: 10,
        wrong: 2,
        todo: 15,
        all: 30,
      };

      act(() => {
        result.current.setProgress(newProgress);
      });

      expect(result.current.cardLogicState.progress).toEqual(newProgress);
    });
  });
});

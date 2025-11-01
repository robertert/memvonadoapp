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

const mockUserSettings = {
  dailyGoal: 10,
  dailyNew: 5,
};

// Mock implementations are in jest.setup.js

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider value={mockUserContext}>
    {children}
  </UserContext.Provider>
);

describe("Card State Transitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue({
      deck: { id: "test-deck", title: "Test Deck" },
    });
    (global.mockCloudFunctions.getUserSettings as jest.Mock).mockResolvedValue({
      settings: mockUserSettings,
    });
    (global.mockCloudFunctions.getDueDeckCards as jest.Mock).mockResolvedValue({
      cards: [],
    });
    (global.mockCloudFunctions.getNewDeckCards as jest.Mock).mockResolvedValue({
      cards: [],
    });
    (
      global.mockCloudFunctions.updateCardProgress as jest.Mock
    ).mockResolvedValue({});
  });

  describe("Przejście z First Learning do FSRS", () => {
    it("powinien przeprowadzić pełne przejście z First Learning do FSRS", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Karta w First Learning po pierwszej dobrej odpowiedzi
      const cardInFirstLearning = {
        id: "card-1",
        cardData: {
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["geography", "capitals"],
        },
        firstLearn: {
          isNew: true,
          due: new Date(Date.now() + 10 * 60 * 1000),
          state: 1,
          consecutiveGood: 1,
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
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([cardInFirstLearning]);
      });

      // Druga dobra odpowiedź - graduacja
      act(() => {
        result.current.newCard("good");
      });

      // Sprawdź przejście do FSRS
      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      const graduatedCard = result.current.cardLogicState.doneCards[0];

      expect(graduatedCard.firstLearn?.isNew).toBe(false);
      expect(graduatedCard.firstLearn?.consecutiveGood).toBe(2);

      // Sprawdź czy karta została usunięta z aktywnych kart
      expect(result.current.cardLogicState.cards).toHaveLength(0);
    });

    it("powinien zachować dane karty podczas przejścia", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const originalCard = {
        id: "card-1",
        cardData: {
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["geography", "capitals"],
        },
        firstLearn: {
          isNew: true,
          due: new Date(Date.now() + 10 * 60 * 1000),
          state: 1,
          consecutiveGood: 1,
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
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([originalCard]);
      });

      act(() => {
        result.current.newCard("good");
      });

      const graduatedCard = result.current.cardLogicState.doneCards[0];

      // Sprawdź czy dane karty zostały zachowane
      expect(graduatedCard.id).toBe(originalCard.id);
      expect(graduatedCard.cardData).toEqual(originalCard.cardData);
      // FSRS modyfikuje cardAlgo; sprawdzamy kluczowe atrybuty
      expect(new Date(graduatedCard.cardAlgo.due).getTime()).toBeGreaterThan(
        Date.now() - 1000
      );
      expect(graduatedCard.cardAlgo.reps).toBeGreaterThanOrEqual(
        originalCard.cardAlgo.reps
      );
    });
  });

  describe("Przejście z FSRS do doneCards", () => {
    it("powinien przenieść kartę FSRS do doneCards po odpowiedzi", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const fsrsCard = {
        id: "card-1",
        cardData: {
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["geography", "capitals"],
        },
        firstLearn: {
          isNew: false,
          due: Date.now(),
          state: 0,
          consecutiveGood: 0,
        },
        cardAlgo: {
          difficulty: 2.5,
          stability: 2.5,
          reps: 1,
          lapses: 0,
          scheduled_days: 1,
          elapsed_days: 1,
          last_review: Date.now() - 24 * 60 * 60 * 1000,
          state: 1,
          due: Date.now(),
        },
        grade: 0,
        difficulty: 2.5,
        interval: 1,
      };

      act(() => {
        result.current.setCards([fsrsCard]);
      });

      act(() => {
        result.current.newCard("good");
      });

      // Sprawdź czy karta została przeniesiona do doneCards
      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      expect(result.current.cardLogicState.cards).toHaveLength(0);

      const doneCard = result.current.cardLogicState.doneCards[0];
      expect(doneCard.id).toBe(fsrsCard.id);
      expect(doneCard.firstLearn?.isNew).toBe(false);
    });

    it('powinien zachować kartę FSRS w sesji po odpowiedzi "Wrong"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const fsrsCard = {
        id: "card-1",
        cardData: {
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["geography", "capitals"],
        },
        firstLearn: {
          isNew: false,
          due: Date.now(),
          state: 0,
          consecutiveGood: 0,
        },
        cardAlgo: {
          difficulty: 2.5,
          stability: 2.5,
          reps: 1,
          lapses: 0,
          scheduled_days: 1,
          elapsed_days: 1,
          last_review: Date.now() - 24 * 60 * 60 * 1000,
          state: 1,
          due: Date.now(),
        },
        grade: 0,
        difficulty: 2.5,
        interval: 1,
      };

      act(() => {
        result.current.setCards([fsrsCard]);
      });

      act(() => {
        result.current.newCard("wrong");
      });

      // Sprawdź czy karta pozostała w sesji
      expect(result.current.cardLogicState.doneCards).toHaveLength(0);
      expect(result.current.cardLogicState.cards).toHaveLength(1);

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.seenInSession).toBe(true);
      expect(updatedCard.prevAns).toBe("wrong");
    });
  });

  describe("Aktualizacja progress podczas przejść", () => {
    it("powinien zaktualizować progress podczas przejścia First Learning -> FSRS", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const cardInFirstLearning = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
        firstLearn: {
          isNew: true,
          due: new Date(Date.now() + 10 * 60 * 1000),
          state: 1,
          consecutiveGood: 1,
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
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([cardInFirstLearning]);
        result.current.setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: 1,
          all: 1,
        });
      });

      act(() => {
        result.current.newCard("good");
      });

      expect(result.current.cardLogicState.progress.good).toBe(1);
      expect(result.current.cardLogicState.progress.todo).toBe(0);
    });

    it("powinien zaktualizować progress podczas przejścia FSRS -> doneCards", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const fsrsCard = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
        firstLearn: {
          isNew: false,
          due: Date.now(),
          state: 0,
          consecutiveGood: 0,
        },
        cardAlgo: {
          difficulty: 2.5,
          stability: 2.5,
          reps: 1,
          lapses: 0,
          scheduled_days: 1,
          elapsed_days: 1,
          last_review: Date.now() - 24 * 60 * 60 * 1000,
          state: 1,
          due: Date.now(),
        },
        grade: 0,
        difficulty: 2.5,
        interval: 1,
      };

      act(() => {
        result.current.setCards([fsrsCard]);
        result.current.setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: 1,
          all: 1,
        });
      });

      act(() => {
        result.current.newCard("good");
      });

      expect(result.current.cardLogicState.progress.good).toBe(1);
      expect(result.current.cardLogicState.progress.todo).toBe(0);
    });
  });

  describe("Zachowanie danych podczas przejść", () => {
    it("powinien zachować wszystkie dane karty podczas przejścia", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const originalCard = {
        id: "card-1",
        cardData: {
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["geography", "capitals"],
          difficulty: "medium",
        },
        firstLearn: {
          isNew: true,
          due: new Date(Date.now() + 10 * 60 * 1000),
          state: 1,
          consecutiveGood: 1,
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
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([originalCard]);
      });

      act(() => {
        result.current.newCard("good");
      });

      const graduatedCard = result.current.cardLogicState.doneCards[0];

      // Sprawdź czy wszystkie dane zostały zachowane
      expect(graduatedCard.id).toBe(originalCard.id);
      expect(graduatedCard.cardData).toEqual(originalCard.cardData);
      expect(graduatedCard.cardAlgo).toEqual(originalCard.cardAlgo);
    });

    it("powinien zachować dane podczas przejścia FSRS -> doneCards", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const fsrsCard = {
        id: "card-1",
        cardData: {
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["geography", "capitals"],
        },
        firstLearn: {
          isNew: false,
          due: Date.now(),
          state: 0,
          consecutiveGood: 0,
        },
        cardAlgo: {
          difficulty: 2.5,
          stability: 2.5,
          reps: 1,
          lapses: 0,
          scheduled_days: 1,
          elapsed_days: 1,
          last_review: Date.now() - 24 * 60 * 60 * 1000,
          state: 1,
          due: Date.now(),
        },
        grade: 0,
        difficulty: 2.5,
        interval: 1,
      };

      act(() => {
        result.current.setCards([fsrsCard]);
      });

      act(() => {
        result.current.newCard("good");
      });

      const doneCard = result.current.cardLogicState.doneCards[0];

      // Sprawdź czy wszystkie dane zostały zachowane
      expect(doneCard.id).toBe(fsrsCard.id);
      expect(doneCard.cardData).toEqual(fsrsCard.cardData);
      expect(doneCard.cardAlgo).toEqual(fsrsCard.cardAlgo);
    });
  });

  describe("Obsługa błędów podczas przejść", () => {
    it("powinien obsłużyć błąd podczas przejścia First Learning -> FSRS", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Mock błąd podczas aktualizacji
      (
        global.mockCloudFunctions.updateCardProgress as jest.Mock
      ).mockRejectedValue(new Error("Transition failed"));

      const cardInFirstLearning = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
        firstLearn: {
          isNew: true,
          due: new Date(Date.now() + 10 * 60 * 1000),
          state: 1,
          consecutiveGood: 1,
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
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([cardInFirstLearning]);
      });

      // Sprawdź czy funkcja nie rzuca błędu
      expect(() => {
        act(() => {
          result.current.newCard("good");
        });
      }).not.toThrow();
    });
  });
});

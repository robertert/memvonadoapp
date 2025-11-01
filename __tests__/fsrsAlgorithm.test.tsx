import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { useCardLogic } from "../app/stack/useCardLogic";
import { UserContext } from "../store/user-context";

// Mock data dla FSRS
const mockUserContext = {
  id: "test-user-id",
  name: "Test User",
  getUser: jest.fn(),
  delUser: jest.fn(),
};

const mockFSRSCard = {
  id: "card-1",
  cardData: {
    front: "What is the capital of France?",
    back: "Paris",
    tags: ["geography", "capitals"],
  },
  firstLearn: {
    isNew: false, // Karta w trybie FSRS
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
    last_review: Date.now() - 24 * 60 * 60 * 1000, // 1 dzień temu
    state: 1,
    due: Date.now(), // Karta jest due
  },
  grade: 0,
  difficulty: 2.5,
  interval: 1,
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

describe("FSRS Algorithm", () => {
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

  describe("Odpowiedź Good w FSRS", () => {
    it("powinien przenieść kartę do doneCards i zaktualizować cardAlgo", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockFSRSCard]);
      });

      act(() => {
        result.current.newCard("good");
      });

      // Efekty FSRS: karta trafia do doneCards, znika z cards
      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      expect(result.current.cardLogicState.cards).toHaveLength(0);

      const doneCard = result.current.cardLogicState.doneCards[0];
      // reps powinien wzrosnąć, due w przyszłości, state >= 1
      expect(doneCard.cardAlgo.reps).toBeGreaterThanOrEqual(
        mockFSRSCard.cardAlgo.reps
      );
      expect(new Date(doneCard.cardAlgo.due).getTime()).toBeGreaterThan(
        Date.now() - 1000
      );
      expect(doneCard.cardAlgo.state).toBeGreaterThanOrEqual(1);
    });

    it('powinien zaktualizować progress po odpowiedzi "Good"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockFSRSCard]);
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

  describe('Odpowiedź "Easy" w FSRS', () => {
    it("powinien przenieść kartę do doneCards i ustawić due w przyszłości", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockFSRSCard]);
      });

      act(() => {
        result.current.newCard("easy");
      });

      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      const doneCard = result.current.cardLogicState.doneCards[0];
      expect(new Date(doneCard.cardAlgo.due).getTime()).toBeGreaterThan(
        Date.now() - 1000
      );
      expect(doneCard.cardAlgo.reps).toBeGreaterThanOrEqual(
        mockFSRSCard.cardAlgo.reps
      );
    });
  });

  describe('Odpowiedź "Hard" w FSRS', () => {
    it("powinien przenieść kartę do doneCards i zmniejszyć todo", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockFSRSCard]);
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
        result.current.newCard("hard");
      });

      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      expect(result.current.cardLogicState.progress.hard).toBe(1);
      expect(result.current.cardLogicState.progress.todo).toBe(0);
    });
  });

  describe('Odpowiedź "Wrong" w FSRS - Specjalny przypadek', () => {
    it('powinien zastosować 10-minutowy cooldown dla odpowiedzi "Wrong"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockFSRSCard]);
      });

      const now = Date.now();
      const expectedDue = now + 10 * 60 * 1000; // 10 minut

      act(() => {
        result.current.newCard("wrong");
      });

      // Sprawdź czy karta pozostała w sesji (nie została przeniesiona do doneCards)
      expect(result.current.cardLogicState.doneCards).toHaveLength(0);
      expect(result.current.cardLogicState.cards).toHaveLength(1);

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.seenInSession).toBe(true);
      expect(updatedCard.prevAns).toBe("wrong");

      // Sprawdź czy due jest ustawione na 10 minut
      const dueTime = new Date(updatedCard.cardAlgo?.due).getTime();
      expect(dueTime).toBeGreaterThan(now);
      expect(dueTime).toBeLessThanOrEqual(expectedDue + 1000);
    });

    it("powinien użyć FSRS ale z wymuszonym cooldowniem", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockFSRSCard]);
      });

      act(() => {
        result.current.newCard("wrong");
      });

      // Sprawdź czy due zostało nadpisane na 10 minut
      const updatedCard = result.current.cardLogicState.cards[0];
      const dueTime = new Date(updatedCard.cardAlgo?.due).getTime();
      const now = Date.now();
      const expectedDue = now + 10 * 60 * 1000;

      expect(dueTime).toBeLessThanOrEqual(expectedDue + 1000);
    });
  });

  describe("Aktualizacja progress w FSRS", () => {
    it("powinien zaktualizować progress dla wszystkich typów odpowiedzi", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Bez mockowania FSRS – asercje na efektach

      act(() => {
        result.current.setCards([mockFSRSCard]);
        result.current.setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: 1,
          all: 1,
        });
      });

      // Test "wrong" - nie zmniejsza todo
      act(() => {
        result.current.newCard("wrong");
      });
      expect(result.current.cardLogicState.progress.wrong).toBe(1);
      expect(result.current.cardLogicState.progress.todo).toBe(1);

      // Reset i test "hard"
      act(() => {
        result.current.setCards([mockFSRSCard]);
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
        result.current.newCard("hard");
      });
      expect(result.current.cardLogicState.progress.hard).toBe(1);
      expect(result.current.cardLogicState.progress.todo).toBe(0);
    });
  });

  describe("Obsługa błędów w FSRS", () => {
    it("powinien obsłużyć błąd podczas aktualizacji karty FSRS", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Mock błąd podczas aktualizacji
      (
        global.mockCloudFunctions.updateCardProgress as jest.Mock
      ).mockRejectedValue(new Error("FSRS update failed"));

      // Bez mockowania FSRS – sprawdzamy, że nie rzuca wyjątków

      act(() => {
        result.current.setCards([mockFSRSCard]);
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

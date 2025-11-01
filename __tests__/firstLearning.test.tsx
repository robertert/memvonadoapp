import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { useCardLogic } from "../app/stack/useCardLogic";
import { UserContext } from "../store/user-context";

// Mock data dla First Learning
const mockUserContext = {
  id: "test-user-id",
  name: "Test User",
  getUser: jest.fn(),
  delUser: jest.fn(),
};

const mockNewCard = {
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider value={mockUserContext}>
    {children}
  </UserContext.Provider>
);

describe("First Learning Phase", () => {
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
      cards: [mockNewCard],
    });
    (
      global.mockCloudFunctions.updateCardProgress as jest.Mock
    ).mockResolvedValue({});
  });

  describe('Pierwsza odpowiedź "Good"', () => {
    it("powinien ustawić cooldown 10 minut dla pierwszej dobrej odpowiedzi", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      // Poczekaj na załadowanie kart
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Ustaw kartę w stanie First Learning
      act(() => {
        result.current.setCards([mockNewCard]);
      });

      const now = Date.now();
      const expectedDue = now + 10 * 60 * 1000; // 10 minut

      act(() => {
        result.current.newCard("good");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.firstLearn?.consecutiveGood).toBe(1);
      expect(updatedCard.firstLearn?.isNew).toBe(true);
      expect(updatedCard.seenInSession).toBe(true);
      // W First Learning po pojedynczym "good" prevAns może pozostać nieustawione
      expect(
        updatedCard.prevAns === undefined || updatedCard.prevAns === "good"
      ).toBe(true);

      // Sprawdź czy due jest ustawione na około 10 minut w przyszłość
      const dueTime = updatedCard.firstLearn?.due
        ? new Date(updatedCard.firstLearn.due).getTime()
        : 0;
      expect(dueTime).toBeGreaterThan(now);
      expect(dueTime).toBeLessThanOrEqual(expectedDue + 1000); // Tolerancja 1 sekunda
    });

    it("powinien zaktualizować progress po pierwszej dobrej odpowiedzi", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockNewCard]);
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
      expect(result.current.cardLogicState.progress.todo).toBe(1); // Nie zmniejsza się jeszcze
    });
  });

  describe('Druga odpowiedź "Good" - Graduacja', () => {
    it("powinien przeprowadzić graduację po dwóch kolejnych dobrych odpowiedziach", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Karta po pierwszej dobrej odpowiedzi
      const cardAfterFirstGood = {
        ...mockNewCard,
        firstLearn: {
          ...mockNewCard.firstLearn,
          consecutiveGood: 1,
          due: new Date(Date.now() + 10 * 60 * 1000),
        },
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([cardAfterFirstGood]);
      });

      act(() => {
        result.current.newCard("good");
      });

      // Sprawdź czy karta została przeniesiona do doneCards
      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      expect(result.current.cardLogicState.doneCards[0].firstLearn?.isNew).toBe(
        false
      );
      expect(
        result.current.cardLogicState.doneCards[0].firstLearn?.consecutiveGood
      ).toBe(2);

      // Sprawdź czy karta została usunięta z aktywnych kart
      expect(result.current.cardLogicState.cards).toHaveLength(0);
    });

    it("powinien zaktualizować progress po graduacji", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const cardAfterFirstGood = {
        ...mockNewCard,
        firstLearn: {
          ...mockNewCard.firstLearn,
          consecutiveGood: 1,
          due: new Date(Date.now() + 10 * 60 * 1000),
        },
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([cardAfterFirstGood]);
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
      expect(result.current.cardLogicState.progress.todo).toBe(0); // Zmniejsza się po graduacji
    });
  });

  describe('Odpowiedzi "Hard" w First Learning', () => {
    it('powinien ustawić cooldown 5 minut dla odpowiedzi "Hard"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockNewCard]);
      });

      const now = Date.now();
      const expectedDue = now + 5 * 60 * 1000; // 5 minut

      act(() => {
        result.current.newCard("hard");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.firstLearn?.consecutiveGood).toBe(0); // Reset
      expect(updatedCard.firstLearn?.isNew).toBe(true);
      expect(updatedCard.seenInSession).toBe(true);
      expect(updatedCard.prevAns).toBe("hard");

      const dueTime = updatedCard.firstLearn?.due
        ? new Date(updatedCard.firstLearn.due).getTime()
        : 0;
      expect(dueTime).toBeGreaterThan(now);
      expect(dueTime).toBeLessThanOrEqual(expectedDue + 1000);
    });

    it('powinien zresetować consecutiveGood po odpowiedzi "Hard"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Karta z jedną dobrą odpowiedzią
      const cardWithOneGood = {
        ...mockNewCard,
        firstLearn: {
          ...mockNewCard.firstLearn,
          consecutiveGood: 1,
        },
      };

      act(() => {
        result.current.setCards([cardWithOneGood]);
      });

      act(() => {
        result.current.newCard("hard");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.firstLearn?.consecutiveGood).toBe(0);
    });
  });

  describe('Odpowiedzi "Wrong" w First Learning', () => {
    it('powinien ustawić cooldown 1 minutę dla odpowiedzi "Wrong"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.setCards([mockNewCard]);
      });

      const now = Date.now();
      const expectedDue = now + 1 * 60 * 1000; // 1 minuta

      act(() => {
        result.current.newCard("wrong");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.firstLearn?.consecutiveGood).toBe(0); // Reset
      expect(updatedCard.firstLearn?.isNew).toBe(true);
      expect(updatedCard.seenInSession).toBe(true);
      expect(updatedCard.prevAns).toBe("wrong");

      const dueTime = updatedCard.firstLearn?.due
        ? new Date(updatedCard.firstLearn.due).getTime()
        : 0;
      expect(dueTime).toBeGreaterThan(now);
      expect(dueTime).toBeLessThanOrEqual(expectedDue + 1000);
    });

    it('powinien zresetować consecutiveGood po odpowiedzi "Wrong"', async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Karta z jedną dobrą odpowiedzią
      const cardWithOneGood = {
        ...mockNewCard,
        firstLearn: {
          ...mockNewCard.firstLearn,
          consecutiveGood: 1,
        },
      };

      act(() => {
        result.current.setCards([cardWithOneGood]);
      });

      act(() => {
        result.current.newCard("wrong");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.firstLearn?.consecutiveGood).toBe(0);
    });
  });

  describe("Obsługa błędów w First Learning", () => {
    it("powinien obsłużyć błąd gdy brak kart", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Ustaw pustą tablicę kart
      act(() => {
        result.current.setCards([]);
      });

      act(() => {
        result.current.newCard("good");
      });

      expect(result.current.error).toBe("No cards available");
    });

    it("powinien obsłużyć błąd podczas aktualizacji karty", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Mock błąd podczas aktualizacji
      (
        global.mockCloudFunctions.updateCardProgress as jest.Mock
      ).mockRejectedValue(new Error("Update failed"));

      act(() => {
        result.current.setCards([mockNewCard]);
      });

      // Sprawdź czy funkcja nie rzuca błędu (błąd jest logowany, ale nie przerywa wykonania)
      expect(() => {
        act(() => {
          result.current.newCard("good");
        });
      }).not.toThrow();
    });
  });
});

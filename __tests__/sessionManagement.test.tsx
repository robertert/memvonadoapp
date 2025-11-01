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

describe("Session Management", () => {
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

  describe("Ładowanie sesji", () => {
    it("powinien załadować karty do sesji z odpowiednimi ustawieniami", async () => {
      const mockDueCards = [
        {
          id: "due-card-1",
          cardData: { front: "Due card 1", back: "Answer 1" },
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
        },
      ];

      const mockNewCards = [
        {
          id: "new-card-1",
          cardData: { front: "New card 1", back: "Answer 1" },
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
        },
      ];

      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: mockDueCards,
      });
      (
        global.mockCloudFunctions.getNewDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: mockNewCards,
      });

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(global.mockCloudFunctions.getDueDeckCards).toHaveBeenCalledWith(
        "test-deck-id",
        45
      ); // dailyGoal * 3 + dailyNew * 3 (10*3 + 5*3)
      expect(global.mockCloudFunctions.getNewDeckCards).toHaveBeenCalledWith(
        "test-deck-id",
        15
      ); // dailyNew * 3
    });

    it("powinien ustawić progress na podstawie załadowanych kart", async () => {
      const mockCards = [
        { id: "card-1", cardData: { front: "Test 1", back: "Answer 1" } },
        { id: "card-2", cardData: { front: "Test 2", back: "Answer 2" } },
        { id: "card-3", cardData: { front: "Test 3", back: "Answer 3" } },
      ];

      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: mockCards,
      });

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.cardLogicState.progress.todo).toBe(3);
      expect(result.current.cardLogicState.progress.all).toBe(3);
    });
  });

  describe("Sortowanie kart w sesji", () => {
    it("powinien sortować karty według due date", async () => {
      const now = Date.now();
      const mockCards = [
        {
          id: "card-1",
          cardData: { front: "Card 1", back: "Answer 1" },
          cardAlgo: {
            difficulty: 2.5,
            stability: 2.5,
            reps: 1,
            lapses: 0,
            scheduled_days: 1,
            elapsed_days: 1,
            last_review: now - 24 * 60 * 60 * 1000,
            state: 1,
            due: now + 60 * 60 * 1000, // 1 godzina
          },
        },
        {
          id: "card-2",
          cardData: { front: "Card 2", back: "Answer 2" },
          cardAlgo: {
            difficulty: 2.5,
            stability: 2.5,
            reps: 1,
            lapses: 0,
            scheduled_days: 1,
            elapsed_days: 1,
            last_review: now - 24 * 60 * 60 * 1000,
            state: 1,
            due: now, // Teraz
          },
        },
        {
          id: "card-3",
          cardData: { front: "Card 3", back: "Answer 3" },
          cardAlgo: {
            difficulty: 2.5,
            stability: 2.5,
            reps: 1,
            lapses: 0,
            scheduled_days: 1,
            elapsed_days: 1,
            last_review: now - 24 * 60 * 60 * 1000,
            state: 1,
            due: now + 2 * 60 * 60 * 1000, // 2 godziny
          },
        },
      ];

      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: mockCards,
      });

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const sortedCards = result.current.cardLogicState.cards;
      expect(sortedCards[0].id).toBe("card-2"); // Najwcześniejszy due
      expect(sortedCards[1].id).toBe("card-1"); // Średni due
      expect(sortedCards[2].id).toBe("card-3"); // Najpóźniejszy due
    });

    it("powinien priorytetyzować karty już widziane w sesji", async () => {
      const now = Date.now();
      const mockCards = [
        {
          id: "card-1",
          cardData: { front: "Card 1", back: "Answer 1" },
          cardAlgo: {
            difficulty: 2.5,
            stability: 2.5,
            reps: 1,
            lapses: 0,
            scheduled_days: 1,
            elapsed_days: 1,
            last_review: now - 24 * 60 * 60 * 1000,
            state: 1,
            due: now,
          },
          seenInSession: false,
        },
        {
          id: "card-2",
          cardData: { front: "Card 2", back: "Answer 2" },
          cardAlgo: {
            difficulty: 2.5,
            stability: 2.5,
            reps: 1,
            lapses: 0,
            scheduled_days: 1,
            elapsed_days: 1,
            last_review: now - 24 * 60 * 60 * 1000,
            state: 1,
            due: now,
          },
          seenInSession: true,
        },
      ];

      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: mockCards,
      });

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const sortedCards = result.current.cardLogicState.cards;
      expect(sortedCards[0].id).toBe("card-2"); // Karta już widziana w sesji
      expect(sortedCards[1].id).toBe("card-1"); // Karta nie widziana w sesji
    });
  });

  describe("Zarządzanie seenInSession", () => {
    it("powinien ustawić seenInSession na true po odpowiedzi", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const card = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
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

      act(() => {
        result.current.setCards([card]);
      });

      act(() => {
        result.current.newCard("good");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.seenInSession).toBe(true);
    });

    it("powinien zachować seenInSession podczas aktualizacji karty", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const card = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
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
        seenInSession: true,
        prevAns: "good",
      };

      act(() => {
        result.current.setCards([card]);
      });

      act(() => {
        result.current.newCard("hard");
      });

      const updatedCard = result.current.cardLogicState.cards[0];
      expect(updatedCard.seenInSession).toBe(true);
    });
  });

  describe("Aktualizacja progress w sesji", () => {
    it("powinien zaktualizować progress po każdej odpowiedzi", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const card = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
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

      act(() => {
        result.current.setCards([card]);
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
      expect(result.current.cardLogicState.progress.todo).toBe(1); // Nie zmniejsza się dla First Learning
    });

    it("powinien zmniejszyć todo po ukończeniu karty", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const card = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
        firstLearn: {
          isNew: false, // Karta w FSRS
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
        result.current.setCards([card]);
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
      expect(result.current.cardLogicState.progress.todo).toBe(0); // Zmniejsza się po ukończeniu
    });
  });

  describe("Zarządzanie doneCards", () => {
    it("powinien dodać kartę do doneCards po ukończeniu", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const card = {
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
        result.current.setCards([card]);
      });

      act(() => {
        result.current.newCard("good");
      });

      expect(result.current.cardLogicState.doneCards).toHaveLength(1);
      expect(result.current.cardLogicState.doneCards[0].id).toBe("card-1");
    });

    it("powinien zachować wszystkie dane karty w doneCards", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const card = {
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
        result.current.setCards([card]);
      });

      act(() => {
        result.current.newCard("good");
      });

      const doneCard = result.current.cardLogicState.doneCards[0];
      expect(doneCard.id).toBe(card.id);
      expect(doneCard.cardData).toEqual(card.cardData);
      expect(doneCard.cardAlgo).toEqual(card.cardAlgo);
      expect(doneCard.firstLearn).toEqual(card.firstLearn);
    });
  });

  describe("Obsługa błędów w sesji", () => {
    it("powinien obsłużyć błąd podczas ładowania sesji", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockRejectedValue(
        new Error("Failed to load deck")
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

    it("powinien obsłużyć błąd podczas aktualizacji kart", async () => {
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

      const card = {
        id: "card-1",
        cardData: { front: "Test", back: "Answer", tags: ["test"] },
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

      act(() => {
        result.current.setCards([card]);
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

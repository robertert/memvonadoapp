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

describe("Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Błędy podczas ładowania", () => {
    it("powinien obsłużyć błąd podczas ładowania szczegółów talii", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockRejectedValue(
        new Error("Deck not found")
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockResolvedValue({
        settings: mockUserSettings,
      });

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
      expect(result.current.cardLogicState.isLoading).toBe(false);
    });

    it("powinien obsłużyć błąd podczas ładowania ustawień użytkownika", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue(
        {
          deck: { id: "test-deck", title: "Test Deck" },
        }
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockRejectedValue(new Error("User settings not found"));

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
      expect(result.current.cardLogicState.isLoading).toBe(false);
    });

    it("powinien obsłużyć błąd podczas ładowania kart do powtórki", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue(
        {
          deck: { id: "test-deck", title: "Test Deck" },
        }
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockResolvedValue({
        settings: mockUserSettings,
      });
      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockRejectedValue(new Error("Failed to fetch due cards"));

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
      expect(result.current.cardLogicState.isLoading).toBe(false);
    });

    it("powinien obsłużyć błąd podczas ładowania nowych kart", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue(
        {
          deck: { id: "test-deck", title: "Test Deck" },
        }
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockResolvedValue({
        settings: mockUserSettings,
      });
      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.getNewDeckCards as jest.Mock
      ).mockRejectedValue(new Error("Failed to fetch new cards"));

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
      expect(result.current.cardLogicState.isLoading).toBe(false);
    });
  });

  describe("Błędy podczas przetwarzania kart", () => {
    it("powinien obsłużyć błąd gdy brak kart do przetworzenia", async () => {
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

    it("powinien obsłużyć błąd podczas aktualizacji karty First Learning", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue(
        {
          deck: { id: "test-deck", title: "Test Deck" },
        }
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockResolvedValue({
        settings: mockUserSettings,
      });
      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.getNewDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.updateCardProgress as jest.Mock
      ).mockRejectedValue(new Error("Update failed"));

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

      // Sprawdź czy funkcja nie rzuca błędu (błąd jest logowany, ale nie przerywa wykonania)
      expect(() => {
        act(() => {
          result.current.newCard("good");
        });
      }).not.toThrow();
    });

    it("powinien obsłużyć błąd podczas aktualizacji karty FSRS", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue(
        {
          deck: { id: "test-deck", title: "Test Deck" },
        }
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockResolvedValue({
        settings: mockUserSettings,
      });
      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.getNewDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.updateCardProgress as jest.Mock
      ).mockRejectedValue(new Error("FSRS update failed"));

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

      // Sprawdź czy funkcja nie rzuca błędu
      expect(() => {
        act(() => {
          result.current.newCard("good");
        });
      }).not.toThrow();
    });
  });

  describe("Błędy podczas aktualizacji doneCards", () => {
    it("powinien obsłużyć błąd podczas aktualizacji doneCards", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockResolvedValue(
        {
          deck: { id: "test-deck", title: "Test Deck" },
        }
      );
      (
        global.mockCloudFunctions.getUserSettings as jest.Mock
      ).mockResolvedValue({
        settings: mockUserSettings,
      });
      (
        global.mockCloudFunctions.getDueDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.getNewDeckCards as jest.Mock
      ).mockResolvedValue({
        cards: [],
      });
      (
        global.mockCloudFunctions.updateCardProgress as jest.Mock
      ).mockRejectedValue(new Error("Done cards update failed"));

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const doneCards = [
        {
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
            last_review: Date.now(),
            state: 1,
            due: Date.now(),
          },
          grade: 0,
          difficulty: 2.5,
          interval: 1,
        },
      ];

      act(() => {
        result.current.setCards([]);
        result.current.setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: 0,
          all: 1,
        });
      });

      // Sprawdź czy funkcja nie rzuca błędu
      expect(() => {
        act(() => {
          result.current.updateCards(doneCards);
        });
      }).not.toThrow();
    });
  });

  describe("Czyszczenie błędów", () => {
    it("powinien wyczyścić błąd po wywołaniu clearError", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockRejectedValue(
        new Error("Test error")
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

    it("powinien wyczyścić błąd podczas nowego wywołania newCard", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Ustaw błąd
      act(() => {
        result.current.setCards([]);
      });

      act(() => {
        result.current.newCard("good");
      });

      expect(result.current.error).toBe("No cards available");

      // Ustaw kartę i wywołaj newCard ponownie
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

      expect(result.current.error).toBe(null);
    });
  });

  describe("Błędy sieciowe", () => {
    it("powinien obsłużyć błąd sieciowy podczas ładowania", async () => {
      (global.mockCloudFunctions.getDeckDetails as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
    });

    it("powinien obsłużyć timeout podczas ładowania", async () => {
      (
        global.mockCloudFunctions.getDeckDetails as jest.Mock
      ).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 100)
          )
      );

      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(result.current.error).toBe("Failed to fetch cards");
    });
  });

  describe("Błędy walidacji", () => {
    it("powinien obsłużyć nieprawidłowy typ odpowiedzi", async () => {
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

      // Sprawdź czy funkcja obsługuje nieprawidłowy typ odpowiedzi
      expect(() => {
        act(() => {
          result.current.newCard("invalid" as any);
        });
      }).not.toThrow();
    });

    it("powinien obsłużyć brak userCtx.id", async () => {
      const { result } = renderHook(() => useCardLogic("test-deck-id"), {
        wrapper: ({ children }) => (
          <UserContext.Provider value={{ id: null } as any}>
            {children}
          </UserContext.Provider>
        ),
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

      // Sprawdź czy funkcja nie rzuca błędu
      expect(() => {
        act(() => {
          result.current.newCard("good");
        });
      }).not.toThrow();
    });
  });
});

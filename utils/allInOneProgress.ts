import AsyncStorage from "@react-native-async-storage/async-storage";

const ALL_IN_ONE_PREFIX = "@allInOne_";

/**
 * All in One card state in a session
 */
export interface AllInOneCard {
  cardId: string;
  front: string;
  back: string;
  wrongCount: number;
  lastWrongAt: number | null; // timestamp when marked wrong
  isCompleted: boolean;
}

/**
 * All in One session data stored in AsyncStorage
 */
export interface AllInOneSession {
  deckId: string;
  cards: AllInOneCard[];
  startedAt: number;
  completedCards: number;
  totalCards: number;
  wrongAttempts: number; // total wrong swipes for victory stats
}

/**
 * Get the storage key for a deck's All in One session
 */
function getStorageKey(deckId: string): string {
  return `${ALL_IN_ONE_PREFIX}${deckId}`;
}

/**
 * Get an existing All in One session for a deck
 */
export async function getSession(
  deckId: string
): Promise<AllInOneSession | null> {
  try {
    const value = await AsyncStorage.getItem(getStorageKey(deckId));
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error("Error getting All in One session:", error);
    return null;
  }
}

/**
 * Save an All in One session
 */
export async function saveSession(session: AllInOneSession): Promise<void> {
  try {
    await AsyncStorage.setItem(
      getStorageKey(session.deckId),
      JSON.stringify(session)
    );
  } catch (error) {
    console.error("Error saving All in One session:", error);
  }
}

/**
 * Clear an All in One session for a deck
 */
export async function clearSession(deckId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getStorageKey(deckId));
  } catch (error) {
    console.error("Error clearing All in One session:", error);
  }
}

/**
 * Mark a card as wrong in the session
 */
export async function markCardWrong(
  deckId: string,
  cardId: string
): Promise<void> {
  try {
    const session = await getSession(deckId);
    if (!session) return;

    const updatedCards = session.cards.map((card) =>
      card.cardId === cardId
        ? {
            ...card,
            wrongCount: card.wrongCount + 1,
            lastWrongAt: Date.now(),
          }
        : card
    );

    await saveSession({
      ...session,
      cards: updatedCards,
      wrongAttempts: session.wrongAttempts + 1,
    });
  } catch (error) {
    console.error("Error marking card as wrong:", error);
  }
}

/**
 * Mark a card as completed in the session
 */
export async function markCardCompleted(
  deckId: string,
  cardId: string
): Promise<void> {
  try {
    const session = await getSession(deckId);
    if (!session) return;

    const updatedCards = session.cards.map((card) =>
      card.cardId === cardId ? { ...card, isCompleted: true } : card
    );

    const completedCount = updatedCards.filter((c) => c.isCompleted).length;

    await saveSession({
      ...session,
      cards: updatedCards,
      completedCards: completedCount,
    });
  } catch (error) {
    console.error("Error marking card as completed:", error);
  }
}

/**
 * Get the next card to show in an All in One session
 * - Cards not on cooldown are shown first
 * - If all cards are on cooldown, show the oldest wrong card
 */
export function getNextCard(session: AllInOneSession): AllInOneCard | null {
  const now = Date.now();
  const COOLDOWN_TIME = 3 * 60 * 1000;

  const remaining = session.cards.filter((c) => !c.isCompleted);
  if (remaining.length === 0) return null; // session complete

  // Find cards available (not on cooldown)
  const available = remaining.filter(
    (c) => c.lastWrongAt === null || now - c.lastWrongAt >= COOLDOWN_TIME
  );

  if (available.length > 0) {
    // Return first available (ordered by time - oldest wrong first)
    const sortedAvailable = available.sort(
      (a, b) => {
        if (a.lastWrongAt === null) return 1;
        if (b.lastWrongAt === null) return -1;
        return (a.lastWrongAt ?? 0) - (b.lastWrongAt ?? 0);
      }
    );
    return sortedAvailable[0];
  }

  // All on cooldown → skip cooldown, return oldest wrong card
  return remaining.sort(
    (a, b) => (a.lastWrongAt ?? 0) - (b.lastWrongAt ?? 0)
  )[0];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format session time in mm:ss format
 */
export function formatSessionTime(startedAt: number): string {
  const elapsed = Date.now() - startedAt;
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

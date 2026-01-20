import AsyncStorage from "@react-native-async-storage/async-storage";

const LIKED_DECKS_KEY = "@likedDecks";

/**
 * Get all liked deck IDs from local cache
 */
export async function getLikedDeckIds(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(LIKED_DECKS_KEY);
    if (value) {
      return JSON.parse(value);
    }
    return [];
  } catch (error) {
    console.error("Error getting liked decks from cache:", error);
    return [];
  }
}

/**
 * Add a deck ID to the liked decks cache
 */
export async function addLikedDeckId(deckId: string): Promise<void> {
  try {
    const likedDecks = await getLikedDeckIds();
    if (!likedDecks.includes(deckId)) {
      likedDecks.push(deckId);
      await AsyncStorage.setItem(LIKED_DECKS_KEY, JSON.stringify(likedDecks));
    }
  } catch (error) {
    console.error("Error adding liked deck to cache:", error);
  }
}

/**
 * Remove a deck ID from the liked decks cache
 */
export async function removeLikedDeckId(deckId: string): Promise<void> {
  try {
    const likedDecks = await getLikedDeckIds();
    const filtered = likedDecks.filter((id) => id !== deckId);
    await AsyncStorage.setItem(LIKED_DECKS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing liked deck from cache:", error);
  }
}

/**
 * Check if a deck is liked locally (from cache)
 */
export async function isLikedLocally(deckId: string): Promise<boolean> {
  try {
    const likedDecks = await getLikedDeckIds();
    return likedDecks.includes(deckId);
  } catch (error) {
    console.error("Error checking if deck is liked locally:", error);
    return false;
  }
}

/**
 * Clear all liked decks from cache
 */
export async function clearLikedDecksCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LIKED_DECKS_KEY);
  } catch (error) {
    console.error("Error clearing liked decks cache:", error);
  }
}

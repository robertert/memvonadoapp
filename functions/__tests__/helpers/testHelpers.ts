/**
 * Helper functions for Cloud Functions tests
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Clear all test data from Firestore for specific user
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    // Delete user document and all subcollections
    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Delete subcollections
      const collections = [
        "notifications",
        "studySessions",
        "awards",
        "searchLogs",
        "decks",
      ];

      for (const collection of collections) {
        const snapshot = await userRef.collection(collection).get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        if (snapshot.docs.length > 0) {
          await batch.commit();
        }
      }

      // Delete user document
      await userRef.delete();
    }
  } catch (error) {
    console.warn(`Error clearing user data for ${userId}:`, error);
  }
}

/**
 * Clear all test data for a specific deck
 */
export async function clearDeckData(deckId: string): Promise<void> {
  try {
    const deckRef = db.doc(`decks/${deckId}`);
    const deckDoc = await deckRef.get();

    if (deckDoc.exists) {
      // Delete cards
      const cardsSnapshot = await deckRef.collection("cards").get();
      const batch = db.batch();
      cardsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      if (cardsSnapshot.docs.length > 0) {
        await batch.commit();
      }

      // Delete deck
      await deckRef.delete();
    }
  } catch (error) {
    console.warn(`Error clearing deck data for ${deckId}:`, error);
  }
}

/**
 * Clear season user points
 */
export async function clearSeasonUserPoints(
  seasonId: string,
  userId: string
): Promise<void> {
  try {
    await db.doc(`seasonUserPoints/${seasonId}/users/${userId}`).delete();
  } catch (error) {
    console.warn(`Error clearing season user points:`, error);
  }
}

/**
 * Clear league group data
 */
export async function clearLeagueGroup(
  seasonId: string,
  leagueNumber: number,
  groupId: string
): Promise<void> {
  try {
    const leagueDocRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`);
    const groupRef = leagueDocRef.collection("groups").doc(groupId);

    // Delete members
    const membersSnapshot = await groupRef.collection("members").get();
    const batch = db.batch();
    membersSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    if (membersSnapshot.docs.length > 0) {
      await batch.commit();
    }

    // Delete group
    await groupRef.delete();
  } catch (error) {
    console.warn(`Error clearing league group:`, error);
  }
}

/**
 * Generate unique test ID
 */
export function generateTestId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a test user document
 */
export async function createTestUser(
  userId: string,
  data: Partial<typeof import("./mockData").mockUser> = {}
): Promise<void> {
  await db.doc(`users/${userId}`).set({
    username: `user-${userId}`,
    name: "Test User",
    email: `${userId}@test.com`,
    league: 1,
    currentGroupId: null,
    stats: {
      totalCards: 0,
      totalDecks: 0,
      totalReviews: 0,
      averageDifficulty: 0,
    },
    friends: [],
    pending: [],
    incoming: [],
    theme: "light",
    ...data,
  });
}

/**
 * Create a test deck document
 */
export async function createTestDeck(
  deckId: string,
  userId: string,
  data: Partial<typeof import("./mockData").mockDeck> = {}
): Promise<void> {
  await db.doc(`decks/${deckId}`).set({
    title: "Test Deck",
    cardsNum: 0,
    createdBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isPublic: false,
    views: 0,
    likes: 0,
    ...data,
  });
}

/**
 * Create a test card document
 */
export async function createTestCard(
  deckId: string,
  cardId: string,
  data: Partial<typeof import("./mockData").mockCard> = {}
): Promise<void> {
  await db.doc(`decks/${deckId}/cards/${cardId}`).set({
    front: "Test question",
    back: "Test answer",
    tags: [],
    cardAlgo: {
      difficulty: 2.5,
      stability: 0,
      reps: 0,
      lapses: 0,
      scheduled_days: 1,
      elapsed_days: 0,
      last_review: admin.firestore.Timestamp.now(),
      state: 0,
      due: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
    },
    grade: -1,
    difficulty: 2.5,
    nextReviewInterval: 1,
    ...data,
  });
}

/**
 * Create a test notification
 */
export async function createTestNotification(
  userId: string,
  notificationId: string,
  data: Partial<typeof import("./mockData").mockNotification> = {}
): Promise<void> {
  await db.doc(`users/${userId}/notifications/${notificationId}`).set({
    title: "Test Notification",
    body: "Test body",
    type: "info",
    read: false,
    linkTo: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...data,
  });
}

/**
 * Create a test season
 */
export async function createTestSeason(
  seasonId: string,
  data: Partial<typeof import("./mockData").mockSeason> = {}
): Promise<void> {
  const now = new Date();
  await db.doc(`ranking/currentSeason`).set({
    seasonId,
    startAt: admin.firestore.Timestamp.fromDate(
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    ),
    endAt: admin.firestore.Timestamp.fromDate(now),
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...data,
  });
}

/**
 * Create season user points
 */
export async function createSeasonUserPoints(
  seasonId: string,
  userId: string,
  data: {
    points?: number;
    league?: number;
    groupId?: string;
  } = {}
): Promise<void> {
  await db.doc(`seasonUserPoints/${seasonId}/users/${userId}`).set({
    points: 0,
    league: 1,
    groupId: null,
    lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
    ...data,
  });
}

/**
 * Create a test group
 */
export async function createTestGroup(
  seasonId: string,
  leagueNumber: number,
  groupId: string,
  data: Partial<typeof import("./mockData").mockGroup> = {}
): Promise<void> {
  const leagueDocRef = db
    .collection("leagueGroups")
    .doc(`${seasonId}_${leagueNumber}`);
  await leagueDocRef.set(
    {
      seasonId,
      leagueNumber,
    },
    { merge: true }
  );

  await leagueDocRef
    .collection("groups")
    .doc(groupId)
    .set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isFull: false,
      capacity: 20,
      currentCount: 0,
      seasonId,
      leagueNumber,
      ...data,
    });
}

/**
 * Add user to group
 */
export async function addUserToGroup(
  seasonId: string,
  leagueNumber: number,
  groupId: string,
  userId: string,
  points: number = 0
): Promise<void> {
  await db
    .collection("leagueGroups")
    .doc(`${seasonId}_${leagueNumber}`)
    .collection("groups")
    .doc(groupId)
    .collection("members")
    .doc(userId)
    .set({
      userId,
      points,
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Create a test study session
 */
export async function createTestStudySession(
  userId: string,
  sessionId: string,
  data: Partial<typeof import("./mockData").mockStudySession> = {}
): Promise<void> {
  await db.doc(`users/${userId}/studySessions/${sessionId}`).set({
    deckId: "test-deck-id",
    cardId: "test-card-id",
    grade: 3,
    date: admin.firestore.FieldValue.serverTimestamp(),
    reviewTime: Date.now(),
    ...data,
  });
}

/**
 * Wait for Firestore writes to propagate
 */
export async function waitForFirestore(ms: number = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

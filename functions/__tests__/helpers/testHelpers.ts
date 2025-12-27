/**
 * Helper functions for Cloud Functions tests
 */

import * as admin from "firebase-admin";
import { CardGrade, SeasonUserPoints, User } from "../../src/types/common";

const db = admin.firestore();

/**
 * Clear notifications for a specific user (even if user doesn't exist)
 */
export async function clearTestNotifications(userId: string): Promise<void> {
  try {
    const userRef = db.doc(`users/${userId}`);
    const notificationsSnapshot = await userRef
      .collection("notifications")
      .get();

    if (notificationsSnapshot.docs.length > 0) {
      const batch = db.batch();
      notificationsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn(`Error clearing notifications for ${userId}:`, error);
  }
}

/**
 * Clear all test data from Firestore for specific user
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    // Delete user document and all subcollections
    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();

    // Always try to clear subcollections, even if user doesn't exist
    // (in case notifications were created without user document)
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

    // Delete user document if it exists
    if (userDoc.exists) {
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
 * Clear current season document
 */
export async function clearCurrentSeason(): Promise<void> {
  try {
    await db.doc("ranking/currentSeason").delete();
  } catch (error) {
    console.warn(`Error clearing current season:`, error);
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
 * Clear all league groups for a specific season and league
 */
export async function clearAllLeagueGroups(
  seasonId: string,
  leagueNumber: number
): Promise<void> {
  try {
    const leagueDocRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`);

    const groupsSnapshot = await leagueDocRef.collection("groups").get();

    // Delete all groups and their members
    for (const groupDoc of groupsSnapshot.docs) {
      const groupRef = leagueDocRef.collection("groups").doc(groupDoc.id);

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
    }
  } catch (error) {
    console.warn(`Error clearing all league groups:`, error);
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
  data: {
    username?: string;
    email?: string;
    league?: number;
    currentGroupId?: string;
    experiencePoints?: number;
    currencyCount?: number;
    stats?: {
      totalCards?: number;
      totalDecks?: number;
      totalReviews?: number;
      averageDifficulty?: number;
      currentStreak?: number;
      longestStreak?: number;
      lastStreakDate?: Date;
      lastStudyDate?: Date;
    };
    settings?: {
      theme?: "light" | "dark";
      notificationsEnabled?: boolean;
      dailyGoal?: number;
      dailyNew?: number;
      language?: string;
      timeZone?: string;
    };
    followingCount?: number;
    followersCount?: number;
    profileCompleted?: boolean;
    interests?: string[];
  } = {}
): Promise<void> {
  const userData: Omit<User, "id"> = {
    username: data.username || `user-${userId}`,
    email: data.email || `${userId}@test.com`,
    settings: {
      theme: data.settings?.theme || "light",
      notificationsEnabled: data.settings?.notificationsEnabled ?? true,
      dailyGoal: data.settings?.dailyGoal ?? 10,
      dailyNew: data.settings?.dailyNew ?? 5,
      language: data.settings?.language || "en",
      timeZone: data.settings?.timeZone || "UTC",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    league: data.league ?? 1,
    experiencePoints: data.experiencePoints ?? 0,
    currencyCount: data.currencyCount ?? 0,
    stats: {
      totalCards: data.stats?.totalCards ?? 0,
      totalDecks: data.stats?.totalDecks ?? 0,
      totalReviews: data.stats?.totalReviews ?? 0,
      averageDifficulty: data.stats?.averageDifficulty ?? 0,
      currentStreak: data.stats?.currentStreak ?? 0,
      longestStreak: data.stats?.longestStreak ?? 0,
    },
    followingCount: data.followingCount ?? 0,
    followersCount: data.followersCount ?? 0,
    profileCompleted: data.profileCompleted ?? false,
    interests: data.interests || [],
    currentGroupId: data.currentGroupId ?? null,
  };

  if (data.currentGroupId !== undefined) {
    userData.currentGroupId = data.currentGroupId;
  }

  if (data.stats?.lastStreakDate !== undefined) {
    userData.stats.lastStreakDate = data.stats.lastStreakDate;
  }

  if (data.stats?.lastStudyDate !== undefined) {
    userData.stats.lastStudyDate = data.stats.lastStudyDate;
  }

  await db.doc(`users/${userId}`).set(userData);
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
  data: {
    cardData?: { front: string; back: string };
    tags?: string[];
    cardAlgo?: {
      difficulty: number;
      stability: number;
      reps: number;
      lapses: number;
      scheduled_days: number;
      elapsed_days: number;
      last_review?: Date;
      state: number;
      due: Date;
    };
    firstLearn?: {
      isNew: boolean;
      isFirst?: boolean;
      due?: Date;
      consecutiveGood?: number;
    };
    grade?: CardGrade;
    createdAt?: Date;
  } = {}
): Promise<void> {
  const cardData: any = {
    id: cardId,
    cardData: data.cardData || {
      front: "Test question",
      back: "Test answer",
    },
    tags: data.tags || [],
    createdAt: data.createdAt
      ? admin.firestore.Timestamp.fromDate(data.createdAt)
      : admin.firestore.FieldValue.serverTimestamp(),
    firstLearn: data.firstLearn
      ? {
          isNew: data.firstLearn.isNew,
          isFirst: data.firstLearn.isFirst,
          due: data.firstLearn.due
            ? admin.firestore.Timestamp.fromDate(data.firstLearn.due)
            : undefined,
          consecutiveGood: data.firstLearn.consecutiveGood,
        }
      : {
          isNew: true,
        },
  };

  if (data.cardAlgo) {
    cardData.cardAlgo = {
      difficulty: data.cardAlgo.difficulty,
      stability: data.cardAlgo.stability,
      reps: data.cardAlgo.reps,
      lapses: data.cardAlgo.lapses,
      scheduled_days: data.cardAlgo.scheduled_days,
      elapsed_days: data.cardAlgo.elapsed_days,
      last_review: data.cardAlgo.last_review
        ? admin.firestore.Timestamp.fromDate(data.cardAlgo.last_review)
        : undefined,
      state: data.cardAlgo.state,
      due: admin.firestore.Timestamp.fromDate(data.cardAlgo.due),
    };
  }

  if (data.grade !== undefined) {
    cardData.grade = data.grade;
  }

  await db.doc(`decks/${deckId}/cards/${cardId}`).set(cardData);
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
    id: seasonId,
    status: "active",
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
  const seasonUserPointsDoc: SeasonUserPoints = {
    points: data.points || 0,
    league: data.league || 1,
    lastActivityAt: new Date(),
  };
  if (data.groupId !== undefined) {
    seasonUserPointsDoc.groupId = data.groupId;
  }

  await db
    .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
    .set(seasonUserPointsDoc);
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
 * Create a following relationship between users
 */
export async function createFollowingRelationship(
  userId: string,
  followingUserId: string
): Promise<void> {
  await db
    .doc(`users/${userId}/following/${followingUserId}`)
    .set({ userId: followingUserId });
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
    grade: CardGrade.Easy,
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

/**
 * Test Builder: Create mock callable request with auth
 * This helper ensures type safety while allowing partial mocks for testing
 */
export function createMockCallableRequest<T = unknown>(options: {
  auth?: { uid: string } | null;
  data?: T;
}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    auth: options.auth ?? null,
    data: options.data,
  } as any;
}

/**
 * Create a test user deck document (users/{userId}/decks/{deckId})
 */
export async function createTestUserDeck(
  userId: string,
  deckId: string,
  data: {
    title?: string;
    cardsNum?: number;
    settings?: {
      zenMode?: boolean;
      dueCardsNumPerDay?: number;
      newCardsNumPerDay?: number;
    };
    updatedAt?: Date;
    lastReviewDate?: Date;
  } = {}
): Promise<void> {
  const deckData: Record<string, unknown> = {
    id: deckId,
    title: data.title || "Test User Deck",
    cardsNum: data.cardsNum || 0,
    settings: (() => {
      const settings: Record<string, unknown> = {
        zenMode: data.settings?.zenMode || false,
      };
      // Only add optional fields if provided (schema expects number | undefined, not null)
      if (data.settings?.dueCardsNumPerDay !== undefined) {
        settings.dueCardsNumPerDay = data.settings.dueCardsNumPerDay;
      }
      if (data.settings?.newCardsNumPerDay !== undefined) {
        settings.newCardsNumPerDay = data.settings.newCardsNumPerDay;
      }
      return settings;
    })(),
    updatedAt: data.updatedAt
      ? admin.firestore.Timestamp.fromDate(data.updatedAt)
      : admin.firestore.FieldValue.serverTimestamp(),
  };

  // Only add lastReviewDate if provided (Firestore doesn't accept undefined)
  if (data.lastReviewDate !== undefined) {
    deckData.lastReviewDate = admin.firestore.Timestamp.fromDate(
      data.lastReviewDate
    );
  }

  await db.doc(`users/${userId}/decks/${deckId}`).set(deckData);
}

/**
 * Create a test user card document (users/{userId}/decks/{deckId}/cards/{cardId})
 */
export async function createTestUserCard(
  userId: string,
  deckId: string,
  cardId: string,
  data: {
    cardData?: { front: string; back: string };
    tags?: string[];
    cardAlgo?: {
      difficulty: number;
      stability: number;
      reps: number;
      lapses: number;
      scheduled_days: number;
      elapsed_days: number;
      last_review?: Date;
      state: number;
      due: Date;
    };
    firstLearn?: {
      isNew: boolean;
      isFirst?: boolean;
      due?: Date;
      consecutiveGood?: number;
    };
    grade?: CardGrade;
    createdAt?: Date;
  } = {}
): Promise<void> {
  const cardData: any = {
    id: cardId,
    cardData: data.cardData || {
      front: "Test question",
      back: "Test answer",
    },
    tags: data.tags || [],
    createdAt: data.createdAt
      ? admin.firestore.Timestamp.fromDate(data.createdAt)
      : admin.firestore.FieldValue.serverTimestamp(),
    firstLearn: data.firstLearn
      ? {
          isNew: data.firstLearn.isNew,
        }
      : {
          isNew: true,
        },
  };

  if (data.firstLearn?.isFirst !== undefined) {
    cardData.firstLearn.isFirst = data.firstLearn.isFirst;
  }

  if (data.firstLearn?.due !== undefined) {
    cardData.firstLearn.due = admin.firestore.Timestamp.fromDate(
      data.firstLearn.due
    );
  }

  if (data.firstLearn?.consecutiveGood !== undefined) {
    cardData.firstLearn.consecutiveGood = data.firstLearn.consecutiveGood;
  }

  if (data.cardAlgo) {
    cardData.cardAlgo = {
      difficulty: data.cardAlgo.difficulty,
      stability: data.cardAlgo.stability,
      reps: data.cardAlgo.reps,
      lapses: data.cardAlgo.lapses,
      scheduled_days: data.cardAlgo.scheduled_days,
      elapsed_days: data.cardAlgo.elapsed_days,
      state: data.cardAlgo.state,
      due: admin.firestore.Timestamp.fromDate(data.cardAlgo.due),
    };
  }

  if (data.cardAlgo?.last_review !== undefined) {
    cardData.cardAlgo.last_review = admin.firestore.Timestamp.fromDate(
      data.cardAlgo?.last_review
    );
  }

  if (data.grade !== undefined) {
    cardData.grade = data.grade;
  }

  await db.doc(`users/${userId}/decks/${deckId}/cards/${cardId}`).set(cardData);
}

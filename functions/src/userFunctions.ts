import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Get user decks with cards
 */
export const getUserDecks = onCall(async (request) => {
  const { userId } = request.data;

  if (!userId) {
    throw new Error("UserId is required");
  }

  try {
    const decksSnapshot = await db.collection(`users/${userId}/decks`).get();

    const decks = await Promise.all(
      decksSnapshot.docs.map(async (deckDoc) => {
        const deckData = deckDoc.data();
        // Get cards for this deck
        const cardsSnapshot = await deckDoc.ref.collection("cards").get();
        const cards = cardsSnapshot.docs.map((cardDoc) => ({
          id: cardDoc.id,
          ...cardDoc.data(),
        }));

        return {
          id: deckDoc.id,
          ...deckData,
          cards,
        };
      })
    );

    return { decks };
  } catch (error) {
    logger.error("Error getting user decks", error);
    throw new Error("Failed to get user decks");
  }
});

/**
 * Update card progress after review
 */
export const updateCardProgress = onCall(async (request) => {
  const { userId, deckId, cardId, grade, difficulty, interval, firstLearn } =
    request.data;

  if (!userId || !deckId || !cardId) {
    throw new Error("userId, deckId, and cardId are required");
  }

  try {
    const cardRef = db.doc(`decks/${deckId}/cards/${cardId}`);
    const now = new Date();
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + (interval || 1));

    const cardDoc = await cardRef.get();
    const existingAlgo = cardDoc.data()?.cardAlgo || {};
    const existingFirstLearn = cardDoc.data()?.firstLearn || {};
    await cardRef.update({
      cardAlgo: {
        ...existingAlgo,
        difficulty: difficulty ?? existingAlgo.difficulty ?? 2.5,
        scheduled_days: interval ?? existingAlgo.scheduled_days ?? 1,
        due: nextDue,
        last_review: now,
        reps: (existingAlgo.reps ?? 0) + 1,
        state: 2, // reviewed state; dostosuj wg Twojej definicji stanów
      },
      firstLearn: firstLearn
        ? {
            ...existingFirstLearn,
            ...firstLearn,
          }
        : existingFirstLearn,
      grade: grade ?? 0,
      lastReviewDate: now,
    });

    // Log study session
    await db.collection(`users/${userId}/studySessions`).add({
      deckId,
      cardId,
      grade,
      date: new Date(),
      reviewTime: new Date().getTime(),
    });

    logger.info("Card progress updated successfully", {
      userId,
      deckId,
      cardId,
      grade,
      firstLearn,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error updating card progress", error);
    throw new Error("Failed to update card progress");
  }
});

/**
 * Get user progress and statistics
 */
export const getUserProgress = onCall(async (request) => {
  const { userId } = request.data;

  if (!userId) {
    throw new Error("UserId is required");
  }

  try {
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new Error("User not found");
    }

    // Get recent study sessions
    const recentSessions = await db
      .collection(`users/${userId}/studySessions`)
      .orderBy("date", "desc")
      .limit(10)
      .get();

    const sessions = recentSessions.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate study streak
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const streakQuery = await db
      .collection(`users/${userId}/studySessions`)
      .where("date", ">=", yesterday)
      .get();

    const streak = streakQuery.size;

    return {
      stats: userData.stats || {},
      recentSessions: sessions,
      streak,
      lastStudyDate: userData.lastStudyDate,
    };
  } catch (error) {
    logger.error("Error getting user progress", error);
    throw new Error("Failed to get user progress");
  }
});

/**
 * Get user settings
 */
export const getUserSettings = onCall(async (request) => {
  const { userId } = request.data;

  if (!userId) {
    throw new Error("UserId is required");
  }

  try {
    // Try a dedicated settings doc first: users/{userId}/settings/app
    const settingsDocPath = db.doc(`users/${userId}/settings/app`);
    const settingsDoc = await settingsDocPath.get();

    if (settingsDoc.exists) {
      return { settings: settingsDoc.data() || {} };
    }

    // Fallback: settings embedded in user root document under `settings`
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data() || ({} as Record<string, unknown>);
    return { settings: userData.settings || {} };
  } catch (error) {
    logger.error("Error getting user settings", error);
    throw new Error("Failed to get user settings");
  }
});

/**
 * Process friend requests
 */
export const processFriendRequest = onCall(async (request) => {
  const { fromUserId, toUserId, action } = request.data;

  if (!fromUserId || !toUserId || !action) {
    throw new Error("fromUserId, toUserId, and action are required");
  }

  try {
    const batch = db.batch();

    if (action === "accept") {
      // Add to friends list for both users
      const fromUserRef = db.doc(`users/${fromUserId}`);
      const toUserRef = db.doc(`users/${toUserId}`);

      batch.update(fromUserRef, {
        friends: FieldValue.arrayUnion(toUserId),
      });
      batch.update(toUserRef, {
        friends: FieldValue.arrayUnion(fromUserId),
      });

      // Remove from pending/incoming lists
      batch.update(fromUserRef, {
        pending: FieldValue.arrayRemove(toUserId),
      });
      batch.update(toUserRef, {
        incoming: FieldValue.arrayRemove(fromUserId),
      });
    } else if (action === "reject") {
      // Remove from pending/incoming lists
      const fromUserRef = db.doc(`users/${fromUserId}`);
      const toUserRef = db.doc(`users/${toUserId}`);

      batch.update(fromUserRef, {
        pending: FieldValue.arrayRemove(toUserId),
      });
      batch.update(toUserRef, {
        incoming: FieldValue.arrayRemove(fromUserId),
      });
    }

    await batch.commit();

    logger.info("Friend request processed", {
      fromUserId,
      toUserId,
      action,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error processing friend request", error);
    throw new Error("Failed to process friend request");
  }
});

/**
 * Validate user data on creation
 */
export const validateUserData = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    const userData = event.data?.after.data();
    if (!userData) {
      return;
    }

    try {
      // Check for duplicate email
      if (userData.email) {
        const emailQuery = await db
          .collection("users")
          .where("email", "==", userData.email)
          .get();

        if (emailQuery.size > 1) {
          logger.warn("Duplicate email detected", {
            userId: event.params.userId,
            email: userData.email,
          });
        }
      }

      // Initialize user statistics
      await event.data?.after.ref.update({
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
      });

      logger.info("User data validated and initialized", {
        userId: event.params.userId,
      });
    } catch (error) {
      logger.error("Error validating user data", error);
    }
  }
);

/**
 * Return server authoritative time and optional active season info
 */
export const serverNow = onCall(async () => {
  const now = new Date();
  return {
    nowMs: now.getTime(),
    iso: now.toISOString(),
  };
});

/**
 * Get or initialize current season (weekly windows, server-defined)
 * Collection: ranking/currentSeason
 */
export const getCurrentSeason = onCall(async () => {
  const seasonRef = db.doc("ranking/currentSeason");
  const snap = await seasonRef.get();

  const computeWindow = () => {
    const now = new Date();
    // Start of current week (Mon 00:00 UTC)
    const day = now.getUTCDay();
    const diffToMonday = (day + 6) % 7; // 0 for Monday
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    start.setUTCDate(start.getUTCDate() - diffToMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const seasonId = `${start.toISOString().slice(0, 10)}_${end
      .toISOString()
      .slice(0, 10)}`;
    return { seasonId, startAt: start, endAt: end, status: "active" } as const;
  };

  if (!snap.exists) {
    const window = computeWindow();
    await seasonRef.set({ ...window, createdAt: FieldValue.serverTimestamp() });
    return window;
  }

  const data = snap.data() as {
    seasonId: string;
    startAt: any;
    endAt: any;
    status: string;
  };
  return data;
});

/**
 * Submit points for current season (authoritative, server-timestamped)
 * Request: { userId: string; delta: number }
 */
export const submitPoints = onCall(async (request) => {
  const { userId, delta } = request.data || {};
  if (!userId || typeof delta !== "number") {
    throw new Error("userId and numeric delta are required");
  }

  // Call local function directly to avoid nested onCall.run typing
  const seasonSnap = await db.doc("ranking/currentSeason").get();
  let seasonId: string | undefined;
  if (seasonSnap.exists) {
    const data = seasonSnap.data() as { seasonId?: string };
    seasonId = data?.seasonId;
  } else {
    // initialize if missing
    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    start.setUTCDate(start.getUTCDate() - diffToMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    seasonId = `${start.toISOString().slice(0, 10)}_${end
      .toISOString()
      .slice(0, 10)}`;
    await seasonSnap.ref.set({
      seasonId,
      startAt: start,
      endAt: end,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  if (!seasonId) {
    throw new Error("No active season");
  }

  const docRef = db.doc(`seasonUserPoints/${seasonId}/users/${userId}`);

  await db.runTransaction(async (trx) => {
    const snap = await trx.get(docRef);
    const prev = snap.exists
      ? (snap.data() as { points?: number })
      : { points: 0 };
    const nextPoints = (prev.points || 0) + delta;
    trx.set(
      docRef,
      {
        points: nextPoints,
        lastActivityAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  logger.info("Points submitted", { userId, delta, seasonId });
  return { success: true };
});

/**
 * Close current season and publish simple leaderboard snapshot
 * For production, consider Cloud Scheduler to call this weekly.
 */
export const weeklyRollOver = onCall(async () => {
  const seasonDoc = await db.doc("ranking/currentSeason").get();
  if (!seasonDoc.exists) {
    throw new Error("No current season");
  }
  const { seasonId, endAt } = seasonDoc.data() as any;
  const now = new Date();
  if (endAt?.toDate && now < endAt.toDate()) {
    // Not yet ended, but allow manual publish
    logger.warn("weeklyRollOver called before season end", { seasonId });
  }

  // Build leaderboard (global, top 100)
  const usersSnap = await db
    .collection(`seasonUserPoints/${seasonId}/users`)
    .orderBy("points", "desc")
    .limit(100)
    .get();

  const entries = usersSnap.docs.map((d, idx) => {
    const data = d.data() as { points?: number; lastActivityAt?: unknown };
    return {
      userId: d.id,
      points: data.points ?? 0,
      lastActivityAt: data.lastActivityAt ?? null,
      position: idx + 1,
    };
  });

  await db.doc(`leaderboards/${seasonId}/groups/global`).set(
    {
      entries,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Initialize next season window
  const end = endAt?.toDate ? endAt.toDate() : new Date();
  const nextStart = new Date(end);
  const nextEnd = new Date(nextStart);
  nextEnd.setUTCDate(nextEnd.getUTCDate() + 7);
  const nextId = `${nextStart.toISOString().slice(0, 10)}_${nextEnd
    .toISOString()
    .slice(0, 10)}`;

  await seasonDoc.ref.set(
    {
      seasonId: nextId,
      startAt: nextStart,
      endAt: nextEnd,
      status: "active",
      rolledAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.info("Season rolled over", { prev: seasonId, next: nextId });
  return { success: true, nextSeasonId: nextId };
});

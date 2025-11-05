import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/firestore";
import { transformCardData } from "./types/common";

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
    // Get decks created by user (from main decks collection)
    const decksSnapshot = await db
      .collection("decks")
      .where("createdBy", "==", userId)
      .get();

    const decks = await Promise.all(
      decksSnapshot.docs.map(async (deckDoc) => {
        const deckData = deckDoc.data();
        // Get cards for this deck
        const cardsSnapshot = await deckDoc.ref.collection("cards").get();
        const cards = cardsSnapshot.docs.map((cardDoc) =>
          transformCardData(cardDoc)
        );

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
    // Lazy copying: Update progress in cardProgress collection (creates if doesn't exist)
    const progressRef = db.doc(
      `users/${userId}/decks/${deckId}/cardProgress/${cardId}`
    );
    const now = new Date();
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + (interval || 1));

    const progressDoc = await progressRef.get();
    const existingAlgo = progressDoc.data()?.cardAlgo || {};
    const existingFirstLearn = progressDoc.data()?.firstLearn || {};

    // Use set with merge to create if doesn't exist, update if exists
    await progressRef.set(
      {
        cardAlgo: {
          ...existingAlgo,
          difficulty: difficulty ?? existingAlgo.difficulty ?? 2.5,
          scheduled_days: interval ?? existingAlgo.scheduled_days ?? 1,
          due: nextDue,
          last_review: now,
          reps: (existingAlgo.reps ?? 0) + 1,
          state: 2, // reviewed state
        },
        firstLearn: firstLearn
          ? {
              ...existingFirstLearn,
              ...firstLearn,
            }
          : existingFirstLearn,
        grade: grade ?? 0,
        lastReviewDate: now,
        difficulty: difficulty ?? existingAlgo.difficulty ?? 2.5,
        nextReviewInterval: interval ?? existingAlgo.scheduled_days ?? 1,
      },
      { merge: true }
    );

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
    if (!userDoc.exists) {
      return { settings: {} };
    }
    const userData = userDoc.data() || ({} as Record<string, unknown>);

    // Get settings from user document
    // validateUserData sets theme: "light" at root level, not in settings object
    // So if we have userData.settings, it was explicitly set by user
    const userSettings = userData.settings as any;
    if (
      userSettings &&
      typeof userSettings === "object" &&
      Object.keys(userSettings).length > 0
    ) {
      return { settings: userSettings };
    }

    // No settings found
    return { settings: {} };
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
 * @param {any} event - event object
 * @return {Promise<void>}
 */
export const validateUserData = onDocumentWritten(
  "users/{userId}",
  async (event: any) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) {
      return;
    }

    try {
      // Check for duplicate email
      if (afterData.email) {
        const emailQuery = await db
          .collection("users")
          .where("email", "==", afterData.email)
          .get();

        if (emailQuery.size > 1) {
          logger.warn("Duplicate email detected", {
            userId: event.params.userId,
            email: afterData.email,
          });
        }
      }

      // Only initialize missing fields to avoid infinite loop
      // Check if this is a new document (before doesn't exist) or if fields are missing
      const isNewDocument = !beforeData;
      const needsInit =
        isNewDocument ||
        !afterData.stats ||
        !afterData.friends ||
        !afterData.pending ||
        !afterData.incoming ||
        !afterData.theme;

      if (needsInit) {
        const updates: any = {};

        // Only set stats if they don't exist
        if (!afterData.stats) {
          updates.stats = {
            totalCards: 0,
            totalDecks: 0,
            totalReviews: 0,
            averageDifficulty: 0,
          };
        }

        // Only set arrays if they don't exist
        if (!afterData.friends) {
          updates.friends = [];
        }
        if (!afterData.pending) {
          updates.pending = [];
        }
        if (!afterData.incoming) {
          updates.incoming = [];
        }

        // Only set theme if it doesn't exist
        if (!afterData.theme) {
          updates.theme = "light";
        }

        // Only update if there are fields to set
        if (Object.keys(updates).length > 0) {
          await event.data?.after.ref.update(updates);
          logger.info("User data validated and initialized", {
            userId: event.params.userId,
            fieldsUpdated: Object.keys(updates),
          });
        }
      }
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

  // Get user's current data to determine league and check for group
  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.exists
    ? (userDoc.data() as { league?: number })
    : {};
  const userSeasonPoints = await docRef.get();
  const seasonData = userSeasonPoints.exists
    ? (userSeasonPoints.data() as {
        points?: number;
        league?: number;
        groupId?: string;
      })
    : {};
  const userLeague = seasonData?.league ?? userData?.league ?? 1;
  let groupId = seasonData?.groupId;

  // Assign to group if needed (before transaction)
  if (!groupId) {
    const groupsRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${userLeague}`)
      .collection("groups");
    const allGroupsSnapshot = await groupsRef.get();

    let targetGroupId: string | null = null;

    // Find first group with capacity
    for (const groupDoc of allGroupsSnapshot.docs) {
      const groupData = groupDoc.data() as {
        currentCount?: number;
        isFull?: boolean;
        capacity?: number;
      };

      const currentCount = groupData?.currentCount ?? 0;
      const capacity = groupData?.capacity ?? 20;
      const isFull = groupData?.isFull ?? false;

      if (!isFull && currentCount < capacity) {
        targetGroupId = groupDoc.id;
        break;
      }
    }

    // If no group found, create a new one
    if (!targetGroupId) {
      const newGroupRef = groupsRef.doc();
      targetGroupId = newGroupRef.id;

      // Create group before transaction
      await newGroupRef.set({
        createdAt: FieldValue.serverTimestamp(),
        isFull: false,
        capacity: 20,
        currentCount: 0,
        seasonId,
        leagueNumber: userLeague,
      });
    }

    groupId = targetGroupId;
  }

  // Now run transaction to update points and group membership atomically
  await db.runTransaction(async (trx) => {
    // All reads must happen before any writes
    const snap = await trx.get(docRef);
    const prev = snap.exists
      ? (snap.data() as { points?: number; league?: number; groupId?: string })
      : { points: 0 };
    const nextPoints = (prev.points || 0) + delta;

    // Read group document if this is a new assignment (must be before writes)
    let groupDoc = null;
    if (!prev.groupId && groupId) {
      const groupRef = db
        .collection("leagueGroups")
        .doc(`${seasonId}_${userLeague}`)
        .collection("groups")
        .doc(groupId);
      groupDoc = await trx.get(groupRef);
    }

    // Now all writes can happen
    // Update season user points
    trx.set(
      docRef,
      {
        points: nextPoints,
        lastActivityAt: FieldValue.serverTimestamp(),
        league: userLeague,
        groupId: groupId,
      },
      { merge: true }
    );

    // Update user document
    trx.update(db.doc(`users/${userId}`), {
      currentGroupId: groupId,
      league: userLeague,
    });

    // Update group member points
    const memberRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${userLeague}`)
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .doc(userId);

    trx.set(
      memberRef,
      {
        userId,
        points: nextPoints,
        lastActivityAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // If this is a new group assignment, update group count
    if (!prev.groupId && groupId && groupDoc) {
      if (groupDoc.exists) {
        const groupData = groupDoc.data() as {
          currentCount?: number;
          capacity?: number;
        };
        const newCount = (groupData?.currentCount ?? 0) + 1;
        const groupRefForUpdate = db
          .collection("leagueGroups")
          .doc(`${seasonId}_${userLeague}`)
          .collection("groups")
          .doc(groupId);

        trx.update(groupRefForUpdate, {
          currentCount: newCount,
          isFull: newCount >= (groupData?.capacity ?? 20),
        });
      }
    }
  });

  logger.info("Points submitted", { userId, delta, seasonId, groupId });
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

/**
 * Update user settings
 */
export const updateUserSettings = onCall(async (request) => {
  const { userId, settings } = request.data || {};

  if (!userId || !settings) {
    throw new Error("userId and settings are required");
  }

  try {
    // Update dedicated settings doc: users/{userId}/settings/app
    const settingsDocPath = db.doc(`users/${userId}/settings/app`);
    await settingsDocPath.set(settings, { merge: true });

    logger.info("User settings updated", { userId });

    return { success: true };
  } catch (error) {
    logger.error("Error updating user settings", error);
    throw new Error("Failed to update user settings");
  }
});

/**
 * Get user profile with full information
 */
export const getUserProfile = onCall(async (request) => {
  const { userId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    const userDoc = await db.doc(`users/${userId}`).get();

    if (!userDoc.exists) {
      logger.error("User not found", { userId });
      throw new Error("User not found");
    }

    const userData = userDoc.data() as {
      username?: string;
      name?: string;
      email?: string;
      friends?: string[];
      stats?: {
        totalCards?: number;
        totalDecks?: number;
        totalReviews?: number;
        averageDifficulty?: number;
      };
      streak?: number;
      league?: number;
      points?: number;
    };

    // Get friends count
    const friends = userData?.friends || [];
    const friendsCount = friends.length;

    // For now, followers and following are the same (can be extended later)
    const followers = friends.length;
    const following = friends.length;

    return {
      userId,
      username: userData?.username || userData?.name || "Unknown",
      email: userData?.email || null,
      stats: userData?.stats || {},
      streak: userData?.streak || 0,
      league: userData?.league || 1,
      points: userData?.points || 0,
      friendsCount,
      followers,
      following,
    };
  } catch (error) {
    logger.error("Error getting user profile", error);
    if (error instanceof Error && error.message === "User not found") {
      throw error;
    }
    throw new Error("Failed to get user profile");
  }
});

/**
 * Get user activity heatmap data
 */
export const getUserActivityHeatmap = onCall(async (request) => {
  const { userId, weeks = 16 } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    const today = new Date();
    const days = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    // Get study sessions in the date range
    const sessionsRef = db
      .collection(`users/${userId}/studySessions`)
      .where("date", ">=", startDate);

    const sessionsSnapshot = await sessionsRef.get();

    // Count sessions per day
    const activityMap: Record<string, number> = {};

    sessionsSnapshot.docs.forEach((doc) => {
      const sessionData = doc.data();
      const sessionDate = sessionData.date?.toDate
        ? sessionData.date.toDate()
        : new Date(sessionData.date);

      if (isNaN(sessionDate.getTime())) {
        return;
      }

      const dateKey = sessionDate.toISOString().slice(0, 10); // YYYY-MM-DD
      activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    });

    // Generate heatmap data for all days in range
    const heatmapData: Array<{ date: string; count: number }> = [];

    // Generate exactly 'days' days ending with today
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      dt.setHours(0, 0, 0, 0);
      const iso = dt.toISOString().slice(0, 10);
      heatmapData.push({
        date: iso,
        count: activityMap[iso] || 0,
      });
    }

    return { heatmapData };
  } catch (error) {
    logger.error("Error getting user activity heatmap", error);
    throw new Error("Failed to get user activity heatmap");
  }
});

/**
 * Get user awards
 */
export const getUserAwards = onCall(async (request) => {
  const { userId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    const awardsRef = db
      .collection(`users/${userId}/awards`)
      .orderBy("earnedAt", "desc");

    const awardsSnapshot = await awardsRef.get();

    const awards = awardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { awards };
  } catch (error) {
    logger.error("Error getting user awards", error);
    throw new Error("Failed to get user awards");
  }
});

/**
 * Get friends streaks
 */
export const getFriendsStreaks = onCall(async (request) => {
  const { userId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    // Get user's friends
    const userDoc = await db.doc(`users/${userId}`).get();

    if (!userDoc.exists) {
      return { friendsStreaks: [] };
    }

    const userData = userDoc.data() as { friends?: string[] };
    const friends = userData?.friends || [];

    if (friends.length === 0) {
      return { friendsStreaks: [] };
    }

    // Get streak data for each friend
    const friendsStreaks = await Promise.all(
      friends.map(async (friendId) => {
        try {
          const friendDoc = await db.doc(`users/${friendId}`).get();

          if (!friendDoc.exists) {
            return null;
          }

          const friendData = friendDoc.data() as {
            username?: string;
            name?: string;
            streak?: number;
          };

          return {
            userId: friendId,
            name: friendData?.username || friendData?.name || "Unknown",
            streak: friendData?.streak || 0,
          };
        } catch (error) {
          logger.warn("Error getting friend streak", { friendId, error });
          return null;
        }
      })
    );

    // Filter out nulls and sort by streak descending
    const validStreaks = friendsStreaks
      .filter(
        (fs): fs is { userId: string; name: string; streak: number } =>
          fs !== null
      )
      .sort((a, b) => b.streak - a.streak);

    return { friendsStreaks: validStreaks };
  } catch (error) {
    logger.error("Error getting friends streaks", error);
    throw new Error("Failed to get friends streaks");
  }
});

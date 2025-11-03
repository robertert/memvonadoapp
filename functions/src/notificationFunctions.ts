import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/firestore";

const db = getFirestore();

export interface NotificationData {
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "error";
  linkTo?: string;
}

/**
 * Get notifications for a user
 */
export const getNotifications = onCall(async (request) => {
  const { userId, limit = 50 } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    const notificationsRef = db
      .collection(`users/${userId}/notifications`)
      .orderBy("createdAt", "desc")
      .limit(limit);

    const notificationsSnapshot = await notificationsRef.get();

    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { notifications };
  } catch (error) {
    logger.error("Error getting notifications", error);
    throw new Error("Failed to get notifications");
  }
});

/**
 * Mark notification as read
 */
export const markNotificationRead = onCall(async (request) => {
  const { userId, notificationId } = request.data || {};

  if (!userId || !notificationId) {
    throw new Error("userId and notificationId are required");
  }

  try {
    const notificationRef = db.doc(
      `users/${userId}/notifications/${notificationId}`
    );

    const notificationDoc = await notificationRef.get();
    if (!notificationDoc.exists) {
      throw new Error("Notification not found");
    }

    await notificationRef.update({
      read: true,
      readAt: FieldValue.serverTimestamp(),
    });

    logger.info("Notification marked as read", { userId, notificationId });

    return { success: true };
  } catch (error) {
    logger.error("Error marking notification as read", error);
    if (error instanceof Error && error.message === "Notification not found") {
      throw error;
    }
    throw new Error("Failed to mark notification as read");
  }
});

/**
 * Create a notification for a user (for system use)
 */
export const createNotification = onCall(async (request) => {
  const { userId, notification } = request.data || {};

  if (!userId || !notification) {
    throw new Error("userId and notification are required");
  }

  try {
    const notificationRef = db.collection(`users/${userId}/notifications`);

    const notificationDoc = await notificationRef.add({
      title: notification.title,
      body: notification.body,
      type: notification.type || "info",
      linkTo: notification.linkTo || null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Notification created", { userId, notification });

    return { success: true, notificationId: notificationDoc.id };
  } catch (error) {
    logger.error("Error creating notification", error);
    throw new Error("Failed to create notification");
  }
});

/**
 * Trigger: Create notification when user advances league
 * Triggered when user's league field changes
 */

export const onLeagueAdvance = onDocumentWritten(
  "users/{userId}",
  async (event: any) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      return;
    }

    const beforeLeague = beforeData.league ?? 1;
    const afterLeague = afterData.league ?? 1;

    // Check if league increased
    if (afterLeague > beforeLeague && afterLeague <= 15) {
      const userId = event.params.userId;

      try {
        await db.collection(`users/${userId}/notifications`).add({
          title: "Ranking Up!",
          body: `Congrats! You advanced to League ${afterLeague}.`,
          type: "success",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.info("League advance notification created", {
          userId,
          fromLeague: beforeLeague,
          toLeague: afterLeague,
        });
      } catch (error) {
        logger.error("Error creating league advance notification", error);
      }
    }
  }
);

/**
 * Trigger: Create notification when streak is broken
 * This should be triggered by a scheduled function or when streak reaches 0
 */
export const notifyStreakBroken = onCall(async (request) => {
  const { userId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    await db.collection(`users/${userId}/notifications`).add({
      title: "Streak broken",
      body: "You missed your daily practice. Start again today!",
      type: "warning",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Streak broken notification created", { userId });

    return { success: true };
  } catch (error) {
    logger.error("Error creating streak broken notification", error);
    throw new Error("Failed to create streak broken notification");
  }
});

/**
 * Trigger: Create notification when season ends
 * Should be called from weeklyRollOver
 */
export const notifySeasonEnd = onCall(async (request) => {
  const { userId, seasonId, finalPosition, leagueNumber } = request.data || {};

  if (!userId || !seasonId) {
    throw new Error("userId and seasonId are required");
  }

  try {
    let notificationBody = "Season ended! Check your final ranking.";

    if (
      finalPosition !== undefined &&
      finalPosition <= 3 &&
      leagueNumber !== undefined &&
      leagueNumber < 15
    ) {
      notificationBody = `Season ended! You finished ${
        finalPosition === 1 ? "1st" : finalPosition === 2 ? "2nd" : "3rd"
      } in your group and advanced to League ${leagueNumber + 1}!`;
    }

    await db.collection(`users/${userId}/notifications`).add({
      title: "Weekly League Reset!",
      body: notificationBody,
      type: "info",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Season end notification created", {
      userId,
      seasonId,
      finalPosition,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error creating season end notification", error);
    throw new Error("Failed to create season end notification");
  }
});

import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  NotificationSchema,
  UserSchema,
  type Notification,
} from "./types/common";
import { z } from "zod";
import {
  GetNotificationsRequestSchema,
  MarkNotificationReadRequestSchema,
  CreateNotificationRequestSchema,
  NotifyStreakBrokenRequestSchema,
  NotifySeasonEndRequestSchema,
  GetNotificationsResponseSchema,
  MarkNotificationReadResponseSchema,
  CreateNotificationResponseSchema,
  NotifyStreakBrokenResponseSchema,
  NotifySeasonEndResponseSchema,
} from "memvocado-types/schemas/api/notification";
import { serializeTimestamps } from "./utils/serialization";

const db = getFirestore();

/**
 * Whitelistowane pola dla aktualizacji powiadomienia.
 * Używane w markNotificationRead, aby nie dopuścić do update innych pól.
 */
const NotificationUpdateSchema = NotificationSchema.pick({
  read: true,
}).partial();

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
  const parsed = GetNotificationsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, limit = 50 } = parsed.data;

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

    const rawResponse = { notifications };
    GetNotificationsResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting notifications", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get notifications");
  }
});

/**
 * Mark notification as read
 */
export const markNotificationRead = onCall(async (request) => {
  const parsed = MarkNotificationReadRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, notificationId } = parsed.data;

  try {
    const notificationRef = db.doc(
      `users/${userId}/notifications/${notificationId}`
    );

    const notificationDoc = await notificationRef.get();
    if (!notificationDoc.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const safeUpdate = NotificationUpdateSchema.parse({
      read: true,
    });

    await notificationRef.update({
      ...safeUpdate,
      readAt: FieldValue.serverTimestamp(),
    });

    logger.info("Notification marked as read", { userId, notificationId });

    const rawResponse = { success: true };
    MarkNotificationReadResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error marking notification as read", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to mark notification as read");
  }
});

/**
 * Create a notification for a user (for system use)
 */
export const createNotification = onCall(async (request) => {
  const parsed = CreateNotificationRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, notification } = parsed.data;

  try {
    // Waliduj i typuj powiadomienie przed zapisem
    const notificationData: Omit<Notification, "createdAt" | "readAt" | "id"> =
      {
        title: notification.title,
        body: notification.body,
        type: notification.type || "info",
        linkTo: notification.linkTo,
        read: false,
      };
    NotificationSchema.omit({ createdAt: true, readAt: true, id: true }).parse(
      notificationData
    );

    const notificationRef = db.collection(`users/${userId}/notifications`);

    const notificationDoc = await notificationRef.add({
      ...notificationData,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Notification created", { userId, notification });

    const rawResponse = {
      success: true,
      notificationId: notificationDoc.id,
    };
    CreateNotificationResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error creating notification", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to create notification");
  }
});

/**
 * Trigger: Create notification when user advances league
 * Triggered when user's league field changes
 */

export const onLeagueAdvance = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    const beforeDataRaw = event.data?.before.data();
    const afterDataRaw = event.data?.after.data();

    if (!beforeDataRaw || !afterDataRaw) {
      return;
    }

    try {
      const beforeData = UserSchema.pick({ league: true }).parse(beforeDataRaw);
      const afterData = UserSchema.pick({ league: true }).parse(afterDataRaw);

      const beforeLeague = beforeData.league ?? 1;
      const afterLeague = afterData.league ?? 1;

      // Check if league increased
      if (afterLeague > beforeLeague && afterLeague <= 15) {
        const userId = event.params.userId;

        // Waliduj i typuj powiadomienie przed zapisem
        const notificationData: Omit<
          Notification,
          "createdAt" | "readAt" | "id"
        > = {
          title: "Ranking Up!",
          body: `Congrats! You advanced to League ${afterLeague}.`,
          type: "success",
          read: false,
        };
        NotificationSchema.omit({
          createdAt: true,
          readAt: true,
          id: true,
        }).parse(notificationData);

        await db.collection(`users/${userId}/notifications`).add({
          ...notificationData,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.info("League advance notification created", {
          userId,
          fromLeague: beforeLeague,
          toLeague: afterLeague,
        });
      }
    } catch (error) {
      logger.error("Error validating user data in onLeagueAdvance", error);
      if (error instanceof z.ZodError) {
        logger.error("User data validation failed", error.errors);
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Failed to create league advance notification"
      );
    }
  }
);

/**
 * Trigger: Create notification when streak is broken
 * This should be triggered by a scheduled function or when streak reaches 0
 */
export const notifyStreakBroken = onCall(async (request) => {
  const parsed = NotifyStreakBrokenRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId } = parsed.data;

  try {
    // Waliduj i typuj powiadomienie przed zapisem
    const notificationData: Omit<Notification, "createdAt" | "readAt" | "id"> =
      {
        title: "Streak broken",
        body: "You missed your daily practice. Start again today!",
        type: "warning",
        read: false,
      };
    NotificationSchema.omit({ createdAt: true, readAt: true, id: true }).parse(
      notificationData
    );

    await db.collection(`users/${userId}/notifications`).add({
      ...notificationData,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Streak broken notification created", { userId });

    const rawResponse = { success: true };
    NotifyStreakBrokenResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error creating streak broken notification", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Failed to create streak broken notification"
    );
  }
});

/**
 * Trigger: Create notification when season ends
 * Should be called from weeklyRollOver
 */
export const notifySeasonEnd = onCall(async (request) => {
  const parsed = NotifySeasonEndRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, seasonId, finalPosition, leagueNumber } = parsed.data;

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

    // Waliduj i typuj powiadomienie przed zapisem
    const notificationData: Omit<Notification, "createdAt" | "readAt" | "id"> =
      {
        title: "Weekly League Reset!",
        body: notificationBody,
        type: "info",
        read: false,
      };
    NotificationSchema.omit({ createdAt: true, readAt: true, id: true }).parse(
      notificationData
    );

    await db.collection(`users/${userId}/notifications`).add({
      ...notificationData,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Season end notification created", {
      userId,
      seasonId,
      finalPosition,
    });

    const rawResponse = { success: true };
    NotifySeasonEndResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error creating season end notification", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Failed to create season end notification"
    );
  }
});

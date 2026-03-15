import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { UserSchema } from "memvocado-types";
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
import { serializeTimestamps } from "../utils/serialization";
import { FirestoreNotificationRepository } from "../repositories/firestore/FirestoreNotificationRepository";
import { NotificationService } from "../services/NotificationService";

const notifRepo = new FirestoreNotificationRepository();
const notifService = new NotificationService(notifRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

export const getNotifications = onCall(async (request) => {
  const parsed = GetNotificationsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { userId, limit = 50 } = parsed.data;

  try {
    const notifications = await notifService.getNotifications(userId, limit);
    const rawResponse = { notifications };
    GetNotificationsResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting notifications", error);
    handleZodError(error, "getNotifications");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get notifications");
  }
});

export const markNotificationRead = onCall(async (request) => {
  const parsed = MarkNotificationReadRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { userId, notificationId } = parsed.data;

  try {
    await notifService.markRead(userId, notificationId);
    const rawResponse = { success: true };
    MarkNotificationReadResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error marking notification as read", error);
    handleZodError(error, "markNotificationRead");
    if (error instanceof HttpsError) throw error;
    if ((error as { code?: string }).code === "not-found") {
      throw new HttpsError("not-found", "Notification not found");
    }
    throw new HttpsError("internal", "Failed to mark notification as read");
  }
});

export const createNotification = onCall(async (request) => {
  const parsed = CreateNotificationRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { userId, notification } = parsed.data;

  try {
    const notifId = await notifService.create(userId, {
      title: notification.title,
      body: notification.body,
      type: notification.type || "info",
      linkTo: notification.linkTo || null,
    });

    const rawResponse = { success: true, notificationId: notifId };
    CreateNotificationResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error creating notification", error);
    handleZodError(error, "createNotification");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to create notification");
  }
});

export const notifyStreakBroken = onCall(async (request) => {
  const parsed = NotifyStreakBrokenRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { userId } = parsed.data;

  try {
    await notifService.notifyStreakBroken(userId);
    const rawResponse = { success: true };
    NotifyStreakBrokenResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error creating streak broken notification", error);
    handleZodError(error, "notifyStreakBroken");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to create streak broken notification");
  }
});

export const notifySeasonEnd = onCall(async (request) => {
  const parsed = NotifySeasonEndRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { userId, seasonId, finalPosition, leagueNumber } = parsed.data;

  try {
    await notifService.notifySeasonEnd({ userId, finalPosition, leagueNumber });
    logger.info("Season end notification created", { userId, seasonId, finalPosition });
    const rawResponse = { success: true };
    NotifySeasonEndResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error creating season end notification", error);
    handleZodError(error, "notifySeasonEnd");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to create season end notification");
  }
});

export const onLeagueAdvance = onDocumentWritten("users/{userId}", async (event) => {
  const beforeDataRaw = event.data?.before.data();
  const afterDataRaw = event.data?.after.data();

  if (!beforeDataRaw || !afterDataRaw) return;

  try {
    const beforeData = UserSchema.parse(beforeDataRaw);
    const afterData = UserSchema.parse(afterDataRaw);

    const beforeLeague = beforeData.league ?? 1;
    const afterLeague = afterData.league ?? 1;

    if (afterLeague > beforeLeague && afterLeague <= 15) {
      const userId = event.params.userId;
      await notifService.notifyLeagueAdvance(userId, beforeLeague, afterLeague);
      logger.info("League advance notification created", { userId, fromLeague: beforeLeague, toLeague: afterLeague });
    }
  } catch (error) {
    logger.error("Error in onLeagueAdvance", error);
    if (error instanceof z.ZodError) {
      logger.error("User data validation failed", error.errors);
    }
  }
});

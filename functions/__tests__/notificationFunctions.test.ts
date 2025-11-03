/**
 * Tests for notificationFunctions.ts
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestNotification,
  waitForFirestore,
  clearUserData,
} from "./helpers/testHelpers";
import { mockUserId } from "./helpers/mockData";

const db = admin.firestore();

let notificationFunctions: typeof import("../src/notificationFunctions");

describe("Notification Functions", () => {
  beforeEach(async () => {
    notificationFunctions = await import("../src/notificationFunctions");
  });

  // Note: Notifications tests clear data in afterEach to prevent interference
  // because they create multiple notifications that could affect other tests
  afterEach(async () => {
    await clearUserData(mockUserId);
  });

  afterAll(() => {
    cleanup();
  });

  describe("getNotifications", () => {
    it("should return user notifications sorted by createdAt desc", async () => {
      await createTestUser(mockUserId);
      await createTestNotification(mockUserId, "notif1", {
        title: "Notification 1",
        createdAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() - 86400000)
        ) as any,
      } as any);
      await createTestNotification(mockUserId, "notif2", {
        title: "Notification 2",
        createdAt: admin.firestore.Timestamp.now() as any,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.notifications).toHaveLength(2);
      // Should be sorted by createdAt desc (newest first)
      expect(result.notifications[0].id).toBe("notif2");
      expect(result.notifications[1].id).toBe("notif1");
    });

    it("should respect limit parameter", async () => {
      await createTestUser(mockUserId);
      for (let i = 0; i < 5; i++) {
        await createTestNotification(mockUserId, `notif-${i}`);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

      const result = await wrapped({
        data: { userId: mockUserId, limit: 3 },
      } as any);

      expect((result as any).notifications.length).toBeLessThanOrEqual(3);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("markNotificationRead", () => {
    it("should mark notification as read", async () => {
      await createTestUser(mockUserId);
      await createTestNotification(mockUserId, "notif1", {
        read: false,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(notificationFunctions.markNotificationRead);

      const result = await wrapped({
        data: { userId: mockUserId, notificationId: "notif1" },
      } as any);

      expect(result.success).toBe(true);

      const notifDoc = await db
        .doc(`users/${mockUserId}/notifications/notif1`)
        .get();
      expect(notifDoc.data()?.read).toBe(true);
      expect(notifDoc.data()?.readAt).toBeDefined();
    });

    it("should throw error when userId or notificationId is missing", async () => {
      const wrapped = testEnv.wrap(notificationFunctions.markNotificationRead);

      await expect(
        wrapped({ data: { userId: mockUserId } } as any)
      ).rejects.toThrow("userId and notificationId are required");

      await expect(
        wrapped({ data: { notificationId: "notif1" } } as any)
      ).rejects.toThrow("userId and notificationId are required");
    });
  });

  describe("createNotification", () => {
    it("should create notification for user", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(notificationFunctions.createNotification);

      const notification = {
        title: "Test Notification",
        body: "Test body",
        type: "info" as const,
      };

      const result = await wrapped({
        data: { userId: mockUserId, notification },
      } as any);

      expect((result as any).notificationId).toBeDefined();

      const notifDoc = await db
        .doc(
          `users/${mockUserId}/notifications/${(result as any).notificationId}`
        )
        .get();
      expect(notifDoc.exists).toBe(true);
      expect(notifDoc.data()?.title).toBe("Test Notification");
      expect(notifDoc.data()?.read).toBe(false);
    });

    it("should throw error when userId or notification is missing", async () => {
      const wrapped = testEnv.wrap(notificationFunctions.createNotification);

      await expect(
        wrapped({ data: { userId: mockUserId } } as any)
      ).rejects.toThrow("userId and notification are required");

      await expect(
        wrapped({ data: { notification: {} } } as any)
      ).rejects.toThrow("userId and notification are required");
    });
  });
});

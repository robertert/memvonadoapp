/**
 * @jest-environment node
 *
 * Comprehensive tests for notificationFunctions.ts
 *
 * Tested functions:
 * - getNotifications
 * - markNotificationRead
 * - createNotification
 * - onLeagueAdvance (trigger)
 * - notifyStreakBroken
 * - notifySeasonEnd
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestNotification,
  waitForFirestore,
  clearUserData,
  createMockCallableRequest,
  generateTestId,
  clearTestNotifications,
} from "./helpers/testHelpers";
import { mockUserId } from "./helpers/mockData";
import { HttpsError } from "firebase-functions/v2/https";

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
    await clearTestNotifications(mockUserId);
    // Also clean up "non-existent-user" used in edge case tests
    await clearUserData("non-existent-user");
    await clearTestNotifications("non-existent-user");
  });

  afterAll(() => {
    cleanup();
  });

  describe("getNotifications", () => {
    describe("success cases", () => {
      it("should return notifications sorted by createdAt desc (newest first)", async () => {
        await createTestUser(mockUserId);
        const oldDate = new Date(Date.now() - 86400000); // 1 day ago
        const newDate = new Date();

        await createTestNotification(mockUserId, "notif1", {
          title: "Notification 1",
          createdAt: admin.firestore.Timestamp.fromDate(oldDate) as any,
        } as any);
        await createTestNotification(mockUserId, "notif2", {
          title: "Notification 2",
          createdAt: admin.firestore.Timestamp.fromDate(newDate) as any,
        } as any);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

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

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, limit: 3 },
          })
        );

        expect(result.notifications.length).toBeLessThanOrEqual(3);
      });

      it("should return empty array when no notifications exist", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.notifications).toEqual([]);
      });

      it("should use default limit of 50 when limit not provided", async () => {
        await createTestUser(mockUserId);
        // Create 60 notifications
        for (let i = 0; i < 60; i++) {
          await createTestNotification(mockUserId, `notif-${i}`);
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.notifications.length).toBe(50);
      });

      it("should return correct notification fields", async () => {
        await createTestUser(mockUserId);
        await createTestNotification(mockUserId, "notif1", {
          title: "Test Title",
          body: "Test Body",
          type: "success" as const,
          read: false,
          linkTo: "https://example.com",
        } as any);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.notifications).toHaveLength(1);
        const notif = result.notifications[0] as any;
        expect(notif.id).toBe("notif1");
        expect(notif.title).toBe("Test Title");
        expect(notif.body).toBe("Test Body");
        expect(notif.type).toBe("success");
        expect(notif.read).toBe(false);
        expect(notif.linkTo).toBe("https://example.com");
        expect(notif.createdAt).toBeDefined();
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when limit is less than 1", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, limit: 0 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when limit is greater than 200", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, limit: 201 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when limit is not an integer", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, limit: 1.5 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is not a string", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: 123 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("edge cases", () => {
      it("should work with limit = 1 (minimum)", async () => {
        await createTestUser(mockUserId);
        for (let i = 0; i < 5; i++) {
          await createTestNotification(mockUserId, `notif-${i}`);
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, limit: 1 },
          })
        );

        expect(result.notifications.length).toBe(1);
      });

      it("should work with limit = 200 (maximum)", async () => {
        await createTestUser(mockUserId);
        for (let i = 0; i < 250; i++) {
          await createTestNotification(mockUserId, `notif-${i}`);
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, limit: 200 },
          })
        );

        expect(result.notifications.length).toBe(200);
      });

      it("should return empty array when user does not exist", async () => {
        // Clean up any notifications that might have been created in previous tests
        await clearTestNotifications("non-existent-user");
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: "non-existent-user" },
          })
        );

        expect(result.notifications).toEqual([]);
      });

      it("should correctly sort many notifications with different dates", async () => {
        await createTestUser(mockUserId);
        const dates = [
          new Date(Date.now() - 86400000 * 3), // 3 days ago
          new Date(Date.now() - 86400000 * 1), // 1 day ago
          new Date(Date.now() - 86400000 * 2), // 2 days ago
          new Date(), // now
        ];

        for (let i = 0; i < dates.length; i++) {
          await createTestNotification(mockUserId, `notif-${i}`, {
            createdAt: admin.firestore.Timestamp.fromDate(dates[i]) as any,
          } as any);
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.notifications).toHaveLength(4);
        // Should be sorted desc: now, 1 day ago, 2 days ago, 3 days ago
        expect(result.notifications[0].id).toBe("notif-3");
        expect(result.notifications[1].id).toBe("notif-1");
        expect(result.notifications[2].id).toBe("notif-2");
        expect(result.notifications[3].id).toBe("notif-0");
      });

      it("should return notifications with different types", async () => {
        await createTestUser(mockUserId);
        const types = ["info", "success", "warning", "error"] as const;
        for (let i = 0; i < types.length; i++) {
          await createTestNotification(mockUserId, `notif-${i}`, {
            type: types[i] as any,
          } as any);
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.getNotifications);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.notifications).toHaveLength(4);
        const returnedTypes = result.notifications.map((n: any) => n.type);
        expect(returnedTypes).toContain("info");
        expect(returnedTypes).toContain("success");
        expect(returnedTypes).toContain("warning");
        expect(returnedTypes).toContain("error");
      });
    });
  });

  describe("markNotificationRead", () => {
    describe("success cases", () => {
      it("should mark notification as read", async () => {
        await createTestUser(mockUserId);
        await createTestNotification(mockUserId, "notif1", {
          read: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notificationId: "notif1" },
          })
        );

        expect(result.success).toBe(true);

        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/notif1`)
          .get();
        expect(notifDoc.data()?.read).toBe(true);
        expect(notifDoc.data()?.readAt).toBeDefined();
      });

      it("should set readAt timestamp", async () => {
        await createTestUser(mockUserId);
        await createTestNotification(mockUserId, "notif1", {
          read: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notificationId: "notif1" },
          })
        );

        await waitForFirestore();
        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/notif1`)
          .get();
        const readAt = notifDoc.data()?.readAt;
        expect(readAt).toBeDefined();
        expect(readAt).toBeInstanceOf(admin.firestore.Timestamp);
      });

      it("should return success: true", async () => {
        await createTestUser(mockUserId);
        await createTestNotification(mockUserId, "notif1", {
          read: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notificationId: "notif1" },
          })
        );

        expect(result.success).toBe(true);
      });

      it("should work when notification is already read (idempotent)", async () => {
        await createTestUser(mockUserId);
        await createTestNotification(mockUserId, "notif1", {
          read: true,
        } as any);
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notificationId: "notif1" },
          })
        );

        expect(result.success).toBe(true);
        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/notif1`)
          .get();
        expect(notifDoc.data()?.read).toBe(true);
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { notificationId: "notif1" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when notificationId is missing", async () => {
        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is not a string", async () => {
        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: 123, notificationId: "notif1" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when notificationId is not a string", async () => {
        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notificationId: 123 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("error handling", () => {
      it("should throw not-found error when notification does not exist", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notificationId: "non-existent" },
            })
          )
        ).rejects.toThrow(HttpsError);

        try {
          await wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notificationId: "non-existent" },
            })
          );
        } catch (error) {
          expect(error).toBeInstanceOf(HttpsError);
          expect((error as HttpsError).code).toBe("not-found");
        }
      });

      it("should throw not-found error when notification belongs to different user", async () => {
        const otherUserId = generateTestId("other-user");
        await createTestUser(mockUserId);
        await createTestUser(otherUserId);
        await createTestNotification(otherUserId, "notif1", {
          read: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notificationId: "notif1" },
            })
          )
        ).rejects.toThrow(HttpsError);

        try {
          await wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notificationId: "notif1" },
            })
          );
        } catch (error) {
          expect(error).toBeInstanceOf(HttpsError);
          expect((error as HttpsError).code).toBe("not-found");
        }

        await clearUserData(otherUserId);
        await clearUserData(mockUserId);
        await clearTestNotifications(mockUserId);
        await clearTestNotifications(otherUserId);
      });
    });

    describe("edge cases", () => {
      it("should work with different notification types", async () => {
        await createTestUser(mockUserId);
        const types = ["info", "success", "warning", "error"] as const;

        for (let i = 0; i < types.length; i++) {
          await createTestNotification(mockUserId, `notif-${i}`, {
            type: types[i] as any,
            read: false,
          } as any);
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(
          notificationFunctions.markNotificationRead
        );

        for (let i = 0; i < types.length; i++) {
          const result = await wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notificationId: `notif-${i}` },
            })
          );
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe("createNotification", () => {
    describe("success cases", () => {
      it("should create notification with all required fields", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        expect(result.success).toBe(true);
        expect(result.notificationId).toBeDefined();

        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
          .get();
        expect(notifDoc.exists).toBe(true);
        const data = notifDoc.data();
        expect(data?.title).toBe("Test Notification");
        expect(data?.body).toBe("Test body");
        expect(data?.type).toBe("info");
        expect(data?.read).toBe(false);
        expect(data?.createdAt).toBeDefined();
      });

      it("should create notification with optional linkTo", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
          linkTo: "https://example.com",
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        expect(result.success).toBe(true);

        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
          .get();
        expect(notifDoc.data()?.linkTo).toBe("https://example.com");
      });

      it("should set read: false by default", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
          .get();
        expect(notifDoc.data()?.read).toBe(false);
      });

      it("should set createdAt timestamp", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        await waitForFirestore();
        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
          .get();
        const createdAt = notifDoc.data()?.createdAt;
        expect(createdAt).toBeDefined();
        expect(createdAt).toBeInstanceOf(admin.firestore.Timestamp);
      });

      it("should return notificationId in response", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        expect(result.notificationId).toBeDefined();
        expect(typeof result.notificationId).toBe("string");
        expect(result.notificationId.length).toBeGreaterThan(0);
      });

      it("should create notification with all types", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);
        const types = ["info", "success", "warning", "error"] as const;

        for (const type of types) {
          const notification = {
            title: `Test ${type}`,
            body: "Test body",
            type,
          };

          const result = await wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, notification },
            })
          );

          expect(result.success).toBe(true);

          const notifDoc = await db
            .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
            .get();
          expect(notifDoc.data()?.type).toBe(type);
        }
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                notification: {
                  title: "Test",
                  body: "Test body",
                  type: "info",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when notification object is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when title is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                userId: mockUserId,
                notification: {
                  body: "Test body",
                  type: "info",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when body is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                userId: mockUserId,
                notification: {
                  title: "Test",
                  type: "info",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when type is invalid", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                userId: mockUserId,
                notification: {
                  title: "Test",
                  body: "Test body",
                  type: "invalid-type",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is not a string", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                userId: 123,
                notification: {
                  title: "Test",
                  body: "Test body",
                  type: "info",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("edge cases", () => {
      it("should create notification even when user does not exist", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: "non-existent-user", notification },
          })
        );

        expect(result.success).toBe(true);
        expect(result.notificationId).toBeDefined();

        const notifDoc = await db
          .doc(`users/non-existent-user/notifications/${result.notificationId}`)
          .get();
        expect(notifDoc.exists).toBe(true);

        await clearUserData("non-existent-user");
      });

      it("should reject empty string in title", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                userId: mockUserId,
                notification: {
                  title: "",
                  body: "Test body",
                  type: "info",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should reject empty string in body", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {
                userId: mockUserId,
                notification: {
                  title: "Test",
                  body: "",
                  type: "info",
                },
              },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should accept long strings in title and body", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const longString = "a".repeat(1000);
        const notification = {
          title: longString,
          body: longString,
          type: "info" as const,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        expect(result.success).toBe(true);

        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
          .get();
        expect(notifDoc.data()?.title).toBe(longString);
        expect(notifDoc.data()?.body).toBe(longString);
      });

      it("should handle linkTo as null", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.createNotification);

        const notification = {
          title: "Test Notification",
          body: "Test body",
          type: "info" as const,
          linkTo: null,
        };

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId, notification },
          })
        );

        expect(result.success).toBe(true);

        const notifDoc = await db
          .doc(`users/${mockUserId}/notifications/${result.notificationId}`)
          .get();
        expect(notifDoc.data()?.linkTo).toBeNull();
      });
    });
  });
  /*
  describe("onLeagueAdvance", () => {
    describe("success cases", () => {
      it("should create notification when league increases", async () => {
        await createTestUser(mockUserId, { league: 1 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        // Simulate league change from 1 to 2
        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 1 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 2 },
          `users/${mockUserId}`
        );

        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);
        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.title).toBe("Ranking Up!");
        expect(notification.body).toContain("League 2");
        expect(notification.type).toBe("success");
        expect(notification.read).toBe(false);
      });

      it("should create notification for all leagues (1→15)", async () => {
        await createTestUser(mockUserId, { league: 1 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        for (let fromLeague = 1; fromLeague < 15; fromLeague++) {
          const toLeague = fromLeague + 1;
          const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
            { league: fromLeague },
            `users/${mockUserId}`
          );
          const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
            { league: toLeague },
            `users/${mockUserId}`
          );
          const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

          await wrapped(change);
          await waitForFirestore();
        }

        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(14);
        const lastNotification = notificationsSnapshot.docs[0].data();
        expect(lastNotification.body).toContain("League 15");
      });

      it("should not create notification when league decreases", async () => {
        await createTestUser(mockUserId, { league: 5 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 5 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 4 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });

      it("should not create notification when league stays the same", async () => {
        await createTestUser(mockUserId, { league: 3 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 3 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 3 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });

      it("should not create notification when league > 15", async () => {
        await createTestUser(mockUserId, { league: 15 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 15 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 16 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });
    });

    describe("edge cases", () => {
      it("should create notification when league changes from null to 1", async () => {
        await createTestUser(mockUserId, { league: undefined });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          {},
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 1 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);
        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("League 1");
      });

      it("should not create notification when league changes from 1 to null", async () => {
        await createTestUser(mockUserId, { league: 1 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 1 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          {},
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });

      it("should create notification when league changes from 14 to 15", async () => {
        await createTestUser(mockUserId, { league: 14 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 14 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 15 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);
        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("League 15");
      });

      it("should not create notification when league changes from 15 to 16", async () => {
        await createTestUser(mockUserId, { league: 15 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 15 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 16 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });

      it("should return early when beforeData is null", async () => {
        await createTestUser(mockUserId, { league: 2 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 2 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(null, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });

      it("should return early when afterData is null", async () => {
        await createTestUser(mockUserId, { league: 1 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 1 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, null);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(0);
      });

      it("should treat null league as 1 in beforeData", async () => {
        await createTestUser(mockUserId, { league: undefined });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: null },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 2 },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);
        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("League 2");
      });

      it("should treat null league as 1 in afterData", async () => {
        await createTestUser(mockUserId, { league: 1 });
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: 1 },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { league: null },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        await wrapped(change);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        // Should not create notification (1 to 1, no change)
        expect(notificationsSnapshot.docs.length).toBe(0);
      });
    });

    describe("error handling", () => {
      it("should handle invalid user data structure gracefully", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.onLeagueAdvance);

        // Create snapshots with invalid data structure
        const beforeSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { invalidField: "value" },
          `users/${mockUserId}`
        );
        const afterSnapshot = testEnv.firestore.makeDocumentSnapshot(
          { invalidField: "value2" },
          `users/${mockUserId}`
        );
        const change = testEnv.makeChange(beforeSnapshot, afterSnapshot);

        // Should not throw, but should not create notification either
        await expect(wrapped(change)).rejects.toThrow();
      });
    });
  });
*/
  describe("notifyStreakBroken", () => {
    describe("success cases", () => {
      it("should create streak broken notification", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.success).toBe(true);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);
        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.title).toBe("Streak broken");
        expect(notification.body).toBe(
          "You missed your daily practice. Start again today!"
        );
        expect(notification.type).toBe("warning");
        expect(notification.read).toBe(false);
      });

      it("should set correct notification fields", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.title).toBe("Streak broken");
        expect(notification.body).toBe(
          "You missed your daily practice. Start again today!"
        );
        expect(notification.type).toBe("warning");
        expect(notification.read).toBe(false);
        expect(notification.createdAt).toBeDefined();
      });

      it("should return success: true", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        expect(result.success).toBe(true);
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is not a string", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: 123 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("edge cases", () => {
      it("should create notification even when user does not exist", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        const result = await wrapped(
          createMockCallableRequest({
            data: { userId: "non-existent-user" },
          })
        );

        expect(result.success).toBe(true);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/non-existent-user/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);

        await clearUserData("non-existent-user");
      });

      it("should create multiple notifications for same user", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifyStreakBroken);

        // Call multiple times
        await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );
        await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );
        await wrapped(
          createMockCallableRequest({
            data: { userId: mockUserId },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(3);
      });
    });
  });

  describe("notifySeasonEnd", () => {
    describe("success cases", () => {
      it("should create basic season end notification", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        const result = await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
            },
          })
        );

        expect(result.success).toBe(true);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);
        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.title).toBe("Weekly League Reset!");
        expect(notification.body).toBe(
          "Season ended! Check your final ranking."
        );
        expect(notification.type).toBe("info");
        expect(notification.read).toBe(false);
      });

      it("should create notification with advancement info for 1st place", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 1,
              leagueNumber: 10,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("1st");
        expect(notification.body).toContain("League 11");
      });

      it("should create notification with advancement info for 2nd place", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 2,
              leagueNumber: 10,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("2nd");
        expect(notification.body).toContain("League 11");
      });

      it("should create notification with advancement info for 3rd place", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 3,
              leagueNumber: 10,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("3rd");
        expect(notification.body).toContain("League 11");
      });

      it("should not show advancement when leagueNumber >= 15", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 1,
              leagueNumber: 15,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toBe(
          "Season ended! Check your final ranking."
        );
        expect(notification.body).not.toContain("1st");
        expect(notification.body).not.toContain("League");
      });

      it("should not show advancement when finalPosition > 3", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 4,
              leagueNumber: 10,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toBe(
          "Season ended! Check your final ranking."
        );
        expect(notification.body).not.toContain("4th");
        expect(notification.body).not.toContain("League");
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { seasonId: "season-123" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when seasonId is missing", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is not a string", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: 123, seasonId: "season-123" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when seasonId is not a string", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { userId: mockUserId, seasonId: 123 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("edge cases", () => {
      it("should work with only userId and seasonId", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        const result = await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
            },
          })
        );

        expect(result.success).toBe(true);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toBe(
          "Season ended! Check your final ranking."
        );
      });

      it("should show advancement for finalPosition = 1, leagueNumber = 14", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 1,
              leagueNumber: 14,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toContain("1st");
        expect(notification.body).toContain("League 15");
      });

      it("should not show advancement for finalPosition = 1, leagueNumber = 15", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 1,
              leagueNumber: 15,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toBe(
          "Season ended! Check your final ranking."
        );
        expect(notification.body).not.toContain("League");
      });

      it("should not show advancement for finalPosition = 4, leagueNumber = 10", async () => {
        await createTestUser(mockUserId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        await wrapped(
          createMockCallableRequest({
            data: {
              userId: mockUserId,
              seasonId: "season-123",
              finalPosition: 4,
              leagueNumber: 10,
            },
          })
        );

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/${mockUserId}/notifications`)
          .get();

        const notification = notificationsSnapshot.docs[0].data();
        expect(notification.body).toBe(
          "Season ended! Check your final ranking."
        );
        expect(notification.body).not.toContain("League");
      });

      it("should create notification even when user does not exist", async () => {
        const wrapped = testEnv.wrap(notificationFunctions.notifySeasonEnd);

        const result = await wrapped(
          createMockCallableRequest({
            data: {
              userId: "non-existent-user",
              seasonId: "season-123",
            },
          })
        );

        expect(result.success).toBe(true);

        await waitForFirestore();
        const notificationsSnapshot = await db
          .collection(`users/non-existent-user/notifications`)
          .get();

        expect(notificationsSnapshot.docs.length).toBe(1);

        await clearUserData("non-existent-user");
      });
    });
  });
});

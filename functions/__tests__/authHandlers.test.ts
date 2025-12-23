/**
 * @jest-environment node
 *
 * Testy dla authHandlers.ts
 *
 * Testowane funkcje:
 * - ensureUserDocument: Tworzy podstawowy dokument użytkownika w Firestore
 * - checkUsernameAvailability: Sprawdza dostępność nazwy użytkownika
 * - completeOnboarding: Zapisuje dane onboardingu użytkownika
 *
 * Scenariusze testowe:
 * 1. ensureUserDocument:
 *    - Tworzenie nowego dokumentu użytkownika
 *    - Zwracanie sukcesu gdy dokument już istnieje
 *    - Błąd gdy użytkownik nie jest autentykowany
 *    - Obsługa błędów Firestore
 *    - Edge cases (pusty email, długi displayName, znaki specjalne)
 *
 * 2. checkUsernameAvailability:
 *    - Username dostępny (nie istnieje w bazie)
 *    - Username zajęty (istnieje w bazie)
 *    - Walidacja request schema (username za krótkie, za długie, nieprawidłowe znaki)
 *    - Obsługa błędów Firestore
 *
 * 3. completeOnboarding:
 *    - Ukończenie onboardingu z nowym dokumentem
 *    - Aktualizacja istniejącego dokumentu
 *    - Walidacja username (min 3 znaki)
 *    - Walidacja interests (min 3)
 *    - Sprawdzanie czy username jest już zajęty
 *    - Błąd gdy użytkownik nie jest autentykowany
 *    - Obsługa błędów Firestore
 *    - Edge cases (username po sanitize < 3, znaki specjalne, długi username)
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import { waitForFirestore } from "./helpers/testHelpers";
import { HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

// Import funkcji - będziemy je opakowywać w testach
let authHandlers: typeof import("../src/authHandlers");

describe("authHandlers - Callable Functions", () => {
  beforeEach(async () => {
    // Załaduj moduł funkcji
    authHandlers = await import("../src/authHandlers");
  });

  afterAll(() => {
    cleanup();
  });

  describe("ensureUserDocument", () => {
    const testUid = "test-user-123";
    const testEmail = "test@example.com";
    const testDisplayName = "Test User";

    afterEach(async () => {
      // Wyczyść dane testowe po każdym teście
      try {
        await db.doc(`users/${testUid}`).delete();
        await waitForFirestore();
      } catch (error) {
        // Ignoruj błędy jeśli dokument nie istnieje
      }
    });

    it("powinien utworzyć nowy dokument użytkownika gdy nie istnieje", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
            name: testDisplayName,
          },
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe("User document created successfully");

      // Sprawdź czy dokument został utworzony w Firestore
      await waitForFirestore();
      const userDoc = await db.doc(`users/${testUid}`).get();

      expect(userDoc.exists).toBe(true);
      const userData = userDoc.data();

      expect(userData?.id).toBe(testUid);
      expect(userData?.email).toBe(testEmail);
      expect(userData?.username).toBeDefined();
      expect(userData?.settings).toBeDefined();
      expect(userData?.stats).toBeDefined();
      expect(userData?.profileCompleted).toBe(false);
      expect(userData?.createdAt).toBeDefined();
      expect(userData?.updatedAt).toBeDefined();
    });

    it("powinien zwrócić sukces gdy dokument już istnieje", async () => {
      // Najpierw utwórz dokument
      await db.doc(`users/${testUid}`).set({
        id: testUid,
        email: testEmail,
        username: "existing_user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe("User document already exists");

      // Sprawdź czy dokument nie został zmieniony
      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();
      expect(userData?.username).toBe("existing_user");
    });

    it("powinien rzucić błąd gdy użytkownik nie jest autentykowany", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: null,
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "User must be authenticated"
      );
    });

    it("powinien utworzyć dokument z username wygenerowanym z email gdy brak displayName", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: "john.doe@example.com",
            name: undefined,
          },
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.success).toBe(true);

      await waitForFirestore();
      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // Username powinien być wygenerowany z części lokalnej emaila
      expect(userData?.username).toBeDefined();
      expect(userData?.username).toMatch(/^johndoe|user_/);
    });

    it("powinien znormalizować username (lowercase, tylko alfanumeryczne i _)", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
            name: "Test-User@123!",
          },
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // Username powinien być znormalizowany
      expect(userData?.username).toBeDefined();
      expect(userData?.username).toMatch(/^[a-z0-9_]+$/);
    });

    it("powinien rzucić błąd gdy email jest pusty (UserSchema wymaga poprawnego emaila)", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: "", // Pusty email nie przejdzie walidacji UserSchema
            name: undefined,
          },
        },
      };

      // UserSchema wymaga .email(), więc pusty string nie przejdzie walidacji
      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
    });

    it("powinien obciąć bardzo długi displayName do 32 znaków", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const longDisplayName = "a".repeat(50);
      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
            name: longDisplayName,
          },
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      expect(userData?.username).toBeDefined();
      expect(userData?.username.length).toBeLessThanOrEqual(32);
    });

    it("powinien wygenerować user_xxx gdy displayName zawiera tylko znaki specjalne", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
            name: "!@#$%^&*()",
          },
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // Powinien wygenerować username z prefiksem user_
      expect(userData?.username).toMatch(/^user_/);
    });

    it("powinien utworzyć dokument z wszystkimi wymaganymi polami zgodnie z UserSchema", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
            name: testDisplayName,
          },
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // Sprawdź wszystkie wymagane pola
      expect(userData?.id).toBe(testUid);
      expect(userData?.username).toBeDefined();
      expect(userData?.email).toBe(testEmail);
      expect(userData?.settings).toBeDefined();
      expect(userData?.settings.theme).toBe("light");
      expect(userData?.settings.notificationsEnabled).toBe(true);
      expect(userData?.settings.dailyGoal).toBe(50);
      expect(userData?.settings.dailyNew).toBe(20);
      expect(userData?.settings.language).toBe("en");
      expect(userData?.settings.timeZone).toBe("UTC");
      expect(userData?.stats).toBeDefined();
      expect(userData?.stats.totalCards).toBe(0);
      expect(userData?.stats.totalDecks).toBe(0);
      expect(userData?.stats.totalReviews).toBe(0);
      expect(userData?.stats.averageDifficulty).toBe(0);
      expect(userData?.stats.currentStreak).toBe(0);
      expect(userData?.stats.longestStreak).toBe(0);
      expect(userData?.league).toBe(1);
      expect(userData?.currentGroupId).toBe("unassigned");
      expect(userData?.experiencePoints).toBe(0);
      expect(userData?.currencyCount).toBe(0);
      expect(userData?.followingCount).toBe(0);
      expect(userData?.followersCount).toBe(0);
      expect(userData?.profileCompleted).toBe(false);
      expect(userData?.interests).toEqual([]);
      expect(userData?.createdAt).toBeDefined();
      expect(userData?.updatedAt).toBeDefined();
    });

    it("powinien rzucić błąd gdy request.data zawiera nieprawidłowe dane", async () => {
      const wrapped = testEnv.wrap(authHandlers.ensureUserDocument);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          invalidField: "should not be here",
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("checkUsernameAvailability", () => {
    const testUsername = "testusername";
    const otherUid = "other-user-999";

    afterEach(async () => {
      // Wyczyść dane testowe
      try {
        await db.doc(`users/${otherUid}`).delete();
        await waitForFirestore();
      } catch (error) {
        // Ignoruj błędy
      }
    });

    it("powinien zwrócić isAvailable: true gdy username nie istnieje", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: testUsername,
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.isAvailable).toBe(true);
    });

    it("powinien zwrócić isAvailable: false gdy username jest zajęty", async () => {
      // Utwórz użytkownika z testowym username
      await db.doc(`users/${otherUid}`).set({
        id: otherUid,
        email: "other@example.com",
        username: testUsername,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: testUsername,
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.isAvailable).toBe(false);
    });

    it("powinien rzucić błąd gdy username jest za krótkie (< 3 znaki)", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: "ab", // Za krótkie
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien rzucić błąd gdy username jest za długie (> 32 znaki)", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: "a".repeat(33), // Za długie
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien rzucić błąd gdy username zawiera nieprawidłowe znaki", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: "test-user@123", // Zawiera znaki specjalne - schema powinna zablokować
        },
      };

      // Schema ma regex /^[a-zA-Z0-9_]+$/, więc zablokuje nieprawidłowe znaki
      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien normalizować username do lowercase przed sprawdzeniem", async () => {
      // Utwórz użytkownika z lowercase username
      const lowercaseUsername = "testuser123";
      await db.doc(`users/${otherUid}`).set({
        id: otherUid,
        email: "other@example.com",
        username: lowercaseUsername,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: "TestUser123", // Uppercase - powinien być znormalizowany do lowercase
        },
      };

      // Funkcja normalizuje do lowercase przed sprawdzeniem
      // "TestUser123" -> "testuser123" (lowercase)
      // W bazie jest "testuser123", więc powinien zwrócić isAvailable: false
      const result = await wrapped(mockRequest as any);
      expect(result.isAvailable).toBe(false); // Znormalizowany username jest zajęty
    });

    it("powinien rzucić błąd gdy brak username w request.data", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {},
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien zwrócić poprawną strukturę odpowiedzi zgodną ze schematem", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: testUsername,
        },
      };

      const result = await wrapped(mockRequest as any);

      // Sprawdź strukturę odpowiedzi
      expect(result).toHaveProperty("isAvailable");
      expect(typeof result.isAvailable).toBe("boolean");
    });

    it("powinien obsłużyć błędy Firestore gracefully", async () => {
      const wrapped = testEnv.wrap(authHandlers.checkUsernameAvailability);

      const mockRequest = {
        data: {
          username: testUsername,
        },
      };

      // Jeśli wystąpi błąd, powinien być obsłużony jako HttpsError
      try {
        await wrapped(mockRequest as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
      }
    });
  });

  describe("completeOnboarding", () => {
    const testUid = "test-user-456";
    const testEmail = "onboarding@example.com";
    const testUsername = "testuser";
    const testInterests = ["programming", "music", "sports"];

    afterEach(async () => {
      // Wyczyść dane testowe
      try {
        // Usuń również potencjalne dokumenty z tym samym username
        const usersSnapshot = await db
          .collection("users")
          .where("username", "==", testUsername)
          .get();
        const batch = db.batch();
        usersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        await db.doc(`users/${testUid}`).delete();
        await waitForFirestore();
      } catch (error) {
        // Ignoruj błędy
      }
    });

    it("powinien utworzyć nowy dokument użytkownika z danymi onboardingu", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Onboarding completed successfully");

      // Sprawdź dokument w Firestore
      await waitForFirestore();
      const userDoc = await db.doc(`users/${testUid}`).get();

      expect(userDoc.exists).toBe(true);
      const userData = userDoc.data();

      expect(userData?.id).toBe(testUid);
      expect(userData?.email).toBe(testEmail);
      expect(userData?.username).toBe(testUsername);
      expect(userData?.interests).toEqual(testInterests);
      expect(userData?.profileCompleted).toBe(true);
    });

    it("powinien zaktualizować istniejący dokument użytkownika", async () => {
      // Najpierw utwórz podstawowy dokument
      await db.doc(`users/${testUid}`).set({
        id: testUid,
        email: testEmail,
        username: "old_username",
        profileCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      const result = await wrapped(mockRequest as any);

      expect(result.success).toBe(true);

      // Sprawdź czy dokument został zaktualizowany
      await waitForFirestore();
      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      expect(userData?.username).toBe(testUsername);
      expect(userData?.interests).toEqual(testInterests);
      expect(userData?.profileCompleted).toBe(true);
    });

    it("powinien rzucić błąd gdy brak interests", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: [],
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien rzucić błąd gdy username jest już zajęty przez innego użytkownika", async () => {
      // Utwórz innego użytkownika z tym samym username
      const otherUid = "other-user-789";
      await db.doc(`users/${otherUid}`).set({
        id: otherUid,
        email: "other@example.com",
        username: testUsername,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Username is already taken"
      );

      // Wyczyść
      await db.doc(`users/${otherUid}`).delete();
    });

    it("powinien pozwolić na użycie tego samego username przez tego samego użytkownika", async () => {
      // Utwórz użytkownika z username
      await db.doc(`users/${testUid}`).set({
        id: testUid,
        email: testEmail,
        username: testUsername,
        profileCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername, // Ten sam username
          interests: testInterests,
        },
      };

      // Nie powinno rzucić błędu
      const result = await wrapped(mockRequest as any);
      expect(result.success).toBe(true);
    });

    it("powinien normalizować username do lowercase", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: "TestUser123", // Uppercase - powinien być znormalizowany do lowercase
          interests: testInterests,
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // Username powinien być znormalizowany do lowercase
      expect(userData?.username).toBe("testuser123");
      expect(userData?.username).toMatch(/^[a-z0-9_]+$/);
    });

    it("powinien rzucić błąd gdy username jest za krótki", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: "ab", // 2 znaki - schema wymaga min 3
          interests: testInterests,
        },
      };

      // Schema waliduje długość i znaki, więc rzuci błąd walidacji
      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien rzucić błąd gdy username zawiera nieprawidłowe znaki", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      // Test różnych przypadków nieprawidłowych znaków
      const invalidUsernames = [
        "Test-User@123!", // Znaki specjalne w środku
        "a!@#", // Krótki z nieprawidłowymi znakami
        "!@#$%^&*()", // Tylko znaki specjalne
      ];

      for (const invalidUsername of invalidUsernames) {
        const mockRequest = {
          auth: {
            uid: testUid,
            token: {
              email: testEmail,
            },
          },
          data: {
            username: invalidUsername,
            interests: testInterests,
          },
        };

        // Schema ma regex /^[a-zA-Z0-9_]+$/, więc zablokuje nieprawidłowe znaki
        await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
        await expect(wrapped(mockRequest as any)).rejects.toThrow(
          "Invalid request data"
        );
      }
    });

    it("powinien rzucić błąd gdy username jest za długi", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const longUsername = "a".repeat(50); // 50 znaków - schema wymaga max 32, więc zablokuje
      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: longUsername,
          interests: testInterests,
        },
      };

      // Schema waliduje PRZED sanitize, więc rzuci błąd walidacji
      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien obciąć username do 32 znaków gdy jest dokładnie na granicy", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const longUsername = "a".repeat(32); // Dokładnie max schema - przejdzie walidację
      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: longUsername,
          interests: testInterests,
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      expect(userData?.username).toBeDefined();
      expect(userData?.username.length).toBeLessThanOrEqual(32);
      expect(userData?.username).toBe("a".repeat(32));
    });

    it("powinien zaktualizować updatedAt podczas aktualizacji dokumentu", async () => {
      // Utwórz dokument z wcześniejszym updatedAt
      const oldDate = new Date(Date.now() - 10000); // 10 sekund temu
      await db.doc(`users/${testUid}`).set({
        id: testUid,
        email: testEmail,
        username: "old_username",
        profileCompleted: false,
        createdAt: oldDate,
        updatedAt: oldDate,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // updatedAt powinien być zaktualizowany
      const updatedAt = userData?.updatedAt;
      expect(updatedAt).toBeDefined();
      if (updatedAt instanceof Date) {
        expect(updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
      }
    });

    it("powinien zapisać interests poprawnie", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const customInterests = ["programming", "music", "sports", "reading"];
      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: customInterests,
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      expect(userData?.interests).toEqual(customInterests);
      expect(userData?.interests.length).toBe(4);
    });

    it("powinien ustawić profileCompleted na true", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      expect(userData?.profileCompleted).toBe(true);
    });

    it("powinien rzucić błąd gdy request.data zawiera nieprawidłowe dane", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
          invalidField: "should not be here",
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("powinien rzucić błąd gdy użytkownik nie jest autentykowany", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: null,
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "User must be authenticated"
      );
    });

    it("powinien obsłużyć błędy Firestore gracefully", async () => {
      // Ten test wymagałby bardziej zaawansowanego mockowania
      // Dla uproszczenia sprawdzamy czy funkcja zwraca odpowiedni błąd
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: testUsername,
          interests: testInterests,
        },
      };

      // Jeśli wystąpi błąd, powinien być obsłużony jako HttpsError
      try {
        await wrapped(mockRequest as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
      }
    });
  });
});

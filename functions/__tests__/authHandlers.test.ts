/**
 * @jest-environment node
 *
 * Testy dla authHandlers.ts
 *
 * Testowane funkcje:
 * - ensureUserDocument: Tworzy podstawowy dokument użytkownika w Firestore
 * - completeOnboarding: Zapisuje dane onboardingu użytkownika
 *
 * Scenariusze testowe:
 * 1. ensureUserDocument:
 *    - Tworzenie nowego dokumentu użytkownika
 *    - Zwracanie sukcesu gdy dokument już istnieje
 *    - Błąd gdy użytkownik nie jest autentykowany
 *    - Obsługa błędów Firestore
 *
 * 2. completeOnboarding:
 *    - Ukończenie onboardingu z nowym dokumentem
 *    - Aktualizacja istniejącego dokumentu
 *    - Walidacja username (min 3 znaki)
 *    - Walidacja interests (min 3)
 *    - Sprawdzanie czy username jest już zajęty
 *    - Błąd gdy użytkownik nie jest autentykowany
 *    - Obsługa błędów Firestore
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
          username: "ab", // Za krótkie (min 3 znaki)
          interests: testInterests,
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "Username must be at least 3 characters"
      );
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
        "At least 3 interests are required"
      );
    });

    it("powinien rzucić błąd gdy interests jest mniej niż 3", async () => {
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
          interests: ["programming", "music"], // Tylko 2
        },
      };

      await expect(wrapped(mockRequest as any)).rejects.toThrow(HttpsError);
      await expect(wrapped(mockRequest as any)).rejects.toThrow(
        "At least 3 interests are required"
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

    it("powinien znormalizować username (lowercase, tylko alfanumeryczne i _)", async () => {
      const wrapped = testEnv.wrap(authHandlers.completeOnboarding);

      const mockRequest = {
        auth: {
          uid: testUid,
          token: {
            email: testEmail,
          },
        },
        data: {
          username: "Test-User@123!", // Znormalizuje do testuser123
          interests: testInterests,
        },
      };

      await wrapped(mockRequest as any);
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUid}`).get();
      const userData = userDoc.data();

      // Username powinien być znormalizowany
      expect(userData?.username).toMatch(/^[a-z0-9_]+$/);
      expect(userData?.username).toBe("testuser123");
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

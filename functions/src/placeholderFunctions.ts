import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Dodaje placeholder data do aplikacji dla testów ręcznych lub emulatora
 * Tworzy przykładowego użytkownika z taliami i kartami
 */
export const addPlaceholderData = onCall(async (request) => {
  const { userId, createUser = false } = request.data || {};
  const auth = request.auth;

  // Jeśli nie podano userId, użyj zalogowanego użytkownika
  const targetUserId = userId || auth?.uid;

  if (!targetUserId) {
    throw new Error("userId is required or user must be authenticated");
  }

  try {
    const batch = db.batch();

    // 1. Utwórz lub zaktualizuj użytkownika z przykładowymi danymi
    const userRef = db.doc(`users/${targetUserId}`);
    const userDoc = await userRef.get();

    // Sprawdź aktualne statystyki użytkownika
    const existingStats = userDoc.data()?.stats || {
      totalCards: 0,
      totalDecks: 0,
      totalReviews: 0,
      averageDifficulty: 0,
    };

    if (!userDoc.exists || createUser) {
      batch.set(
        userRef,
        {
          username: userDoc.data()?.username || `testuser_${Date.now()}`,
          name: userDoc.data()?.name || "Test User",
          email: userDoc.data()?.email || `test_${targetUserId}@example.com`,
          league: userDoc.data()?.league || 3,
          points: userDoc.data()?.points || 1250,
          streak: userDoc.data()?.streak || 5,
          stats: existingStats,
          friends: userDoc.data()?.friends || [],
          pending: userDoc.data()?.pending || [],
          incoming: userDoc.data()?.incoming || [],
          decks: userDoc.data()?.decks || [],
          theme: userDoc.data()?.theme || "light",
        },
        { merge: true }
      );
    }

    // 2. Przygotuj przykładowe talie z kartami
    const placeholderDecks = [
      {
        title: "Angielski - Słówka podstawowe",
        subject: "Języki obce",
        cards: [
          { front: "Cześć", back: "Hello", tags: ["podstawowe", "powitanie"] },
          { front: "Dziękuję", back: "Thank you", tags: ["podstawowe"] },
          { front: "Proszę", back: "Please", tags: ["podstawowe"] },
          { front: "Przepraszam", back: "Sorry", tags: ["podstawowe"] },
          { front: "Tak", back: "Yes", tags: ["podstawowe"] },
          { front: "Nie", back: "No", tags: ["podstawowe"] },
          {
            front: "Jak się masz?",
            back: "How are you?",
            tags: ["podstawowe", "powitanie"],
          },
          { front: "Dobrze", back: "Good", tags: ["podstawowe"] },
          { front: "Do widzenia", back: "Goodbye", tags: ["podstawowe"] },
          {
            front: "Miło Cię poznać",
            back: "Nice to meet you",
            tags: ["podstawowe"],
          },
        ],
      },
      {
        title: "Matematyka - Tabliczka mnożenia",
        subject: "Matematyka",
        cards: [
          { front: "2 × 2", back: "4", tags: ["podstawowe", "mnożenie"] },
          { front: "3 × 3", back: "9", tags: ["podstawowe", "mnożenie"] },
          { front: "4 × 4", back: "16", tags: ["podstawowe", "mnożenie"] },
          { front: "5 × 5", back: "25", tags: ["podstawowe", "mnożenie"] },
          { front: "6 × 6", back: "36", tags: ["podstawowe", "mnożenie"] },
          { front: "7 × 7", back: "49", tags: ["podstawowe", "mnożenie"] },
          { front: "8 × 8", back: "64", tags: ["podstawowe", "mnożenie"] },
          { front: "9 × 9", back: "81", tags: ["podstawowe", "mnożenie"] },
          { front: "2 × 5", back: "10", tags: ["podstawowe", "mnożenie"] },
          { front: "3 × 7", back: "21", tags: ["podstawowe", "mnożenie"] },
        ],
      },
      {
        title: "Historia Polski - Daty ważne",
        subject: "Historia",
        cards: [
          {
            front: "Kiedy był chrzest Polski?",
            back: "966 rok",
            tags: ["historia", "daty"],
          },
          {
            front: "Kiedy była bitwa pod Grunwaldem?",
            back: "1410 rok",
            tags: ["historia", "daty"],
          },
          {
            front: "Kiedy Polska odzyskała niepodległość?",
            back: "1918 rok",
            tags: ["historia", "daty"],
          },
          {
            front: "Kiedy wybuchła II wojna światowa?",
            back: "1939 rok",
            tags: ["historia", "daty"],
          },
          {
            front: "Kiedy upadł komunizm w Polsce?",
            back: "1989 rok",
            tags: ["historia", "daty"],
          },
          {
            front: "Kto był pierwszym królem Polski?",
            back: "Bolesław Chrobry",
            tags: ["historia", "osoby"],
          },
          {
            front: "Gdzie znajduje się Wawel?",
            back: "W Krakowie",
            tags: ["historia", "geografia"],
          },
          {
            front: "Jaka była stolica Polski przed Warszawą?",
            back: "Kraków",
            tags: ["historia", "geografia"],
          },
        ],
      },
      {
        title: "Geografia - Stolice Europy",
        subject: "Geografia",
        cards: [
          {
            front: "Stolica Polski",
            back: "Warszawa",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Niemiec",
            back: "Berlin",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Francji",
            back: "Paryż",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Włoch",
            back: "Rzym",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Hiszpanii",
            back: "Madryt",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Wielkiej Brytanii",
            back: "Londyn",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Czech",
            back: "Praga",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Grecji",
            back: "Ateny",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Portugalii",
            back: "Lizbona",
            tags: ["geografia", "stolice"],
          },
          {
            front: "Stolica Holandii",
            back: "Amsterdam",
            tags: ["geografia", "stolice"],
          },
        ],
      },
      {
        title: "Programowanie - JavaScript podstawy",
        subject: "Informatyka",
        cards: [
          {
            front: "Co to jest let?",
            back: "Zmienna z zakresem blokowym (block scope)",
            tags: ["js", "podstawy"],
          },
          {
            front: "Co to jest const?",
            back: "Stała z zakresem blokowym (block scope)",
            tags: ["js", "podstawy"],
          },
          {
            front: "Co zwraca typeof null?",
            back: "object",
            tags: ["js", "trudne"],
          },
          {
            front: "Co to jest hoisting?",
            back: "Przenoszenie deklaracji na górę zakresu",
            tags: ["js", "koncepcje"],
          },
          {
            front: "Jak utworzyć tablicę?",
            back: "let arr = [] lub new Array()",
            tags: ["js", "podstawy"],
          },
          {
            front: "Jak dodać element do tablicy?",
            back: "arr.push(element) lub arr[arr.length] = element",
            tags: ["js", "podstawy"],
          },
          {
            front: "Co to jest closure?",
            back: "Funkcja mająca dostęp do zmiennych z zewnętrznego zakresu",
            tags: ["js", "koncepcje"],
          },
          {
            front: "Co zwraca [1,2,3].map(x => x*2)?",
            back: "[2, 4, 6]",
            tags: ["js", "metody"],
          },
        ],
      },
    ];

    const createdDeckIds: string[] = [];

    // 3. Utwórz talie z kartami
    for (const deckData of placeholderDecks) {
      const deckRef = db.collection("decks").doc();
      createdDeckIds.push(deckRef.id);

      batch.set(deckRef, {
        title: deckData.title,
        cardsNum: deckData.cards.length,
        createdBy: targetUserId,
        createdAt: new Date(),
        isPublic: true,
        subject: deckData.subject,
        views: Math.floor(Math.random() * 100),
      });

      // Dodaj karty do talii
      deckData.cards.forEach(
        (card: { front: string; back: string; tags: string[] }) => {
          const cardRef = deckRef.collection("cards").doc();
          batch.set(cardRef, {
            front: card.front,
            back: card.back,
            tags: card.tags,
            createdAt: new Date(),
            difficulty: 2.5,
            nextReviewInterval: 1,
            grade: -1,
            // Dodaj firstLearn dla nowych kart
            firstLearn: {
              isNew: true,
              due: new Date(),
              state: 0,
              consecutiveGood: 0,
            },
          });
        }
      );

      // Dodaj deck do użytkownika
      batch.update(userRef, {
        decks: FieldValue.arrayUnion(deckRef.id),
      });
    }

    // 4. Dodaj przykładowe powiadomienia
    const notifications = [
      {
        title: "Witaj w Memvocado! 🎉",
        body: "Dodano dane testowe. Zacznij naukę z przykładowymi taliami!",
        type: "info" as const,
        read: false,
        createdAt: new Date(),
      },
      {
        title: "Gratulacje! 🏆",
        body: "Osiągnąłeś 5-dniową serię nauki. Trzymaj tak dalej!",
        type: "success" as const,
        read: false,
        createdAt: new Date(),
      },
      {
        title: "Nowa talia dostępna",
        body: "Sprawdź nowe publiczne talie w katalogu!",
        type: "info" as const,
        read: false,
        createdAt: new Date(),
      },
    ];

    for (const notification of notifications) {
      const notificationRef = db
        .collection(`users/${targetUserId}/notifications`)
        .doc();
      batch.set(notificationRef, notification);
    }

    // 5. Zaktualizuj statystyki użytkownika
    const totalCards = placeholderDecks.reduce(
      (sum, deck) => sum + deck.cards.length,
      0
    );

    // Użyj set z merge dla bezpiecznej aktualizacji statystyk
    batch.set(
      userRef,
      {
        stats: {
          totalCards: existingStats.totalCards + totalCards,
          totalDecks: existingStats.totalDecks + placeholderDecks.length,
          totalReviews: existingStats.totalReviews,
          averageDifficulty: existingStats.averageDifficulty,
          lastStudyDate: new Date(),
        },
      },
      { merge: true }
    );

    await batch.commit();

    logger.info("Placeholder data added successfully", {
      userId: targetUserId,
      decksCreated: placeholderDecks.length,
      totalCards,
    });

    return {
      success: true,
      userId: targetUserId,
      decksCreated: placeholderDecks.length,
      totalCards,
      deckIds: createdDeckIds,
    };
  } catch (error) {
    logger.error("Error adding placeholder data", error);
    throw new Error("Failed to add placeholder data");
  }
});

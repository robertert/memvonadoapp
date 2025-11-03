# Testy Backendu - Cloud Functions

Ten katalog zawiera testy dla wszystkich Cloud Functions w aplikacji Memvocado.

## Struktura

```
__tests__/
├── setup.ts                    # Konfiguracja firebase-functions-test
├── helpers/
│   ├── testHelpers.ts         # Pomocnicze funkcje testowe
│   └── mockData.ts            # Mock data dla testów
├── userFunctions.test.ts      # Testy userFunctions
├── deckFunctions.test.ts      # Testy deckFunctions
├── rankingFunctions.test.ts   # Testy rankingFunctions
├── notificationFunctions.test.ts  # Testy notificationFunctions
├── leagueFunctions.test.ts    # Testy leagueFunctions
├── searchFunctions.test.ts    # Testy searchFunctions
└── learningFunctions.test.ts  # Testy learningFunctions
```

## Uruchamianie testów

### Lokalne uruchomienie testów

```bash
cd functions
npm test
```

### Tryb watch (automatyczne uruchamianie przy zmianach)

```bash
cd functions
npm run test:watch
```

### Pokrycie kodu testami

```bash
cd functions
npm run test:coverage
```

## Konfiguracja

### Firestore Emulator (dla pełnych testów integracyjnych)

Aby uruchomić testy z Firestore Emulatorem:

1. Zainstaluj Firebase Tools globalnie (jeśli nie masz):
   ```bash
   npm install -g firebase-tools
   ```

2. Uruchom emulator:
   ```bash
   firebase emulators:start --only firestore
   ```

3. W innym terminalu uruchom testy:
   ```bash
   cd functions
   FIRESTORE_EMULATOR_HOST=localhost:8080 npm test
   ```

### Konfiguracja bez emulatora

Testy mogą być uruchamiane bez emulatora, ale wtedy:
- Testy nie modyfikują prawdziwej bazy danych Firebase
- Niektóre testy mogą wymagać ręcznego czyszczenia danych między testami
- Zalecane jest użycie emulatora dla pełnych testów integracyjnych

## Pokrycie testów

### User Functions (`userFunctions.test.ts`)
- ✅ getUserDecks
- ✅ updateCardProgress
- ✅ getUserProgress
- ✅ getUserSettings
- ✅ updateUserSettings
- ✅ getUserProfile
- ✅ getUserActivityHeatmap
- ✅ getUserAwards
- ✅ getFriendsStreaks
- ✅ processFriendRequest
- ✅ serverNow
- ✅ getCurrentSeason
- ✅ submitPoints

### Deck Functions (`deckFunctions.test.ts`)
- ✅ createDeckWithCards
- ✅ getDeckDetails
- ✅ getDeckCards
- ✅ getDueDeckCards
- ✅ getNewDeckCards
- ✅ getPopularDecks
- ✅ resetDeck
- ✅ updateDeckSettings

### Ranking Functions (`rankingFunctions.test.ts`)
- ✅ getLeaderboard
- ✅ getUserRanking
- ✅ getFollowingRankings

### Notification Functions (`notificationFunctions.test.ts`)
- ✅ getNotifications
- ✅ markNotificationRead
- ✅ createNotification

### League Functions (`leagueFunctions.test.ts`)
- ✅ getLeagueInfo
- ✅ getAllLeaguesInfo
- ✅ getUserGroup

### Search Functions (`searchFunctions.test.ts`)
- ✅ searchDecks
- ✅ getSearchLogs

### Learning Functions (`learningFunctions.test.ts`)
- ✅ calculateNextReview (trigger test)

## Pomocnicze funkcje

### `testHelpers.ts`

Funkcje pomocnicze do tworzenia danych testowych:
- `createTestUser` - tworzy użytkownika testowego
- `createTestDeck` - tworzy deck testowy
- `createTestCard` - tworzy kartę testową
- `createTestSeason` - tworzy sezon testowy
- `createTestGroup` - tworzy grupę ligową testową
- `addUserToGroup` - dodaje użytkownika do grupy
- `createSeasonUserPoints` - tworzy dokument punktów sezonowych
- `createTestNotification` - tworzy notyfikację testową
- `createTestStudySession` - tworzy sesję nauki testową
- `waitForFirestore` - czeka na zakończenie operacji Firestore

### `mockData.ts`

Domyślne dane mock dla testów:
- `mockUserId`, `mockUserId2` - ID użytkowników
- `mockDeckId` - ID decku
- `mockCardId` - ID karty
- `mockSeasonId` - ID sezonu
- `mockGroupId` - ID grupy
- Obiekty z przykładowymi danymi (mockUser, mockDeck, mockCard, etc.)

## Pisanie nowych testów

### Przykładowy test

```typescript
describe("My Function", () => {
  it("should do something", async () => {
    // Setup test data
    await createTestUser(mockUserId);
    await waitForFirestore();

    // Wrap function for testing
    const wrapped = testEnv.wrap(myFunctions.myFunction);

    // Call function
    const result = await wrapped({ data: { userId: mockUserId } });

    // Assertions
    expect(result.success).toBe(true);
  });
});
```

### Best Practices

1. **Czyszczenie danych**: Każdy test powinien być niezależny. Używaj unikalnych ID dla każdego testu.

2. **Oczekiwanie na Firestore**: Po operacjach zapisu, użyj `await waitForFirestore()` aby zapewnić, że operacje zakończyły się.

3. **Wrapping funkcji**: Zawsze używaj `testEnv.wrap()` do opakowania funkcji przed wywołaniem w testach.

4. **Obsługa błędów**: Testuj zarówno happy path jak i przypadki błędów (brakujące parametry, nieistniejące dane, etc.).

5. **Transakcje**: Testy funkcji używających transakcji mogą być bardziej skomplikowane - upewnij się, że dane są przygotowane przed transakcją.

## Troubleshooting

### Błędy "Document not found"

- Upewnij się, że używasz `await waitForFirestore()` po utworzeniu danych
- Sprawdź, czy ścieżki do dokumentów są poprawne

### Błędy transakcji

- Transakcje wymagają, aby wszystkie dokumenty istniały przed rozpoczęciem transakcji
- Upewnij się, że tworzysz wszystkie potrzebne dokumenty przed wywołaniem funkcji używającej transakcji

### Timeout errors

- Zwiększ timeout w `jest.config.js` jeśli testy są wolne
- Upewnij się, że nie ma niekończących się pętli w testach

## Integracja z CI/CD

Testy mogą być uruchamiane w CI/CD pipeline:

```yaml
# Przykład dla GitHub Actions
- name: Run backend tests
  run: |
    cd functions
    npm install
    npm test
```

Dla pełnych testów z emulatorem, dodaj uruchomienie emulatora przed testami.


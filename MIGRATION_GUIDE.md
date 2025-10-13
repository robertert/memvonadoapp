# Firebase SDK to Cloud Functions Migration Guide

## Przegląd migracji

Ta migracja przenosi logikę biznesową z Firebase SDK (client-side) do Cloud Functions (server-side) w aplikacji Memvocado.

## Co zostało zmigrowane

### ✅ Cloud Functions (Server-side)

1. **SuperMemo2 Algorithm** - `calculateNextReview`

   - Automatyczne obliczanie następnej daty powtórki
   - Aktualizacja trudności karty
   - Trigger: `onDocumentUpdated` dla kart użytkownika

2. **User Statistics** - `updateUserStats`

   - Automatyczne aktualizowanie statystyk użytkownika
   - Obliczanie totalCards, totalDecks, totalReviews
   - Trigger: `onDocumentWritten` dla decków użytkownika

3. **Advanced Search** - `searchDecks`

   - Wyszukiwanie z filtrowaniem
   - Logowanie wyszukiwań dla analytics
   - Callable function

4. **User Data Validation** - `validateUserData`

   - Sprawdzanie duplikatów email/username
   - Inicjalizacja domyślnych danych użytkownika
   - Trigger: `onDocumentWritten` dla użytkowników

5. **Bulk Deck Creation** - `createDeckWithCards`

   - Atomowe tworzenie decku z kartami
   - Transakcje batch dla spójności danych
   - Callable function

6. **User Progress** - `getUserProgress`

   - Pobieranie statystyk i postępów użytkownika
   - Obliczanie study streak
   - Callable function

7. **Friend Requests** - `processFriendRequest`
   - Zarządzanie zaproszeniami do znajomych
   - Aktualizacja list friends/pending/incoming
   - Callable function

### 🔄 Częściowo zmigrowane (Client-side z TODO)

1. **createSelfScreen** - używa `createDeckWithCards` Cloud Function
2. **searchScreen** - używa `searchDecks` Cloud Function
3. **dashboardScreen** - przygotowany na Cloud Functions
4. **learnScreen** - przygotowany na Cloud Functions

### 📱 Pozostało w Firebase SDK (Client-side)

1. **Authentication** - logowanie, rejestracja, reset hasła
2. **Basic CRUD** - proste operacje getDoc, addDoc, updateDoc
3. **Storage** - upload/delete plików
4. **Real-time listeners** - onAuthStateChanged

## Struktura plików

```
functions/
├── src/
│   └── index.ts          # Wszystkie Cloud Functions
├── package.json          # Dependencies dla Functions
└── tsconfig.json         # TypeScript config

services/
└── cloudFunctions.ts     # Client-side wrapper dla Functions

app/
├── stack/
│   ├── createSelfScreen.tsx  # Używa Cloud Functions
│   └── learnScreen.tsx       # Przygotowany na Functions
└── tabs/
    ├── searchScreen.tsx      # Używa Cloud Functions
    └── dashboardScreen.tsx   # Przygotowany na Functions
```

## Instrukcje wdrożenia

### 1. Zbuduj Cloud Functions

```bash
npm run functions:build
```

### 2. Przetestuj lokalnie

```bash
npm run functions:serve
```

### 3. Wdróż na Firebase

```bash
npm run functions:deploy
```

## Następne kroki migracji

### Faza 2: Dokończenie learnScreen

- Implementacja `getDeckProgress` Cloud Function
- Implementacja `updateDeckProgress` Cloud Function
- Pełna migracja algorytmu SuperMemo2

### Faza 3: Dashboard i statystyki

- Implementacja `getUserDecks` Cloud Function
- Implementacja `getUserAnalytics` Cloud Function
- Real-time updates dla statystyk

### Faza 4: Zaawansowane funkcje

- Implementacja `updateRecentSearches` Cloud Function
- Implementacja `getUserRecommendations` Cloud Function
- Implementacja `batchUpdateCards` Cloud Function

## Korzyści z migracji

1. **Wydajność** - mniej kodu w aplikacji klienta
2. **Bezpieczeństwo** - logika biznesowa po stronie serwera
3. **Skalowalność** - łatwiejsze zarządzanie zasobami
4. **Konsystencja** - transakcje atomowe dla skomplikowanych operacji
5. **Maintenance** - łatwiejsze testowanie i debugowanie

## Troubleshooting

### Błędy często występujące

1. **Firebase Functions not found**

   - Sprawdź czy functions są wdrożone: `firebase functions:list`
   - Sprawdź region w konfiguracji

2. **Permission denied**

   - Sprawdź Firebase Security Rules
   - Sprawdź czy użytkownik jest autoryzowany

3. **Function timeout**
   - Zwiększ `maxInstances` w `setGlobalOptions`
   - Zoptymalizuj kod funkcji

### Logi i monitoring

```bash
# Zobacz logi Functions
firebase functions:log

# Monitoruj w czasie rzeczywistym
firebase functions:log --tail
```

## Testowanie

### Testowanie lokalne

1. Uruchom emulator: `firebase emulators:start`
2. Przetestuj funkcje w aplikacji
3. Sprawdź logi w konsoli emulatora

### Testowanie produkcyjne

1. Wdróż funkcje: `npm run functions:deploy`
2. Przetestuj w aplikacji produkcyjnej
3. Monitoruj logi i metryki w Firebase Console

## Wsparcie

W przypadku problemów:

1. Sprawdź logi Firebase Functions
2. Sprawdź Firebase Console > Functions
3. Sprawdź dokumentację Firebase Functions
4. Sprawdź Stack Overflow z tagiem `firebase-functions`


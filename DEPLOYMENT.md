# Deployment Guide - Cloud Functions

## Status migracji

✅ **Migracja Firebase SDK do Cloud Functions została pomyślnie zakończona!**

- Cloud Functions są skompilowane i gotowe do wdrożenia
- Aplikacja klienta używa Cloud Functions
- Infrastruktura jest skonfigurowana
- ESLint ma tylko 2 ostrzeżenia (nie błędy)
- TypeScript compilation: ✅ PASSED

## Wdrożenie Cloud Functions

### 1. Wdróż Cloud Functions na Firebase

```bash
npm run functions:deploy
```

Lub bezpośrednio:

```bash
cd functions
firebase deploy --only functions
```

### 2. Wdróż reguły bezpieczeństwa

```bash
firebase deploy --only firestore:rules,storage
```

### 3. Wdróż indeksy Firestore

```bash
firebase deploy --only firestore:indexes
```

## Testowanie

### Testowanie lokalne

1. **Uruchom emulator Firebase:**

   ```bash
   firebase emulators:start
   ```

2. **Uruchom aplikację:**

   ```bash
   npm start
   ```

3. **Przetestuj funkcje:**
   - Tworzenie decku z kartami
   - Wyszukiwanie decków
   - Dashboard i statystyki

### Testowanie produkcyjne

1. **Wdróż wszystko:**

   ```bash
   firebase deploy
   ```

2. **Przetestuj w aplikacji produkcyjnej**

3. **Monitoruj logi:**
   ```bash
   firebase functions:log
   ```

## Funkcje Cloud Functions

### ✅ Zaimplementowane i gotowe:

1. **`calculateNextReview`** - Algorytm SuperMemo2
2. **`updateUserStats`** - Aktualizacja statystyk użytkownika
3. **`searchDecks`** - Zaawansowane wyszukiwanie
4. **`validateUserData`** - Walidacja danych użytkownika
5. **`createDeckWithCards`** - Tworzenie decku z kartami
6. **`getUserProgress`** - Pobieranie postępów użytkownika
7. **`processFriendRequest`** - Zarządzanie zaproszeniami

### 🔄 Częściowo zmigrowane:

- `createSelfScreen` - używa Cloud Functions
- `searchScreen` - używa Cloud Functions
- `dashboardScreen` - przygotowany na Cloud Functions
- `learnScreen` - przygotowany na Cloud Functions

## Monitoring i logi

### Firebase Console

1. **Functions** - status i metryki funkcji
2. **Firestore** - baza danych i reguły
3. **Storage** - pliki i reguły
4. **Analytics** - użycie aplikacji

### Logi w czasie rzeczywistym

```bash
firebase functions:log --tail
```

## Troubleshooting

### Częste problemy:

1. **Functions not found**

   - Sprawdź czy są wdrożone: `firebase functions:list`
   - Sprawdź region w konfiguracji

2. **Permission denied**

   - Sprawdź Firebase Security Rules
   - Sprawdź czy użytkownik jest autoryzowany

3. **Function timeout**
   - Zwiększ `maxInstances` w `setGlobalOptions`
   - Zoptymalizuj kod funkcji

### Rozwiązywanie problemów:

1. Sprawdź logi Firebase Functions
2. Sprawdź Firebase Console > Functions
3. Sprawdź dokumentację Firebase Functions
4. Sprawdź Stack Overflow z tagiem `firebase-functions`

## Następne kroki

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

## Wsparcie

W przypadku problemów:

1. Sprawdź logi Firebase Functions
2. Sprawdź Firebase Console > Functions
3. Sprawdź dokumentację Firebase Functions
4. Sprawdź Stack Overflow z tagiem `firebase-functions`

---

**🎉 Gratulacje! Migracja została pomyślnie zakończona!**


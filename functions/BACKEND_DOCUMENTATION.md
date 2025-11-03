# Dokumentacja Backendu Memvocado

## 📋 Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura](#architektura)
3. [Konfiguracja](#konfiguracja)
4. [Moduły i funkcje](#moduły-i-funkcje)
   - [Funkcje użytkownika (User Functions)](#funkcje-użytkownika-user-functions)
   - [Funkcje talii (Deck Functions)](#funkcje-talii-deck-functions)
   - [Funkcje rankingu (Ranking Functions)](#funkcje-rankingu-ranking-functions)
   - [Funkcje lig (League Functions)](#funkcje-lig-league-functions)
   - [Funkcje nauki (Learning Functions)](#funkcje-nauki-learning-functions)
   - [Funkcje powiadomień (Notification Functions)](#funkcje-powiadomień-notification-functions)
   - [Funkcje wyszukiwania (Search Functions)](#funkcje-wyszukiwania-search-functions)
5. [Struktura danych](#struktura-danych)
6. [Błędy i obsługa](#błędy-i-obsługa)
7. [Bezpieczeństwo](#bezpieczeństwo)

---

## Wprowadzenie

Backend Memvocado jest zbudowany na Firebase Cloud Functions i zapewnia pełną funkcjonalność aplikacji do nauki z fiszkami. System obsługuje zarządzanie użytkownikami, taliami, rankingami, ligami oraz systemem powiadomień.

### Technologie

- **Runtime**: Node.js 22
- **Framework**: Firebase Functions v2
- **Region**: `europe-west1`
- **Baza danych**: Cloud Firestore
- **Język**: TypeScript

---

## Architektura

### Struktura modułów

```
functions/src/
├── index.ts                 # Główny punkt eksportu wszystkich funkcji
├── userFunctions.ts         # Funkcje użytkownika i statystyki
├── deckFunctions.ts         # Zarządzanie taliami i kartami
├── rankingFunctions.ts      # System rankingów i liderów
├── leagueFunctions.ts       # System lig (15 poziomów)
├── learningFunctions.ts     # Algorytmy nauki i recenzji
├── notificationFunctions.ts # System powiadomień
├── searchFunctions.ts       # Wyszukiwanie talii
└── types/
    └── common.ts            # Wspólne typy danych
```

### Typy funkcji

- **onCall**: HTTP callable functions - wywoływane bezpośrednio z klienta
- **onDocumentWritten**: Trigger Firestore - wywoływane automatycznie przy zmianach w bazie

---

## Konfiguracja

### Opcje globalne

```typescript
setGlobalOptions({ 
  maxInstances: 10, 
  region: "europe-west1" 
});
```

### Wymagane indeksy Firestore

Dla prawidłowego działania niektórych zapytań wymagane są złożone indeksy:

1. **Leaderboard**: `leagueGroups/{seasonId}/{league}/groups/{groupId}/members`
   - Pole: `points` (descending)

2. **Search**: `decks`
   - Pola: `title`, `isPublic`, `subject`, `difficulty`

---

## Moduły i funkcje

---

## Funkcje użytkownika (User Functions)

### `serverNow`

Zwraca autorytatywny czas serwera.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{} // Brak parametrów
```

**Zwraca**:
```typescript
{
  nowMs: number;      // Czas w milisekundach (Unix timestamp)
  iso: string;        // Czas w formacie ISO 8601
}
```

**Przykład użycia**:
```typescript
const time = await serverNow();
// { nowMs: 1704067200000, iso: "2024-01-01T00:00:00.000Z" }
```

---

### `getCurrentSeason`

Pobiera lub inicjalizuje aktualny sezon (tygodniowe okno).

**Typ**: `onCall`

**Logika sezonu**:
- Sezon rozpoczyna się w poniedziałek 00:00 UTC
- Trwa 7 dni (tydzień)
- Format ID: `{startDate}_{endDate}` (np. `2024-01-01_2024-01-08`)

**Parametry wejściowe**:
```typescript
{} // Brak parametrów
```

**Zwraca**:
```typescript
{
  seasonId: string;        // ID sezonu (format: YYYY-MM-DD_YYYY-MM-DD)
  startAt: Date;           // Data rozpoczęcia sezonu
  endAt: Date;             // Data zakończenia sezonu
  status: "active";        // Status sezonu
}
```

**Lokalizacja w Firestore**: `ranking/currentSeason`

---

### `submitPoints`

Przesyła punkty użytkownika dla aktualnego sezonu (autorytatywne, z timestampem serwera).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;      // ID użytkownika (wymagane)
  delta: number;      // Zmiana punktów (wymagane, liczba)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Działanie**:
- Automatycznie przypisuje użytkownika do grupy ligowej jeśli nie ma
- Aktualizuje punkty w sezonie, grupie ligowej i dokumencie użytkownika
- Używa transakcji dla zapewnienia spójności danych

**Lokalizacje w Firestore**:
- `seasonUserPoints/{seasonId}/users/{userId}`
- `leagueGroups/{seasonId}/{league}/groups/{groupId}/members/{userId}`
- `users/{userId}`

---

### `weeklyRollOver`

Zamyka aktualny sezon i publikuje snapshot tabeli liderów. Inicjalizuje nowy sezon.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{} // Brak parametrów
```

**Zwraca**:
```typescript
{
  success: boolean;
  nextSeasonId: string;  // ID nowego sezonu
}
```

**Działanie**:
1. Pobiera top 100 użytkowników z aktualnego sezonu
2. Zapisuje snapshot w `leaderboards/{seasonId}/groups/global`
3. Tworzy nowy sezon (następny tydzień)

**Uwaga**: W produkcji należy skonfigurować Cloud Scheduler do automatycznego wywoływania co tydzień.

---

### `getUserDecks`

Pobiera wszystkie talie użytkownika wraz z kartami.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  decks: Array<{
    id: string;
    title: string;
    cardsNum: number;
    createdBy: string;
    createdAt: Date;
    isPublic: boolean;
    cards: Array<{
      id: string;
      front: string;
      back: string;
      // ... inne pola karty
    }>;
  }>;
}
```

**Lokalizacja w Firestore**: `users/{userId}/decks`

---

### `updateCardProgress`

Aktualizuje postęp karty po recenzji.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;           // ID użytkownika (wymagane)
  deckId: string;           // ID talii (wymagane)
  cardId: string;           // ID karty (wymagane)
  grade?: number;           // Ocena (0-5, opcjonalne)
  difficulty?: number;      // Trudność FSRS (opcjonalne)
  interval?: number;        // Interwał w dniach (opcjonalne)
  firstLearn?: object;      // Dane pierwszego uczenia (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Działanie**:
- Aktualizuje `cardAlgo` (dane FSRS)
- Aktualizuje `firstLearn` (dane pierwszego uczenia)
- Zapisuje sesję nauki w `users/{userId}/studySessions`

**Lokalizacja w Firestore**: `decks/{deckId}/cards/{cardId}`

---

### `getUserProgress`

Pobiera postęp użytkownika i statystyki.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  stats: {
    totalCards: number;
    totalDecks: number;
    totalReviews: number;
    averageDifficulty: number;
  };
  recentSessions: Array<{
    id: string;
    deckId: string;
    cardId: string;
    grade: number;
    date: Date;
    reviewTime: number;
  }>;
  streak: number;               // Liczba dni z aktywnością
  lastStudyDate?: Date;
}
```

---

### `getUserSettings`

Pobiera ustawienia użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  settings: {
    theme?: "light" | "dark";
    notificationsEnabled?: boolean;
    dailyGoal?: number;
    language?: string;
    [key: string]: any;
  };
}
```

**Logika**:
1. Sprawdza `users/{userId}/settings/app` (dedykowany dokument)
2. Jeśli nie istnieje, sprawdza `users/{userId}.settings` (pole w dokumencie użytkownika)

---

### `updateUserSettings`

Aktualizuje ustawienia użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;      // ID użytkownika (wymagane)
  settings: object;    // Obiekt ustawień (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Lokalizacja w Firestore**: `users/{userId}/settings/app`

---

### `getUserProfile`

Pobiera pełny profil użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  userId: string;
  username: string;
  email: string | null;
  stats: {
    totalCards: number;
    totalDecks: number;
    totalReviews: number;
    averageDifficulty: number;
  };
  streak: number;
  league: number;           // Numer ligi (1-15)
  points: number;
  friendsCount: number;
  followers: number;        // Obecnie = friendsCount
  following: number;        // Obecnie = friendsCount
}
```

---

### `getUserActivityHeatmap`

Pobiera dane do heatmapy aktywności użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;   // ID użytkownika (wymagane)
  weeks?: number;   // Liczba tygodni (domyślnie: 16)
}
```

**Zwraca**:
```typescript
{
  heatmapData: Array<{
    date: string;   // Format: YYYY-MM-DD
    count: number;  // Liczba sesji w tym dniu
  }>;
}
```

---

### `getUserAwards`

Pobiera nagrody użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  awards: Array<{
    id: string;
    title: string;
    description: string;
    earnedAt: Date;
    // ... inne pola nagrody
  }>;
}
```

**Lokalizacja w Firestore**: `users/{userId}/awards` (posortowane po `earnedAt` desc)

---

### `getFriendsStreaks`

Pobiera serię aktywności znajomych użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  friendsStreaks: Array<{
    userId: string;
    name: string;
    streak: number;
  }>;
}
```

**Uwaga**: Zwraca posortowane po `streak` (malejąco).

---

### `processFriendRequest`

Przetwarza zaproszenie do znajomych (akceptacja lub odrzucenie).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  fromUserId: string;                    // ID użytkownika wysyłającego (wymagane)
  toUserId: string;                      // ID użytkownika otrzymującego (wymagane)
  action: "accept" | "reject";           // Akcja (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Działanie**:
- **accept**: Dodaje obu użytkowników do listy `friends`, usuwa z `pending`/`incoming`
- **reject**: Usuwa z list `pending`/`incoming`

**Lokalizacja w Firestore**: `users/{userId}` (pola: `friends`, `pending`, `incoming`)

---

### `validateUserData`

**Trigger Firestore** - Waliduje dane użytkownika przy utworzeniu/zaktualizowaniu.

**Typ**: `onDocumentWritten`

**Trigger**: `users/{userId}`

**Działanie**:
- Sprawdza duplikaty emaila
- Inicjalizuje statystyki użytkownika
- Inicjalizuje puste listy (`friends`, `pending`, `incoming`)
- Ustawia domyślny motyw na `light`

---

## Funkcje talii (Deck Functions)

### `createDeckWithCards`

Tworzy talię z kartami w jednej operacji (bulk).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  title: string;              // Tytuł talii (wymagane)
  cards: CardData[];          // Tablica kart (wymagane)
  userId: string;             // ID użytkownika (wymagane)
}

interface CardData {
  front: string;
  back: string;
  tags: string[];
}
```

**Zwraca**:
```typescript
{
  deckId: string;
}
```

**Działanie**:
1. Tworzy dokument talii w `decks/{deckId}`
2. Tworzy wszystkie karty w `decks/{deckId}/cards/{cardId}`
3. Dodaje ID talii do `users/{userId}.decks`

**Inicjalne wartości kart**:
- `difficulty`: 2.5
- `nextReviewInterval`: 1
- `grade`: -1

---

### `getDeckDetails`

Pobiera szczegóły talii (bez kart).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  deckId: string;  // ID talii (wymagane)
}
```

**Zwraca**:
```typescript
{
  deck: {
    id: string;
    title: string;
    cardsNum: number;
    createdBy: string;
    createdAt: Date;
    isPublic: boolean;
    // ... inne pola talii
  };
}
```

---

### `getDeckCards`

Pobiera karty talii z paginacją.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  deckId: string;      // ID talii (wymagane)
  limit?: number;      // Limit kart (domyślnie: 20)
  startAfter?: string; // ID ostatniej karty z poprzedniej strony (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  cards: Array<{
    id: string;
    front: string;
    back: string;
    // ... inne pola karty
  }>;
  hasMore: boolean;      // Czy są kolejne karty
  lastDocId: string | null; // ID ostatniej karty (do paginacji)
}
```

---

### `getDueDeckCards`

Pobiera karty do powtórki (filtrowanie po stronie serwera).

**Typ**: `onCall`

**Logika filtrowania**:
- Zwraca karty z `cardAlgo.due <= now` (karty FSRS)
- Lub karty z `firstLearn.isNew && firstLearn.due <= now` (pierwsze uczenie)

**Parametry wejściowe**:
```typescript
{
  deckId: string;    // ID talii (wymagane)
  limit?: number;    // Limit kart (domyślnie: 100)
}
```

**Zwraca**:
```typescript
{
  cards: Array<{
    id: string;
    front: string;
    back: string;
    cardAlgo?: {
      due: Date;
      difficulty: number;
      // ... inne pola FSRS
    };
    firstLearn?: {
      isNew: boolean;
      due: Date;
      // ... inne pola pierwszego uczenia
    };
    // ... inne pola karty
  }>;
}
```

---

### `getNewDeckCards`

Pobiera nowe karty kandydujące do wprowadzenia w sesji.

**Typ**: `onCall`

**Logika filtrowania**:
- `firstLearn.isNew === true`
- `firstLearn.due <= now` (jeśli ustawione)
- `!prevAns` (nie było wcześniejszej odpowiedzi)
- `consecutiveGood === 0`

**Parametry wejściowe**:
```typescript
{
  deckId: string;    // ID talii (wymagane)
  limit?: number;    // Limit kart (domyślnie: 50)
}
```

**Zwraca**:
```typescript
{
  cards: Array<{
    id: string;
    front: string;
    back: string;
    firstLearn: {
      isNew: boolean;
      // ... inne pola
    };
    // ... inne pola karty
  }>;
}
```

---

### `getPopularDecks`

Pobiera popularne publiczne talie.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  limit?: number;  // Limit talii (domyślnie: 8)
}
```

**Zwraca**:
```typescript
{
  decks: Array<{
    id: string;
    title: string;
    views: number;    // Sortowane malejąco po views
    isPublic: true;
    // ... inne pola talii
  }>;
}
```

**Zapytanie**: `decks` gdzie `isPublic == true`, sortowane po `views` desc

---

### `resetDeck`

Resetuje postęp talii - usuwa wszystkie dane postępu kart.

**Typ**: `onCall`

**Uwaga**: Wymaga autoryzacji (`request.auth`).

**Parametry wejściowe**:
```typescript
{
  deckId: string;  // ID talii (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
  cardsReset: number;  // Liczba zresetowanych kart
}
```

**Działanie**:
1. Sprawdza uprawnienia (użytkownik musi być właścicielem talii)
2. Usuwa dla wszystkich kart:
   - `cardAlgo`
   - `firstLearn`
   - `grade` → -1
   - `lastReviewDate`
   - Resetuje `difficulty` → 2.5
   - Resetuje `nextReviewInterval` → 1

**Uwaga**: Używa batch operations (limit 500 operacji na batch).

---

### `updateDeckSettings`

Aktualizuje ustawienia talii.

**Typ**: `onCall`

**Uwaga**: Wymaga autoryzacji (`request.auth`).

**Parametry wejściowe**:
```typescript
{
  deckId: string;      // ID talii (wymagane)
  settings: object;   // Obiekt ustawień (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Działanie**:
1. Sprawdza uprawnienia (użytkownik musi być właścicielem talii)
2. Aktualizuje `decks/{deckId}.settings`
3. Ustawia `updatedAt` na timestamp serwera

---

### `updateUserStats`

**Trigger Firestore** - Aktualizuje statystyki użytkownika przy zmianach w talii.

**Typ**: `onDocumentWritten`

**Trigger**: `users/{userId}/decks/{deckId}`

**Działanie**:
- Liczy łączne karty we wszystkich taliach użytkownika
- Liczy łączne recenzje
- Oblicza średnią trudność
- Aktualizuje `users/{userId}.stats`

---

## Funkcje rankingu (Ranking Functions)

### `getLeaderboard`

Pobiera ranking dla grupy użytkownika (grupa ligowa 20-osobowa).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;      // ID użytkownika (wymagane)
  seasonId?: string;   // ID sezonu (opcjonalne, używa aktualnego jeśli brak)
}
```

**Zwraca**:
```typescript
{
  entries: Array<{
    userId: string;
    username: string;
    points: number;
    position: number;           // Pozycja w grupie (1-based)
    lastActivityAt: Date | null;
  }>;
  groupId: string | null;        // ID grupy ligowej
  leagueNumber: number | null;    // Numer ligi (1-15)
  seasonId: string;
  totalMembers: number;          // Liczba członków grupy
}
```

**Logika**:
1. Pobiera informacje o użytkowniku z `seasonUserPoints/{seasonId}/users/{userId}`
2. Jeśli brak grupy, zwraca pusty ranking
3. Pobiera wszystkich członków grupy, sortowanych po `points` desc
4. Dla każdego członka pobiera username z `users/{userId}`

**Lokalizacja w Firestore**: 
`leagueGroups/{seasonId}/{leagueNumber}/groups/{groupId}/members`

---

### `getUserRanking`

Pobiera pozycję użytkownika w jego grupie.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;      // ID użytkownika (wymagane)
  seasonId?: string;   // ID sezonu (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  position: number | null;      // Pozycja w grupie (1-based) lub null
  groupId: string | null;
  leagueNumber: number | null;
  points: number;
  totalMembers?: number;
}
```

**Logika**:
- Liczy użytkowników w grupie z większą liczbą punktów
- Pozycja = liczba użytkowników z więcej punktami + 1

---

### `getFollowingRankings`

Pobiera rankingi znajomych (pozycje w ich grupach).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;      // ID użytkownika (wymagane)
  seasonId?: string;   // ID sezonu (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  rankings: Array<{
    userId: string;
    username?: string;
    position: number | null;
    points: number;
    leagueNumber: number;
    groupId?: string;
    totalMembers?: number;
  }>;
}
```

**Uwaga**: Zwraca posortowane po `points` (malejąco), filtruje null wartości.

---

### `assignUserToGroup`

Przypisuje użytkownika do grupy ligowej.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;         // ID użytkownika (wymagane)
  leagueNumber: number;   // Numer ligi (1-15, wymagane)
  seasonId: string;       // ID sezonu (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
  groupId: string;        // ID przypisanej grupy
}
```

**Logika**:
1. Szuka grupy z `currentCount < capacity` (domyślnie 20)
2. Jeśli nie znajdzie, tworzy nową grupę
3. W transakcji:
   - Dodaje użytkownika do `members/{userId}`
   - Aktualizuje `currentCount` i `isFull`
   - Aktualizuje `seasonUserPoints/{seasonId}/users/{userId}.groupId`
   - Aktualizuje `users/{userId}.currentGroupId`

**Lokalizacja w Firestore**:
`leagueGroups/{seasonId}/{leagueNumber}/groups/{groupId}`

---

## Funkcje lig (League Functions)

### `getLeagueInfo`

Pobiera informacje o lidze.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  leagueNumber: number;  // Numer ligi (1-15, wymagane)
}
```

**Zwraca**:
```typescript
{
  league: {
    id: number;
    name: string;           // np. "Liga 1", "Złota Liga"
    color: string;          // Kolor w formacie hex (#FFD700)
    description: string;    // Opis ligi
  };
}
```

**Dostępne ligi**:
- Liga 1-10: Podstawowe ligi (szare → różowe)
- Liga 11: Brązowa Liga (#CD7F32)
- Liga 12: Srebrna Liga (#C0C0C0)
- Liga 13: Złota Liga (#FFD700)
- Liga 14: Platynowa Liga (#6A5ACD)
- Liga 15: Diamentowa Liga (#00BFFF)

---

### `getAllLeaguesInfo`

Pobiera informacje o wszystkich ligach.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{} // Brak parametrów
```

**Zwraca**:
```typescript
{
  leagues: Array<{
    id: number;
    name: string;
    color: string;
    description: string;
  }>;
}
```

---

### `getUserGroup`

Pobiera informacje o grupie użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;      // ID użytkownika (wymagane)
  seasonId?: string;   // ID sezonu (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  groupId: string | null;
  leagueNumber: number | null;
  memberCount: number;      // Aktualna liczba członków
  capacity: number;         // Pojemność grupy (domyślnie: 20)
  isFull: boolean;
}
```

---

### `updateUserLeague`

Aktualizuje ligę użytkownika i przypisuje do nowej grupy.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;        // ID użytkownika (wymagane)
  newLeague: number;     // Nowa liga (1-15, wymagane)
  seasonId?: string;     // ID sezonu (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
  league: number;
  groupId: string;
}
```

**Działanie**:
1. Usuwa użytkownika ze starej grupy (zmniejsza `currentCount`)
2. Aktualizuje `users/{userId}.league`
3. Przypisuje do nowej grupy w nowej lidze (używa tej samej logiki co `assignUserToGroup`)

---

## Funkcje nauki (Learning Functions)

### `calculateNextReview`

**Trigger Firestore** - Oblicza następną datę recenzji gdy karta jest aktualizowana.

**Typ**: `onDocumentUpdated`

**Trigger**: `users/{userId}/decks/{deckId}/cards/{cardId}`

**Warunek**: Wywołuje się tylko gdy `grade` się zmienił.

**Działanie**:
1. Używa algorytmu SuperMemo2 do obliczenia interwału i trudności
2. Aktualizuje kartę:
   - `difficulty`
   - `nextReviewInterval`
   - `nextReviewDate` (obecna data + interwał)
   - `lastReviewDate`

**Algorytm**: SuperMemo2 (implementacja w `superMemo2.ts`)

---

## Funkcje powiadomień (Notification Functions)

### `getNotifications`

Pobiera powiadomienia użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;       // ID użytkownika (wymagane)
  limit?: number;       // Limit powiadomień (domyślnie: 50)
}
```

**Zwraca**:
```typescript
{
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    type: "info" | "success" | "warning" | "error";
    linkTo?: string;    // Opcjonalny link
    read: boolean;
    createdAt: Date;
  }>;
}
```

**Sortowanie**: Po `createdAt` (malejąco)

**Lokalizacja w Firestore**: `users/{userId}/notifications`

---

### `markNotificationRead`

Oznacza powiadomienie jako przeczytane.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;           // ID użytkownika (wymagane)
  notificationId: string;  // ID powiadomienia (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Działanie**: Ustawia `read: true` i `readAt: serverTimestamp()`

---

### `createNotification`

Tworzy powiadomienie dla użytkownika (do użycia przez system).

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;                    // ID użytkownika (wymagane)
  notification: NotificationData;   // Dane powiadomienia (wymagane)
}

interface NotificationData {
  title: string;
  body: string;
  type?: "info" | "success" | "warning" | "error";  // Domyślnie: "info"
  linkTo?: string;
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

---

### `onLeagueAdvance`

**Trigger Firestore** - Tworzy powiadomienie gdy użytkownik awansuje do wyższej ligi.

**Typ**: `onDocumentWritten`

**Trigger**: `users/{userId}`

**Warunek**: `afterData.league > beforeData.league && afterData.league <= 15`

**Powiadomienie**:
```typescript
{
  title: "Ranking Up!",
  body: "Congrats! You advanced to League {leagueNumber}.",
  type: "success"
}
```

---

### `notifyStreakBroken`

Tworzy powiadomienie o przerwaniu serii.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Powiadomienie**:
```typescript
{
  title: "Streak broken",
  body: "You missed your daily practice. Start again today!",
  type: "warning"
}
```

**Uwaga**: Powinno być wywoływane przez scheduled function lub gdy streak osiągnie 0.

---

### `notifySeasonEnd`

Tworzy powiadomienie o zakończeniu sezonu.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;           // ID użytkownika (wymagane)
  seasonId: string;        // ID sezonu (wymagane)
  finalPosition?: number;  // Finalna pozycja (opcjonalne)
  leagueNumber?: number;   // Numer ligi (opcjonalne)
}
```

**Zwraca**:
```typescript
{
  success: boolean;
}
```

**Logika powiadomienia**:
- Jeśli `finalPosition <= 3 && leagueNumber < 15`: Specjalne powiadomienie o awansie
- W przeciwnym razie: Standardowe powiadomienie o zakończeniu sezonu

**Uwaga**: Powinno być wywoływane z `weeklyRollOver` dla wszystkich użytkowników.

---

## Funkcje wyszukiwania (Search Functions)

### `searchDecks`

Wyszukuje talie z zaawansowanym filtrowaniem.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  searchText?: string;     // Tekst wyszukiwania (opcjonalne)
  filters?: {
    subject?: string;      // Filtr przedmiotu (opcjonalne)
    difficulty?: number;   // Filtr trudności (opcjonalne)
    isPublic?: boolean;    // Filtr publiczności (opcjonalne)
  };
  userId?: string;        // ID użytkownika (opcjonalne, dla logowania)
}
```

**Zwraca**:
```typescript
{
  results: Array<{
    id: string;
    title: string;
    subject?: string;
    difficulty?: number;
    isPublic: boolean;
    // ... inne pola talii
  }>;
  total: number;
}
```

**Logika wyszukiwania**:
- **Tekst**: Wyszukiwanie prefixowe w `title` (`>=` i `<=` z `\uf8ff`)
- **Filtry**: Dodatkowe warunki WHERE

**Limit**: 20 wyników

**Logowanie**: Jeśli `userId` podane, zapisuje wyszukiwanie w `users/{userId}/searchLogs`

---

### `getSearchLogs`

Pobiera historię wyszukiwań użytkownika.

**Typ**: `onCall`

**Parametry wejściowe**:
```typescript
{
  userId: string;  // ID użytkownika (wymagane)
}
```

**Zwraca**:
```typescript
Array<{
  id: string;
  userId: string;
  searchText: string;
  filters: {
    subject?: string;
    difficulty?: number;
    isPublic?: boolean;
  };
  resultsCount: number;
  timestamp: Date;
}>
```

---

## Struktura danych

### Kolekcje Firestore

#### `users/{userId}`
```typescript
{
  username?: string;
  name?: string;
  email?: string;
  league: number;              // 1-15
  currentGroupId?: string;
  points?: number;
  streak?: number;
  stats: {
    totalCards: number;
    totalDecks: number;
    totalReviews: number;
    averageDifficulty: number;
    lastStudyDate?: Date;
  };
  friends: string[];           // Array of userIds
  pending: string[];           // Outgoing friend requests
  incoming: string[];          // Incoming friend requests
  decks: string[];             // Array of deckIds
  theme?: "light" | "dark";
}
```

#### `users/{userId}/decks/{deckId}`
```typescript
{
  title: string;
  // ... inne pola talii użytkownika
}
```

#### `users/{userId}/decks/{deckId}/cards/{cardId}`
```typescript
{
  front: string;
  back: string;
  tags: string[];
  grade: number;               // -1 (nieocenione) do 5
  difficulty: number;           // Dla SuperMemo2
  nextReviewInterval: number;  // Dni
  nextReviewDate?: Date;
  lastReviewDate?: Date;
  cardAlgo?: {                 // FSRS data
    difficulty: number;
    scheduled_days: number;
    due: Date;
    last_review: Date;
    reps: number;
    state: number;
  };
  firstLearn?: {               // First learning data
    isNew: boolean;
    due?: Date;
    consecutiveGood: number;
    // ... inne pola
  };
}
```

#### `users/{userId}/studySessions/{sessionId}`
```typescript
{
  deckId: string;
  cardId: string;
  grade: number;
  date: Date;
  reviewTime: number;          // Timestamp
}
```

#### `users/{userId}/notifications/{notificationId}`
```typescript
{
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "error";
  linkTo?: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}
```

#### `users/{userId}/settings/app`
```typescript
{
  theme?: "light" | "dark";
  notificationsEnabled?: boolean;
  dailyGoal?: number;
  language?: string;
  [key: string]: any;
}
```

#### `decks/{deckId}`
```typescript
{
  title: string;
  cardsNum: number;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  views?: number;
  subject?: string;
  difficulty?: number;
  settings?: object;
  updatedAt?: Date;
}
```

#### `decks/{deckId}/cards/{cardId}`
```typescript
{
  front: string;
  back: string;
  tags: string[];
  createdAt: Date;
  difficulty: number;
  nextReviewInterval: number;
  grade: number;
  cardAlgo?: object;           // FSRS data
  firstLearn?: object;          // First learning data
  lastReviewDate?: Date;
  nextReviewDate?: Date;
}
```

#### `ranking/currentSeason`
```typescript
{
  seasonId: string;            // Format: YYYY-MM-DD_YYYY-MM-DD
  startAt: Date;
  endAt: Date;
  status: "active";
  createdAt?: Date;
  rolledAt?: Date;              // Timestamp ostatniego rollover
}
```

#### `seasonUserPoints/{seasonId}/users/{userId}`
```typescript
{
  points: number;
  league: number;
  groupId?: string;
  lastActivityAt: Date;
}
```

#### `leagueGroups/{seasonId}/{leagueNumber}/groups/{groupId}`
```typescript
{
  createdAt: Date;
  isFull: boolean;
  capacity: number;            // Domyślnie: 20
  currentCount: number;
  seasonId: string;
  leagueNumber: number;
}
```

#### `leagueGroups/{seasonId}/{leagueNumber}/groups/{groupId}/members/{userId}`
```typescript
{
  userId: string;
  points: number;
  lastActivityAt: Date;
}
```

#### `leaderboards/{seasonId}/groups/global`
```typescript
{
  entries: Array<{
    userId: string;
    points: number;
    lastActivityAt: Date;
    position: number;          // 1-based
  }>;
  updatedAt: Date;
}
```

---

## Błędy i obsługa

### Standardowe błędy

Wszystkie funkcje mogą rzucić błąd w następujących przypadkach:

1. **Brak wymaganych parametrów**: `"userId is required"`, `"deckId is required"`, itp.
2. **Nieprawidłowe dane**: `"Valid leagueNumber (1-15) is required"`, `"userId and numeric delta are required"`
3. **Zasób nie znaleziony**: `"User not found"`, `"Deck not found"`, `"No active season"`
4. **Brak autoryzacji**: `"Authentication required"`, `"Unauthorized: You don't have permission..."`
5. **Błędy serwera**: `"Failed to get leaderboard"`, `"Failed to update card progress"`, itp.

### Format błędów

Błędy są zwracane jako obiekty `Error` z Firebase Functions. Klient powinien obsługiwać je w try-catch:

```typescript
try {
  const result = await getUserDecks({ userId });
} catch (error) {
  // Obsługa błędu
  console.error(error.message);
}
```

### Logowanie

Wszystkie funkcje logują:
- Błędy: `logger.error("Description", error)`
- Informacje: `logger.info("Description", data)`
- Ostrzeżenia: `logger.warn("Description", data)`

Logi są dostępne w Firebase Console → Functions → Logs.

---

## Bezpieczeństwo

### Autoryzacja

Niektóre funkcje wymagają autoryzacji:
- `resetDeck`: Wymaga `request.auth`
- `updateDeckSettings`: Wymaga `request.auth`

### Sprawdzanie uprawnień

Funkcje sprawdzające uprawnienia:
- **Reset/Update Deck**: Sprawdza czy `deckData.createdBy === userId` lub `userData.decks.includes(deckId)`

### Walidacja danych

- **validateUserData**: Trigger automatycznie waliduje dane użytkownika przy utworzeniu
- **Type checking**: Wszystkie funkcje sprawdzają typy parametrów (np. `typeof delta === "number"`)

### Firestore Rules

Upewnij się, że reguły Firestore są odpowiednio skonfigurowane w `firestore.rules`.

---

## Przykłady użycia

### Przykład 1: Przesłanie punktów i pobranie rankingu

```typescript
// 1. Pobierz aktualny sezon
const season = await getCurrentSeason();

// 2. Prześlij punkty
await submitPoints({
  userId: "user123",
  delta: 10
});

// 3. Pobierz ranking
const leaderboard = await getLeaderboard({
  userId: "user123",
  seasonId: season.seasonId
});

console.log(`Pozycja: ${leaderboard.entries.find(e => e.userId === "user123")?.position}`);
```

### Przykład 2: Utworzenie talii i dodanie kart

```typescript
const cards = [
  { front: "Hello", back: "Cześć", tags: ["greetings"] },
  { front: "Goodbye", back: "Do widzenia", tags: ["greetings"] }
];

const result = await createDeckWithCards({
  title: "Podstawowe zwroty",
  cards: cards,
  userId: "user123"
});

console.log(`Utworzono talię: ${result.deckId}`);
```

### Przykład 3: Aktualizacja postępu karty

```typescript
await updateCardProgress({
  userId: "user123",
  deckId: "deck456",
  cardId: "card789",
  grade: 4,           // Ocena 4/5
  difficulty: 2.3,    // Trudność FSRS
  interval: 5         // Interwał 5 dni
});

// Trigger calculateNextReview automatycznie obliczy nextReviewDate
```

### Przykład 4: Pobranie kart do nauki

```typescript
// Pobierz nowe karty do wprowadzenia
const newCards = await getNewDeckCards({
  deckId: "deck456",
  limit: 10
});

// Pobierz karty do powtórki
const dueCards = await getDueDeckCards({
  deckId: "deck456",
  limit: 20
});
```

### Przykład 5: Zarządzanie powiadomieniami

```typescript
// Pobierz powiadomienia
const notifications = await getNotifications({
  userId: "user123",
  limit: 20
});

// Oznacz jako przeczytane
if (notifications.notifications.length > 0) {
  await markNotificationRead({
    userId: "user123",
    notificationId: notifications.notifications[0].id
  });
}
```

---

## Rozwój

### Lokalne testowanie

```bash
cd functions
npm run build
npm run serve  # Uruchamia emulator Firebase
```

### Deploy

```bash
cd functions
npm run deploy  # Wdraża wszystkie funkcje
```

### Logi

```bash
firebase functions:log
```

---

## Wersja

Dokumentacja dla backendu Memvocado v1.0  
Data aktualizacji: 2024

---

## Wsparcie

W razie pytań lub problemów, sprawdź:
- Firebase Console → Functions → Logs
- Kod źródłowy w `functions/src/`
- Typy TypeScript w `functions/src/types/`



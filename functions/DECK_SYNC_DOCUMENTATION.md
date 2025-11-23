# Dokumentacja: System Deep Copy & Synchronizacji Kart

## Przegląd

System deep copy i synchronizacji kart zapewnia, że użytkownicy mogą kontynuować naukę nawet gdy autor decka zmienia lub usuwa karty. System działa w trybie "snapshot on first seen" - treść karty jest kopiowana do lokalnej przestrzeni użytkownika gdy użytkownik pierwszy raz widzi kartę.

## Architektura

### Struktura danych

#### Publiczny deck (oryginał)

```
decks/{deckId}
  - title: string
  - is_deleted?: boolean  // Soft delete flag
  - deletedAt?: Date
  - ...

decks/{deckId}/cards/{cardId}
  - front: string
  - back: string
  - tags: string[]
  - ...
```

#### Lokalna kopia użytkownika

```
users/{userId}/decks/{deckId}
  - id: string
  - sourceDeckId?: string  // Referencja do oryginalnego decka
  - ...

users/{userId}/decks/{deckId}/cards/{cardId}
  - front: string           // Treść karty (deep copy)
  - back: string
  - tags: string[]
  - contentVersion: number  // Timestamp kopiowania treści
  - sourceDeckId: string
  - cardAlgo: {...}         // Progress nauki
  - firstLearn: {...}
  - grade: number
  - difficulty: number
  - ...
```

## Proces Deep Copy

### Kiedy następuje kopiowanie?

1. **Przy pierwszym zapisie progress** (`updateCardProgress`):

   - Gdy użytkownik pierwszy raz widzi kartę i zapisuje progress
   - System automatycznie kopiuje treść (front, back, tags) z oryginalnego decka
   - Zapisuje `contentVersion` (timestamp) i `sourceDeckId`

2. **Przy pierwszym zapisie firstLearn** (`useCardLogic.ts`):
   - Gdy użytkownik rozpoczyna naukę karty (firstLearn.isNew = true)
   - Frontend kopiuje treść z `cardData` do lokalnej kopii

### Zalety Deep Copy

- ✅ Użytkownik nie traci progressu gdy autor usuwa kartę
- ✅ Treść jest zawsze dostępna (offline-friendly)
- ✅ Lazy loading - kopiowanie tylko dla widzianych kart
- ✅ Niskie koszty - tylko widziane karty są kopiowane

## Wykrywanie zmian

### Funkcja: `checkCardChanges`

Porównuje treść oryginalnego decka z lokalnymi kopiami użytkownika.

**Typy zmian:**

- `modified`: Treść karty została zmieniona (front, back, tags)
- `deleted`: Karta została usunięta z oryginalnego decka
- `new`: Nowa karta została dodana do oryginalnego decka

**Przykład użycia:**

```typescript
const result = await cloudFunctions.checkCardChanges(userId, deckId);
// result.changes = [
//   {
//     cardId: "abc123",
//     type: "modified",
//     changes: [
//       { field: "front", oldValue: "Stare", newValue: "Nowe" },
//       { field: "back", oldValue: "Old", newValue: "New" }
//     ]
//   },
//   {
//     cardId: "xyz789",
//     type: "deleted"
//   }
// ]
```

## Synchronizacja

### Funkcja: `syncDeckCards`

Synchronizuje lokalne kopie z oryginalnym deckiem.

**Opcje:**

- `syncAll: true` - synchronizuje wszystkie zmiany
- `syncAll: false, cardIds: [...]` - synchronizuje tylko wybrane karty

**Proces synchronizacji:**

1. Pobiera wszystkie karty z oryginalnego decka
2. Aktualizuje treść lokalnych kopii (front, back, tags)
3. Aktualizuje `contentVersion` na aktualny timestamp
4. Dodaje nowe karty (jeśli `syncAll = true`)
5. Zachowuje lokalne kopie kart usuniętych z oryginału

**Przykład użycia:**

```typescript
// Synchronizuj wszystkie
await cloudFunctions.syncDeckCards(userId, deckId, true);

// Synchronizuj wybrane karty
await cloudFunctions.syncDeckCards(userId, deckId, false, [
  "cardId1",
  "cardId2",
]);
```

## Soft Delete Decków

### Funkcja: `deleteDeck`

Oznacza deck jako usunięty (soft delete) zamiast faktycznego usunięcia.

**Proces:**

1. Ustawia `is_deleted: true` w `decks/{deckId}`
2. Ustawia `deletedAt: serverTimestamp()`
3. Znajduje wszystkich użytkowników uczących się decka (collection group query)
4. Wysyła powiadomienia do wszystkich użytkowników

**Powiadomienie:**

```
"Deck '{title}' został usunięty przez autora. Możesz kontynuować naukę w swojej bibliotece."
```

**Użytkownicy mogą:**

- Kontynuować naukę z lokalnych kopii
- Widzieć karty które zostały usunięte z oryginału
- Nie widzieć decka w wyszukiwaniu (filtrowane przez `is_deleted: false`)

### Filtrowanie w wyszukiwaniu

Wszystkie funkcje wyszukiwania filtrują usunięte decki:

- `searchDecks` - filtruje `is_deleted !== true`
- `getPopularDecks` - filtruje `is_deleted == false`
- `getDeckDetails` - zwraca błąd jeśli `is_deleted == true`

## `joinCardsWithProgress`

Helper funkcja która łączy treść z oryginalnego decka z progressem użytkownika.

**Logika:**

1. Pobiera karty z oryginalnego decka
2. Pobiera lokalne kopie użytkownika
3. Dla każdej karty z oryginału:
   - Używa treści z oryginału (zawsze aktualna)
   - Używa progressu z lokalnej kopii
   - Oznacza `hasChanges: true` jeśli treść różni się od lokalnej kopii
4. Dodaje karty które istnieją tylko lokalnie (usunięte z oryginału):
   - Używa treści z lokalnej kopii
   - Oznacza `isDeletedFromSource: true`

**Flagi w odpowiedzi:**

- `hasChanges`: Treść karty różni się od lokalnej kopii
- `isDeletedFromSource`: Karta istnieje tylko w lokalnej kopii (usunięta z oryginału)

## UI Synchronizacji

### Modal synchronizacji

W `deckDetails.tsx`:

- Automatycznie sprawdza zmiany przy załadowaniu ekranu
- Wyświetla modal z listą zmian
- Przyciski:
  - "Zignoruj" - zamyka modal
  - "Synchronizuj wszystkie" - synchronizuje wszystkie zmiany

### Rozszerzenia możliwe w przyszłości:

- Preview diff (stara vs nowa treść)
- Wybór pojedynczych kart do synchronizacji
- Historia zmian
- Automatyczna synchronizacja w tle

## Firestore Indexy

### Wymagany indeks dla collection group query

Dla `deleteDeck` (znajdowanie użytkowników uczących się decka):

```
Collection: users/{userId}/decks
Field: id
Query: collectionGroup("decks").where("id", "==", deckId)
```

**Konfiguracja w `firestore.indexes.json`:**

```json
{
  "indexes": [
    {
      "collectionGroup": "decks",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {
          "fieldPath": "id",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

## Przykłady użycia API

### Sprawdzenie zmian przed nauką

```typescript
// W deckDetails.tsx
const changes = await cloudFunctions.checkCardChanges(userId, deckId);
if (changes.changes.length > 0) {
  // Wyświetl powiadomienie o zmianach
  showSyncModal(changes.changes);
}
```

### Synchronizacja po wykryciu zmian

```typescript
// Użytkownik wybiera synchronizację
await cloudFunctions.syncDeckCards(userId, deckId, true);
// Odśwież dane
await fetchDeck();
```

### Usunięcie decka przez autora

```typescript
// Tylko autor może usunąć
const result = await cloudFunctions.deleteDeck(deckId);
// result.notifiedUsers - liczba powiadomionych użytkowników
```

## Pola w dokumentach

### `users/{userId}/decks/{deckId}/cards/{cardId}`

| Pole                 | Typ      | Opis                           |
| -------------------- | -------- | ------------------------------ |
| `front`              | string   | Treść frontu karty (deep copy) |
| `back`               | string   | Treść tyłu karty (deep copy)   |
| `tags`               | string[] | Tagi karty (deep copy)         |
| `contentVersion`     | number   | Timestamp kopiowania treści    |
| `sourceDeckId`       | string   | ID oryginalnego decka          |
| `cardAlgo`           | object   | Progress FSRS algorytmu        |
| `firstLearn`         | object   | Progress pierwszej nauki       |
| `grade`              | number   | Ostatnia ocena                 |
| `difficulty`         | number   | Trudność karty                 |
| `nextReviewInterval` | number   | Następny interwał powtórki     |

### `decks/{deckId}`

| Pole         | Typ     | Opis              |
| ------------ | ------- | ----------------- |
| `is_deleted` | boolean | Flaga soft delete |
| `deletedAt`  | Date    | Data usunięcia    |

## Bezpieczeństwo

- Tylko autor może usunąć deck (`deleteDeck` sprawdza `createdBy`)
- Użytkownicy mogą tylko czytać i modyfikować swoje lokalne kopie
- Progress jest zawsze zapisywany w lokalnej kopii użytkownika
- Treść oryginalnego decka jest tylko do odczytu dla użytkowników

## Koszty i optymalizacja

### Koszty Firestore

**Deep Copy (przy pierwszym widzeniu):**

- 1 write na kartę (treść + progress)
- ~$0.0000018 per write
- Dla 1000 kart: ~$0.0018 (tylko widziane karty)

**Synchronizacja:**

- 1 write na zmienioną kartę
- Batch operations dla optymalizacji (max 500 operacji)

**Collection Group Query:**

- 1 read na użytkownika uczącego się decka
- Używane tylko przy usuwaniu decka

### Optymalizacje

1. **Lazy Copying**: Kopiowanie tylko widzianych kart
2. **Batch Operations**: Grupowanie zapisów (max 500)
3. **In-memory Filtering**: Filtrowanie `is_deleted` w pamięci gdy potrzebne
4. **Caching**: Lokalne kopie są cachowane w Firestore

## Przyszłe rozszerzenia

1. **Automatyczna synchronizacja**: W tle, gdy użytkownik otwiera deck
2. **Historia zmian**: Trackowanie wszystkich zmian w decku
3. **Diff preview**: Wizualne porównanie starych i nowych wersji
4. **Selective sync**: Wybór konkretnych pól do synchronizacji
5. **Conflict resolution**: Rozwiązywanie konfliktów gdy użytkownik zmodyfikował lokalną kopię

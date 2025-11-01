# 🧪 Memvocado Card Flow - Testy

Ten katalog zawiera kompleksowe testy dla systemu nauki kart w aplikacji Memvocado.

## 📁 Struktura testów

```
__tests__/
├── index.test.tsx              # Główny plik testowy
├── useCardLogic.test.tsx       # Testy podstawowej logiki
├── firstLearning.test.tsx      # Testy fazy First Learning
├── fsrsAlgorithm.test.tsx      # Testy algorytmu FSRS
├── cardTransitions.test.tsx    # Testy przejść między stanami
├── sessionManagement.test.tsx  # Testy zarządzania sesją
├── errorHandling.test.tsx      # Testy obsługi błędów
└── README.md                   # Ten plik
```

## 🚀 Uruchamianie testów

```bash
# Uruchom wszystkie testy
npm test

# Uruchom testy w trybie watch
npm run test:watch

# Uruchom testy z pokryciem kodu
npm run test:coverage
```

## 📋 Pokrycie testów

### 1. **useCardLogic Hook** (`useCardLogic.test.tsx`)

- ✅ Inicjalizacja hooka
- ✅ Obsługa błędów podczas ładowania
- ✅ Funkcje pomocnicze
- ✅ Aktualizacja stanu kart
- ✅ Zarządzanie tooltip i progress

### 2. **First Learning Phase** (`firstLearning.test.tsx`)

- ✅ Pierwsza odpowiedź "Good" (10 min cooldown)
- ✅ Druga odpowiedź "Good" (graduacja do FSRS)
- ✅ Odpowiedzi "Hard" (5 min cooldown, reset consecutiveGood)
- ✅ Odpowiedzi "Wrong" (1 min cooldown, reset consecutiveGood)
- ✅ Aktualizacja progress
- ✅ Obsługa błędów

### 3. **FSRS Algorithm** (`fsrsAlgorithm.test.tsx`)

- ✅ Odpowiedzi "Good" (normalny FSRS)
- ✅ Odpowiedzi "Easy" (FSRS z wyższym intervalem)
- ✅ Odpowiedzi "Hard" (FSRS z niższym intervalem)
- ✅ Odpowiedzi "Wrong" (FSRS + 10 min cooldown)
- ✅ Aktualizacja progress
- ✅ Obsługa błędów

### 4. **Card Transitions** (`cardTransitions.test.tsx`)

- ✅ Przejście First Learning → FSRS
- ✅ Przejście FSRS → doneCards
- ✅ Zachowanie danych podczas przejść
- ✅ Aktualizacja progress podczas przejść
- ✅ Obsługa błędów

### 5. **Session Management** (`sessionManagement.test.tsx`)

- ✅ Ładowanie sesji z ustawieniami
- ✅ Sortowanie kart według due date
- ✅ Priorytetyzacja kart już widzianych
- ✅ Zarządzanie seenInSession
- ✅ Aktualizacja progress w sesji
- ✅ Zarządzanie doneCards
- ✅ Obsługa błędów

### 6. **Error Handling** (`errorHandling.test.tsx`)

- ✅ Błędy podczas ładowania (deck, settings, cards)
- ✅ Błędy podczas przetwarzania kart
- ✅ Błędy podczas aktualizacji
- ✅ Czyszczenie błędów
- ✅ Błędy sieciowe i timeout
- ✅ Błędy walidacji

## 🔧 Konfiguracja testów

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.(ts|tsx|js)", "**/*.(test|spec).(ts|tsx|js)"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-reanimated|...)/)",
  ],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "services/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  testEnvironment: "jsdom",
};
```

### Setup File (`jest.setup.js`)

- Mock dla react-native-reanimated
- Mock dla expo-router
- Mock dla Firebase
- Mock dla cloud functions
- Mock dla UserContext
- Globalne utilities testowe

## 📊 Metryki testów

### Pokrycie kodu

- **Cel**: > 80% pokrycia kodu
- **Krytyczne funkcje**: 100% pokrycia
- **Edge cases**: Pełne pokrycie

### Typy testów

- **Unit tests**: Logika biznesowa
- **Integration tests**: Interakcje między komponentami
- **Error boundary tests**: Obsługa błędów
- **Edge case tests**: Skrajne przypadki

## 🎯 Scenariusze testowe

### 1. **Nowa karta - Pełny cykl**

```
1. Karta pojawia się (isNew: true)
2. Użytkownik odpowiada "Good" → 10 min cooldown
3. Karta wraca po 10 minutach
4. Użytkownik odpowiada "Good" → Graduacja do FSRS
5. Karta jest teraz zarządzana przez FSRS
```

### 2. **Karta FSRS - Różne odpowiedzi**

```
1. Karta pojawia się (FSRS due)
2. "Good" → Normalny FSRS interval
3. "Easy" → Dłuższy FSRS interval
4. "Hard" → Krótszy FSRS interval
5. "Wrong" → FSRS + 10 min cooldown
```

### 3. **Sesja nauki - Kompleksowy scenariusz**

```
1. Ładowanie sesji z ustawieniami użytkownika
2. Sortowanie kart według due date
3. Priorytetyzacja kart już widzianych
4. Przetwarzanie odpowiedzi
5. Aktualizacja progress
6. Przenoszenie ukończonych kart do doneCards
```

## 🐛 Debugowanie testów

### Częste problemy

1. **Mock nie działa**: Sprawdź czy mock jest w `jest.setup.js`
2. **Async/await**: Użyj `act()` dla aktualizacji stanu
3. **Timing issues**: Dodaj `setTimeout` dla async operacji
4. **Context issues**: Sprawdź czy TestWrapper jest poprawny

### Przydatne komendy

```bash
# Uruchom konkretny test
npm test -- --testNamePattern="First Learning"

# Uruchom test z verbose output
npm test -- --verbose

# Uruchom test z debug info
npm test -- --detectOpenHandles
```

## 📝 Dodawanie nowych testów

### 1. Stwórz nowy plik testowy

```typescript
// __tests__/newFeature.test.tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
// ... imports

describe("New Feature", () => {
  // ... testy
});
```

### 2. Dodaj do index.test.tsx

```typescript
import "./newFeature.test";
```

### 3. Uruchom testy

```bash
npm test
```

## 🎉 Podsumowanie

Te testy zapewniają:

- ✅ **Pełne pokrycie** logiki kart
- ✅ **Wszystkie scenariusze** użytkownika
- ✅ **Obsługę błędów** w każdym przypadku
- ✅ **Dokumentację** zachowania systemu
- ✅ **Regresję** - zapobieganie błędom w przyszłości

Testy są zaprojektowane tak, aby były:

- **Szybkie** - uruchamiają się w < 30 sekund
- **Niezawodne** - nie flakują
- **Czytelne** - łatwe do zrozumienia
- **Utrzymywalne** - łatwe do aktualizacji

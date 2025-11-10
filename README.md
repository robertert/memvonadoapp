# 🥑 Memvocado

**Memvocado** to nowoczesna aplikacja mobilna do nauki z fiszkami, wykorzystująca zaawansowany algorytm FSRS (Free Spaced Repetition Scheduler) do optymalizacji procesu zapamiętywania. Aplikacja łączy w sobie elementy gamifikacji, system rankingów i lig oraz społecznościowe funkcje, które motywują do regularnej nauki.


---

## 📋 Spis treści

- [Funkcjonalności](#-funkcjonalności)
- [Technologie](#-technologie)
- [Architektura](#-architektura)
- [Instalacja i uruchomienie](#-instalacja-i-uruchomienie)
- [Struktura projektu](#-struktura-projektu)
- [Kluczowe komponenty](#-kluczowe-komponenty)
- [Algorytm nauki](#-algorytm-nauki)
- [Backend](#-backend)
- [Testy](#-testy)
- [Deployment](#-deployment)
- [Dokumentacja](#-dokumentacja)

---

## ✨ Funkcjonalności

### 📚 System nauki z fiszkami

- **Algorytm FSRS**: Zaawansowany algorytm powtarzania z odstępami (spaced repetition) dla optymalnej nauki
- **Faza pierwszego uczenia**: Stopniowe wprowadzanie nowych kart przed przejściem do pełnego algorytmu FSRS
- **Inteligentne sesje**: Automatyczne dobieranie kart do nauki na podstawie daty powtórki i postępu
- **Animacje i gesty**: Płynne animacje i gesty przesuwania dla lepszego UX
- **Wielojęzyczność**: Obsługa wielu języków w interfejsie

### 🏆 System rankingów i lig

- **15 poziomów lig**: Od podstawowej ligi do Diamentowej Ligi
- **Tygodniowe sezony**: System rankingów resetowany co tydzień
- **Grupy ligowe**: Użytkownicy przypisani do 20-osobowych grup w swojej lidze
- **Tabela liderów**: Globalne i lokalne rankingi

### 👥 Funkcje społecznościowe

- **System znajomych**: Dodawanie znajomych, śledzenie ich postępów
- **Seria aktywności (Streak)**: Śledzenie codziennej aktywności
- **Statystyki**: Szczegółowe statystyki nauki, heatmapa aktywności
- **Udostępnianie talii**: Publiczne i prywatne talie do nauki

### 🎨 Interfejs użytkownika

- **Nowoczesny design**: Intuicyjny i przyjazny interfejs
- **Ciemny/jasny motyw**: Obsługa motywów
- **Animacje**: Płynne przejścia i animacje
- **Responsywność**: Optymalizacja dla różnych rozmiarów ekranów

### 🔔 Powiadomienia

- **Powiadomienia push**: Przypomnienia o nauce
- **Powiadomienia systemowe**: Awans w lidze, przerwana seria, zakończenie sezonu

---

## 🛠 Technologie

### Frontend

- **React Native** (v0.81.5) - Framework do aplikacji mobilnych
- **Expo** (v54.0.20) - Narzędzia i SDK dla React Native
- **Expo Router** (v6.0.13) - Routing oparty na systemie plików
- **TypeScript** (v5.9.2) - Typowanie statyczne
- **React Native Reanimated** (v4.1.1) - Zaawansowane animacje
- **React Native Gesture Handler** (v2.28.0) - Obsługa gestów
- **ts-fsrs** (v3.5.7) - Implementacja algorytmu FSRS

### Backend

- **Firebase Cloud Functions** (v6.0.1) - Serwerless backend
- **Cloud Firestore** - Baza danych NoSQL
- **Firebase Authentication** - Autentykacja użytkowników
- **Firebase Storage** - Przechowywanie plików
- **Firebase Analytics** - Analiza użycia
- **Node.js** (v20) - Runtime dla Cloud Functions

### Narzędzia deweloperskie

- **Jest** (v29.7.0) - Framework testowy
- **React Testing Library** (v12.4.2) - Testy komponentów
- **ESLint** - Linting kodu
- **TypeScript** - Kompilator TypeScript

### Platformy

- **iOS** - Aplikacja natywna (Swift)
- **Android** - Aplikacja natywna
- **Web** - Wersja webowa (opcjonalna)

---

## 🏗 Architektura

### Frontend (React Native)

```
app/
├── (auth)/          # Ekrany autentykacji
├── tabs/            # Główne zakładki (dashboard, search, create, profile, rankings)
├── stack/           # Ekrany nawigacji stosu (learn, deck details, settings)
└── _layout.tsx      # Główny layout aplikacji

store/               # Context API dla globalnego stanu
services/            # Serwisy komunikacji z backendem
constants/           # Stałe aplikacji
ui/                  # Komponenty UI
```

### Backend (Firebase Cloud Functions)

```
functions/src/
├── index.ts                 # Główny punkt eksportu
├── userFunctions.ts         # Funkcje użytkownika
├── deckFunctions.ts          # Zarządzanie taliami i kartami
├── learningFunctions.ts     # Funkcje nauki
├── rankingFunctions.ts      # System rankingów
├── leagueFunctions.ts       # System lig
├── notificationFunctions.ts # Powiadomienia
└── searchFunctions.ts       # Wyszukiwanie
```

### Baza danych (Firestore)

- `users/{userId}` - Dane użytkowników
- `decks/{deckId}` - Talie
- `decks/{deckId}/cards/{cardId}` - Karty
- `seasonUserPoints/{seasonId}/users/{userId}` - Punkty w sezonie
- `leagueGroups/{seasonId}/{league}/groups/{groupId}` - Grupy ligowe
- `users/{userId}/notifications/{notificationId}` - Powiadomienia

---

## 🚀 Instalacja i uruchomienie

### Wymagania wstępne

- Node.js (v20 lub nowszy)
- npm lub yarn
- Expo CLI
- Firebase CLI (dla backendu)
- iOS Simulator (dla macOS) lub Android Emulator

### Instalacja

1. **Sklonuj repozytorium**

```bash
git clone <repository-url>
cd Memvocado
```

2. **Zainstaluj zależności**

```bash
npm install
cd functions && npm install && cd ..
```

3. **Skonfiguruj zmienne środowiskowe**
   Utwórz plik `.env` w głównym katalogu:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. **Uruchom aplikację**

```bash
# Frontend
npm start

# Backend (w osobnym terminalu)
npm run functions:serve
```

### Dostępne skrypty

```bash
# Frontend
npm start              # Uruchom Expo dev server
npm run ios            # Uruchom na iOS
npm run android        # Uruchom na Android
npm run web            # Uruchom wersję webową
npm test               # Uruchom testy
npm run type-check     # Sprawdź typy TypeScript

# Backend
npm run functions:serve    # Uruchom emulator Firebase
npm run functions:build    # Skompiluj TypeScript
npm run functions:deploy   # Wdróż funkcje do Firebase
```

---

## 📁 Struktura projektu

```
Memvocado/
├── app/                      # Główna aplikacja (Expo Router)
│   ├── (auth)/              # Ekrany logowania/rejestracji
│   ├── tabs/                # Zakładki główne
│   ├── stack/               # Ekrany nawigacji
│   └── _layout.tsx          # Layout główny
│
├── functions/               # Firebase Cloud Functions
│   ├── src/                # Kod źródłowy funkcji
│   ├── lib/                # Skompilowany kod
│   └── __tests__/          # Testy funkcji
│
├── store/                   # Globalny stan (Context API)
│   ├── user-context.tsx    # Kontekst użytkownika
│   └── settings-context.tsx # Kontekst ustawień
│
├── services/                # Serwisy
│   └── cloudFunctions.ts   # Klient Firebase Functions
│
├── constants/              # Stałe aplikacji
│   ├── colors.ts          # Kolory
│   ├── flags.ts            # Flagi funkcjonalności
│   └── placeholderData.ts  # Dane testowe
│
├── ui/                     # Komponenty UI
│   ├── Header.tsx
│   ├── CustomPieChart.tsx
│   └── ContributionHeatmap.tsx
│
├── __tests__/              # Testy frontendu
├── assets/                 # Zasoby (obrazy, fonty)
└── ios/                    # Konfiguracja iOS
```

---

## 🔑 Kluczowe komponenty

### System nauki

- **`learnScreen.tsx`** - Główny ekran nauki z fiszkami
- **`useCardLogic.ts`** - Logika zarządzania kartami w sesji
- **`useAnimations.ts`** - Animacje kart
- **`useGestures.ts`** - Obsługa gestów przesuwania
- **`Flashcard.tsx`** - Komponent karty fiszki

### Zarządzanie taliami

- **`deckDetails.tsx`** - Szczegóły talii
- **`createScreen.tsx`** - Tworzenie nowej talii
- **`fileImportScreen.tsx`** - Import talii z pliku

### System rankingów

- **`rankingsScreen.tsx`** - Ekran rankingów
- **`leagueScreen.tsx`** - Szczegóły ligi
- **`dashboardScreen.tsx`** - Dashboard z statystykami

---

## 🧠 Algorytm nauki

Memvocado wykorzystuje **FSRS (Free Spaced Repetition Scheduler)**, jeden z najnowocześniejszych algorytmów powtarzania z odstępami.

### Faza pierwszego uczenia (First Learning)

Nowe karty przechodzą przez fazę wprowadzającą:

- **Dwie kolejne dobre odpowiedzi** → karta przechodzi do algorytmu FSRS
- **Krótkie przerwy**: 10 min (dobra odpowiedź), 5 min (trudna), 1 min (błędna)

### Algorytm FSRS

Po przejściu pierwszej fazy, karta jest zarządzana przez FSRS:

- **Dostosowuje interwały** na podstawie historii odpowiedzi
- **Uczy się trudności** każdej karty
- **Optymalizuje czas powtórki** dla maksymalnej efektywności

### Parametry FSRS

```typescript
w: [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
];
```

Więcej szczegółów w [CARD_FLOW_DOCUMENTATION.md](./CARD_FLOW_DOCUMENTATION.md)

---

## 🔧 Backend

Backend Memvocado jest zbudowany na **Firebase Cloud Functions** i zapewnia:

### Główne funkcje

- **Zarządzanie użytkownikami**: Autentykacja, profil, statystyki
- **Zarządzanie taliami**: Tworzenie, edycja, wyszukiwanie talii
- **System nauki**: Aktualizacja postępu kart, algorytm FSRS
- **System rankingów**: Punkty, ligi, grupy, sezony
- **Powiadomienia**: Tworzenie i zarządzanie powiadomieniami
- **Wyszukiwanie**: Zaawansowane wyszukiwanie talii z filtrami

### Region

Funkcje są wdrożone w regionie **europe-west1** dla optymalnej wydajności w Europie.

### Dokumentacja

Szczegółowa dokumentacja backendu znajduje się w [functions/BACKEND_DOCUMENTATION.md](./functions/BACKEND_DOCUMENTATION.md)

---

## 🧪 Testy

Projekt zawiera testy jednostkowe i integracyjne:

### Frontend

```bash
npm test                    # Uruchom wszystkie testy
npm run test:watch          # Tryb watch
npm run test:coverage       # Raport pokrycia
```

### Backend

```bash
cd functions
npm test                    # Uruchom testy funkcji
npm run test:watch          # Tryb watch
npm run test:coverage       # Raport pokrycia
```

### Testowane obszary

- Logika kart (FSRS, first learning)
- Przejścia między kartami
- Obsługa błędów
- Zarządzanie sesjami
- Funkcje backendu

---

## 📦 Deployment

### Frontend (Expo)

```bash
# Build dla iOS
eas build --platform ios

# Build dla Android
eas build --platform android

# Deploy do Expo
eas update
```

### Backend (Firebase)

```bash
cd functions
npm run deploy
```

Szczegółowe instrukcje w [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📚 Dokumentacja

### Główne dokumenty

- **[CARD_FLOW_DOCUMENTATION.md](./CARD_FLOW_DOCUMENTATION.md)** - Dokumentacja przepływu kart i algorytmu nauki
- **[functions/BACKEND_DOCUMENTATION.md](./functions/BACKEND_DOCUMENTATION.md)** - Dokumentacja backendu i API
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Instrukcje deploymentu
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Przewodnik migracji
- **[TYPESCRIPT_MIGRATION.md](./TYPESCRIPT_MIGRATION.md)** - Migracja do TypeScript

### Testy

- **[**tests**/README.md](./__tests__/README.md)** - Dokumentacja testów frontendu
- **[functions/**tests**/README.md](./functions/__tests__/README.md)** - Dokumentacja testów backendu

---

## 🎯 Kluczowe funkcjonalności

### System lig (15 poziomów)

1-10. **Podstawowe ligi** (szare → różowe) 11. **Brązowa Liga** (#CD7F32) 12. **Srebrna Liga** (#C0C0C0) 13. **Złota Liga** (#FFD700) 14. **Platynowa Liga** (#6A5ACD) 15. **Diamentowa Liga** (#00BFFF)

### Tygodniowe sezony

- Sezony rozpoczynają się w poniedziałek 00:00 UTC
- Trwają 7 dni
- Automatyczny rollover i snapshot tabeli liderów

### System grup

- Użytkownicy przypisywani do 20-osobowych grup w swojej lidze
- Rankingi pokazują pozycję w grupie
- Automatyczne przypisywanie do nowych grup przy awansie

---

## 🔐 Bezpieczeństwo

- **Autentykacja**: Firebase Authentication
- **Reguły Firestore**: Kontrola dostępu do danych
- **Walidacja**: Walidacja danych po stronie serwera
- **Autoryzacja**: Sprawdzanie uprawnień w Cloud Functions

---

## 🤝 Wsparcie

W razie pytań lub problemów:

- Sprawdź dokumentację w folderze `docs/`
- Zobacz logi Firebase Functions
- Sprawdź kod źródłowy w odpowiednich modułach

---

## 📄 Licencja

Projekt prywatny - wszystkie prawa zastrzeżone.

---

## 🚧 Status projektu

Projekt jest w aktywnej fazie rozwoju. Funkcjonalności są regularnie dodawane i ulepszane.

---

**Memvocado** - Nauka z fiszkami, która działa! 🥑✨

# Memvocado

**Memvocado** is a cross-platform mobile flashcard learning app built with React Native and Expo. It uses the FSRS (Free Spaced Repetition Scheduler) algorithm to optimize memorization, and combines gamification (an avocado mascot growth system, leagues, streaks), social features (following, leaderboards), and AI-powered tools (OCR scanning, document processing, in-context AI tutor) to keep learners engaged.


<link href="./FEATURES.md">More in FEATURES.md </link>

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54 | Build tooling, native APIs, OTA updates |
| Expo Router | 6 | File-based routing (tabs + stack) |
| TypeScript | 5.9 | Static type safety |
| React Native Reanimated | 4.1 | Gesture-driven animations |
| React Native Gesture Handler | 2.28 | Touch and swipe gestures |
| ts-fsrs | 3.5.7 | FSRS spaced repetition algorithm |
| Zod | 3.23 | Runtime schema validation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Firebase Cloud Functions | 6.0 | Serverless API (Node 20, `europe-west1`) |
| Cloud Firestore | - | NoSQL document database |
| Firebase Authentication | - | Google & Apple Sign-In |
| Firebase Storage | - | User uploads, photos, Anki files |
| Google Cloud Vertex AI (Gemini) | - | AI file processing & AVO Helper tutor |
| Google Cloud Translation API | - | Multi-language translation |
| ML Kit Text Recognition | - | On-device OCR |

### Supporting Libraries (Backend)

`pdf-parse`, `mammoth` (DOCX), `xlsx`, `better-sqlite3` + `adm-zip` (Anki `.apkg` import), `pdf-lib`

### Platforms

- **iOS** (primary) -- requires Xcode for native builds
- **Android** -- requires Android SDK
- **Web** -- experimental (`expo start --web`)

---

## Prerequisites

- **Node.js** v20+
- **npm** (ships with Node)
- **Expo CLI** -- `npx expo` (no global install required)
- **Firebase CLI** -- `npm install -g firebase-tools` (for backend work)
- **EAS CLI** -- `npm install -g eas-cli` (for native builds)
- **Xcode** (macOS, for iOS simulator) or **Android Studio** (for Android emulator)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd Memvocado
```

### 2. Install dependencies

```bash
# Frontend dependencies
npm install

# Shared types package
cd types && npm install && npm run build && cd ..

# Backend (Cloud Functions) dependencies
cd functions && npm install && cd ..
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Firebase
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Sign-In OAuth Client IDs
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

### 4. Run the app

```bash
# Start Expo dev server
npm start

# Or target a specific platform
npm run ios
npm run android
npm run web
```

### 5. Run the backend locally (optional)

```bash
npm run functions:serve
```

This starts the Firebase emulator suite (Firestore, Functions) on `localhost`.

---

## Scripts

### Frontend (`package.json`)

| Script | Description |
|---|---|
| `npm start` | Start Expo development server |
| `npm run ios` | Build and run on iOS simulator |
| `npm run android` | Build and run on Android emulator |
| `npm run web` | Start web version |
| `npm run type-check` | Run TypeScript compiler checks (`tsc --noEmit`) |
| `npm test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |

### Backend (`functions/package.json`)

| Script | Description |
|---|---|
| `npm run functions:serve` | Build and start Firebase emulators |
| `npm run functions:build` | Compile TypeScript to JavaScript |
| `npm run functions:deploy` | Deploy Cloud Functions to Firebase |

### Shared Types (`types/package.json`)

| Script | Description |
|---|---|
| `npm run prepare` | Build shared type definitions |

---

## Project Structure

```
Memvocado/
├── app/                          # Screens (Expo Router, file-based)
│   ├── (auth)/                   #   Login, onboarding, password reset
│   ├── tabs/                     #   Bottom-tab screens (dashboard, search, create, rankings, profile)
│   ├── stack/                    #   Stack screens (learn, deck details, settings, OCR, import, etc.)
│   ├── _layout.tsx               #   Root layout (auth guard, providers, splash)
│   └── index.tsx                 #   Entry redirect
│
├── components/                   # Reusable UI components
│   ├── learnScreen/              #   Flashcard, ProgressBar, BottomSheet, Confetti, etc.
│   ├── avocado/                  #   AvocadoGrowthWidget, HarvestModal, AvocadoImage
│   ├── avoHelper/                #   AvoFAB, AvoHelperOverlay, AvoBubble, TypingDots
│   ├── quickAdd/                 #   QuickAddModal, DeckSelector
│   ├── profileScreen/            #   ContributionHeatmap
│   └── ...                       #   Header, Divider, PieChart, StreakLostModal, etc.
│
├── hooks/                        # Custom React hooks
│   ├── learnScreen/              #   useCardLogic, useAnimations, useGestures, useAllInOneCardLogic
│   ├── useAvoHelper.ts           #   AI tutor helper hook
│   ├── useTranslation.ts         #   Translation hook with rate limiting
│   ├── useDeepLink.ts            #   Deep link & Quick Add handler
│   └── useDeckDraft.ts           #   Draft persistence for deck creation
│
├── store/                        # Global state (React Context)
│   ├── user-context.tsx          #   Auth state, user ID, admin flag
│   ├── settings-context.tsx      #   App settings (language, AVO language)
│   └── quickAdd-context.tsx      #   Quick Add modal state
│
├── services/
│   └── cloudFunctions.ts         # Typed Firebase Cloud Functions client (60+ endpoints)
│
├── constants/                    # App constants
│   ├── colors.ts                 #   Theme colors & fonts
│   ├── settings.ts               #   Category options, learning pace, languages
│   ├── avocado.ts                #   Avocado phase config, skin pool, rarity colors
│   ├── flags.ts                  #   Feature flags (placeholder/demo mode)
│   ├── dailyStats.ts             #   Daily progress calculation
│   └── placeholderData.ts        #   Demo/placeholder data
│
├── utils/                        # Utility functions
│   ├── soundTrigger.ts           #   Audio playback (combo, click sounds)
│   ├── likedDecksCache.ts        #   Local AsyncStorage cache for liked decks
│   ├── date.ts                   #   Date formatting helpers
│   ├── allInOneProgress.ts       #   All-in-One mode progress tracking
│   └── editedCardStore.ts        #   Temporary card edit state
│
├── types/                        # Shared TypeScript types & Zod schemas (npm package)
│   └── schemas/                  #   API request/response schemas, entity schemas
│
├── functions/                    # Firebase Cloud Functions (backend)
│   └── src/
│       ├── index.ts              #   Function exports
│       ├── userFunctions.ts      #   User management, streaks, settings, profiles
│       ├── deckFunctions.ts      #   Deck CRUD, card management, sync, likes
│       ├── searchFunctions.ts    #   Deck search with filters
│       ├── rankingFunctions.ts   #   Leaderboards, points, rankings
│       ├── leagueFunctions.ts    #   League system, groups, seasons
│       ├── avocadoFunctions.ts   #   Avocado growth, harvest, gacha
│       ├── avoHelperFunctions.ts #   AI tutor (Vertex AI / Gemini)
│       ├── translationFunctions.ts # Google Cloud Translation
│       ├── ocrFunctions.ts       #   Gemini Vision OCR
│       ├── processFileFunctions.ts # AI document → flashcard extraction
│       ├── scanningFunctions.ts  #   Document scanning pipeline
│       ├── ankiConverter.ts      #   Anki .apkg → Memvocado converter
│       ├── notificationFunctions.ts # In-app notifications
│       ├── authHandlers.ts       #   Onboarding, username check
│       ├── placeholderFunctions.ts # Demo data seeding
│       └── superMemo2.ts         #   SM-2 algorithm (legacy/fallback)
│
├── firebase.ts                   # Firebase SDK initialization
├── app.config.js                 # Expo configuration (env vars, plugins, scheme)
├── tsconfig.json                 # TypeScript configuration
├── babel.config.js               # Babel configuration (module resolver)
├── metro.config.js               # Metro bundler configuration
├── eas.json                      # EAS Build profiles
├── firebase.json                 # Firebase project configuration
├── firestore.rules               # Firestore security rules
└── firestore.indexes.json        # Firestore composite indexes
```

---

## Configuration

### Environment Variables

All Firebase and OAuth credentials are loaded from `.env` via `dotenv/config` in `app.config.js` and exposed through `expo-constants`:

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Cloud Messaging sender ID |
| `FIREBASE_APP_ID` | Yes | Firebase app ID |
| `FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics measurement ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Yes | Google OAuth iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Yes | Google OAuth Android client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Yes | Google OAuth Web client ID |

### Deep Linking

The app registers the `memvocado://` URL scheme for deep links and Quick Add functionality.

### Deployment

```bash
# Native builds via EAS
eas build --platform ios
eas build --platform android

# OTA updates
eas update

# Backend deployment
npm run functions:deploy
```

---

## License

Private project -- all rights reserved.

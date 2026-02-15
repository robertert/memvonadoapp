# Memvocado -- Features

## Business Overview

### Problem

Students and lifelong learners struggle with retention. Traditional flashcard apps are either too basic (no scheduling algorithm), too complex (Anki's steep learning curve), or too boring (no motivation loop). Users start strong but abandon the habit within days because there is no emotional payoff for consistency.

### Solution

Memvocado is a mobile-first flashcard app that pairs a scientifically-backed spaced repetition algorithm (FSRS) with a rich gamification layer -- a growing avocado mascot, collectible skins, streak tracking, and competitive leagues. It lowers the barrier to creating cards by supporting OCR camera scanning, AI-powered document processing, Anki import, and an in-context AI tutor. The result is a learning tool that is effective *and* engaging enough to sustain a daily habit.

### Target Audience

- Language learners (primary: Polish users learning English, Spanish, German, French)
- University and medical students preparing for exams
- Self-learners studying any topic that benefits from active recall

---

## Key Features

### 1. Spaced Repetition Learning Engine

**Capability:** Two learning modes -- SRS (FSRS algorithm) and All-in-One -- with gesture-based card interactions, undo, and real-time daily progress tracking.

- **FSRS Algorithm** (`ts-fsrs`): State-of-the-art spaced repetition scheduler that adapts review intervals to each card's difficulty and the user's recall history.
- **First-Learning Phase**: New cards go through an introductory phase (two consecutive correct answers) before entering the full FSRS loop, preventing premature long intervals.
- **All-in-One Mode**: Alternative learning mode for users who prefer simpler, linear card review without SRS scheduling.
- **Gesture-Based Review**: Swipe right (Good), left (Wrong), up (Easy), down (Hard). Long-press to see full card text. Haptic feedback and sound effects on every interaction.
- **Undo**: Revert the last graded card to correct accidental swipes.
- **Session Progress**: Real-time progress bar showing cards completed vs. remaining (new + due + in-progress).

**Business Value:** The FSRS algorithm is proven to reduce total review time by up to 30% compared to SM-2, meaning users learn more in less time. The gesture UX makes reviewing feel fluid rather than tedious.

---

### 2. Deck Creation & Import (5 Methods)

**Capability:** Users can build flashcard decks through five distinct channels, dramatically lowering the content creation barrier.

| Method | Description |
|---|---|
| **Manual** | Create cards one-by-one with front/back text fields via `createSelfScreen` |
| **OCR Camera Scan** | Point the camera at printed text; on-device ML Kit extracts text, which is then processed into cards via `ocrCameraScreen` |
| **AI File Processing** | Upload a PDF, DOCX, or XLSX file; Gemini AI extracts key concepts and generates flashcard pairs automatically via `processFileScreen` |
| **JSON Import** | Import a structured deck file (JSON format) via `fileImportScreen` |
| **Anki Import** | Upload an `.apkg` file; the backend decompresses, parses the SQLite database, and converts Anki notes into Memvocado cards via `ankiImportScreen` |

**Business Value:** Most flashcard apps only support manual entry, which is the #1 friction point. By supporting OCR, AI processing, and Anki import, Memvocado lets users go from "I have a textbook" to "I have a ready-to-study deck" in under a minute.

---

### 3. AVO Helper -- AI Tutor

**Capability:** An in-context AI assistant (powered by Vertex AI / Gemini) that appears as a floating avocado mascot during learning sessions.

- **Explain Answer**: Get a detailed explanation of why the card's answer is correct.
- **Mnemonic**: Generate a memory technique for the current card.
- **Use in Sentence**: See the word or concept used in a natural sentence.
- **Custom Question**: Ask any free-form question about the card content.
- **Mood Tracking**: The AVO mascot reacts to user performance (happy on correct streaks, sad on wrong answers).
- **Daily Query Limit**: Rate-limited to control AI costs.

**Business Value:** Transforms passive flashcard review into an active learning conversation. Users who don't understand a card no longer need to leave the app to search for explanations -- AVO provides instant context, improving comprehension and retention.

---

### 4. Translation Engine

**Capability:** Integrated Google Cloud Translation supporting 7 languages (English, Polish, German, Spanish, French, Italian, Portuguese) with a daily limit of 200 translations per user.

- Accessible during card creation and review.
- Rate-limited with real-time remaining count displayed to the user.

**Business Value:** Language learners can instantly translate unfamiliar words without switching apps, keeping them in the learning flow.

---

### 5. Avocado Growth System (Gamification Mascot)

**Capability:** A virtual avocado that grows over 7 consecutive days of study, progressing through 5 phases: Seed, Sprout, Tree, Fruit, Ripe.

- **Growth Phases**: Each day of study advances the avocado to the next phase. Missing a day resets growth.
- **Harvest & Gacha**: When the avocado is fully grown (Day 7), users harvest it and receive a random collectible skin via a weighted gacha system.
- **Collectible Skins**: 11 skins across 4 rarity tiers -- Common (Classic, Sport, Chef, Painter), Rare (Ninja, Sensei, Detective, Sleepy), Epic (Space, Robot), and Epic (King).
- **Collection Screen**: View all collected skins sorted by rarity on the profile.
- **Dashboard Widget**: The avocado's current growth phase is prominently displayed on the dashboard.

**Business Value:** The avocado creates an emotional attachment to the daily study habit. The 7-day cycle and collectible skins exploit the same psychological loop that makes games like Tamagotchi and gacha systems compelling -- users return daily to avoid "killing" their avocado and to complete their collection.

---

### 6. Streak & Daily Goals

**Capability:** Track consecutive days of study with configurable daily card targets.

- **Streak Counter**: Displayed on dashboard and during learning sessions.
- **Streak Lost Modal**: When a streak breaks, a modal informs the user of their lost streak count, creating emotional urgency to rebuild.
- **In-Session Combo Streak**: During a learning session, consecutive correct answers trigger animated fire icons, confetti, combo sounds, and haptic feedback.
- **Configurable Learning Pace**: Slow (5 cards/day), Normal (15), Turbo (30), or Custom.
- **Daily Stats**: Per-deck breakdown of new cards, due cards, in-progress, and completed.

**Business Value:** Streaks are the single most effective retention mechanic in consumer apps (proven by Duolingo, Snapchat). Combined with the avocado system, they create a double-layered daily motivation loop.

---

### 7. Deck Marketplace & Search

**Capability:** A public deck discovery system where users can search, browse by category, and start learning community-created decks.

- **Full-Text Search**: Search decks by title with debounced input.
- **Category Filtering**: English, Spanish, German, French, Math, Medicine, Biology, Physics, Art, History, Other.
- **Popular Decks**: Algorithmically surfaced trending decks.
- **Recent Searches**: Persisted search history for quick re-access.
- **Deck Details**: View count, card count, like count, author profile, creation date, and learning progress.
- **Like System**: Like/unlike decks with optimistic UI, haptic feedback, animated heart, and local caching.
- **Start Learning**: Copy a public deck into the user's personal library to begin studying with personal progress tracking.
- **Card Sync**: When the original author updates a deck, learners are prompted to sync changes (new, modified, or deleted cards).

**Business Value:** A marketplace effect -- every deck created by one user benefits all other users. This creates a content flywheel: more users = more decks = more value for new users.

---

### 8. Social Features & User Profiles

**Capability:** Follow other users, view their profiles, compare activity, and compete on leaderboards.

- **Follow/Unfollow**: Tap on any user's profile to follow them.
- **Public Profiles**: Username, avatar, followers/following count, stats (total decks, total cards, total reviews, current streak).
- **Activity Heatmap**: GitHub-style contribution chart showing study activity over the last 16 weeks.
- **Avocado Collection**: Profile section showcasing collected avocado skins.
- **Share Profile**: Native share sheet to share your profile externally.
- **User Search**: Search for users by username to find friends.

**Business Value:** Social features increase retention through accountability (friends can see if you stopped studying) and competition (comparing streaks and stats).

---

### 9. Leagues & Rankings (In Development)

**Capability:** A competitive league system with weekly seasons, 15 league tiers, and 20-person groups.

- **15 League Tiers**: From basic leagues up to Diamond League.
- **Weekly Seasons**: Rankings reset every Monday at 00:00 UTC.
- **20-Person Groups**: Users are placed into small groups within their league for manageable competition.
- **Leaderboard Views**: "My Group" (random group ranking) and "Following" (friends ranking).
- **Points System**: Earn points through study activity; top 3 in each group advance to the next league.
- **Server-Synced Timer**: Countdown to season end, synchronized with server time.

**Business Value:** League systems drive long-term retention by giving users a recurring weekly goal. Small group sizes ensure that every user has a realistic chance of advancing, maintaining motivation.

*Note: This feature is currently marked as "Work in progress" in the UI but the backend infrastructure is fully implemented.*

---

### 10. Quick Add

**Capability:** A globally accessible modal to quickly add a single card to any existing deck without navigating away from the current screen.

- **Sources**: Manual entry, OCR result, deep link (`memvocado://` scheme), or widget.
- **Deck Selector**: Choose the target deck from a searchable list.
- **Pre-filled Fields**: When triggered from OCR or deep links, the front/back fields are pre-populated.

**Business Value:** Reduces the friction of capturing a new piece of knowledge from "open app > navigate to deck > create card" to a single-tap modal, supporting the "capture everything" learning mindset.

---

### 11. Collaborative Deck Editing

**Capability:** Deck owners can invite other users as editors, enabling collaborative content creation.

- **Add/Remove Editors**: Search for users by username and grant or revoke editing permissions.
- **Editor Capabilities**: Editors can modify card content (front, back, tags) on source decks.
- **Admin Override**: Admin users can edit any deck regardless of ownership.

**Business Value:** Enables study groups, teacher-student workflows, and community-maintained decks -- key use cases for educational institutions.

---

### 12. Notifications

**Capability:** In-app notification system for league events, streak milestones, and system announcements.

- **Notification Screen**: Scrollable list of notifications with read/unread status.
- **Mark as Read**: Tap to dismiss individual notifications.
- **Bell Icon**: Accessible from the dashboard header.

**Business Value:** Keeps users informed about time-sensitive events (season ending, league advancement) that drive re-engagement.

---

### 13. Authentication & Onboarding

**Capability:** Frictionless sign-in with a guided multi-step onboarding flow.

- **Google Sign-In**: Available on all platforms.
- **Apple Sign-In**: Available on iOS (required by App Store guidelines).
- **Multi-Step Onboarding**: Username selection (with availability check) > Profile photo (camera or library, optional) > Interest selection (choose 3 categories from 11 options).
- **Auto-Redirect**: Auth state changes automatically route users to login, onboarding, or the main app based on their profile completion status.

**Business Value:** Social sign-in reduces registration friction to a single tap. The onboarding flow collects preferences that personalize the search and recommendation experience.

---

### 14. Deck Settings & Management

**Capability:** Per-deck configuration for learning behavior and deck metadata.

- **Learning Mode**: Choose between SRS (spaced repetition) and All-in-One (linear review) per deck.
- **Daily Card Limits**: Set how many new and due cards to review each day.
- **Zen Mode / Shuffle**: Optional settings for distraction-free learning and card randomization.
- **Reset Progress**: Restart a deck from scratch.
- **Delete Deck**: Soft delete with confirmation.
- **Deck Visibility**: Public or private decks.

**Business Value:** Gives power users fine-grained control while keeping defaults simple for casual learners.

---

## User Roles

| Role | Permissions |
|---|---|
| **User** (default) | Create decks, learn, search, follow, participate in leagues, use AVO Helper and translation |
| **Deck Owner** | All User permissions + edit deck metadata, manage cards, invite editors, delete own decks |
| **Deck Editor** | All User permissions + edit card content on decks where they've been added as editor |
| **Admin** | All permissions + edit any deck, access admin-only endpoints, override ownership checks |

---

## Technical Highlights

- **60+ typed Cloud Function endpoints** with Zod schema validation on every response
- **Shared type package** (`types/`) used by both frontend and backend to ensure contract consistency
- **Optimistic UI** for likes (local cache + debounced server sync) and card edits (local store + server write)
- **Skeleton loading states** on all data-fetching screens for perceived performance
- **Placeholder/demo mode** via feature flag for testing without backend connectivity
- **Deep link support** (`memvocado://` scheme) for Quick Add and cross-app integrations

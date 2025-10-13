# 📚 Memvocado - Card Learning Flow Documentation

## 🎯 Overview

This document describes the complete lifecycle of a card in Memvocado's spaced repetition system, from initial introduction to full FSRS algorithm integration.

## 🔄 Card States & Transitions

### State Diagram

```
[NEW CARD] → [FIRST LEARNING] → [FSRS ALGORITHM]
     ↓              ↓                    ↓
  isNew: true    isNew: true         isNew: false
  consecutiveGood: 0  consecutiveGood: 0-2  consecutiveGood: 0
```

## 📋 Detailed Flow with Examples

### Example Card: "What is the capital of France?"

- **Card ID**: `card_123`
- **Front**: "What is the capital of France?"
- **Back**: "Paris"

---

## 🆕 Phase 1: New Card Introduction

### Initial State

```typescript
{
  id: "card_123",
  cardData: { front: "What is the capital of France?", back: "Paris" },
  firstLearn: {
    isNew: true,           // ✅ Card is in first learning phase
    due: undefined,        // No due date yet
    state: 0,             // Initial state
    consecutiveGood: 0    // No good answers yet
  },
  cardAlgo: {
    difficulty: 2.5,      // Default FSRS values (not used yet)
    stability: 0,
    reps: 0,
    due: Date.now()       // Default due (not used in first learning)
  }
}
```

### First User Interaction: "Good" Answer

```typescript
// User answers "Good" → Card gets 10-minute cooldown
{
  id: "card_123",
  firstLearn: {
    isNew: true,                    // ✅ Still in first learning
    due: Date.now() + 10*60*1000,  // 10 minutes from now
    state: 1,                      // Updated state
    consecutiveGood: 1              // ✅ First good answer
  },
  seenInSession: true,             // Marked as seen in this session
  prevAns: "good"                  // Previous answer recorded
}
```

### Second User Interaction: "Good" Answer (Graduation!)

```typescript
// User answers "Good" again → Card graduates to FSRS
{
  id: "card_123",
  firstLearn: {
    isNew: false,                   // ✅ GRADUATED! No longer in first learning
    due: undefined,                 // No longer used
    state: 0,                       // Reset
    consecutiveGood: 2              // ✅ Two consecutive good answers
  },
  cardAlgo: {
    difficulty: 2.5,               // ✅ Now using FSRS algorithm
    stability: 2.5,                // FSRS calculated values
    reps: 1,
    due: Date.now() + 24*60*60*1000 // 1 day from now (FSRS calculation)
  },
  seenInSession: true,
  prevAns: "good"
}
```

---

## 🎓 Phase 2: FSRS Algorithm

### Card in FSRS Mode

```typescript
// Card is now fully managed by FSRS algorithm
{
  id: "card_123",
  firstLearn: {
    isNew: false,          // ✅ Graduated from first learning
    due: undefined,        // Not used in FSRS
    state: 0,             // Not used in FSRS
    consecutiveGood: 0     // Reset after graduation
  },
  cardAlgo: {
    difficulty: 2.5,      // ✅ FSRS manages all parameters
    stability: 2.5,
    reps: 1,
    due: Date.now() + 24*60*60*1000 // FSRS calculated interval
  }
}
```

### FSRS Wrong Answer (Special Case)

```typescript
// User answers "Wrong" in FSRS → 10-minute cooldown + FSRS learning
{
  id: "card_123",
  cardAlgo: {
    difficulty: 1.3,      // ✅ FSRS learned from wrong answer
    stability: 0.5,       // ✅ FSRS adjusted parameters
    reps: 2,
    due: Date.now() + 10*60*1000  // ✅ 10-minute cooldown (forced)
  },
  seenInSession: true,    // Card stays in session
  prevAns: "wrong"
}
```

---

## 🔄 Complete Example Flow

### Day 1: Card Introduction

```
1. Card appears: "What is the capital of France?"
   - isNew: true, consecutiveGood: 0

2. User answers "Good"
   - isNew: true, consecutiveGood: 1, due: +10min
   - Card disappears for 10 minutes

3. Card reappears after 10 minutes
   - User answers "Good" again
   - isNew: false, consecutiveGood: 2 → GRADUATION!
   - Card moves to FSRS algorithm
```

### Day 2: FSRS Management

```
1. Card appears (FSRS due)
   - isNew: false, FSRS manages due date

2. User answers "Good"
   - FSRS calculates next interval (e.g., 3 days)
   - Card disappears until FSRS due date
```

### Day 5: FSRS Wrong Answer

```
1. Card appears (FSRS due)
   - User answers "Wrong"
   - FSRS learns: difficulty ↓, stability ↓
   - Forced 10-minute cooldown
   - Card reappears in 10 minutes
```

---

## 🏗️ Technical Implementation

### Key Functions

#### `compDueDate(a, b)` - Sorting Logic

```typescript
// Priority order:
// 1. Cards already seen in session (seenInSession: true)
// 2. Cards with earlier due dates
// 3. New cards vs FSRS cards
```

#### `newCard(type)` - Answer Processing

```typescript
// First Learning (isNew: true)
if (type === "good") {
  consecutiveGood += 1;
  if (consecutiveGood >= 2) {
    // GRADUATE to FSRS
    isNew = false;
    consecutiveGood = 0;
  } else {
    due = now + 10 * 60 * 1000; // 10 minutes
  }
}

// FSRS (isNew: false)
if (type === "wrong") {
  // FSRS learns + forced cooldown
  cardAlgo.due = now + 10 * 60 * 1000;
} else {
  // Normal FSRS calculation
  cardAlgo = f.repeat(cardAlgo, now);
}
```

#### `updateCardsEvery(card)` - Persistence

```typescript
if (card.firstLearn.isNew) {
  // Save only firstLearn to Firestore
  await setDoc(cardRef, { firstLearn: card.firstLearn })
} else {
  // Full FSRS update via Cloud Function
  await cloudFunctions.updateCardProgress(...)
}
```

---

## 📊 Session Management

### Card Selection Logic

```typescript
// 1. Fetch due cards from backend
const dueCards = await getDueDeckCards(deckId); // FSRS + firstLearn due
const newCards = await getNewDeckCards(deckId); // New candidates

// 2. Partition cards
const fsrsDue = cards.filter(
  (c) => !c.firstLearn.isNew && c.cardAlgo.due <= now
);
const firstLearnDue = cards.filter(
  (c) => c.firstLearn.isNew && c.firstLearn.due <= now
);
const introductions = newCards.slice(0, dailyNew); // Limit new cards

// 3. Merge and sort
const sessionCards = [...fsrsDue, ...firstLearnDue, ...introductions].sort(
  compDueDate
);
```

### Priority System

1. **FSRS due cards** - Must be reviewed
2. **FirstLearn due cards** - In cooldown phase
3. **New introductions** - Limited by `dailyNew` setting
4. **Session priority** - Cards already seen in session get priority

---

## 🎯 Key Parameters

| Parameter         | First Learning          | FSRS                    | Description              |
| ----------------- | ----------------------- | ----------------------- | ------------------------ |
| `isNew`           | `true`                  | `false`                 | Learning phase indicator |
| `consecutiveGood` | `0-2`                   | `0`                     | Good answer counter      |
| `due`             | `firstLearn.due`        | `cardAlgo.due`          | Next review time         |
| `seenInSession`   | `true/false`            | `true/false`            | Session visibility       |
| `prevAns`         | `"good"/"hard"/"wrong"` | `"good"/"hard"/"wrong"` | Last answer              |

---

## 🔧 Configuration

### User Settings

- `dailyGoal`: Number of reviews per day
- `dailyNew`: Number of new cards to introduce per day

### Cooldown Times

- **Good answer**: 10 minutes
- **Hard answer**: 5 minutes
- **Wrong answer**: 1 minute
- **FSRS wrong**: 10 minutes (forced)

---

## 🚀 Benefits

1. **Gradual Learning**: New cards get familiar before FSRS complexity
2. **Immediate Feedback**: Short cooldowns for wrong answers
3. **Algorithm Learning**: FSRS adapts to user performance
4. **Session Efficiency**: Priority system prevents card loops
5. **Persistence**: All progress saved to cloud immediately

---

## 📝 Notes

- Cards never "disappear forever" - they return based on due dates
- `seenInSession` is local only (not persisted)
- First learning phase is limited to 2 consecutive good answers
- FSRS takes over completely after graduation
- All changes are saved to Firestore immediately

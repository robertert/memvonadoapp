# MEMVOCADO UI DESIGN SYSTEM

## Brand Identity

**App Concept**: A flashcard learning app with avocado-themed gamification. Users grow avocados through daily learning streaks.

**Design Philosophy**: Warm, organic, playful, educational. The avocado serves as a growth metaphor for learning progress.

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Avocado Green** | `#7EC384` | Primary brand color, tab bar, progress fills |
| **Dark Forest** | `#2E3A2C` | Typography, borders, outlines |
| **Soft Cream** | `#FFF8E7` | Backgrounds, card surfaces |
| **Peachy Accent** | `#F9C9A7` | CTAs, buttons, highlights |
| **Fresh Lime** | `#C7F464` | Energy accents, progress indicators |
| **Avocado Brown** | `#846249` | Avocado pit, secondary accents |
| **Success Green** | `#4AA859` | Correct answers, success states |
| **Soft Blue** | `#AEE1F9` | Information, rare rarity |
| **Warning Yellow** | `#FCE97E` | In-progress, caution states |
| **Error Pink** | `#F27C8A` | Errors, streak lost |
| **Epic Gold** | `#FFD700` | Epic rarity, celebrations |

### Opacity Variants

- Dark Forest 80%: `#2E3A2CCC`
- Dark Forest 50%: `#2E3A2C80`
- Dark Forest 30%: `#2E3A2C4D`

---

## Typography

| Font | Usage |
|------|-------|
| **Poppins** | Headlines, display text |
| **Inter** | Body text, UI elements |
| **Roboto** | Alternative body text |

### Weights

- 400 (regular)
- 500 (medium)
- 600 (semibold)
- 700 (bold)
- 800 (heavy)
- 900 (black)

### Scale

- 10-14px: Captions, small labels
- 14-16px: Body text
- 18-20px: Section headers
- 25-32px: Major stats, headlines

---

## Icon Style Guidelines

### For Creating Custom Icons

1. **Style**: Rounded, friendly, organic shapes (no sharp corners)
2. **Stroke Width**: 2-3px consistent stroke
3. **Corner Radius**: Minimum 2px on all corners
4. **Color**: Primarily `#2E3A2C` (Dark Forest) on light backgrounds
5. **Active State**: `#F9C9A7` (Peachy Accent)
6. **Grid**: 24x24px base, scalable to 32px for tab bar

### Icon Family Reference

React Native Heroicons (solid & outline)

### Visual Characteristics

- Soft, rounded edges
- Friendly, approachable aesthetic
- Minimal detail (avoid intricate designs)
- Consistent 2px optical padding

### Example Icons Needed

- Home (dashboard)
- Search (magnifying glass)
- Plus (create)
- Chart/Trophy (rankings)
- User (profile)
- Fire (streak)
- Bell (notifications)
- Gear (settings)

---

## Image & Illustration Style

### Avocado Character System

| Phase | Name (PL) | Visual Description |
|-------|-----------|---------------------|
| 1 | Pestka (Seed) | Brown pit, minimal detail |
| 2 | Kielek (Sprout) | Small green sprout emerging |
| 3 | Drzewko (Little Tree) | Small tree with leaves |
| 4 | Owoc (Fruit) | Whole avocado fruit |
| 5 | Dojrzale (Ripe) | Cut avocado, ready to harvest |

### Avocado Skins (Variants)

| Rarity | Color Indicator | Skins |
|--------|-----------------|-------|
| Common (60%) | `#4AA859` green | Classic, Happy, Sleepy |
| Rare (30%) | `#AEE1F9` blue | Nerd, Cool |
| Epic (10%) | `#FFD700` gold | Golden, Glitch |

### Illustration Style Guidelines

- **Shape**: Soft, rounded, organic forms
- **Outline**: 3px `#2E3A2C` border
- **Fill**: Flat colors with subtle gradients
- **Eyes/Face**: Simple, kawaii-inspired expressions
- **Shading**: Minimal, soft highlights only
- **Background**: Transparent or `#FFF8E7`

### Image Sizes

- Small: 60x60px
- Medium: 100x100px
- Large: 160x160px
- App Icon: 1024x1024px

---

## Component Visual Patterns

### Cards

- Background: `#FFF8E7`
- Border: 3px solid `#2E3A2C`
- Border Radius: 16px (standard), 40px (flashcards)
- Shadow: Subtle drop shadow

### Buttons

- Background: `#F9C9A7`
- Text: `#2E3A2C`, weight 900
- Border Radius: 12px
- Shadow: `#F9C9A7` offset 4px, 0.4 opacity

### Progress Bars

- Height: 20px
- Track: `#2E3A2C4D` (30% opacity)
- Fill: `#7EC384`
- Border Radius: 10px

---

## Celebration/Confetti Colors

| Rarity | Confetti Palette |
|--------|------------------|
| Common | `#4AA859`, `#6BC175`, `#8DD99E`, `#A8E6B8` |
| Rare | `#AEE1F9`, `#7DC8F5`, `#4BB0E8`, `#1A9FDB` |
| Epic | `#FFD700`, `#FFC000`, `#FFB300`, `#FFA000` |

---

## Asset Checklist for Icon/Image Creation

### App Icons

- [ ] App icon (1024x1024) - Avocado with face
- [ ] Adaptive icon (Android)
- [ ] Favicon (32x32)
- [ ] Splash screen illustration

### Avocado Phases (5 phases x 7 skins = 35 images)

- [ ] Phase 1-5 for: Classic, Happy, Sleepy, Nerd, Cool, Golden, Glitch

### UI Icons (24px and 32px variants)

- [ ] Navigation icons (5)
- [ ] Action icons (settings, share, close, etc.)
- [ ] Status icons (streak fire, notification bell)

### Decorative

- [ ] Empty state illustrations
- [ ] Achievement badges
- [ ] League tier icons (15 tiers)
- [ ] Language flags (already have: GB, ES, FR, DE)

---

## Design Tools Settings

### Figma/Sketch Export Settings

- iOS: @1x, @2x, @3x
- Android: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- Format: PNG (raster), SVG (vector icons)

### Color Profile

sRGB

### Grid

8px base grid system

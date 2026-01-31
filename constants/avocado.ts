import type { AvocadoConfig, AvocadoSkinRarity } from "../types/schemas/avocado";

/**
 * Stałe i konfiguracja systemu wzrostu awokado
 */

// Nazwy faz wzrostu (1-5)
export const AVOCADO_PHASE_NAMES: Record<number, string> = {
  1: "Pestka",
  2: "Kiełek",
  3: "Drzewko",
  4: "Owoc",
  5: "Dojrzałe",
};

// Mapowanie dni na fazy
// Days 1-2 → Phase 1, Days 3-4 → Phase 2, Day 5 → Phase 3, Day 6 → Phase 4, Day 7 → Phase 5
export const DAYS_TO_PHASE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
};

// Całkowita liczba dni do pełnego wzrostu
export const AVOCADO_TOTAL_DAYS = 7;

// Całkowita liczba faz
export const AVOCADO_TOTAL_PHASES = 5;

// Kolory rzadkości (motyw natury)
export const AVOCADO_RARITY_COLORS: Record<AvocadoSkinRarity, string> = {
  common: "#4AA859",   // Zielony
  rare: "#AEE1F9",     // Niebieski
  epic: "#FFD700",     // Złoty
  legendary: "#FFD700", // Legendarny
};

// Nazwy rzadkości po polsku
export const AVOCADO_RARITY_NAMES: Record<AvocadoSkinRarity, string> = {
  common: "Zwykłe",
  rare: "Rzadkie",
  epic: "Epickie",
  legendary: "Legendarny",
};

// Domyślna konfiguracja (fallback gdy Firestore niedostępny)
export const DEFAULT_AVOCADO_CONFIG: AvocadoConfig = {
  skins: [
    { id: "classic_avo", name: "Klasyczne", rarity: "common", weight: 20 },
    { id: "sport_avo", name: "Sportowe", rarity: "common", weight: 20 },
    { id: "chef_avo", name: "Kucharz", rarity: "common", weight: 20 },
    { id: "space_avo", name: "Kosmiczne", rarity: "epic", weight: 2 },
    { id: "painter_avo", name: "Malarz", rarity: "common", weight: 20 },
    { id: "ninja_avo", name: "Ninja", rarity: "rare", weight: 5 },
    { id: "sensei_avo", name: "Sensi", rarity: "rare", weight: 5 },
    { id: "detective_avo", name: "Detektyw", rarity: "rare", weight: 5 },
    { id: "king_avo", name: "Król", rarity: "epic", weight: 1 },
    { id: "robot_avo", name: "Robot", rarity: "epic", weight: 2 },
    { id: "sleepy_avo", name: "Śpiące", rarity: "rare", weight: 5 },
  ],
  phaseDaysRequired: 1,
  totalPhases: 5,
};

// Wszystkie dostępne ID skórek
export const ALL_SKIN_IDS = DEFAULT_AVOCADO_CONFIG.skins.map(s => s.id);

// Liczba wszystkich skórek
export const TOTAL_SKINS_COUNT = DEFAULT_AVOCADO_CONFIG.skins.length;

// Rozmiary obrazków awokado
export const AVOCADO_IMAGE_SIZES = {
  small: 60,
  medium: 100,
  large: 160,
} as const;

// Ścieżki do obrazków faz
export const getPhaseImagePath = (phase: number, wilted: boolean = false): string => {
  const suffix = wilted ? "_wilted" : "";
  const phaseNames: Record<number, string> = {
    1: "seed",
    2: "sprout",
    3: "tree",
    4: "fruit",
    5: "ripe",
  };
  return `phase_${phase}_${phaseNames[phase]}${suffix}`;
};

// Ścieżki do obrazków skórek
export const getSkinImagePath = (skinId: string): string => {
  return skinId;
};

// Klucz AsyncStorage dla stanu modalnego zbiorów
export const AVOCADO_HARVEST_PENDING_KEY = "avocado_harvest_pending";
export const AVOCADO_RESET_PENDING_KEY = "avocado_reset_pending";
export const AVOCADO_REFRESH_DASHBOARD_KEY = "avocado_refresh_dashboard";

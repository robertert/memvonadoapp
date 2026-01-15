export const LEARNING_PACE_OPTIONS = [
  {
    value: "slow",
    numPerDay: 5,
    label: "Spokojnie",
    description: "5 kart/dzień",
    emoji: "🐢",
  },
  {
    value: "medium",
    numPerDay: 15,
    label: "Normalne",
    description: "15 kart/dzień",
    emoji: "🚶",
  },
  {
    value: "fast",
    numPerDay: 30,
    label: "Turbo",
    description: "30 kart/dzień",
    emoji: "⚡",
  },
  {
    value: "custom",
    numPerDay: -1,
    label: "Własne",
    description: "Ustaw ręcznie",
    emoji: "⚙️",
  },
];

export const LANGUAGE_OPTIONS = [
  {
    code: "en",
    label: "English",
    flag: require("../assets/images/gbFlag.png"),
  },
  {
    code: "pl",
    label: "Polski",
    flag: require("../assets/images/gbFlag.png"),
  }, // Placeholder
  {
    code: "es",
    label: "Español",
    flag: require("../assets/images/esFlag.png"),
  },
  {
    code: "de",
    label: "Deutsch",
    flag: require("../assets/images/deFlag.png"),
  },
  {
    code: "fr",
    label: "Français",
    flag: require("../assets/images/frFlag.png"),
  },
  {
    code: "it",
    label: "Italiano",
    flag: require("../assets/images/gbFlag.png"),
  }, // Placeholder
];

export const DEFAULT_DECK_LEARNING_DATA = {
  id: "",
  title: "",
  description: "",
  icon: "cards",
  language: "en",
  settings: {
    dueCardsNumPerDay: 0,
    newCardsNumPerDay: 0,
    zenMode: false,
    shuffleNewCards: false,
  },
};

export const CATEGORY_OPTIONS: string[] = [
  "English",
  "Spanish",
  "German",
  "French",
  "Math",
  "Medicine",
  "Biology",
  "Phisics",
  "Art",
  "History",
  "Other",
];

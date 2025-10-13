import { generatorParameters } from "ts-fsrs";
import { Dimensions } from "react-native";

// Gesture thresholds
export const X_THRESHOLD = 0.25;
export const Y_THRESHOLD = 0.2;

// Animation constants - tylko te które są naprawdę potrzebne
export const ANIMATION_CONSTANTS = {
  BORDER_RADIUS: 40,
  BORDER_WIDTH: 3,
  PROGRESS_BAR_HEIGHT: 20,
  TOOLTIP_PADDING: 20,
} as const;

// Dimensions - tylko specyficzne dla tego komponentu
export const DIMENSIONS = {
  CARD_MARGIN_TOP: -200,
  CARD_MARGIN_LEFT: -150,
  HEADER_MARGIN_BOTTOM: 30,
  PROGRESS_MARGIN_BOTTOM: 30,
} as const;

export const FSRS_PARAMS = generatorParameters({
  enable_fuzz: false,
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ],
});

import type { Card, DeckLearningData, DailyStats, CardGrade } from "@/types";
import { SharedValue, useAnimatedStyle } from "react-native-reanimated";

export type SessionDirection = "forward" | "reverse";

export interface SessionItem {
  card: Card;
  direction: SessionDirection;
  seenInSession?: boolean;
}

export interface ProgressState {
  easy: number;
  hard: number;
  good: number;
  wrong: number;
  todo: number;
  all: number;
  [key: string]: number;
}

export interface TooltipState {
  shown: boolean;
  color?: string;
  textColor?: string;
  text?: string;
}

export interface LearnScreenParams {
  deckId: string;
}

export interface CardLogicState {
  cards: SessionItem[] | undefined;
  isLoading: boolean;
  isBack: boolean;
  tooltip: TooltipState;
  deck: DeckLearningData | undefined;
  progress: ProgressState;
  dailyStats: DailyStats | null;
}

export interface HistoryEntry {
  item: SessionItem;
  dailyStats: DailyStats | null;
  progress: ProgressState;
  grade: CardGrade;
}

export interface AnimationValues {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  translateXlInfo: SharedValue<number>;
  translateXrInfo: SharedValue<number>;
  translateYtInfo: SharedValue<number>;
  translateYbInfo: SharedValue<number>;
  rotateCard: SharedValue<number>;
  opacityCard: SharedValue<number>;
  scaleCard: SharedValue<number>;
  tooltipSize: SharedValue<number>;
  translateYTabBar: SharedValue<number>;
}

// Animated style types - using any for compatibility with React Native Animated
export type AnimatedStyle = ReturnType<typeof useAnimatedStyle>;

// Gesture types
export type GestureType =
  | ReturnType<typeof import("react-native-gesture-handler").Gesture.Pan>
  | ReturnType<typeof import("react-native-gesture-handler").Gesture.Exclusive>;

// Safe area insets type
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

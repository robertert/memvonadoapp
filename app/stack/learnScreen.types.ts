import { CardData } from "@/services/cloudFunctions";
import { SharedValue } from "react-native-reanimated";

export interface ProgressState {
  easy: number;
  hard: number;
  good: number;
  wrong: number;
  todo: number;
  all: number;
  [key: string]: number;
}

export interface Card {
  id: string;
  cardData: CardData;
  cardAlgo?: any;
  firstLearn?: {
    isNew: boolean;
    due: number | Date;
    state: number;
    consecutiveGood: number; // Dodane pole do śledzenia dobrych odpowiedzi pod rząd
  };
  [key: string]: any;
}

export interface DoneCard {
  id: string;
  cardAlgo: any;
  cardData: CardData;
  firstLearn: {
    isNew: boolean;
    due: number | Date;
    state: number;
    consecutiveGood: number;
  };
  grade?: number;
  difficulty?: number;
  interval?: number;
}

export interface Deck {
  id?: string;
  title?: string;
  [key: string]: any;
}

export interface TooltipState {
  shown: boolean;
  color?: string;
  textColor?: string;
  text?: string;
}

export interface LearnScreenParams {
  id: string;
}

export interface CardLogicState {
  cards: Card[];
  isLoading: boolean;
  isBack: boolean;
  tooltip: TooltipState;
  time: NodeJS.Timeout | number | undefined;
  index: number;
  doneCards: DoneCard[];
  deck: Deck;
  isNew: boolean;
  progress: ProgressState;
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
export type AnimatedStyle = any;

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

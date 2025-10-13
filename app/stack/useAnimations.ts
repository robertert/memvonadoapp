import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimationValues } from "./learnScreen.types";

const dimensions = Dimensions.get("screen");

/**
 * Custom hook for managing animation values and styles for the learn screen
 * @returns Object containing animation values, styles, and dimensions
 */
export function useAnimations() {
  const safeArea = useSafeAreaInsets();
  const TOP = -dimensions.height + 200;
  const TRANSLATE_VAL = 60;

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateXlInfo = useSharedValue(0);
  const translateXrInfo = useSharedValue(0);
  const translateYtInfo = useSharedValue(0);
  const translateYbInfo = useSharedValue(0);
  const rotateCard = useSharedValue(0);
  const opacityCard = useSharedValue(1);
  const scaleCard = useSharedValue(1); // Dodana wartość skalowania dla efektu 3D
  const tooltipSize = useSharedValue(-20);
  const translateYTabBar = useSharedValue(0);

  const animationValues: AnimationValues = {
    translateX,
    translateY,
    translateXlInfo,
    translateXrInfo,
    translateYtInfo,
    translateYbInfo,
    rotateCard,
    opacityCard,
    scaleCard,
    tooltipSize,
    translateYTabBar,
  };

  // Animation reactions - usunięcie ograniczeń dla płynnego wysuwania się wskaźników
  useAnimatedReaction(
    () => {
      return {
        l: translateXlInfo.value,
        r: translateXrInfo.value,
        t: translateYtInfo.value,
        b: translateYbInfo.value,
      };
    },
    (newValue, previousValue) => {
      // Usunięto ograniczenia - wskaźniki mogą się teraz swobodnie wysuwać spoza ekranu
      // Maksymalne wysunięcie będzie kontrolowane w useGestures.ts
      const MAX_SLIDE_DISTANCE = 200; // Maksymalna odległość wysunięcia
      
      if (newValue.r < -MAX_SLIDE_DISTANCE) {
        translateXrInfo.value = -MAX_SLIDE_DISTANCE;
      }
      if (newValue.l > MAX_SLIDE_DISTANCE) {
        translateXlInfo.value = MAX_SLIDE_DISTANCE;
      }
      if (newValue.b < -MAX_SLIDE_DISTANCE) {
        translateYbInfo.value = -MAX_SLIDE_DISTANCE;
      }
      if (newValue.t > MAX_SLIDE_DISTANCE) {
        translateYtInfo.value = MAX_SLIDE_DISTANCE;
      }
    },
    [translateXlInfo, translateXrInfo, translateYtInfo, translateYbInfo]
  );

  useAnimatedReaction(
    () => {
      return translateX.value;
    },
    (newValue, previousValue) => {
      if (
        newValue >= dimensions.width + 50 ||
        newValue < -dimensions.width - 50
      ) {
        translateX.value = 0;
        translateY.value = 0;
      }
    },
    [translateX]
  );

  useAnimatedReaction(
    () => {
      return translateY.value;
    },
    (newValue, previousValue) => {
      if (
        newValue >= dimensions.height + 100 ||
        newValue < -dimensions.height - 100
      ) {
        translateX.value = 0;
        translateY.value = 0;
      }
    },
    [translateY]
  );

  useAnimatedReaction(
    () => {
      return rotateCard.value;
    },
    (newValue, previousValue) => {
      if (newValue === 180) {
        rotateCard.value = 0;
      }
      // Dodaj efekt skalowania podczas obrotu dla większego realizmu
      const rotationProgress = Math.abs(newValue) / 180;
      const scaleProgress = Math.sin(rotationProgress * Math.PI);
      scaleCard.value = 1 - scaleProgress * 0.1; // Lekkie zmniejszenie podczas obrotu
    },
    [rotateCard, scaleCard]
  );

  // Animated styles
  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 }, // Dodana perspektywa dla efektu 3D
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scaleCard.value }, // Dodane skalowanie
        { rotateY: `${rotateCard.value}deg` },
        { rotate: `${(-0.6 * translateY.value + translateX.value) / 10}deg` },
      ],
      opacity: opacityCard.value,
    };
  });

  const lInfoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateXlInfo.value }],
    };
  });

  const rInfoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateXrInfo.value }],
    };
  });

  const tInfoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateYtInfo.value }],
    };
  });

  const bInfoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateYbInfo.value }],
    };
  });

  const tabBarStyle = useAnimatedStyle(() => {
    return {
      borderRadius: (translateYTabBar.value / (TOP / 2)) * 15,
    };
  });

  const insideStyles = useAnimatedStyle(() => {
    return {
      height: -translateYTabBar.value,
      opacity: translateYTabBar.value / (TOP / 2),
    };
  });

  const outsideStyles = useAnimatedStyle(() => {
    return {
      opacity: (TOP / 2 - translateYTabBar.value) / (TOP / 2),
    };
  });

  const bottomStyle = useAnimatedStyle(() => {
    return {
      zIndex: translateYTabBar.value < 0 ? 5 : 0,
    };
  });

  const insideDisplayStyles = useAnimatedStyle(() => {
    return {
      display: translateYTabBar.value < -10 ? "flex" : "none",
    };
  });

  const animatedStyles = {
    rStyle,
    lInfoStyle,
    rInfoStyle,
    tInfoStyle,
    bInfoStyle,
    tabBarStyle,
    insideStyles,
    outsideStyles,
    bottomStyle,
    insideDisplayStyles,
  };

  return {
    animationValues,
    animatedStyles,
    dimensions,
    TOP,
  };
}

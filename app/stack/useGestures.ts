import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Dimensions } from "react-native";
import {
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { X_THRESHOLD, Y_THRESHOLD } from "./learnScreen.constants";
import { EdgeInsets } from "react-native-safe-area-context";
import { AnimationValues } from "./learnScreen.types";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const dimensions = Dimensions.get("screen");

// Helper function to trigger haptic feedback
function triggerHaptic(
  type: "success" | "warning" | "error" | "light" | "medium" | "heavy"
) {
  switch (type) {
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case "light":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "heavy":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
  }
}

interface UseGesturesProps {
  animationValues: AnimationValues;
  newCard: (type: string) => void;
  setIsBack: (value: React.SetStateAction<boolean>) => void;
  TOP: number;
  safeArea?: EdgeInsets;
  setIsTurn: (value: React.SetStateAction<boolean>) => void;
}

/**
 * Custom hook for managing gesture definitions and handlers
 * @param animationValues - Animation values from useAnimations hook
 * @param newCard - Function to handle card progression
 * @param setIsBack - Function to toggle card side
 * @param TOP - Top boundary value for animations
 * @returns Object containing gesture definitions
 */
export function useGestures({
  animationValues,
  newCard,
  setIsBack,
  TOP,
  safeArea,
  setIsTurn,
}: UseGesturesProps) {
  const {
    translateX,
    translateY,
    translateXlInfo,
    translateXrInfo,
    translateYbInfo,
    translateYtInfo,
    translateYTabBar,
    rotateCard,
    opacityCard,
    scaleCard,
  } = animationValues;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {})
    .onChange((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      // Resetuj wszystkie wskaźniki do pozycji spoza ekranu (dopasowane do SwipeIndicators.tsx)
      translateXlInfo.value = 0; // Lewy: left: -150 + translateX: 0 = -150 (spoza ekranu)
      translateXrInfo.value = 0; // Prawy: right: -150 + translateX: 0 = -150 (spoza ekranu)
      translateYtInfo.value = 0; // Górny: top: -100 + translateY: 0 = -100 (spoza ekranu)
      translateYbInfo.value = 0; // Dolny: bottom: -100 + translateY: 0 = -100 (spoza ekranu)

      // Prawy wskaźnik (Good) - wysuwa się z prawej strony (right: -150 → right: -150 - translateX)
      if (e.translationX > dimensions.width * X_THRESHOLD) {
        const progress =
          (e.translationX - dimensions.width * X_THRESHOLD) /
          (dimensions.width * 0.3);
        translateXrInfo.value = -Math.min(120, progress * 120); // Wysuwa się w lewo (0 → -120), max 120px
      }

      // Lewy wskaźnik (Wrong) - wysuwa się z lewej strony (left: -150 → left: -150 + translateX)
      if (e.translationX < dimensions.width * -X_THRESHOLD) {
        const progress =
          (-e.translationX - dimensions.width * X_THRESHOLD) /
          (dimensions.width * 0.3);
        translateXlInfo.value = Math.min(120, progress * 120); // Wysuwa się w prawo (0 → 120), max 120px
      }

      // Dolny wskaźnik (Hard) - wysuwa się z dołu (bottom: -100 → bottom: -100 - translateY)
      if (e.translationY > dimensions.height * Y_THRESHOLD) {
        const progress =
          (e.translationY - dimensions.height * Y_THRESHOLD) /
          (dimensions.height * 0.25);
        const maxSlide = 70 + (safeArea?.bottom ?? 0);
        translateYbInfo.value = -Math.min(maxSlide, progress * maxSlide); // Wysuwa się w górę, powiększone o safe area
      }

      // Górny wskaźnik (Easy) - wysuwa się z góry (top: -100 → top: -100 + translateY)
      if (e.translationY < dimensions.height * -Y_THRESHOLD) {
        const progress =
          (-e.translationY - dimensions.height * Y_THRESHOLD) /
          (dimensions.height * 0.25);
        const maxSlide = 70 + (safeArea?.top ?? 0);
        translateYtInfo.value = Math.min(maxSlide, progress * maxSlide); // Wysuwa się w dół, powiększone o safe area
      }
    })
    .onEnd((e) => {
      // Wszystkie wskaźniki wracają spoza ekranu (pozycja 0 = spoza ekranu) z płynniejszą animacją
      translateXlInfo.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });
      translateXrInfo.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });
      translateYbInfo.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });
      translateYtInfo.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });
      if (
        translateX.value < dimensions.width * X_THRESHOLD &&
        translateX.value > dimensions.width * -X_THRESHOLD &&
        translateY.value < dimensions.height * Y_THRESHOLD &&
        translateY.value > dimensions.height * -Y_THRESHOLD
      ) {
        translateX.value = withSpring(0, {
          damping: 18,
          stiffness: 200,
          mass: 0.8,
        });
        translateY.value = withSpring(0, {
          damping: 18,
          stiffness: 200,
          mass: 0.8,
        });
      } else if (translateX.value <= dimensions.width * -X_THRESHOLD) {
        translateX.value = withSpring(-dimensions.width - 50, {
          damping: 15,
          stiffness: 120,
          mass: 0.7,
        });
        runOnJS(triggerHaptic)("error");
        runOnJS(newCard)("wrong");
      } else if (translateY.value <= dimensions.height * -Y_THRESHOLD) {
        translateY.value = withSpring(-dimensions.height - 200, {
          damping: 15,
          stiffness: 120,
          mass: 0.7,
        });
        runOnJS(triggerHaptic)("success");
        runOnJS(newCard)("easy");
      } else if (translateY.value >= dimensions.height * Y_THRESHOLD) {
        translateY.value = withSpring(dimensions.height + 200, {
          damping: 15,
          stiffness: 120,
          mass: 0.7,
        });
        runOnJS(triggerHaptic)("warning");
        runOnJS(newCard)("hard");
      } else {
        translateX.value = withSpring(dimensions.width + 50, {
          damping: 15,
          stiffness: 120,
          mass: 0.7,
        });
        runOnJS(triggerHaptic)("success");
        runOnJS(newCard)("good");
      }
    });

  const swipeUp = Gesture.Pan()
    .onBegin((e) => {})
    .onChange((e) => {
      if (e.translationY < 0 || translateYTabBar.value < 0) {
        translateYTabBar.value += e.changeY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < TOP / 2 || translateYTabBar.value < TOP / 2) {
        translateYTabBar.value = withSpring(TOP, {
          damping: 22,
          stiffness: 180,
          mass: 0.6,
        });
      } else {
        translateYTabBar.value = withSpring(0, {
          damping: 22,
          stiffness: 180,
          mass: 0.6,
        });
      }
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      setIsBack((prev) => !prev);
      // Realistyczna animacja obrotu z easing i dłuższym czasem
      rotateCard.value = withTiming(180, {
        duration: 600, // Dłuższa animacja dla większej płynności
        easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bardziej dynamiczna krzywa beziera
      });
      setIsTurn(true);
      setTimeout(() => {
        setIsTurn(false);
      }, 500);
    });

  const comp = Gesture.Exclusive(pan, tap);

  return {
    pan,
    swipeUp,
    tap,
    comp,
  };
}

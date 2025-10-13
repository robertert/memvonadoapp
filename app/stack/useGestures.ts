import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Dimensions } from "react-native";
import { withSpring, withTiming, withSequence, Easing } from "react-native-reanimated";
import { X_THRESHOLD, Y_THRESHOLD } from "./learnScreen.constants";
import { EdgeInsets } from "react-native-safe-area-context";
import { AnimationValues } from "./learnScreen.types";
import { useState } from "react";

const dimensions = Dimensions.get("screen");

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
export function useGestures({ animationValues, newCard, setIsBack, TOP, safeArea, setIsTurn }: UseGesturesProps) {


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
      translateXlInfo.value = 0;   // Lewy: left: -150 + translateX: 0 = -150 (spoza ekranu)
      translateXrInfo.value = 0;   // Prawy: right: -150 + translateX: 0 = -150 (spoza ekranu)  
      translateYtInfo.value = 0;   // Górny: top: -100 + translateY: 0 = -100 (spoza ekranu)
      translateYbInfo.value = 0;   // Dolny: bottom: -100 + translateY: 0 = -100 (spoza ekranu)
      
      // Prawy wskaźnik (Good) - wysuwa się z prawej strony (right: -150 → right: -150 - translateX)
      if (e.translationX > dimensions.width * X_THRESHOLD) {
        const progress = (e.translationX - dimensions.width * X_THRESHOLD) / (dimensions.width * 0.3);
        translateXrInfo.value = -Math.min(120, progress * 120); // Wysuwa się w lewo (0 → -120), max 120px
      }
      
      // Lewy wskaźnik (Wrong) - wysuwa się z lewej strony (left: -150 → left: -150 + translateX)  
      if (e.translationX < dimensions.width * -X_THRESHOLD) {
        const progress = (-e.translationX - dimensions.width * X_THRESHOLD) / (dimensions.width * 0.3);
        translateXlInfo.value = Math.min(120, progress * 120); // Wysuwa się w prawo (0 → 120), max 120px
      }
      
      // Dolny wskaźnik (Hard) - wysuwa się z dołu (bottom: -100 → bottom: -100 - translateY)
      if (e.translationY > dimensions.height * Y_THRESHOLD) {
        const progress = (e.translationY - dimensions.height * Y_THRESHOLD) / (dimensions.height * 0.25);
        const maxSlide = 70 + (safeArea?.bottom ?? 0);
        translateYbInfo.value = -Math.min(maxSlide, progress * maxSlide); // Wysuwa się w górę, powiększone o safe area
      }
      
      // Górny wskaźnik (Easy) - wysuwa się z góry (top: -100 → top: -100 + translateY)
      if (e.translationY < dimensions.height * -Y_THRESHOLD) {
        const progress = (-e.translationY - dimensions.height * Y_THRESHOLD) / (dimensions.height * 0.25);
        const maxSlide = 70 + (safeArea?.top ?? 0);
        translateYtInfo.value = Math.min(maxSlide, progress * maxSlide); // Wysuwa się w dół, powiększone o safe area
      }
    })
    .onEnd((e) => {
        // Wszystkie wskaźniki wracają spoza ekranu (pozycja 0 = spoza ekranu)
        translateXlInfo.value = withSpring(0);
        translateXrInfo.value = withSpring(0);
        translateYbInfo.value = withSpring(0);
        translateYtInfo.value = withSpring(0);
      if (
        translateX.value < dimensions.width * X_THRESHOLD &&
        translateX.value > dimensions.width * -X_THRESHOLD &&
        translateY.value < dimensions.height * Y_THRESHOLD &&
        translateY.value > dimensions.height * -Y_THRESHOLD
      ) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else if (translateX.value <= dimensions.width * -X_THRESHOLD) {
        translateX.value = withSpring(-dimensions.width - 50);
        newCard("wrong");
      } else if (translateY.value <= dimensions.height * -Y_THRESHOLD) {
        translateY.value = withSpring(-dimensions.height - 200);
        newCard("easy");
      } else if (translateY.value >= dimensions.height * Y_THRESHOLD) {
        translateY.value = withSpring(dimensions.height + 200);
        newCard("hard");
      } else {
        translateX.value = withSpring(dimensions.width + 50);
        newCard("good");
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
        translateYTabBar.value = withSpring(TOP);
      } else {
        translateYTabBar.value = withSpring(0);
      }
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      setIsBack(prev => !prev);
      // Realistyczna animacja obrotu z easing i dłuższym czasem
      rotateCard.value = withTiming(180, {
        duration: 500, // Dłuższa animacja dla płynności
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Smooth easing curve
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

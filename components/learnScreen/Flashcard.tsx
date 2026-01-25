// React and React Native imports
import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";

// Third-party library imports
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from "react-native-reanimated";

// Local imports
import { AnimatedStyle, GestureType } from "../../app/stack/learnScreen.types";
import { ANIMATION_CONSTANTS } from "../../constants/animations";
import { Colors } from "../../constants/colors";
import { Card } from "@/types/schemas";

interface FlashcardProps {
  card: Card | undefined;
  isBack: boolean;
  rStyle: AnimatedStyle;
  rotateValue: SharedValue<number>;
  gesture: GestureType;
  streakLost?: boolean;
  deckId: string;
}

export default function Flashcard({
  card,
  isBack,
  rStyle,
  rotateValue,
  gesture,
  streakLost,
  deckId,
}: FlashcardProps) {
  const backgroundColor = useSharedValue(Colors.primary_100);

  // Update color only when streak is lost (flash red)
  useEffect(() => {
    if (streakLost) {
      // Flash red when streak is lost
      backgroundColor.value = withTiming("#ff6b6b", {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });

      // Reset to default color after flash
      setTimeout(() => {
        backgroundColor.value = withTiming(Colors.primary_100, {
          duration: 500,
          easing: Easing.in(Easing.quad),
        });
      }, 600);
    }
  }, [streakLost]);

  useEffect(() => {
    rotateValue.value = 0;
  }, [card?.id]);

  const backgroundColorStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColor.value,
    };
  });

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateRad = (rotateValue.value * Math.PI) / 180;
    const isFrontVisible = Math.cos(rotateRad) >= 0;

    return {
      opacity: isFrontVisible ? 1 : 0,
      zIndex: isFrontVisible ? 1 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateRad = (rotateValue.value * Math.PI) / 180;
    const isBackVisible = Math.cos(rotateRad) < 0;

    return {
      opacity: isBackVisible ? 1 : 0,
      zIndex: isBackVisible ? 1 : 0,
      transform: [{ scaleX: -1 }],
      backfaceVisibility: 'visible',
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.cardContainer, rStyle]}
        accessibilityLabel={`Flashcard: ${
          isBack ? card?.cardData?.back : card?.cardData?.front
        }`}
        accessibilityHint="Swipe left for wrong, right for good, up for easy, down for hard, or double tap to flip"
        accessibilityRole="button"
      >
        {/* --- PRZÓD KARTY --- */}
        <Animated.View
          style={[styles.cardFace, backgroundColorStyle, frontAnimatedStyle]}
        >
          <Text style={styles.text}>{card?.cardData?.front}</Text>
        </Animated.View>

        {/* --- TYŁ KARTY --- */}
        <Animated.View
          style={[styles.cardFace, backgroundColorStyle, backAnimatedStyle]}
        >
          <Text style={[styles.text]}>
            {card?.cardData?.back}
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: "65%",
    width: "70%",
    position: "absolute",
    zIndex: 2,
    top: "50%",
    left: "50%",
    marginTop: "-24%",
    marginLeft: "-35%",
  },
  cardFace: {
    backfaceVisibility: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: ANIMATION_CONSTANTS.BORDER_WIDTH,
    borderRadius: ANIMATION_CONSTANTS.BORDER_RADIUS,
    height: "100%", // Wypełnia kontener
    width: "100%", // Wypełnia kontener
    position: "absolute", // Nakładają się na siebie
    backgroundColor: Colors.primary_100,
    padding: 16,
  },
  text: {
    color: Colors.primary_700,
    fontSize: 30,
    textAlign: "center",
  },
});

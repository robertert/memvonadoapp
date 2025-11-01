// React and React Native imports
import React, { useEffect } from "react";
import { Text, View } from "react-native";

// Third-party library imports
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

// Local imports
import { Card, AnimatedStyle, GestureType } from "./learnScreen.types";
import { ANIMATION_CONSTANTS, DIMENSIONS } from "./learnScreen.constants";
import { Colors } from "../../constants/colors";

interface FlashcardProps {
  card: Card;
  isBack: boolean;
  rStyle: AnimatedStyle;
  gesture: GestureType;
  isTurn: boolean;
  streakLost?: boolean;
}

export function Flashcard({
  card,
  isBack,
  rStyle,
  gesture,
  isTurn,
  streakLost,
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

  const backgroundColorStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColor.value,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            alignItems: "center",
            justifyContent: "center",
            borderWidth: ANIMATION_CONSTANTS.BORDER_WIDTH,
            borderRadius: ANIMATION_CONSTANTS.BORDER_RADIUS,
            height: "65%",
            width: "70%",
            position: "absolute",
            zIndex: 2,
            top: "50%",
            left: "50%",
            marginTop: "-24%", // Połowa wysokości karty (65% / 2)
            marginLeft: "-35%", // Połowa szerokości karty (70% / 2)
          },
          backgroundColorStyle,
          rStyle,
        ]}
        accessibilityLabel={`Flashcard: ${
          isBack ? card?.cardData?.back : card?.cardData?.front
        }`}
        accessibilityHint="Swipe left for wrong, right for good, up for easy, down for hard, or double tap to flip"
        accessibilityRole="button"
      >
        {!isTurn && (
          <Text
            style={{
              color: Colors.primary_700,
              fontSize: 30,
            }}
            accessibilityLabel={`Card text: ${
              isBack ? card?.cardData?.back : card?.cardData?.front
            }`}
          >
            {isBack ? card?.cardData?.back : card?.cardData?.front}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

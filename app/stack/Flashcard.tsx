// React and React Native imports
import React, { useEffect } from "react";
import { Text, View } from "react-native";

// Third-party library imports
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

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
}

export function Flashcard({ card, isBack, rStyle, gesture,isTurn }: FlashcardProps) {


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
            backgroundColor: Colors.primary_100,
            position: "absolute",
            zIndex: 2,
            top: "50%",
            left: "50%",
            marginTop: "-24%", // Połowa wysokości karty (65% / 2)
            marginLeft: "-35%",  // Połowa szerokości karty (70% / 2)
          },
          rStyle,
        ]}
        accessibilityLabel={`Flashcard: ${isBack ? card?.cardData?.back : card?.cardData?.front}`}
        accessibilityHint="Swipe left for wrong, right for good, up for easy, down for hard, or double tap to flip"
        accessibilityRole="button"
      >
        {!isTurn && (
        <Text
          style={{
            color: Colors.primary_700,
            fontSize: 30,
          }}
          accessibilityLabel={`Card text: ${isBack ? card?.cardData?.back : card?.cardData?.front}`}
        >
          {isBack ? card?.cardData?.back : card?.cardData?.front}
        </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

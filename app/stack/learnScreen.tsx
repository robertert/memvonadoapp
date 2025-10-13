// React and React Native imports
import React, { useState } from "react";
import { Pressable, Text, View, ActivityIndicator } from "react-native";

// Third-party library imports
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

// Local imports
import { LearnScreenParams } from "./learnScreen.types";
import { useCardLogic } from "./useCardLogic";
import { useAnimations } from "./useAnimations";
import { useGestures } from "./useGestures";
import { Flashcard } from "./Flashcard";
import { SwipeIndicators } from "./SwipeIndicators";
import { ProgressBar } from "./ProgressBar";
import { BottomSheet } from "./BottomSheet";
import { learnScreenStyles } from "./learnScreen.styles";
import { Colors } from "../../constants/colors";
import { FireIcon } from "react-native-heroicons/solid";

/**
 * Main learning screen component for flashcard learning with gesture-based interactions
 * @returns JSX.Element - The rendered learning screen
 */
export default function learnScreen(): React.JSX.Element {
  const params = useLocalSearchParams();
  const typedParams = params as unknown as LearnScreenParams;
  const id = typedParams.id;

  const safeArea = useSafeAreaInsets();

  const [isTurn, setIsTurn] = useState(false);

  // Use extracted hooks
  const { cardLogicState, error, setIsBack, setTooltip, newCard, clearError } = useCardLogic(id);
  const { animationValues, animatedStyles, dimensions, TOP } = useAnimations();
  const { comp, swipeUp } = useGestures({ animationValues, newCard, setIsBack, TOP, safeArea, setIsTurn });

  const { cards, isLoading, isBack, tooltip, progress } = cardLogicState;
  const { rStyle, lInfoStyle, rInfoStyle, tInfoStyle, bInfoStyle, tabBarStyle, insideStyles, outsideStyles, bottomStyle, insideDisplayStyles } = animatedStyles;

  const tabBarValue = ((progress.all - progress.todo) * 100) / progress.all;
  const progressText = cards.length > 0 ? `${progress.all - progress.todo + 1} / ${progress.all}` : "0 / 0";


  /**
   * Handles navigation back to previous screen
   */
  function goBackHandler(): void {
    router.back();
  }

  if (error) {
    return (
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={learnScreenStyles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <GestureHandlerRootView
          style={[learnScreenStyles.container, { paddingTop: safeArea.top + 8 }]}
        >
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: Colors.primary_100 }}
          >
            <Text style={{ fontSize: 18, color: Colors.white, textAlign: "center", marginBottom: 20 }}>
              Oops! Something went wrong
            </Text>
            <Text style={{ fontSize: 16, color: Colors.white, textAlign: "center", marginBottom: 30 }}>
              {error}
            </Text>
            <Pressable
              onPress={clearError}
              style={{
                backgroundColor: Colors.primary_700,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <Text style={{ color: Colors.white, fontSize: 16 }}>Try Again</Text>
            </Pressable>
          </View>
        </GestureHandlerRootView>
        </LinearGradient>
    );
  }

  if (isLoading) {
    return (
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={learnScreenStyles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <GestureHandlerRootView
          style={[learnScreenStyles.container, { paddingTop: safeArea.top + 8 }]}
        >
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary_100 }}
          >
            <ActivityIndicator size={"large"} color={Colors.primary_700} />
          </View>
        </GestureHandlerRootView>
        </LinearGradient>
    );
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={learnScreenStyles.background}
      colors={[Colors.primary_100, Colors.primary_100]}
    >
      <GestureHandlerRootView
        style={[learnScreenStyles.container, { paddingTop: safeArea.top + 8 }]}
      >
        <Flashcard card={cards[0]} isBack={isBack} rStyle={rStyle} gesture={comp} isTurn={isTurn} />

        <SwipeIndicators
          lInfoStyle={lInfoStyle}
          rInfoStyle={rInfoStyle}
          tInfoStyle={tInfoStyle}
          bInfoStyle={bInfoStyle}
          safeArea={safeArea}
        />

        <View style={learnScreenStyles.header}>
          <Pressable
            onPress={goBackHandler}
            accessibilityLabel="Go back to previous screen"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to deck selection"
          >
            <Ionicons name="chevron-back" size={30} color={Colors.primary_700} />
          </Pressable>
          <View style={{flexDirection: "row", alignItems: "center"}}>
            <Text style={{ fontSize: 24, color: Colors.accent_500, fontWeight: "bold",marginRight: 4 }}>5</Text>
            <FireIcon size={24} color={Colors.red} />
          </View>
        </View>
        <ProgressBar tabBarValue={tabBarValue} progressText={progressText} />
        <BottomSheet
          progress={progress}
          tabBarValue={tabBarValue}
          tooltip={tooltip}
          swipeUp={swipeUp}
          tabBarStyle={tabBarStyle}
          insideStyles={insideStyles}
          outsideStyles={outsideStyles}
          bottomStyle={bottomStyle}
          insideDisplayStyles={insideDisplayStyles}
          safeArea={safeArea}
        />
      </GestureHandlerRootView>
    </LinearGradient>
  );
}



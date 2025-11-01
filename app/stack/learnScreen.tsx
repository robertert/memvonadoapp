// React and React Native imports
import React, { useState } from "react";
import { Pressable, Text, View, ActivityIndicator } from "react-native";

// Third-party library imports
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnUI,
} from "react-native-reanimated";

// Local imports
import { LearnScreenParams } from "./learnScreen.types";
import { useCardLogic } from "./useCardLogic";
import { useAnimations } from "./useAnimations";
import { useGestures } from "./useGestures";
import { Flashcard } from "./Flashcard";
import { SwipeIndicators } from "./SwipeIndicators";
import { ProgressBar } from "./ProgressBar";
import { BottomSheet } from "./BottomSheet";
import { Confetti } from "./Confetti";
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
  const screenDimensions = Dimensions.get("window");

  const [isTurn, setIsTurn] = useState(false);

  // Use extracted hooks
  const {
    cardLogicState,
    error,
    setIsBack,
    setTooltip,
    newCard,
    clearError,
    lastAnswerType,
    clearLastAnswerType,
    currentStreak,
    streakAchieved,
    clearStreakAchieved,
    streakLost,
  } = useCardLogic(id);
  const { animationValues, animatedStyles, dimensions, TOP } = useAnimations();
  const { comp, swipeUp } = useGestures({
    animationValues,
    newCard,
    setIsBack,
    TOP,
    safeArea,
    setIsTurn,
  });

  const { cards, isLoading, isBack, tooltip, progress } = cardLogicState;

  // State for confetti trigger - only for streak achievement
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation for flying fire icon - appears big in center, then flies out
  const flyingFireIconScale = useSharedValue(0);
  const flyingFireIconOpacity = useSharedValue(0);
  const flyingFireIconTranslateX = useSharedValue(0);
  const flyingFireIconTranslateY = useSharedValue(0);
  const flyingFireIconRotation = useSharedValue(0);

  // Animation for static fire icon that appears after flying icon disappears
  const staticFireIconScale = useSharedValue(0);
  const staticFireIconOpacity = useSharedValue(0);

  // Calculate positions for fire icon animation
  // Center of screen (absolute position)
  const screenCenterX = screenDimensions.width / 2;
  const screenCenterY = screenDimensions.height / 2;
  // Top right corner position (where streak counter is in header)
  // Position it right next to the streak number
  const headerTopOffset = safeArea.top + 8; // Header padding
  const streakNumberWidth = 40; // Approximate width of streak number + margin
  const cornerX = screenDimensions.width - streakNumberWidth - 15; // Right next to number

  // Calculate vertical position to align with streak number
  // Header starts at: safeArea.top + 8
  // Text is fontSize 24, so its center is approximately at: headerTopOffset + (font line height / 2)
  // Font line height for 24px is roughly 30px, so center is at headerTopOffset + 15
  // Icon size is 24px, so its center needs to be at: headerTopOffset + 15
  // But we need relative position from screen center
  const textVerticalCenter = headerTopOffset + 15; // Approximate center of text
  const cornerY = textVerticalCenter - screenCenterY; // Relative to screen center

  // Distance to travel from center to corner (relative values for translate)
  // These are relative to the center position where icon starts
  const travelX = cornerX - screenCenterX;
  const travelY = cornerY - screenCenterY;

  // Trigger confetti and flying fire icon animation only when streak is achieved
  React.useEffect(() => {
    if (streakAchieved) {
      setShowConfetti(true);

      // Flying icon: Start from 0 at center
      flyingFireIconScale.value = 0;
      flyingFireIconTranslateX.value = 0;
      flyingFireIconTranslateY.value = 0;
      flyingFireIconRotation.value = 0;
      flyingFireIconOpacity.value = 1; // Make visible immediately

      // Phase 1: Flying icon grows at center (0 → 1) with bounce
      // Icon is now natively 96px (4x larger) so we scale from 0 to 1 instead of 0 to 4
      flyingFireIconScale.value = withSequence(
        withTiming(1.125, {
          duration: 400,
          easing: Easing.out(Easing.back(1.3)),
        }),
        withSpring(1, {
          damping: 12,
          stiffness: 180,
        })
      );

      // After growth completes, start flying animation
      setTimeout(() => {
        // Phase 2: Flying icon shrinks and flies out (from 1 to 0.075, which is 1/4 of 0.3)
        flyingFireIconScale.value = withTiming(0.075, {
          duration: 2000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });

        // Fly from center beyond screen
        flyingFireIconTranslateX.value = withTiming(travelX + 100, {
          duration: 2000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });

        flyingFireIconTranslateY.value = withTiming(travelY - 150, {
          duration: 2000,
          easing: Easing.bezier(0.4, -0.3, 0.3, 1.0), // Parabola
        });

        flyingFireIconRotation.value = withTiming(360, {
          duration: 2000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });

        // Hide flying icon after it flies out
        flyingFireIconOpacity.value = withDelay(
          1800,
          withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.quad),
          })
        );

        // Phase 3: Static icon appears small and grows after flying icon disappears
        setTimeout(() => {
          // Static icon starts very small and visible
          staticFireIconScale.value = 0.01;
          staticFireIconOpacity.value = 0.1;

          // Grow to normal size with bounce
          staticFireIconScale.value = withSpring(1, {
            damping: 12,
            stiffness: 200,
          });
          staticFireIconOpacity.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
          });
        }, 2100); // Start appearing after flight completes
      }, 600); // Start flying after growth animation completes

      // Clear streak achieved flag after all animations complete
      setTimeout(() => {
        clearStreakAchieved();
      }, 3200);
    }
  }, [streakAchieved, clearStreakAchieved]);

  // Show/hide static fire icon based on streak (only when NOT in animation)
  React.useEffect(() => {
    // Skip if animation is currently running
    if (streakAchieved) {
      return; // Don't interfere with animation
    }

    if (currentStreak > 5) {
      // Keep static icon visible with normal size
      staticFireIconScale.value = 1;
      staticFireIconOpacity.value = 1;
    } else {
      // Hide static icon when streak is lost
      staticFireIconScale.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.quad),
      });
      staticFireIconOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.quad),
      });
    }
  }, [currentStreak, streakAchieved]);

  // Animated style for flying fire icon (absolute positioned)
  // Icon is natively 96px (4x larger than original 24px) for better quality when scaled
  const flyingFireIconAnimatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: screenCenterX - 48, // Center of icon (96px / 2) at screen center
      top: screenCenterY - 48, // Center of icon (96px / 2) at screen center
      transform: [
        { translateX: flyingFireIconTranslateX.value },
        { translateY: flyingFireIconTranslateY.value },
        { scale: flyingFireIconScale.value },
        { rotate: `${flyingFireIconRotation.value}deg` },
      ],
      opacity: flyingFireIconOpacity.value,
      zIndex: 999,
    };
  });

  // Animated style for static fire icon (in header)
  const staticFireIconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: staticFireIconScale.value }],
      opacity: staticFireIconOpacity.value,
    };
  });
  const {
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
  } = animatedStyles;

  const tabBarValue = ((progress.all - progress.todo) * 100) / progress.all;
  const progressText =
    cards.length > 0
      ? `${progress.all - progress.todo + 1} / ${progress.all}`
      : "0 / 0";

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
          style={[
            learnScreenStyles.container,
            { paddingTop: safeArea.top + 8 },
          ]}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              backgroundColor: Colors.primary_100,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                color: Colors.white,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Oops! Something went wrong
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: Colors.white,
                textAlign: "center",
                marginBottom: 30,
              }}
            >
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
              <Text style={{ color: Colors.white, fontSize: 16 }}>
                Try Again
              </Text>
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
          style={[
            learnScreenStyles.container,
            { paddingTop: safeArea.top + 8 },
          ]}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: Colors.primary_100,
            }}
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
        <Flashcard
          card={cards[0]}
          isBack={isBack}
          rStyle={rStyle}
          gesture={comp}
          isTurn={isTurn}
          streakLost={streakLost}
        />

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
            <Ionicons
              name="chevron-back"
              size={30}
              color={Colors.primary_700}
            />
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontSize: 24,
                color: Colors.accent_500,
                fontWeight: "bold",
                marginRight: 4,
              }}
            >
              {currentStreak}
            </Text>
            {/* Static fire icon in header */}
            <Animated.View style={staticFireIconAnimatedStyle}>
              <FireIcon size={24} color={Colors.red} />
            </Animated.View>
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
        <Confetti
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
        {/* Flying fire icon that appears in center and flies out */}
        {/* Native size 96px (4x) for better quality when scaled down */}
        <Animated.View style={flyingFireIconAnimatedStyle} pointerEvents="none">
          <FireIcon size={96} color={Colors.red} />
        </Animated.View>
      </GestureHandlerRootView>
    </LinearGradient>
  );
}

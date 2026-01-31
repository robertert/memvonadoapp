// React and React Native imports
import React, { useState, useEffect } from "react";
import { Pressable, Text, View, ActivityIndicator, Modal, ScrollView, StyleSheet } from "react-native";

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
} from "react-native-reanimated";

// Local imports
import { LearnScreenParams } from "./learnScreen.types";
import { useCardLogic } from "../../hooks/learnScreen/useCardLogic";
import { useAnimations } from "../../hooks/learnScreen/useAnimations";
import { useGestures } from "../../hooks/learnScreen/useGestures";
import Flashcard from "../../components/learnScreen/Flashcard";
import SwipeIndicators from "../../components/learnScreen/SwipeIndicators";
import ProgressBar from "../../components/learnScreen/ProgressBar";
import BottomSheet from "../../components/learnScreen/BottomSheet";
import Confetti from "../../components/learnScreen/Confetti";
import AllInOneLearnScreen from "../../components/learnScreen/AllInOneLearnScreen";
import { learnScreenStyles } from "./learnScreen.styles";
import { Colors } from "../../constants/colors";
import { BoltIcon, ArrowUturnLeftIcon } from "react-native-heroicons/solid";
import { Card, LearningMode } from "@/types";
import { calculateDailyStatsProgress } from "@/constants/dailyStats";
import { cloudFunctions } from "../../services/cloudFunctions";
import * as Haptics from "expo-haptics";
import { playSound } from "@/utils/soundTrigger";
import { useAvoHelper } from "../../hooks/useAvoHelper";
import AvoHelperOverlay from "../../components/avoHelper/AvoHelperOverlay";
import type { AvoCardContext } from "@/types/schemas/api/avoHelper";

/**
 * Main learning screen component for flashcard learning with gesture-based interactions
 * @returns JSX.Element - The rendered learning screen
 */
export default function learnScreen(): React.JSX.Element {
  const params = useLocalSearchParams();
  const typedParams = params as unknown as LearnScreenParams;
  const id = typedParams.deckId;
  const safeArea = useSafeAreaInsets();
  const screenDimensions = Dimensions.get("window");

  // Learning mode state
  const [learningMode, setLearningMode] = useState<LearningMode | null>(null);
  const [isLoadingMode, setIsLoadingMode] = useState<boolean>(true);

  // Fetch learning mode on mount
  useEffect(() => {
    async function fetchLearningMode() {
      try {
        const { deck } = await cloudFunctions.getUserDeckDetails(id);
        setLearningMode(deck?.settings?.learningMode ?? "srs");
      } catch (error) {
        console.error("Error fetching learning mode:", error);
        setLearningMode("srs"); // Default to SRS on error
      } finally {
        setIsLoadingMode(false);
      }
    }
    fetchLearningMode();
  }, [id]);

  // If still loading mode, show loading screen
  if (isLoadingMode) {
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

  // If All in One mode, render the dedicated component
  if (learningMode === "all_in_one") {
    return <AllInOneLearnScreen deckId={id} />;
  }

  // Otherwise render SRS mode (existing implementation)
  return <SRSLearnScreen deckId={id} />;
}

/**
 * SRS Learning Screen Component - the original implementation
 */
function SRSLearnScreen({ deckId }: { deckId: string }): React.JSX.Element {
  const id = deckId;
  const safeArea = useSafeAreaInsets();
  const screenDimensions = Dimensions.get("window");

  // Use extracted hooks
  const {
    cardLogicState,
    error,
    setIsBack,
    goBackInHistory,
    history,
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

  const { cards, isLoading, isBack, tooltip, progress, dailyStats } =
    cardLogicState;

  // AVO Helper
  const avoHelper = useAvoHelper();

  // Build AVO card context from current card
  const currentCard = cards?.[0];
  const avoCardContext: AvoCardContext | null = currentCard
    ? {
        front: currentCard.cardData?.front || "",
        back: currentCard.cardData?.back || "",
        tags: currentCard?.tags || [],
        deckName: "",
      }
    : null;

  // Track answers for AVO mood (CardGrade: Wrong=0, Hard=1, Good=2, Easy=3)
  React.useEffect(() => {
    if (lastAnswerType === undefined || lastAnswerType === null) return;
    const grade = parseInt(lastAnswerType, 10);
    const isCorrect = grade >= 2; // Good or Easy
    avoHelper.trackAnswer(isCorrect);
  }, [lastAnswerType]);

  // State for confetti trigger - only for streak achievement
  const [showConfetti, setShowConfetti] = useState(false);

  // Tooltip state for long press
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState("");

  // Handle long press to show tooltip with card text
  const handleLongPress = () => {
    const rotation = Math.round(animationValues.rotateCard.value / 180);
    const isBackVisible = Math.abs(rotation % 2) === 1;
    const textToShow = isBackVisible ? cards?.[0]?.cardData?.back : cards?.[0]?.cardData?.front;

    if (textToShow) {
      setTooltipText(textToShow);
      setTooltipVisible(true);
    }
  };

  const { comp, swipeUp } = useGestures({
    animationValues,
    newCard,
    setIsBack,
    TOP,
    safeArea,
    onLongPress: handleLongPress,
  });

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

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  async function triggerComboHaptics(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
    await delay(100); 
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }


  // Trigger confetti and flying fire icon animation only when streak is achieved
  React.useEffect(() => {
    if (streakAchieved) {
      setShowConfetti(true);

      playSound("combo");
      triggerComboHaptics();
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

  // Użyj dailyStats do obliczenia progressu jeśli dostępne, w przeciwnym razie użyj progress z sesji
  const tabBarValue = calculateDailyStatsProgress(dailyStats || null);
  const progressText = dailyStats
    ? `${dailyStats.completedNewToday + dailyStats.completedDueToday} / ${
        dailyStats.newCardsRemaining +
        dailyStats.dueCardsRemaining +
        dailyStats.inProgressDueCards +
        dailyStats.inProgressNewCards +
        dailyStats.completedNewToday +
        dailyStats.completedDueToday
      }`
    : "0 / 0";

  /**
   * Handles navigation back to previous screen
   */
  function goBackHandler(): void {
    router.push({
      pathname: "./victoryScreen",
      params: {
        completedNewToday: dailyStats?.completedNewToday?.toString() ?? "0",
        completedDueToday: dailyStats?.completedDueToday?.toString() ?? "0",
        empty: "false",
        finished: "false",
      },
    });
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
          card={cards ? (cards[0] as Card) : undefined}
          isBack={isBack}
          rStyle={rStyle}
          rotateValue={animationValues.rotateCard}
          gesture={comp}
          streakLost={streakLost}
          deckId={id}
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
            accessibilityLabel="Finish session"
            accessibilityRole="button"
            accessibilityHint="Tap to finish session"
          >
            <View style={styles.finishButton}>
              <Text style={styles.finishText}>Finish</Text>
            </View>
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
              <BoltIcon size={24} color={Colors.red} />
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
          dailyStats={dailyStats}
        />
        <Confetti
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
        {history.length > 0 && (
          <Pressable
            onPress={goBackInHistory}
            style={{ position: "absolute", top: safeArea.top + 110, left: 20 }}
          >
            <ArrowUturnLeftIcon size={24} color={Colors.primary_700} />
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            if (!cards?.[0]?.id) return;
            router.push({
              pathname: "./editCard",
              params: { cardId: cards[0].id, deckId: id },
            });
          }}
          style={{ position: "absolute", top: safeArea.top + 110, right: 20 }}
          accessibilityLabel="Edit card"
          accessibilityRole="button"
          accessibilityHint="Tap to edit card"
        >
          <Ionicons name="pencil" size={24} color={Colors.primary_700} />
        </Pressable>

        {/* Flying fire icon that appears in center and flies out */}
        {/* Native size 96px (4x) for better quality when scaled down */}
        <Animated.View style={flyingFireIconAnimatedStyle} pointerEvents="none">
          <BoltIcon size={96} color={Colors.red} />
        </Animated.View>

        {/* AVO Helper */}
        <AvoHelperOverlay
          cardContext={avoCardContext}
          avoHelper={avoHelper}
        />

        {/* Tooltip Modal for long press */}
        <Modal
          visible={tooltipVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setTooltipVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setTooltipVisible(false)}
            />
            <View style={styles.modalContent}>
              <ScrollView
                indicatorStyle="black"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalText}>{tooltipText}</Text>
              </ScrollView>
              <Text style={styles.modalHint}>Dotknij tła, aby zamknąć</Text>
            </View>
          </View>
        </Modal>
      </GestureHandlerRootView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent_500,
  },
  finishText: {
    fontSize: 12,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "90%",
    maxHeight: "60%",
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalText: {
    fontSize: 24,
    color: Colors.primary_700,
    textAlign: "center",
    lineHeight: 34,
  },
  modalHint: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.primary_700,
    opacity: 0.5,
    fontSize: 14,
  },
});

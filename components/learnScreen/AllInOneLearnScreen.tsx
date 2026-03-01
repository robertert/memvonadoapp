import React, { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { Colors, Fonts } from "../../constants/colors";
import { useAllInOneCardLogic } from "../../hooks/learnScreen/useAllInOneCardLogic";
import { ArrowUturnLeftIcon } from "react-native-heroicons/solid";
import ProgressBar from "./ProgressBar";
import { useAvoHelper } from "../../hooks/useAvoHelper";
import AvoHelperOverlay from "../avoHelper/AvoHelperOverlay";
import type { AvoCardContext } from "@/types/schemas/api/avoHelper";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("screen");
const X_THRESHOLD = 0.15;

interface AllInOneLearnScreenProps {
  deckId: string;
}

export default function AllInOneLearnScreen({
  deckId,
}: AllInOneLearnScreenProps): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const {
    currentCard,
    isLoading,
    isBack,
    setIsBack,
    respondToCard,
    undoLastCard,
    canUndo,
    isFinished,
    progress,
    totalCardsInDeck,
    sessionStats,
    error,
    clearError,
    applyEditedCard,
  } = useAllInOneCardLogic(deckId);

  const navigation = useNavigation();

  // Apply edited card data when screen regains focus (e.g., after editing)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      applyEditedCard();
    });
    return unsubscribe;
  }, [navigation, applyEditedCard]);

  // AVO Helper
  const avoHelper = useAvoHelper();

  const avoCardContext: AvoCardContext | null = currentCard
    ? {
        front: currentCard.front || "",
        back: currentCard.back || "",
        tags: [],
        deckName: "",
      }
    : null;

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateCard = useSharedValue(0);
  const scaleCard = useSharedValue(1);
  const opacityCard = useSharedValue(1);
  const leftIndicatorX = useSharedValue(0);
  const rightIndicatorX = useSharedValue(0);

  // Color overlay for feedback
  const overlayOpacity = useSharedValue(0);
  const overlayColor = useSharedValue("green");

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState("");

  // Reset card position instantly when it goes off screen (same as SRS mode)
  useAnimatedReaction(
    () => translateX.value,
    (newValue) => {
      if (newValue >= SCREEN_WIDTH + 50 || newValue < -SCREEN_WIDTH - 50) {
        translateX.value = 0;
        translateY.value = 0;
        overlayOpacity.value = 0;
      }
    },
    [translateX]
  );

  // Scale effect during card flip (same as SRS mode)
  useAnimatedReaction(
    () => rotateCard.value,
    (newValue) => {
      const rotationProgress = Math.abs(newValue) / 180;
      const scaleProgress = Math.sin(rotationProgress * Math.PI);
      scaleCard.value = 1 - scaleProgress * 0.1;
    },
    [rotateCard, scaleCard]
  );

  // 2. Funkcja otwierająca Tooltip
  const handleLongPress = () => {
    // Obliczamy, która strona jest widoczna na podstawie obrotu
    // Jeśli obrót to 0, 360, 720 -> Przód
    // Jeśli obrót to 180, 540 -> Tył
    const rotation = Math.round(rotateCard.value / 180);
    const isBackVisible = Math.abs(rotation % 2) === 1;

    const textToShow = isBackVisible ? currentCard?.back : currentCard?.front;
    
    if (textToShow) {
      setTooltipText(textToShow);
      setTooltipVisible(true);
      triggerHaptic("success"); // Lekka wibracja jako potwierdzenie
    }
  };

  // Reset rotation when card changes (include direction to handle bidirectional)
  useEffect(() => {
    rotateCard.value = 0;
  }, [currentCard?.cardId, currentCard?.direction]);

  function triggerHaptic(type: "success" | "error") {
    if (type === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function handleCorrect() {
    overlayColor.value = "green";
    overlayOpacity.value = withTiming(0.3, { duration: 150 });
    triggerHaptic("success");
    respondToCard(true);
    avoHelper.trackAnswer(true);
  }

  function handleWrong() {
    overlayColor.value = "red";
    overlayOpacity.value = withTiming(0.3, { duration: 150 });
    triggerHaptic("error");
    respondToCard(false);
    avoHelper.trackAnswer(false);
  }

  // Gesture handlers
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onChange((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      // Reset indicators
      leftIndicatorX.value = 0;
      rightIndicatorX.value = 0;

      // Right indicator (Correct)
      if (e.translationX > SCREEN_WIDTH * X_THRESHOLD) {
        const p =
          (e.translationX - SCREEN_WIDTH * X_THRESHOLD) / (SCREEN_WIDTH * 0.12);
        rightIndicatorX.value = -Math.min(120, p * 120);
        overlayColor.value = "green";
        overlayOpacity.value = Math.min(0.3, p * 0.3);
      } else if (e.translationX < SCREEN_WIDTH * -X_THRESHOLD) {
        // Left indicator (Wrong)
        const p =
          (-e.translationX - SCREEN_WIDTH * X_THRESHOLD) /
          (SCREEN_WIDTH * 0.12);
        leftIndicatorX.value = Math.min(120, p * 120);
        overlayColor.value = "red";
        overlayOpacity.value = Math.min(0.3, p * 0.3);
      } else {
        // Reset overlay when not past threshold
        overlayOpacity.value = 0;
      }
    })
    .onEnd((e) => {
      // Reset indicators with smooth spring animation
      leftIndicatorX.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });
      rightIndicatorX.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });

      if (
        e.translationX < SCREEN_WIDTH * X_THRESHOLD &&
        e.translationX > SCREEN_WIDTH * -X_THRESHOLD
      ) {
        // Return to center with spring
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
        overlayOpacity.value = withTiming(0, { duration: 150 });
      } else if (e.translationX <= SCREEN_WIDTH * -X_THRESHOLD) {
        // Swipe left - Wrong: fly card off screen
        translateX.value = withSpring(-SCREEN_WIDTH - 50, {
          damping: 15,
          stiffness: 120,
          mass: 0.7,
        });
        runOnJS(handleWrong)();
      } else {
        // Swipe right - Correct: fly card off screen
        translateX.value = withSpring(SCREEN_WIDTH + 50, {
          damping: 15,
          stiffness: 120,
          mass: 0.7,
        });
        runOnJS(handleCorrect)();
      }
    });

    const longPressGesture = Gesture.LongPress()
    .runOnJS(true)
    .minDuration(500) // 500ms przytrzymania aktywuje tooltip
    .onStart(() => {
      handleLongPress();
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      setIsBack((prev: boolean) => !prev);
      rotateCard.value = withTiming(
        Math.round(rotateCard.value / 180) * 180 + 180,
        {
          duration: 400,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }
      );
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture, longPressGesture);

  // Animated styles
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scaleCard.value },
      { rotateY: `${rotateCard.value}deg` },
      { rotate: `${(-0.6 * translateY.value + translateX.value) / 10}deg` },
    ],
    opacity: opacityCard.value,
  }));

  const frontFaceStyle = useAnimatedStyle(() => {
    const rotateRad = (rotateCard.value * Math.PI) / 180;
    const isFrontVisible = Math.cos(rotateRad) >= 0;
    return {
      opacity: isFrontVisible ? 1 : 0,
      zIndex: isFrontVisible ? 1 : 0,
    };
  });

  const backFaceStyle = useAnimatedStyle(() => {
    const rotateRad = (rotateCard.value * Math.PI) / 180;
    const isBackVisible = Math.cos(rotateRad) < 0;
    return {
      opacity: isBackVisible ? 1 : 0,
      zIndex: isBackVisible ? 1 : 0,
      transform: [{ scaleX: -1 }],
      backfaceVisibility: 'visible',
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    backgroundColor: overlayColor.value,
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftIndicatorX.value }],
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightIndicatorX.value }],
  }));

  function goBackHandler(): void {
    router.back();
  }

  if (error) {
    return (
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <GestureHandlerRootView
          style={[styles.container, { paddingTop: safeArea.top + 8 }]}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={clearError} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
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
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <GestureHandlerRootView
          style={[styles.container, { paddingTop: safeArea.top + 8 }]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary_700} />
          </View>
        </GestureHandlerRootView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_100, Colors.primary_100]}
    >
      <GestureHandlerRootView
        style={[styles.container, { paddingTop: safeArea.top + 8 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBackHandler}>
            <Ionicons
              name="chevron-back"
              size={30}
              color={Colors.primary_700}
            />
          </Pressable>
          <Text style={styles.headerTitle}>All in One</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Progress Bar */}
          <ProgressBar tabBarValue={Math.min(progress * 100, 100)} />

        {/* Swipe Indicators */}
        <Animated.View style={[styles.leftIndicator, leftIndicatorStyle]}>
          <Ionicons name="close" size={48} color="#FF4444" />
        </Animated.View>
        <Animated.View style={[styles.rightIndicator, rightIndicatorStyle]}>
          <Ionicons name="checkmark" size={48} color="#44FF44" />
        </Animated.View>

        {/* Flashcard */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.cardContainer, cardStyle]}>
            {/* Color overlay */}
            <Animated.View style={[styles.colorOverlay, overlayStyle]}/>

            {/* Front face */}
            <Animated.View style={[styles.cardFace, frontFaceStyle]}>
              <Text style={styles.cardText} 
                    >
                {currentCard?.front}
              </Text>
            </Animated.View>

            {/* Back face */}
            <Animated.View style={[styles.cardFace, backFaceStyle]}>
              <Text style={[styles.cardText, styles.backFaceText]} 
                    >
                {currentCard?.back}
              </Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Undo Button */}
        {canUndo && (
          <Pressable
            onPress={undoLastCard}
            style={[styles.undoButton, { top: safeArea.top + 110 }]}
          >
            <ArrowUturnLeftIcon size={24} color={Colors.primary_700} />
          </Pressable>
        )}

        {/* Edit Card Button */}
        {currentCard?.cardId && (
        <Pressable
          onPress={() => {
            if (!currentCard?.cardId) return;
            router.push({
              pathname: "./editCard",
              params: { cardId: currentCard.cardId, deckId: deckId },
            });
          }}
          style={{ position: "absolute", top: safeArea.top + 110, right: 20 }}
          accessibilityLabel="Edit card"
          accessibilityRole="button"
          accessibilityHint="Tap to edit card"
        >
          <Ionicons name="pencil" size={24} color={Colors.primary_700} />
        </Pressable>
        )}

        {/* Bottom Stats */}
        <View style={[styles.bottomStats, { paddingBottom: safeArea.bottom + 20 }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.green }]}>{sessionStats.completed}</Text>
            <Text style={[styles.statLabel, { color: Colors.primary_100 }]}>Zrobione</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.red }]}>{sessionStats.wrongAttempts}</Text>
            <Text style={[styles.statLabel, { color: Colors.primary_100 }]}>Błędy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.primary_100 }]}>
                {totalCardsInDeck}
            </Text>
            <Text style={[styles.statLabel, { color: Colors.primary_100 }]}>Wszystkie</Text>
          </View>
        </View>
        {/* AVO Helper */}
        <AvoHelperOverlay
          cardContext={avoCardContext}
          avoHelper={avoHelper}
        />

        {/* 5. Komponent MODAL (dodaj na samym dole przed zamknięciem GestureHandlerRootView) */}
        <Modal
  visible={tooltipVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setTooltipVisible(false)}
>
  {/* Główny kontener pozycjonujący */}
  <View style={styles.modalOverlay}>
    
    {/* WARSTWA 1: Tło do klikania (Zamyka modal) */}
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
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  progressBarContainer: {
    width: "90%",
    marginBottom: 20,
  },
  cardContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: "60%",
    width: "70%",
    position: "absolute",
    zIndex: 2,
    top: "25%",
  },
  cardFace: {
    backfaceVisibility: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: 25,
    height: "100%",
    width: "100%",
    position: "absolute",
    backgroundColor: Colors.primary_100,
    borderColor: Colors.primary_700,
    padding: 20,
  },
  backFaceText: {
  },
  cardText: {
    color: Colors.primary_700,
    fontSize: 28,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: Fonts.primary,
    fontWeight: "600",
  },
  colorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    zIndex: 10,
  },
  leftIndicator: {
    position: "absolute",
    left: -100,
    top: "45%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  rightIndicator: {
    position: "absolute",
    right: -100,
    top: "45%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(68, 255, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  undoButton: {
    position: "absolute",
    left: 20,
  },
  bottomStats: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    backgroundColor: Colors.primary_500,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    opacity: 0.7,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    color: Colors.primary_700,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: Fonts.primary,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 16,
    color: Colors.primary_700,
    textAlign: "center",
    marginBottom: 30,
    fontFamily: Fonts.primary,
  },
  retryButton: {
    backgroundColor: Colors.primary_700,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.primary_100,
    fontSize: 16,
    fontFamily: Fonts.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Półprzezroczyste tło
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "90%",
    maxHeight: "60%", // Maksymalna wysokość okna
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
    fontFamily: Fonts.primary,
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

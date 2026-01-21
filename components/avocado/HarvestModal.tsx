import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Fonts } from "@/constants/colors";
import { AVOCADO_RARITY_COLORS, AVOCADO_RARITY_NAMES } from "@/constants/avocado";
import AvocadoImage from "./AvocadoImage";
import type { AvocadoSkin, AvocadoSkinRarity } from "@/types/schemas/avocado";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface HarvestModalProps {
  visible: boolean;
  onClose: () => void;
  awardedSkin: AvocadoSkin | null;
  isNewSkin: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Confetti colors based on rarity
const CONFETTI_COLORS = {
  common: ["#4AA859", "#6BC175", "#8DD99E", "#A8E6B8"],
  rare: ["#AEE1F9", "#7DC8F5", "#4BB0E8", "#1A9FDB"],
  epic: ["#FFD700", "#FFC000", "#FFB300", "#FFA000", "#FF8C00"],
};

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  size: number;
}

export default function HarvestModal({
  visible,
  onClose,
  awardedSkin,
  isNewSkin,
  isLoading = false,
  error = null,
  onRetry,
}: HarvestModalProps): React.JSX.Element {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"loading" | "reveal" | "complete">("loading");

  // Animation values
  const avocadoScale = useSharedValue(1);
  const avocadoGlow = useSharedValue(0);
  const avocadoShake = useSharedValue(0);
  const cardScale = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    if (visible && awardedSkin && !error) {
      runHarvestAnimation();
    } else if (!visible) {
      resetAnimations();
    }
  }, [visible, awardedSkin, error]);

  const resetAnimations = () => {
    setAnimationPhase("loading");
    setShowConfetti(false);
    avocadoScale.value = 1;
    avocadoGlow.value = 0;
    avocadoShake.value = 0;
    cardScale.value = 0;
    cardOpacity.value = 0;
    contentOpacity.value = 0;
    badgeScale.value = 0;
  };

  const triggerHaptics = (type: "light" | "medium" | "heavy" | "success") => {
    switch (type) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  };

  const runHarvestAnimation = () => {
    const rarity = awardedSkin?.rarity || "common";
    const isEpic = rarity === "epic";
    const isRare = rarity === "rare";

    // Phase 1: Build-up (0-1500ms)
    setAnimationPhase("reveal");

    // Initial glow build-up
    avocadoGlow.value = withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) });

    // Shake effect (1000-2000ms)
    avocadoShake.value = withDelay(
      1000,
      withSequence(
        ...Array(6).fill(null).flatMap(() => [
          withTiming(8, { duration: 50 }),
          withTiming(-8, { duration: 50 }),
        ]),
        withTiming(0, { duration: 50 })
      )
    );

    // Haptics during shake
    setTimeout(() => triggerHaptics("medium"), 1000);
    setTimeout(() => triggerHaptics("heavy"), 1300);

    // Phase 2: Explosion reveal (2000ms)
    setTimeout(() => {
      avocadoScale.value = withSequence(
        withTiming(1.3, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
      );

      // Show confetti
      setShowConfetti(true);
      triggerHaptics(isEpic ? "heavy" : "success");
    }, 2000);

    // Phase 3: Card reveal (2500ms)
    setTimeout(() => {
      cardOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 12, stiffness: 100 });

      if (isNewSkin) {
        badgeScale.value = withDelay(400, withSpring(1, { damping: 8, stiffness: 150 }));
      }
    }, 2500);

    // Phase 4: Content reveal (3500ms)
    setTimeout(() => {
      contentOpacity.value = withTiming(1, { duration: 500 });
      setAnimationPhase("complete");
    }, 3500);

    // Final haptics
    setTimeout(() => triggerHaptics("success"), 3500);
  };

  const avocadoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: avocadoScale.value },
      { translateX: avocadoShake.value },
    ],
    opacity: avocadoScale.value > 0 ? 1 : 0,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: avocadoGlow.value,
    transform: [{ scale: 1 + avocadoGlow.value * 0.2 }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const getRarityColor = (rarity: AvocadoSkinRarity): string => {
    return AVOCADO_RARITY_COLORS[rarity] || AVOCADO_RARITY_COLORS.common;
  };

  const getRarityName = (rarity: AvocadoSkinRarity): string => {
    return AVOCADO_RARITY_NAMES[rarity] || "Zwykle";
  };

  // Generate confetti particles
  const confettiParticles: ConfettiParticle[] = React.useMemo(() => {
    if (!awardedSkin) return [];
    const colors = CONFETTI_COLORS[awardedSkin.rarity] || CONFETTI_COLORS.common;
    const particleCount = awardedSkin.rarity === "epic" ? 60 : awardedSkin.rarity === "rare" ? 45 : 30;

    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: SCREEN_WIDTH / 2,
      y: SCREEN_HEIGHT / 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      size: Math.random() * 12 + 6,
    }));
  }, [awardedSkin]);

  if (error) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Ups! Cos poszlo nie tak</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Sprobuj ponownie</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeButtonSecondary}>
              <Text style={styles.closeButtonSecondaryText}>Zamknij</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  if (isLoading || !awardedSkin) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[Colors.primary_100, "#2E3A2C"]} style={styles.background} />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Zbieranie...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const rarityColor = getRarityColor(awardedSkin.rarity);
  const rarityName = getRarityName(awardedSkin.rarity);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={[Colors.primary_100, "#2E3A2C"]} style={styles.background} />

        {/* Confetti layer */}
        {showConfetti && (
          <View style={styles.confettiContainer}>
            {confettiParticles.map((particle) => (
              <ConfettiParticle key={particle.id} particle={particle} />
            ))}
          </View>
        )}

        <View style={styles.contentContainer}>
          {/* Animated avocado (during build-up) */}
          {animationPhase !== "complete" && (
            <Animated.View style={[styles.avocadoContainer, avocadoStyle]}>
              <Animated.View style={[styles.glowEffect, glowStyle]} />
              <AvocadoImage phase={5} size="large" showGlow />
            </Animated.View>
          )}

          {/* Skin card (revealed) */}
          <Animated.View style={[styles.cardContainer, cardStyle]}>
            <View style={[styles.card, { borderColor: rarityColor }]}>
              {isNewSkin && (
                <Animated.View style={[styles.newBadge, badgeStyle]}>
                  <Text style={styles.newBadgeText}>NOWA!</Text>
                </Animated.View>
              )}
              <AvocadoImage skinId={awardedSkin.id} size="large" />
              <Text style={styles.skinName}>{awardedSkin.name}</Text>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {rarityName}
              </Text>
            </View>
          </Animated.View>

          {/* Close button */}
          <Animated.View style={[styles.buttonContainer, contentStyle]}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Do kolekcji</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// Individual confetti particle component
function ConfettiParticle({ particle }: { particle: ConfettiParticle }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(particle.rotation);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 200 + Math.random() * 250;
    const distanceX = Math.cos(angle) * velocity;
    const distanceY = Math.sin(angle) * velocity;
    const rotationDistance = (Math.random() - 0.5) * 720;

    translateX.value = withTiming(distanceX, {
      duration: 2000 + Math.random() * 500,
      easing: Easing.out(Easing.quad),
    });

    translateY.value = withSequence(
      withTiming(distanceY * 0.3, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(distanceY + 200, {
        duration: 1700 + Math.random() * 500,
        easing: Easing.in(Easing.quad),
      })
    );

    rotation.value = withTiming(particle.rotation + rotationDistance, {
      duration: 2000 + Math.random() * 500,
      easing: Easing.linear,
    });

    opacity.value = withDelay(
      1500 + Math.random() * 300,
      withTiming(0, { duration: 500 })
    );

    scale.value = withDelay(
      1500 + Math.random() * 300,
      withTiming(0, { duration: 500 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.size / 4,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 100,
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avocadoContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  glowEffect: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  cardContainer: {
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    borderWidth: 4,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  newBadge: {
    position: "absolute",
    top: -12,
    right: -12,
    backgroundColor: Colors.red,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ rotate: "15deg" }],
    zIndex: 10,
  },
  newBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    color: Colors.white,
  },
  skinName: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    color: Colors.primary_700,
    marginTop: 12,
    textAlign: "center",
  },
  rarityText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 30,
  },
  closeButton: {
    backgroundColor: Colors.accent_500,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    fontWeight: "800",
    color: Colors.primary_700,
  },
  loadingContainer: {
    padding: 40,
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  errorContainer: {
    padding: 30,
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    color: Colors.primary_700,
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.accent_500,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  closeButtonSecondary: {
    paddingVertical: 10,
  },
  closeButtonSecondaryText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    fontWeight: "600",
    color: Colors.primary_700_50,
  },
});

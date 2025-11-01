import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  size: number;
}

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

// Fire colors for streak celebration
const COLORS = [
  "#FF6B35", // Bright orange-red
  "#F7931E", // Orange
  "#FFB347", // Light orange
  "#FFD700", // Gold
  "#FF4500", // Red-orange
  "#FF6347", // Tomato red
  "#FF8C00", // Dark orange
  "#FFA500", // Orange
];

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  // More particles and larger sizes for streak celebration
  const particles: ConfettiParticle[] = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    size: Math.random() * 10 + 8, // Larger particles (8-18px) for streak celebration
  }));

  if (!trigger) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          particle={particle}
          onComplete={onComplete}
          isLast={particle.id === particles.length - 1}
        />
      ))}
    </View>
  );
}

function ConfettiParticle({
  particle,
  onComplete,
  isLast,
}: {
  particle: ConfettiParticle;
  onComplete?: () => void;
  isLast: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(particle.rotation);
  const opacity = useSharedValue(1); // Full opacity for streak celebration
  const scale = useSharedValue(1);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2 - Math.PI;
    const velocity = 250 + Math.random() * 200; // More powerful velocity for streak (250-450)
    const distanceX = Math.cos(angle) * velocity;
    const distanceY = Math.sin(angle) * velocity;
    const rotationDistance = (Math.random() - 0.5) * 720; // More rotation for dynamic effect

    translateX.value = withTiming(distanceX, {
      duration: 1800 + Math.random() * 600, // Longer duration for more visible effect
      easing: Easing.out(Easing.quad),
    });

    translateY.value = withSequence(
      withTiming(distanceY * 0.3, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(distanceY, {
        duration: 1500 + Math.random() * 600,
        easing: Easing.in(Easing.quad),
      })
    );

    rotation.value = withTiming(particle.rotation + rotationDistance, {
      duration: 1800 + Math.random() * 600,
      easing: Easing.linear,
    });

    // Start with full opacity for streak celebration
    opacity.value = 1;

    // Fade out later for longer visibility
    opacity.value = withDelay(
      1200 + Math.random() * 400,
      withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      })
    );

    scale.value = withDelay(
      1200 + Math.random() * 400,
      withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      })
    );

    if (isLast && onComplete) {
      setTimeout(() => {
        onComplete?.();
      }, 2400); // Longer duration for streak celebration
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

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

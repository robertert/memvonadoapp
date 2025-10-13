// React and React Native imports
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// Local imports
import { ANIMATION_CONSTANTS, DIMENSIONS } from "./learnScreen.constants";
import { Colors } from "../../constants/colors";
import { FireIcon } from "react-native-heroicons/solid";

interface ProgressBarProps {
  tabBarValue: number;
  progressText: string;
}

export function ProgressBar({ tabBarValue, progressText }: ProgressBarProps) {
  const progress = useSharedValue(Math.max(0, Math.min(100, tabBarValue)));

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, tabBarValue));
    progress.value = withSpring(clamped, {
      damping: 15,
      stiffness: 180,
      mass: 0.7,
      overshootClamping: false,
      restDisplacementThreshold: 0.1,
      restSpeedThreshold: 0.2,
    });
  }, [tabBarValue]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={{ width: "100%", paddingHorizontal: 20, marginBottom: DIMENSIONS.PROGRESS_MARGIN_BOTTOM }}>
      <View
        style={{
          height: ANIMATION_CONSTANTS.PROGRESS_BAR_HEIGHT,
          borderRadius: 10,
          backgroundColor: Colors.accent_500_30,
          position: "relative", // Potrzebne dla pozycjonowania kuleczki
        }}
      >
        <Animated.View
          style={[
            {
              height: "100%",
              backgroundColor: Colors.accent_500,
              borderRadius: 10,
              position: "relative",
              minWidth: '8%',
            },
            barStyle,
          ]}
        >
          {/* Mała jasna kuleczka na końcu progress bara */}
          
            <View
              style={{
                position: "absolute",
                right: 6, // Pozycjonuje kuleczkę na końcu paska
                top: 4.8,   // Centruje pionowo
                width: 15,
                height: 10,
                borderRadius: 6,
              }}
            >
              <View style={{ width: "100%", height: "100%", backgroundColor: Colors.accent_300, borderRadius: 6 }} />
            </View>
          
        </Animated.View>
      </View>
      
    </View>
  );
}

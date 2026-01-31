import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  FadeInDown,
  FadeOutDown
} from "react-native-reanimated";
import type { AvoMood } from "../../hooks/useAvoHelper";

interface AvoFABProps {
  onPress: () => void;
  mood?: AvoMood;
  showBubble: boolean;
}


export default function AvoFAB({ onPress,showBubble, mood = "neutral" }: AvoFABProps): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  
  // 1. Animacja "Lewitacji" (Idling)
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // 2. Styl animowany dla obrazka (lewitacja)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  // Uruchomienie ciągłej animacji lewitacji przy montowaniu
  useEffect(() => {
    // Ruch góra-dół
    translateY.value = withRepeat(
      withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1, // -1 oznacza nieskończoność
      true // true oznacza "reverse" (góra -> dół -> góra)
    );
  }, []);

  useEffect(() => {
    if (showBubble) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [showBubble]);



  return (
    <View style={[styles.container, { bottom: safeArea.bottom + 60 }]}>
      
      {/* Dymek z tekstem (warunkowe renderowanie z animacją wejścia/wyjścia) */}
      {showBubble && (
        <Animated.View 
          entering={FadeInDown.springify()} 
          exiting={FadeOutDown}
          style={styles.bubbleContainer}
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Zapytaj mnie o coś!</Text>
          </View>
          <View style={styles.bubbleArrow} />
        </Animated.View>
      )}

      {/* Przycisk z AVO */}
      <Pressable onPress={onPress}>
        <Animated.Image
          source={require("@/assets/images/avocado/skins/avo-basic.png")}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20, // Trochę więcej marginesu od prawej
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  image: {
    width: 100,
    height: 100,
  },
  // Style dymka
  bubbleContainer: {
    position: "absolute",
    bottom: 100, // Nad awokado
    right: 0,
    alignItems: "flex-end", // Dymek wyrównany do prawej (nad głową)
    width: 200,
  },
  bubble: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4, // "Ogonek" dymka
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  bubbleArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "white",
    transform: [{ rotate: "180deg" }], // Odwrócony trójkąt
    marginRight: 20, // Przesunięcie strzałki w prawo
    marginTop: -1, // Żeby stykało się z dymkiem
  },
});
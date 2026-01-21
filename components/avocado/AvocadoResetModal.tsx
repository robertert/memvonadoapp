import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Fonts } from "@/constants/colors";
import AvocadoImage from "./AvocadoImage";

interface AvocadoResetModalProps {
  visible: boolean;
  onClose: () => void;
  previousDays: number;
}

export default function AvocadoResetModal({
  visible,
  onClose,
  previousDays,
}: AvocadoResetModalProps): React.JSX.Element {
  // Animation values
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dropAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      runResetAnimation();
    } else {
      // Reset animations
      shakeAnim.setValue(0);
      dropAnim.setValue(0);
      fadeAnim.setValue(0);
      contentOpacity.setValue(0);
    }
  }, [visible]);

  const runResetAnimation = () => {
    Animated.sequence([
      // Brief pause
      Animated.delay(200),

      // Shake effect (avocado is wilting)
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      ),

      // Drop/fade effect
      Animated.parallel([
        Animated.timing(dropAnim, {
          toValue: 30,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // Reveal content
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Background gradient - sadder tones */}
        <LinearGradient
          colors={[Colors.primary_100, "#4B5563"]}
          style={styles.background}
        />

        <View style={styles.contentContainer}>
          {/* Animated wilted avocado */}
          <View style={styles.avocadoContainer}>
            <Animated.View
              style={{
                transform: [
                  { translateX: shakeAnim },
                  { translateY: dropAnim },
                ],
                opacity: Animated.subtract(1, Animated.multiply(fadeAnim, 2)),
              }}
            >
              <AvocadoImage phase={1} size="large" wilted />
            </Animated.View>
          </View>

          {/* Text content */}
          <Animated.View style={[styles.textContainer, { opacity: contentOpacity }]}>
            <Text style={styles.title}>Ojej! Twoje awokado zwiedlo</Text>

            <Text style={styles.subtitle}>
              Niestety, przegapiles dzien nauki.{"\n"}
              {previousDays > 0 && (
                <Text style={styles.lostDays}>
                  Straciles {previousDays} {previousDays === 1 ? "dzien" : "dni"} wzrostu.
                </Text>
              )}
            </Text>

            <Text style={styles.motivation}>
              Nie martw sie! Zasadz nowe awokado{"\n"}
              i zacznij od nowa. Tym razem na pewno dasz rade!
            </Text>

            <Pressable onPress={onClose} style={styles.button}>
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Zaczynam od nowa!</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
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
  contentContainer: {
    width: "100%",
    paddingHorizontal: 30,
    alignItems: "center",
  },
  avocadoContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  textContainer: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontFamily: Fonts.primary,
    fontSize: 28,
    fontWeight: "900",
    color: Colors.primary_700,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary_700,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 16,
  },
  lostDays: {
    color: Colors.red,
    fontWeight: "800",
  },
  motivation: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700_50,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  button: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonInner: {
    backgroundColor: Colors.primary_500,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary_700,
  },
});

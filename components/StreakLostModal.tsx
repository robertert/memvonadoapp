import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Easing,
} from "react-native";
import { Colors, Fonts } from "@/constants/colors"; // Twoje stałe
import { LinearGradient } from "expo-linear-gradient";
import { FireIcon } from "react-native-heroicons/solid";
import { XMarkIcon } from "react-native-heroicons/outline";

interface StreakLostModalProps {
  visible: boolean;
  onClose: () => void;
  previousStreak: number; // Ile dni stracono
}

export default function StreakLostModal({
  visible,
  onClose,
  previousStreak,
}: StreakLostModalProps): React.JSX.Element {
  // --- ANIMACJE ---
  const shakeAnim = useRef(new Animated.Value(0)).current; // Do trzęsienia
  const colorProgress = useRef(new Animated.Value(0)).current; // 0 = Ogień, 1 = Popiół
  const scaleAnim = useRef(new Animated.Value(1)).current; // Do pulsowania/zmniejszania
  const contentOpacity = useRef(new Animated.Value(0)).current; // Tekst na dole
  const crackScale = useRef(new Animated.Value(0)).current; // Ikona pęknięcia/X

  useEffect(() => {
    if (visible) {
      runBreakAnimation();
    } else {
      // Reset przy zamknięciu
      shakeAnim.setValue(0);
      colorProgress.setValue(0);
      scaleAnim.setValue(1);
      contentOpacity.setValue(0);
      crackScale.setValue(0);
    }
  }, [visible]);

  const runBreakAnimation = () => {
    Animated.sequence([
      // 1. Cisza przed burzą (chwila wahania)
      Animated.delay(300),

      // 2. Wstrząs (płomień niestabilny)
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: false }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: false }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
        ]),
        { iterations: 6 }
      ),

      // 3. Pęknięcie / Wygaszenie (Równolegle: kolor szary, zmniejszenie, "trzaśnięcie")
      Animated.parallel([
        Animated.timing(colorProgress, {
          toValue: 1, // Przejście do szarego
          duration: 500,
          useNativeDriver: false, // Kolory nie wspierają native driver w starszych wersjach, ale w nowym RN tak. Jeśli błąd -> false
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8, // Lekkie skurczenie (zgaszenie)
          friction: 3,
          useNativeDriver: false,
        }),
        // Efekt uderzenia X
        Animated.spring(crackScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true
        })
      ]),

      // 4. Pojawienie się smutnego tekstu
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Interpolacja koloru: od Ognistego (#FF4500) do Szarego Popiołu (#4B5563)
  const fireColor = colorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FF4500", "#4B5563"],
  });

  // Interpolacja cienia (glow): od jasnego do braku
  const shadowOpacity = colorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Tło - ciemniejsze, smutniejsze */}
        <LinearGradient
          colors={[Colors.primary_100, "#1F2937"]} // Od jasnego do ciemnego grafitu
          style={styles.background}
        />

        <View style={styles.contentContainer}>

          {/* --- SEKCJA ANIMOWANEGO PŁOMIENIA --- */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={{
                transform: [
                  { translateX: shakeAnim }, // Wibracje
                  { scale: scaleAnim },      // Skurczenie
                ],
              }}
            >

              {/* Ikona Szara (Popiół) - domyślnie pod spodem, zawsze widoczna, ale przykryta pomarańczową */}
              <View style={styles.absoluteCenter}>
                <FireIcon size={140} color="#4B5563" />
              </View>

              {/* Ikona Pomarańczowa - zanika (opacity -> 0) */}
              <Animated.View style={{ opacity: Animated.subtract(1, colorProgress) }}>
                <FireIcon size={140} color="#FF4500" style={styles.glow} />
              </Animated.View>
            </Animated.View>

            {/* Ikona "Pęknięcia" / Krzyżyka pojawiająca się na wierzchu */}
            <Animated.View style={[styles.crackOverlay, { transform: [{ scale: crackScale }] }]}>
              <XMarkIcon size={80} color={Colors.primary_100} strokeWidth={4} />
            </Animated.View>
          </View>

          {/* --- TEKST I PRZYCISKI --- */}
          <Animated.View style={[styles.textContainer, { opacity: contentOpacity }]}>
            <Text style={styles.title}>Auć! Seria przerwana</Text>

            <Text style={styles.subtitle}>
              Niestety, wczoraj nie udało się pouczyć.{"\n"}
              Straciłeś serię <Text style={styles.lostStreakNum}>{previousStreak} dni</Text>.
            </Text>

            <Text style={styles.motivation}>
              Nie martw się! To tylko liczba. Wiedza zostaje w głowie.
              Zacznij nową serię już dzisiaj!
            </Text>

            <Pressable onPress={onClose} style={styles.button}>
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Zaczynam od nowa</Text>
              </View>
            </Pressable>

            {/* Opcjonalnie: Przycisk "Użyj zamrażacza" jeśli masz taką funkcję */}
            {/* <Pressable style={styles.secondaryButton}><Text>Mam zamrażacz!</Text></Pressable> */}

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
  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  absoluteCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    // Android elevation nie działa dobrze na SVG, więc głównie iOS shadow
  },
  crackOverlay: {
    position: 'absolute',
    top: 60, // Dostosuj pozycję, żeby X był na środku ognia
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: Fonts.primary,
    fontSize: 32,
    fontWeight: "900",
    color: Colors.primary_700, // Lub biały, jeśli tło jest bardzo ciemne
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
    marginBottom: 24,
  },
  lostStreakNum: {
    color: Colors.accent_500, // Czerwony kolor dla straconej liczby
    fontWeight: "900",
  },
  zeroBadge: {
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  zeroText: {
    fontFamily: Fonts.primary,
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary_700,
  },
  motivation: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700_50, // Bardziej wyblakły tekst
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonInner: {
    backgroundColor: Colors.accent_500,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary_700,
  }
});
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { TrophyIcon } from "react-native-heroicons/solid";

interface ProgressParams {
  completedNewToday?: number;
  completedDueToday?: number;
  empty?: string;
}

export default function victoryScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const progress = params as ProgressParams;

  // Animations
  const trophyScale = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslateY = useRef(new Animated.Value(30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(trophyScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 80,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(statsTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle breathing animation on the main button
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [buttonScale, headerOpacity, statsOpacity, statsTranslateY, trophyScale]);

  function restartHandler(): void {
    // Clear all navigation stack and navigate to myLibraryScreen
    router.dismissAll();
    router.replace({
      pathname: "../stack/myLibraryScreen",
    });
  }

  function goBackHandler(): void {
    router.back();
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_100, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        {progress.empty === "false" ? (
          <>
            <Animated.View
              style={[
                styles.headerContainer,
                {
                  opacity: headerOpacity,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.trophyCircle,
                  {
                    transform: [{ scale: trophyScale }],
                  },
                ]}
              >
                <TrophyIcon size={48} color={Colors.primary_700} />
              </Animated.View>
              <Text style={styles.title}>Świetna robota!</Text>
              <Text style={styles.subtitle}>
                Zrobiłeś dzisiaj solidną robotę z fiszkami.
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.statsContainer,
                {
                  opacity: statsOpacity,
                  transform: [{ translateY: statsTranslateY }],
                },
              ]}
            >
              <View style={styles.insideRow}>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.accent_500 }]}>
                    {(progress.completedNewToday ?? 0) +
                      (progress.completedDueToday ?? 0)}
                  </Text>
                  <Text style={styles.desc}>Razem dzisiaj</Text>
                </View>
              </View>
              <View style={styles.insideRow}>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.accent_500 }]}>
                    {progress.completedNewToday ?? 0}
                  </Text>
                  <Text style={styles.desc}>New</Text>
                </View>
              </View>
              <View style={styles.insideRow}>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.accent_500 }]}>
                    {progress.completedDueToday ?? 0}
                  </Text>
                  <Text style={styles.desc}>Due</Text>
                </View>
              </View>

              <Text style={styles.summaryText}>
                Każda dobra odpowiedź to krok bliżej do trwałej pamięci. Wróć
                jutro, żeby utrwalić materiał jeszcze mocniej.
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              <Pressable onPress={restartHandler}>
                <View style={styles.restartButton}>
                  <Text style={styles.restartText}>Poucz się innej talii</Text>
                </View>
              </Pressable>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View
              style={[
                styles.headerContainer,
                {
                  opacity: headerOpacity,
                },
              ]}
            >
              <Text style={styles.title}>Na dziś to wszystko 🎉</Text>
              <Text style={styles.subtitle}>
                Aktualnie nie masz nic do nauki. To dobry moment na przerwę!
              </Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              <Pressable onPress={goBackHandler}>
                <View style={styles.restartButton}>
                  <Text style={styles.restartText}>Wróć</Text>
                </View>
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    alignItems: "center",
  },
  headerContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  trophyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accent_500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  trophyEmoji: {
    fontSize: 48,
  },
  statsContainer: {
    width: "100%",
    marginTop: 24,
  },
  restartButton: {
    marginTop: 32,
    padding: 20,
    backgroundColor: Colors.accent_500,
    borderRadius: 16,
    minWidth: 220,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  restartText: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  buttonWrapper: {
    marginTop: 24,
  },
  insideRow: {
    width: "100%",
    flexDirection: "row",
    marginVertical: 10,
    justifyContent: "space-around",
  },
  insideSection: {
    alignItems: "center",
  },
  desc: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary_700,
    marginTop: 4,
  },
  num: {
    fontFamily: Fonts.primary,
    fontSize: 32,
    fontWeight: "900",
  },
  title: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 30,
    fontWeight: "900",
    marginHorizontal: 20,
    marginTop: 30,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 20,
    fontWeight: "600",
    marginHorizontal: 28,
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 26,
  },
  summaryText: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 24,
    marginTop: 20,
    lineHeight: 22,
  },
});

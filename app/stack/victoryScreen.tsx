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

interface ProgressParams {
  easy?: string;
  good?: string;
  hard?: string;
  all?: string;
  todo?: string;
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
    router.replace({
      pathname: "../stack/learnScreen",
      params: { id: "jLoSnjEekqUFYzKCuEEP" },
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
        {!progress.empty ? (
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
                <Text style={styles.trophyEmoji}>🏆</Text>
              </Animated.View>
              <Text style={styles.title}>Świetna robota!</Text>
              <Text style={styles.subtitle}>
                Zrobiłeś dzisiaj solidną robotę z fiszkami. Tak wyglądają Twoje
                odpowiedzi:
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
                  <Text style={[styles.num, { color: Colors.blue }]}>
                    {progress.easy}
                  </Text>
                  <Text style={styles.desc}>Easy</Text>
                </View>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.green }]}>
                    {progress.good}
                  </Text>
                  <Text style={styles.desc}>Good</Text>
                </View>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.yellow }]}>
                    {progress.hard}
                  </Text>
                  <Text style={styles.desc}>Hard</Text>
                </View>
              </View>

              <View style={styles.insideRow}>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.white }]}>
                    {progress.all}
                  </Text>
                  <Text style={styles.desc}>Razem dzisiaj</Text>
                </View>
                <View style={styles.insideSection}>
                  <Text style={[styles.num, { color: Colors.white }]}>
                    {progress.todo}
                  </Text>
                  <Text style={styles.desc}>Zostało na później</Text>
                </View>
              </View>

              <Text style={styles.summaryText}>
                Każda dobra odpowiedź to krok bliżej do trwałej pamięci. Wróć
                jutro, żeby utrwalić materiał jeszcze mocniej. 💪
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
                  <Text style={styles.restartText}>
                    Powtórz dzisiejszą sesję
                  </Text>
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
    marginBottom: 16,
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
    borderRadius: 20,
    minWidth: 220,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  restartText: {
    color: Colors.white,
    fontFamily: Fonts.primary,
    fontSize: 16,
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
    fontSize: 20,
    color: Colors.primary_700,
  },
  num: {
    fontFamily: Fonts.primary,
    fontSize: 32,
  },
  title: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 35,
    marginHorizontal: 20,
    marginTop: 30,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 20,
    marginHorizontal: 28,
    marginTop: 12,
    marginBottom: 16,
  },
  summaryText: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 16,
    marginHorizontal: 24,
    marginTop: 12,
  },
});

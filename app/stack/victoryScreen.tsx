import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { TrophyIcon, FireIcon } from "react-native-heroicons/solid";
import { UpdateUserStreakIfQualifiedResponse } from "@/types/schemas/api/user";
import { cloudFunctions } from "@/services/cloudFunctions";
import { AVOCADO_PHASE_NAMES, AVOCADO_TOTAL_DAYS } from "@/constants/avocado";

// Typ odpowiedzi z Twojej Cloud Function
interface ProgressParams {
  completedNewToday?: string;
  completedDueToday?: string;
  empty?: string;
  // All in One mode params
  mode?: string;
  totalCards?: string;
  wrongAttempts?: string;
  sessionTimeMs?: string;
}

export default function VictoryScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams() as unknown as ProgressParams;

  // Parsowanie parametrów sesji (te zostają lokalne)
  const newCards = parseInt(params.completedNewToday || "0", 10);
  const dueCards = parseInt(params.completedDueToday || "0", 10);
  const totalCards = newCards + dueCards;
  const isEmpty = params.empty === "true";

  // All in One mode params
  const isAllInOneMode = params.mode === "all_in_one";
  const allInOneTotalCards = parseInt(params.totalCards || "0", 10);
  const allInOneWrongAttempts = parseInt(params.wrongAttempts || "0", 10);
  const allInOneSessionTimeMs = parseInt(params.sessionTimeMs || "0", 10);

  // Format session time as mm:ss
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // --- STANY ---
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] =
    useState<UpdateUserStreakIfQualifiedResponse | null>(null);

  // Stan widoku: 'streak' (ogień), 'avocado' (wzrost awokado) lub 'stats' (puchar)
  // Jeśli sesja była pusta, od razu idziemy do stats (bez fetcha streaka)
  const [viewState, setViewState] = useState<"streak" | "avocado" | "stats">(
    isEmpty ? "stats" : "streak"
  );

  // --- ANIMACJE ---
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const fireScale = useRef(new Animated.Value(0)).current;
  const fireOpacity = useRef(new Animated.Value(0)).current;
  const streakTextOpacity = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Avocado animations
  const avocadoScale = useRef(new Animated.Value(0)).current;
  const avocadoOpacity = useRef(new Animated.Value(0)).current;
  const avocadoTextOpacity = useRef(new Animated.Value(0)).current;
  const avocadoGlowOpacity = useRef(new Animated.Value(0)).current;

  // Licznik dni do wyświetlenia
  const [displayStreak, setDisplayStreak] = useState(0);

  // 1. Fetchowanie danych przy starcie (tylko jeśli nie jest empty)
  useEffect(() => {
    if (isEmpty) {
      setLoading(false);
      return;
    }

    const fetchStreakData = async () => {
      try {
        const data = await cloudFunctions.updateUserStreakIfQualified();
        console.log("Streak data:", data);     
        setStreakData(data);
        setDisplayStreak(
          data.updated ? data.currentStreak - 1 : data.currentStreak
        );
      } catch (error) {
        console.error("Failed to fetch streak:", error);
        // W razie błędu pomijamy ekran streaka i idziemy do statystyk
        setViewState("stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [isEmpty]);

  // 2. Zarządzanie animacjami w zależności od viewState i loading
  useEffect(() => {
    if (loading) return;

    if (viewState === "streak" && streakData) {
      runStreakAnimation();
    } else if (viewState === "avocado" && streakData) {
      runAvocadoAnimation();
    } else {
      runStatsAnimation();
    }
  }, [loading, viewState, streakData]);

  // --- Logika Animacji Streaka ---
  const runStreakAnimation = () => {
    if (!streakData) return;

    Animated.parallel([
      Animated.spring(fireScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fireOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Jeśli streak został zaktualizowany właśnie teraz -> Efekt WOW
      if (streakData.updated) {
        setTimeout(() => {
          setDisplayStreak(streakData.currentStreak); // Zmiana liczby
          // Puls ognia
          Animated.sequence([
            Animated.timing(fireScale, {
              toValue: 1.3,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(fireScale, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }, 500);
      }

      // Pokaż tekst
      Animated.timing(streakTextOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Czekaj i przejdź dalej
      // Dajemy więcej czasu (3.5s) na radość jeśli sukces, mniej (2.5s) jeśli info
      const delay = streakData.updated ? 4000 : 3500;

      setTimeout(() => {
        fadeOutStreakAndSwitch();
      }, delay);
    });
  };

  const fadeOutStreakAndSwitch = () => {
    Animated.parallel([
      Animated.timing(fireOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(streakTextOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // If avocado grew, show avocado view, otherwise go to stats
      if (streakData?.avocadoGrew) {
        setViewState("avocado");
      } else {
        setViewState("stats");
      }
    });
  };

  // --- Logika Animacji Awokado ---
  const runAvocadoAnimation = () => {
    if (!streakData) return;

    // Reset animations
    avocadoScale.setValue(0);
    avocadoOpacity.setValue(0);
    avocadoTextOpacity.setValue(0);
    avocadoGlowOpacity.setValue(0);

    // Show avocado with bounce
    Animated.parallel([
      Animated.spring(avocadoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(avocadoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase change effect - pulse and glow
      Animated.sequence([
        Animated.parallel([
          Animated.timing(avocadoGlowOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(avocadoScale, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(avocadoScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(avocadoGlowOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Show text
      Animated.timing(avocadoTextOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Wait and transition to stats
      setTimeout(() => {
        fadeOutAvocadoAndSwitch();
      }, 3500);
    });
  };

  const fadeOutAvocadoAndSwitch = () => {
    Animated.parallel([
      Animated.timing(avocadoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(avocadoTextOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setViewState("stats");
    });
  };

  // --- Logika Animacji Statystyk ---
  const runStatsAnimation = () => {
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
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentTranslateY, {
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

    // Breathing button
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.04,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  function restartHandler(): void {
    router.dismissAll();
    router.replace({ pathname: "../stack/myLibraryScreen" });
  }

  function goBackHandler(): void {
    router.back();
  }

  // --- Render Awokado ---
  const renderAvocadoContent = () => {
    if (!streakData) return null;

    const currentPhase = streakData.avocadoCurrentPhase || 1;
    const previousPhase = streakData.avocadoPreviousPhase || 1;
    const consecutiveDays = streakData.avocadoConsecutiveDays || 0;
    const canHarvest = streakData.avocadoCanHarvest || false;
    const phaseChanged = currentPhase > previousPhase;

    const phaseName = AVOCADO_PHASE_NAMES[currentPhase] || "Pestka";

    return (
      <View style={[styles.centerContent, { paddingTop: 60 }]}>
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.avocadoGlow,
            {
              opacity: avocadoGlowOpacity,
              transform: [{ scale: avocadoScale }],
            },
          ]}
        />

        <Animated.View
          style={{
            transform: [{ scale: avocadoScale }],
            opacity: avocadoOpacity,
            alignItems: "center",
          }}
        >
          <Image
            source={require("@/assets/memvocadoicon.png")}
            style={styles.avocadoImage}
            resizeMode="contain"
          />
          <View style={styles.avocadoDaysBadge}>
            <Text style={styles.avocadoDaysNumber}>
              {consecutiveDays}/{AVOCADO_TOTAL_DAYS}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: avocadoTextOpacity,
            alignItems: "center",
            marginTop: 30,
          }}
        >
          {canHarvest ? (
            <>
              <Text style={[styles.avocadoTitle, { color: Colors.accent_500 }]}>
                Gotowe do zbioru!
              </Text>
              <Text style={styles.avocadoSubtitle}>
                Twoje awokado dojrzalo.{"\n"}Zbierz je na stronie glownej!
              </Text>
            </>
          ) : phaseChanged ? (
            <>
              <Text style={styles.avocadoTitle}>Awokado rosnie!</Text>
              <Text style={styles.avocadoSubtitle}>
                Faza {currentPhase}: {phaseName}
              </Text>
              <Text style={[styles.avocadoSubtitle, { marginTop: 8 }]}>
                Dzien {consecutiveDays} z {AVOCADO_TOTAL_DAYS}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.avocadoTitle}>Dzien zaliczony!</Text>
              <Text style={styles.avocadoSubtitle}>
                Faza {currentPhase}: {phaseName}
              </Text>
              <Text style={[styles.avocadoSubtitle, { marginTop: 8 }]}>
                Dzien {consecutiveDays} z {AVOCADO_TOTAL_DAYS}
              </Text>
            </>
          )}
        </Animated.View>
      </View>
    );
  };

  // --- Render Streaka ---
  const renderStreakContent = () => {
    if (!streakData) return null;

    // Obliczamy brakujące karty (threshold - todayCount)
    // todayCount pochodzi z backendu, threshold też
    const count = streakData.todayCount || 0;
    const missing = Math.max(0, streakData.threshold - count);

    const isStreak = streakData.qualified;
    const isNewStreak = streakData.updated;

    return (
      <View style={[styles.centerContent, { paddingTop: 60 }]}>
        <Animated.View
          style={{
            transform: [{ scale: fireScale }],
            opacity: fireOpacity,
            alignItems: "center",
          }}
        >
          <FireIcon
            size={120}
            // Jeśli updated=true -> Pomarańczowy, Jeśli nie -> Szary
            color={isStreak ? "#FF4500" : Colors.primary_700_30}
            style={{
              shadowColor: isStreak ? "#FF4500" : "transparent",
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          />
          <View style={styles.streakCountBadge}>
            <Text style={styles.streakCountNumber}>{displayStreak}</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: streakTextOpacity,
            alignItems: "center",
            marginTop: 30,
          }}
        >
          {isNewStreak ? (
            <>
              <Text style={styles.streakTitle}> Seria podtrzymana! </Text>
              <Text style={styles.streakSubtitle}>Kolejny dzień z głowy.</Text>
            </>
          ) : isStreak ? (
            <>
              <Text style={styles.streakTitle}> Świetna robota! </Text>
            </>
          ) : (
            <>
              <Text
                style={[styles.streakTitle, { color: Colors.primary_700_30 }]}
              >
                Ogień przygasa...
              </Text>
              <Text style={styles.streakSubtitle}>
                Zrobiłeś dzisiaj {count} / {streakData.threshold} kart.
                {"\n"}Jeszcze{" "}
                <Text style={{ fontWeight: "bold", color: Colors.accent_500 }}>
                  {missing}
                </Text>
                , by zaliczyć dzień!
              </Text>
            </>
          )}
        </Animated.View>
      </View>
    );
  };

  // --- Render Stats ---
  const renderStatsContent = () => {
    if (isEmpty) {
      return (
        <>
          <Animated.View
            style={[styles.headerContainer, { opacity: headerOpacity }]}
          >
            <Text style={styles.title}>Na dziś to wszystko </Text>
            <Text style={styles.subtitle}>
              Aktualnie nie masz nic do nauki.
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            <Pressable onPress={goBackHandler}>
              <View style={styles.restartButton}>
                <Text style={styles.restartText}>Wróć</Text>
              </View>
            </Pressable>
          </Animated.View>
        </>
      );
    }

    // All in One mode specific stats
    if (isAllInOneMode) {
      return (
        <>
          <Animated.View
            style={[styles.headerContainer, { opacity: headerOpacity }]}
          >
            <Animated.View
              style={[
                styles.trophyCircle,
                { transform: [{ scale: trophyScale }] },
              ]}
            >
              <TrophyIcon size={48} color={Colors.primary_700} />
            </Animated.View>
            <Text style={styles.title}>Sesja zakończona!</Text>
            <Text style={styles.subtitle}>
              Wszystkie karty zaliczone.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: statsOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <View style={styles.insideRow}>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.accent_500 }]}>
                  {allInOneTotalCards}
                </Text>
                <Text style={styles.desc}>Karty zaliczone</Text>
              </View>
            </View>
            <View style={styles.insideRow}>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.accent_500 }]}>
                  {allInOneWrongAttempts}
                </Text>
                <Text style={styles.desc}>Błędne próby</Text>
              </View>
            </View>

            <Text style={styles.summaryText}>
              Świetna robota! Przećwiczone wszystkie karty w jednej sesji.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            <Pressable onPress={restartHandler}>
              <View style={styles.restartButton}>
                <Text style={styles.restartText}>Poucz się innej talii</Text>
              </View>
            </Pressable>
          </Animated.View>
        </>
      );
    }

    // SRS mode stats (original)
    return (
      <>
        <Animated.View
          style={[styles.headerContainer, { opacity: headerOpacity }]}
        >
          <Animated.View
            style={[
              styles.trophyCircle,
              { transform: [{ scale: trophyScale }] },
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
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={styles.insideRow}>
            <View style={styles.insideSection}>
              <Text style={[styles.num, { color: Colors.accent_500 }]}>
                {totalCards}
              </Text>
              <Text style={styles.desc}>Razem dzisiaj</Text>
            </View>
          </View>
          <View style={styles.insideRow}>
            <View style={styles.insideSection}>
              <Text style={[styles.num, { color: Colors.accent_500 }]}>
                {newCards}
              </Text>
              <Text style={styles.desc}>Nowe</Text>
            </View>
          </View>
          <View style={styles.insideRow}>
            <View style={styles.insideSection}>
              <Text style={[styles.num, { color: Colors.accent_500 }]}>
                {dueCards}
              </Text>
              <Text style={styles.desc}>Powtórki</Text>
            </View>
          </View>

          <Text style={styles.summaryText}>
            Każda dobra odpowiedź to krok bliżej do trwałej pamięci. Wróć jutro!
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonWrapper,
            { transform: [{ scale: buttonScale }] },
          ]}
        >
          <Pressable onPress={restartHandler}>
            <View style={styles.restartButton}>
              <Text style={styles.restartText}>Poucz się innej talii</Text>
            </View>
          </Pressable>
        </Animated.View>
      </>
    );
  };

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_100, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={Colors.accent_500} />
            <Text
              style={{
                marginTop: 20,
                fontFamily: Fonts.primary,
                color: Colors.primary_700,
              }}
            >
              Zapisywanie postępów...
            </Text>
          </View>
        ) : viewState === "streak" ? (
          renderStreakContent()
        ) : viewState === "avocado" ? (
          renderAvocadoContent()
        ) : (
          renderStatsContent()
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
    width: "100%",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 100,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  // --- Style Streaka ---
  streakCountBadge: {
    position: "absolute",
    bottom: -10,
    backgroundColor: Colors.primary_100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_700_30,
  },
  streakCountNumber: {
    fontFamily: Fonts.primary,
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary_700,
  },
  streakTitle: {
    fontFamily: Fonts.primary,
    fontSize: 28,
    fontWeight: "900",
    color: "#FF4500",
    textAlign: "center",
    marginBottom: 8,
  },
  streakSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary_700,
    textAlign: "center",
    lineHeight: 24,
  },

  // --- Style Istniejące ---
  headerContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24,
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
  // --- Style Awokado ---
  avocadoImage: {
    width: 140,
    height: 140,
  },
  avocadoGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.accent_500,
    shadowColor: Colors.accent_500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  avocadoDaysBadge: {
    position: "absolute",
    bottom: -10,
    backgroundColor: Colors.primary_100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_500,
  },
  avocadoDaysNumber: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary_700,
  },
  avocadoTitle: {
    fontFamily: Fonts.primary,
    fontSize: 28,
    fontWeight: "900",
    color: Colors.primary_500,
    textAlign: "center",
    marginBottom: 8,
  },
  avocadoSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary_700,
    textAlign: "center",
    lineHeight: 24,
  },
});

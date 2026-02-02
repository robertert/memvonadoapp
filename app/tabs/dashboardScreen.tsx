import React, { useContext, useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { CATEGORY_OPTIONS } from "@/constants/settings";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { BellIcon, FireIcon, LanguageIcon } from "react-native-heroicons/solid";
import PieChart from "../../components/CustomPieChart";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import {
  placeholderDecks,
  placeholderDecksLearningData,
} from "../../constants/placeholderData";
import {
  DeckSchema,
  UserProgress,
  Deck,
  DeckLearningData,
  UserDailyStats,
} from "@/types";
import { calculateDailyStatsProgress } from "@/constants/dailyStats";
import AvocadoGrowthWidget from "@/components/avocado/AvocadoGrowthWidget";
import type { GetAvocadoStatusResponse } from "@/types/schemas/avocado";
import { AVOCADO_REFRESH_DASHBOARD_KEY } from "@/constants/avocado";

export default function decksScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [decks, setDecks] = useState<DeckLearningData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefresh, setIsRefresh] = useState<boolean>(false);
  const [userProgress, setUserProgress] = useState<UserProgress>();
  const [dailyUserStats, setDailyUserStats] = useState<UserDailyStats | null>(
    null
  );
  const [avocadoStatus, setAvocadoStatus] = useState<GetAvocadoStatusResponse | null>(null);
  const [avocadoLoading, setAvocadoLoading] = useState<boolean>(false);
  const userCtx = useContext(UserContext);

  useEffect(() => {
    fetchDecks();
  }, []);

  // Sprawdź czy trzeba odświeżyć po zbiorze awokado
  useFocusEffect(
    useCallback(() => {
      const checkRefreshFlag = async () => {
        try {
          const shouldRefresh = await AsyncStorage.getItem(AVOCADO_REFRESH_DASHBOARD_KEY);
          if (shouldRefresh === "true") {
            await AsyncStorage.removeItem(AVOCADO_REFRESH_DASHBOARD_KEY);
            // Lokalnie resetuj status awokado (faza 1, 0 dni)
            setAvocadoStatus((prev) =>
              prev
                ? {
                  ...prev,
                  currentPhase: 1,
                  consecutiveDays: 0,
                  canHarvest: false,
                  totalHarvests: prev.totalHarvests + 1,
                }
                : null
            );
            // Odśwież dane z serwera w tle
            if (userCtx.id) {
              try {
                const avocadoStatus = await cloudFunctions.getAvocadoStatus();
                setAvocadoStatus(avocadoStatus);
              } catch (avocadoErr) {
                console.log("Failed to fetch avocado status:", avocadoErr);
              }
            }
          }
        } catch (err) {
          console.log("Error checking refresh flag:", err);
        }
      };
      checkRefreshFlag();
    }, [userCtx.id])
  );

  async function fetchDecks(): Promise<void> {
    try {
      setIsLoading(true);
      if (PLACEHOLDER_MODE || !userCtx.id) {
        // Tryb placeholder lub brak użytkownika: pokaż deki demo
        setDecks(placeholderDecksLearningData);
      } else if (userCtx.id) {
        // Get user progress and statistics from Cloud Function
        const [fetchedUserProgress, fetchedUserDecks, fetchedDailyUserStats] =
          await Promise.all([
            cloudFunctions.getUserProgress(userCtx.id),
            cloudFunctions.getUserDecks(userCtx.id),
            cloudFunctions.getDailyUserStats(),
          ]);
        setUserProgress(fetchedUserProgress);
        setDecks(fetchedUserDecks.decks);
        setDailyUserStats(fetchedDailyUserStats);

        // Fetch avocado status separately (non-blocking)
        try {
          setAvocadoLoading(true);
          const avocadoData = await cloudFunctions.getAvocadoStatus();
          setAvocadoStatus(avocadoData);
        } catch (avocadoErr) {
          console.log("Failed to fetch avocado status:", avocadoErr);
        } finally {
          setAvocadoLoading(false);
        }
      }

      setIsLoading(false);
    } catch (e) {
      console.log(e);
      // W trybie demo pokaż placeholdery zamiast błędu
      if (PLACEHOLDER_MODE) {
        setDecks(placeholderDecksLearningData);
      } else {
        Alert.alert("Error", "Try again later");
      }
      setIsLoading(false);
    }
  }

  function openDeckHandler(gotDeck: DeckLearningData): void {
    if (!gotDeck) return;
    router.push({
      pathname: "../stack/deckDetails",
      params: { deckId: gotDeck.id },
    });
  }

  function shorten(text: string): string {
    if (text) {
      if (text.length < 10) {
        return text;
      } else {
        return text.slice(0, 8) + "...";
      }
    } else {
      return "";
    }
  }

  async function refreshHandler(): Promise<void> {
    setIsRefresh(true);
    await fetchDecks();
    setIsRefresh(false);
  }

  function pressLearnHandler(): void {
    if (decks && decks.length > 0) {
      router.push({
        pathname: "../stack/learnScreen",
        params: {
          deckId: userProgress?.recentSessions[0].deckId || decks[0].id,
        },
      });
    }
  }

  function handleAvocadoHarvest(): void {
    // Navigate to tabs layout which handles the harvest modal
    router.push({
      pathname: "/tabs",
      params: { triggerHarvest: "true" },
    });
  }

  return (
    <GestureHandlerRootView
      style={[styles.container, { paddingTop: safeArea.top + 8 }]}
    >
      {isLoading ? (
        <ActivityIndicator
          style={{ marginTop: 100 }}
          color={Colors.accent_500}
          size={"large"}
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={isRefresh} onRefresh={refreshHandler} />
          }
          style={{ flex: 1, width: "100%" }}
        >
          <View style={styles.topContainer}>
            <Text style={styles.title}>Daily goal</Text>
            <View style={styles.topIconsContainer}>
              <Pressable
                onPress={() => {
                  router.push({ pathname: "../stack/notificationsScreen" });
                }}
              >
                <BellIcon size={36} color={Colors.primary_700} />
              </Pressable>
            </View>
          </View>
          <View style={styles.dailyGoalContainer}>
            <View style={styles.dailyGoalSectionContainer}>
              <Text style={styles.dailyGoalText}>
                {userProgress?.stats.currentStreak}
              </Text>
              <FireIcon size={36} color={Colors.red} />
            </View>
            <View style={styles.dailyGoalSectionContainer}>
              <Text style={styles.dailyGoalText}>
                {(dailyUserStats?.completedNewToday ?? 0) +
                  (dailyUserStats?.completedDueToday ?? 0)}{" "}
                / {userProgress?.dailyGoal}{" "}
              </Text>
              <MaterialCommunityIcons
                name="cards"
                size={36}
                color={Colors.primary_700}
              />
            </View>
          </View>
          <Pressable onPress={pressLearnHandler} style={styles.learnButton}>
            <View style={styles.learnButtonContainer}>
              <Text style={styles.learnButtonText}>Learn</Text>
            </View>
          </Pressable>
          {/* Avocado Growth Widget */}
          <AvocadoGrowthWidget
            status={avocadoStatus}
            onHarvest={handleAvocadoHarvest}
            isLoading={avocadoLoading}
          />
          <Text style={styles.subtitle}>Your decks</Text>
          <View style={styles.decksList}>
            {decks?.slice(0, 2).map((deck) => {
              return (
                <Pressable key={deck.id} onPress={() => openDeckHandler(deck)}>
                  <View style={styles.deckContainer}>
                    <Text style={styles.deckTextTitle}>
                      {deck.title || "Untitled Deck"}
                    </Text>
                    <View style={styles.chartContainer}>
                      <PieChart
                        percentage={calculateDailyStatsProgress(
                          deck.dailyStats || null
                        )}
                        radius={35}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => {
              router.push({
                pathname: "../stack/myLibraryScreen",
              });
            }}
          >
            <Text style={styles.subtext}>Show More</Text>
          </Pressable>
          <Text style={styles.subtitle}>Categories</Text>
          <ScrollView horizontal={true}>
            <View style={styles.categoriesContainer}>
              {CATEGORY_OPTIONS.map((category: string) => {
                return (
                  <Pressable
                    key={category}
                    onPress={() => {
                      router.push({
                        pathname: "../tabs/searchScreen",
                        params: { category: category },
                      });
                    }}
                  >
                    <View style={styles.categoryContainer}>
                      <LanguageIcon size={40} color={Colors.primary_700} />
                      <Text style={styles.categoryText}>
                        {shorten(category)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: Colors.primary_100,
  },
  topContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 30,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  topIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dailyGoalContainer: {
    width: "100%",
    height: 60,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  dailyGoalText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginRight: 10,
    fontWeight: "900",
  },
  dailyGoalSectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  learnButton: {
    width: "40%",
    alignSelf: "center",
  },
  learnButtonContainer: {
    marginTop: 24,
    width: "100%",
    height: 50,
    backgroundColor: Colors.accent_500,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  learnButtonText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  decksList: {
    width: "100%",
  },
  deckContainer: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    marginTop: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    color: Colors.primary_700,
    marginTop: 20,
  },
  deckChart: {
    width: 100,
    height: 100,
    backgroundColor: Colors.primary_700,
    borderRadius: 50,
  },
  categoriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  categoryContainer: {
    width: 90,
    height: 90,
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chartContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  deckTextTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    width: "70%",
  },
  categoryText: {
    fontSize: 15,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginTop: 10,
  },
  subtext: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
});

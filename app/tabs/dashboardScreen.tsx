import React, { useContext, useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Colors, Fonts, Subjects } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, ScrollView } from "react-native";
import { router } from "expo-router";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { BellIcon, FireIcon, LanguageIcon } from "react-native-heroicons/solid";
import PieChart from "../../ui/CustomPieChart";

interface Deck {
  id: string;
  title: string;
  views: number;
  likes: number;
  saved?: boolean;
  [key: string]: any;
}

export default function decksScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [pinned, setPinned] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefresh, setIsRefresh] = useState<boolean>(false);

  const userCtx = useContext(UserContext);

  useEffect(() => {
    fetchDecks();
  }, []);

  async function fetchDecks(): Promise<void> {
    try {
      setIsLoading(true);

      if (userCtx.id) {
        // Get user progress and statistics from Cloud Function
        const [userProgress, userDecks] = await Promise.all([
          cloudFunctions.getUserProgress(userCtx.id),
          cloudFunctions.getUserDecks(userCtx.id)
        ]);
        
        console.log("User decks:", userDecks);
        
        // Transform decks data to match expected format
        const readyDecks: Deck[] = userDecks.decks.map(deck => ({
          id: deck.id,
          title: deck.title || "Untitled Deck",
          views: deck.views || 0,
          likes: deck.likes || 0,
          saved: deck.saved || false,
          ...deck
        }));
        
        // For now, consider all decks as unpinned (you can add pinning logic later)
        const readyPinned: Deck[] = [];
        
        // You can use userProgress.stats for statistics display
        console.log("User stats:", userProgress.stats);
        console.log("Study streak:", userProgress.streak);
        console.log("User decks:", readyDecks.length);
        
        setDecks(readyDecks);
        setPinned(readyPinned);
      }
      
      setIsLoading(false);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Try again later");
      setIsLoading(false);
    }
  }


  function openDeckHandler(gotDeck: Deck): void {
    router.push({
      pathname: "../stack/learnScreen",
      params: { id: gotDeck.id },
    });
  }

  function savedHandeler(gotDeck: Deck): void {
    setDecks((prev) => {
      let newVal = [...prev];
      newVal = newVal.map((deck) => {
        if (gotDeck.id === deck.id) {
          deck.saved = !deck.saved;
        }
        return deck;
      });
      return newVal;
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
    if (decks.length > 0) {
      router.push({
        pathname: "../stack/learnScreen",
        params: { deckId: decks[0].id },
      });
    }
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
              <Pressable onPress={() => {}}>
                <BellIcon size={36} color={Colors.primary_700} />
              </Pressable>
            </View>
          </View>
          <View style={styles.dailyGoalContainer}>
            <View style={styles.dailyGoalSectionContainer}>
              <Text style={styles.dailyGoalText}>4</Text>
              <FireIcon size={36} color={Colors.red} />
            </View>
            <View style={styles.dailyGoalSectionContainer}>
              <Text style={styles.dailyGoalText}>100 / 120</Text>
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
          <Text style={styles.subtitle}>Your decks</Text>
          <View style={styles.decksList}>
            {decks.slice(0, 2).map((deck: Deck) => {
              return (
                <Pressable key={deck.id} onPress={() => openDeckHandler(deck)}>
                  <View style={styles.deckContainer}>
                    <Text style={styles.deckTextTitle}>
                      {deck.title || "Untitled Deck"}
                    </Text>
                    <View style={styles.chartContainer}>
                      <PieChart percentage={50} radius={35} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.subtext}>Show More</Text>
          <Text style={styles.subtitle}>Categories</Text>
          <ScrollView horizontal={true}>
            <View style={styles.categoriesContainer}>
              {Subjects.map((category: string) => {
                return (
                  <Pressable
                    key={category}
                    onPress={() => {
                      router.push({
                        pathname: "../stack/searchScreen",
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
    paddingHorizontal: 15,
    alignItems: "center",
    backgroundColor: Colors.primary_100,
  },
  topContainer: {
    marginTop: 10,
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

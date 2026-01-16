import React, { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import { placeholderDecks } from "../../constants/placeholderData";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/solid";

import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";
import type { DeckLearningData } from "@/types";
import { CATEGORY_OPTIONS } from "../../constants/settings";

export default function MyLibraryScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [backendDecks, setBackendDecks] = useState<DeckLearningData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { key: "all", name: "Wszystkie" },
    ...CATEGORY_OPTIONS.map((cat) => ({ key: cat, name: cat })),
  ];

  useEffect(() => {
    if (PLACEHOLDER_MODE || !userCtx.id) {
      return;
    }

    let isMounted = true;

    const fetchUserDecks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await cloudFunctions.getUserDecks(userCtx.id as string);
        if (!isMounted) return;
        setBackendDecks(result.decks || []);
      } catch (e) {
        console.error("Error fetching user decks:", e);
        if (isMounted) {
          setError("Nie udało się pobrać talii. Spróbuj ponownie później.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserDecks();

    return () => {
      isMounted = false;
    };
  }, [userCtx.id]);

  const filteredDecks = backendDecks.filter((deck) => {
    const matchesSearch = deck.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || deck.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderDeckItem = ({ item }: { item: DeckLearningData }) => (
    <Pressable
      style={styles.deckCard}
      onPress={() => {
        // Navigate to deck details
        router.push(`../stack/deckDetails?deckId=${item.id}`);
      }}
    >
      <View style={styles.deckHeader}>
        <MaterialCommunityIcons
          name="cards"
          size={24}
          color={Colors.primary_700}
        />
        <View style={styles.deckInfo}>
          <Text style={styles.deckName}>{item.title}</Text>
          <Text style={styles.deckStats}>
            {item.cardsNum} kart • {item.lastReviewDate?.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.deckActions}>
          <MaterialCommunityIcons
            name="play"
            size={20}
            color={Colors.primary_700}
          />
        </View>
      </View>

      <View style={styles.deckFooter}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Dzisiejszy postęp:{" "}
            {Math.round(
              item.dailyStats?.completedToday
                ? (item.dailyStats?.completedToday * 100) /
                    (item.dailyStats?.completedToday +
                      item.dailyStats?.inProgressDueCards +
                      item.dailyStats?.inProgressNewCards +
                      item.dailyStats?.dueCardsRemaining +
                      item.dailyStats?.newCardsRemaining)
                : 0
            )}
            %{" "}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    item.dailyStats?.completedToday
                      ? (item.dailyStats?.completedToday * 100) /
                        (item.dailyStats?.dueCardsRemaining +
                          item.dailyStats?.inProgressDueCards +
                          item.dailyStats?.inProgressNewCards +
                          item.dailyStats?.newCardsRemaining +
                          item.dailyStats?.completedToday || 1)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeftIcon size={24} color={Colors.primary_700} />
        </Pressable>
        <Text style={styles.headerTitle}>Moja biblioteka</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MagnifyingGlassIcon size={20} color={Colors.primary_500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj decków..."
            placeholderTextColor={Colors.primary_500}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoriesContainer, { flexShrink: 0 }]}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category.key &&
                  styles.categoryButtonTextActive,
              ]}
            >
              {category.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>
          Twoje decki ({filteredDecks.length})
        </Text>

        {!PLACEHOLDER_MODE && isLoading && (
          <ActivityIndicator
            size="large"
            color={Colors.accent_500}
            style={{ marginBottom: 12 }}
          />
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <FlatList
          data={filteredDecks}
          renderItem={renderDeckItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.decksList}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
  },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 15,
    backgroundColor: Colors.primary_100,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingVertical: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary_500,
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
  },
  categoriesContainer: {
    marginBottom: 20,
    maxHeight: 40,
    overflow: "hidden",
  },
  categoriesContent: {
    paddingRight: 15,
    maxHeight: 40,
    overflow: "hidden",
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary_500,
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary_700,
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: Colors.primary_100,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 15,
  },
  decksList: {
    paddingBottom: 20,
  },
  deckCard: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  deckHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  deckInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deckName: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 4,
  },
  deckStats: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_500,
    fontWeight: "500",
  },
  deckActions: {
    padding: 8,
  },
  deckFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressContainer: {
    flex: 1,
    marginRight: 15,
  },
  progressText: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.primary_500,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.accent_500,
    borderRadius: 3,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "#FF4444",
    marginBottom: 8,
  },
});

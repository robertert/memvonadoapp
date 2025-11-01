import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/solid";

export default function MyLibraryScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("wszystkie");

  const categories = [
    { key: "wszystkie", name: "Wszystkie" },
    { key: "jezyki", name: "Języki" },
    { key: "nauka", name: "Nauka" },
    { key: "historia", name: "Historia" },
    { key: "inne", name: "Inne" },
  ];

  const myDecks = [
    {
      id: 1,
      name: "Angielski - Podstawy",
      category: "jezyki",
      cards: 45,
      lastStudied: "2 dni temu",
      progress: 75,
      difficulty: "Łatwy",
    },
    {
      id: 2,
      name: "Historia Polski",
      category: "historia",
      cards: 78,
      lastStudied: "1 tydzień temu",
      progress: 60,
      difficulty: "Średni",
    },
    {
      id: 3,
      name: "Matematyka - Algebra",
      category: "nauka",
      cards: 32,
      lastStudied: "3 dni temu",
      progress: 90,
      difficulty: "Trudny",
    },
    {
      id: 4,
      name: "Francuski - Słownictwo",
      category: "jezyki",
      cards: 67,
      lastStudied: "5 dni temu",
      progress: 45,
      difficulty: "Średni",
    },
    {
      id: 5,
      name: "Biologia - Anatomia",
      category: "nauka",
      cards: 89,
      lastStudied: "1 dzień temu",
      progress: 30,
      difficulty: "Trudny",
    },
    {
      id: 6,
      name: "Geografia - Stolice",
      category: "nauka",
      cards: 195,
      lastStudied: "4 dni temu",
      progress: 85,
      difficulty: "Łatwy",
    },
  ];

  const filteredDecks = myDecks.filter((deck) => {
    const matchesSearch = deck.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "wszystkie" || deck.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Łatwy":
        return Colors.accent_500;
      case "Średni":
        return "#FFA500";
      case "Trudny":
        return "#FF4444";
      default:
        return Colors.primary_700;
    }
  };

  const renderDeckItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.deckCard}
      onPress={() => {
        // Navigate to deck details
        router.push(`../stack/deckDetails?id=${item.id}`);
      }}
    >
      <View style={styles.deckHeader}>
        <MaterialCommunityIcons
          name="cards"
          size={24}
          color={Colors.primary_700}
        />
        <View style={styles.deckInfo}>
          <Text style={styles.deckName}>{item.name}</Text>
          <Text style={styles.deckStats}>
            {item.cards} kart • {item.lastStudied}
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
          <Text style={styles.progressText}>Postęp: {item.progress}%</Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${item.progress}%` }]}
            />
          </View>
        </View>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(item.difficulty) },
          ]}
        >
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
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
});

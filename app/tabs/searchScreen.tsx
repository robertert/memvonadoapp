import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from "react-native";
import { Colors, Fonts, Subjects } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClockIcon, MagnifyingGlassIcon } from "react-native-heroicons/solid";
import { cloudFunctions, SearchLog } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Deck {
  id: string;
  title: string;
  [key: string]: any;
}

export default function marketplaceScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const category = params.category as string;

  const userCtx = useContext(UserContext);

  const searchTimeout = useRef<NodeJS.Timeout | number | null>(null);

  const [searchText, setSearchText] = useState<string>("");
  const [recentSearches, setRecentSearches] = useState<SearchLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searches, setSearches] = useState<Deck[]>([]);
  const [popular, setPopular] = useState<Deck[]>([]);
  const [popularLoading, setPopularLoading] = useState<boolean>(false);
  const [isSearchDisplayed, setIsSearchDisplayed] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [authorText, setAuthorText] = useState<string>("");
  const [showAuthorModal, setShowAuthorModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  function shortenTitle(text: string): string {
    if (!text) return "";
    if (text.length <= 12) return text;
    return text.slice(0, 10) + "...";
  }

  useEffect(() => {
    fetchRecentSearch();
    fetchPopular();

    // Auto-search if category parameter is provided
    if (category) {
      setSearchText(category);
      setIsSearchDisplayed(true);
    }
  }, [category]);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      handleSearch();
    }, 1000);
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchText]);

  async function handleSearch(): Promise<void> {
    if (searchText.trim() !== "") {
      setIsSearchDisplayed(true);
      setIsLoading(true);
      try {
        const filters = {
          subject: selectedCategory || undefined,
          isPublic: true,
        };

        const result = await cloudFunctions.searchDecks(
          searchText.trim(),
          filters,
          userCtx.id || undefined
        );

        const results = result.results.map(
          (deck: any) =>
            ({
              id: deck.id,
              title: deck.title || "",
              ...deck,
            } as Deck)
        );

        setIsLoading(false);
        setSearches(results);
      } catch (error) {
        console.error("Error searching for decks:", error);
        setIsLoading(false);
      }
    } else {
      setIsSearchDisplayed(false);
      fetchRecentSearch();
      fetchPopular();
    }
  }

  function clearFilters(): void {
    setSelectedCategory("");
    setAuthorText("");
  }

  async function enterDeckHandler(deck: Deck): Promise<void> {
    try {
      // For now, we'll keep this simple and just navigate
      // In a full implementation, we'd add a Cloud Function for updating recent searches
      router.push({
        pathname: "../stack/deckDetails",
        params: { deckId: deck.id },
      });
    } catch (error) {
      console.error("Error navigating to deck:", error);
    }
  }

  async function fetchRecentSearch(): Promise<void> {
    try {
      setIsLoading(true);
      const result = await cloudFunctions.getSearchLogs(userCtx.id || "");
      setRecentSearches(result);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching recent searches:", error);
      setIsLoading(false);
    }
  }

  async function fetchPopular(): Promise<void> {
    try {
      setPopularLoading(true);
      const result = await cloudFunctions.getPopularDecks(8);
      setPopular(result.decks || []);
      setPopularLoading(false);
    } catch (error) {
      console.error("Error fetching popular decks:", error);
      setPopularLoading(false);
    }
  }

  function renderCategory(category: string): React.JSX.Element {
    const SIZE = 30;

    switch (category) {
      case "English":
        return (
          <Image
            style={{ width: SIZE, height: SIZE }}
            source={require("../../assets/images/gbFlag.png")}
          />
        );
      case "Spanish":
        return (
          <Image
            style={{ width: SIZE, height: SIZE }}
            source={require("../../assets/images/esFlag.png")}
          />
        );
      case "French":
        return (
          <Image
            style={{ width: SIZE, height: SIZE }}
            source={require("../../assets/images/frFlag.png")}
          />
        );
      case "German":
        return (
          <Image
            style={{ width: SIZE, height: SIZE }}
            source={require("../../assets/images/deFlag.png")}
          />
        );
      default:
        return (
          <Image
            style={{ width: SIZE, height: SIZE }}
            source={require("../../assets/images/gbFlag.png")}
          />
        );
    }
  }
  return (
    <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Find something new to learn..."
          placeholderTextColor={Colors.primary_700}
          value={searchText}
          onChangeText={(text: string) => setSearchText(text)}
        />
        <MagnifyingGlassIcon color={Colors.primary_700} size={24} />
      </View>

      {/* Filters Bar */}
      <View style={styles.filtersContainer}>
        <Pressable
          style={styles.filterButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.filterButtonText}>
            {selectedCategory || "Category"}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={16}
            color={Colors.primary_700}
          />
        </Pressable>

        <Pressable
          style={styles.filterButton}
          onPress={() => setShowAuthorModal(true)}
        >
          <Text style={styles.filterButtonText}>{authorText || "Author"}</Text>
          <MaterialCommunityIcons
            name="account"
            size={16}
            color={Colors.primary_700}
          />
        </Pressable>

        {(selectedCategory || authorText) && (
          <Pressable style={styles.clearButton} onPress={clearFilters}>
            <MaterialCommunityIcons
              name="close"
              size={16}
              color={Colors.primary_700}
            />
          </Pressable>
        )}
      </View>

      <ScrollView style={{ width: "100%" }}>
        {!isSearchDisplayed ? (
          <>
            <View style={styles.searchesContainer}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              {recentSearches.length > 0 ? (
                recentSearches
                  .slice(0, 5)
                  .map((search: SearchLog, index: number) => (
                    <Pressable
                      key={index}
                      style={styles.recentSearchItem}
                      onPress={() => {
                        setSearchText(search.searchText || "");
                        handleSearch();
                      }}
                    >
                      <ClockIcon color={Colors.primary_700} size={22} />
                      <Text style={styles.recentItemText}>
                        {search.searchText || ""}
                      </Text>
                    </Pressable>
                  ))
              ) : (
                <View style={styles.emptySearchesContainer}>
                  <Text style={styles.recentItemText}>No recent searches</Text>
                </View>
              )}
            </View>

            <View style={styles.popularContainer}>
              <Text style={styles.popularTitle}>Popular now</Text>
              {popularLoading ? (
                <View style={styles.emptySearchesContainer}>
                  <ActivityIndicator size={"large"} color={Colors.accent_500} />
                </View>
              ) : popular.length > 0 ? (
                <ScrollView style={styles.popularGrid} horizontal={true}>
                  <View style={styles.popularGridContainer}>
                    {popular.map((deck: Deck) => (
                      <Pressable
                        key={deck.id}
                        style={styles.popularCard}
                        onPress={() => enterDeckHandler(deck)}
                      >
                        <MaterialCommunityIcons
                          name="cards"
                          size={40}
                          color={Colors.primary_700}
                        />
                        <Text style={styles.popularCardTitle} numberOfLines={1}>
                          {shortenTitle(deck.title || "Untitled Deck")}
                        </Text>
                        <View style={styles.popularCardInfo}>
                          {renderCategory(deck.category)}
                          <View style={styles.popularCardCountContainer}>
                            <Text style={styles.popularCardNum}>
                              {deck.cardsNum || 0}
                            </Text>
                            <Text style={styles.popularCardCount}>cards</Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptySearchesContainer}>
                  <Text style={styles.recentItemText}>
                    No popular decks yet
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.searchesContainer}>
            {isLoading ? (
              <View style={styles.emptySearchesContainer}>
                <ActivityIndicator size={"large"} color={Colors.accent_500} />
              </View>
            ) : searches.length > 0 ? (
              searches.map((deck: Deck) => (
                <Pressable key={deck.id} onPress={() => enterDeckHandler(deck)}>
                  <View style={styles.searchItem}>
                    <MagnifyingGlassIcon color={Colors.primary_700} size={22} />
                    <Text style={styles.searchItemText}>{deck.title}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptySearchesContainer}>
                <Text style={styles.searchItemText}>No results found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select category</Text>
            <FlatList
              data={Subjects}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </Pressable>
              )}
            />
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Author Modal */}
      <Modal
        visible={showAuthorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAuthorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter author</Text>
            <TextInput
              style={styles.authorInput}
              placeholder="Author name..."
              placeholderTextColor={Colors.primary_700}
              value={authorText}
              onChangeText={setAuthorText}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButton}
                onPress={() => setShowAuthorModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowAuthorModal(false)}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalButtonTextPrimary,
                  ]}
                >
                  Apply
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: Colors.primary_100,
  },
  title: {
    fontSize: 30,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    alignSelf: "flex-start",
  },
  searchBarContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginTop: 20,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    borderRadius: 24,
  },
  searchBar: {
    height: 50,
    flex: 1,
    fontSize: 18,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontWeight: "500",
  },
  searchesContainer: {
    width: "100%",
    marginTop: 20,
  },
  recentSearchesTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary_700,
  },
  recentItemText: {
    fontSize: 22,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontWeight: "500",
    marginLeft: 10,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary_700,
    marginTop: 10,
  },
  searchItemText: {
    fontSize: 22,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontWeight: "500",
    marginLeft: 10,
  },
  emptySearchesContainer: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  popularContainer: {
    width: "100%",
    marginTop: 28,
  },
  popularTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 12,
  },
  popularGrid: {
    width: "100%",
  },
  popularGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  popularCard: {
    width: (Dimensions.get("window").width - 15 * 2 - 48) / 2,
    height: (Dimensions.get("window").width - 15 * 2 - 12) / 2,
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  popularCardTitle: {
    fontSize: 15,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginTop: 10,
  },
  popularCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    width: "100%",
    justifyContent: "center",
  },
  popularCardCount: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
  },
  popularCardNum: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "800",
    marginBottom: 4,
  },
  popularCardCountContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginLeft: 20,
  },
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary_100,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
  },
  clearButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.accent_500,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary_700,
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
  },
  authorInput: {
    borderWidth: 2,
    borderColor: Colors.primary_700,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    alignItems: "center",
    marginHorizontal: 4,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.accent_500,
    borderColor: Colors.accent_500,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
  },
  modalButtonTextPrimary: {
    color: Colors.primary_700,
  },
});

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClockIcon, MagnifyingGlassIcon } from "react-native-heroicons/solid";
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";

import { router } from "expo-router";
import { ScrollView } from "react-native";

interface Deck {
  id: string;
  title: string;
  [key: string]: any;
}

interface RecentSearch {
  title: string;
  id: string;
}

export default function marketplaceScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const userCtx = useContext(UserContext);

  const searchTimeout = useRef<NodeJS.Timeout | number | null>(null);

  const [searchText, setSearchText] = useState<string>("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searches, setSearches] = useState<Deck[]>([]);

  useEffect(() => {
    fetchRecentSearch();
  }, []);

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
      setIsLoading(true);
      try {
        const result = await cloudFunctions.searchDecks(
          searchText.trim(),
          undefined,
          userCtx.id || undefined
        );
        
        const results = result.results.map((deck: any) => ({
          id: deck.id,
          title: deck.title || "",
          ...deck,
        } as Deck));
        
        setIsLoading(false);
        if (results.length > 0) {
          setSearches(results);
        }
      } catch (error) {
        console.error("Error searching for decks:", error);
        setIsLoading(false);
      }
    }
  }

  async function enterDeckHandler(deck: Deck): Promise<void> {
    const recentSearch: RecentSearch = {
      title: deck.title,
      id: deck.id,
    };
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
      // For now, we'll keep this simple
      // In a full implementation, we'd add a Cloud Function for fetching recent searches
      setRecentSearches([]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching recent searches:", error);
      setIsLoading(false);
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
      <ScrollView style={{ width: "100%" }}>
        {searchText.trim() === "" ? (
          <>
            <View style={styles.searchesContainer}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              {recentSearches.length > 0 ? (
                recentSearches.map((search: RecentSearch, index: number) => (
                  <Pressable
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => {
                      setSearchText(search.title);
                      handleSearch();
                    }}
                  >
                    <ClockIcon color={Colors.primary_700} size={22} />
                    <Text style={styles.recentItemText}>{search.title}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptySearchesContainer}>
                  <Text style={styles.recentItemText}>No recent searches</Text>
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
                <Pressable
                  key={deck.id}
                  onPress={() => enterDeckHandler(deck)}
                >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    alignItems: "center",
    backgroundColor: Colors.primary_100,
  },
  title: {
    fontSize: 30,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginTop: 10,
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
    paddingHorizontal: 15,
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
});

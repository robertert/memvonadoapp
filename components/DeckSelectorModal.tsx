import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Colors, Fonts } from "@/constants/colors";
import {
  PlusIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { cloudFunctions } from "@/services/cloudFunctions";
import { useAuth } from "@/store/auth";
import type { DeckLearningData } from "@/types";

export interface SelectedDeck {
  id: string;
  title: string;
  category?: string;
}

interface DeckSelectorModalProps {
  visible: boolean;
  onSelectNew: () => void;
  onSelectExisting: (deck: SelectedDeck) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function DeckSelectorModal({
  visible,
  onSelectNew,
  onSelectExisting,
  onClose,
  showCloseButton = false,
}: DeckSelectorModalProps): React.JSX.Element {
  const { userId } = useAuth();

  const [decks, setDecks] = useState<DeckLearningData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load decks
  useEffect(() => {
    const loadDecks = async () => {
      if (!userId || !visible) return;

      try {
        setIsLoading(true);
        const response = await cloudFunctions.getUserDecks(userId);
        const deckList = response.decks || [];
        setDecks(deckList);
      } catch (error) {
        console.error("Error loading decks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) {
      loadDecks();
      setSearchQuery("");
    }
  }, [userId, visible]);

  // Filter decks based on search query
  const filteredDecks = useMemo(() => {
    if (!searchQuery.trim()) return decks;

    const query = searchQuery.toLowerCase().trim();
    return decks.filter(
      (deck) =>
        deck.title.toLowerCase().includes(query) ||
        (deck.category && deck.category.toLowerCase().includes(query))
    );
  }, [decks, searchQuery]);

  const handleSelectExisting = (deck: DeckLearningData) => {
    onSelectExisting({
      id: deck.id,
      title: deck.title,
      category: deck.category || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={showCloseButton ? onClose : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Wybierz talię</Text>
            {showCloseButton && onClose && (
              <Pressable onPress={onClose} hitSlop={8}>
                <XMarkIcon size={24} color={Colors.primary_700} />
              </Pressable>
            )}
          </View>

          {/* Search input */}
          <View style={styles.searchContainer}>
            <MagnifyingGlassIcon size={20} color={Colors.primary_700_50} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj talii..."
              placeholderTextColor={Colors.primary_700_50}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <XMarkIcon size={18} color={Colors.primary_700_50} />
              </Pressable>
            )}
          </View>

          {/* Create new deck option */}
          <Pressable style={styles.createNewButton} onPress={onSelectNew}>
            <View style={styles.createNewIcon}>
              <PlusIcon size={22} color={Colors.primary_500} />
            </View>
            <View style={styles.createNewText}>
              <Text style={styles.createNewTitle}>Utwórz nową talię</Text>
              <Text style={styles.createNewSubtitle}>
                Wprowadź tytuł, kategorię i języki
              </Text>
            </View>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>lub wybierz istniejącą</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Decks list */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary_500} />
              <Text style={styles.loadingText}>Ładowanie talii...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredDecks}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.deckItem}
                  onPress={() => handleSelectExisting(item)}
                >
                  <View style={styles.deckInfo}>
                    <FolderIcon size={20} color={Colors.primary_700_50} />
                    <View style={styles.deckTextContainer}>
                      <Text style={styles.deckTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.deckMeta}>
                        {item.category && (
                          <Text style={styles.deckCategory}>{item.category}</Text>
                        )}
                        <Text style={styles.deckCards}>
                          {item.cardsNum || 0} kart
                        </Text>
                      </View>
                    </View>
                  </View>
                  <CheckIcon size={20} color={Colors.primary_500} style={{ opacity: 0 }} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "Nie znaleziono talii"
                      : "Brak talii. Utwórz pierwszą!"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    padding: 20,
    borderWidth: 3,
    borderColor: Colors.primary_700,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.primary,
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary_700,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    marginLeft: 10,
    padding: 0,
  },
  createNewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent_500,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  createNewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  createNewText: {
    flex: 1,
  },
  createNewTitle: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary_700,
    marginBottom: 2,
  },
  createNewSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: 13,
    color: Colors.primary_700,
    opacity: 0.7,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.primary_700_30,
  },
  dividerText: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_700_50,
    marginHorizontal: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700_50,
    marginLeft: 10,
  },
  list: {
    maxHeight: 300,
  },
  deckItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  deckInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deckTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  deckTitle: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_700,
    marginBottom: 2,
  },
  deckMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deckCategory: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_700_50,
  },
  deckCards: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_700_50,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700_50,
    textAlign: "center",
  },
});

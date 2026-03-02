import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Colors, Fonts } from "@/constants/colors";
import { ChevronDownIcon, PlusIcon, FolderIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { cloudFunctions } from "@/services/cloudFunctions";
import { useAuth } from "@/store/auth";
import { useQuickAdd } from "@/store/quickAdd-context";
import type { DeckLearningData } from "@/types";

interface DeckSelectorProps {
  selectedDeckId: string | null;
  onDeckSelect: (deck: DeckLearningData) => void;
  onCreateNew: () => void;
  onNoLanguages?: (deck: DeckLearningData) => void;
}

export default function DeckSelector({
  selectedDeckId,
  onDeckSelect,
  onCreateNew,
  onNoLanguages,
}: DeckSelectorProps): React.JSX.Element {
  const { userId } = useAuth();
  const { lastUsedDeckId } = useQuickAdd();

  const [decks, setDecks] = useState<DeckLearningData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<DeckLearningData | null>(null);

  // Load decks
  useEffect(() => {
    const loadDecks = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        const response = await cloudFunctions.getUserDecks(userId);
        let deckList = response.decks || [];

        // Sort by last used (if we have lastUsedDeckId, put it first)
        if (lastUsedDeckId) {
          deckList = deckList.sort((a, b) => {
            if (a.id === lastUsedDeckId) return -1;
            if (b.id === lastUsedDeckId) return 1;
            return 0;
          });
        }

        setDecks(deckList);

        // Auto-select deck
        if (selectedDeckId) {
          const preselected = deckList.find((d) => d.id === selectedDeckId);
          if (preselected) {
            setSelectedDeck(preselected);
            onDeckSelect(preselected);
          }
        } else if (lastUsedDeckId) {
          const lastUsed = deckList.find((d) => d.id === lastUsedDeckId);
          if (lastUsed) {
            setSelectedDeck(lastUsed);
            onDeckSelect(lastUsed);
          }
        } else if (deckList.length > 0) {
          setSelectedDeck(deckList[0]);
          onDeckSelect(deckList[0]);
        }

        // If no decks at all, trigger create new flow
        if (deckList.length === 0) {
          onCreateNew();
        }
      } catch (error) {
        console.error("Error loading decks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDecks();
  }, [userId, selectedDeckId, lastUsedDeckId]);

  const handleSelect = (deck: DeckLearningData) => {
    // Check if deck has language category but no languages set
    if (
      deck.category === "language" &&
      (!deck.frontLanguage || !deck.backLanguage)
    ) {
      onNoLanguages?.(deck);
      setIsOpen(false);
      return;
    }

    setSelectedDeck(deck);
    onDeckSelect(deck);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNew();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.selector}>
          <ActivityIndicator size="small" color={Colors.primary_500} />
          <Text style={styles.loadingText}>Ladowanie talii...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Talia</Text>

      <Pressable
        style={styles.selector}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.selectorContent}>
          <FolderIcon size={20} color={Colors.primary_700} />
          <Text style={styles.selectorText} numberOfLines={1}>
            {selectedDeck?.title || "Wybierz talie"}
          </Text>
        </View>
        <ChevronDownIcon size={20} color={Colors.primary_700_50} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Wybierz talie</Text>

            <FlatList
              data={decks}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.deckItem,
                    selectedDeck?.id === item.id && styles.deckItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.deckInfo}>
                    <FolderIcon
                      size={18}
                      color={
                        selectedDeck?.id === item.id
                          ? Colors.primary_500
                          : Colors.primary_700_50
                      }
                    />
                    <View style={styles.deckTextContainer}>
                      <Text
                        style={[
                          styles.deckTitle,
                          selectedDeck?.id === item.id && styles.deckTitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.category && (
                        <Text style={styles.deckCategory}>{item.category}</Text>
                      )}
                    </View>
                  </View>
                  {selectedDeck?.id === item.id && (
                    <CheckIcon size={20} color={Colors.primary_500} />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Brak talii</Text>
              }
            />

            <Pressable style={styles.createButton} onPress={handleCreateNew}>
              <PlusIcon size={20} color={Colors.primary_500} />
              <Text style={styles.createButtonText}>Utworz nowa talie</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary_700,
    marginBottom: 8,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary_700_30,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectorText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    marginLeft: 12,
    flex: 1,
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700_50,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: "100%",
    maxHeight: "70%",
    padding: 20,
  },
  modalTitle: {
    fontFamily: Fonts.primary,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary_700,
    marginBottom: 16,
  },
  list: {
    maxHeight: 300,
  },
  deckItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  deckItemSelected: {
    backgroundColor: Colors.primary_100,
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
    color: Colors.primary_700,
  },
  deckTitleSelected: {
    fontWeight: "600",
    color: Colors.primary_500,
  },
  deckCategory: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_700_50,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700_50,
    textAlign: "center",
    paddingVertical: 20,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.primary_700_30,
  },
  createButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_500,
    marginLeft: 8,
  },
});

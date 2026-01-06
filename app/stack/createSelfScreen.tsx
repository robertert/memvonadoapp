import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, generageRandomUid } from "../../constants/colors";
import { View, ScrollView } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import NewCard from "../../components/createSelfScreen/newCard";
import CardSkeleton from "../../components/createSelfScreen/CardSkeleton";
import { cloudFunctions } from "../../services/cloudFunctions";
import { router, useLocalSearchParams } from "expo-router";

import { UserContext } from "../../store/user-context";
import {
  CardCoreSchema,
  CardCore,
  safeValidateArray,
  Card,
  DeckCore,
} from "@/types";
import { CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "@/constants/settings";
import { FlashList } from "@shopify/flash-list";
import { useDeckDraft } from "@/hooks/useDeckDraft";

interface CreateSelfParams {
  cards?: string;
  edit?: string;
  deckId?: string;
}

// EditableCard interface with tracking flags
interface EditableCard extends CardCore {
  id: string;
  isNew: boolean; // true if added in this session
  isDirty?: boolean; // true if modified from initial state
}

// CardDiff type for sending only changes
type CardDiff = {
  created: CardCore[];
  updated: (CardCore & { id: string })[];
  deleted: string[];
};

export default function createSelfScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typedParams = params as CreateSelfParams;

  const [cards, setCards] = useState<EditableCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [deckCategory, setDeckCategory] = useState<string>(CATEGORY_OPTIONS[0]);
  const [frontLanguage, setFrontLanguage] = useState<string>(
    LANGUAGE_OPTIONS[0]?.code || "en"
  );
  const [backLanguage, setBackLanguage] = useState<string>(
    LANGUAGE_OPTIONS[1]?.code || LANGUAGE_OPTIONS[0]?.code || "pl"
  );

  // Paginacja dla trybu edycji
  const [hasMoreCards, setHasMoreCards] = useState<boolean>(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [isLoadingMoreCards, setIsLoadingMoreCards] = useState<boolean>(false);
  const [isLoadingCards, setIsLoadingCards] = useState<boolean>(false);

  // Client-side diffing state
  const initialCardIdsRef = useRef<Set<string>>(new Set());
  const [deletedCardIds, setDeletedCardIds] = useState<Set<string>>(new Set());

  const userCtx = useContext(UserContext);

  // Use draft hook
  const {
    draftFound,
    showDraftModal,
    loadDraft,
    clearDraft,
    handleContinueDraft: handleContinueDraftHook,
    handleStartFresh,
  } = useDeckDraft(cards, title, deckCategory, frontLanguage, backLanguage);

  // Calculate card diff for sending to backend
  const calculateCardDiff = useCallback((): CardDiff => {
    const created: CardCore[] = [];
    const updated: (CardCore & { id: string })[] = [];
    const deleted: string[] = Array.from(deletedCardIds);

    cards.forEach((card) => {
      if (card.isNew) {
        // New card - add to created
        created.push({
          cardData: card.cardData,
          tags: card.tags || [],
        });
      } else if (card.isDirty && initialCardIdsRef.current.has(card.id)) {
        // Existing card that was modified - add to updated
        updated.push({
          id: card.id,
          cardData: card.cardData,
          tags: card.tags || [],
        });
      }
    });

    return { created, updated, deleted };
  }, [cards, deletedCardIds]);

  // Update card callback (memoized for performance)
  const updateCard = useCallback(
    (cardId: string, updates: Partial<EditableCard>) => {
      setCards((prev) =>
        prev.map((card) => {
          if (card.id === cardId) {
            // Mark as dirty if it's an existing card (not new)
            const isDirty = card.isNew ? false : true;
            return { ...card, ...updates, isDirty };
          }
          return card;
        })
      );
    },
    []
  );

  // Delete card handler
  const deleteCard = useCallback((cardId: string) => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (card?.isNew) {
        // If it's a new card, just remove it (don't track in deleted)
        return prev.filter((c) => c.id !== cardId);
      } else {
        // If it's an existing card, add to deleted set
        setDeletedCardIds((prevDeleted) => new Set(prevDeleted).add(cardId));
        return prev.filter((c) => c.id !== cardId);
      }
    });
  }, []);

  // Load draft on mount
  useEffect(() => {
    const initializeData = async () => {
      if (typedParams.edit === "true" && typedParams.deckId) {
        await loadEditData();
      } else {
        const loadedCards = await loadDraft(typedParams.cards);
        if (loadedCards) {
          // Cards from params or draft should be marked as new
          const cardsWithFlags = loadedCards.map((card) => ({
            ...card,
            isNew: true,
            isDirty: false,
          }));
          setCards(cardsWithFlags);
        }
      }
    };
    initializeData();
  }, []);

  async function loadEditData(): Promise<void> {
    if (typedParams.edit === "true" && typedParams.deckId) {
      setIsLoadingCards(true);
      try {
        const { deck: deckData } = await cloudFunctions.getDeckDetails(
          typedParams.deckId
        );
        const {
          cards: deckCards,
          hasMore,
          lastDocId: lastId,
        } = await cloudFunctions.getDeckCards(typedParams.deckId, 20);

        // Konwersja Card[] na EditableCard[] and track initial IDs
        const editableCards: EditableCard[] = deckCards.map((card) => ({
          id: card.id,
          cardData: card.cardData,
          tags: card.tags || [],
          isNew: false, // Cards from DB are not new
          isDirty: false, // Initially not dirty
        }));

        // Store initial card IDs for diffing
        initialCardIdsRef.current = new Set(editableCards.map((c) => c.id));
        setDeletedCardIds(new Set()); // Reset deleted IDs

        setCards(editableCards);
        setHasMoreCards(hasMore);
        setLastDocId(lastId);

        if (!deckData) {
          throw new Error("Deck not found");
        }
        setTitle(deckData.title);
        setDeckCategory(deckData.category || CATEGORY_OPTIONS[0]);
        setFrontLanguage(
          deckData.frontLanguage || LANGUAGE_OPTIONS[0]?.code || "en"
        );
        setBackLanguage(
          deckData.backLanguage || LANGUAGE_OPTIONS[1]?.code || "pl"
        );
      } catch (error) {
        console.error("Error loading edit data:", error);
      } finally {
        setIsLoadingCards(false);
      }
    }
  }

  async function loadMoreCards(): Promise<void> {
    if (
      !typedParams.edit ||
      typedParams.edit !== "true" ||
      !typedParams.deckId ||
      !hasMoreCards ||
      isLoadingMoreCards ||
      !lastDocId
    ) {
      return;
    }

    setIsLoadingMoreCards(true);
    try {
      const {
        cards: deckCards,
        hasMore,
        lastDocId: lastId,
      } = await cloudFunctions.getDeckCards(typedParams.deckId, 20, lastDocId);

      // Konwersja Card[] na EditableCard[]
      const newEditableCards: EditableCard[] = deckCards.map((card) => ({
        id: card.id,
        cardData: card.cardData,
        tags: card.tags || [],
        isNew: false, // Cards from DB are not new
        isDirty: false, // Initially not dirty
      }));

      // Add new card IDs to initial set
      newEditableCards.forEach((card) => {
        initialCardIdsRef.current.add(card.id);
      });

      setCards((prev) => [...prev, ...newEditableCards]);
      setHasMoreCards(hasMore);
      setLastDocId(lastId);
    } catch (error) {
      console.error("Error loading more cards:", error);
    } finally {
      setIsLoadingMoreCards(false);
    }
  }

  // Handle user choice: continue with draft
  const handleContinueDraft = () => {
    const draftData = handleContinueDraftHook();
    if (draftData) {
      setTitle(draftData.title);
      // Ensure cards have proper flags (preserved from draft or set to new)
      const cardsWithFlags = draftData.cards.map((card) => ({
        ...card,
        isNew: card.isNew !== undefined ? card.isNew : true,
        isDirty: card.isDirty || false,
      }));
      setCards(cardsWithFlags);
      setDeckCategory(draftData.deckCategory);
      setFrontLanguage(draftData.frontLanguage);
      setBackLanguage(draftData.backLanguage);
      // Reset tracking for draft (not edit mode)
      initialCardIdsRef.current = new Set();
      setDeletedCardIds(new Set());
    }
  };

  // Final save (create deck in Firestore)
  async function saveHandler(): Promise<void> {
    try {
      setIsLoading(true);

      // Clear draft after successful save
      await clearDraft();

      const deckData = {
        title,
        category: deckCategory,
        icon: "cards",
        isPublic: true,
        frontLanguage: frontLanguage || null,
        backLanguage: backLanguage || null,
        tags: [],
      } as DeckCore;

      if (!userCtx.id) {
        throw new Error("User ID is required");
      }

      let result;
      if (typedParams.edit === "true" && typedParams.deckId) {
        // Calculate diff for edit mode
        const changes = calculateCardDiff();

        await cloudFunctions.updateDeck(typedParams.deckId, deckData, changes);
        // Use existing deckId for edit mode
        result = { deckId: typedParams.deckId };
      } else {
        // Create mode - send all cards
        const cardsData = cards.map((card) => ({
          cardData: {
            front: card.cardData.front,
            back: card.cardData.back,
          },
          tags: card.tags || [],
        }));

        result = await cloudFunctions.createDeckWithCards(deckData, cardsData);
      }

      router.replace({
        pathname: "/stack/deckDetails",
        params: { deckId: result.deckId },
      });
    } catch (error) {
      console.error("Error creating deck:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function createNewHandler(): void {
    setCards((prev) => {
      return [
        ...prev,
        {
          id: generageRandomUid(),
          cardData: {
            front: "",
            back: "",
          },
          tags: [],
          isNew: true, // Mark as new card
          isDirty: false, // Not dirty yet
        },
      ];
    });
  }

  function titleChangeHandler(text: string): void {
    setTitle(text);
  }

  // ListHeaderComponent for FlashList
  const ListHeaderComponent = useMemo(
    () => (
      <View>
        <View style={styles.titleSection}>
          <Text style={styles.titleLabel}>Tytuł decku</Text>
          <View style={styles.titleInputContainer}>
            <TextInput
              style={styles.titleInput}
              onChangeText={titleChangeHandler}
              value={title}
              placeholder="Wprowadź tytuł..."
              placeholderTextColor={Colors.primary_700_50}
            />
          </View>
        </View>

        {/* Wybór kategorii */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Kategoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {CATEGORY_OPTIONS.map((category) => {
              const isActive = category === deckCategory;
              return (
                <Pressable
                  key={category}
                  onPress={() => setDeckCategory(category)}
                  style={[
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        {/* Wybór języków przodu i tyłu fiszek */}
        {["English", "Spanish", "French", "German"].includes(deckCategory) && (
          <View style={styles.languageSection}>
            <Text style={styles.sectionTitle}>Języki fiszek</Text>

            <View style={styles.languageRow}>
              <Text style={styles.languageLabel}>Przód</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.languageScrollContent}
              >
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isActive = lang.code === frontLanguage;
                  return (
                    <Pressable
                      key={`front-${lang.code}`}
                      onPress={() => setFrontLanguage(lang.code)}
                      style={[
                        styles.languageChip,
                        isActive && styles.languageChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.languageChipText,
                          isActive && styles.languageChipTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.languageRow}>
              <Text style={styles.languageLabel}>Tył</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.languageScrollContent}
              >
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isActive = lang.code === backLanguage;
                  return (
                    <Pressable
                      key={`back-${lang.code}`}
                      onPress={() => setBackLanguage(lang.code)}
                      style={[
                        styles.languageChip,
                        isActive && styles.languageChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.languageChipText,
                          isActive && styles.languageChipTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
        <View style={styles.cardsSection}>
          <Text style={styles.sectionTitle}>Karty</Text>
        </View>
      </View>
    ),
    [title, deckCategory, frontLanguage, backLanguage]
  );

  // Render item for FlashList
  const renderItem = useCallback(
    ({ item: card }: { item: EditableCard }) => (
      <NewCard
        card={card}
        onUpdate={updateCard}
        onDelete={deleteCard}
        deckLanguage={frontLanguage}
      />
    ),
    [updateCard, deleteCard, frontLanguage]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrow-left" size={24} color={Colors.primary_700} />
        </Pressable>
        <Text style={styles.headerTitle}>Nowy Deck</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size={"large"} color={Colors.accent_500} />
          </View>
        ) : isLoadingCards ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((index) => (
              <CardSkeleton key={index} />
            ))}
          </View>
        ) : (
          <>
            <FlashList
              data={cards}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={ListHeaderComponent}
              onEndReached={
                typedParams.edit === "true" ? loadMoreCards : undefined
              }
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                <>
                  {isLoadingMoreCards ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator
                        size="small"
                        color={Colors.accent_500}
                      />
                    </View>
                  ) : null}
                  <Pressable
                    onPress={createNewHandler}
                    style={styles.addCardButton}
                  >
                    <AntDesign
                      name="plus-circle"
                      size={45}
                      color={Colors.accent_500}
                    />
                    <Text style={styles.addCardText}>Dodaj kartę</Text>
                  </Pressable>
                </>
              }
              contentContainerStyle={styles.flashListContent}
            />

            <Pressable onPress={saveHandler} style={styles.saveButton}>
              <Text style={styles.saveText}>
                {typedParams.edit === "true" ? "Zapisz zmiany" : "Utwórz Deck"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Draft Modal */}
      <Modal
        visible={showDraftModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleStartFresh}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Znaleziono wersję roboczą</Text>
            </View>

            <Text style={styles.modalText}>
              Znaleziono zapisaną wersję roboczą decku. Czy chcesz kontynuować
              pracę nad nią?
            </Text>

            {draftFound && (
              <View style={styles.draftInfo}>
                <Text style={styles.draftInfoText}>
                  Tytuł: {draftFound.title || "(brak tytułu)"}
                </Text>
                <Text style={styles.draftInfoText}>
                  Karty: {draftFound.cards?.length || 0}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleStartFresh}
                style={[styles.modalButton, styles.modalButtonSecondary]}
              >
                <Text style={styles.modalButtonTextSecondary}>
                  Zacznij od nowa
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinueDraft}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonTextPrimary}>Kontynuuj</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary_100,
  },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 15,
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
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 15,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Extra padding for fixed button
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  titleLabel: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 15,
  },
  titleInputContainer: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  titleInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 20,
    fontWeight: "600",
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryScrollContent: {
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    backgroundColor: Colors.primary_100,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary_700,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: Colors.primary_100,
  },
  languageSection: {
    marginBottom: 24,
  },
  languageRow: {
    marginBottom: 12,
  },
  languageLabel: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 6,
  },
  languageScrollContent: {
    paddingVertical: 4,
  },
  languageChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    backgroundColor: Colors.primary_100,
    marginRight: 8,
  },
  languageChipActive: {
    backgroundColor: Colors.accent_500,
    borderColor: Colors.accent_500,
  },
  languageChipText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
  },
  languageChipTextActive: {
    color: Colors.primary_100,
  },
  cardsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 15,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  flashListContent: {
    paddingBottom: 200,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  addCardText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    left: 15,
    right: 15,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "900",
  },
  cardStack: {
    flexDirection: "row",
  },
  deleteContainer: {
    borderRadius: 15,
    backgroundColor: Colors.red,
    width: 500,
    marginBottom: 10,
    marginLeft: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxHeight: "70%",
    borderWidth: 3,
    borderColor: Colors.primary_700,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  tagsTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  tagsScrollView: {
    maxHeight: 200,
    marginBottom: 20,
  },
  tagItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.accent_500_30,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 5,
  },
  tagText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    flex: 1,
  },
  addTagContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagInputContainer: {
    flex: 1,
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
  },
  tagInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 16,
  },
  addTagButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  modalText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginBottom: 20,
    lineHeight: 22,
  },
  draftInfo: {
    backgroundColor: Colors.accent_500_30,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  draftInfoText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    marginBottom: 5,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPrimary: {
    backgroundColor: Colors.primary_700,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.primary_100,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "700",
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
  },
});

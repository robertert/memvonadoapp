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
import DeckSelectorModal, {
  SelectedDeck,
} from "../../components/DeckSelectorModal";
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
  suggestedTitle?: string;
  isEditor?: string;
  isAdmin?: string;
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

  // Permission: editors can only modify cards, not deck metadata
  const isEditorOnly =
    typedParams.edit === "true" &&
    typedParams.isEditor === "true" &&
    typedParams.isAdmin !== "true";

  // Determine if this is edit mode
  const isEditMode = typedParams.edit === "true" && typedParams.deckId;

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

  // Deck selection state
  const [showDeckSelector, setShowDeckSelector] = useState<boolean>(false);
  const [selectedDeck, setSelectedDeck] = useState<SelectedDeck | null>(null);
  const [deckSelectionDone, setDeckSelectionDone] = useState<boolean>(false);

  // Paginacja dla trybu edycji
  const [hasMoreCards, setHasMoreCards] = useState<boolean>(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [isLoadingMoreCards, setIsLoadingMoreCards] = useState<boolean>(false);
  const [isLoadingCards, setIsLoadingCards] = useState<boolean>(false);

  // Client-side diffing state
  const initialCardIdsRef = useRef<Set<string>>(new Set());
  const [deletedCardIds, setDeletedCardIds] = useState<Set<string>>(new Set());

  const focusRefs = useRef<Record<string, TextInput | null>>({});

  // 2. State to track which card ID should be focused next
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  // 3. Effect: Watch for changes in cards/focusTarget. If a target exists and is mounted, focus it.
  useEffect(() => {
    if (focusTarget && focusRefs.current[focusTarget]) {
      // Small timeout ensures the UI is fully ready (keyboard animation etc)
      setTimeout(() => {
        focusRefs.current[focusTarget]?.focus();
        setFocusTarget(null); // Reset target
      }, 100);
    }
  }, [cards, focusTarget]);

  const userCtx = useContext(UserContext);

  // Use draft hook (only for new deck mode)
  const {
    draftFound,
    showDraftModal,
    loadDraft,
    clearDraft,
    handleContinueDraft: handleContinueDraftHook,
    handleStartFresh,
  } = useDeckDraft(cards, title, deckCategory, frontLanguage, backLanguage);

  // Show deck selector on mount (unless edit mode)
  useEffect(() => {
    if (!isEditMode) {
      setShowDeckSelector(true);
    } else {
      setDeckSelectionDone(true);
    }
  }, [isEditMode]);

  // Handle deck selection: new deck
  const handleSelectNewDeck = () => {
    setSelectedDeck(null);
    setShowDeckSelector(false);
    setDeckSelectionDone(true);
  };

  // Handle deck selection: existing deck
  const handleSelectExistingDeck = (deck: SelectedDeck) => {
    setSelectedDeck(deck);
    setShowDeckSelector(false);
    setDeckSelectionDone(true);
  };

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

  // Load draft on mount (only when new deck is selected, not existing)
  useEffect(() => {
    const initializeData = async () => {
      if (isEditMode) {
        await loadEditData();
      } else if (deckSelectionDone && !selectedDeck) {
        // New deck mode - load draft/cards from params
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
        // Auto-fill title from suggestedTitle param (e.g. from processFile)
        if (typedParams.suggestedTitle) {
          setTitle(typedParams.suggestedTitle);
        }
      } else if (deckSelectionDone && selectedDeck) {
        // Existing deck mode - load cards from params only (no draft)
        if (typedParams.cards) {
          try {
            const parsedCards = JSON.parse(typedParams.cards).map(
              (card: any) => ({
                id: generageRandomUid(),
                cardData: {
                  front: card.front,
                  back: card.back,
                },
                tags: card.tags || [],
                isNew: true,
              })
            ) as EditableCard[];
            setCards(parsedCards);
          } catch (e) {
            console.error("Error parsing cards:", e);
          }
        }
      }
    };
    initializeData();
  }, [deckSelectionDone, selectedDeck]);

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

  // Final save (create deck in Firestore or add to existing)
  async function saveHandler(): Promise<void> {
    try {
      setIsLoading(true);

      // Clear draft after successful save (only for new deck mode)
      if (!selectedDeck) {
        await clearDraft();
      }

      let result;

      if (selectedDeck) {
        // Adding cards to existing deck
        const cardsData = cards.map((card) => ({
          cardData: {
            front: card.cardData.front,
            back: card.cardData.back,
          },
          tags: card.tags || [],
        }));

        // Use the updateDeck function with only created cards
        const changes = {
          created: cardsData,
          updated: [],
          deleted: [],
        };

        // We need to get the deck data first for the update
        const { deck: existingDeck } = await cloudFunctions.getDeckDetails(
          selectedDeck.id
        );

        if (!existingDeck) {
          throw new Error("Deck not found");
        }

        await cloudFunctions.updateDeck(
          selectedDeck.id,
          {
            title: existingDeck.title,
            category: existingDeck.category,
            icon: existingDeck.icon || "cards",
            isPublic: existingDeck.isPublic,
            frontLanguage: existingDeck.frontLanguage || null,
            backLanguage: existingDeck.backLanguage || null,
            tags: existingDeck.tags || [],
          },
          changes
        );

        result = { deckId: selectedDeck.id };
      } else if (isEditMode && typedParams.deckId) {
        // Edit mode - update existing deck with changes
        const deckData = {
          title,
          category: deckCategory,
          icon: "cards",
          isPublic: true,
          frontLanguage: frontLanguage || null,
          backLanguage: backLanguage || null,
          tags: [],
        } as DeckCore;

        const changes = calculateCardDiff();
        await cloudFunctions.updateDeck(typedParams.deckId, deckData, changes);
        result = { deckId: typedParams.deckId };
      } else {
        // Create new deck
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
      console.error("Error saving deck:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function createNewHandler(isFront: boolean): string {
    const newCardId = generageRandomUid();
    setCards((prev) => {
      const newCard = {
        id: newCardId,
        cardData: {
          front: "",
          back: "",
        },
        tags: [],
        isNew: true, // Mark as new card
        isDirty: false, // Not dirty yet
      };
      if (isFront) {
        return [newCard, ...prev];
      } else {
        return [...prev, newCard];
      }
    });
    return newCardId;
  }

  function addAndFocusCard(): void {
    const newCardId = createNewHandler(false);
    setFocusTarget(newCardId);
  }

  function titleChangeHandler(text: string): void {
    setTitle(text);
  }

  // Determine header title
  const headerTitle = useMemo(() => {
    if (isEditMode) {
      return "Edytuj Deck";
    }
    if (selectedDeck) {
      return `Dodaj do: ${selectedDeck.title}`;
    }
    return "Nowa Talia";
  }, [isEditMode, selectedDeck]);

  // Determine save button text
  const saveButtonText = useMemo(() => {
    if (isEditMode) {
      return "Zapisz zmiany";
    }
    if (selectedDeck) {
      return "Dodaj karty";
    }
    return "Utwórz Deck";
  }, [isEditMode, selectedDeck]);

  // ListHeaderComponent for FlashList
  const ListHeaderComponent = useMemo(
    () => (
      <View style={{ marginBottom: 20 }}>
        {/* Show deck metadata fields only for new deck mode (not existing deck) */}
        {!selectedDeck && (
          <>
            <View style={styles.titleSection}>
              <Text style={styles.titleLabel}>Tytuł decku</Text>
              <View style={styles.titleInputContainer}>
                <TextInput
                  style={[styles.titleInput, isEditorOnly && { opacity: 0.5 }]}
                  onChangeText={titleChangeHandler}
                  value={title}
                  placeholder="Wprowadź tytuł..."
                  placeholderTextColor={Colors.primary_700_50}
                  editable={!isEditorOnly}
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
                      onPress={() => !isEditorOnly && setDeckCategory(category)}
                      disabled={isEditorOnly}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                        isEditorOnly && { opacity: 0.5 },
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
            {["English", "Spanish", "French", "German"].includes(
              deckCategory
            ) && (
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
          </>
        )}

        {/* Selected deck info banner for existing deck mode */}
        {selectedDeck && (
          <View style={styles.selectedDeckBanner}>
            <Text style={styles.selectedDeckText}>
              Dodajesz karty do talii: <Text style={styles.selectedDeckTitle}>{selectedDeck.title}</Text>
            </Text>
            <Pressable
              onPress={() => setShowDeckSelector(true)}
              style={styles.changeDeckButton}
            >
              <Text style={styles.changeDeckButtonText}>Zmień</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.cardsSection}>
          <Text style={styles.sectionTitle}>Karty</Text>
        </View>
        <Pressable
          onPress={createNewHandler.bind(null, true)}
          style={styles.addCardButton}
        >
          <AntDesign
            name="plus-circle"
            size={45}
            color={Colors.accent_500}
          />
          <Text style={styles.addCardText}>Dodaj kartę</Text>
        </Pressable>
      </View>
    ),
    [title, deckCategory, frontLanguage, backLanguage, selectedDeck, isEditorOnly]
  );

  // Render item for FlashList
  const renderItem = useCallback(
    ({ item: card }: { item: EditableCard }) => (
      <NewCard
        card={card}
        onUpdate={updateCard}
        onDelete={deleteCard}
        deckLanguage={frontLanguage}
        onEnter={addAndFocusCard}
        focusRef={(ref: TextInput | null) => {
          if (ref) {
            focusRefs.current[card.id] = ref;
          } else {
            delete focusRefs.current[card.id];
          }
        }}
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
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
                    onPress={createNewHandler.bind(null, false)}
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
              <Text style={styles.saveText}>{saveButtonText}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Deck Selector Modal - shown on entry (not in edit mode) */}
      <DeckSelectorModal
        visible={showDeckSelector}
        onSelectNew={handleSelectNewDeck}
        onSelectExisting={handleSelectExistingDeck}
        onClose={() => {
          // If no selection was made yet, go back
          if (!deckSelectionDone) {
            router.back();
          } else {
            setShowDeckSelector(false);
          }
        }}
        showCloseButton={deckSelectionDone}
      />

      {/* Draft Modal - only for new deck mode */}
      {!selectedDeck && (
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
      )}
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
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
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
    marginBottom: 12,
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
  importButtonContainer: {
    backgroundColor: Colors.primary_700,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  importButtonText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "700",
  },
  selectedDeckBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.accent_500,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  selectedDeckText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700,
    flex: 1,
  },
  selectedDeckTitle: {
    fontWeight: "700",
  },
  changeDeckButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 12,
  },
  changeDeckButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary_100,
  },
});

import React, { useContext, useEffect, useRef, useState } from "react";
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
import { View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import NewCard from "../../components/createSelfScreen/newCard";
import { cloudFunctions } from "../../services/cloudFunctions";
import { router, useLocalSearchParams } from "expo-router";

import { UserContext } from "../../store/user-context";
import { ScrollView } from "react-native-gesture-handler";
import {
  CardCoreSchema,
  CardCore,
  safeValidateArray,
  Card,
  DeckCore,
} from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CreateSelfParams {
  cards?: string;
}

// Lokalny typ dla edycji - CardCore z id do identyfikacji podczas edycji
type EditableCard = CardCore & { id: string };

export default function createSelfScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typedParams = params as CreateSelfParams;

  const [cards, setCards] = useState<EditableCard[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [deckLanguage, setDeckLanguage] = useState<string>("en");
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const [draftFound, setDraftFound] = useState<any>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const draftKeyRef = "deck_draft";

  const userCtx = useContext(UserContext);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        if (typedParams.cards) {
          // If cards are passed via params, load them directly
          const gotCards = JSON.parse(typedParams.cards).map((card: any) => ({
            id: generageRandomUid(),
            cardData: {
              front: card.front,
              back: card.back,
            },
            tags: card.tags || [],
          })) as EditableCard[];
          setCards(gotCards);
        } else {
          // Check if draft exists in AsyncStorage
          const draftData = await AsyncStorage.getItem(draftKeyRef);
          if (draftData) {
            try {
              const draft = JSON.parse(draftData);
              if (draft.title || (draft.cards && draft.cards.length > 0)) {
                // Draft found - show modal to ask user
                setDraftFound(draft);
                setShowDraftModal(true);
              }
            } catch (parseError) {
              console.error("Error parsing draft:", parseError);
              // Clear corrupted draft
              await AsyncStorage.removeItem(draftKeyRef);
            }
          }
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    };
    loadDraft();
  }, []);

  // Handle user choice: continue with draft
  const handleContinueDraft = () => {
    if (draftFound) {
      setTitle(draftFound.title || "");
      const cardsWithId = (draftFound.cards || []).map((card: any) => ({
        id: card.id || generageRandomUid(),
        cardData: card.cardData || { front: "", back: "" },
        tags: card.tags || [],
      })) as EditableCard[];
      setCards(cardsWithId);
      setDeckLanguage(draftFound.deckLanguage || "en");
    }
    setShowDraftModal(false);
    setDraftFound(null);
  };

  // Handle user choice: start fresh
  const handleStartFresh = async () => {
    // Clear the draft
    await AsyncStorage.removeItem(draftKeyRef);
    setShowDraftModal(false);
    setDraftFound(null);
    // Reset to empty state
    setTitle("");
    setCards([]);
    setDeckLanguage("en");
  };

  // Autosave draft (3 seconds debounce)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if there's actual content
    const hasContent = title.trim().length > 0 || cards.length > 0;
    if (!hasContent) return;

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000); // 2 seconds debounce

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cards, title, deckLanguage]);

  // Save draft on unmount

  // Save draft to AsyncStorage (autosave)
  async function saveDraft(): Promise<void> {
    try {
      const hasContent = title.trim().length > 0 || cards.length > 0;
      if (!hasContent) {
        // Clear draft if empty
        await AsyncStorage.removeItem(draftKeyRef);
        return;
      }

      const draft = {
        title,
        cards: cards.map((card) => ({
          id: card.id,
          cardData: card.cardData,
          tags: card.tags,
        })),
        deckLanguage,
        savedAt: Date.now(),
      };

      await AsyncStorage.setItem(draftKeyRef, JSON.stringify(draft));
      const draftData = await AsyncStorage.getItem(draftKeyRef);
      console.log(draft);
      console.log("Draft saved", draftData);
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  }

  // Final save (create deck in Firestore)
  async function saveHandler(): Promise<void> {
    try {
      setIsLoading(true);

      // Clear draft after successful save
      await AsyncStorage.removeItem(draftKeyRef);

      // Prepare cards data for Cloud Function
      const cardsData = cards.map((card) => ({
        cardData: {
          front: card.cardData.front,
          back: card.cardData.back,
        },
        tags: card.tags || [],
      }));

      const deckData = {
        title,
        category: deckLanguage,
        icon: "cards",
        isPublic: true,
      } as DeckCore;

      const resultCards = safeValidateArray(cardsData, CardCoreSchema);
      if (!resultCards.success) {
        console.error("Invalid cards data", resultCards.error);
        throw new Error("Invalid cards data");
      }

      if (!userCtx.id) {
        throw new Error("User ID is required");
      }

      // Use Cloud Function to create deck with cards
      const result = await cloudFunctions.createDeckWithCards(
        deckData,
        resultCards.data,
        userCtx.id
      );

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
        },
      ];
    });
  }

  function titleChangeHandler(text: string): void {
    setTitle(text);
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View
          style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}
        >
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
          ) : (
            <>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
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

                {/* Wybór języka decku */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {[
                    { code: "en", label: "English" },
                    { code: "pl", label: "Polski" },
                    { code: "es", label: "Español" },
                    { code: "de", label: "Deutsch" },
                  ].map((lng) => (
                    <Pressable
                      key={lng.code}
                      onPress={() => setDeckLanguage(lng.code)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: Colors.primary_700,
                        backgroundColor:
                          deckLanguage === lng.code
                            ? Colors.primary_700
                            : Colors.primary_100,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            deckLanguage === lng.code
                              ? Colors.primary_100
                              : Colors.primary_700,
                          fontFamily: Fonts.primary,
                          fontWeight: "800",
                        }}
                      >
                        {lng.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.cardsSection}>
                  <Text style={styles.sectionTitle}>Karty</Text>
                  {cards.map((card) => {
                    return (
                      <NewCard
                        key={card.id}
                        card={card}
                        setCards={setCards}
                        deckLanguage={deckLanguage}
                      />
                    );
                  })}
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
                </View>
              </ScrollView>
              <Pressable onPress={saveHandler} style={styles.saveButton}>
                <Text style={styles.saveText}>Utwórz Deck</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Draft Modal */}
        <Modal
          visible={showDraftModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDraftModal(false)}
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
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
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

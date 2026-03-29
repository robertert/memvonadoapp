import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { AntDesign } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useLocalSearchParams } from "expo-router";
import { cloudFunctions } from "../../services/cloudFunctions";
import { useAuth } from "../../store/auth";
import { Card, CardCore } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { setEditedCard } from "../../utils/editedCardStore";

interface EditCardParams {
  cardId: string;
  deckId: string;
}

export default function editCard(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typedParams = params as unknown as EditCardParams;
  const { userId, isAdmin } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [card, setCard] = useState<Card | null>(null);
  const [front, setFront] = useState<string>("");
  const [back, setBack] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");

  // Duplicate detection state
  const [isDuplicate, setIsDuplicate] = useState(false);
  const frontCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCard();
  }, []);

  function scheduleDuplicateCheck(text: string, deckId: string, excludeCardId: string): void {
    if (frontCheckTimer.current) clearTimeout(frontCheckTimer.current);
    if (!text.trim()) {
      setIsDuplicate(false);
      return;
    }
    frontCheckTimer.current = setTimeout(async () => {
      try {
        const result = await cloudFunctions.checkDuplicateCardFront(deckId, text, excludeCardId);
        setIsDuplicate(result.isDuplicate);
      } catch {
        // silent fail
      }
    }, 500);
  }

  async function fetchCard(): Promise<void> {
    try {
      setIsLoading(true);
      if (!typedParams.cardId || !typedParams.deckId || !userId) {
        throw new Error("cardId, deckId and userId are required");
      }

      // Check if user is the author of the deck
      const { deck: deckData } = await cloudFunctions.getDeckDetails(
        typedParams.deckId
      );

      if (!deckData) {
        throw new Error("Deck not found");
      }

      // Allow editing if user is the author, an editor, or an admin
      const isOwner = deckData.createdBy === userId;
      const isEditorUser = deckData.editors?.includes(userId!) ?? false;
      if (!isOwner && !isEditorUser && !isAdmin) {
        alert(
          "Nie masz uprawnień do edycji tej karty. Tylko autor lub edytor decku może edytować karty."
        );
        router.back();
        return;
      }

      // Get card from source deck
      const { cards: deckCards } = await cloudFunctions.getDeckCards(
        typedParams.deckId,
        1000
      );
      const foundCard =
        deckCards.find((c) => c.id === typedParams.cardId) || null;

      if (!foundCard) {
        throw new Error("Card not found");
      }

      setCard(foundCard);
      setFront(foundCard.cardData.front);
      setBack(foundCard.cardData.back);
      setTags(foundCard.tags || []);

      // Check for duplicates on initial load
      scheduleDuplicateCheck(
        foundCard.cardData.front,
        typedParams.deckId,
        typedParams.cardId
      );
    } catch (error) {
      console.error("Error fetching card:", error);
      router.back();
    } finally {
      setIsLoading(false);
    }
  }

  async function saveHandler(): Promise<void> {
    try {
      setIsSaving(true);
      if (!card || !userId) return;

      const updatedCardData: CardCore = {
        cardData: {
          front: front.trim(),
          back: back.trim(),
        },
        tags: tags,
      };

      // Update source deck (only authors can edit)
      await cloudFunctions.updateCardContent(
        typedParams.deckId,
        typedParams.cardId,
        updatedCardData
      );

      // Store edited data so learn screens can update locally
      setEditedCard({
        cardId: typedParams.cardId,
        front: front.trim(),
        back: back.trim(),
        tags: tags,
      });

      router.back();
    } catch (error) {
      console.error("Error saving card:", error);
      alert("Nie udało się zapisać karty. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  }

  function addTag(): void {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  }

  function removeTag(tagToRemove: string): void {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }

  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.background}>
          <View
            style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}
          >
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <AntDesign
                name="arrow-left"
                size={24}
                color={Colors.primary_700}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Edytuj kartę</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent_500} />
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.background}>
        <View
          style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrow-left" size={24} color={Colors.primary_700} />
          </Pressable>
          <Text style={styles.headerTitle}>Edytuj kartę</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Front Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Front</Text>
              {isDuplicate && (
                <View style={styles.duplicateBadge}>
                  <AntDesign name="warning" size={13} color={Colors.primary_100} />
                  <Text style={styles.duplicateBadgeText}>Duplikat</Text>
                </View>
              )}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => {
                    setFront(text);
                    scheduleDuplicateCheck(text, typedParams.deckId, typedParams.cardId);
                  }}
                  value={front}
                  placeholder="Wprowadź treść frontu..."
                  placeholderTextColor={Colors.primary_700_50}
                  multiline
                />
              </View>
            </View>

            {/* Back Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Back</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={setBack}
                  value={back}
                  placeholder="Wprowadź treść backu..."
                  placeholderTextColor={Colors.primary_700_50}
                  multiline
                />
              </View>
            </View>

            {/* Tags Section */}
            <View style={styles.section}>
              <View style={styles.tagsHeader}>
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={24}
                  color={Colors.primary_700}
                />
                <Text style={styles.sectionLabel}>Tagi</Text>
              </View>

              {/* Add Tag Input */}
              <View style={styles.addTagContainer}>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Nowy tag..."
                    placeholderTextColor={Colors.primary_700_50}
                    value={newTag}
                    onChangeText={setNewTag}
                    onSubmitEditing={addTag}
                    blurOnSubmit={false}
                    autoCorrect={false}
                  />
                </View>
                <Pressable onPress={addTag} style={styles.addTagButton}>
                  <Text style={styles.addTagButtonText}>Dodaj</Text>
                </Pressable>
              </View>

              {/* Tags List */}
              {tags.length > 0 && (
                <View style={styles.tagsList}>
                  {tags.map((tag, idx) => (
                    <View key={tag + idx} style={styles.tagItem}>
                      <Text style={styles.tagText}>{tag}</Text>
                      <Pressable
                        style={styles.removeTagButton}
                        onPress={() => removeTag(tag)}
                      >
                        <Text style={styles.removeTagText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Save Button */}
          <Pressable
            onPress={saveHandler}
            style={styles.saveButton}
            disabled={isSaving || !front.trim() || !back.trim()}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.primary_100} />
            ) : (
              <Text style={styles.saveText}>Zapisz zmiany</Text>
            )}
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
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
    paddingBottom: 120,
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "800",
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 100,
  },
  duplicateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    gap: 5,
  },
  duplicateBadgeText: {
    color: Colors.primary_100,
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "700",
  },
  input: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "600",
    textAlignVertical: "top",
  },
  tagsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  addTagContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  tagInputContainer: {
    flex: 1,
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  tagInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 16,
  },
  addTagButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addTagButtonText: {
    color: Colors.primary_100,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagItem: {
    backgroundColor: Colors.accent_500_30,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  tagText: {
    color: Colors.primary_700,
    fontSize: 15,
    fontFamily: Fonts.primary,
    fontWeight: "600",
  },
  removeTagButton: {
    marginLeft: 6,
    padding: 1,
  },
  removeTagText: {
    color: Colors.red,
    fontSize: 17,
    fontWeight: "bold",
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
});

import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeftIcon } from "react-native-heroicons/solid";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "@/store/user-context";
import {
  Deck,
  DeckLearningData,
  safeValidateDeck,
  safeValidateDeckLearningData,
} from "../../types/index";

import {
  CATEGORY_OPTIONS,
  LEARNING_PACE_OPTIONS,
} from "../../constants/settings";

type DeckParams = {
  isOwner: string;
  deckId: string;
};

const ICON_OPTIONS = [
  "cards",
  "book",
  "school",
  "language",
  "library",
  "book-open-variant",
  "cards-outline",
  "flashcard",
];

export default function deckSettings(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typedParams = params as unknown as DeckParams;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deck, setDeck] = useState<DeckLearningData>();

  const [authorDeck, setAuthorDeck] = useState<Deck>();

  const [showIconModal, setShowIconModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isCustomPace, setIsCustomPace] = useState<boolean>(false);

  const userCtx = useContext(UserContext);

  useEffect(() => {
    fetchDeckData();
  }, []);

  async function fetchDeckData(): Promise<void> {
    try {
      setIsLoading(true);

      if (!userCtx?.id) throw new Error("No userCtx");

      if (params.isOwner === "true") {
        const { deck: deckData } = await cloudFunctions.getDeckDetails(
          typedParams.deckId
        );
        if (!deckData) throw new Error("Deck not found");
        const validatedDeck = safeValidateDeck(deckData);
        if (!validatedDeck.success) throw new Error("Invalid deckData");
        setAuthorDeck(validatedDeck.data);
      }

      const { deck: deckData } = await cloudFunctions.getUserDeckDetails(
        typedParams.deckId
      );

      if (!deckData) {
        const result = await cloudFunctions.startLearningDeck(
          typedParams.deckId
        );
        if (!result.success) throw new Error("Failed to start learning deck");
        if (!result.deck) throw new Error("No deck returned");
        setDeck(result.deck);
      }
      const validatedDeck = safeValidateDeckLearningData(deckData);
      if (!validatedDeck.success) throw new Error("Invalid deckData");

      setDeck(validatedDeck.data);
    } catch (error) {
      console.error("Error fetching deck data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings(): Promise<void> {
    try {
      setIsLoading(true);
      if (!deck) throw new Error("No deck");
      if (!authorDeck) throw new Error("No author deck");
      if (!userCtx.id) throw new Error("No userCtx");

      await Promise.all([
        cloudFunctions.updateDeckSettings(typedParams.deckId, authorDeck),
        cloudFunctions.updateUserDeckSettings(typedParams.deckId, deck),
      ]);
      console.log("Settings saved successfully");
      router.back();
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Błąd", "Nie udało się zapisać ustawień. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetDeck(): Promise<void> {
    try {
      setIsResetting(true);
      if (!userCtx.id) throw new Error("No userCtx");
      await cloudFunctions.resetDeck(typedParams.deckId);
      Alert.alert("Sukces", "Postęp decku został zresetowany pomyślnie.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error resetting deck:", error);
      Alert.alert("Błąd", "Nie udało się zresetować decku. Spróbuj ponownie.");
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <LinearGradient
        start={{ x: 0, y: 0 }}
        colors={[Colors.primary_100, Colors.primary_100]}
        style={styles.background}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          <ActivityIndicator
            size="large"
            color={Colors.primary_700}
            style={{ marginTop: 100 }}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      colors={[Colors.primary_100, Colors.primary_100]}
      style={styles.background}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeftIcon color={Colors.primary_700} size={30} />
          </Pressable>
          <Text style={styles.headerTitle}>Ustawienia decku</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tempo nauki */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tempo nauki</Text>
            <View style={styles.paceOptionsContainer}>
              {LEARNING_PACE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (!deck) return;
                    if (option.value === "custom") {
                      setIsCustomPace(true);
                      return;
                    }
                    setIsCustomPace(false);
                    setDeck({
                      ...deck,
                      settings: {
                        ...deck.settings,
                        newCardsNumPerDay:
                          option.value === "slow"
                            ? LEARNING_PACE_OPTIONS.find(
                                (opt) => opt.value === "slow"
                              )?.numPerDay || 5
                            : option.value === "medium"
                            ? LEARNING_PACE_OPTIONS.find(
                                (opt) => opt.value === "medium"
                              )?.numPerDay || 15
                            : LEARNING_PACE_OPTIONS.find(
                                (opt) => opt.value === "fast"
                              )?.numPerDay || 30,
                      },
                    });
                  }}
                  style={[
                    styles.paceOption,
                    deck?.settings.newCardsNumPerDay === option.numPerDay &&
                      styles.paceOptionActive,
                  ]}
                >
                  <Text style={styles.paceEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.paceOptionLabel,
                      deck?.settings.newCardsNumPerDay === option.numPerDay &&
                        styles.paceOptionLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Wyświetlanie liczby kart dziennie */}
            <View style={styles.paceInfoContainer}>
              <Text style={styles.paceInfoText}>
                {LEARNING_PACE_OPTIONS.find(
                  (opt) => opt.numPerDay === deck?.settings.newCardsNumPerDay
                )?.description || ""}
              </Text>
            </View>

            {isCustomPace && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>
                  Liczba nowych kart dziennie:
                </Text>
                <TextInput
                  style={styles.customInput}
                  value={deck?.settings.newCardsNumPerDay?.toString() || ""}
                  onChangeText={(text) => {
                    if (!deck) return;
                    const num = parseInt(text) || 0;
                    setDeck({
                      ...deck,
                      settings: {
                        ...deck.settings,
                        newCardsNumPerDay: num > 0 ? num : -1,
                      },
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="10"
                />
              </View>
            )}
          </View>

          {/* Tryb zen */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Tryb zen</Text>
                <Text style={styles.settingDescription}>
                  Wyłącz wszystkie rozpraszacze podczas nauki
                </Text>
              </View>
              <Switch
                value={deck?.settings.zenMode}
                onValueChange={(value) => {
                  if (!deck) return;
                  setDeck({
                    ...deck,
                    settings: { ...deck.settings, zenMode: value },
                  });
                }}
                trackColor={{
                  false: Colors.primary_500,
                  true: Colors.accent_500,
                }}
                thumbColor={Colors.primary_700}
              />
            </View>
          </View>
          {/* Ikonka decku */}
          {typedParams.isOwner === "true" && (
            <>
              <View style={styles.section}>
                <Pressable
                  onPress={() => setShowIconModal(true)}
                  style={styles.settingRow}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Ikonka decku</Text>
                    <View style={styles.iconPreview}>
                      <MaterialCommunityIcons
                        name={authorDeck?.icon as any}
                        size={24}
                        color={Colors.primary_700}
                      />
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={Colors.primary_700}
                  />
                </Pressable>
              </View>

              {/* Kategoria decku */}
              <View style={styles.section}>
                <Pressable
                  onPress={() => setShowCategoryModal(true)}
                  style={styles.settingRow}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Kategoria decku</Text>
                    <Text style={styles.settingValue}>
                      {authorDeck?.category || "Nie wybrano"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={Colors.primary_700}
                  />
                </Pressable>
              </View>

              {/* Edycja decku */}
              <View style={styles.section}>
                <Pressable
                  onPress={() => {
                    router.push({
                      pathname: "./createSelfScreen",
                      params: { deckId: typedParams.deckId, edit: "true" },
                    });
                  }}
                  style={[styles.settingRow, styles.editButton]}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={24}
                    color={Colors.primary_700}
                  />
                  <Text style={styles.editButtonText}>Edytuj deck</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={Colors.primary_700}
                  />
                </Pressable>
              </View>
            </>
          )}
          {/* Reset decku */}
          <View style={styles.section}>
            <Pressable
              onPress={() => {
                if (isResetting) return;
                Alert.alert(
                  "Reset decku",
                  "Czy na pewno chcesz zresetować cały postęp w tym decku? Ta operacja jest nieodwracalna i usunie wszystkie dane o nauce kart.",
                  [
                    {
                      text: "Anuluj",
                      style: "cancel",
                    },
                    {
                      text: "Resetuj",
                      style: "destructive",
                      onPress: handleResetDeck,
                    },
                  ]
                );
              }}
              style={[styles.settingRow, styles.resetButton]}
              disabled={isResetting}
            >
              {isResetting ? (
                <ActivityIndicator size="small" color={Colors.red} />
              ) : (
                <MaterialCommunityIcons
                  name="restart"
                  size={24}
                  color={Colors.red}
                />
              )}
              <Text style={styles.resetButtonText}>
                {isResetting ? "Resetowanie..." : "Resetuj postęp decku"}
              </Text>
              {!isResetting && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={Colors.red}
                />
              )}
            </Pressable>
          </View>

          {/* Przycisk zapisu */}
          <Pressable onPress={saveSettings} style={styles.saveButton}>
            <View style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
            </View>
          </Pressable>
        </ScrollView>
        {/* Modal wyboru ikony */}
        <Modal
          visible={showIconModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowIconModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Wybierz ikonę</Text>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.iconGrid}>
                  {ICON_OPTIONS.map((icon) => (
                    <Pressable
                      key={icon}
                      style={[
                        styles.iconOption,
                        authorDeck?.icon === icon && styles.iconOptionActive,
                      ]}
                      onPress={() => {
                        if (!authorDeck) return;
                        setAuthorDeck({ ...authorDeck, icon: icon as any });
                        setShowIconModal(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={32}
                        color={
                          authorDeck?.icon === icon
                            ? Colors.primary_100
                            : Colors.primary_700
                        }
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowIconModal(false)}
              >
                <Text style={styles.modalCloseText}>Anuluj</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal wyboru kategorii */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Wybierz kategorię</Text>
              <ScrollView style={styles.modalScroll}>
                {CATEGORY_OPTIONS.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.modalItem}
                    onPress={() => {
                      if (!authorDeck) return;
                      setAuthorDeck({ ...authorDeck, category });
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{category}</Text>
                    {authorDeck?.category === category && (
                      <MaterialCommunityIcons
                        name="check"
                        size={24}
                        color={Colors.primary_700}
                      />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.modalCloseText}>Anuluj</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginBottom: 16,
  },
  paceOptionsContainer: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 0,
    gap: 4,
    justifyContent: "space-between",
    width: "100%",
  },
  paceOption: {
    backgroundColor: Colors.primary_100,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  paceOptionActive: {
    backgroundColor: Colors.primary_700,
    borderColor: Colors.accent_500,
    borderWidth: 2,
  },
  paceEmoji: {
    fontSize: 18,
    marginBottom: 0,
  },
  paceOptionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
  },
  paceInfoContainer: {
    marginTop: 8,
    paddingTop: 8,
    alignItems: "center",
  },
  paceInfoText: {
    fontSize: 13,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontWeight: "600",
  },
  paceOptionLabelActive: {
    color: Colors.primary_100,
  },
  customInputContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.primary_700,
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    opacity: 0.7,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginTop: 4,
  },
  languageValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  flagIcon: {
    width: 18,
    height: 18,
    borderRadius: 2,
  },
  iconPreview: {
    marginTop: 8,
  },
  editButton: {
    backgroundColor: Colors.accent_500,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  editButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  saveButton: {
    alignSelf: "center",
    width: "80%",
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 25,
    overflow: "hidden",
  },
  saveButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    backgroundColor: Colors.accent_500,
  },
  saveButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.primary_500,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalFlagIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  modalItemText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.accent_500,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.primary_500,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  iconOptionActive: {
    backgroundColor: Colors.primary_700,
    borderColor: Colors.accent_500,
  },
  resetButton: {
    backgroundColor: Colors.primary_500,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: "#FF4444",
  },
  resetButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF4444",
    fontFamily: Fonts.primary,
  },
});

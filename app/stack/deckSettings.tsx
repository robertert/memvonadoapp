import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Colors, Fonts, Subjects } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeftIcon } from "react-native-heroicons/solid";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cloudFunctions } from "../../services/cloudFunctions";

interface DeckParams {
  deckId: string;
}

interface DeckSettings {
  learningPace: "slow" | "medium" | "fast" | "custom";
  customCardsPerDay?: number;
  zenMode: boolean;
  language: string;
  icon: string;
  category: string;
}

const LEARNING_PACE_OPTIONS = [
  {
    value: "slow",
    label: "Spokojnie",
    description: "5 kart/dzień",
    emoji: "🐢",
  },
  {
    value: "medium",
    label: "Normalne",
    description: "15 kart/dzień",
    emoji: "🚶",
  },
  {
    value: "fast",
    label: "Turbo",
    description: "30 kart/dzień",
    emoji: "⚡",
  },
  {
    value: "custom",
    label: "Własne",
    description: "Ustaw ręcznie",
    emoji: "⚙️",
  },
];

const LANGUAGE_OPTIONS = [
  {
    code: "en",
    label: "English",
    flag: require("../../assets/images/gbFlag.png"),
  },
  {
    code: "pl",
    label: "Polski",
    flag: require("../../assets/images/gbFlag.png"),
  }, // Placeholder
  {
    code: "es",
    label: "Español",
    flag: require("../../assets/images/esFlag.png"),
  },
  {
    code: "de",
    label: "Deutsch",
    flag: require("../../assets/images/deFlag.png"),
  },
  {
    code: "fr",
    label: "Français",
    flag: require("../../assets/images/frFlag.png"),
  },
  {
    code: "it",
    label: "Italiano",
    flag: require("../../assets/images/gbFlag.png"),
  }, // Placeholder
];

function getLanguageFlag(code: string) {
  const lang = LANGUAGE_OPTIONS.find((l) => l.code === code);
  return lang?.flag || require("../../assets/images/gbFlag.png");
}

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
  const [deck, setDeck] = useState<any>(null);
  const [settings, setSettings] = useState<DeckSettings>({
    learningPace: "medium",
    customCardsPerDay: 10,
    zenMode: false,
    language: "en",
    icon: "cards",
    category: "",
  });
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [showIconModal, setShowIconModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    fetchDeckData();
  }, []);

  async function fetchDeckData(): Promise<void> {
    try {
      setIsLoading(true);
      const { deck: deckData } = await cloudFunctions.getDeckDetails(
        typedParams.deckId
      );
      setDeck(deckData);

      // Załaduj ustawienia jeśli istnieją
      if (deckData?.settings) {
        setSettings({
          learningPace: deckData.settings.learningPace || "medium",
          customCardsPerDay: deckData.settings.customCardsPerDay || 10,
          zenMode: deckData.settings.zenMode || false,
          language: deckData.settings.language || "en",
          icon: deckData.settings.icon || "cards",
          category: deckData.settings.category || deckData?.subject || "",
        });
      } else {
        // Domyślne ustawienia z danymi decku
        setSettings({
          learningPace: "medium",
          customCardsPerDay: 10,
          zenMode: false,
          language: deckData?.language || "en",
          icon: "cards",
          category: deckData?.subject || "",
        });
      }
    } catch (error) {
      console.error("Error fetching deck data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings(): Promise<void> {
    try {
      setIsLoading(true);
      await cloudFunctions.updateDeckSettings(typedParams.deckId, settings);
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

  function getPaceDescription(pace: string): string {
    const option = LEARNING_PACE_OPTIONS.find((opt) => opt.value === pace);
    return option?.description || "";
  }

  function getLanguageLabel(code: string): string {
    const lang = LANGUAGE_OPTIONS.find((l) => l.code === code);
    return lang?.label || code;
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
                    setSettings({
                      ...settings,
                      learningPace: option.value as any,
                    });
                  }}
                  style={[
                    styles.paceOption,
                    settings.learningPace === option.value &&
                      styles.paceOptionActive,
                  ]}
                >
                  <Text style={styles.paceEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.paceOptionLabel,
                      settings.learningPace === option.value &&
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
                {settings.learningPace === "slow" && "5 nowych kart dziennie"}
                {settings.learningPace === "medium" &&
                  "15 nowych kart dziennie"}
                {settings.learningPace === "fast" && "30 nowych kart dziennie"}
                {settings.learningPace === "custom" &&
                  settings.customCardsPerDay &&
                  `${settings.customCardsPerDay} nowych kart dziennie`}
                {settings.learningPace === "custom" &&
                  !settings.customCardsPerDay &&
                  "Ustaw liczbę kart ręcznie"}
              </Text>
            </View>

            {settings.learningPace === "custom" && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>
                  Liczba nowych kart dziennie:
                </Text>
                <TextInput
                  style={styles.customInput}
                  value={settings.customCardsPerDay?.toString() || ""}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    setSettings({
                      ...settings,
                      customCardsPerDay: num > 0 ? num : undefined,
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
                value={settings.zenMode}
                onValueChange={(value) => {
                  setSettings({ ...settings, zenMode: value });
                }}
                trackColor={{
                  false: Colors.primary_500,
                  true: Colors.accent_500,
                }}
                thumbColor={Colors.primary_700}
              />
            </View>
          </View>

          {/* Język decku */}
          <View style={styles.section}>
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Język decku</Text>
                <View style={styles.languageValueContainer}>
                  <Image
                    source={getLanguageFlag(settings.language)}
                    style={styles.flagIcon}
                  />
                  <Text style={styles.settingValue}>
                    {getLanguageLabel(settings.language)}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.primary_700}
              />
            </Pressable>
          </View>

          {/* Ikonka decku */}
          <View style={styles.section}>
            <Pressable
              onPress={() => setShowIconModal(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Ikonka decku</Text>
                <View style={styles.iconPreview}>
                  <MaterialCommunityIcons
                    name={settings.icon as any}
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
                  {settings.category || "Nie wybrano"}
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

        {/* Modal wyboru języka */}
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Wybierz język</Text>
              <ScrollView style={styles.modalScroll}>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <Pressable
                    key={lang.code}
                    style={styles.modalItem}
                    onPress={() => {
                      setSettings({ ...settings, language: lang.code });
                      setShowLanguageModal(false);
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <Image source={lang.flag} style={styles.modalFlagIcon} />
                      <Text style={styles.modalItemText}>{lang.label}</Text>
                    </View>
                    {settings.language === lang.code && (
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
                onPress={() => setShowLanguageModal(false)}
              >
                <Text style={styles.modalCloseText}>Anuluj</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

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
                        settings.icon === icon && styles.iconOptionActive,
                      ]}
                      onPress={() => {
                        setSettings({ ...settings, icon });
                        setShowIconModal(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={32}
                        color={
                          settings.icon === icon
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
                {Subjects.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.modalItem}
                    onPress={() => {
                      setSettings({ ...settings, category });
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{category}</Text>
                    {settings.category === category && (
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

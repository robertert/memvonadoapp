import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Colors, Fonts } from "@/constants/colors";
import { XMarkIcon } from "react-native-heroicons/outline";
import { LanguageIcon } from "react-native-heroicons/solid";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { router } from "expo-router";

import DeckSelector from "./DeckSelector";
import { useQuickAdd, QuickAddSource } from "@/store/quickAdd-context";
import { cloudFunctions } from "@/services/cloudFunctions";
import { useTranslation } from "@/hooks/useTranslation";
import type { DeckLearningData } from "@/types";

const MAX_CHARS = 3000;

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (cardId: string, deckId: string) => void;
  initialFront?: string;
  initialBack?: string;
  initialDeckId?: string;
  source?: QuickAddSource;
}

export default function QuickAddModal({
  visible,
  onClose,
  onSuccess,
  initialFront = "",
  initialBack = "",
  initialDeckId,
  source = "manual",
}: QuickAddModalProps): React.JSX.Element {
  const { setLastUsedDeckId } = useQuickAdd();
  const {
    translate,
    isTranslating,
    error: translationError,
    isSupported,
    remainingToday,
    isLimitReached,
  } = useTranslation();

  // Form state
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const [selectedDeck, setSelectedDeck] = useState<DeckLearningData | null>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);

  // Track if we've auto-translated for this session
  const autoTranslatedRef = useRef(false);

  // Reset form when modal opens with new params
  useEffect(() => {
    if (visible) {
      setFront(initialFront);
      setBack(initialBack);
      autoTranslatedRef.current = false;
    }
  }, [visible, initialFront, initialBack]);

  // Auto-translate when modal opens with front text and deck has languages
  useEffect(() => {
    const shouldAutoTranslate =
      visible &&
      initialFront &&
      !initialBack &&
      selectedDeck?.frontLanguage &&
      selectedDeck?.backLanguage &&
      isSupported(selectedDeck.frontLanguage, selectedDeck.backLanguage) &&
      !autoTranslatedRef.current &&
      !isLimitReached;

    if (shouldAutoTranslate) {
      autoTranslatedRef.current = true;
      performTranslation(initialFront);
    }
  }, [visible, initialFront, initialBack, selectedDeck, isSupported, isLimitReached]);

  // Perform translation
  const performTranslation = async (textToTranslate: string) => {
    if (!selectedDeck?.frontLanguage || !selectedDeck?.backLanguage) {
      return;
    }

    const result = await translate(
      textToTranslate,
      selectedDeck.frontLanguage,
      selectedDeck.backLanguage
    );

    if (result) {
      setBack(result);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle deck selection
  const handleDeckSelect = useCallback((deck: DeckLearningData) => {
    setSelectedDeck(deck);
  }, []);

  // Handle create new deck
  const handleCreateNew = useCallback(() => {
    onClose();
    router.push("../stack/createSelfScreen");
  }, [onClose]);

  // Handle missing languages warning
  const handleNoLanguages = useCallback((deck: DeckLearningData) => {
    Toast.show({
      type: "info",
      text1: "Brak jezykow",
      text2: "Ustaw jezyki w ustawieniach talii, aby wlaczyc tlumaczenie.",
      visibilityTime: 3000,
    });
    // Still select the deck, just without translation
    setSelectedDeck(deck);
  }, []);

  // Save card
  const handleSave = async () => {
    if (!front.trim()) {
      Toast.show({
        type: "error",
        text1: "Blad",
        text2: "Przod karty nie moze byc pusty.",
        visibilityTime: 2000,
      });
      return;
    }

    if (!selectedDeck) {
      Toast.show({
        type: "error",
        text1: "Blad",
        text2: "Wybierz talie.",
        visibilityTime: 2000,
      });
      return;
    }

    try {
      setIsSaving(true);

      const result = await cloudFunctions.addCardToDeck(
        selectedDeck.id,
        { front: front.trim(), back: back.trim() },
        source
      );

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Save last used deck
      await setLastUsedDeckId(selectedDeck.id);

      // Show success toast
      Toast.show({
        type: "success",
        text1: "Dodano karte!",
        visibilityTime: 2000,
      });

      // Callback
      onSuccess?.(result.cardId, selectedDeck.id);

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error saving card:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: "Blad",
        text2: "Nie udalo sie dodac karty. Sprobuj ponownie.",
        visibilityTime: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle translate button
  const handleTranslate = async () => {
    if (!front.trim()) {
      Toast.show({
        type: "info",
        text1: "Wpisz tekst",
        text2: "Wpisz tekst na przodzie karty, aby przetlumaczyc.",
        visibilityTime: 2000,
      });
      return;
    }

    if (!selectedDeck?.frontLanguage || !selectedDeck?.backLanguage) {
      Toast.show({
        type: "info",
        text1: "Brak jezykow",
        text2: "Ustaw jezyki w ustawieniach talii.",
        visibilityTime: 2000,
      });
      return;
    }

    if (!isSupported(selectedDeck.frontLanguage, selectedDeck.backLanguage)) {
      Toast.show({
        type: "info",
        text1: "Nieobslugiwane jezyki",
        text2: "Ta kombinacja jezykow nie jest jeszcze wspierana.",
        visibilityTime: 2000,
      });
      return;
    }

    if (isLimitReached) {
      Toast.show({
        type: "info",
        text1: "Limit osiagniety",
        text2: "Dzienny limit tlumaczen (200) zostal osiagniety. Sprobuj jutro.",
        visibilityTime: 3000,
      });
      return;
    }

    await performTranslation(front.trim());

    // Show error if translation failed
    if (translationError) {
      Toast.show({
        type: "error",
        text1: "Blad tlumaczenia",
        text2: translationError,
        visibilityTime: 3000,
      });
    }
  };

  const canTranslate =
    selectedDeck?.frontLanguage &&
    selectedDeck?.backLanguage &&
    front.trim().length > 0 &&
    isSupported(selectedDeck.frontLanguage, selectedDeck.backLanguage) &&
    !isLimitReached;
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Szybkie dodawanie</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <XMarkIcon size={24} color={Colors.primary_700} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Deck Selector */}
            <DeckSelector
              selectedDeckId={initialDeckId || null}
              onDeckSelect={handleDeckSelect}
              onCreateNew={handleCreateNew}
              onNoLanguages={handleNoLanguages}
            />

            {/* Front Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Przod</Text>
                <Text style={styles.charCount}>
                  {front.length}/{MAX_CHARS}
                </Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={front}
                onChangeText={(text) =>
                  setFront(text.slice(0, MAX_CHARS))
                }
                placeholder="Wpisz tekst..."
                placeholderTextColor={Colors.primary_700_50}
                multiline
                maxLength={MAX_CHARS}
                autoFocus={!initialFront}
              />
            </View>

            {/* Back Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Tyl</Text>
                <Text style={styles.charCount}>
                  {back.length}/{MAX_CHARS}
                </Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={back}
                onChangeText={(text) =>
                  setBack(text.slice(0, MAX_CHARS))
                }
                placeholder="Wpisz tlumaczenie lub odpowiedz..."
                placeholderTextColor={Colors.primary_700_50}
                multiline
                maxLength={MAX_CHARS}
              />

              {/* Translate Button */}
              <View style={styles.translateRow}>
                <Pressable
                  style={[
                    styles.translateButton,
                    (!canTranslate || isTranslating) && styles.translateButtonDisabled,
                  ]}
                  onPress={handleTranslate}
                  disabled={isTranslating || !canTranslate}
                >
                  {isTranslating ? (
                    <ActivityIndicator size="small" color={Colors.primary_500} />
                  ) : (
                    <>
                      <LanguageIcon
                        size={16}
                        color={canTranslate ? Colors.primary_500 : Colors.primary_700_50}
                      />
                      <Text
                        style={[
                          styles.translateButtonText,
                          !canTranslate && styles.translateButtonTextDisabled,
                        ]}
                      >
                        Przetlumacz
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Translation limit indicator */}
                {selectedDeck?.frontLanguage && selectedDeck?.backLanguage && (
                  <Text
                    style={[
                      styles.limitText,
                      isLimitReached && styles.limitTextReached,
                    ]}
                  >
                    {isLimitReached
                      ? "Limit osiagniety"
                      : `${remainingToday} pozostalo`}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Anuluj</Text>
            </Pressable>

            <Pressable
              style={[
                styles.saveButton,
                (!front.trim() || !selectedDeck || isSaving) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!front.trim() || !selectedDeck || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Dodaj karte</Text>
              )}
            </Pressable>
          </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.primary,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  scrollView: {
    flexGrow: 0,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary_700,
  },
  charCount: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_700_50,
  },
  textInput: {
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    padding: 14,
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.primary_700_30,
  },
  translateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary_100,
  },
  translateButtonDisabled: {
    opacity: 0.5,
  },
  translateButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary_500,
    marginLeft: 6,
  },
  translateButtonTextDisabled: {
    color: Colors.primary_700_50,
  },
  limitText: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_700_50,
  },
  limitTextReached: {
    color: Colors.red,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary_100,
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_700,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary_500,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
});

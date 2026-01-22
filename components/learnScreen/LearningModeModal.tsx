import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Switch,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { CalendarDaysIcon, BoltIcon } from "react-native-heroicons/solid";
import type { LearningMode } from "@/types";

interface LearningModeModalProps {
  visible: boolean;
  onSelectMode: (mode: LearningMode) => void;
  onClose: () => void;
}

export default function LearningModeModal({
  visible,
  onSelectMode,
  onClose,
}: LearningModeModalProps): React.JSX.Element {

  function handleModeSelect(mode: LearningMode): void {
    onSelectMode(mode);
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Wybierz tryb nauki</Text>
          <Text style={styles.modalSubtitle}>
            Jak chcesz dzisiaj uczyc sie tej talii?
          </Text>

          <View style={styles.cardsContainer}>
            {/* SRS Card */}
            <Pressable
              style={({ pressed }) => [
                styles.modeCard,
                pressed && styles.modeCardPressed,
              ]}
              onPress={() => handleModeSelect("srs")}
            >
              <View style={styles.iconContainer}>
                <CalendarDaysIcon size={48} color={Colors.primary_700} />
              </View>
              <Text style={styles.modeTitle}>Inteligentne powtórki</Text>
              <Text style={styles.modeDescription}>
              Inwestycja w pamięć długotrwałą. System planuje naukę tak, aby materiał został w Twojej głowie na lata, a nie tylko do jutrzejszego sprawdzianu
              </Text>
            </Pressable>

            {/* All in One Card */}
            <Pressable
              style={({ pressed }) => [
                styles.modeCard,
                styles.modeCardAccent,
                pressed && styles.modeCardPressed,
              ]}
              onPress={() => handleModeSelect("all_in_one")}
            >
              <View style={styles.iconContainerAccent}>
                <BoltIcon size={48} color={Colors.primary_700} />
              </View>
              <Text style={styles.modeTitle}>Wszystko naraz</Text>
              <Text style={styles.modeDescription}>
              Przerób całą talię w jednej sesji. Karty, których nie znasz, wracają po kilku ruchach, aż do skutku. Idealne do zakuwania przed testem.
              </Text>
            </Pressable>
          </View>

          {/* Cancel button */}
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Anuluj</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  modeCardAccent: {
    borderColor: Colors.accent_500,
  },
  modeCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary_100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconContainerAccent: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent_500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 12,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    opacity: 0.7,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary_500,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rememberText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  cancelButton: {
    backgroundColor: Colors.primary_500,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
});

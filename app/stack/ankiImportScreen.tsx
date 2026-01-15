import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { cloudFunctions } from "../../services/cloudFunctions";
import type { Card } from "@/types";

export default function ankiImportScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  async function pickAnkiFile(): Promise<void> {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name || "Nieznany plik",
          uri: asset.uri,
        });
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Błąd", "Nie udało się wybrać pliku");
      console.error("Error picking file:", error);
    }
  }

  async function handleImport(): Promise<void> {
    if (!selectedFile) {
      Alert.alert("Błąd", "Proszę wybrać plik Anki (.apkg)");
      return;
    }

    try {
      setIsImporting(true);

      // Odczytaj plik jako base64 używając nowego API Expo SDK 54
      const file = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Wywołaj Cloud Function
      const importResponse = await cloudFunctions.importAnkiDeck(file);

      // Konwersja kart z formatu Card na format oczekiwany przez loadDraft
      // loadDraft oczekuje formatu: { front: string, back: string, tags: string[] }[]
      console.log(JSON.stringify(importResponse, null, 2));

      const cardsForDraft = importResponse.cards.map((card: Card) => ({
        front: card.cardData.front,
        back: card.cardData.back,
        tags: card.tags || [],
      }));

      // Przekieruj do createSelfScreen z zaimportowanymi kartami
      router.push({
        pathname: "../stack/createSelfScreen",
        params: { cards: JSON.stringify(cardsForDraft) },
      });
    } catch (error) {
      setIsImporting(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nie udało się zaimportować talii Anki";
      Alert.alert("Błąd importu", errorMessage);
      console.error("Error importing Anki deck:", error);
    }
  }

  function goBackHandler(): void {
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={goBackHandler} style={styles.backButton}>
          <Ionicons
            style={styles.backIcon}
            name="chevron-back"
            size={35}
            color={Colors.primary_700}
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Importuj talię z Anki</Text>
        <Text style={styles.subtitle}>
          Wybierz plik .apkg z talii Anki do zaimportowania
        </Text>

        {/* Przycisk wyboru pliku */}
        <Pressable
          style={styles.filePickerButton}
          onPress={pickAnkiFile}
          disabled={isLoading || isImporting}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary_700} />
          ) : (
            <>
              <Ionicons
                name="document-attach"
                size={24}
                color={Colors.primary_700}
              />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : "Wybierz plik .apkg"}
              </Text>
            </>
          )}
        </Pressable>

        {/* Wyświetlanie wybranego pliku */}
        {selectedFile && !isLoading && (
          <View style={styles.selectedFileContainer}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.accent_500}
            />
            <Text style={styles.selectedFileText}>
              Wybrano: {selectedFile.name}
            </Text>
          </View>
        )}

        {/* Przycisk importu */}
        <Pressable
          style={[
            styles.importButton,
            (!selectedFile || isImporting) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={!selectedFile || isImporting}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color={Colors.primary_100} />
          ) : (
            <Text style={styles.importButtonText}>Importuj talię</Text>
          )}
        </Pressable>

        {isImporting && (
          <Text style={styles.importingText}>
            Importowanie talii... To może chwilę potrwać.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: Colors.primary_100,
  },
  top: {
    alignItems: "flex-start",
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 40,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    borderStyle: "dashed",
    marginBottom: 20,
  },
  filePickerText: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    color: Colors.primary_700,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  selectedFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.accent_500,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent_500,
  },
  selectedFileText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "600",
  },
  importButton: {
    width: "100%",
    backgroundColor: Colors.primary_700,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  importButtonDisabled: {
    backgroundColor: Colors.primary_700_50,
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 20,
    color: Colors.primary_100,
    fontFamily: Fonts.primary,
    fontWeight: "900",
  },
  importingText: {
    marginTop: 20,
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
    textAlign: "center",
  },
});

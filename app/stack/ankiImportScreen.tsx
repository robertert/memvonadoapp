import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../../firebase";
import { cloudFunctions } from "../../services/cloudFunctions";
import DeckSelectorModal, {
  SelectedDeck,
} from "../../components/DeckSelectorModal";

export default function ankiImportScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [deckTitle, setDeckTitle] = useState<string>("");

  // Deck selection state
  const [showDeckSelector, setShowDeckSelector] = useState<boolean>(false);
  const [selectedDeck, setSelectedDeck] = useState<SelectedDeck | null>(null);
  const [isNewDeck, setIsNewDeck] = useState<boolean>(true);

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

        // Use file name (without extension) as default deck title
        if (!deckTitle && asset.name) {
          const nameWithoutExt = asset.name.replace(/\.apkg$/i, "");
          setDeckTitle(nameWithoutExt);
        }
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Blad", "Nie udalo sie wybrac pliku");
      console.error("Error picking file:", error);
    }
  }

  // Handle new deck selection
  const handleSelectNewDeck = () => {
    setSelectedDeck(null);
    setIsNewDeck(true);
    setShowDeckSelector(false);
  };

  // Handle existing deck selection
  const handleSelectExistingDeck = (deck: SelectedDeck) => {
    setSelectedDeck(deck);
    setIsNewDeck(false);
    setShowDeckSelector(false);
  };

  async function handleImport(): Promise<void> {
    if (!selectedFile) {
      Alert.alert("Blad", "Prosze wybrac plik Anki (.apkg)");
      return;
    }

    try {
      setIsImporting(true);

      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      const timestamp = Date.now();
      const fileName = selectedFile.name || `deck_${timestamp}.apkg`;
      const storagePath = `imports/${timestamp}_${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob);

      // If importing to existing deck, we'd need backend support for targetDeckId
      // For now, we always create a new deck but use the provided title
      const importResponse = await cloudFunctions.importAnkiDeck(
        storagePath,
        isNewDeck ? (deckTitle.trim() || undefined) : selectedDeck?.title
      );

      // If we selected an existing deck, we would ideally merge cards
      // This requires backend modification to support targetDeckId param
      // For now, it creates a new deck

      // Przekieruj do szczegolow utworzonej talii
      router.replace({
        pathname: "../stack/deckDetails",
        params: { deckId: importResponse.deckId },
      });
    } catch (error) {
      setIsImporting(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nie udalo sie zaimportowac talii Anki";
      Alert.alert("Blad importu", errorMessage);
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
        <Text style={styles.title}>Importuj talie z Anki</Text>
        <Text style={styles.subtitle}>
          Wybierz plik .apkg z talii Anki do zaimportowania
        </Text>

        {/* Deck selection */}
        <View style={styles.deckSelectionContainer}>
          <Text style={styles.sectionLabel}>Gdzie zaimportowac?</Text>
          <Pressable
            style={styles.deckSelectionButton}
            onPress={() => setShowDeckSelector(true)}
          >
            <Ionicons
              name={isNewDeck ? "add-circle-outline" : "folder-outline"}
              size={22}
              color={Colors.primary_700}
            />
            <Text style={styles.deckSelectionText} numberOfLines={1}>
              {isNewDeck
                ? "Utworz nowa talie"
                : `Dodaj do: ${selectedDeck?.title}`}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={Colors.primary_700_50}
            />
          </Pressable>
        </View>

        {/* Pole tytulu talii - only for new deck */}
        {isNewDeck && (
          <View style={styles.titleInputContainer}>
            <Text style={styles.titleLabel}>Tytul talii</Text>
            <TextInput
              style={styles.titleInput}
              value={deckTitle}
              onChangeText={setDeckTitle}
              placeholder="Wprowadz tytul talii..."
              placeholderTextColor={Colors.primary_700_50}
            />
          </View>
        )}

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

        {/* Wyswietlanie wybranego pliku */}
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
            <Text style={styles.importButtonText}>
              {isNewDeck ? "Importuj talie" : "Importuj i dodaj karty"}
            </Text>
          )}
        </Pressable>

        {isImporting && (
          <Text style={styles.importingText}>
            Importowanie talii... To moze chwile potrwac.
          </Text>
        )}
      </View>

      {/* Deck Selector Modal */}
      <DeckSelectorModal
        visible={showDeckSelector}
        onSelectNew={handleSelectNewDeck}
        onSelectExisting={handleSelectExistingDeck}
        onClose={() => setShowDeckSelector(false)}
        showCloseButton={true}
      />
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
    marginBottom: 30,
  },
  sectionLabel: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary_700,
    marginBottom: 10,
  },
  deckSelectionContainer: {
    width: "100%",
    marginBottom: 20,
  },
  deckSelectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    gap: 10,
  },
  deckSelectionText: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "600",
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
  titleInputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  titleLabel: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 10,
  },
  titleInput: {
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 18,
    color: Colors.primary_700,
    fontWeight: "600",
  },
});

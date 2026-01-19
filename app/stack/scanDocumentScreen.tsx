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
import { Colors, Fonts } from "../../constants/colors"; // Upewnij się, że ścieżka jest poprawna
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../../firebase"; // Twoja konfiguracja Firebase
import { cloudFunctions } from "../../services/cloudFunctions"; // Twój serwis do funkcji

export default function ScanDocumentScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  // Stan dla pliku (teraz przechowujemy też mimeType dla backendu)
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    mimeType: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false); // Wybieranie pliku
  const [isScanning, setIsScanning] = useState<boolean>(false); // Proces AI

  async function pickDocument(): Promise<void> {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        // Akceptujemy PDF i Obrazki
        type: ["application/pdf", "image/*"],
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType || "application/pdf", // Domyślnie PDF jeśli brak info
        });
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Błąd", "Nie udało się wybrać pliku");
      console.error("Error picking file:", error);
    }
  }

  async function handleScan(): Promise<void> {
    if (!selectedFile) {
      Alert.alert("Błąd", "Proszę wybrać plik (PDF lub zdjęcie)");
      return;
    }

    try {
      setIsScanning(true);

      // 1. Przygotowanie pliku do wysłania (Blob)
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      // 2. Upload do Firebase Storage
      const timestamp = Date.now();
      // Używamy bezpiecznej nazwy pliku
      const sanitizedFileName = selectedFile.name.replace(
        /[^a-zA-Z0-9.]/g,
        "_"
      );
      const storagePath = `scans/${timestamp}_${sanitizedFileName}`;

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);

      const scanResponse = await cloudFunctions.scanDocument(
        storagePath,
        selectedFile.mimeType
      );

      router.replace({
        pathname: "/stack/createSelfScreen",
        params: { cards: JSON.stringify(scanResponse.flashcards) },
      });
    } catch (error) {
      setIsScanning(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nie udało się przetworzyć dokumentu.";

      Alert.alert("Błąd skanowania", errorMessage);
      console.error("Error scanning document:", error);
    }
  }

  function goBackHandler(): void {
    if (isScanning) {
      Alert.alert(
        "Czekaj",
        "Trwa przetwarzanie dokumentu. Czy na pewno chcesz przerwać?",
        [
          { text: "Zostań", style: "cancel" },
          { text: "Wyjdź", style: "destructive", onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
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
        {/* Zmienione teksty dla kontekstu AI */}
        <Text style={styles.title}>AI Skaner Dokumentów</Text>
        <Text style={styles.subtitle}>
          Wgraj notatki (PDF/JPG), a AI stworzy fiszki.
        </Text>

        {/* Wybór Pliku */}
        <Pressable
          style={styles.filePickerButton}
          onPress={pickDocument}
          disabled={isLoading || isScanning}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary_700} />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline" // Ikona chmury/uploadu
                size={28}
                color={Colors.primary_700}
              />
              <Text style={styles.filePickerText}>
                {selectedFile ? "Zmień plik" : "Wybierz PDF lub Zdjęcie"}
              </Text>
            </>
          )}
        </Pressable>

        {/* Podgląd wybranego pliku */}
        {selectedFile && !isLoading && (
          <View style={styles.selectedFileContainer}>
            <Ionicons
              name={
                selectedFile.mimeType.includes("pdf")
                  ? "document-text"
                  : "image"
              }
              size={20}
              color={Colors.accent_500}
            />
            <Text
              style={styles.selectedFileText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {selectedFile.name}
            </Text>
          </View>
        )}

        {/* Przycisk Akcji */}
        <Pressable
          style={[
            styles.importButton,
            (!selectedFile || isScanning) && styles.importButtonDisabled,
          ]}
          onPress={handleScan}
          disabled={!selectedFile || isScanning}
        >
          {isScanning ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <ActivityIndicator size="small" color={Colors.primary_100} />
              <Text style={styles.importButtonText}>Analizowanie...</Text>
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="sparkles" size={20} color={Colors.primary_100} />
              <Text style={styles.importButtonText}>Generuj Fiszki</Text>
            </View>
          )}
        </Pressable>

        {isScanning && (
          <Text style={styles.importingText}>
            AI czyta Twój plik. To może potrwać do 30 sekund...
          </Text>
        )}
      </View>
    </View>
  );
}

// Style są identyczne jak w Twoim poprzednim pliku,
// aby zachować spójność wizualną aplikacji.
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
    justifyContent: "center", // Wycentrowanie wertykalne
    paddingHorizontal: 20,
    paddingBottom: 50, // Lekki odstęp od dołu
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
    paddingHorizontal: 10,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 25, // Większe pole dotyku
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
    textAlign: "center",
  },
  selectedFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 30,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: Colors.accent_500, // Zielony/Akcentowy kolor tła
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent_500,
    width: "100%",
  },
  selectedFileText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700, // Ciemny tekst na akcencie
    fontWeight: "600",
    flex: 1, // Aby tekst się zawijał/ucinał poprawnie
  },
  importButton: {
    width: "100%",
    backgroundColor: Colors.primary_700,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  importButtonDisabled: {
    backgroundColor: Colors.primary_700_50,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
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
    opacity: 0.8,
  },
  titleInputContainer: {
    width: "100%",
    marginBottom: 25,
  },
  titleLabel: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
  },
  titleInput: {
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100, // Nieco jaśniejsze tło inputa
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 17,
    color: Colors.primary_700,
    fontWeight: "600",
  },
});

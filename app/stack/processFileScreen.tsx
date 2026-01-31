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
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../../firebase";
import { cloudFunctions } from "../../services/cloudFunctions";



const FILE_TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; maxSizeMB: number }
> = {
  "application/pdf": { icon: "document-text", label: "PDF", maxSizeMB: 20 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: "grid",
    label: "XLSX",
    maxSizeMB: 5,
  },
  "text/csv": { icon: "grid", label: "CSV", maxSizeMB: 5 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    icon: "document",
    label: "DOCX",
    maxSizeMB: 20,
  },
};

function getFileConfig(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return { icon: "image", label: "Obraz", maxSizeMB: 10 };
  }
  return FILE_TYPE_CONFIG[mimeType] || { icon: "document", label: "Plik", maxSizeMB: 10 };
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/*",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".heif",
  ".pdf", ".xlsx", ".xls", ".csv", ".docx",
]);

function isSupportedFile(mimeType: string, fileName: string): boolean {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (ACCEPTED_TYPES.includes(mime)) return true;

  // Fallback: check extension
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export default function ProcessFileScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    mimeType: string;
    size?: number;
  } | null>(null);
  const [hint, setHint] = useState<string>("");
  const [detail, setDetail] = useState<"low" | "medium" | "high">("medium");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  async function pickDocument(): Promise<void> {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ACCEPTED_TYPES,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || "application/octet-stream";
        const config = getFileConfig(mimeType);

        // Client-side size validation
        if (asset.size && asset.size > config.maxSizeMB * 1024 * 1024) {
          Alert.alert(
            "Plik za duży",
            `Maksymalny rozmiar dla ${config.label}: ${config.maxSizeMB}MB`
          );
          setIsLoading(false);
          return;
        }

        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          mimeType,
          size: asset.size,
        });
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Błąd", "Nie udało się wybrać pliku");
      console.error("Error picking file:", error);
    }
  }

  async function pickFromGallery(): Promise<void> {
    try {
      setIsLoading(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Brak uprawnień", "Potrzebujemy dostępu do galerii");
        setIsLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        setIsLoading(false);
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;

      setSelectedFile({
        name: fileName,
        uri: asset.uri,
        mimeType,
        size: asset.fileSize,
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Błąd", "Nie udało się wybrać zdjęcia");
      console.error("Error picking from gallery:", error);
    }
  }

  async function takePhoto(): Promise<void> {
    try {
      setIsLoading(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Brak uprawnień", "Potrzebujemy dostępu do aparatu");
        setIsLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        setIsLoading(false);
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const fileName = asset.fileName || `camera_${Date.now()}.jpg`;

      setSelectedFile({
        name: fileName,
        uri: asset.uri,
        mimeType,
        size: asset.fileSize,
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Błąd", "Nie udało się zrobić zdjęcia");
      console.error("Error taking photo:", error);
    }
  }

  async function handleProcess(): Promise<void> {
    if (!selectedFile) {
      Alert.alert("Błąd", "Proszę wybrać plik");
      return;
    }

    if (!isSupportedFile(selectedFile.mimeType, selectedFile.name)) {
      Alert.alert(
        "Nieobsługiwany format",
        "Obsługiwane formaty: JPG, PNG, PDF, XLSX, CSV, DOCX"
      );
      return;
    }

    try {
      setIsProcessing(true);

      // 1. Upload to Firebase Storage
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      const timestamp = Date.now();
      const sanitizedFileName = selectedFile.name.replace(
        /[^a-zA-Z0-9.]/g,
        "_"
      );
      const storagePath = `scans/${timestamp}_${sanitizedFileName}`;

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);

      // 2. Call processFile cloud function
      const processResponse = await cloudFunctions.processFile(
        storagePath,
        selectedFile.mimeType,
        hint || undefined,
        selectedFile.name,
        detail
      );

      // 3. Navigate to createSelfScreen
      router.replace({
        pathname: "/stack/createSelfScreen",
        params: {
          cards: JSON.stringify(processResponse.flashcards),
          suggestedTitle: processResponse.meta.detected_topic,
        },
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nie udało się przetworzyć pliku.";
      Alert.alert("Błąd przetwarzania", errorMessage);
      console.error("Error processing file:", error);
    }
  }

  function goBackHandler(): void {
    if (isProcessing) {
      Alert.alert(
        "Czekaj",
        "Trwa przetwarzanie pliku. Czy na pewno chcesz przerwać?",
        [
          { text: "Zostań", style: "cancel" },
          {
            text: "Wyjdź",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }

  const fileConfig = selectedFile ? getFileConfig(selectedFile.mimeType) : null;

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
        <Text style={styles.title}>AI Generator Fiszek</Text>
        <Text style={styles.subtitle}>
          Wgraj dowolny plik — AI stworzy fiszki
        </Text>

        {/* Hint input */}
        <View style={styles.hintContainer}>
          <TextInput
            style={styles.hintInput}
            value={hint}
            onChangeText={setHint}
            placeholder="O czym jest ten plik? (opcjonalnie)"
            placeholderTextColor={Colors.primary_700_50}
            editable={!isProcessing}
          />
        </View>

        {/* Detail level selector */}
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Szczegółowość fiszek</Text>
          <View style={styles.detailRow}>
            {([
              { key: "low" as const, label: "Zwięźle", icon: "flash-outline" },
              { key: "medium" as const, label: "Zrównoważone", icon: "layers-outline" },
              { key: "high" as const, label: "Szczegółowo", icon: "library-outline" },
            ]).map((opt) => {
              const isActive = detail === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.detailChip,
                    isActive && styles.detailChipActive,
                  ]}
                  onPress={() => setDetail(opt.key)}
                  disabled={isProcessing}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={16}
                    color={isActive ? Colors.primary_100 : Colors.primary_700}
                  />
                  <Text
                    style={[
                      styles.detailChipText,
                      isActive && styles.detailChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* File picker */}
        <Pressable
          style={styles.filePickerButton}
          onPress={pickDocument}
          disabled={isLoading || isProcessing}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary_700} />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={28}
                color={Colors.primary_700}
              />
              <Text style={styles.filePickerText}>
                {selectedFile
                  ? "Zmień plik"
                  : "Wybierz plik (PDF, obraz, XLSX, CSV, DOCX)"}
              </Text>
            </>
          )}
        </Pressable>

        {/* Image source buttons */}
        <View style={styles.imageButtonsRow}>
          <Pressable
            style={styles.imageButton}
            onPress={pickFromGallery}
            disabled={isLoading || isProcessing}
          >
            <Ionicons name="images-outline" size={22} color={Colors.primary_700} />
            <Text style={styles.imageButtonText}>Galeria</Text>
          </Pressable>
          <Pressable
            style={styles.imageButton}
            onPress={takePhoto}
            disabled={isLoading || isProcessing}
          >
            <Ionicons name="camera-outline" size={22} color={Colors.primary_700} />
            <Text style={styles.imageButtonText}>Aparat</Text>
          </Pressable>
        </View>

        {/* File preview */}
        {selectedFile && !isLoading && fileConfig && (
          <View style={styles.selectedFileContainer}>
            <Ionicons
              name={fileConfig.icon as any}
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
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{fileConfig.label}</Text>
            </View>
          </View>
        )}

        {/* Action button */}
        <Pressable
          style={[
            styles.importButton,
            (!selectedFile || isProcessing) && styles.importButtonDisabled,
          ]}
          onPress={handleProcess}
          disabled={!selectedFile || isProcessing}
        >
          {isProcessing ? (
            <View style={styles.buttonRow}>
              <ActivityIndicator size="small" color={Colors.primary_100} />
              <Text style={styles.importButtonText}>Analizowanie...</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Ionicons name="sparkles" size={20} color={Colors.primary_100} />
              <Text style={styles.importButtonText}>Generuj Fiszki</Text>
            </View>
          )}
        </Pressable>

        {isProcessing && (
          <Text style={styles.processingText}>
            AI analizuje Twój plik...
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
    paddingBottom: 50,
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
    paddingHorizontal: 10,
  },
  hintContainer: {
    width: "100%",
    marginBottom: 20,
  },
  hintInput: {
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "600",
  },
  detailSection: {
    width: "100%",
    marginBottom: 20,
  },
  detailLabel: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    backgroundColor: Colors.primary_100,
  },
  detailChipActive: {
    backgroundColor: Colors.primary_700,
  },
  detailChipText: {
    fontFamily: Fonts.primary,
    fontSize: 13,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  detailChipTextActive: {
    color: Colors.primary_100,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 25,
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
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "700",
    textAlign: "center",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 20,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  imageButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  selectedFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 30,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: Colors.accent_500,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent_500,
    width: "100%",
  },
  selectedFileText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "600",
    flex: 1,
  },
  typeBadge: {
    backgroundColor: Colors.primary_700,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.primary_100,
    fontWeight: "700",
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
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  processingText: {
    marginTop: 20,
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
  },
});

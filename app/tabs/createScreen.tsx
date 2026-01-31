import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Modal,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts,  } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import {
  PlusIcon,
  DocumentTextIcon,
  CameraIcon,
  ArchiveBoxIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/solid";

export default function createScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [showModalCard, setShowModalCard] = useState(false);
  const [showModalDeck, setShowModalDeck] = useState(false);


  const handleCreateDeck = () => {
    setShowModalDeck(false);
    setShowModalCard(false);

    router.push("../stack/createSelfScreen");
  };

  const handleImportDeck = () => {
    setShowModalDeck(false);
    setShowModalCard(false);
    router.push("../stack/fileImportScreen");
  };

  const handleScanDocument = () => {
    setShowModalDeck(false);
    setShowModalCard(false);
    router.push("../stack/scanDocumentScreen");
  };

  const handleImportAnki = () => {
    setShowModalDeck(false);
    setShowModalCard(false);
    router.push("../stack/ankiImportScreen");
  };

  const handleOCRScan = () => {
    setShowModalCard(false);
    setShowModalDeck(false);
    router.push("../stack/ocrCameraScreen");
  };

  const handleProcessFile = () => {
    setShowModalCard(false);
    setShowModalDeck(false);
    router.push("../stack/processFileScreen");
  };

  return (
    <GestureHandlerRootView>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          <Text style={styles.title}>Dodaj fiszki</Text>
          <Text style={styles.subtitle}>Wybierz sposób dodawania</Text>

          <Pressable
            style={styles.addButton}
            onPress={() => setShowModalCard(true)}
          >
            <PlusIcon size={24} color={Colors.primary_700} />
            <Text style={styles.addButtonText}>Dodaj karty do istniejącej talii</Text>
          </Pressable>

          <Pressable
            style={styles.addButton}
            onPress={() => setShowModalDeck(true)}
          >
            <PlusIcon size={24} color={Colors.primary_700} />
            <Text style={styles.addButtonText}>Dodaj nowy deck</Text>
          </Pressable>
        </View>

        {/* Modal z opcjami */}
        <Modal
          visible={showModalCard}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModalCard(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowModalCard(false)}
          >
            <View style={styles.modalContent}>              

              {/* OCR Text Scan */}
              <Pressable
                style={styles.optionButton}
                onPress={handleOCRScan}
              >
                <ViewfinderCircleIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Skanuj tekst</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
        <Modal
          visible={showModalDeck}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModalDeck(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowModalDeck(false)}
          >
            <View style={styles.modalContent}>
              {/* Create Deck */}
              <Pressable style={styles.optionButton} onPress={handleCreateDeck}>
                <PlusIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Utwórz talie</Text>
              </Pressable>

              {/* Import Deck */}
              <Pressable style={styles.optionButton} onPress={handleImportDeck}>
                <DocumentTextIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Importuj talię</Text>
              </Pressable>

              {/* Import Anki */}
              <Pressable style={styles.optionButton} onPress={handleImportAnki}>
                <ArchiveBoxIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Importuj z Anki</Text>
              </Pressable>

              {/* Scan Document */}
              <Pressable
                style={styles.optionButton}
                onPress={handleScanDocument}
              >
                <CameraIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Skanuj dokument</Text>
              </Pressable>

              {/* Process File */}
              <Pressable style={styles.optionButton} onPress={handleProcessFile}>
                <DocumentTextIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Przetwarzaj plik</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 100, // Pozycjonowanie nad przyciskiem plus
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    padding: 8,
    width: 200,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    marginLeft: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent_500,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    marginTop: 40,
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginLeft: 8,
  },
});

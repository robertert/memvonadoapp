import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Modal,
  View,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import {
  PlusIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  ViewfinderCircleIcon,
  PencilSquareIcon,
} from "react-native-heroicons/solid";

export default function CreateScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [showMethodsModal, setShowMethodsModal] = useState<boolean>(false);

  // Navigation handler
  const handleNavigation = (path: string) => {
    setShowMethodsModal(false);
    router.push(path);
  };

  // Menu options - unified list without mode distinction
  const menuOptions = [
    {
      id: "manual",
      label: "Dodaj ręcznie",
      icon: <PencilSquareIcon size={20} color={Colors.primary_700} />,
      action: () => handleNavigation("../stack/createSelfScreen"),
    },
    {
      id: "ocr",
      label: "Skanuj tekst (OCR)",
      icon: <ViewfinderCircleIcon size={20} color={Colors.primary_700} />,
      action: () => handleNavigation("../stack/ocrCameraScreen"),
    },
    {
      id: "file",
      label: "Przetwarzaj plik",
      icon: <DocumentTextIcon size={20} color={Colors.primary_700} />,
      action: () => handleNavigation("../stack/processFileScreen"),
    },
    {
      id: "import_deck",
      label: "Importuj talię (JSON)",
      icon: <DocumentTextIcon size={20} color={Colors.primary_700} />,
      action: () => handleNavigation("../stack/fileImportScreen"),
    },
    {
      id: "anki",
      label: "Importuj z Anki",
      icon: <ArchiveBoxIcon size={20} color={Colors.primary_700} />,
      action: () => handleNavigation("../stack/ankiImportScreen"),
    },
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          <Text style={styles.title}>Dodaj fiszki</Text>
          <Text style={styles.subtitle}>Wybierz sposób dodawania</Text>

          {/* Single button to open methods modal */}
          <Pressable
            style={styles.addButton}
            onPress={() => setShowMethodsModal(true)}
          >
            <PlusIcon size={24} color={Colors.primary_700} />
            <Text style={styles.addButtonText}>Dodaj fiszki</Text>
          </Pressable>
        </View>

        {/* Methods Modal */}
        <Modal
          visible={showMethodsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowMethodsModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowMethodsModal(false)}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalHeader}>Wybierz metodę</Text>

              {menuOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.optionButton}
                  onPress={option.action}
                >
                  {option.icon}
                  <Text style={styles.optionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: "100%",
    borderTopWidth: 2,
    borderColor: Colors.primary_700,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255, 0.5)",
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    marginTop: 24,
    width: "100%",
    maxWidth: 340,
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginLeft: 8,
  },
});

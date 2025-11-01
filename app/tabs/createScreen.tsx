import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, generageRandomUid } from "../../constants/colors";
import { ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  PlusIcon,
  DocumentTextIcon,
  CameraIcon,
} from "react-native-heroicons/solid";

export default function createScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setShowModal(true);
    }, [])
  );

  const handleCreateDeck = () => {
    setShowModal(false);
    router.push("../stack/createSelfScreen");
  };

  const handleImportDeck = () => {
    setShowModal(false);
    router.push("../stack/fileImportScreen");
  };

  const handleScanDocument = () => {
    setShowModal(false);
    // TODO: Implement scan document functionality
    console.log("Scan Document clicked");
  };

  return (
    <GestureHandlerRootView>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          <Text style={styles.title}>Dodaj nowe karty</Text>
          <Text style={styles.subtitle}>Wybierz sposób tworzenia</Text>

          <Pressable
            style={styles.addButton}
            onPress={() => setShowModal(true)}
          >
            <PlusIcon size={24} color={Colors.primary_700} />
            <Text style={styles.addButtonText}>Dodaj karty</Text>
          </Pressable>
        </View>

        {/* Modal z opcjami */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowModal(false)}
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

              {/* Scan Document */}
              <Pressable
                style={styles.optionButton}
                onPress={handleScanDocument}
              >
                <CameraIcon size={20} color={Colors.primary_700} />
                <Text style={styles.optionText}>Skanuj dokument</Text>
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

import React, { useContext } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeftIcon } from "react-native-heroicons/solid";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { SettingsContext } from "../../store/settings-context";
import type { AvoLanguage } from "@/types/schemas/api/avoHelper";

const AVO_LANGUAGE_OPTIONS: { label: string; value: AvoLanguage }[] = [
  { label: "Polski", value: "pl" },
  { label: "English", value: "en" },
  { label: "Deutsch", value: "de" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
];

export default function settingsScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const { avoLanguage, setAvoLanguage } = useContext(SettingsContext);

  function handleLogout(): void {
    Alert.alert(
      "Wyloguj się",
      "Czy na pewno chcesz się wylogować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Błąd", "Nie udało się wylogować. Spróbuj ponownie.");
            }
          },
        },
      ]
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
          <Text style={styles.headerTitle}>Ustawienia</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sekcja - AVO Helper */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AVO Helper</Text>
            <Text style={styles.helperText}>
              Język odpowiedzi maskotki AVO podczas nauki.
            </Text>
            <View style={styles.chipRow}>
              {AVO_LANGUAGE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setAvoLanguage(option.value)}
                  style={[
                    styles.chip,
                    avoLanguage === option.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      avoLanguage === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sekcja - Konto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konto</Text>
            <Pressable
              onPress={handleLogout}
              style={[styles.actionButton, styles.logoutButton]}
            >
              <MaterialCommunityIcons
                name="logout"
                size={24}
                color={Colors.primary_100}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionButtonText}>Wyloguj się</Text>
            </Pressable>
          </View>
        </ScrollView>
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
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Peace Sans",
    color: Colors.primary_700,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Peace Sans",
    color: Colors.primary_700,
    fontWeight: "bold",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_700,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: Colors.red,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: Colors.primary_100,
    fontSize: 16,
    fontFamily: "Peace Sans",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: Colors.primary_700,
    fontFamily: "Inter",
    lineHeight: 16,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary_700_30,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: Colors.primary_700,
    borderColor: Colors.primary_700,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "600",
    color: Colors.primary_700,
  },
  chipTextActive: {
    color: Colors.primary_100,
  },
});

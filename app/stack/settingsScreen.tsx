import React, { useState, useContext } from "react";
import {
  ActivityIndicator,
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
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";

export default function settingsScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const { id: userId } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleAddPlaceholderData(): Promise<void> {
    if (!userId) {
      Alert.alert("Błąd", "Musisz być zalogowany, aby dodać dane testowe.");
      return;
    }

    Alert.alert(
      "Dodaj dane testowe",
      "Czy chcesz dodać przykładowe talie i karty do swojej aplikacji?",
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Dodaj",
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await cloudFunctions.addPlaceholderData(userId);

              Alert.alert(
                "Sukces! 🎉",
                `Dodano ${result.decksCreated} talii z ${result.totalCards} kartami.\n\nMożesz teraz rozpocząć naukę!`,
                [{ text: "OK" }]
              );
            } catch (error: any) {
              console.error("Error adding placeholder data:", error);
              Alert.alert(
                "Błąd",
                error.message ||
                  "Nie udało się dodać danych testowych. Spróbuj ponownie."
              );
            } finally {
              setIsLoading(false);
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
          {/* Sekcja - Narzędzia deweloperskie */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Narzędzia deweloperskie</Text>

            <Pressable
              onPress={handleAddPlaceholderData}
              disabled={isLoading || !userId}
              style={[
                styles.actionButton,
                (isLoading || !userId) && styles.actionButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.primary_100}
                  style={{ marginRight: 8 }}
                />
              ) : (
                <MaterialCommunityIcons
                  name="database-plus"
                  size={24}
                  color={Colors.primary_100}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={styles.actionButtonText}>Dodaj dane testowe</Text>
            </Pressable>

            <Text style={styles.helperText}>
              Ta funkcja dodaje przykładowe talie z kartami do Twojej aplikacji
              do celów testowych.
            </Text>
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
});

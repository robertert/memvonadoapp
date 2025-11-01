import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface League {
  id: number;
  name: string;
  color: string; // border color/accent
  description: string;
}

const LEAGUES: League[] = [
  { id: 1, name: "Liga 1", color: "#8D8D8D", description: "Startowa liga" },
  { id: 2, name: "Liga 2", color: "#7DA1B9", description: "Wejdź do Top 10" },
  { id: 3, name: "Liga 3", color: "#7EC384", description: "Stabilny rozwój" },
  { id: 4, name: "Liga 4", color: "#A9D68B", description: "Trzymaj passę" },
  { id: 5, name: "Liga 5", color: "#C7E3A1", description: "Wyższy poziom" },
  {
    id: 6,
    name: "Liga 6",
    color: "#E4F0B8",
    description: "Lepsza konkurencja",
  },
  { id: 7, name: "Liga 7", color: "#F9C9A7", description: "Stań na podium" },
  {
    id: 8,
    name: "Liga 8",
    color: "#F6B38F",
    description: "Top 5 na wyciągnięcie",
  },
  { id: 9, name: "Liga 9", color: "#F29B78", description: "Blisko awansu" },
  { id: 10, name: "Liga 10", color: "#F27C8A", description: "Silna stawka" },
  { id: 11, name: "Liga 11", color: "#CD7F32", description: "Brązowa Liga" },
  { id: 12, name: "Liga 12", color: "#C0C0C0", description: "Srebrna Liga" },
  { id: 13, name: "Liga 13", color: "#FFD700", description: "Złota Liga" },
  { id: 14, name: "Liga 14", color: "#6A5ACD", description: "Platynowa Liga" },
  { id: 15, name: "Liga 15", color: "#00BFFF", description: "Diamentowa Liga" },
];

export default function leagueScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View
          style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={Colors.primary_700}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Ligi</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>Przegląd wszystkich 15 lig</Text>

          {LEAGUES.map((league) => (
            <View
              key={league.id}
              style={[styles.leagueItem, { borderColor: league.color }]}
            >
              <View style={[styles.leagueBadge, { borderColor: league.color }]}>
                <Text style={[styles.leagueBadgeText, { color: league.color }]}>
                  {league.id}
                </Text>
              </View>
              <View style={styles.leagueInfo}>
                <Text style={styles.leagueName}>{league.name}</Text>
                <Text style={styles.leagueDesc}>{league.description}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.primary_700}
              />
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: Colors.primary_100,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_500,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 10,
    textAlign: "center",
  },
  leagueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    padding: 14,
    marginTop: 10,
  },
  leagueBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_100,
    borderWidth: 3,
    marginRight: 12,
  },
  leagueBadgeText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    fontWeight: "900",
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  leagueDesc: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    opacity: 0.7,
    marginTop: 2,
  },
});

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Cog6ToothIcon, ShareIcon } from "react-native-heroicons/solid";
import { router } from "expo-router";
import { FireIcon } from "react-native-heroicons/solid";
import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import ContributionHeatmap from "../../ui/ContributionHeatmap";

export default function profileScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const weeks = 16; // zakres 16 tygodni wstecz
  const heatmapData: { date: string; count: number }[] = (() => {
    const today = new Date();
    const days = weeks * 7;
    const arr: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const iso = dt.toISOString().slice(0, 10);
      // Placeholder: deterministyczny wzór aktywności jak na GitHubie
      const idx = (dt.getUTCDate() + dt.getUTCMonth() + dt.getUTCDay()) % 5;
      const levels = [0, 1, 2, 4, 6];
      arr.push({ date: iso, count: levels[idx] });
    }
    return arr;
  })();
  const awards = [
    {
      key: 1,
      name: "1st place",
    },
    {
      key: 2,
      name: "2nd place",
    },
    {
      key: 3,
      name: "3rd place",
    },
  ];
  const friendsStreaks = [
    {
      key: 1,
      name: "John Doe",
      streak: 10,
    },
    {
      key: 2,
      name: "Jane Doe",
      streak: 15,
    },
    {
      key: 3,
      name: "Jim Doe",
      streak: 20,
    },
  ];

  const myDecks = [
    {
      key: 1,
      name: "Angielski - Podstawy",
      cards: 45,
      lastStudied: "2 dni temu",
    },
    {
      key: 2,
      name: "Historia Polski",
      cards: 78,
      lastStudied: "1 tydzień temu",
    },
    {
      key: 3,
      name: "Matematyka - Algebra",
      cards: 32,
      lastStudied: "3 dni temu",
    },
  ];

  function shareProfileHandler(): void {
    Share.share({
      message: "Share profile",
    });
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Text style={styles.headerTitle}>mankowskae</Text>
        <View style={styles.headerIconsContainer}>
          <Pressable
            onPress={() => {
              router.push("../stack/settingsScreen");
            }}
            style={styles.iconButton}
          >
            <Cog6ToothIcon size={24} color={Colors.primary_700} />
          </Pressable>
          <Pressable onPress={shareProfileHandler} style={styles.iconButton}>
            <ShareIcon size={24} color={Colors.primary_700} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topContainer}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons
              name="penguin"
              size={100}
              color={Colors.primary_700}
            />
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.userInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoNum}>15</Text>
                <Text style={styles.infoText}>Friends</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNum}>200</Text>
                <Text style={styles.infoText}>Followers</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNum}>30</Text>
                <Text style={styles.infoText}>Following</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.subTitle}>Your Stats</Text>
          <View style={styles.statsItemsContainer}>
            <View style={styles.statsItem}>
              <MaterialCommunityIcons
                name="card"
                size={24}
                color={Colors.primary_700}
                style={styles.statsItemIcon}
              />
              <Text style={styles.statsItemValue}>15</Text>
            </View>
            <View style={styles.statsItem}>
              <FireIcon
                size={24}
                color={Colors.accent_500}
                style={styles.statsItemIcon}
              />
              <Text style={styles.statsItemValue}>13 dni</Text>
            </View>
          </View>
          <View style={styles.statsItemsContainer}>
            <View style={styles.statsItem}>
              <MaterialCommunityIcons
                name="cards"
                size={24}
                color={Colors.primary_700}
                style={styles.statsItemIcon}
              />
              <Text style={styles.statsItemValue}>5623</Text>
            </View>
            <View style={styles.statsItem}>
              <FontAwesome6
                name="ranking-star"
                size={24}
                color={Colors.primary_700}
                style={styles.statsItemIcon}
              />
              <Text style={styles.statsItemValue}>Golden</Text>
            </View>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Mutal streaks</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {friendsStreaks.map((friend) => (
                <View key={friend.key} style={styles.friendStreakItem}>
                  <Text style={styles.friendStreakName}>{friend.name}</Text>
                  <MaterialCommunityIcons
                    name="penguin"
                    size={36}
                    color={Colors.primary_700}
                  />
                  <Text style={styles.friendStreakDays}>
                    {friend.streak} days
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Your awards</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {awards.map((award) => (
                <View key={award.key} style={styles.awardItem}>
                  <MaterialCommunityIcons
                    name="medal"
                    size={24}
                    color={Colors.primary_700}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Aktywność nauki</Text>
            <ContributionHeatmap
              weeks={weeks}
              data={heatmapData}
              title="Ostatnie tygodnie"
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Twoje decki</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {myDecks.map((deck) => (
                <View key={deck.key} style={styles.deckItem}>
                  <MaterialCommunityIcons
                    name="cards"
                    size={24}
                    color={Colors.primary_700}
                    style={styles.deckIcon}
                  />
                  <Text style={styles.deckName}>{deck.name}</Text>
                  <Text style={styles.deckCards}>{deck.cards} kart</Text>
                  <Text style={styles.deckLastStudied}>{deck.lastStudied}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={styles.libraryButton}
              onPress={() => {
                router.push("../stack/myLibraryScreen");
              }}
            >
              <Text style={styles.libraryButtonText}>
                Przejdź do biblioteki
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={Colors.primary_100}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  avatarContainer: {
    marginRight: 10,
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  topContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 30,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoNum: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  infoText: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
  },
  infoItem: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 15,
    backgroundColor: Colors.primary_100,
  },
  iconButton: {
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  headerIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsContainer: {
    width: "100%",
    marginTop: 20,
  },
  subTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 10,
  },
  statsItemsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsItem: {
    alignItems: "center",
    flexDirection: "row",
    marginHorizontal: 10,
    marginVertical: 5,
    width: "50%",
  },
  statsItemIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  statsItemValue: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  awardsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  awardItem: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    marginVertical: 5,
    width: 100,
    height: 100,
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
  },
  sectionContainer: {
    marginTop: 30,
  },
  streaksContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendStreakItem: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    marginHorizontal: 10,
    marginVertical: 5,
    width: 100,
    height: 100,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
  },
  friendStreakName: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  friendStreakDays: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
  },
  horizontalScroll: {
    marginTop: 10,
  },
  deckItem: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    marginVertical: 5,
    width: 120,
    height: 120,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    padding: 10,
  },
  deckIcon: {
    marginBottom: 8,
  },
  deckName: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  deckCards: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "500",
    marginBottom: 2,
  },
  deckLastStudied: {
    fontSize: 10,
    fontFamily: Fonts.primary,
    color: Colors.primary_500,
    fontWeight: "400",
    textAlign: "center",
  },
  libraryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_700,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  libraryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "700",
    marginRight: 8,
  },
});

import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FireIcon, TrophyIcon } from "react-native-heroicons/solid";
import { cloudFunctions } from "../../services/cloudFunctions";

interface RankingUser {
  id: number;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  position: number;
}

export default function rankingsScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"random" | "following">("random");
  const [leagueTitle, setLeagueTitle] = useState<string>("🏆 Bronze League");
  const [timeLeft, setTimeLeft] = useState<string>("10:00");
  const serverOffsetRef = useRef<number>(0);
  const seasonEndRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: number | null = null;

    async function initServerTime(): Promise<void> {
      try {
        const [serverTime, season] = await Promise.all([
          cloudFunctions.serverNow(),
          cloudFunctions.getCurrentSeason(),
        ]);

        const localNow = Date.now();
        serverOffsetRef.current = serverTime.nowMs - localNow;
        const endAtMs = new Date(season.endAt._seconds * 1000).getTime();
        seasonEndRef.current = endAtMs;
        const tick = () => {
          if (!seasonEndRef.current) return;
          const nowMs = Date.now() + (serverOffsetRef.current || 0);
          const diff = Math.max(0, seasonEndRef.current - nowMs);
          const totalSeconds = Math.floor(diff / 1000);
          const days = Math.floor(totalSeconds / 86400);
          const hours = Math.floor((totalSeconds % 86400) / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          const parts: string[] = [];
          if (days > 0) parts.push(`${days}d`);
          parts.push(
            `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
              2,
              "0"
            )}:${String(seconds).padStart(2, "0")}`
          );
          setTimeLeft(parts.join(" "));
        };

        tick();
        interval = setInterval(tick, 1000) as unknown as number;
      } catch (e) {
        console.log("Time sync error", e);
      }
    }
    console.log("Initializing server time");
    initServerTime();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);
  // Przykładowe dane dla losowych osób
  const randomUsers: RankingUser[] = [
    {
      id: 1,
      name: "Anna Kowalski",
      avatar: "👩",
      points: 2450,
      streak: 15,
      position: 1,
    },
    {
      id: 2,
      name: "Piotr Nowak",
      avatar: "👨",
      points: 2380,
      streak: 12,
      position: 2,
    },
    {
      id: 3,
      name: "Maria Wiśniewska",
      avatar: "👩",
      points: 2320,
      streak: 18,
      position: 3,
    },
    {
      id: 4,
      name: "Jan Kowalczyk",
      avatar: "👨",
      points: 2280,
      streak: 10,
      position: 4,
    },
    {
      id: 5,
      name: "Katarzyna Zielińska",
      avatar: "👩",
      points: 2250,
      streak: 14,
      position: 5,
    },
    {
      id: 6,
      name: "Tomasz Kaczmarek",
      avatar: "👨",
      points: 2200,
      streak: 8,
      position: 6,
    },
    {
      id: 7,
      name: "Agnieszka Szymańska",
      avatar: "👩",
      points: 2180,
      streak: 16,
      position: 7,
    },
    {
      id: 8,
      name: "Michał Woźniak",
      avatar: "👨",
      points: 2150,
      streak: 11,
      position: 8,
    },
    {
      id: 9,
      name: "Joanna Dąbrowska",
      avatar: "👩",
      points: 2120,
      streak: 9,
      position: 9,
    },
    {
      id: 10,
      name: "Paweł Kozłowski",
      avatar: "👨",
      points: 2080,
      streak: 13,
      position: 10,
    },
    {
      id: 11,
      name: "Magdalena Jankowska",
      avatar: "👩",
      points: 2050,
      streak: 7,
      position: 11,
    },
    {
      id: 12,
      name: "Łukasz Mazur",
      avatar: "👨",
      points: 2020,
      streak: 12,
      position: 12,
    },
    {
      id: 13,
      name: "Monika Krawczyk",
      avatar: "👩",
      points: 1980,
      streak: 6,
      position: 13,
    },
    {
      id: 14,
      name: "Jakub Piotrowski",
      avatar: "👨",
      points: 1950,
      streak: 15,
      position: 14,
    },
    {
      id: 15,
      name: "Natalia Grabowska",
      avatar: "👩",
      points: 1920,
      streak: 5,
      position: 15,
    },
  ];

  // Przykładowe dane dla obserwowanych osób
  const followingUsers: RankingUser[] = [
    {
      id: 1,
      name: "mankowskae",
      avatar: "🐧",
      points: 2500,
      streak: 20,
      position: 1,
    },
    {
      id: 2,
      name: "jan_kowalski",
      avatar: "👨",
      points: 2400,
      streak: 18,
      position: 2,
    },
    {
      id: 3,
      name: "anna_nowak",
      avatar: "👩",
      points: 2350,
      streak: 15,
      position: 3,
    },
    {
      id: 4,
      name: "piotr_wisniewski",
      avatar: "👨",
      points: 2300,
      streak: 12,
      position: 4,
    },
    {
      id: 5,
      name: "maria_zielinska",
      avatar: "👩",
      points: 2250,
      streak: 14,
      position: 5,
    },
  ];

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <TrophyIcon size={24} color="#FFD700" />;
      case 2:
        return <TrophyIcon size={24} color="#C0C0C0" />;
      case 3:
        return <TrophyIcon size={24} color="#CD7F32" />;
      default:
        return <Text style={styles.positionNumber}>{position}</Text>;
    }
  };

  const getPositionBorderColor = (position: number) => {
    switch (position) {
      case 1:
        return "#FFD700";
      case 2:
        return "#C0C0C0";
      case 3:
        return "#CD7F32";
      default:
        return Colors.primary_700;
    }
  };

  const renderUserItem = (user: RankingUser) => (
    <View
      key={user.id}
      style={[
        styles.userItem,
        user.position <= 3 && activeTab === "random" && styles.userItemTop,
      ]}
    >
      <View style={styles.userLeft}>
        <View
          style={[
            styles.positionContainer,
            { borderColor: getPositionBorderColor(user.position) },
          ]}
        >
          {getPositionIcon(user.position)}
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{user.avatar}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="star"
                size={16}
                color={Colors.accent_500}
              />
              <Text style={styles.statText}>{user.points}</Text>
            </View>
            <View style={styles.statItem}>
              <FireIcon size={16} color={Colors.accent_500} />
              <Text style={styles.statText}>{user.streak} dni</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.switchContainer}>
        <Pressable
          style={styles.switchButton}
          onPress={() =>
            setActiveTab(activeTab === "random" ? "following" : "random")
          }
        >
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={20}
            color={Colors.primary_700}
          />
          <Text style={styles.switchText}>
            {activeTab === "random" ? "Followed" : "Random group"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "random" ? (
          <>
            <Pressable onPress={() => router.push("../stack/leagueScreen")}>
              <Text style={styles.mainSectionTitle}>{leagueTitle}</Text>
            </Pressable>
            <Text style={styles.sectionSubtitle}>Finish Top 3 to advance!</Text>
            <View style={styles.timerContainer}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={Colors.primary_700}
              />
              <Text style={styles.timerLabel}>Time left</Text>
              <Text style={styles.timerText}>{timeLeft}</Text>
            </View>
            {randomUsers.map(renderUserItem)}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>👥 Your Followed</Text>
            <Text style={styles.sectionSubtitle}>
              Ranking among your friends
            </Text>
            {followingUsers.map(renderUserItem)}
          </>
        )}
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
    justifyContent: "flex-start",
    paddingVertical: 15,
    backgroundColor: Colors.primary_100,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 40,
  },
  switchContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 15,
    marginTop: 10,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary_500,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  switchText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mainSectionTitle: {
    fontSize: 28,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_500,
    fontWeight: "500",
    marginBottom: 20,
    textAlign: "center",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginLeft: 8,
    marginRight: 10,
  },
  timerText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  userItemTop: {
    backgroundColor: Colors.primary_500,
  },
  userLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  positionContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: Colors.primary_100,
    borderWidth: 3,
  },
  positionNumber: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary_100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginBottom: 4,
  },
  userStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    marginLeft: 4,
  },
});

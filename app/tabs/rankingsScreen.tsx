import React, { useEffect, useRef, useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FireIcon, TrophyIcon } from "react-native-heroicons/solid";
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import { placeholderRanking } from "../../constants/placeholderData";

interface RankingUser {
  userId: string;
  username?: string;
  name: string;
  avatar: string;
  points: number;
  streak?: number;
  position: number;
}

export default function rankingsScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);
  const [activeTab, setActiveTab] = useState<"random" | "following">("random");
  const [leagueTitle, setLeagueTitle] = useState<string>("🏆 Bronze League");
  const [timeLeft, setTimeLeft] = useState<string>();
  const [randomUsers, setRandomUsers] = useState<RankingUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [groupInfo, setGroupInfo] = useState<string>("");
  const serverOffsetRef = useRef<number>(0);
  const seasonEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (userCtx.id) {
      fetchRankings();
    }
  }, [userCtx.id, activeTab]);

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

        // Handle both Firestore Timestamp format and plain object
        let endAtMs: number;
        if (season.endAt?.toDate) {
          endAtMs = season.endAt.toDate().getTime();
        } else if (season.endAt?._seconds) {
          endAtMs = season.endAt._seconds * 1000;
        } else if (typeof season.endAt === "string") {
          endAtMs = new Date(season.endAt).getTime();
        } else {
          endAtMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // Default: 7 days from now
        }

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

  async function fetchRankings(): Promise<void> {
    if (!userCtx.id && !PLACEHOLDER_MODE) return;

    try {
      setIsLoading(true);

      if (PLACEHOLDER_MODE) {
        if (activeTab === "random") {
          setLeagueTitle("🏆 Bronze League");
          setGroupInfo(`Grupa ${placeholderRanking.length}/20`);
          const users: RankingUser[] = placeholderRanking.map(
            (entry, index) => ({
              userId: entry.id,
              name: entry.username || "Unknown",
              username: entry.username,
              avatar: "👤",
              points: entry.points,
              position: index + 1,
            })
          );
          setRandomUsers(users);
        } else {
          // Following - użyj tych samych danych jako placeholder
          const users: RankingUser[] = placeholderRanking.map(
            (entry, index) => ({
              userId: entry.id,
              name: entry.username || "Unknown",
              username: entry.username,
              avatar: "👤",
              points: entry.points,
              position: index + 1,
            })
          );
          setFollowingUsers(users);
        }
        setIsLoading(false);
        return;
      }

      if (activeTab === "random") {
        // Get user's group leaderboard
        if (!userCtx.id) return;
        const leaderboard = await cloudFunctions.getLeaderboard(userCtx.id);

        // Get league info to set title
        if (leaderboard.leagueNumber) {
          const leagueInfo = await cloudFunctions.getLeagueInfo(
            leaderboard.leagueNumber
          );
          setLeagueTitle(leagueInfo.league.name);
          setGroupInfo(`Grupa ${leaderboard.totalMembers}/20`);
        }

        // Transform to RankingUser format
        const users: RankingUser[] = leaderboard.entries.map(
          (entry, index) => ({
            userId: entry.userId,
            name: entry.username || "Unknown",
            username: entry.username,
            avatar: "👤", // Default avatar
            points: entry.points,
            position: entry.position,
          })
        );

        setRandomUsers(users);
      } else {
        // Get following rankings
        if (!userCtx.id) return;
        const following = await cloudFunctions.getFollowingRankings(userCtx.id);

        // Transform to RankingUser format
        const users: RankingUser[] = following.rankings.map(
          (ranking, index) => ({
            userId: ranking.userId,
            name: ranking.username || "Unknown",
            username: ranking.username,
            avatar: "👤", // Default avatar
            points: ranking.points,
            position: ranking.position ?? 0,
          })
        );

        setFollowingUsers(users);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
      if (PLACEHOLDER_MODE) {
        if (activeTab === "random") {
          setLeagueTitle("🏆 Bronze League");
          setGroupInfo(`Grupa ${placeholderRanking.length}/20`);
          const users: RankingUser[] = placeholderRanking.map(
            (entry, index) => ({
              userId: entry.id,
              name: entry.username || "Unknown",
              username: entry.username,
              avatar: "👤",
              points: entry.points,
              position: index + 1,
            })
          );
          setRandomUsers(users);
        } else {
          const users: RankingUser[] = placeholderRanking.map(
            (entry, index) => ({
              userId: entry.id,
              name: entry.username || "Unknown",
              username: entry.username,
              avatar: "👤",
              points: entry.points,
              position: index + 1,
            })
          );
          setFollowingUsers(users);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

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
      key={user.userId}
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
            {user.streak !== undefined && (
              <View style={styles.statItem}>
                <FireIcon size={16} color={Colors.accent_500} />
                <Text style={styles.statText}>{user.streak} dni</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const SkeletonUserItem = () => (
    <View style={styles.userItem}>
      <View style={styles.userLeft}>
        <View style={[styles.positionContainer, styles.skeletonPosition]}>
          <View style={styles.skeletonPositionNumber} />
        </View>
        <View style={[styles.avatarContainer, styles.skeletonAvatar]} />
        <View style={styles.userInfo}>
          <View style={styles.skeletonUserName} />
          <View style={styles.userStats}>
            <View style={styles.skeletonStatItem} />
            <View style={styles.skeletonStatItem} />
          </View>
        </View>
      </View>
    </View>
  );

  const SkeletonLoading = () => (
    <>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSubtitle} />
      <View style={styles.skeletonSubtitle} />
      <View style={styles.skeletonTimer} />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <SkeletonUserItem key={item} />
      ))}
    </>
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
        {isLoading ? (
          <SkeletonLoading />
        ) : activeTab === "random" ? (
          <>
            <Pressable onPress={() => router.push("../stack/leagueScreen")}>
              <Text style={styles.mainSectionTitle}>{leagueTitle}</Text>
            </Pressable>
            {groupInfo && (
              <Text style={styles.sectionSubtitle}>{groupInfo}</Text>
            )}
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
            {randomUsers.length > 0 ? (
              randomUsers.map(renderUserItem)
            ) : (
              <Text style={styles.emptyText}>No rankings available</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>👥 Your Followed</Text>
            <Text style={styles.sectionSubtitle}>
              Ranking among your friends
            </Text>
            {followingUsers.length > 0 ? (
              followingUsers.map(renderUserItem)
            ) : (
              <Text style={styles.emptyText}>
                No friends rankings available
              </Text>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 40,
  },
  // Skeleton Loading Styles
  skeletonTitle: {
    width: 200,
    height: 32,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 16,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 150,
    height: 18,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 9,
    alignSelf: "center",
    marginBottom: 8,
  },
  skeletonTimer: {
    width: 180,
    height: 44,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 16,
  },
  skeletonPosition: {
    borderColor: Colors.primary_700_30,
  },
  skeletonPositionNumber: {
    width: 20,
    height: 20,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 10,
  },
  skeletonAvatar: {
    backgroundColor: Colors.primary_700_30,
  },
  skeletonStatItem: {
    width: 60,
    height: 16,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 8,
    marginRight: 16,
  },
  skeletonUserName: {
    width: 120,
    height: 18,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 9,
    marginBottom: 8,
  },
});

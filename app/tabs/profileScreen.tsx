import React, { useEffect, useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  Share,
  ActivityIndicator,
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
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";

export default function profileScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);
  const weeks = 16; // zakres 16 tygodni wstecz

  const [heatmapData, setHeatmapData] = useState<
    { date: string; count: number }[]
  >([]);
  const [awards, setAwards] = useState<
    Array<{ id?: string; key?: number; name?: string }>
  >([]);
  const [friendsStreaks, setFriendsStreaks] = useState<
    Array<{ userId?: string; key?: number; name: string; streak: number }>
  >([]);
  const [myDecks, setMyDecks] = useState<
    Array<{
      id?: string;
      key?: number;
      name: string;
      cards: number;
      lastStudied?: string;
    }>
  >([]);
  const [profileData, setProfileData] = useState<{
    stats?: {
      totalCards?: number;
      totalDecks?: number;
      totalReviews?: number;
      averageDifficulty?: number;
    };
    streak?: number;
    friendsCount?: number;
    followers?: number;
    following?: number;
  }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (userCtx.id) {
      fetchProfileData();
    }
  }, [userCtx.id]);

  async function fetchProfileData(): Promise<void> {
    if (!userCtx.id) return;

    try {
      setIsLoading(true);

      const [profile, heatmap, awardsData, streaks, decks] = await Promise.all([
        cloudFunctions.getUserProfile(userCtx.id),
        cloudFunctions.getUserActivityHeatmap(userCtx.id, weeks),
        cloudFunctions.getUserAwards(userCtx.id),
        cloudFunctions.getFriendsStreaks(userCtx.id),
        cloudFunctions.getUserDecks(userCtx.id),
      ]);

      setProfileData({
        stats: profile.stats,
        streak: profile.streak,
        friendsCount: profile.friendsCount,
        followers: profile.followers,
        following: profile.following,
      });

      setHeatmapData(heatmap.heatmapData);
      setAwards(
        awardsData.awards.map((a: any, idx: number) => ({
          id: a.id || `award-${idx}`,
          key: idx + 1,
          name:
            a.type === "league"
              ? `Liga ${a.leagueNumber}`
              : a.type === "streak"
              ? `Streak ${a.streakDays}`
              : a.milestoneType || "Award",
        }))
      );

      setFriendsStreaks(
        streaks.friendsStreaks.map((fs: any, idx: number) => ({
          userId: fs.userId,
          key: idx + 1,
          name: fs.name,
          streak: fs.streak,
        }))
      );

      // Transform decks - we'd need lastStudied from studySessions, for now just use basic data
      setMyDecks(
        decks.decks.slice(0, 3).map((deck: any, idx: number) => ({
          id: deck.id,
          key: idx + 1,
          name: deck.title || "Untitled",
          cards: deck.cardsNum || deck.cards?.length || 0,
        }))
      );
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  }

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
                <Text style={styles.infoNum}>
                  {profileData.friendsCount ?? 0}
                </Text>
                <Text style={styles.infoText}>Friends</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNum}>{profileData.followers ?? 0}</Text>
                <Text style={styles.infoText}>Followers</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNum}>{profileData.following ?? 0}</Text>
                <Text style={styles.infoText}>Following</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.subTitle}>Your Stats</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent_500} />
          ) : (
            <>
              <View style={styles.statsItemsContainer}>
                <View style={styles.statsItem}>
                  <MaterialCommunityIcons
                    name="card"
                    size={24}
                    color={Colors.primary_700}
                    style={styles.statsItemIcon}
                  />
                  <Text style={styles.statsItemValue}>
                    {profileData.stats?.totalDecks ?? 0}
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <FireIcon
                    size={24}
                    color={Colors.accent_500}
                    style={styles.statsItemIcon}
                  />
                  <Text style={styles.statsItemValue}>
                    {profileData.streak ?? 0} dni
                  </Text>
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
                  <Text style={styles.statsItemValue}>
                    {profileData.stats?.totalCards ?? 0}
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <FontAwesome6
                    name="ranking-star"
                    size={24}
                    color={Colors.primary_700}
                    style={styles.statsItemIcon}
                  />
                  <Text style={styles.statsItemValue}>
                    {profileData.stats?.totalReviews ?? 0}
                  </Text>
                </View>
              </View>
            </>
          )}
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Mutal streaks</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {friendsStreaks.length > 0 ? (
                friendsStreaks.map((friend) => (
                  <View
                    key={friend.key || friend.userId}
                    style={styles.friendStreakItem}
                  >
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
                ))
              ) : (
                <Text style={styles.emptyText}>No friends streaks yet</Text>
              )}
            </ScrollView>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Your awards</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {awards.length > 0 ? (
                awards.map((award) => (
                  <View key={award.key || award.id} style={styles.awardItem}>
                    <MaterialCommunityIcons
                      name="medal"
                      size={24}
                      color={Colors.primary_700}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No awards yet</Text>
              )}
            </ScrollView>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Aktywność nauki</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.accent_500} />
            ) : (
              <ContributionHeatmap
                weeks={weeks}
                data={heatmapData.length > 0 ? heatmapData : []}
                title="Ostatnie tygodnie"
              />
            )}
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Twoje decki</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {myDecks.length > 0 ? (
                myDecks.map((deck) => (
                  <View key={deck.key || deck.id} style={styles.deckItem}>
                    <MaterialCommunityIcons
                      name="cards"
                      size={24}
                      color={Colors.primary_700}
                      style={styles.deckIcon}
                    />
                    <Text style={styles.deckName}>{deck.name}</Text>
                    <Text style={styles.deckCards}>{deck.cards} kart</Text>
                    {deck.lastStudied && (
                      <Text style={styles.deckLastStudied}>
                        {deck.lastStudied}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No decks yet</Text>
              )}
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
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_500,
    fontWeight: "500",
    textAlign: "center",
    padding: 20,
  },
});

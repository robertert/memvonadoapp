import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Cog6ToothIcon, ShareIcon } from "react-native-heroicons/solid";
import { router } from "expo-router";
import { FireIcon } from "react-native-heroicons/solid";
import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import ContributionHeatmap from "../../components/profileScreen/ContributionHeatmap";
import ProfileSkeleton from "../../components/profileScreen/ProfileSkeleton";
import { cloudFunctions } from "../../services/cloudFunctions";
import { buildUserShareMessage } from "@/utils/deepLinks";
import { useAuth } from "../../store/auth";
import type { User } from "@/types";
import type { GetAvocadoStatusResponse, AvocadoSkin } from "@/types/schemas/avocado";
import AvocadoImage from "@/components/avocado/AvocadoImage";
import { AVOCADO_RARITY_COLORS, DEFAULT_AVOCADO_CONFIG } from "@/constants/avocado";

export default function profileScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const { userId } = useAuth();
  const weeks = 16; // zakres 16 tygodni wstecz

  const [heatmapData, setHeatmapData] = useState<
    { date: string; count: number }[]
  >([]);
  const [awards, setAwards] = useState<
    Array<{ id?: string; key?: number; name?: string }>
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
  const [profileData, setProfileData] = useState<User>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [avocadoSkins, setAvocadoSkins] = useState<AvocadoSkin[]>([]);

  useEffect(() => {
    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  async function fetchProfileData(): Promise<void> {
    if (!userId) return;

    try {
      setIsLoading(true);

      const [profile, heatmap, awardsData, decks] = await Promise.all([
        cloudFunctions.getUserProfile(userId!!),
        cloudFunctions.getUserActivityHeatmap(userId!!, weeks),
        cloudFunctions.getUserAwards(userId!!),
        cloudFunctions.getUserDecks(userId!!),
      ]);

      setProfileData(profile);
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

      // Transform decks - we'd need lastStudied from studySessions, for now just use basic data
      setMyDecks(
        decks.decks.slice(0, 3).map((deck: any, idx: number) => ({
          id: deck.id,
          key: idx + 1,
          name: deck.title || "Untitled",
          cards: deck.cardsNum || deck.cards?.length || 0,
        }))
      );

      // Fetch avocado collection (non-blocking)
      try {
        const avocadoStatus = await cloudFunctions.getAvocadoStatus();
        // Sort by rarity (epic first, then rare, then common) and take top 4
        const sortedSkins = [...(avocadoStatus.collectedSkins || [])].sort((a, b) => {
          const rarityOrder = { epic: 0, rare: 1, common: 2, legendary: 3 };
          return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        });
        setAvocadoSkins(sortedSkins.slice(0, 4));
      } catch (avocadoErr) {
        console.log("Failed to fetch avocado skins:", avocadoErr);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function shareProfileHandler(): void {
    if (!profileData?.username) return;
    Share.share({
      message: buildUserShareMessage(profileData.username),
    });
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Text style={styles.headerTitle}>
          {profileData?.username ?? "Unknown"}
        </Text>
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
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
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
                    {profileData?.followersCount ?? 0}
                  </Text>
                  <Text style={styles.infoText}>Followers</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoNum}>
                    {profileData?.followingCount ?? 0}
                  </Text>
                  <Text style={styles.infoText}>Following</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        {!isLoading && (
          <View style={styles.statsContainer}>
            <Text style={styles.subTitle}>Twoje statystyki</Text>
            <View style={styles.statsItemsContainer}>
              <View style={styles.statsItem}>
                <MaterialCommunityIcons
                  name="card"
                  size={24}
                  color={Colors.primary_700}
                  style={styles.statsItemIcon}
                />
                <Text style={styles.statsItemValue}>
                  {profileData?.stats?.totalDecks ?? 0}
                </Text>
              </View>
              <View style={styles.statsItem}>
                <FireIcon
                  size={24}
                  color={Colors.accent_500}
                  style={styles.statsItemIcon}
                />
                <Text style={styles.statsItemValue}>
                  {profileData?.stats?.currentStreak ?? 0} dni
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
                  {profileData?.stats?.totalCards ?? 0}
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
                  {profileData?.stats?.totalReviews ?? 0}
                </Text>
              </View>
            </View>

            {/* Awards */}
            {/*
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
            */}
            <View style={styles.sectionContainer}>
              <Text style={styles.subTitle}>Aktywność nauki</Text>
              <ContributionHeatmap
                weeks={weeks}
                data={heatmapData.length > 0 ? heatmapData : []}
                title="Ostatnie tygodnie"
              />
            </View>
            {/* Avocado Collection Preview */}
            {avocadoSkins.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.subTitle}>Twoja kolekcja</Text>
                <ScrollView
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                >
                  {avocadoSkins.map((skin, idx) => {
                    const skinConfig = DEFAULT_AVOCADO_CONFIG.skins.find(s => s.id === skin.id);
                    return (
                      <View
                        key={skin.id || idx}
                        style={[
                          styles.avocadoSkinItem,
                          { borderColor: AVOCADO_RARITY_COLORS[skin.rarity] },
                        ]}
                      >
                        <AvocadoImage skinId={skin.id} size="small" />
                        <Text style={styles.avocadoSkinName}>{skinConfig?.name || skin.name}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <Pressable
                  style={styles.collectionButton}
                  onPress={() => {
                    router.push("/stack/avocadoCollectionScreen");
                  }}
                >
                  <Text style={styles.collectionButtonText}>Zobacz wszystkie</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color={Colors.primary_700}
                  />
                </Pressable>
              </View>
            )}

            <View style={styles.sectionContainer}>
              <Text style={styles.subTitle}>Twoje decki</Text>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {myDecks.length > 0 ? (
                  myDecks.map((deck) => (
                    <Pressable key={deck.key || deck.id} onPress={() => {
                      router.push({
                        pathname: "../stack/deckDetails",
                        params: { deckId: deck.id },
                      });
                    }}>
                      <View style={styles.deckItem}>
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
                    </Pressable>
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
  avocadoSkinItem: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    marginVertical: 5,
    width: 90,
    height: 90,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    padding: 8,
  },
  avocadoSkinName: {
    fontSize: 11,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  collectionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_500,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  collectionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    marginRight: 6,
  },
});

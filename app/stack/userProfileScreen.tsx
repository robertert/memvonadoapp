import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ArrowLeftIcon, FireIcon, ShareIcon } from "react-native-heroicons/solid";
import { router, useLocalSearchParams } from "expo-router";
import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import ContributionHeatmap from "../../components/profileScreen/ContributionHeatmap";
import { cloudFunctions } from "../../services/cloudFunctions";
import { useAuth } from "../../store/auth";
import type { User } from "@/types";
import { buildUserShareMessage } from "@/utils/deepLinks";

interface UserProfileParams {
  userId: string;
}

export default function userProfileScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typedParams = params as unknown as UserProfileParams;
  const { userId: currentUserId } = useAuth();
  const weeks = 16;

  const [profileData, setProfileData] = useState<User>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<
    { date: string; count: number }[]
  >([]);
  const [publicDecks, setPublicDecks] = useState<
    Array<{ id: string; name: string; cards: number }>
  >([]);

  useEffect(() => {
    // If viewing own profile, redirect to profile tab
    if (typedParams.userId === currentUserId) {
      router.back();
      return;
    }
    fetchProfileData();
  }, [typedParams.userId]);

  async function fetchProfileData(): Promise<void> {
    try {
      setIsLoading(true);

      const [profileResult, heatmap] = await Promise.all([
        cloudFunctions.getPublicUserProfile(typedParams.userId),
        cloudFunctions.getUserActivityHeatmap(typedParams.userId, weeks),
      ]);

      setProfileData(profileResult.user);
      setIsFollowing(profileResult.isFollowing);
      setHeatmapData(heatmap.heatmapData);

      // Fetch user's decks and filter to public only
      try {
        const decksResult = await cloudFunctions.getUserDecks(
          typedParams.userId
        );
        const filtered = decksResult.decks
          .filter((d: any) => d.isPublic !== false)
          .slice(0, 6)
          .map((deck: any) => ({
            id: deck.id,
            name: deck.title || "Untitled",
            cards: deck.cardsNum || 0,
          }));
        setPublicDecks(filtered);
      } catch {
        // User decks may not be accessible
      }
    } catch (error) {
      console.error("Error fetching public profile:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleFollow(): Promise<void> {
    if (isTogglingFollow) return;
    setIsTogglingFollow(true);
    try {
      const result = await cloudFunctions.toggleFollow(typedParams.userId);
      setIsFollowing(result.isFollowing);
      // Update local follower count
      if (profileData) {
        setProfileData({
          ...profileData,
          followersCount:
            (profileData.followersCount ?? 0) +
            (result.isFollowing ? 1 : -1),
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsTogglingFollow(false);
    }
  }

  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View
          style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeftIcon size={24} color={Colors.primary_700} />
          </Pressable>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={{ width: 24 }} />
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.accent_500} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeftIcon size={24} color={Colors.primary_700} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {profileData?.username ?? "Unknown"}
        </Text>
        <Pressable
          onPress={() => {
            if (!profileData?.username) return;
            Share.share({
              message: buildUserShareMessage(profileData.username),
            });
          }}
        >
          <ShareIcon size={22} color={Colors.primary_700} />
        </Pressable>
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
            <Pressable
              onPress={handleToggleFollow}
              disabled={isTogglingFollow}
              style={[
                styles.followButton,
                isFollowing && styles.followButtonActive,
              ]}
            >
              {isTogglingFollow ? (
                <ActivityIndicator size="small" color={Colors.primary_100} />
              ) : (
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing && styles.followButtonTextActive,
                  ]}
                >
                  {isFollowing ? "Obserwujesz" : "Obserwuj"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.subTitle}>Statystyki</Text>
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

          <View style={styles.sectionContainer}>
            <Text style={styles.subTitle}>Aktywność nauki</Text>
            <ContributionHeatmap
              weeks={weeks}
              data={heatmapData.length > 0 ? heatmapData : []}
              title="Ostatnie tygodnie"
            />
          </View>

          {publicDecks.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.subTitle}>Publiczne decki</Text>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {publicDecks.map((deck) => (
                  <Pressable
                    key={deck.id}
                    onPress={() => {
                      router.push({
                        pathname: "/stack/deckDetails",
                        params: { deckId: deck.id },
                      });
                    }}
                  >
                    <View style={styles.deckItem}>
                      <MaterialCommunityIcons
                        name="cards"
                        size={24}
                        color={Colors.primary_700}
                        style={styles.deckIcon}
                      />
                      <Text style={styles.deckName}>{deck.name}</Text>
                      <Text style={styles.deckCards}>{deck.cards} kart</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
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
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 15,
    backgroundColor: Colors.primary_100,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
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
  followButton: {
    marginTop: 12,
    backgroundColor: Colors.primary_700,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  followButtonActive: {
    backgroundColor: Colors.primary_500,
  },
  followButtonText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "700",
  },
  followButtonTextActive: {
    color: Colors.primary_700,
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
  sectionContainer: {
    marginTop: 30,
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
});

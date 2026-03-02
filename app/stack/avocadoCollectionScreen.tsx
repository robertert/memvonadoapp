import React, { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";
import { ArrowLeftIcon } from "react-native-heroicons/solid";
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";
import AvocadoImage from "@/components/avocado/AvocadoImage";
import {
  AVOCADO_RARITY_COLORS,
  AVOCADO_RARITY_NAMES,
  DEFAULT_AVOCADO_CONFIG,
  TOTAL_SKINS_COUNT,
} from "@/constants/avocado";
import type {
  GetAvocadoStatusResponse,
  AvocadoSkinRarity,
} from "@/types/schemas/avocado";

export default function AvocadoCollectionScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);

  const [status, setStatus] = useState<GetAvocadoStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvocadoStatus();
  }, []);

  const fetchAvocadoStatus = async () => {
    if (!userCtx.id) return;

    try {
      setError(null);
      const response = await cloudFunctions.getAvocadoStatus();
      setStatus(response);
    } catch (e) {
      console.error("Error fetching avocado status:", e);
      setError("Nie udalo sie pobrac danych. Sprobuj ponownie.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAvocadoStatus();
  };

  const collectedSkinIds = new Set(status?.collectedSkins?.map((s) => s.id) || []);
  const allSkins = DEFAULT_AVOCADO_CONFIG.skins;
  const collectedCount = collectedSkinIds.size;

  // Group skins by rarity for display
  const skinsByRarity: Record<AvocadoSkinRarity, typeof allSkins> = {
    common: allSkins.filter((s) => s.rarity === "common"),
    rare: allSkins.filter((s) => s.rarity === "rare"),
    epic: allSkins.filter((s) => s.rarity === "epic"),
    legendary: allSkins.filter((s) => s.rarity === "legendary"),
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeftIcon size={24} color={Colors.primary_700} />
          </Pressable>
          <Text style={styles.headerTitle}>Twoj Koszyk</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
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
        <Text style={styles.headerTitle}>Twoja kolekcja
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {collectedCount}/{TOTAL_SKINS_COUNT}
            </Text>
            <Text style={styles.statLabel}>Posiadanych odmian</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{status?.totalHarvests || 0}</Text>
            <Text style={styles.statLabel}>Calkowitych zbiorow</Text>
          </View>
        </View>

        {/* Collection Grid - Grouped by Rarity */}
        {(["epic", "rare", "common"] as AvocadoSkinRarity[]).map((rarity) => {
          const skinsInRarity = skinsByRarity[rarity];
          if (skinsInRarity.length === 0) return null;

          return (
            <View key={rarity} style={styles.raritySection}>
              <View style={styles.raritySectionHeader}>
                <View
                  style={[
                    styles.rarityIndicator,
                    { backgroundColor: AVOCADO_RARITY_COLORS[rarity] },
                  ]}
                />
                <Text style={styles.raritySectionTitle}>
                  {AVOCADO_RARITY_NAMES[rarity]}
                </Text>
              </View>

              <View style={styles.skinsGrid}>
                {skinsInRarity.map((skin) => {
                  const isOwned = collectedSkinIds.has(skin.id);

                  return (
                    <View
                      key={skin.id}
                      style={[
                        styles.skinCard,
                        {
                          borderColor: isOwned
                            ? AVOCADO_RARITY_COLORS[skin.rarity]
                            : Colors.primary_700_30,
                        },
                        !isOwned && styles.skinCardLocked,
                      ]}
                    >
                      <AvocadoImage
                        skinId={skin.id}
                        size="medium"
                        locked={!isOwned}
                      />
                      <Text
                        style={[
                          styles.skinName,
                          !isOwned && styles.skinNameLocked,
                        ]}
                      >
                        {isOwned ? skin.name : "???"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Harvest History */}
        {status?.harvestHistory && status.harvestHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Historia zbiorow</Text>
            {status.harvestHistory
              .slice()
              .reverse()
              .slice(0, 10)
              .map((log, index) => {
                const skinConfig = allSkins.find((s) => s.id === log.skinId);
                return (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyItemLeft}>
                      <AvocadoImage skinId={log.skinId} size="small" />
                      <View style={styles.historyItemInfo}>
                        <Text style={styles.historyItemName}>
                          {skinConfig?.name || log.skinId}
                        </Text>
                        <Text
                          style={[
                            styles.historyItemRarity,
                            {
                              color:
                                AVOCADO_RARITY_COLORS[
                                skinConfig?.rarity || "common"
                                ],
                            },
                          ]}
                        >
                          {skinConfig
                            ? AVOCADO_RARITY_NAMES[skinConfig.rarity]
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyItemDate}>
                      {formatDate(log.harvestedAt)}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  statBox: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 28,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    color: Colors.primary_700,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "600",
    color: Colors.primary_700_50,
    marginTop: 4,
  },
  raritySection: {
    marginBottom: 24,
  },
  raritySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rarityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  raritySectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  skinsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  skinCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    padding: 8,
    marginRight: "3.33%",
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skinCardLocked: {
    backgroundColor: Colors.primary_700_30,
  },
  skinName: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
    marginTop: 4,
    textAlign: "center",
  },
  skinNameLocked: {
    color: Colors.primary_700_50,
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    fontWeight: "800",
    color: Colors.primary_700,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_700_30,
    padding: 12,
    marginBottom: 8,
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemInfo: {
    marginLeft: 12,
  },
  historyItemName: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  historyItemRarity: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "600",
  },
  historyItemDate: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "500",
    color: Colors.primary_700_50,
  },
});

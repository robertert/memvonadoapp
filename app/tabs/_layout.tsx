import React, { useEffect, useState } from "react";
import { Tabs, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import {
  ChartBarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  HomeIcon,
} from "react-native-heroicons/solid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StreakLostModal from "@/components/StreakLostModal";
import HarvestModal from "@/components/avocado/HarvestModal";
import AvocadoResetModal from "@/components/avocado/AvocadoResetModal";
import { cloudFunctions } from "@/services/cloudFunctions";
import type { AvocadoSkin } from "@/types/schemas/avocado";
import {
  AVOCADO_HARVEST_PENDING_KEY,
  AVOCADO_RESET_PENDING_KEY,
  AVOCADO_REFRESH_DASHBOARD_KEY,
} from "@/constants/avocado";
import { router } from "expo-router";
import { useDeepLink, usePendingQuickAdd } from "@/hooks/useDeepLink";

const STREAK_RESET_KEY = "streak_reset_pending";

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ triggerHarvest?: string }>();

  // Deep link hooks
  useDeepLink();
  usePendingQuickAdd();

  // Streak modal state
  const [showStreakResetModal, setShowStreakResetModal] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(0);

  // Avocado harvest modal state
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [harvestError, setHarvestError] = useState<string | null>(null);
  const [awardedSkin, setAwardedSkin] = useState<AvocadoSkin | null>(null);
  const [isNewSkin, setIsNewSkin] = useState(false);

  // Avocado reset modal state
  const [showAvocadoResetModal, setShowAvocadoResetModal] = useState(false);
  const [avocadoPreviousDays, setAvocadoPreviousDays] = useState(0);

  // Handle harvest trigger from dashboard
  useEffect(() => {
    if (params.triggerHarvest === "true") {
      handleHarvest();
    }
  }, [params.triggerHarvest]);

  // Harvest handler
  const handleHarvest = async () => {
    setHarvestError(null);
    setHarvestLoading(true);
    setShowHarvestModal(true);

    try {
      const result = await cloudFunctions.harvestAvocado();
      setAwardedSkin(result.awardedSkin);
      setIsNewSkin(result.isNewSkin);
    } catch (err) {
      console.error("Harvest error:", err);
      setHarvestError("Nie udalo sie zebrac awokado. Sprobuj ponownie.");
    } finally {
      setHarvestLoading(false);
    }
  };

  const handleHarvestRetry = () => {
    handleHarvest();
  };

  const handleHarvestClose = async () => {
    setShowHarvestModal(false);
    setAwardedSkin(null);
    setIsNewSkin(false);
    setHarvestError(null);

    // Ustaw flagę do odświeżenia dashboardu
    await AsyncStorage.setItem(AVOCADO_REFRESH_DASHBOARD_KEY, "true");

    // Wyczyść parametry i odśwież dashboard
    router.replace("/tabs/dashboardScreen");
  };

  // Sprawdź czy jest pending streak reset przy mount tabsów
  useEffect(() => {
    const checkPendingModals = async () => {
      try {
        // Check streak reset
        const streakResetData = await AsyncStorage.getItem(STREAK_RESET_KEY);
        if (streakResetData) {
          const parsed = JSON.parse(streakResetData);
          setPreviousStreak(parsed.previousStreak || 0);

          setTimeout(() => {
            setShowStreakResetModal(true);
          }, 500);

          await AsyncStorage.removeItem(STREAK_RESET_KEY);
        }

        // Check avocado reset
        const avocadoResetData = await AsyncStorage.getItem(AVOCADO_RESET_PENDING_KEY);
        if (avocadoResetData) {
          const parsed = JSON.parse(avocadoResetData);
          setAvocadoPreviousDays(parsed.previousDays || 0);

          setTimeout(() => {
            setShowAvocadoResetModal(true);
          }, showStreakResetModal ? 1500 : 500);

          await AsyncStorage.removeItem(AVOCADO_RESET_PENDING_KEY);
        }
      } catch (error) {
        console.error("Error checking pending modals:", error);
      }
    };

    checkPendingModals();
  }, []);

  const sizeC = 32;
  return (
    <>
      <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarInactiveTintColor: Colors.primary_700,
        tabBarActiveTintColor: Colors.accent_500,
        headerShown: false,
        tabBarBackground: () => {
          return (
            <View
              style={[
                styles.tabBar,
                { height: insets.bottom + 70, paddingBottom: insets.bottom },
              ]}
            >
              <View style={styles.tabBarInner} />
            </View>
          );
        },
      }}
    >
      <Tabs.Screen
        name="dashboardScreen"
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            return (
              <>
                <HomeIcon size={sizeC} color={color} />
                {focused && (
                  <View style={[styles.line, { backgroundColor: color }]} />
                )}
              </>
            );
          },
        }}
      />

      <Tabs.Screen
        name="searchScreen"
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            return (
              <>
                <MagnifyingGlassIcon size={sizeC} color={color} />
                {focused && (
                  <View style={[styles.line, { backgroundColor: color }]} />
                )}
              </>
            );
          },
        }}
      />
      <Tabs.Screen
        name="createScreen"
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            return (
              <>
                <PlusIcon size={sizeC} color={color} />

                {focused && (
                  <View style={[styles.line, { backgroundColor: color }]} />
                )}
              </>
            );
          },
        }}
      />
      <Tabs.Screen
        name="rankingsScreen"
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            return (
              <>
                <ChartBarIcon size={sizeC} color={color} />
                {focused && (
                  <View style={[styles.line, { backgroundColor: color }]} />
                )}
              </>
            );
          },
        }}
      />
      <Tabs.Screen
        name="profileScreen"
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            return (
              <>
                <UserIcon size={sizeC} color={color} />
                {focused && (
                  <View style={[styles.line, { backgroundColor: color }]} />
                )}
              </>
            );
          },
        }}
      />
    </Tabs>
    
    <StreakLostModal
      visible={showStreakResetModal}
      onClose={() => setShowStreakResetModal(false)}
      previousStreak={previousStreak}
    />

    <HarvestModal
      visible={showHarvestModal}
      onClose={handleHarvestClose}
      awardedSkin={awardedSkin}
      isNewSkin={isNewSkin}
      isLoading={harvestLoading}
      error={harvestError}
      onRetry={handleHarvestRetry}
    />

    <AvocadoResetModal
      visible={showAvocadoResetModal}
      onClose={() => setShowAvocadoResetModal(false)}
      previousDays={avocadoPreviousDays}
    />

    </>
  );
}

const styles = StyleSheet.create({
  tabBarInner: {
    flex: 1,
  },
  tabBar: {
    borderRadius: 0,
    width: "100%",
    height: 70,
    backgroundColor: Colors.primary_500,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    marginTop: 3,
    height: 2,
    width: "70%",
    borderRadius: 10,
  },
});

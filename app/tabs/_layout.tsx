import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
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

const STREAK_RESET_KEY = "streak_reset_pending";

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [showStreakResetModal, setShowStreakResetModal] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(0);

  // Sprawdź czy jest pending streak reset przy mount tabsów
  useEffect(() => {
    const checkStreakReset = async () => {
      try {
        const streakResetData = await AsyncStorage.getItem(STREAK_RESET_KEY);
        if (streakResetData) {
          const parsed = JSON.parse(streakResetData);
          setPreviousStreak(parsed.previousStreak || 0);
          
          // Pokaż modal po krótkim opóźnieniu (żeby tabsy się załadowały)
          setTimeout(() => {
            setShowStreakResetModal(true);
          }, 500);
          
          // Usuń dane z AsyncStorage po pokazaniu modala
          await AsyncStorage.removeItem(STREAK_RESET_KEY);
        }
      } catch (error) {
        console.error("Error checking streak reset:", error);
      }
    };

    checkStreakReset();
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

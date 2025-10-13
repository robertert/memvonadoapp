import React from 'react';
import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import {
  ChartBarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  HomeIcon,
} from "react-native-heroicons/solid";

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const sizeC = 32;
  return (
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
        name="statsScreen"
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

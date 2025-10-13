import React, { useCallback, useEffect, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { router, Stack } from "expo-router";

import { View, useColorScheme } from "react-native";


import Header from "../ui/Header";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, loadAsync } from "expo-font";
import UserContextProvider from "../store/user-context";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout(): React.JSX.Element | null {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      router.replace("../tabs");
    }
  });


  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    "Peace Sans": require("../assets/Peace Sans.otf"),
    "Frank Serif": require("../assets/FrankRuhlLibre-Black.ttf"),
    Inter: require("../assets/Inter/Inter-VariableFont_opsz,wght.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    console.log(fontsLoaded);
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <UserContextProvider>
            <Stack
              initialRouteName={"(auth)/authSignUp"}
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="(auth)/authLogin" />
              <Stack.Screen name="(auth)/authSignUp" />
              <Stack.Screen name="(auth)/resetPassword" />
              <Stack.Screen name="(auth)/signUp2" />
              <Stack.Screen name="(auth)/signUp3" />
              <Stack.Screen name="tabs" />
            </Stack>
          </UserContextProvider>
        </ThemeProvider>
    </View>
  );
}

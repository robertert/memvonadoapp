import React, { useEffect, useRef } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { AuthProvider, useAuth } from "../store/auth";
import QuickAddProvider from "../store/quickAdd-context";
import { useQuickAdd } from "../store/quickAdd-context";
import { QuickAddModal } from "../components/quickAdd";
import Toast from "react-native-toast-message";
import { connectEmulatorsIfNeeded } from "../firebase";
import { useDeepLink } from "../hooks/useDeepLink";

SplashScreen.preventAutoHideAsync();

function QuickAddModalRoot() {
  const { isVisible, params, hideQuickAdd } = useQuickAdd();
  return (
    <QuickAddModal
      visible={isVisible}
      onClose={hideQuickAdd}
      initialFront={params.front}
      initialBack={params.back}
      initialDeckId={params.deckId}
      source={params.source}
    />
  );
}

function DeepLinkHandler() {
  useDeepLink();
  return null;
}

function AppContent({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useAuth();
  const wasReadyRef = useRef(false);

  useEffect(() => {
    if (fontsReady && status !== "loading") {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, status]);

  // Logout navigation — fires only when transitioning from 'ready' → 'unauthenticated'
  useEffect(() => {
    if (status === "ready") {
      wasReadyRef.current = true;
    } else if (status === "unauthenticated" && wasReadyRef.current) {
      router.replace("/(auth)/login");
    }
  }, [status]);

  return (
    <QuickAddProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="stack" />
      </Stack>
      <DeepLinkHandler />
      <QuickAddModalRoot />
      <Toast />
    </QuickAddProvider>
  );
}

export default function RootLayout(): React.JSX.Element | null {
  useEffect(() => {
    connectEmulatorsIfNeeded();
  }, []);

  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    "Peace Sans": require("../assets/Peace Sans.otf"),
    "Frank Serif": require("../assets/FrankRuhlLibre-Black.ttf"),
    Inter: require("../assets/Inter/Inter-VariableFont_opsz,wght.ttf"),
  });

  const fontsReady = !!(fontsLoaded || fontError);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <AppContent fontsReady={fontsReady} />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

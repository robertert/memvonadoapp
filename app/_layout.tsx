import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { router, Stack, useSegments } from "expo-router";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";
import { Animated, View, useColorScheme, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import UserContextProvider from "../store/user-context";
import { UserContext } from "../store/user-context";
import QuickAddProvider from "../store/quickAdd-context";
import { useQuickAdd } from "../store/quickAdd-context";
import { QuickAddModal } from "../components/quickAdd";
import Toast from "react-native-toast-message";
import { onAuthStateChanged } from "firebase/auth";
import { auth, connectEmulatorsIfNeeded, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cloudFunctions } from "../services/cloudFunctions";
import { useDeepLink } from "../hooks/useDeepLink";

const STREAK_RESET_KEY = "streak_reset_pending";

SplashScreen.preventAutoHideAsync();

const CustomSplashScreen = ({ isReady }: { isReady: boolean }) => {
  const [isVisible, setIsVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReady) {
      // Płynne znikanie
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1500, // Czas trwania animacji (ms)
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false); // Odmontuj po animacji
      });
    }
  }, [isReady]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.splashContainer,
      {opacity}]}>
      <Image
        source={require('../assets/memvocadoicon.png')} // Zmień na swój splash image
        style={{ width: 200, height: 200 }}
      />
    </Animated.View>
  );
};

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

function DeepLinkHandler({
  isAuthReady,
  isAuthenticated,
  isAppReady,
}: {
  isAuthReady: boolean;
  isAuthenticated: boolean;
  isAppReady: boolean;
}) {
  const { isResolvingDeepLink } = useDeepLink({ isAuthReady, isAuthenticated, isAppReady });
  return null;
}

/**
 * Reads isUserLoaded from UserContext and hides the splash screen
 * only after both fonts are loaded, auth is ready, AND user data is loaded.
 */
function SplashController({
  fontsReady,
  isAuthReady,
  onAppReady,
}: {
  fontsReady: boolean;
  isAuthReady: boolean;
  onAppReady: () => void;
}) {
  const { isUserLoaded } = useContext(UserContext);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (fontsReady && isAuthReady && isUserLoaded && !triggeredRef.current) {
      triggeredRef.current = true;
      onAppReady();
    }
  }, [fontsReady, isAuthReady, isUserLoaded, onAppReady]);

  return null;
}

export default function RootLayout(): React.JSX.Element | null {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  // Connect to emulators in development mode
  useEffect(() => {
    connectEmulatorsIfNeeded();
  }, []);

  // Handle authentication state changes - jeden centralny handler
  const segments = useSegments();
  const navigationHandledRef = useRef(false);
  const lastRouteRef = useRef<string | null>(null);
  const streakCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let navigationTimeout: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      setIsAuthenticated(!!user);

      // Zapobiegaj wielokrotnym przekierowaniom
      if (navigationHandledRef.current) {
        return;
      }

      // Sprawdź aktualną ścieżkę
      const currentPath = segments.join("/");

      try {
        if (user) {
          // Sprawdź czy użytkownik uzupełnił profil
          try {
            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);

              if (!snapshot.exists()) {
              try {
                await cloudFunctions.ensureUserDocument();
                console.log("User document created successfully");
              } catch (e) {
                console.error("Error creating user document:", e);
              }
              if (
                isMounted &&
                !currentPath.includes("onboarding") &&
                lastRouteRef.current !== "onboarding"
              ) {
                navigationHandledRef.current = true;
                lastRouteRef.current = "onboarding";
                router.replace("/(auth)/onboarding");
                setTimeout(() => {
                  navigationHandledRef.current = false;
                }, 1000);
              }
              return;
            }

            const userData = snapshot.data();
            const profileCompleted = userData?.profileCompleted === true;

            if (!profileCompleted) {
              if (
                isMounted &&
                !currentPath.includes("onboarding") &&
                lastRouteRef.current !== "onboarding"
              ) {
                navigationHandledRef.current = true;
                lastRouteRef.current = "onboarding";
                router.replace("/(auth)/onboarding");
                setTimeout(() => {
                  navigationHandledRef.current = false;
                }, 1000);
              }
            } else {
              // Profil uzupełniony - sprawdź streak przy logowaniu
              if (
                isMounted &&
                streakCheckedRef.current !== user.uid &&
                !currentPath.includes("onboarding")
              ) {
                streakCheckedRef.current = user.uid;

                try {
                  const streakResult = await cloudFunctions.updateUserStreakOnLogin();

                  if (streakResult.status === "streak_reset" && streakResult.updated) {
                    await AsyncStorage.setItem(
                      STREAK_RESET_KEY,
                      JSON.stringify({
                        previousStreak: streakResult.previousStreak,
                        timestamp: Date.now(),
                      })
                    );
                  }
                } catch (error) {
                  console.error("Error checking streak on login:", error);
                }
              }

              // Przejdź do głównej aplikacji tylko jeśli nie jesteśmy już w tabs
              if (
                isMounted &&
                !currentPath.includes("tabs") &&
                lastRouteRef.current !== "tabs"
              ) {
                navigationHandledRef.current = true;
                lastRouteRef.current = "tabs";
                router.replace("../tabs");
                setTimeout(() => {
                  navigationHandledRef.current = false;
                }, 1000);
              }
            }
          } catch (e) {
            console.error("Error checking profile completion:", e);
            try {
              await cloudFunctions.ensureUserDocument();
            } catch (err) {
              console.error("Error creating user document:", err);
            }
            if (
              isMounted &&
              !currentPath.includes("onboarding") &&
              lastRouteRef.current !== "onboarding"
            ) {
              navigationHandledRef.current = true;
              lastRouteRef.current = "onboarding";
              router.replace("/(auth)/onboarding");
              setTimeout(() => {
                navigationHandledRef.current = false;
              }, 1000);
            }
          }
        } else {
          // Użytkownik nie jest zalogowany - resetuj streak check
          streakCheckedRef.current = null;
          if (
            isMounted &&
            !currentPath.includes("login") &&
            lastRouteRef.current !== "login"
          ) {
            navigationHandledRef.current = true;
            lastRouteRef.current = "login";
            router.replace("/(auth)/login");
            setTimeout(() => {
              navigationHandledRef.current = false;
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Unexpected error in auth state handler:", error);
        if (
          isMounted &&
          !currentPath.includes("login") &&
          lastRouteRef.current !== "login"
        ) {
          navigationHandledRef.current = true;
          lastRouteRef.current = "login";
          router.replace("/(auth)/login");
          setTimeout(() => {
            navigationHandledRef.current = false;
          }, 1000);
        }
      }
      finally {
        if (isMounted) {
          setIsAuthReady(true);
      }
     }
    });

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    "Peace Sans": require("../assets/Peace Sans.otf"),
    "Frank Serif": require("../assets/FrankRuhlLibre-Black.ttf"),
    Inter: require("../assets/Inter/Inter-VariableFont_opsz,wght.ttf"),
  });

  const fontsReady = !!(fontsLoaded || fontError);

  const handleAppReady = useCallback(() => {
    setIsAppReady(true);
    SplashScreen.hideAsync();
  }, []);

  // Fallback: ukryj splash screen po 8 sekundach niezależnie od stanu
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAppReady(true);
      SplashScreen.hideAsync();
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <UserContextProvider>
            <QuickAddProvider>
              <Stack
                initialRouteName={"(auth)/login"}
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="(auth)/login" />
                <Stack.Screen name="(auth)/onboarding" />
                <Stack.Screen name="(auth)/resetPassword" />
                <Stack.Screen name="tabs" />
              </Stack>
              <SplashController
                fontsReady={fontsReady}
                isAuthReady={isAuthReady}
                onAppReady={handleAppReady}
              />
              <DeepLinkHandler
                isAuthReady={isAuthReady}
                isAuthenticated={isAuthenticated}
                isAppReady={isAppReady}
              />
              <QuickAddModalRoot />
              <CustomSplashScreen isReady={isAppReady} />
              <Toast />
            </QuickAddProvider>
          </UserContextProvider>
        </ThemeProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    backgroundColor: Colors.primary_100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});

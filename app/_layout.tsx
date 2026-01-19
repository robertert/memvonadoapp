import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { router, Stack, useSegments } from "expo-router";

import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import UserContextProvider from "../store/user-context";
import { onAuthStateChanged } from "firebase/auth";
import { auth, connectEmulatorsIfNeeded, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PLACEHOLDER_MODE, PLACEHOLDER_SEEDED_KEY } from "../constants/flags";
import { cloudFunctions } from "../services/cloudFunctions";

const STREAK_RESET_KEY = "streak_reset_pending";

SplashScreen.preventAutoHideAsync();

export default function RootLayout(): React.JSX.Element | null {
  // Connect to emulators in development mode
  useEffect(() => {
    connectEmulatorsIfNeeded();
  }, []);

  // Handle authentication state changes - jeden centralny handler
  // FUTURE: Można dodać onboarding przed logowaniem sprawdzając AsyncStorage flag
  // np. const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
  // if (!hasSeenOnboarding && !user) { router.replace('/(auth)/preLoginOnboarding'); }
  const segments = useSegments();
  const navigationHandledRef = useRef(false);
  const lastRouteRef = useRef<string | null>(null);
  const streakCheckedRef = useRef<string | null>(null); // Zapobiega wielokrotnemu sprawdzaniu dla tego samego usera

  useEffect(() => {
    let isMounted = true;
    let navigationTimeout: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      // Zapobiegaj wielokrotnym przekierowaniom
      if (navigationHandledRef.current) {
        return;
      }

      // Sprawdź aktualną ścieżkę
      const currentPath = segments.join("/");

      try {
        if (user) {
          // Jednorazowe zasilenie danych placeholder dla demo
          if (PLACEHOLDER_MODE) {
            try {
              const seeded = await AsyncStorage.getItem(PLACEHOLDER_SEEDED_KEY);
              if (!seeded) {
                await cloudFunctions.addPlaceholderData(user.uid, true);
                await AsyncStorage.setItem(PLACEHOLDER_SEEDED_KEY, "1");
              }
            } catch (e) {
              console.error("Error seeding placeholder data:", e);
            }
          }

          // Sprawdź czy użytkownik uzupełnił profil
          try {
            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);

            if (!snapshot.exists()) {
              console.log("User document does not exist, creating...");
              // Dokument nie istnieje - utwórz podstawowy dokument
              try {
                await cloudFunctions.ensureUserDocument();
                console.log("User document created successfully");
              } catch (e) {
                console.error("Error creating user document:", e);
              }
              // Przekieruj do onboardingu tylko jeśli nie jesteśmy już tam
              if (
                isMounted &&
                !currentPath.includes("onboarding") &&
                lastRouteRef.current !== "onboarding"
              ) {
                navigationHandledRef.current = true;
                lastRouteRef.current = "onboarding";
                router.replace("/(auth)/onboarding");
                // Reset flag po 1 sekundzie
                setTimeout(() => {
                  navigationHandledRef.current = false;
                }, 1000);
              }
              return;
            }

            const userData = snapshot.data();
            const profileCompleted = userData?.profileCompleted === true;

            if (!profileCompleted) {
              // Przekieruj do onboardingu (wieloetapowa rejestracja) tylko jeśli nie jesteśmy już tam
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
              // Sprawdzamy tylko raz dla danego użytkownika (zapobiega wielokrotnym wywołaniom)
              if (
                isMounted &&
                streakCheckedRef.current !== user.uid &&
                !currentPath.includes("onboarding")
              ) {
                streakCheckedRef.current = user.uid;
                
                // Sprawdź streak przy logowaniu
                try {
                  const streakResult = await cloudFunctions.updateUserStreakOnLogin();

                  // Jeśli streak został przerwany, zapisz do AsyncStorage (tabsy sprawdzą to przy mount)
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
                  // Nie blokuj logowania jeśli sprawdzenie streak się nie powiodło
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
            // W przypadku błędu, spróbuj utworzyć dokument i przekieruj do onboardingu
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
          // Przekieruj do ekranu logowania tylko jeśli nie jesteśmy już tam
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
        // W przypadku nieoczekiwanego błędu, przekieruj do logowania tylko jeśli nie jesteśmy już tam
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
    });

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
      unsubscribe();
    };
  }, [segments]);

  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    "Peace Sans": require("../assets/Peace Sans.otf"),
    "Frank Serif": require("../assets/FrankRuhlLibre-Black.ttf"),
    Inter: require("../assets/Inter/Inter-VariableFont_opsz,wght.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Ukryj splash screen po załadowaniu fontów lub po timeout
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch((err) => {
        console.error("Error hiding splash screen:", err);
      });
    }

    // Fallback: ukryj splash screen po 3 sekundach niezależnie od stanu
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch((err) => {
        console.error("Error hiding splash screen (timeout):", err);
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <UserContextProvider>
            <Stack
              initialRouteName={"(auth)/login"}
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(auth)/onboarding" />
              <Stack.Screen name="(auth)/resetPassword" />
              <Stack.Screen name="tabs" />
            </Stack>
          </UserContextProvider>
        </ThemeProvider>
      </View>
    </GestureHandlerRootView>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useQuickAdd, QuickAddSource } from "@/store/quickAdd-context";
import { parseDeepLinkUrl, DeepLinkRoute } from "@/utils/deepLinks";
import { cloudFunctions } from "@/services/cloudFunctions";
import { useAuth } from "@/store/auth";

const PENDING_DEEP_LINK_KEY = "PENDING_DEEP_LINK";

/**
 * Unified deep link router — handles all deep link types:
 * - add: Quick Add modal
 * - user: Navigate to user profile (resolves username → userId)
 * - deck: Navigate to deck details
 * - leaderboard: Navigate to rankings tab
 *
 * Auth-aware: buffers URL until auth state is known, saves pending
 * route to AsyncStorage if user is not logged in.
 */
export function useDeepLink() {
  const { status } = useAuth();
  const isAuthenticated = status === "ready";
  const isReady = status !== "loading";

  const { showQuickAdd } = useQuickAdd();
  const initialUrlHandled = useRef(false);
  const [isResolvingDeepLink, setIsResolvingDeepLink] = useState(false);

  // Buffer for URLs received before auth is ready
  const bufferedUrl = useRef<string | null>(null);

  // Guard: prevents double handling (common: getInitialURL + "url" event)
  const isHandlingDeepLink = useRef(false);
  const queuedUrl = useRef<string | null>(null);

  // Dedup guard: prevent the same route from being processed twice in quick succession
  const lastProcessedRoute = useRef<{ key: string; time: number; url: string } | null>(null);

  // Track if pending link was consumed on first mount
  const pendingLinkConsumed = useRef(false);

  const getRouteKey = (route: DeepLinkRoute): string => {
    const keys = Object.keys(route.params).sort();
    const paramsKey = keys.map((k) => `${k}=${route.params[k] ?? ""}`).join("&");
    return `${route.type}?${paramsKey}`;
  };

  const navigateToRoute = useCallback(
    async (route: DeepLinkRoute, options?: { replace?: boolean }) => {
      const replace = options?.replace ?? false;
      switch (route.type) {
        case "add": {
          const validSources: QuickAddSource[] = [
            "widget",
            "ocr",
            "deeplink",
            "manual",
          ];
          const source = validSources.includes(
            route.params.source as QuickAddSource
          )
            ? (route.params.source as QuickAddSource)
            : "deeplink";

          showQuickAdd({
            front: route.params.term,
            deckId: route.params.deck,
            source,
            autoTranslate: route.params.translate === "true",
          });
          break;
        }

        case "user": {
          const { username } = route.params;
          if (!username) return;

          setIsResolvingDeepLink(true);
          try {
            const result = await cloudFunctions.getUserByUsername(username);
            if (result.exists && result.userId) {
              router.push({
                pathname: "/stack/userProfileScreen",
                params: { userId: result.userId },
              });
            } else {
              Toast.show({
                type: "error",
                text1: "Nie znaleziono",
                text2: `Użytkownik @${username} nie istnieje`,
              });
              router.replace("/tabs");
            }
          } catch (error) {
            console.error("Error resolving username:", error);
            Toast.show({
              type: "error",
              text1: "Błąd",
              text2: "Nie udało się załadować profilu",
            });
            router.replace("/tabs");
          } finally {
            setIsResolvingDeepLink(false);
          }
          break;
        }

        case "deck": {
          const { deckId } = route.params;
          if (!deckId) return;

          setIsResolvingDeepLink(true);
          try {
            await cloudFunctions.getDeckDetails(deckId);

            router.push({
              pathname: "/stack/deckDetails",
              params: { deckId },
            });
          } catch {
            Toast.show({
              type: "error",
              text1: "Nie znaleziono",
              text2: "Talia nie istnieje lub jest prywatna",
            });
            router.replace("/tabs");
          } finally {
            setIsResolvingDeepLink(false);
          }
          break;
        }

        case "leaderboard": {
          router.replace("/tabs/rankingsScreen");
          break;
        }

        case "unknown":
        default:
          break;
      }
    },
    [showQuickAdd]
  );

  const handleDeepLink = useCallback(
    async (url: string) => {
      // If we're already handling one deep link, queue the latest and exit.
      if (isHandlingDeepLink.current) {
        queuedUrl.current = url;
        return;
      }

      const route = parseDeepLinkUrl(url);
      if (route.type === "unknown") return;

      // If auth isn't ready yet, buffer the URL
      if (!isReady) {
        bufferedUrl.current = url;
        return;
      }

      // Deduplicate: skip if this same route was processed in the last 3 seconds
      const now = Date.now();
      const routeKey = getRouteKey(route);
      if (
        lastProcessedRoute.current &&
        lastProcessedRoute.current.key === routeKey &&
        now - lastProcessedRoute.current.time < 3000
      ) {
        return;
      }
      lastProcessedRoute.current = { key: routeKey, url, time: now };

      isHandlingDeepLink.current = true;
      try {
        if (isAuthenticated) {
          await navigateToRoute(route, { replace: true });
        } else {
          // Not authenticated — save pending route for after login
          try {
            await AsyncStorage.setItem(
              PENDING_DEEP_LINK_KEY,
              JSON.stringify(route)
            );
          } catch (error) {
            console.error("Error saving pending deep link:", error);
          }
        }
      } finally {
        isHandlingDeepLink.current = false;
        if (queuedUrl.current) {
          const next = queuedUrl.current;
          queuedUrl.current = null;
          setTimeout(() => {
            handleDeepLink(next);
          }, 0);
        }
      }
    },
    [isReady, isAuthenticated, navigateToRoute]
  );

  // Stable ref so the url listener always calls the latest handleDeepLink
  const handleDeepLinkRef = useRef(handleDeepLink);
  handleDeepLinkRef.current = handleDeepLink;

  // Process buffered URL when auth becomes ready
  useEffect(() => {
    if (isReady && bufferedUrl.current) {
      const url = bufferedUrl.current;
      bufferedUrl.current = null;
      handleDeepLink(url);
    }
  }, [isReady, handleDeepLink]);

  // Consume pending deep link from AsyncStorage when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset on logout so next login can consume pending
      pendingLinkConsumed.current = false;
      return;
    }
    if (pendingLinkConsumed.current) return;
    pendingLinkConsumed.current = true;

    // 500ms delay: wait for tabs to mount after auth resolves
    const timer = setTimeout(async () => {
      try {
        const pending = await AsyncStorage.getItem(PENDING_DEEP_LINK_KEY);
        if (!pending) return;
        await AsyncStorage.removeItem(PENDING_DEEP_LINK_KEY);
        const route = JSON.parse(pending) as DeepLinkRoute;
        await navigateToRoute(route);
      } catch (error) {
        console.error("Error consuming pending deep link:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigateToRoute]);

  // Stable url event listener — registered once, uses ref to always
  // call the latest handleDeepLink without re-subscribing.
  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      initialUrlHandled.current = true;
      bufferedUrl.current = null;
      handleDeepLinkRef.current(event.url);
    });
    return () => subscription.remove();
  }, []);

  // Handle initial URL (app launched via deep link).
  useEffect(() => {
    const handleInitialUrl = async () => {
      if (initialUrlHandled.current) return;

      try {
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl) return;

        // Wait briefly so a live `url` event (which supersedes a stale
        // getInitialURL value) has time to fire and set the guard.
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (initialUrlHandled.current) return; // url event won the race
        initialUrlHandled.current = true;

        if (!isReady) {
          bufferedUrl.current = initialUrl;
          return;
        }
        handleDeepLink(initialUrl);
      } catch (error) {
        console.error("Error getting initial URL:", error);
      }
    };

    handleInitialUrl();
  }, [handleDeepLink, isReady]);

  return { isResolvingDeepLink };
}

export default useDeepLink;

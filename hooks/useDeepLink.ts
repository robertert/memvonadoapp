import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { useQuickAdd, QuickAddParams, QuickAddSource } from "@/store/quickAdd-context";

// Deep link URL structure:
// memvocado://add?term=X&deck=Y&source=Z&translate=true

interface DeepLinkParams {
  term?: string;
  deck?: string;
  source?: string;
  translate?: string;
}

/**
 * Parse deep link URL into QuickAddParams
 */
function parseDeepLinkUrl(url: string): QuickAddParams | null {
  try {
    const parsed = Linking.parse(url);

    // Handle memvocado://add route
    if (parsed.path === "add" || parsed.hostname === "add") {
      const queryParams = parsed.queryParams as DeepLinkParams | null;

      const params: QuickAddParams = {};

      if (queryParams?.term) {
        params.front = decodeURIComponent(queryParams.term);
      }

      if (queryParams?.deck) {
        params.deckId = queryParams.deck;
      }

      if (queryParams?.source) {
        const validSources: QuickAddSource[] = ["widget", "ocr", "deeplink", "manual"];
        if (validSources.includes(queryParams.source as QuickAddSource)) {
          params.source = queryParams.source as QuickAddSource;
        } else {
          params.source = "deeplink";
        }
      } else {
        params.source = "deeplink";
      }

      if (queryParams?.translate === "true") {
        params.autoTranslate = true;
      }

      return params;
    }

    // Handle memvocado://deck/{deckId} route (for widget deck shortcuts)
    if (parsed.path?.startsWith("deck/") || parsed.hostname === "deck") {
      // This is for navigating to a deck, not quick add
      // We'll handle this separately in navigation
      return null;
    }

    return null;
  } catch (error) {
    console.error("Error parsing deep link:", error);
    return null;
  }
}

/**
 * Hook to handle deep links for Quick Add functionality
 *
 * Usage:
 * - Add to a component that's always mounted when app is running (e.g., tabs layout)
 * - Will automatically show QuickAdd modal when deep link is received
 */
export function useDeepLink() {
  const { showQuickAdd, setPendingQuickAdd } = useQuickAdd();
  const initialUrlHandled = useRef(false);

  // Handle deep link URL
  const handleDeepLink = (url: string, isInitialUrl: boolean = false) => {
    const params = parseDeepLinkUrl(url);
    if (params) {
      // Show the quick add modal with the parsed params
      showQuickAdd(params);
    }
  };

  useEffect(() => {
    // Handle initial URL (app was launched via deep link)
    const handleInitialUrl = async () => {
      if (initialUrlHandled.current) return;

      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          initialUrlHandled.current = true;
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            handleDeepLink(initialUrl, true);
          }, 500);
        }
      } catch (error) {
        console.error("Error getting initial URL:", error);
      }
    };

    handleInitialUrl();

    // Listen for incoming deep links while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [showQuickAdd]);
}

/**
 * Hook to handle pending quick add after login
 *
 * Usage:
 * - Add to a component that renders after successful login
 * - Will automatically show QuickAdd modal if there was a pending deep link
 */
export function usePendingQuickAdd() {
  const { showQuickAdd, consumePendingQuickAdd } = useQuickAdd();

  useEffect(() => {
    const checkPending = async () => {
      const pending = await consumePendingQuickAdd();
      if (pending) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          showQuickAdd(pending);
        }, 500);
      }
    };

    checkPending();
  }, [consumePendingQuickAdd, showQuickAdd]);
}

export default useDeepLink;

import * as Linking from "expo-linking";

const WEB_BASE = "https://memvocado.com";

// ============================================================================
// URL Building
// ============================================================================

export function buildUserShareUrl(username: string): string {
  return `${WEB_BASE}/user/${encodeURIComponent(username)}`;
}

export function buildDeckShareUrl(deckId: string, title: string): string {
  return `${WEB_BASE}/deck/${encodeURIComponent(deckId)}/${slugify(title)}`;
}

export function buildLeaderboardShareUrl(): string {
  return `${WEB_BASE}/leaderboard`;
}

// ============================================================================
// Share Messages
// ============================================================================

export function buildUserShareMessage(username: string): string {
  return `Sprawdź profil @${username} na Memvocado! ${buildUserShareUrl(username)}`;
}

export function buildDeckShareMessage(title: string, deckId: string): string {
  return `Sprawdź talię "${title}" na Memvocado! ${buildDeckShareUrl(deckId, title)}`;
}

// ============================================================================
// Slugify (handles Polish characters)
// ============================================================================

const POLISH_MAP: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n",
  ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "a", Ć: "c", Ę: "e", Ł: "l", Ń: "n",
  Ó: "o", Ś: "s", Ź: "z", Ż: "z",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (char) => POLISH_MAP[char] || char)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip remaining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ============================================================================
// Deep Link Parsing
// ============================================================================

export interface DeepLinkRoute {
  type: "user" | "deck" | "leaderboard" | "add" | "unknown";
  params: Record<string, string>;
}

/**
 * Parse both `memvocado://` custom scheme and `https://memvocado.com/` Universal Links.
 */
export function parseDeepLinkUrl(url: string): DeepLinkRoute {
  try {
    // Normalize: try to detect Universal Link vs custom scheme
    const isUniversalLink =
      url.startsWith("https://memvocado.com") ||
      url.startsWith("http://memvocado.com");

    if (isUniversalLink) {
      return parseUniversalLink(url);
    }

    // Custom scheme: memvocado://...
    const parsed = Linking.parse(url);
    const path = parsed.path || parsed.hostname || "";
    const queryParams = (parsed.queryParams || {}) as Record<string, string>;

    // memvocado://add?term=X&deck=Y&source=Z
    if (path === "add" || parsed.hostname === "add") {
      return {
        type: "add",
        params: {
          ...(queryParams.term ? { term: decodeURIComponent(queryParams.term) } : {}),
          ...(queryParams.deck ? { deck: queryParams.deck } : {}),
          ...(queryParams.source ? { source: queryParams.source } : {}),
          ...(queryParams.translate ? { translate: queryParams.translate } : {}),
        },
      };
    }

    // memvocado://user/{username}
    if (path.startsWith("user/") || parsed.hostname === "user") {
      const segments = path.split("/").filter(Boolean);
      // hostname === "user" means the path contains the username
      const username =
        parsed.hostname === "user" && segments.length === 0
          ? (parsed.path || "").replace(/^\//, "")
          : segments[1] || segments[0] || "";
      if (username) {
        return {
          type: "user",
          params: { username: decodeURIComponent(username) },
        };
      }
    }

    // memvocado://deck/{deckId}/{slug?}
    if (path.startsWith("deck/") || parsed.hostname === "deck") {
      const segments = path.split("/").filter(Boolean);
      const deckId =
        parsed.hostname === "deck" && segments.length === 0
          ? (parsed.path || "").split("/").filter(Boolean)[0] || ""
          : segments[1] || segments[0] || "";
      if (deckId) {
        return {
          type: "deck",
          params: { deckId: decodeURIComponent(deckId) },
        };
      }
    }

    // memvocado://leaderboard
    if (path === "leaderboard" || parsed.hostname === "leaderboard") {
      return { type: "leaderboard", params: {} };
    }

    return { type: "unknown", params: {} };
  } catch (error) {
    console.error("Error parsing deep link URL:", error);
    return { type: "unknown", params: {} };
  }
}

function parseUniversalLink(url: string): DeepLinkRoute {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);

    // /user/{username}
    if (pathSegments[0] === "user" && pathSegments[1]) {
      return {
        type: "user",
        params: { username: decodeURIComponent(pathSegments[1]) },
      };
    }

    // /deck/{deckId}/{slug?}
    if (pathSegments[0] === "deck" && pathSegments[1]) {
      return {
        type: "deck",
        params: { deckId: decodeURIComponent(pathSegments[1]) },
      };
    }

    // /leaderboard
    if (pathSegments[0] === "leaderboard") {
      return { type: "leaderboard", params: {} };
    }

    return { type: "unknown", params: {} };
  } catch (error) {
    console.error("Error parsing Universal Link:", error);
    return { type: "unknown", params: {} };
  }
}

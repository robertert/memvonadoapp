import "dotenv/config";

export default {
  expo: {
    name: "Memvocado",
    slug: "Memvocado",
    scheme: "memvocado",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/memvocadoicon-fill.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/memvocadoicon.png",
      resizeMode: "contain",
      backgroundColor: "#FFF8E7",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.memvocado.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          "We use the microphone to record pronunciation audio for your cards.",
        // Apple Sign In jest automatycznie konfigurowany przez plugin expo-apple-authentication
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/memvocadoicon.png",
        backgroundColor: "#FFF8E7",
      },
      package: "com.memvocado.app",
      permissions: ["RECORD_AUDIO"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-audio",
      "expo-router",
      "expo-apple-authentication",
      "expo-web-browser",
      [
        "expo-font",
        {
          fonts: [
            "./assets/Peace Sans.otf",
            "./assets/FrankRuhlLibre-Black.ttf",
          ],
        },
      ],
    ],
    extra: {
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      // Google Sign In Client IDs
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      eas: {
        projectId: "a455ada4-2415-44b3-8533-eaafd438b84c",
      },
    },
  },
};

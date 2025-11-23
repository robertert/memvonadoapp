import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { auth } from "../../firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
} from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import Spinner from "react-native-loading-spinner-overlay";
import Constants from "expo-constants";

export default function LoginScreen(): React.JSX.Element {
  WebBrowser.maybeCompleteAuthSession();

  const safeArea = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
    androidClientId:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
    webClientId:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  });

  React.useEffect(() => {
    if (response?.type === "success") {
      handleGoogleSignIn(response.authentication?.idToken || "");
    } else if (response?.type === "error") {
      console.error("Google auth error:", response.error);
      Alert.alert(
        "Błąd autoryzacji",
        response.error?.message ||
          "Nie udało się zalogować przez Google. Sprawdź konfigurację OAuth."
      );
      setIsLoading(false);
    }
  }, [response]);

  async function handleGoogleSignIn(idToken: string): Promise<void> {
    try {
      setIsLoading(true);

      if (!idToken) {
        throw new Error("Brak tokenu autoryzacji");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);

      // Sprawdzenie czy to nowy użytkownik jest obsługiwane w _layout.tsx
      // przez sprawdzenie czy dokument użytkownika istnieje w Firestore
    } catch (error: any) {
      console.error("Google sign in error:", error);

      let errorMessage =
        "Nie udało się zalogować przez Google. Spróbuj ponownie.";

      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage =
          "Konto z tym emailem już istnieje. Użyj innej metody logowania.";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Nieprawidłowe dane logowania. Spróbuj ponownie.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Błąd logowania", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAppleSignIn(): Promise<void> {
    try {
      setIsLoading(true);

      if (!AppleAuthentication.isAvailableAsync()) {
        Alert.alert("Error", "Apple Sign In is not available on this device");
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, authorizationCode } = credential;

      if (!identityToken) {
        throw new Error("Apple Sign In failed - no identity token");
      }

      const provider = new OAuthProvider("apple.com");
      const appleCredential = provider.credential({
        idToken: identityToken,
        rawNonce: authorizationCode || undefined,
      });

      await signInWithCredential(auth, appleCredential);

      // Sprawdzenie czy to nowy użytkownik jest obsługiwane w _layout.tsx
      // przez sprawdzenie czy dokument użytkownika istnieje w Firestore
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // Użytkownik anulował logowanie
        return;
      }
      console.error("Apple sign in error:", error);
      Alert.alert("Error", "Failed to sign in with Apple. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: safeArea.top }]}>
      <View style={styles.topContainer}>
        <Image
          source={require("../../assets/memvocadoicon.png")}
          style={styles.icon}
        />
        <Text style={styles.title}>Memvocado</Text>
        <Text style={styles.subtitle}>Learn smarter, remember longer</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.googleButton}
          onPress={() => promptAsync()}
          disabled={!request || isLoading}
        >
          <Text style={styles.buttonText}>Continue with Google</Text>
        </Pressable>

        {Platform.OS === "ios" && (
          <Pressable
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              Continue with Apple
            </Text>
          </Pressable>
        )}
      </View>

      <Spinner visible={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_100,
    paddingHorizontal: 20,
  },
  topContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  icon: {
    height: 150,
    width: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 55,
    color: Colors.primary_500,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 400,
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  appleButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  appleButtonText: {
    color: Colors.white,
  },
});

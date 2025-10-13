import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, getDoc, getDocs, where, query } from "firebase/firestore";

export default function resetPassword(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  function emailChanged(text: string): void {
    setMessage("");
    setEmail(text);
  }

  function goBackHandler(): void {
    router.back();
  }

  async function resetHandler(): Promise<void> {
    try {
      const data = await getDocs(
        query(collection(db, `users`), where("email", "==", email))
      );

      if (!data.empty) {
        sendPasswordResetEmail(auth, email);
        goBackHandler();
      } else {
        setMessage("There is no account connected to that email.");
      }
    } catch (e: any) {
      console.log(e.code);
      if (
        e.code === "auth/missing-email" ||
        e.code === "auth/invalid-email"
      ) {
        setMessage("Invalid email");
      }
    }
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_500, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        <Pressable onPress={goBackHandler}>
          <Ionicons name="chevron-back" size={40} color={Colors.primary_100} />
        </Pressable>
        <View style={styles.contentContainer}>
          <Text style={styles.titleText}>Send an email to reset password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              onChangeText={emailChanged}
              value={email}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>
          {message && <Text style={styles.errorMessage}>{message}</Text>}
          <Pressable onPress={resetHandler}>
            <View style={styles.buttonContainer}>
              <Text style={styles.buttonText}>Send</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: "50%",
  },
  inputContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_500,
    borderRadius: 100,
    width: "80%",
  },
  input: {
    width: "80%",
    fontSize: 18,
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
  },
  buttonContainer: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: Colors.accent_500,
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 50,
    marginBottom: 30,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.white,
  },
  titleText: {
    fontSize: 25,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    textAlign: "center",
    marginBottom: 20,
  },
  errorMessage: {
    marginTop: 10,
    textAlign: "center",
    color: "red",
    fontFamily: Fonts.secondary,
  },
});

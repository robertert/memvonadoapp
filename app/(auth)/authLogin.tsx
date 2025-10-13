import React, { useContext, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { router } from "expo-router";
import Spinner from "react-native-loading-spinner-overlay";
import { UserContext } from "../../store/user-context";
import { collection, getDoc, getDocs, query, where } from "firebase/firestore";

export default function authLogin(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const userCtx = useContext(UserContext);

  useEffect(() => {
    let time: NodeJS.Timeout | number | null = null;
    if (isLoading) {
      time = setTimeout(() => {
        Alert.alert("Oops", "Something went wrong");
        setIsLoading(false);
      }, 10000);
    }
    return () => {
      if (time) {
        clearTimeout(time);
      }
    };
  }, [isLoading]);

  async function logInHandler(): Promise<void> {
    try {
      setIsLoading(true);
      const res = await signInWithEmailAndPassword(auth, email, password);
      console.log(email);
      console.log(db);

      const data = await getDocs(
        query(collection(db, `users`), where("email", "==", email))
      );
      console.log("User data fetched successfully");

      if (data.empty) {
        throw new Error("User not found");
      }
      console.log("User logged in successfully");

      const user = data.docs[0];
      userCtx.getUser(user.data().name, user.id);
      router.replace("../tabs");
      setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      console.log(e.code);
      if (
        e.code === "auth/invalid-email" ||
        e.code === "auth/missing-password" ||
        e.code === "auth/invalid-credential"
      ) {
        setMessage("Invalid email or password");
      }
      if (e.code === "auth/user-not-found") {
        setMessage("User not found");
      }
    }
  }

  function emailChanged(text: string): void {
    setEmail(text);
  }

  function passwordChanged(text: string): void {
    setPassword(text);
  }

  function createHander(): void {
    router.replace("./authSignUp");
  }

  function forgotPassHandler(): void {
    router.navigate("./resetPassword");
  }

  return (
    <View style={[styles.container, { paddingTop: safeArea.top }]}>
      <View style={styles.topConatainer}>
        <Image
          src={require("../../assets/memvocadoicon.png")}
          style={styles.icon}
        />
        <Text style={styles.title}>Memvocado</Text>
      </View>
      <View style={styles.formContainer}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <TextInput
              onChangeText={emailChanged}
              value={email}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              onChangeText={passwordChanged}
              value={password}
              style={styles.input}
              secureTextEntry
            />
          </View>
        </View>
        {message && <Text style={styles.errorMessage}>{message}</Text>}
        <Pressable onPress={logInHandler}>
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>Log in</Text>
          </View>
        </Pressable>
        <Pressable onPress={forgotPassHandler}>
          <Text style={styles.info}>
            Did you forgot your password? Click here
          </Text>
        </Pressable>
        <Pressable onPress={createHander}>
          <Text style={styles.info}>Don't have an account? Create new one</Text>
        </Pressable>
      </View>
      <Spinner visible={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.primary_100,
  },
  topConatainer: {
    alignItems: "center",
  },
  icon: {
    marginTop: 100,
    height: 150,
    width: 150,
  },
  title: {
    fontSize: 50,
    color: Colors.primary_500,
    fontFamily: Fonts.primary,
    fontWeight: "900",
  },
  label: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginBottom: 5,
    fontWeight: "700",
  },
  labelContainer: {
    marginVertical: 10,
  },
  formContainer: {
    width: "70%",
    marginTop: 30,
  },
  inputContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.primary_700,
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
    fontWeight: "900",
  },
  info: {
    fontSize: 15,
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
    fontWeight: "900",
    marginVertical: 5,
    textAlign: "center",
  },
  errorMessage: {
    textAlign: "center",
    color: "red",
    fontFamily: Fonts.secondary,
    fontWeight: "600",
  },
});

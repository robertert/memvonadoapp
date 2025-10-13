import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AntDesign } from "@expo/vector-icons";
import { Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

interface ProgressParams {
  easy?: string;
  good?: string;
  hard?: string;
  all?: string;
  todo?: string;
  empty?: string;
}

export default function victoryScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const progress = params as ProgressParams;

  useEffect(() => {}, []);

  function restartHandler(): void {
    router.replace({
      pathname: "../stack/learnScreen",
      params: { id: "jLoSnjEekqUFYzKCuEEP" },
    });
  }

  function goBackHandler(): void {
    router.back();
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_100, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        {!progress.empty ? (
          <>
            <Text style={styles.title}>Congratulations!!!</Text>
            <Text style={styles.subtitle}>
              You've finished learning for today!
            </Text>
            <View style={styles.insideRow}>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.blue }]}>
                  {progress.easy}
                </Text>
                <Text style={styles.desc}>Easy</Text>
              </View>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.green }]}>
                  {progress.good}
                </Text>
                <Text style={styles.desc}>Good</Text>
              </View>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.yellow }]}>
                  {progress.hard}
                </Text>
                <Text style={styles.desc}>Hard</Text>
              </View>
            </View>
            <View style={styles.insideRow}>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.white }]}>
                  {progress.all}
                </Text>
                <Text style={styles.desc}>All</Text>
              </View>
              <View style={styles.insideSection}>
                <Text style={[styles.num, { color: Colors.white }]}>
                  {progress.todo}
                </Text>
                <Text style={styles.desc}>To do</Text>
              </View>
            </View>
            <Pressable onPress={restartHandler}>
              <View style={styles.restartButton}>
                <Text style={styles.restartText}>Restart</Text>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>You don't have anything to learn.</Text>
            <Pressable onPress={goBackHandler}>
              <View style={styles.restartButton}>
                <Text style={styles.restartText}>Go back</Text>
              </View>
            </Pressable>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    alignItems: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  restartButton: {
    marginTop: 50,
    padding: 20,
    backgroundColor: Colors.accent_500,
    borderRadius: 20,
  },
  restartText: {
    color: Colors.white,
    fontFamily: Fonts.primary,
  },
  insideRow: {
    width: "100%",
    flexDirection: "row",
    marginVertical: 10,
    justifyContent: "space-around",
  },
  insideSection: {
    alignItems: "center",
  },
  desc: {
    fontFamily: Fonts.primary,
    fontSize: 20,
    color: Colors.primary_700,
  },
  num: {
    fontFamily: Fonts.primary,
    fontSize: 30,
  },
  title: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 35,
    marginHorizontal: 20,
    marginTop: 30,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 27,
    marginHorizontal: 28,
    marginBottom: 20,
  },
});

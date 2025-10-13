import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, generageRandomUid } from "../../constants/colors";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";

export default function createScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();



  return (
    <GestureHandlerRootView>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          
        </View>
      </LinearGradient>
    </GestureHandlerRootView>
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
  saveButton: {
    alignSelf: "center",
    width: 150,
    marginTop: 50,
    padding: 20,
    backgroundColor: Colors.accent_500,
    borderRadius: 20,
  },
  saveText: {
    textAlign: "center",
    fontSize: 18,
    color: Colors.white,
    fontFamily: Fonts.primary,
  },
});

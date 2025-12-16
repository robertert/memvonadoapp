import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Header(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: safeArea.top }]}>
      <Image
        source={require("../assets/memvocadoicon.png")}
        style={styles.icon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 10,
    width: "100%",
    backgroundColor: Colors.primary_500,
    flexDirection: "column",
  },
  icon: {
    height: 80,
    width: 80,
  },
});

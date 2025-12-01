import React from 'react';
import { StyleSheet, View } from "react-native";
import { Colors } from "../constants/colors";

function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

export default Divider;

const styles = StyleSheet.create({
  divider: {
    backgroundColor: Colors.white,
    width: "100%",
    height: 1,
  },
});

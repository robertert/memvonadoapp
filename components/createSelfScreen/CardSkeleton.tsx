import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export default function CardSkeleton(): React.JSX.Element {
  return (
    <View style={styles.cardContainer}>
      {/* Front Section */}
      <View style={styles.cardSection}>
        <View style={styles.cardLabelContainer}>
          <View style={styles.skeletonLabel} />
          <View style={styles.cardInputContainer}>
            <View style={styles.skeletonInput} />
          </View>
        </View>
      </View>

      {/* Back Section */}
      <View style={styles.cardSection}>
        <View style={styles.cardLabelContainer}>
          <View style={styles.skeletonLabel} />
          <View style={styles.cardInputContainer}>
            <View style={styles.skeletonInput} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    padding: 24,
    borderRadius: 20,
    borderColor: Colors.primary_700,
    borderWidth: 2,
    marginBottom: 16,
    backgroundColor: Colors.primary_100,
  },
  cardSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cardLabelContainer: {
    flex: 1,
  },
  cardInputContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_500,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    marginLeft: 8,
    minHeight: 42,
  },
  skeletonLabel: {
    width: 60,
    height: 14,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 7,
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 12,
  },
  skeletonInput: {
    width: "100%",
    height: 20,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 10,
  },
});

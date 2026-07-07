import React, { useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, Animated } from "react-native";
import { Colors } from "../../constants/colors";

export default function ProfileSkeleton(): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity: pulseAnim }}>
      {/* Section 1: Top — avatar + followers */}
      <View style={styles.topContainer}>
        <View style={styles.avatarPlaceholder} />
        <View style={styles.infoContainer}>
          <View style={styles.userInfo}>
            <View style={styles.infoItem}>
              <View style={styles.infoNumPlaceholder} />
              <View style={styles.infoTextPlaceholder} />
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoNumPlaceholder} />
              <View style={styles.infoTextPlaceholder} />
            </View>
          </View>
        </View>
      </View>

      {/* Section 2: Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.sectionTitlePlaceholder} />
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <View style={styles.statIconPlaceholder} />
            <View style={styles.statValuePlaceholder} />
          </View>
          <View style={styles.statsItem}>
            <View style={styles.statIconPlaceholder} />
            <View style={styles.statValuePlaceholder} />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <View style={styles.statIconPlaceholder} />
            <View style={styles.statValuePlaceholder} />
          </View>
          <View style={styles.statsItem}>
            <View style={styles.statIconPlaceholder} />
            <View style={styles.statValuePlaceholder} />
          </View>
        </View>
      </View>

      {/* Section 3: Heatmap */}
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionTitlePlaceholder, { width: 140 }]} />
        <View style={styles.heatmapPlaceholder} />
      </View>

      {/* Section 4: Avocado collection */}
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionTitlePlaceholder, { width: 130 }]} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          scrollEnabled={false}
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.avocadoItemPlaceholder} />
          ))}
        </ScrollView>
        <View style={styles.collectionButtonPlaceholder} />
      </View>

      {/* Section 5: Decks */}
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionTitlePlaceholder, { width: 120 }]} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          scrollEnabled={false}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.deckItemPlaceholder} />
          ))}
        </ScrollView>
        <View style={styles.libraryButtonPlaceholder} />
      </View>
    </Animated.View>
  );
}

const S = Colors.primary_700_30;

const styles = StyleSheet.create({
  topContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: S,
    marginRight: 10,
  },
  infoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoItem: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  infoNumPlaceholder: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: S,
    marginBottom: 6,
  },
  infoTextPlaceholder: {
    width: 60,
    height: 12,
    borderRadius: 6,
    backgroundColor: S,
  },
  statsContainer: {
    width: "100%",
    marginTop: 20,
  },
  sectionTitlePlaceholder: {
    width: 160,
    height: 24,
    borderRadius: 12,
    backgroundColor: S,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 5,
    width: "50%",
  },
  statIconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: S,
    marginRight: 10,
  },
  statValuePlaceholder: {
    width: 60,
    height: 20,
    borderRadius: 10,
    backgroundColor: S,
  },
  sectionContainer: {
    marginTop: 30,
  },
  heatmapPlaceholder: {
    height: 185,
    borderRadius: 16,
    backgroundColor: S,
    marginTop: 12,
  },
  horizontalScroll: {
    marginTop: 10,
  },
  avocadoItemPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: S,
    marginHorizontal: 8,
    marginVertical: 5,
  },
  collectionButtonPlaceholder: {
    height: 36,
    width: 140,
    borderRadius: 12,
    backgroundColor: S,
    marginTop: 12,
  },
  deckItemPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: S,
    marginHorizontal: 10,
    marginVertical: 5,
  },
  libraryButtonPlaceholder: {
    height: 44,
    borderRadius: 12,
    backgroundColor: S,
    marginTop: 15,
    marginBottom: 20,
  },
});

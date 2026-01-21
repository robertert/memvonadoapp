import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
} from "react-native";
import { router } from "expo-router";
import { Colors, Fonts } from "@/constants/colors";
import {
  AVOCADO_PHASE_NAMES,
  AVOCADO_TOTAL_DAYS,
  AVOCADO_RARITY_COLORS,
} from "@/constants/avocado";
import AvocadoImage from "./AvocadoImage";
import type { GetAvocadoStatusResponse } from "@/types/schemas/avocado";

interface AvocadoGrowthWidgetProps {
  status: GetAvocadoStatusResponse | null;
  onHarvest?: () => void;
  isLoading?: boolean;
}

export default function AvocadoGrowthWidget({
  status,
  onHarvest,
  isLoading = false,
}: AvocadoGrowthWidgetProps): React.JSX.Element {
  const bounceAnim = useRef(new RNAnimated.Value(1)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  // Pulse animation for harvest button
  useEffect(() => {
    if (status?.canHarvest) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status?.canHarvest]);

  // Bounce animation for phase change
  const triggerBounce = () => {
    RNAnimated.sequence([
      RNAnimated.timing(bounceAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      RNAnimated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleWidgetPress = () => {
    router.push("/stack/avocadoCollectionScreen");
  };

  const handleHarvestPress = () => {
    if (onHarvest) {
      onHarvest();
    }
  };

  if (isLoading || !status) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>...</Text>
        </View>
      </View>
    );
  }

  const {
    currentPhase,
    consecutiveDays,
    canHarvest,
    isWilted,
    goalMetToday,
  } = status;

  const phaseName = AVOCADO_PHASE_NAMES[currentPhase] || "Pestka";
  const progressPercentage = Math.min((consecutiveDays / AVOCADO_TOTAL_DAYS) * 100, 100);

  // Determine status text
  let statusText: string;
  if (canHarvest) {
    statusText = "Gotowe do zbioru!";
  } else if (!goalMetToday && !isWilted) {
    statusText = "Podlej wiedza!";
  } else if (isWilted) {
    statusText = "Zwiędłe...";
  } else {
    statusText = `Rosnie! (Dzien ${consecutiveDays}/${AVOCADO_TOTAL_DAYS})`;
  }

  return (
    <Pressable onPress={handleWidgetPress} style={styles.container}>
      <View style={styles.widgetContent}>
        {/* Avocado Image Section */}
        <RNAnimated.View
          style={[styles.imageSection, { transform: [{ scale: bounceAnim }] }]}
        >
          <AvocadoImage
            phase={currentPhase as 1 | 2 | 3 | 4 | 5}
            size="large"
            wilted={isWilted || !goalMetToday}
            showGlow={canHarvest}
          />
        </RNAnimated.View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Phase name */}
          <Text style={styles.phaseName}>
            Faza {currentPhase}: {phaseName}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` },
                  canHarvest && styles.progressBarComplete,
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {consecutiveDays}/{AVOCADO_TOTAL_DAYS}
            </Text>
          </View>

          {/* Status text */}
          <Text
            style={[
              styles.statusText,
              isWilted && styles.statusTextWilted,
              canHarvest && styles.statusTextHarvest,
            ]}
          >
            {statusText}
          </Text>

          {/* Harvest button */}
          {canHarvest && (
            <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                onPress={handleHarvestPress}
                style={styles.harvestButton}
              >
                <Text style={styles.harvestButtonText}>ZBIERZ</Text>
              </Pressable>
            </RNAnimated.View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 20,
  },
  widgetContent: {
    width: "100%",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  imageSection: {
    marginRight: 16,
  },
  infoSection: {
    flex: 1,
  },
  phaseName: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    fontWeight: "800",
    color: Colors.primary_700,
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary_500,
    borderRadius: 6,
  },
  progressBarComplete: {
    backgroundColor: Colors.primary_500,
  },
  progressText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    fontWeight: "700",
    color: Colors.primary_700,
    minWidth: 35,
  },
  statusText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    fontWeight: "600",
    color: Colors.primary_700,
    marginBottom: 8,
  },
  statusTextWilted: {
    color: Colors.red,
  },
  statusTextHarvest: {
    color: Colors.primary_700,
    fontWeight: "800",
  },
  harvestButton: {
    backgroundColor: Colors.accent_500,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: Colors.accent_500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  harvestButtonText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    color: Colors.primary_700,
  },
  loadingPlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
  },
});

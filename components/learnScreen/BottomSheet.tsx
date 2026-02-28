import React from "react";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { ProgressState, TooltipState } from "../../app/stack/learnScreen.types";
import { Colors } from "../../constants/colors";
import type { DailyStats } from "@/types";

interface BottomSheetProps {
  progress: ProgressState;
  tabBarValue: number;
  tooltip: TooltipState;
  swipeUp: any;
  tabBarStyle: any;
  insideStyles: any;
  outsideStyles: any;
  bottomStyle: any;
  insideDisplayStyles: any;
  safeArea: any;
  dailyStats: DailyStats | null;
}

/**
 * BottomSheet component that displays detailed progress statistics with expandable interface
 */
export default function BottomSheet({
  progress,
  tabBarValue,
  tooltip,
  swipeUp,
  tabBarStyle,
  insideStyles,
  outsideStyles,
  bottomStyle,
  insideDisplayStyles,
  safeArea,
  dailyStats,
}: BottomSheetProps) {
  const todo =
    (dailyStats?.newCardsRemaining ?? 0) +
    (dailyStats?.dueCardsRemaining ?? 0);
  const inProgress =
    (dailyStats?.inProgressDueCards ?? 0) +
    (dailyStats?.inProgressNewCards ?? 0);
  const done =
    (dailyStats?.completedNewToday ?? 0) +
    (dailyStats?.completedDueToday ?? 0);
  const total = todo + inProgress + done;

  return (
    <Animated.View
      style={[
        { flex: 1, justifyContent: "flex-end", width: "100%" },
        bottomStyle,
      ]}
    >
      <GestureDetector gesture={swipeUp}>
        <Animated.View
          style={[
            tabBarStyle,
            {
              zIndex: 10,
              width: "100%",
              backgroundColor: Colors.primary_500,
              paddingBottom: safeArea.bottom,
            },
          ]}
        >
          {/* Expanded view — first in DOM so content starts at top of panel */}
          <Animated.View style={insideStyles}>
            <Animated.View style={[{ flex: 1 }, insideDisplayStyles]}>
              {/* Drag handle */}
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: Colors.primary_100,
                    opacity: 0.4,
                  }}
                />
              </View>

              {/* POSTĘP Header + X / Y kart */}
              <View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingHorizontal: 20,
                marginBottom: 16,
              }}>
                <Text style={{ color: Colors.primary_100, opacity: 0.6, fontSize: 12, fontWeight: "600", letterSpacing: 1 }}>
                  POSTĘP
                </Text>
                <Text style={{ color: Colors.primary_100, fontSize: 14 }}>
                  <Text style={{ fontWeight: "bold" }}>{done}</Text>
                  <Text style={{ opacity: 0.6 }}> / {total} kart</Text>
                </Text>
              </View>

              {/* Stats row: Do zrobienia / W trakcie / Zrobione */}
              <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 20, marginBottom: 20 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.primary_100, fontSize: 22, fontWeight: "bold" }}>{todo}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 11, opacity: 0.6, marginTop: 2 }}>Do zrobienia</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.primary_100, fontSize: 22, fontWeight: "bold" }}>{inProgress}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 11, opacity: 0.6, marginTop: 2 }}>W trakcie</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.primary_100, fontSize: 22, fontWeight: "bold" }}>{done}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 11, opacity: 0.6, marginTop: 2 }}>Zrobione</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <View style={{ height: 8, backgroundColor: Colors.primary_100_30, borderRadius: 4, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${tabBarValue}%`, backgroundColor: Colors.primary_100, borderRadius: 4 }} />
                </View>
              </View>

              {/* Separator */}
              <View style={{ width: "88%", height: 1, backgroundColor: Colors.primary_100, opacity: 0.12, alignSelf: "center", marginBottom: 20 }} />

              {/* SESJA section */}
              <Text style={{ color: Colors.primary_100, opacity: 0.6, fontSize: 12, fontWeight: "600", letterSpacing: 1, paddingHorizontal: 20, marginBottom: 16 }}>
                SESJA
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 20 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.blue, fontSize: 26 }}>{progress.easy}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 13, opacity: 0.8 }}>Easy</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.green, fontSize: 26 }}>{progress.good}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 13, opacity: 0.8 }}>Good</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.yellow, fontSize: 26 }}>{progress.hard}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 13, opacity: 0.8 }}>Hard</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.red, fontSize: 26 }}>{progress.wrong}</Text>
                  <Text style={{ color: Colors.primary_100, fontSize: 13, opacity: 0.8 }}>Wrong</Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Collapsed view — second in DOM, sits below expanded (invisible when open) */}
          <Animated.View style={outsideStyles}>
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: Colors.primary_100,
                  opacity: 0.25,
                }}
              />
            </View>
            <View style={{ paddingVertical: 10, flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.primary_100, fontSize: 25, fontWeight: "bold" }}>{todo}</Text>
                <Text style={{ color: Colors.primary_100, fontSize: 11, opacity: 0.7, marginTop: 2 }}>Do zrobienia</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.primary_100, fontSize: 25, fontWeight: "bold" }}>{inProgress}</Text>
                <Text style={{ color: Colors.primary_100, fontSize: 11, opacity: 0.7, marginTop: 2 }}>W trakcie</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.primary_100, fontSize: 25, fontWeight: "bold" }}>{done}</Text>
                <Text style={{ color: Colors.primary_100, fontSize: 11, opacity: 0.7, marginTop: 2 }}>Zrobione</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

BottomSheet.displayName = "BottomSheet";

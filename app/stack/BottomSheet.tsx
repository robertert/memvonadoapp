import React from "react";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { ProgressState, TooltipState } from "./learnScreen.types";
import { Colors } from "../../constants/colors";

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
}

/**
 * BottomSheet component that displays detailed progress statistics with expandable interface
 */
export const BottomSheet = React.memo<BottomSheetProps>(({
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
}) => {
  return (
    <Animated.View style={[{ flex: 1, justifyContent: "flex-end", width: "100%" }, bottomStyle]}>
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
            <Animated.View style={outsideStyles}>
              <View style={{ paddingTop: 10, flexDirection: "row", justifyContent: "space-around" }}>
                <Text style={{ color: Colors.blue, fontSize: 25,fontWeight: "bold" }}>{progress.easy}</Text>
                <Text style={{ color: Colors.green, fontSize: 25,fontWeight: "bold" }}>{progress.good}</Text>
                <Text style={{ color: Colors.yellow, fontSize: 25,fontWeight: "bold" }}>{progress.hard}</Text>
                <Text style={{ color: Colors.red, fontSize: 25,fontWeight: "bold" }}>{progress.wrong}</Text>
                <Text style={{ color: Colors.primary_100, fontSize: 25,fontWeight: "bold" }}>{progress.todo}</Text>
              </View>
            </Animated.View>

            <Animated.View style={[insideStyles]}>
              <Animated.View style={[{ flex: 1 }, insideDisplayStyles]}>
                {/* Statistics rows */}
                <View style={{ flexDirection: "row", marginVertical: 10, justifyContent: "space-around" }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#74b9ff", fontSize: 30 }}>{progress.easy}</Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>Easy</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#51cf66", fontSize: 30 }}>{progress.good}</Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>Good</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ffd43b", fontSize: 30 }}>{progress.hard}</Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>Hard</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ff6b6b", fontSize: 30 }}>{progress.wrong}</Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>Wrong</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", marginVertical: 10, justifyContent: "space-around" }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ffffff", fontSize: 30 }}>{progress.all}</Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>All</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ffffff", fontSize: 30 }}>{progress.todo}</Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>To do</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ffffff", fontSize: 30 }}>
                      {Math.ceil(((progress.all - progress.todo) * 100) / progress.all)}%
                    </Text>
                    <Text style={{ color: "#ffffff", fontSize: 20 }}>done</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ paddingHorizontal: 20, marginVertical: 10 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "#cccccc",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${tabBarValue}%`,
                        backgroundColor: "#ffffff",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>

                {/* Divider */}
                <View
                  style={{
                    width: "90%",
                    height: 1,
                    marginVertical: 10,
                    backgroundColor: "#ffffff",
                    alignSelf: "center",
                  }}
                />

                {/* Chart section */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ marginTop: 20, marginBottom: 40, fontSize: 30, color: "#ffffff" }}>
                    Current state chart
                  </Text>

                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, marginRight: 10, backgroundColor: "#74b9ff" }} />
                      <Text style={{ fontSize: 16, color: "#339af0" }}>Easy: {progress.easy}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, marginRight: 10, backgroundColor: "#51cf66" }} />
                      <Text style={{ fontSize: 16, color: "#40c057" }}>Good: {progress.good}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, marginRight: 10, backgroundColor: "#ffd43b" }} />
                      <Text style={{ fontSize: 16, color: "#fab005" }}>Hard: {progress.hard}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, marginRight: 10, backgroundColor: "#ff6b6b" }} />
                      <Text style={{ fontSize: 16, color: "#fa5252" }}>Wrong: {progress.wrong}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, marginRight: 10, backgroundColor: "#ffffff" }} />
                      <Text style={{ fontSize: 16, color: "#495057" }}>Rest: {progress.todo}</Text>
                    </View>
                  </View>

                  {/* Tooltip */}
                  {tooltip.shown && (
                    <Animated.View
                      style={{
                        backgroundColor: tooltip.color,
                        position: "absolute",
                        padding: 20,
                        borderRadius: 15,
                        alignSelf: "center",
                        top: 120,
                        borderWidth: 2,
                        borderColor: tooltip.textColor,
                      }}
                    >
                      <Text style={{ color: tooltip.textColor }}>
                        {tooltip.text}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

BottomSheet.displayName = 'BottomSheet';

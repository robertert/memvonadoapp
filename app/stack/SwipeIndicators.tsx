// React and React Native imports
import React from "react";
import { Dimensions, Text, View } from "react-native";
import { EdgeInsets } from "react-native-safe-area-context";

// Third-party library imports
import Animated from "react-native-reanimated";

// Local imports
import { AnimatedStyle } from "./learnScreen.types";
import { ANIMATION_CONSTANTS } from "./learnScreen.constants";
import { Colors } from "../../constants/colors";

const INDICATOR_FONT_SIZE = 26;

interface SwipeIndicatorsProps {
  lInfoStyle: AnimatedStyle;
  rInfoStyle: AnimatedStyle;
  tInfoStyle: AnimatedStyle;
  bInfoStyle: AnimatedStyle;
  safeArea: EdgeInsets;
}

export function SwipeIndicators({
  lInfoStyle,
  rInfoStyle,
  tInfoStyle,
  bInfoStyle,
  safeArea,
}: SwipeIndicatorsProps) {
  return (
    <>
      {/* Left indicator - Wrong */}
      <Animated.View
        style={[
          {
            position: "absolute",
            padding: ANIMATION_CONSTANTS.TOOLTIP_PADDING,
            backgroundColor: Colors.red,
            borderRadius: 10,
            left: -150, // Zaczyna spoza ekranu po lewej stronie
            top: 0,
            height: Dimensions.get("window").height, // Pełna wysokość ekranu
            width: 120, // Zwiększona szerokość dla rotowanego tekstu
            zIndex: 10,
            overflow: "visible",
            alignItems: "flex-start",
            justifyContent: "center",
          },
          lInfoStyle,
        ]}
        accessibilityLabel="Wrong answer indicator - swipe left"
        accessibilityRole="text"
      >
        <View style={{ 
          width: 200, // Szerokość kontenera tekstu
          height: 30, // Wysokość kontenera tekstu
          position: "absolute",
          left: -10,
          top: "50%",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: "90deg" }] // Obracam cały kontener zamiast tylko tekstu
        }}>
          <Text
            numberOfLines={1}
            style={{ 
              fontSize: INDICATOR_FONT_SIZE, 
              color: Colors.white, 
              fontWeight: "bold",
              textAlign: "center",
              includeFontPadding: false, // Usuwa dodatkowy padding czcionki
            }}
          >
            Wrong
          </Text>
        </View>
      </Animated.View>

      {/* Right indicator - Good */}
      <Animated.View
        style={[
          {
            position: "absolute",
            padding: ANIMATION_CONSTANTS.TOOLTIP_PADDING,
            backgroundColor: Colors.green,
            borderRadius: 10,
            top: 0,
            right: -150, // Zaczyna spoza ekranu po prawej stronie
            height: Dimensions.get("window").height, // Pełna wysokość ekranu
            width: 120, // Zwiększona szerokość dla rotowanego tekstu
            zIndex: 10,
            overflow: "visible",
            alignItems: "flex-start",
            justifyContent: "center",
          },
          rInfoStyle,
        ]}
        accessibilityLabel="Good answer indicator - swipe right"
        accessibilityRole="text"
      >
        <View style={{ 
          width: 200, // Szerokość kontenera tekstu
          height: 30, // Wysokość kontenera tekstu
          position: "absolute",
          right: -10,
          top: "50%",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: "-90deg" }] // Obracam cały kontener zamiast tylko tekstu
        }}>
          <Text
            numberOfLines={1}
            style={{ 
              fontSize: INDICATOR_FONT_SIZE, 
              color: Colors.white, 
              fontWeight: "bold",
              textAlign: "center",
              includeFontPadding: false, // Usuwa dodatkowy padding czcionki
            }}
          >
            Good
          </Text>
        </View>
      </Animated.View>

      {/* Top indicator - Easy */}
      <Animated.View
        style={[
          {
            position: "absolute",
            padding: ANIMATION_CONSTANTS.TOOLTIP_PADDING,
            backgroundColor: Colors.blue,
            borderRadius: 10,
            top: -100 - safeArea.top, // Zaczyna spoza ekranu u góry z uwzględnieniem safe area
            left: 0,
            width: Dimensions.get("window").width, // Pełna szerokość ekranu
            height: 80 + safeArea.top, // Powiększone o safe area
            zIndex: 10,
            overflow: "visible",
            alignItems: "center",
            justifyContent: "flex-end",
          },
          tInfoStyle,
        ]}
        accessibilityLabel="Easy answer indicator - swipe up"
        accessibilityRole="text"
      >
        <Text
          style={{ 
            fontSize: INDICATOR_FONT_SIZE, 
            color: Colors.white, 
            fontWeight: "bold",
            textAlign: "center",
            includeFontPadding: false,
          }}
        >
          Easy
        </Text>
      </Animated.View>

      {/* Bottom indicator - Hard */}
      <Animated.View
        style={[
          {
            position: "absolute",
            padding: ANIMATION_CONSTANTS.TOOLTIP_PADDING,
            backgroundColor: Colors.yellow,
            borderRadius: 10,
            bottom: -100 - safeArea.bottom, // Zaczyna spoza ekranu u dołu z uwzględnieniem safe area
            left: 0,
            width: Dimensions.get("window").width, // Pełna szerokość ekranu
            height: 80 + safeArea.bottom, // Powiększone o safe area
            zIndex: 10,
            overflow: "visible",
            alignItems: "center",
            justifyContent: "flex-start",
          },
          bInfoStyle,
        ]}
        accessibilityLabel="Hard answer indicator - swipe down"
        accessibilityRole="text"
      >
        <Text
          style={{ 
            fontSize: INDICATOR_FONT_SIZE, 
            color: Colors.white, 
            fontWeight: "bold",
            textAlign: "center",
            includeFontPadding: false,
          }}
        >
          Hard
        </Text>
      </Animated.View>
    </>
  );
}

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { G, Circle, Text } from "react-native-svg";
import { Colors, Fonts } from "../constants/colors";

interface PieChartProps {
  percentage: number;
  radius: number;
}

const PieChart: React.FC<PieChartProps> = ({ percentage, radius }) => {
  const fillPercentage = percentage; // Default to 0 if not provided
  const circleX = 75;
  const circleY = 75;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = ((100 - fillPercentage) / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg height="150" width="150">
        <G origin={`${circleX}, ${circleY}`}>
          {/* Background circle */}
          <Circle
            cx={circleX}
            cy={circleY}
            r={radius - 2}
            stroke={Colors.primary_700}
            fill="none"
            strokeWidth="25"
          />
          {/* Filled portion */}
          <Circle
            cx={circleX}
            cy={circleY}
            r={radius - 5} // Slightly smaller radius for the filled portion
            stroke={Colors.primary_500}
            fill="none"
            strokeWidth="25"
          />
          <Circle
            cx={circleX}
            cy={circleY}
            r={radius - 5}
            stroke={Colors.primary_100}
            strokeWidth="25"
            fill="none"
            strokeDasharray={`${circumference - 16.5}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            rotation="-90"
            origin={`${circleX}, ${circleY}`}
          />
          <Circle
            cx={circleX}
            cy={circleY}
            r={radius - 18}
            stroke={Colors.accent_500}
            fill="none"
            strokeWidth="4"
          />
          {/* Center text */}
          <Text
            x={circleX}
            y={circleY}
            textAnchor="middle"
            fontSize="12"
            fill={Colors.primary_700}
            fontFamily={Fonts.primary}
            fontWeight="900"
            dy=".3em"
            dx="-8"
          >
            {fillPercentage}%
          </Text>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PieChart;

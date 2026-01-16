import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Text } from "react-native-svg";
import { Colors, Fonts } from "../constants/colors";

interface PieChartProps {
  percentage: number;
  radius: number;
}

const PieChart: React.FC<PieChartProps> = ({ percentage, radius }) => {
  // Zabezpieczenie wartości (0-100)
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const strokeWidth = 25;
  const outerStrokeWidth = 25; // Szerokość zewnętrznego pierścienia
  const innerStrokeWidth = 4; // Szerokość wewnętrznego akcentu

  // Obliczamy środek dynamicznie na podstawie promienia i grubości linii, aby nic nie ucięło
  const size = (radius + strokeWidth) * 2;
  const center = size / 2;

  // Promień właściwego paska postępu (nieco mniejszy niż outer rim)
  const progressRadius = radius - 5;
  const circumference = 2 * Math.PI * progressRadius;

  // Logika postępu:
  // strokeDasharray to długość całego obwodu (kreska na całe koło)
  // strokeDashoffset przesuwa tę kreskę, ukrywając jej część
  const strokeDashoffset =
    circumference - (clampedPercentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 1. Zewnętrzny pierścień (Background circle) */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 2}
          stroke={Colors.primary_700}
          fill="none"
          strokeWidth={outerStrokeWidth}
        />

        {/* 2. Tło paska postępu (puste miejsce pod wykresem) */}
        <Circle
          cx={center}
          cy={center}
          r={progressRadius}
          stroke={Colors.primary_100} // Jasny kolor jako tło paska
          fill="none"
          strokeWidth={strokeWidth}
        />

        {/* 3. Wypełniony pasek postępu (Active) */}
        <Circle
          cx={center}
          cy={center}
          r={progressRadius}
          stroke={Colors.primary_500} // Główny kolor postępu
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt" // lub "round" jeśli chcesz zaokrąglone końce
          rotation="-90"
          origin={`${center}, ${center}`}
        />

        {/* 4. Cienki wewnętrzny pierścień (Inner border) */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 18}
          stroke={Colors.accent_500}
          fill="none"
          strokeWidth={innerStrokeWidth}
        />

        {/* 5. Tekst pośrodku */}
        <Text
          x={center}
          y={center}
          textAnchor="middle" // Centrowanie w poziomie
          alignmentBaseline="middle" // Centrowanie w pionie (działa lepiej niż dy)
          fontSize="10" // Nieco większy font dla czytelności
          fill={Colors.primary_700}
          fontFamily={Fonts.primary}
          fontWeight="900"
          dx={-5}
          // Usunięcie ręcznych przesunięć (dx, dy) na rzecz poprawnego alignmentu
        >
          {clampedPercentage} %
        </Text>
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

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts } from "../constants/colors";

interface DayData {
  date: string; // YYYY-MM-DD
  count: number; // liczba sesji / minut
}

interface Props {
  weeks: number; // ile tygodni wstecz
  data: DayData[]; // zmapowane wyniki {date, count}
  levels?: number[]; // progi intensywności np. [0,1,3,5]
  title?: string;
}

export default function ContributionHeatmap({
  weeks,
  data,
  levels = [0, 1, 3, 5],
  title = "Activity",
}: Props): React.JSX.Element {
  const today = new Date();

  // Zbuduj siatkę dat (tygodnie x 7 dni)
  const grid: { date: string; count: number }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const column: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(today);
      const offset = w * 7 + (6 - d); // kolumny od najstarszej, dni Pon-Ndz (góra-dół)
      dt.setDate(today.getDate() - offset);
      const iso = dt.toISOString().slice(0, 10);
      const found = data.find((x) => x.date === iso);
      column.push({ date: iso, count: found?.count || 0 });
    }
    grid.push(column);
  }

  const colorFor = (count: number): string => {
    if (count <= levels[0]) return Colors.primary_100; // brak
    if (count <= levels[1]) return Colors.accent_500_30;
    if (count <= levels[2]) return Colors.accent_300;
    if (count <= levels[3]) return Colors.accent_500;
    return Colors.primary_500;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.gridRow}>
        {grid.map((col, cIdx) => (
          <View key={cIdx} style={styles.column}>
            {col.map((cell, rIdx) => (
              <View
                key={`${cell.date}-${rIdx}`}
                style={[styles.cell, { backgroundColor: colorFor(cell.count) }]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>Mniej</Text>
        <View style={[styles.legendCell, { backgroundColor: colorFor(0) }]} />
        <View
          style={[styles.legendCell, { backgroundColor: colorFor(levels[1]) }]}
        />
        <View
          style={[styles.legendCell, { backgroundColor: colorFor(levels[2]) }]}
        />
        <View
          style={[styles.legendCell, { backgroundColor: colorFor(levels[3]) }]}
        />
        <View
          style={[
            styles.legendCell,
            { backgroundColor: colorFor(levels[3] + 1) },
          ]}
        />
        <Text style={styles.legendLabel}>Więcej</Text>
      </View>
    </View>
  );
}

const CELL = 14;
const GAP = 3;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    padding: 12,
    marginTop: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: "row",
    alignSelf: "center",
  },
  column: {
    flexDirection: "column",
    marginRight: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 4,
    marginBottom: GAP,
  },
  legendRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  legendCell: {
    width: CELL,
    height: CELL,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginHorizontal: 8,
  },
});

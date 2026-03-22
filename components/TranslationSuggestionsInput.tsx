import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Colors, Fonts } from "@/constants/colors";
import { useTranslationSuggestions } from "@/hooks/useTranslationSuggestions";
import type { SupportedLanguage } from "@/types/schemas/api/translation";

interface Props {
  visible: boolean;
  query: string;
  filterValue?: string;
  fromLanguage: SupportedLanguage;
  toLanguage: SupportedLanguage;
  onSelect: (suggestion: string) => void;
}

export default function TranslationSuggestionsInput({
  visible,
  query,
  filterValue,
  fromLanguage,
  toLanguage,
  onSelect,
}: Props): React.JSX.Element {
  const { suggestions } = useTranslationSuggestions(query, fromLanguage, toLanguage, filterValue);

  const animProgress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    animProgress.value = withTiming(visible ? 1 : 0, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    maxHeight: animProgress.value * 200,
    opacity: animProgress.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {suggestions.map((s, i) => (
        <Pressable key={i} style={styles.bar} onPressIn={() => onSelect(s)}>
          <Text style={styles.barText} numberOfLines={1}>{s}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    gap: 4,
    overflow: "hidden",
  },
  bar: {
    backgroundColor: Colors.accent_500_30,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  barText: {
    fontFamily: Fonts.primary,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary_700,
  },
});

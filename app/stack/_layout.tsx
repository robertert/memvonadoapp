import React from "react";
import { Stack } from "expo-router";

export default function MainStack(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="learnScreen" />
      <Stack.Screen name="victoryScreen" />
      <Stack.Screen name="createSelfScreen" />
      <Stack.Screen name="fileImportScreen" />
      <Stack.Screen name="deckDetails" />
    </Stack>
  );
}

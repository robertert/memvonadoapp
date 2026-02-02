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
      <Stack.Screen name="ankiImportScreen" />
      <Stack.Screen name="scanDocumentScreen" />
      <Stack.Screen name="deckDetails" />
      <Stack.Screen name="deckSettings" />
      <Stack.Screen name="myLibraryScreen" />
      <Stack.Screen name="settingsScreen" />
      <Stack.Screen name="editCard" />
      <Stack.Screen name="avocadoCollectionScreen" />
      <Stack.Screen name="ocrCameraScreen" />
      <Stack.Screen name="processFileScreen" />
      <Stack.Screen name="userProfileScreen" />
    </Stack>
  );
}

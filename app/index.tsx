import React from 'react';
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

export default function App(): React.JSX.Element {
  return <Redirect href={"./authSignUp"} />;
}

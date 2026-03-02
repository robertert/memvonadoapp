import { Redirect, Slot, useSegments } from "expo-router";
import { useAuth } from "@/store/auth";

export default function AuthLayout() {
  const { status } = useAuth();
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1];

  if (status === "loading") return null;
  if (status === "ready") return <Redirect href="/tabs/dashboardScreen" />;

  // Redirect to onboarding only if not already there (prevents infinite loop)
  if (status === "needs_onboarding" && currentScreen !== "onboarding") {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // status === 'loading', 'unauthenticated', or already on onboarding
  return <Slot />;
}

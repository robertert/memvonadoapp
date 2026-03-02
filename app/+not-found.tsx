import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "@/store/auth";

export default function NotFound() {
  const { status } = useAuth();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || status !== "ready") return;
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [status, isFocused]);

  if (status === "loading") return null;
  if (status !== "ready") return <Redirect href="/(auth)/login" />;
  return null;
}

import React, { useState, useCallback, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Layout,
} from "react-native-reanimated";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cloudFunctions } from "../../services/cloudFunctions";
import { UserContext } from "../../store/user-context";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
  type: "info" | "success" | "warning" | "error";
}

function getIcon(type: string) {
  switch (type) {
    case "success":
      return (
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={24}
          color={Colors.primary_500}
        />
      );
    case "error":
      return (
        <MaterialCommunityIcons
          name="close-circle-outline"
          size={24}
          color={Colors.red}
        />
      );
    case "warning":
      return (
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={24}
          color={Colors.accent_500}
        />
      );
    default:
      return (
        <MaterialCommunityIcons
          name="information-outline"
          size={24}
          color={Colors.primary_700}
        />
      );
  }
}

function formatDate(date: string) {
  const dt = new Date(date);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SWIPE_THRESHOLD = 120;

function NotificationSwipeCard({
  notification,
  onDismiss,
}: {
  notification: NotificationItem;
  onDismiss: () => void;
}) {
  const transX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onChange((e) => {
      "worklet";
      if (transX.value <= 0) {
        transX.value += e.changeX;
      }
    })
    .onEnd(() => {
      "worklet";
      if (transX.value < -200) {
        opacity.value = withTiming(0);
        scale.value = withTiming(0.8);
        transX.value = withTiming(-400);
        runOnJS(() => {
          setTimeout(() => {
            onDismiss();
          }, 400);
        })();
      } else {
        transX.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: transX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.cardIcon}>{getIcon(notification.type)}</View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{notification.title}</Text>
          <Text style={styles.cardBody}>{notification.body}</Text>
          <Text style={styles.cardDate}>{formatDate(notification.date)}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function notificationsScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasNotifications = notifications && notifications.length > 0;

  useEffect(() => {
    if (userCtx.id) {
      fetchNotifications();
    }
  }, [userCtx.id]);

  async function fetchNotifications(): Promise<void> {
    if (!userCtx.id) return;

    try {
      setIsLoading(true);
      const result = await cloudFunctions.getNotifications(userCtx.id, 50);

      // Transform to NotificationItem format
      const transformedNotifications: NotificationItem[] =
        result.notifications.map((n: any) => {
          // Handle date formatting
          let dateStr = "";
          if (n.createdAt?.toDate) {
            dateStr = n.createdAt.toDate().toISOString();
          } else if (n.createdAt?._seconds) {
            dateStr = new Date(n.createdAt._seconds * 1000).toISOString();
          } else if (typeof n.createdAt === "string") {
            dateStr = n.createdAt;
          } else {
            dateStr = new Date().toISOString();
          }

          return {
            id: n.id,
            title: n.title || "Notification",
            body: n.body || "",
            date: dateStr,
            type: n.type || "info",
          };
        });

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNotificationDismiss(
    notificationId: string
  ): Promise<void> {
    if (!userCtx.id) return;

    try {
      // Mark as read when dismissed
      await cloudFunctions.markNotificationRead(userCtx.id, notificationId);

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={Colors.primary_700}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.accent_500} />
        </View>
      ) : hasNotifications ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((n) => (
            <Animated.View key={n.id} layout={Layout.springify()}>
              <NotificationSwipeCard
                notification={n}
                onDismiss={() => handleNotificationDismiss(n.id)}
              />
            </Animated.View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="bell-off-outline"
            size={48}
            color={Colors.primary_700}
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary_100,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: Colors.primary_100,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary_500,
    marginBottom: 18,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  cardIcon: {
    marginRight: 14,
    marginTop: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    fontWeight: "900",
    marginBottom: 2,
    color: Colors.primary_700,
  },
  cardBody: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginBottom: 6,
    opacity: 0.95,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.accent_500,
    fontFamily: Fonts.primary,
    opacity: 0.7,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginTop: 18,
  },
});

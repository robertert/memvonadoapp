import React, { useEffect, useState, useRef, useContext, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  Modal,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "../../constants/colors";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { cloudFunctions } from "../../services/cloudFunctions";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import { UserContext } from "../../store/user-context";
import {
  placeholderDecks,
  placeholderCards,
} from "../../constants/placeholderData";
import {
  ArrowLeftIcon,
  EyeIcon,
  RectangleStackIcon,
  UserIcon,
  Cog6ToothIcon,
  ShareIcon,
} from "react-native-heroicons/solid";
import { HeartIcon as HeartIconOutline } from "react-native-heroicons/outline";
import { HeartIcon as HeartIconSolid } from "react-native-heroicons/solid";
import * as Haptics from "expo-haptics";
import {
  isLikedLocally,
  addLikedDeckId,
  removeLikedDeckId,
} from "@/utils/likedDecksCache";

import {
  CardSchema,
  safeValidateArray,
  safeValidateDeck,
  type Card,
  type Deck,
  type DeckLearningData,
  type LearningMode,
} from "@/types";

import { calculateDateAgo } from "@/utils/date";
import LearningModeModal from "../../components/learnScreen/LearningModeModal";
import { playSound } from "@/utils/soundTrigger";
import { buildDeckShareMessage } from "@/utils/deepLinks";

interface DeckParams {
  deckId: string;
}

export default function deckDetails(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);

  const params = useLocalSearchParams();
  const typedParams = params as unknown as DeckParams;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreCards, setHasMoreCards] = useState<boolean>(true);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck>();
  const [userDeck, setUserDeck] = useState<DeckLearningData>();
  const [cards, setCards] = useState<Card[]>([]);
  const [syncModalVisible, setSyncModalVisible] = useState<boolean>(false);
  const [cardChanges, setCardChanges] = useState<any[]>([]);
  const [isCheckingChanges, setIsCheckingChanges] = useState<boolean>(false);
  const [dateAgo, setDateAgo] = useState<string>("2 weeks ago");
  const [username, setUsername] = useState<string>("");
  const [isEditor, setIsEditor] = useState<boolean>(false);

  // Like functionality state
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const likeScale = useRef(new Animated.Value(1)).current;
  const DEBOUNCE_MS = 1000;

  const likeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedLikeState = useRef<boolean>(false);   

  // Learning mode modal state
  const [showModeModal, setShowModeModal] = useState<boolean>(false);

  useEffect(() => {
    fetchDeck();
  }, []);

  // Check like status when deck loads
  useEffect(() => {
    async function checkLikeStatus() {
      if (!typedParams.deckId || PLACEHOLDER_MODE) return;

      // First check local cache for instant display
      const localLiked = await isLikedLocally(typedParams.deckId);
      setIsLiked(localLiked);

      // Then verify with server
      try {
        const result = await cloudFunctions.checkIfLiked(typedParams.deckId);
        setIsLiked(result.isLiked);
        lastSyncedLikeState.current = result.isLiked;
        // Update local cache if different
        if (result.isLiked !== localLiked) {
          if (result.isLiked) {
            await addLikedDeckId(typedParams.deckId);
          } else {
            await removeLikedDeckId(typedParams.deckId);
          }
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    }

    checkLikeStatus();
  }, [typedParams.deckId]);

  // Update likeCount when deck changes
  useEffect(() => {
    if (deck?.likes !== undefined) {
      setLikeCount(deck.likes);
    }
  }, [deck?.likes]);

  useEffect(() => {
    return () => {
      if (likeTimerRef.current) {
        syncLikeWithServer(!isLiked);
        clearTimeout(likeTimerRef.current);
      }
    };
  }, []);

  const syncLikeWithServer = async (targetState: boolean) => {
    if (targetState === lastSyncedLikeState.current) {
      return;
    }
    
    try {      
      const result = await cloudFunctions.toggleDeckLike(typedParams.deckId);
      
      if (result.liked) {
        await addLikedDeckId(typedParams.deckId);
      } else {
        await removeLikedDeckId(typedParams.deckId);
      }
      lastSyncedLikeState.current = result.liked;
    } catch (error) {
      console.error("Error syncing like:", error);
    }
  };

  // Like button handler with debounce
  const handleLikePress = useCallback(async () => {
    if (!typedParams.deckId || PLACEHOLDER_MODE) return;

    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Heart animation
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Update local cache immediately
    if (!isLiked) {
      await addLikedDeckId(typedParams.deckId);
    } else {
      await removeLikedDeckId(typedParams.deckId);
    }

    if (likeTimerRef.current) {
      clearTimeout(likeTimerRef.current);
    } else {
      syncLikeWithServer(!isLiked);
    }

    likeTimerRef.current = setTimeout(async () => {
      likeTimerRef.current = null;
      syncLikeWithServer(!isLiked);
    }, DEBOUNCE_MS);
    
  }, [typedParams.deckId, isLiked, likeCount, likeScale]);

  async function checkForChanges(): Promise<void> {
    if (!userCtx.id || !typedParams.deckId || isCheckingChanges) return;

    try {
      setIsCheckingChanges(true);
      const result = await cloudFunctions.checkCardChanges(typedParams.deckId);
      if (result.changes && result.changes.length > 0) {
        setCardChanges(result.changes);
        setSyncModalVisible(true);
      }
    } catch (error) {
      console.error("Error checking for changes:", error);
    } finally {
      setIsCheckingChanges(false);
    }
  }

  async function handleSyncAll(): Promise<void> {
    if (!userCtx.id || !typedParams.deckId) return;

    try {
      setIsLoading(true);
      const result = await cloudFunctions.syncDeckCards(
        typedParams.deckId,
        true
      );
      Alert.alert(
        "Synchronizacja zakończona",
        `Zsynchronizowano ${result.syncedCount} kart.`
      );
      setSyncModalVisible(false);
      setCardChanges([]);
      fetchDeck();
    } catch (error) {
      console.error("Error syncing cards:", error);
      Alert.alert("Błąd", "Nie udało się zsynchronizować kart.");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDeck(): Promise<void> {
    try {
      setIsLoading(true);
      setCards([]);
      setLastDocId(null);
      setHasMoreCards(true);
      if (PLACEHOLDER_MODE) {
        const pd = placeholderDecks[0];

        const resultDeck = safeValidateDeck(pd);
        if (!resultDeck.success) {
          console.error("Invalid deck data", resultDeck.error);
          throw new Error("Invalid deck data");
        }
        const resultCards = safeValidateArray(placeholderCards, CardSchema);
        if (!resultCards.success) {
          console.error("Invalid cards data", resultCards.error);
          throw new Error("Invalid cards data");
        }

        setDeck(resultDeck.data as Deck);
        setCards(resultCards.data as Card[]);
        setHasMoreCards(false);
        setLastDocId(null);
      } else {
        const [
          { deck: deckData, username: deckUsername, isEditor: deckIsEditor },
          { deck: userDeckData, createdDeck: createdDeck },
          { cards: deckCards, hasMore, lastDocId: newLastDocId },
        ] = await Promise.all([
          cloudFunctions.getDeckDetails(typedParams.deckId),
          cloudFunctions.getUserDeckDetails(typedParams.deckId),
          cloudFunctions.getDeckCards(typedParams.deckId, 20),
        ]);

        if (!deckData) throw new Error("Deck not found");

        setDateAgo(calculateDateAgo(new Date(deckData.createdAt)));
        setUsername(deckUsername);
        setIsEditor(deckIsEditor ?? false);
        setDeck(deckData);
        setUserDeck(userDeckData ?? undefined);
        setCards(deckCards);
        setHasMoreCards(hasMore);
        setLastDocId(newLastDocId);
      }
    } catch (error) {
      console.error("Error fetching deck:", error);
    } finally {
      setIsLoading(false);
      checkForChanges();
    }
  }

  async function loadMoreCards(): Promise<void> {
    if (isLoadingMore || !hasMoreCards || !lastDocId) return;

    try {
      setIsLoadingMore(true);
      const {
        cards: moreCards,
        hasMore,
        lastDocId: newLastDocId,
      } = await cloudFunctions.getDeckCards(typedParams.deckId, 20, lastDocId);

      setCards((prevCards) => [...prevCards, ...moreCards]);
      setHasMoreCards(hasMore);
      setLastDocId(newLastDocId);
    } catch (error) {
      console.error("Error loading more cards:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function navigateToLearn(): void {
    if (!deck?.id) return;

    // Record view silently (fire-and-forget)
    if (!PLACEHOLDER_MODE) {
      cloudFunctions.recordDeckView(deck.id).catch((error) => {
        console.error("Error recording deck view:", error);
      });
    }

    router.push({
      pathname: "./learnScreen",
      params: { deckId: deck?.id },
    });
  }

  async function startLearningDeckHandler(): Promise<void> {
    if (!deck?.id) return;

    // Check if mode already selected for this deck
    if (userDeck?.settings?.learningMode) {
      navigateToLearn();
      return;
    }

    // No mode set, no default → show modal
    setShowModeModal(true);
  }

  async function handleModeSelect(mode: LearningMode): Promise<void> {
    if (!deck?.id) return;

    setShowModeModal(false);

    try {
      // Update deck settings with selected mode
      cloudFunctions.updateUserDeckSettings(deck.id, {
        ...userDeck?.settings,
        learningMode: mode,
      });

      setUserDeck((prev) =>
        prev
          ? {
              ...prev,
              settings: { ...prev.settings, learningMode: mode },
            }
          : prev
      );

      navigateToLearn();
    } catch (error) {
      console.error("Error setting learning mode:", error);
      // Navigate anyway with default SRS mode
      navigateToLearn();
    }
  }

  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get("window");
  const CARD_WIDTH = 150;
  const CARD_SPACING = 20;

  function CardComponent({
    item,
    index,
  }: {
    item: Card;
    index: number;
  }): React.JSX.Element {
    const [text, setText] = useState<string>(item.cardData.front);

    const inputRange = [
      (index - 2) * (CARD_WIDTH + CARD_SPACING),
      (index - 1) * (CARD_WIDTH + CARD_SPACING),
      index * (CARD_WIDTH + CARD_SPACING),
      (index + 1) * (CARD_WIDTH + CARD_SPACING),
      (index + 2) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 0.85, 1, 0.85, 0.7],
      extrapolate: "clamp",
    });

    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ["45deg", "25deg", "0deg", "-25deg", "-45deg"],
      extrapolate: "clamp",
    });

    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [-30, -15, 0, 15, 30],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 0.7, 1, 0.7, 0.5],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.carouselCardContainer,
          {
            transform: [
              { perspective: 800 },
              { scale },
              { rotateY },
              { translateX },
            ],
            opacity,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            setText(
              text === item.cardData.front
                ? item.cardData.back
                : item.cardData.front
            );
          }}
          onLongPress={() => {
            const canEditCards =
              deck?.createdBy === userCtx.id || isEditor || userCtx.isAdmin;
            if (!canEditCards) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            playSound("click");
            router.push({
              pathname: "./editCard",
              params: { cardId: item.id, deckId: typedParams.deckId },
            });
          }}
          style={styles.cardPressable}
        >
          <View style={[styles.cardContainer]}>
            <Text style={styles.cardText}>{text}</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  function renderCard(itemData: {
    item: Card;
    index: number;
  }): React.JSX.Element {
    return <CardComponent item={itemData.item} index={itemData.index} />;
  }

  function SkeletonCard(): React.JSX.Element {
    return <View style={[styles.cardContainer, styles.skeletonCard]}></View>;
  }

  function SkeletonLoading(): React.JSX.Element {
    return (
      <LinearGradient
        start={{ x: 0, y: 0 }}
        colors={[Colors.primary_100, Colors.primary_100]}
        style={styles.background}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeftIcon color={Colors.primary_700} size={30} />
            </Pressable>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSettingsButton} />
          </View>

          <View style={styles.listContainer}>
            <FlatList
              data={[1, 2, 3]}
              renderItem={() => <SkeletonCard />}
              keyExtractor={(item) => item.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonNumber} />
              <View style={styles.skeletonLabel} />
            </View>
            <View style={styles.statItem}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonNumber} />
              <View style={styles.skeletonLabel} />
            </View>
            <View style={styles.statItem}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonNumber} />
              <View style={styles.skeletonLabel} />
            </View>
          </View>

          <View style={styles.userContainer}>
            <View style={styles.userInfo}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonUserName} />
            </View>
            <View style={styles.skeletonDate} />
          </View>

          <View style={styles.progressCard}>
            <View style={styles.skeletonProgressTitle} />
            <View style={styles.progressStats}>
              <View style={styles.progressItem}>
                <View style={styles.skeletonProgressNumber} />
                <View style={styles.skeletonProgressLabel} />
              </View>
              <View style={styles.progressItem}>
                <View style={styles.skeletonProgressNumber} />
                <View style={styles.skeletonProgressLabel} />
              </View>
              <View style={styles.progressItem}>
                <View style={styles.skeletonProgressNumber} />
                <View style={styles.skeletonProgressLabel} />
              </View>
            </View>
          </View>

          <View style={styles.skeletonStartButton} />
        </View>
      </LinearGradient>
    );
  }

  if (isLoading) {
    return <SkeletonLoading />;
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      colors={[Colors.primary_100, Colors.primary_100]}
      style={styles.background}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeftIcon color={Colors.primary_700} size={30} />
          </Pressable>
          <Text style={styles.headerTitle}>{deck?.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => {
                if (!deck) return;
                Share.share({
                  message: buildDeckShareMessage(deck.title, deck.id),
                });
              }}
            >
              <ShareIcon color={Colors.primary_700} size={22} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (!deck) return;
                router.push({
                  pathname: "./deckSettings",
                  params: {
                    isOwner: (deck.createdBy === userCtx.id).toString(),
                    isEditor: isEditor.toString(),
                    isAdmin: userCtx.isAdmin.toString(),
                    deckId: deck.id,
                  },
                });
              }}
              style={styles.settingsButton}
            >
              <Cog6ToothIcon color={Colors.primary_700} size={24} />
            </Pressable>
          </View>
        </View>
        <View style={styles.listContainer}>
          <Animated.FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.carouselContainer,
              {
                paddingLeft: screenWidth / 2 - CARD_WIDTH / 2 - 20,
                paddingRight: screenWidth / 2 - CARD_WIDTH / 2 - 20,
              },
            ]}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            snapToAlignment="start"
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            onEndReached={loadMoreCards}
            onEndReachedThreshold={0.1}
          />
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <EyeIcon size={24} color={Colors.primary_700} />
            <Text style={styles.statNumber}>{deck?.views}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statItem}>
            <RectangleStackIcon size={24} color={Colors.primary_700} />
            <Text style={styles.statNumber}>{deck?.cardsNum}</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
          <Pressable
            onPress={handleLikePress}
            style={styles.statItem}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              {isLiked ? (
                <HeartIconSolid size={24} color="#ef4444" />
              ) : (
                <HeartIconOutline size={24} color={Colors.primary_700} />
              )}
            </Animated.View>
            <Text style={styles.statNumber}>{likeCount}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </Pressable>
        </View>
        <View style={styles.userContainer}>
          <Pressable
            style={styles.userInfo}
            onPress={() => {
              if (!deck) return;
              if (deck.createdBy === userCtx.id) return; // Don't navigate to own profile
              router.push({
                pathname: "./userProfileScreen",
                params: { userId: deck.createdBy },
              });
            }}
          >
            <UserIcon size={24} color={Colors.primary_700} />
            <Text style={styles.userName}>{username}</Text>
          </Pressable>
          <Text style={styles.dateText}>{dateAgo}</Text>
        </View>
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Progress</Text>
          <View style={styles.progressStats}>
            {userDeck?.dailyStats ? (
              <>
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>
                    {userDeck.dailyStats.newCardsRemaining}
                  </Text>
                  <Text style={styles.progressLabel}>New</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>
                    {userDeck.dailyStats.dueCardsRemaining}
                  </Text>
                  <Text style={styles.progressLabel}>Due</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>
                    {userDeck.dailyStats.inProgressDueCards +
                      userDeck.dailyStats.inProgressNewCards}
                  </Text>
                  <Text style={styles.progressLabel}>Work</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>
                    {userDeck.dailyStats.completedNewToday +
                      userDeck.dailyStats.completedDueToday}
                  </Text>
                  <Text style={styles.progressLabel}>Done</Text>
                </View>
              </>
            ) : (
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Brak statystyk</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          onPress={startLearningDeckHandler}
          style={styles.startButton}
        >
          <View style={styles.startButtonGradient}>
            <Text style={styles.startButtonText}>Start Learning</Text>
          </View>
        </Pressable>
      </View>

      {/* Learning Mode Modal */}
      <LearningModeModal
        visible={showModeModal}
        onSelectMode={handleModeSelect}
        onClose={() => setShowModeModal(false)}
      />

      {/* Sync Modal */}
      <Modal
        visible={syncModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSyncModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 20,
              width: "80%",
              maxHeight: "70%",
            }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}
            >
              Wykryto zmiany w decku
            </Text>
            <Text style={{ marginBottom: 15 }}>
              Znaleziono {cardChanges.length} zmian. Czy chcesz zsynchronizować
              karty?
            </Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
              {cardChanges.slice(0, 5).map((change, idx) => (
                <View key={idx} style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: "600" }}>
                    Karta {change.cardId.substring(0, 8)}...
                  </Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>
                    {change.type === "modified"
                      ? "Zmodyfikowana"
                      : change.type === "deleted"
                      ? "Usunięta z oryginału"
                      : "Nowa karta"}
                  </Text>
                </View>
              ))}
              {cardChanges.length > 5 && (
                <Text style={{ fontSize: 12, color: "#666" }}>
                  ... i {cardChanges.length - 5} więcej
                </Text>
              )}
            </ScrollView>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Pressable
                onPress={() => setSyncModalVisible(false)}
                style={{
                  padding: 10,
                  backgroundColor: "#f0f0f0",
                  borderRadius: 10,
                  flex: 1,
                  marginRight: 10,
                }}
              >
                <Text style={{ textAlign: "center" }}>Zignoruj</Text>
              </Pressable>
              <Pressable
                onPress={handleSyncAll}
                style={{
                  padding: 10,
                  backgroundColor: Colors.primary_700,
                  borderRadius: 10,
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  Synchronizuj wszystkie
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  startButton: {
    alignSelf: "center",
    width: "80%",
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 25,
    overflow: "hidden",
  },
  startButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
    backgroundColor: Colors.accent_500,
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  cardContainer: {
    marginHorizontal: 8,
    height: 200,
    width: 150,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: Colors.primary_100,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  cardText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginHorizontal: 3,
  },
  topCard: {
    width: "100%",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: Colors.primary_500,
  },
  listContainer: {
    justifyContent: "center",
    height: 220,
    marginBottom: 20,
  },
  carouselContainer: {
    alignItems: "center",
  },
  carouselCardContainer: {
    width: 150,
    marginHorizontal: 10,
  },
  cardPressable: {
    width: "100%",
    height: "100%",
  },
  statsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,

    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary_500,
    fontFamily: Fonts.primary,
    marginTop: 2,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  dateText: {
    fontSize: 14,
    color: Colors.primary_500,
    fontFamily: Fonts.primary,
    marginTop: 4,
  },
  progressCard: {
    width: "70%",
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginTop: 40,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    marginBottom: 20,
    borderRadius: 16,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  progressItem: {
    alignItems: "center",
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.primary_100,
    fontWeight: "800",
    fontFamily: Fonts.primary,
    marginTop: 4,
  },
  // Skeleton Loading Styles
  skeletonCard: {
    backgroundColor: Colors.primary_700_30,
  },
  skeletonText: {
    width: "80%",
    height: 16,
    backgroundColor: Colors.primary_700_50,
    borderRadius: 8,
  },
  skeletonTitle: {
    width: 120,
    height: 24,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 12,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonNumber: {
    width: 40,
    height: 18,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 9,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 30,
    height: 12,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 6,
  },
  skeletonUserName: {
    width: 80,
    height: 20,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 10,
    marginLeft: 10,
  },
  skeletonDate: {
    width: 60,
    height: 14,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 7,
  },
  skeletonProgressTitle: {
    width: 150,
    height: 26,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 13,
    alignSelf: "center",
    marginBottom: 20,
  },
  skeletonProgressNumber: {
    width: 30,
    height: 24,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 12,
    marginBottom: 4,
  },
  skeletonProgressLabel: {
    width: 25,
    height: 14,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 7,
  },
  skeletonStartButton: {
    alignSelf: "center",
    width: "80%",
    height: 56,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 25,
    marginTop: 30,
    marginBottom: 20,
  },
  skeletonSettingsButton: {
    width: 24,
    height: 24,
    backgroundColor: Colors.primary_700_30,
    borderRadius: 12,
  },
});

import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, generageRandomUid } from "../../constants/colors";
import { Image, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign, EvilIcons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { cloudFunctions } from "../../services/cloudFunctions";
import {
  ArrowLeftIcon,
  EyeIcon,
  HeartIcon,
  RectangleStackIcon,
  UserIcon,
  Cog6ToothIcon,
} from "react-native-heroicons/solid";

interface Deck {
  id?: string;
  title: string;
  views: number | string;
  likes: number;
  cards: number;
  userId: string;
  userName: string;
  done: number;
  today: number;
  new: number;
}

interface CardData {
  front: string;
  back: string;
  tags: string[];
}

interface CardAlgo {
  difficulty: number;
  due: any;
  elapsed_days: number;
  lapses: number;
  last_review: any;
  reps: number;
  scheduled_days: number;
  stability: number;
  state: number;
}

interface FirstLearn {
  due: any;
  isFirst: boolean;
  isNew: boolean;
  state: number;
}

interface Card {
  id: string;
  cardData: CardData;
  cardAlgo?: CardAlgo;
  firstLearn?: FirstLearn;
}

interface DeckParams {
  deckId: string;
}

export default function deckDetails(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const typedParams = params as unknown as DeckParams;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreCards, setHasMoreCards] = useState<boolean>(true);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck>({
    title: "English",
    views: "10k",
    likes: 100,
    cards: 124,
    userId: generageRandomUid(),
    userName: "Robert",
    done: 12,
    today: 90,
    new: 120,
  });
  const [cards, setCards] = useState<Card[]>([]);

  const [dateAgo, setDateAgo] = useState<string>("2 weeks ago");

  useEffect(() => {
    console.log("Deck ID:", typedParams.deckId);

    fetchDeck();
  }, []);

  async function fetchDeck(): Promise<void> {
    try {
      setIsLoading(true);
      setCards([]);
      setLastDocId(null);
      setHasMoreCards(true);

      // Get deck details first
      const { deck: deckData } = await cloudFunctions.getDeckDetails(
        typedParams.deckId
      );
      console.log("Deck data:", deckData);

      // Get first batch of cards
      const {
        cards: deckCards,
        hasMore,
        lastDocId: newLastDocId,
      } = await cloudFunctions.getDeckCards(typedParams.deckId, 20);
      console.log("Deck cards:", deckCards);

      setDeck({
        id: deckData?.id,
        title: deckData?.title || "Untitled",
        views: deckData?.views || 0,
        likes: deckData?.likes || 0,
        cards: deckData?.cardsNum ?? deckCards?.length ?? 0,
        userId: deckData?.createdBy || generageRandomUid(),
        userName: deckData?.userName || "Unknown",
        done: deckData?.done || 0,
        today: deckData?.today || 0,
        new: deckData?.new || 0,
      });

      setCards(deckCards || []);
      setHasMoreCards(hasMore);
      setLastDocId(newLastDocId);
    } catch (error) {
      console.error("Error fetching deck:", error);
    } finally {
      setIsLoading(false);
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

      setCards((prevCards) => [...prevCards, ...(moreCards || [])]);
      setHasMoreCards(hasMore);
      setLastDocId(newLastDocId);
    } catch (error) {
      console.error("Error loading more cards:", error);
    } finally {
      setIsLoadingMore(false);
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
          <Text style={styles.headerTitle}>{deck.title}</Text>
          <Pressable
            onPress={() => {
              router.push({
                pathname: "./deckSettings",
                params: { deckId: deck.id || typedParams.deckId },
              });
            }}
            style={styles.settingsButton}
          >
            <Cog6ToothIcon color={Colors.primary_700} size={24} />
          </Pressable>
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
            <Text style={styles.statNumber}>{deck.views}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statItem}>
            <RectangleStackIcon size={24} color={Colors.primary_700} />
            <Text style={styles.statNumber}>{deck.cards}</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
          <View style={styles.statItem}>
            <HeartIcon size={24} color={Colors.primary_700} />
            <Text style={styles.statNumber}>{deck.likes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>
        <View style={styles.userContainer}>
          <View style={styles.userInfo}>
            <UserIcon size={24} color={Colors.primary_700} />
            <Text style={styles.userName}>{deck.userName}</Text>
          </View>
          <Text style={styles.dateText}>{dateAgo}</Text>
        </View>
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Progress</Text>
          <View style={styles.progressStats}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{deck.done}</Text>
              <Text style={styles.progressLabel}>Done</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{deck.new}</Text>
              <Text style={styles.progressLabel}>New</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{deck.today}</Text>
              <Text style={styles.progressLabel}>Today</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => {
            router.push({
              pathname: "./learnScreen",
              params: { id: deck.id },
            });
          }}
          style={styles.startButton}
        >
          <View style={styles.startButtonGradient}>
            <Text style={styles.startButtonText}>Start Learning</Text>
          </View>
        </Pressable>
      </View>
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
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    backgroundColor: Colors.accent_500,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: "bold",
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
    width: "100%",
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginTop: 40,
  },
  progressTitle: {
    fontSize: 26,
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
    fontSize: 14,
    color: Colors.primary_100,
    fontWeight: "600",
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

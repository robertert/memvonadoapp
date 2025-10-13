import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, generageRandomUid } from "../../constants/colors";
import { View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { FontAwesome5 } from "@expo/vector-icons";
import NewCard from "../../ui/newCard";
import { cloudFunctions } from "../../services/cloudFunctions";
import { router, useLocalSearchParams } from "expo-router";

import { UserContext } from "../../store/user-context";
import { ScrollView } from "react-native-gesture-handler";

interface Card {
  id: string;
  front: string;
  back: string;
  isMoreFront: boolean;
  isMoreBack: boolean;
  tags: string[];
  frontColor?: string;
  backColor?: string;
}

interface CreateSelfParams {
  cards?: string;
}

export default function createSelfScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typedParams = params as CreateSelfParams;

  const [cards, setCards] = useState<Card[]>([
    {
      id: "test",
      front: "",
      back: "",
      isMoreFront: false,
      isMoreBack: false,
      tags: [],
    },
    {
      id: "test1",
      front: "",
      back: "",
      isMoreFront: false,
      isMoreBack: false,
      tags: [],
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [isTagsShown, setIsTagsShown] = useState<boolean>(false);
  const [tagCard, setTagCard] = useState<Card | null>(null);
  const [newTag, setNewTag] = useState<string>("");

  const userCtx = useContext(UserContext);

  useEffect(() => {
    if (typedParams.cards) {
      const gotCards = JSON.parse(typedParams.cards).map((card: any) => {
        card = {
          ...card,
          id: generageRandomUid(),
          tags: [],
          isMoreFront: false,
          isMoreBack: false,
        };
        return card;
      });
      setCards(gotCards);
    }
  }, []);

  async function saveHandler(): Promise<void> {
    try {
      setIsLoading(true);
      
      // Prepare cards data for Cloud Function
      const cardsData = cards.map(card => ({
        front: card.front,
        back: card.back,
        tags: card.tags || []
      }));

      // Use Cloud Function to create deck with cards
      const result = await cloudFunctions.createDeckWithCards(
        title,
        cardsData,
        userCtx.id || ""
      );

      console.log("Deck created successfully:", result.deckId);
      router.back();
      setIsLoading(false);
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  }

  function createNewHandler(): void {
    setCards((prev) => {
      return [
        ...prev,
        {
          id: generageRandomUid(),
          front: "",
          back: "",
          isMoreFront: false,
          isMoreBack: false,
          tags: [],
        },
      ];
    });
  }

  function titleChangeHandler(text: string): void {
    setTitle(text);
  }

  function tagsShownHandler(card: Card): void {
    setIsTagsShown((prev) => !prev);
    setTagCard(card);
  }

  function tagChangeHandler(text: string): void {
    setNewTag(text);
  }

  function newTagHandler(): void {
    if (!tagCard) return;
    
    setCards((prev) => {
      let newCards = [...prev];
      newCards = newCards.map((card) => {
        if (card.id === tagCard.id) {
          if (card.tags) {
            card.tags.push(newTag);
          } else {
            card.tags = [newTag];
          }
        }
        return card;
      });
      return newCards;
    });

    setNewTag("");
  }

  function delTagHandler(delTag: string): void {
    if (!tagCard) return;
    
    setCards((prev) => {
      let newCards = [...prev];
      newCards = newCards.map((card) => {
        if (card.id === tagCard.id) {
          card.tags = card.tags.filter((tag) => tag !== delTag);
        }
        return card;
      });
      return newCards;
    });
  }

  return (
    <GestureHandlerRootView>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_500, Colors.primary_100]}
      >
        <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator
                size={"large"}
                color={Colors.accent_500}
                style={{ alignSelf: "center" }}
              />
            </View>
          ) : (
            <ScrollView style={{ flex: 1, width: "100%" }}>
              <Text style={styles.titleLabel}>Title</Text>
              <View style={styles.titleInputContainer}>
                <TextInput
                  style={styles.titleInput}
                  onChangeText={titleChangeHandler}
                  value={title}
                />
              </View>
              {cards.map((card) => {
                return (
                  <NewCard
                    key={card.id}
                    card={card}
                    setCards={setCards}
                    tagsShownHandler={tagsShownHandler}
                  />
                );
              })}
              <Pressable onPress={createNewHandler}>
                <AntDesign
                  name="pluscircle"
                  size={45}
                  color={Colors.accent_500}
                  style={styles.plusIcon}
                />
              </Pressable>
              <Pressable onPress={saveHandler}>
                <View style={styles.saveButton}>
                  <Text style={styles.saveText}>Create</Text>
                </View>
              </Pressable>
            </ScrollView>
          )}
          <Modal
            visible={isTagsShown}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsTagsShown(false)}
          >
            <Pressable 
              style={styles.modalOverlay} 
              onPress={() => setIsTagsShown(false)}
            >
              <View style={[styles.dialogContainer, styles.modalContent]}>
                <Text style={styles.tagsTitle}>Tags:</Text>
                <ScrollView style={styles.scrollOverlay}>
                  {(cards.filter((card) => card.id === tagCard?.id)[0]?.tags
                    ? cards.filter((card) => card.id === tagCard?.id)[0].tags
                    : []
                  ).map((itemData, index) => {
                    return (
                      <View key={index} style={styles.tagContainer}>
                        <Text style={styles.tagsText}>{itemData}</Text>
                        <Pressable onPress={() => delTagHandler(itemData)}>
                          <FontAwesome5
                            name="trash"
                            size={24}
                            color={Colors.accent_500}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.newTagContainer}>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      onChangeText={tagChangeHandler}
                      value={newTag}
                      style={styles.tagInput}
                    />
                  </View>
                  <Pressable onPress={newTagHandler}>
                    <AntDesign
                      name="pluscircle"
                      size={25}
                      color={Colors.accent_500}
                      style={styles.plusIcon}
                        />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Modal>
        </View>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    alignItems: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  saveButton: {
    alignSelf: "center",
    width: 150,
    marginTop: 50,
    padding: 20,
    backgroundColor: Colors.accent_500,
    borderRadius: 20,
  },
  saveText: {
    textAlign: "center",
    fontSize: 18,
    color: Colors.white,
    fontFamily: Fonts.primary,
  },
  titleInputContainer: {
    borderColor: Colors.primary_700,
    borderRadius: 10,
    borderBottomWidth: 3,
    marginBottom: 40,
    marginTop: 20,
    backgroundColor: Colors.accent_500_30,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  titleInput: {
    textAlign: "center",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 25,
  },
  titleLabel: {
    textAlign: "center",
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 25,
  },
  plusIcon: {
    alignSelf: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  cardStack: {
    flexDirection: "row",
  },
  deleteContainer: {
    borderRadius: 15,
    backgroundColor: Colors.red,
    width: 500,
    marginBottom: 10,
    marginLeft: 1,
  },
  dialogContainer: {
    width: "80%",
    padding: 20,
    borderRadius: 15,
    backgroundColor: Colors.primary_500,
    maxHeight: 500,
  },
  tagsTitle: {
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontSize: 23,
  },
  tagsText: {
    fontFamily: Fonts.primary,
    color: Colors.accent_500,
    fontSize: 21,
  },
  tagInputContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.accent_500_30,
    borderRadius: 10,
    marginRight: 15,
  },
  tagInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
  },
  newTagContainer: {
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  scrollOverlay: {
    marginTop: 15,
    width: "100%",
    borderRadius: 15,
    backgroundColor: Colors.accent_500_30,
    paddingHorizontal: 10,
  },
  tagContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
  },
});

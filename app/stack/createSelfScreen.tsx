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
  const [deckLanguage, setDeckLanguage] = useState<string>("en");

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
      const cardsData = cards.map((card) => ({
        front: card.front,
        back: card.back,
        tags: card.tags || [],
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
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        style={styles.background}
        colors={[Colors.primary_100, Colors.primary_100]}
      >
        <View
          style={[styles.headerContainer, { paddingTop: safeArea.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrow-left" size={24} color={Colors.primary_700} />
          </Pressable>
          <Text style={styles.headerTitle}>Nowy Deck</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size={"large"} color={Colors.accent_500} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.titleSection}>
                <Text style={styles.titleLabel}>Tytuł decku</Text>
                <View style={styles.titleInputContainer}>
                  <TextInput
                    style={styles.titleInput}
                    onChangeText={titleChangeHandler}
                    value={title}
                    placeholder="Wprowadź tytuł..."
                    placeholderTextColor={Colors.primary_700_50}
                  />
                </View>
              </View>

              {/* Wybór języka decku */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                {[
                  { code: "en", label: "English" },
                  { code: "pl", label: "Polski" },
                  { code: "es", label: "Español" },
                  { code: "de", label: "Deutsch" },
                ].map((lng) => (
                  <Pressable
                    key={lng.code}
                    onPress={() => setDeckLanguage(lng.code)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: Colors.primary_700,
                      backgroundColor:
                        deckLanguage === lng.code
                          ? Colors.primary_700
                          : Colors.primary_100,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          deckLanguage === lng.code
                            ? Colors.primary_100
                            : Colors.primary_700,
                        fontFamily: Fonts.primary,
                        fontWeight: "800",
                      }}
                    >
                      {lng.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.cardsSection}>
                <Text style={styles.sectionTitle}>Karty</Text>
                {cards.map((card) => {
                  return (
                    <NewCard
                      key={card.id}
                      card={card}
                      setCards={setCards}
                      tagsShownHandler={tagsShownHandler}
                      deckLanguage={deckLanguage}
                    />
                  );
                })}
                <Pressable
                  onPress={createNewHandler}
                  style={styles.addCardButton}
                >
                  <AntDesign
                    name="plus-circle"
                    size={45}
                    color={Colors.accent_500}
                  />
                  <Text style={styles.addCardText}>Dodaj kartę</Text>
                </Pressable>
              </View>

              <Pressable onPress={saveHandler} style={styles.saveButton}>
                <Text style={styles.saveText}>Utwórz Deck</Text>
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
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.tagsTitle}>Tagi</Text>
                  <Pressable
                    onPress={() => setIsTagsShown(false)}
                    style={styles.closeButton}
                  >
                    <AntDesign
                      name="close"
                      size={24}
                      color={Colors.primary_700}
                    />
                  </Pressable>
                </View>

                <ScrollView style={styles.tagsScrollView}>
                  {(cards.filter((card) => card.id === tagCard?.id)[0]?.tags
                    ? cards.filter((card) => card.id === tagCard?.id)[0].tags
                    : []
                  ).map((itemData, index) => {
                    return (
                      <View key={index} style={styles.tagItem}>
                        <Text style={styles.tagText}>{itemData}</Text>
                        <Pressable onPress={() => delTagHandler(itemData)}>
                          <FontAwesome5
                            name="trash"
                            size={20}
                            color={Colors.red}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.addTagContainer}>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      onChangeText={tagChangeHandler}
                      value={newTag}
                      style={styles.tagInput}
                      placeholder="Dodaj nowy tag..."
                      placeholderTextColor={Colors.primary_700_50}
                    />
                  </View>
                  <Pressable
                    onPress={newTagHandler}
                    style={styles.addTagButton}
                  >
                    <AntDesign
                      name="plus"
                      size={20}
                      color={Colors.primary_100}
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
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  titleLabel: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 15,
  },
  titleInputContainer: {
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  titleInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 20,
    fontWeight: "600",
  },
  cardsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 15,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  addCardText: {
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "700",
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  saveText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.primary_100,
    fontWeight: "900",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.primary_100,
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxHeight: "70%",
    borderWidth: 3,
    borderColor: Colors.primary_700,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  tagsTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
  },
  tagsScrollView: {
    maxHeight: 200,
    marginBottom: 20,
  },
  tagItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.accent_500_30,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 5,
  },
  tagText: {
    fontSize: 16,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    flex: 1,
  },
  addTagContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagInputContainer: {
    flex: 1,
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_700,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
  },
  tagInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 16,
  },
  addTagButton: {
    backgroundColor: Colors.primary_700,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

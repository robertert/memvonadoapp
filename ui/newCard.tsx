import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, generageRandomUid } from "../constants/colors";
import { ScrollView, View, Image } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { FontAwesome5 } from "@expo/vector-icons";
import ColorPicker, {
  HueSlider,
  OpacitySlider,
  Panel1,
  Preview,
  Swatches,
} from "reanimated-color-picker";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  useAudioRecorder,
  RecordingPresets,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";

interface Card {
  id: string;
  front: string;
  back: string;
  frontColor?: string;
  backColor?: string;
  isMoreFront: boolean;
  isMoreBack: boolean;
  tags: string[];
  frontImage?: string;
  backImage?: string;
  frontAudio?: string;
  backAudio?: string;
}

interface NewCardProps {
  card: Card;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  tagsShownHandler: (card: Card) => void;
  deckLanguage?: string;
}

interface ActiveFields {
  tag: boolean;
  image: boolean;
  audio: boolean;
  formula: boolean;
}

// proste mocki słowników (lokalnie)
const DICTIONARIES: Record<string, string[]> = {
  en: [
    "example",
    "excellent",
    "exercise",
    "explain",
    "expand",
    "word",
    "world",
    "work",
    "worry",
    "write",
    "writer",
    "wrong",
  ],
  pl: [
    "przykład",
    "przyjaciel",
    "przyjemny",
    "przepis",
    "przyjaźń",
    "słowo",
    "słownik",
    "słuch",
  ],
  es: [
    "hola",
    "hablar",
    "hacer",
    "hecho",
    "hermano",
    "mujer",
    "mucho",
    "mundo",
  ],
  de: ["hallo", "hand", "haus", "heute", "helfen", "machen", "mutter"],
};

function getSuggestions(lang: string | undefined, query: string): string[] {
  if (!lang || !query || query.length < 2) return [];
  const list = DICTIONARIES[lang] || [];
  const q = query.toLowerCase();
  return list.filter((w) => w.toLowerCase().startsWith(q)).slice(0, 6);
}

export default function NewCard({
  card,
  setCards,
  tagsShownHandler,
  deckLanguage,
}: NewCardProps): React.JSX.Element {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [frontColor, setFrontColor] = useState<string>(Colors.primary_100);
  const [backColor, setBackColor] = useState<string>(Colors.primary_100);
  const [isFront, setIsFront] = useState<boolean>(true);
  // Zostaw frontFields/backFields bo sterują aktywnymi sekcjami
  const [frontFields, setFrontFields] = useState<ActiveFields>({
    tag: false,
    image: false,
    audio: false,
    formula: false,
  });
  const [backFields, setBackFields] = useState<ActiveFields>({
    tag: false,
    image: false,
    audio: false,
    formula: false,
  });
  const [currentFrontTag, setCurrentFrontTag] = useState("");
  const [currentBackTag, setCurrentBackTag] = useState("");
  // Busy/loading stany
  const [isRecordBusyFront, setIsRecordBusyFront] = useState(false);
  const [isRecordBusyBack, setIsRecordBusyBack] = useState(false);
  const [isPlayBusyFront, setIsPlayBusyFront] = useState(false);
  const [isPlayBusyBack, setIsPlayBusyBack] = useState(false);
  const [isDeleteBusyFront, setIsDeleteBusyFront] = useState(false);
  const [isDeleteBusyBack, setIsDeleteBusyBack] = useState(false);

  // Audio hooks dla frontu
  const audioRecorderFront = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderStateFront = useAudioRecorderState(audioRecorderFront);
  const audioPlayerFront = useAudioPlayer(card.frontAudio || "");
  const playerStatusFront = useAudioPlayerStatus(audioPlayerFront);

  // Audio hooks dla backu
  const audioRecorderBack = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderStateBack = useAudioRecorderState(audioRecorderBack);
  const audioPlayerBack = useAudioPlayer(card.backAudio || "");
  const playerStatusBack = useAudioPlayerStatus(audioPlayerBack);

  // Request audio permissions and setup
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        console.warn("Brak uprawnień do mikrofonu");
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  // Update card when recording finishes (front)
  useEffect(() => {
    if (
      recorderStateFront.isRecording === false &&
      audioRecorderFront.uri &&
      audioRecorderFront.uri !== card.frontAudio
    ) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, frontAudio: audioRecorderFront.uri || undefined }
            : c
        )
      );
    }
  }, [recorderStateFront.isRecording, audioRecorderFront.uri]);

  // Update card when recording finishes (back)
  useEffect(() => {
    if (
      recorderStateBack.isRecording === false &&
      audioRecorderBack.uri &&
      audioRecorderBack.uri !== card.backAudio
    ) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, backAudio: audioRecorderBack.uri || undefined }
            : c
        )
      );
    }
  }, [recorderStateBack.isRecording, audioRecorderBack.uri]);

  const onSelectColor = ({ hex }: { hex: string }) => {
    if (isFront) {
      setFrontColor(hex);
    } else {
      setBackColor(hex);
    }
    setCards((prev) => {
      return prev.map((thisCard) => {
        if (thisCard.id === card.id) {
          if (isFront) {
            thisCard.frontColor = hex;
          } else {
            thisCard.backColor = hex;
          }
        }
        return thisCard;
      });
    });
  };

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Animacje dla paneli advanced
  const advancedHeightFront = useSharedValue(0);
  const advancedHeightBack = useSharedValue(0);
  const [measuredFrontH, setMeasuredFrontH] = useState(0);
  const [measuredBackH, setMeasuredBackH] = useState(0);

  const advancedStyleFront = useAnimatedStyle(() => ({
    height: advancedHeightFront.value,
    opacity: advancedHeightFront.value > 0 ? 1 : 0,
    overflow: "hidden",
  }));

  const advancedStyleBack = useAnimatedStyle(() => ({
    height: advancedHeightBack.value,
    opacity: advancedHeightBack.value > 0 ? 1 : 0,
    overflow: "hidden",
  }));

  // Animuj otwarcie/zamknięcie panelu z wykorzystaniem zmierzonej wysokości
  useEffect(() => {
    const minFront = 100;
    const target = card.isMoreFront ? Math.max(measuredFrontH, minFront) : 0;
    advancedHeightFront.value = withTiming(target, { duration: 220 });
  }, [card.isMoreFront, measuredFrontH]);

  useEffect(() => {
    const minBack = 100;
    const target = card.isMoreBack ? Math.max(measuredBackH, minBack) : 0;
    advancedHeightBack.value = withTiming(target, { duration: 220 });
  }, [card.isMoreBack, measuredBackH]);

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const trashStyle = useAnimatedStyle(() => {
    return {
      opacity: translateX.value / -200,
    };
  });

  const initialTouchLocation = useSharedValue({ x: 0, y: 0 });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-10, 10]) // Only activate when horizontal movement is detected
    .failOffsetY([-20, 20]) // Fail if vertical movement is too large
    .onStart((e) => {
      "worklet";
      initialTouchLocation.value = { x: e.x, y: e.y };
    })
    .onChange((e) => {
      "worklet";
      if (translateX.value <= 0) {
        translateX.value += e.changeX;
      }
    })
    .onEnd(() => {
      "worklet";
      if (translateX.value < -200) {
        // Start smooth deletion animation
        opacity.value = withSpring(0);
        scale.value = withSpring(0.8);
        translateX.value = withSpring(-400);

        // Use setTimeout for deletion to allow animation to complete
        runOnJS(() => {
          setTimeout(() => {
            setCards((prev) => [
              ...prev.filter((thisCard) => card.id !== thisCard.id),
            ]);
          }, 300);
        })();
      } else {
        // Return to original position
        translateX.value = withSpring(0);
      }
    });

  // Single-open policy helpers
  function setExclusiveFrontField(next: keyof ActiveFields) {
    setFrontFields((prev) => {
      return {
        tag: next === "tag" ? !prev.tag : false,
        image: next === "image" ? !prev.image : false,
        audio: next === "audio" ? !prev.audio : false,
        formula: next === "formula" ? !prev.formula : false,
      };
    });
  }
  function setExclusiveBackField(next: keyof ActiveFields) {
    setBackFields((prev) => {
      return {
        tag: next === "tag" ? !prev.tag : false,
        image: next === "image" ? !prev.image : false,
        audio: next === "audio" ? !prev.audio : false,
        formula: next === "formula" ? !prev.formula : false,
      };
    });
  }

  // Reset fields when collapsing panels
  function openMoreHandler(gotCard: Card, fb: string): void {
    let shouldResetFront = false;
    let shouldResetBack = false;
    const toggledId = gotCard.id;

    setCards((prev) => {
      return prev.map((c) => {
        if (c.id === toggledId) {
          if (fb === "f") {
            const next = !c.isMoreFront;
            c.isMoreFront = next;
            if (!next) shouldResetFront = true;
          } else {
            const next = !c.isMoreBack;
            c.isMoreBack = next;
            if (!next) shouldResetBack = true;
          }
        }
        return c;
      });
    });

    // Apply resets outside of setCards to avoid setState-in-render warnings
    if (shouldResetFront) {
      setFrontFields({
        tag: false,
        image: false,
        audio: false,
        formula: false,
      });
    }
    if (shouldResetBack) {
      setBackFields({ tag: false, image: false, audio: false, formula: false });
    }

    // Ensure panel visibly opens even before we have a measured height
    if (fb === "f") {
      if (measuredFrontH === 0) {
        advancedHeightFront.value = withTiming(100, { duration: 220 });
      }
    } else {
      if (measuredBackH === 0) {
        advancedHeightBack.value = withTiming(100, { duration: 220 });
      }
    }
  }

  // Missing helpers reintroduced
  function textChangeHandler(
    text: string,
    isFront: boolean,
    gotCard: Card
  ): void {
    setCards((prev) => {
      return prev.map((c) => {
        if (c.id === gotCard.id) {
          if (isFront) {
            c.front = text;
          } else {
            c.back = text;
          }
        }
        return c;
      });
    });
  }

  // Tagi (wspólne dla obu stron)
  function addTagFromInput(side: Side) {
    const value = side === "front" ? currentFrontTag : currentBackTag;
    if (!value.trim()) return;
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, tags: [...(c.tags || []), value.trim()] } : c
      )
    );
    if (side === "front") setCurrentFrontTag("");
    else setCurrentBackTag("");
  }

  function removeTag(tag: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      )
    );
  }

  // Obrazki (uogólnione)
  async function pickImage(side: Side) {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      const uri = res.assets[0].uri;
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? side === "front"
              ? { ...c, frontImage: uri }
              : { ...c, backImage: uri }
            : c
        )
      );
    }
  }
  function removeImage(side: Side) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? side === "front"
            ? { ...c, frontImage: undefined }
            : { ...c, backImage: undefined }
          : c
      )
    );
  }

  // Sugestie (uogólnione)
  function applySuggestion(side: Side, word: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? side === "front"
            ? { ...c, front: word }
            : { ...c, back: word }
          : c
      )
    );
  }

  // Uogólnione funkcje audio (DRY)
  type Side = "front" | "back";

  async function handleRecord(side: Side) {
    const isRecording =
      side === "front"
        ? recorderStateFront.isRecording
        : recorderStateBack.isRecording;
    const recorder = side === "front" ? audioRecorderFront : audioRecorderBack;
    side === "front" ? setIsRecordBusyFront(true) : setIsRecordBusyBack(true);
    try {
      if (isRecording) {
        await recorder.stop();
      } else {
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } finally {
      side === "front"
        ? setIsRecordBusyFront(false)
        : setIsRecordBusyBack(false);
    }
  }

  async function handlePlay(side: Side) {
    const status = side === "front" ? playerStatusFront : playerStatusBack;
    const player = side === "front" ? audioPlayerFront : audioPlayerBack;
    side === "front" ? setIsPlayBusyFront(true) : setIsPlayBusyBack(true);
    try {
      if (status.playing) {
        player.pause();
      } else {
        // Twardy reset: pauza -> seek 0 -> krótki odstęp -> play
        await player.seekTo(0);
        player.play();
      }
    } finally {
      side === "front" ? setIsPlayBusyFront(false) : setIsPlayBusyBack(false);
    }
  }

  function handleDeleteAudio(side: Side) {
    side === "front" ? setIsDeleteBusyFront(true) : setIsDeleteBusyBack(true);
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              ...(side === "front"
                ? { frontAudio: undefined }
                : { backAudio: undefined }),
            }
          : c
      )
    );
    if (side === "front") {
      audioPlayerFront.pause();
    } else {
      audioPlayerBack.pause();
    }
    side === "front" ? setIsDeleteBusyFront(false) : setIsDeleteBusyBack(false);
  }

  async function pickAudio(side: Side) {
    const res: any = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    let uri: string | undefined;
    if (res && typeof res === "object") {
      if ("canceled" in res) {
        if (!res.canceled && res.assets && res.assets.length > 0) {
          uri = res.assets[0].uri;
        }
      } else if ("type" in res) {
        if (res.type === "success" && res.uri) {
          uri = res.uri as string;
        }
      }
    }
    if (uri) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? side === "front"
              ? { ...c, frontAudio: uri }
              : { ...c, backAudio: uri }
            : c
        )
      );
    }
  }

  // Icon color helpers (active/open vs has content)
  const frontHas = {
    tag: (card.tags || []).length > 0,
    image: !!(card as any).frontImage,
    audio: !!(card as any).frontAudio,
    formula: false,
  };
  const backHas = {
    tag: (card.tags || []).length > 0,
    image: !!(card as any).backImage,
    audio: !!(card as any).backAudio,
    formula: false,
  };
  function iconColor(isOpen: boolean, hasValue: boolean) {
    if (isOpen) return Colors.accent_500;
    if (hasValue) return Colors.primary_500;
    return Colors.primary_700;
  }

  // JSX — usuń warunek trybu simple; zawsze renderuj standardowo z isMoreFront/isMoreBack
  return (
    <GestureDetector gesture={pan} key={card.id}>
      <Animated.View style={[cardStyle, styles.cardStack]}>
        <Animated.View style={[styles.cardContainer]}>
          {/* FRONT */}
          <View style={styles.cardSection}>
            <View style={styles.cardLabelContainer}>
              <Text style={styles.cardText}>Front</Text>
              <View style={styles.cardInputContainer}>
                <TextInput
                  style={styles.cardInput}
                  onChangeText={(text: string) =>
                    textChangeHandler(text, true, card)
                  }
                  value={card.front}
                />
              </View>
              {/* Podpowiedzi słownikowe */}
              {deckLanguage &&
                getSuggestions(deckLanguage, card.front).length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {getSuggestions(deckLanguage, card.front).map((sug) => (
                      <Pressable
                        key={sug}
                        onPress={() => applySuggestion("front", sug)}
                        style={{
                          backgroundColor: Colors.accent_500_30,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: Colors.primary_700,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          {sug}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              {/* Panel rozwijany strzałką: ikony */}
              <Animated.View
                style={[advancedStyleFront]}
                pointerEvents={card.isMoreFront ? "auto" : "none"}
              >
                <View
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h !== measuredFrontH) setMeasuredFrontH(h);
                  }}
                >
                  <View style={styles.optionsContainer}>
                    <Pressable
                      onPress={() => setExclusiveFrontField("tag")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="tag-outline"
                        size={24}
                        color={iconColor(frontFields.tag, frontHas.tag)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setExclusiveFrontField("image")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={24}
                        color={iconColor(frontFields.image, frontHas.image)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setExclusiveFrontField("audio")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="volume-high"
                        size={24}
                        color={iconColor(frontFields.audio, frontHas.audio)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setExclusiveFrontField("formula")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="sigma"
                        size={24}
                        color={iconColor(frontFields.formula, frontHas.formula)}
                      />
                    </Pressable>
                  </View>
                  {frontFields.tag && (
                    <View style={{ marginTop: 7, marginBottom: 7 }}>
                      {/* input + chips jak wcześniej */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <TextInput
                          style={{
                            flex: 1,
                            padding: 6,
                            fontSize: 16,
                            color: Colors.primary_700,
                            borderBottomWidth: 1,
                            borderColor: Colors.primary_500,
                            fontFamily: Fonts.primary,
                          }}
                          placeholder="Nowy tag..."
                          value={currentFrontTag}
                          onChangeText={setCurrentFrontTag}
                          onSubmitEditing={() => addTagFromInput("front")}
                          blurOnSubmit={false}
                          autoCorrect={false}
                        />
                        <Pressable
                          onPress={() => addTagFromInput("front")}
                          style={{
                            backgroundColor: Colors.primary_700,
                            paddingHorizontal: 13,
                            paddingVertical: 8,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontWeight: "bold",
                            }}
                          >
                            Dodaj
                          </Text>
                        </Pressable>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginTop: 6,
                          gap: 5,
                        }}
                      >
                        {(card.tags || []).map((tag, idx) => (
                          <View
                            key={tag + idx}
                            style={{
                              backgroundColor: Colors.accent_500_30,
                              borderRadius: 19,
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: 13,
                              paddingVertical: 6,
                              marginRight: 5,
                              marginBottom: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: Colors.primary_700,
                                fontSize: 15,
                                fontFamily: Fonts.primary,
                              }}
                            >
                              {tag}
                            </Text>
                            <Pressable
                              style={{ marginLeft: 6, padding: 1 }}
                              onPress={() => removeTag(tag)}
                            >
                              <Text
                                style={{
                                  color: Colors.red,
                                  fontSize: 17,
                                  fontWeight: "bold",
                                }}
                              >
                                ×
                              </Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {frontFields.image && (
                    <View style={{ marginTop: 8, gap: 10 }}>
                      {/* obrazek: picker + miniaturka */}
                      {card.frontImage ? (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Image
                            source={{ uri: card.frontImage }}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 12,
                              marginRight: 10,
                            }}
                            resizeMode="cover"
                          />
                          <Pressable
                            onPress={() => removeImage("front")}
                            style={{
                              padding: 6,
                              borderRadius: 10,
                              backgroundColor: Colors.red,
                            }}
                          >
                            <Text
                              style={{
                                color: Colors.primary_100,
                                fontWeight: "bold",
                                fontSize: 16,
                              }}
                            >
                              Usuń
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={{
                            backgroundColor: Colors.accent_500,
                            borderRadius: 15,
                            alignSelf: "flex-start",
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                          }}
                          onPress={() => pickImage("front")}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontWeight: "bold",
                              fontSize: 15,
                            }}
                          >
                            Wybierz obrazek
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {frontFields.audio && (
                    <View style={{ marginTop: 10, gap: 10 }}>
                      <Text
                        style={{
                          color: Colors.primary_700,
                          fontSize: 15,
                          fontFamily: Fonts.primary,
                          fontWeight: "600",
                        }}
                      >
                        Wymowa
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <Pressable
                          onPress={() => pickAudio("front")}
                          style={{
                            backgroundColor: Colors.accent_500,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 11,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontFamily: Fonts.primary,
                            }}
                          >
                            📁 Dodaj plik
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={isRecordBusyFront}
                          onPress={() => handleRecord("front")}
                          style={{
                            backgroundColor: recorderStateFront.isRecording
                              ? Colors.red
                              : Colors.primary_700,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 11,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontFamily: Fonts.primary,
                            }}
                          >
                            {isRecordBusyFront
                              ? "⏳ Przygotowywanie..."
                              : recorderStateFront.isRecording
                              ? "⏹ Stop"
                              : "🎙 Nagraj wymowę"}
                          </Text>
                        </Pressable>
                        {typeof card.frontAudio === "string" &&
                          card.frontAudio.length > 0 && (
                            <Pressable
                              disabled={isPlayBusyFront}
                              onPress={() => handlePlay("front")}
                              style={{
                                backgroundColor: Colors.primary_500,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 11,
                              }}
                            >
                              <Text
                                style={{
                                  color: Colors.primary_100,
                                  fontFamily: Fonts.primary,
                                }}
                              >
                                {isPlayBusyFront
                                  ? "⏳ Ładowanie..."
                                  : playerStatusFront.playing
                                  ? "⏸ Pauza"
                                  : "▶️ Odtwórz"}
                              </Text>
                            </Pressable>
                          )}
                        {typeof card.frontAudio === "string" &&
                          card.frontAudio.length > 0 && (
                            <Pressable
                              disabled={isDeleteBusyFront}
                              onPress={() => handleDeleteAudio("front")}
                              style={{
                                backgroundColor: Colors.red,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 11,
                              }}
                            >
                              <Text
                                style={{
                                  color: Colors.primary_100,
                                  fontFamily: Fonts.primary,
                                }}
                              >
                                {isDeleteBusyFront
                                  ? "⏳ Usuwanie..."
                                  : "🗑 Usuń"}
                              </Text>
                            </Pressable>
                          )}
                      </View>
                      {typeof card.frontAudio === "string" &&
                      card.frontAudio.length > 0 ? (
                        <Text
                          style={{
                            color: Colors.primary_700,
                            fontSize: 14,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          ✅ Audio dodane
                        </Text>
                      ) : null}
                      {recorderStateFront.isRecording && (
                        <Text
                          style={{
                            color: Colors.red,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          🔴 Nagrywanie...
                        </Text>
                      )}
                      {playerStatusFront.playing && (
                        <Text
                          style={{
                            color: Colors.primary_700,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          Odtwarzanie...
                        </Text>
                      )}
                    </View>
                  )}
                  {frontFields.formula && (
                    <Text style={styles.metaFieldStub}>[Panel wzór front]</Text>
                  )}
                </View>
              </Animated.View>
            </View>
            <Pressable
              onPress={() => openMoreHandler(card, "f")}
              style={{ alignSelf: "center" }}
            >
              {!card.isMoreFront ? (
                <AntDesign name="down" size={24} color={Colors.primary_700} />
              ) : (
                <AntDesign name="up" size={24} color={Colors.primary_700} />
              )}
            </Pressable>
          </View>

          {/* BACK */}
          <View style={styles.cardSection}>
            <View style={styles.cardLabelContainer}>
              <Text style={styles.cardText}>Back</Text>
              <View style={styles.cardInputContainer}>
                <TextInput
                  style={styles.cardInput}
                  value={card.back}
                  onChangeText={(text: string) =>
                    textChangeHandler(text, false, card)
                  }
                />
              </View>
              {deckLanguage &&
                getSuggestions(deckLanguage, card.back).length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {getSuggestions(deckLanguage, card.back).map((sug) => (
                      <Pressable
                        key={sug}
                        onPress={() => applySuggestion("back", sug)}
                        style={{
                          backgroundColor: Colors.accent_500_30,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: Colors.primary_700,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          {sug}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              <Animated.View
                style={[advancedStyleBack]}
                pointerEvents={card.isMoreBack ? "auto" : "none"}
              >
                <View
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h !== measuredBackH) setMeasuredBackH(h);
                  }}
                >
                  <View style={styles.optionsContainer}>
                    <Pressable
                      onPress={() => setExclusiveBackField("tag")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="tag-outline"
                        size={24}
                        color={iconColor(backFields.tag, backHas.tag)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setExclusiveBackField("image")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={24}
                        color={iconColor(backFields.image, backHas.image)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setExclusiveBackField("audio")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="volume-high"
                        size={24}
                        color={iconColor(backFields.audio, backHas.audio)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setExclusiveBackField("formula")}
                      style={{ padding: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="sigma"
                        size={24}
                        color={iconColor(backFields.formula, backHas.formula)}
                      />
                    </Pressable>
                  </View>
                  {backFields.tag && (
                    <View style={{ marginTop: 7, marginBottom: 7 }}>
                      {/* input + chips jak wcześniej (dzielą te same tagi) */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <TextInput
                          style={{
                            flex: 1,
                            padding: 6,
                            fontSize: 16,
                            color: Colors.primary_700,
                            borderBottomWidth: 1,
                            borderColor: Colors.primary_500,
                            fontFamily: Fonts.primary,
                          }}
                          placeholder="Nowy tag..."
                          value={currentBackTag}
                          onChangeText={setCurrentBackTag}
                          onSubmitEditing={() => addTagFromInput("back")}
                          blurOnSubmit={false}
                          autoCorrect={false}
                        />
                        <Pressable
                          onPress={() => addTagFromInput("back")}
                          style={{
                            backgroundColor: Colors.primary_700,
                            paddingHorizontal: 13,
                            paddingVertical: 8,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontWeight: "bold",
                            }}
                          >
                            Dodaj
                          </Text>
                        </Pressable>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginTop: 6,
                          gap: 5,
                        }}
                      >
                        {(card.tags || []).map((tag, idx) => (
                          <View
                            key={tag + idx}
                            style={{
                              backgroundColor: Colors.accent_500_30,
                              borderRadius: 19,
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: 13,
                              paddingVertical: 6,
                              marginRight: 5,
                              marginBottom: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: Colors.primary_700,
                                fontSize: 15,
                                fontFamily: Fonts.primary,
                              }}
                            >
                              {tag}
                            </Text>
                            <Pressable
                              style={{ marginLeft: 6, padding: 1 }}
                              onPress={() => removeTag(tag)}
                            >
                              <Text
                                style={{
                                  color: Colors.red,
                                  fontSize: 17,
                                  fontWeight: "bold",
                                }}
                              >
                                ×
                              </Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {backFields.image && (
                    <View style={{ marginTop: 8, gap: 10 }}>
                      {card.backImage ? (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Image
                            source={{ uri: card.backImage }}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 12,
                              marginRight: 10,
                            }}
                            resizeMode="cover"
                          />
                          <Pressable
                            onPress={() => removeImage("back")}
                            style={{
                              padding: 6,
                              borderRadius: 10,
                              backgroundColor: Colors.red,
                            }}
                          >
                            <Text
                              style={{
                                color: Colors.primary_100,
                                fontWeight: "bold",
                                fontSize: 16,
                              }}
                            >
                              Usuń
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={{
                            backgroundColor: Colors.accent_500,
                            borderRadius: 15,
                            alignSelf: "flex-start",
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                          }}
                          onPress={() => pickImage("back")}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontWeight: "bold",
                              fontSize: 15,
                            }}
                          >
                            Wybierz obrazek
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {backFields.audio && (
                    <View style={{ marginTop: 10, gap: 10 }}>
                      <Text
                        style={{
                          color: Colors.primary_700,
                          fontSize: 15,
                          fontFamily: Fonts.primary,
                          fontWeight: "600",
                        }}
                      >
                        Wymowa
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <Pressable
                          onPress={() => pickAudio("back")}
                          style={{
                            backgroundColor: Colors.accent_500,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 11,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontFamily: Fonts.primary,
                            }}
                          >
                            📁 Dodaj plik
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={isRecordBusyBack}
                          onPress={() => handleRecord("back")}
                          style={{
                            backgroundColor: recorderStateBack.isRecording
                              ? Colors.red
                              : Colors.primary_700,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 11,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.primary_100,
                              fontFamily: Fonts.primary,
                            }}
                          >
                            {isRecordBusyBack
                              ? "⏳ Przygotowywanie..."
                              : recorderStateBack.isRecording
                              ? "⏹ Stop"
                              : "🎙 Nagraj wymowę"}
                          </Text>
                        </Pressable>
                        {typeof card.backAudio === "string" &&
                          card.backAudio.length > 0 && (
                            <Pressable
                              disabled={isPlayBusyBack}
                              onPress={() => handlePlay("back")}
                              style={{
                                backgroundColor: Colors.primary_500,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 11,
                              }}
                            >
                              <Text
                                style={{
                                  color: Colors.primary_100,
                                  fontFamily: Fonts.primary,
                                }}
                              >
                                {isPlayBusyBack
                                  ? "⏳ Ładowanie..."
                                  : playerStatusBack.playing
                                  ? "⏸ Pauza"
                                  : "▶️ Odtwórz"}
                              </Text>
                            </Pressable>
                          )}
                        {typeof card.backAudio === "string" &&
                          card.backAudio.length > 0 && (
                            <Pressable
                              disabled={isDeleteBusyBack}
                              onPress={() => handleDeleteAudio("back")}
                              style={{
                                backgroundColor: Colors.red,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 11,
                              }}
                            >
                              <Text
                                style={{
                                  color: Colors.primary_100,
                                  fontFamily: Fonts.primary,
                                }}
                              >
                                {isDeleteBusyBack ? "⏳ Usuwanie..." : "🗑 Usuń"}
                              </Text>
                            </Pressable>
                          )}
                      </View>
                      {typeof card.backAudio === "string" &&
                      card.backAudio.length > 0 ? (
                        <Text
                          style={{
                            color: Colors.primary_700,
                            fontSize: 14,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          ✅ Audio dodane
                        </Text>
                      ) : null}
                      {recorderStateBack.isRecording && (
                        <Text
                          style={{
                            color: Colors.red,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          🔴 Nagrywanie...
                        </Text>
                      )}
                      {playerStatusBack.playing && (
                        <Text
                          style={{
                            color: Colors.primary_700,
                            fontFamily: Fonts.primary,
                          }}
                        >
                          Odtwarzanie...
                        </Text>
                      )}
                    </View>
                  )}
                  {backFields.formula && (
                    <Text style={styles.metaFieldStub}>[Panel wzór back]</Text>
                  )}
                </View>
              </Animated.View>
            </View>
            <Pressable
              onPress={() => openMoreHandler(card, "b")}
              style={{ alignSelf: "center" }}
            >
              {!card.isMoreBack ? (
                <AntDesign name="down" size={24} color={Colors.primary_700} />
              ) : (
                <AntDesign name="up" size={24} color={Colors.primary_700} />
              )}
            </Pressable>
          </View>
        </Animated.View>
        <View style={styles.deleteContainer}>
          <Animated.View style={[trashStyle]}>
            <FontAwesome5 name="trash" size={35} color={Colors.secRed} />
          </Animated.View>
        </View>
        {/* Modal kolorów zostaje */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ColorPicker
                style={{ width: "100%", backgroundColor: "#00000000" }}
                value={isFront ? frontColor : backColor}
                onComplete={onSelectColor}
              >
                <Preview style={{ marginBottom: 10 }} />
                <Panel1 style={{ marginBottom: 20 }} />
                <HueSlider style={{ marginBottom: 10 }} />
                <OpacitySlider style={{ marginBottom: 30 }} />
                <Swatches style={{ marginBottom: 10 }} />
              </ColorPicker>
              <Pressable
                onPress={() => {
                  setShowModal(false);
                }}
              >
                <View
                  style={[
                    styles.saveButton,
                    { backgroundColor: isFront ? frontColor : backColor },
                  ]}
                >
                  <Text style={styles.saveText}>Ok</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    padding: 24,
    borderRadius: 20,
    borderColor: Colors.primary_700,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSection: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardInputContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary_500,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    minHeight: 42,
    flexShrink: 0,
  },
  cardLabelContainer: {
    flex: 1,
  },
  cardInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  cardText: {
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 12,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  optionsContainer: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    paddingVertical: 8,
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
  cardStack: {
    flexDirection: "row",
  },
  deleteContainer: {
    justifyContent: "center",
    paddingLeft: 50,
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
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  metaBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary_700,
  },
  metaBtnText: {
    fontSize: 14,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  metaFieldStub: {
    marginTop: 10,
    color: Colors.primary_500,
    fontSize: 14,
    fontFamily: Fonts.primary,
  },
});

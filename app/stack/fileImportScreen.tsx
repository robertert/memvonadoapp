import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  Fonts,
  csvToJson,
  generageRandomUid,
} from "../../constants/colors";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";

const DUMMY_SEPERATORS = [",", "space", "tab", "other"];
const DUMMY_SEPERATORS1 = ["\\n", "\\n\\n", "tab", "other"];
const translator: { [key: string]: string } = {
  ",": ",",
  space: " ",
  tab: "\t",
  "\\n": "\n",
  "\\n\\n": "\n\n",
};

interface ListPosition {
  top: number;
  left: number;
}

type ImportMode = "file" | "paste";

export default function createScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [cards, setCards] = useState<any[]>([]);
  const [seperator, setSeperator] = useState<string>("Wybierz separator");
  const [open, setOpen] = useState<boolean>(false);
  const [listPosition, setListPosition] = useState<ListPosition>({
    top: 0,
    left: 0,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [seperator1, setSeperator1] = useState<string>("Wybierz separator");
  const [open1, setOpen1] = useState<boolean>(false);
  const [selected1, setSelected1] = useState<number | null>(null);
  const [listPosition1, setListPosition1] = useState<ListPosition>({
    top: 0,
    left: 0,
  });
  const [text, setText] = useState<string>("");
  const [importMode, setImportMode] = useState<ImportMode>("paste");
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const triggerRef = useRef<any>(null);
  const triggerRef1 = useRef<any>(null);
  const list1ContainerRef = useRef<any>(null);
  const list2ContainerRef = useRef<any>(null);

  const dropDownHeight = useSharedValue(0);
  const dropDownOpacity = useSharedValue(1);

  const dropDownStyle = useAnimatedStyle(() => {
    return {
      maxHeight: dropDownHeight.value,
    };
  });

  const dropDownItemStyle = useAnimatedStyle(() => {
    return {
      opacity: dropDownOpacity.value,
    };
  });

  const dropDownHeight1 = useSharedValue(0);
  const dropDownOpacity1 = useSharedValue(1);

  const dropDownStyle1 = useAnimatedStyle(() => {
    return {
      maxHeight: dropDownHeight1.value,
    };
  });

  const dropDownItemStyle1 = useAnimatedStyle(() => {
    return {
      opacity: dropDownOpacity1.value,
    };
  });

  async function pickFileHandler(): Promise<void> {
    try {
      setIsLoadingFile(true);
      const result: any = await DocumentPicker.getDocumentAsync({
        type: ["text/*", "application/csv", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (result && typeof result === "object") {
        let uri: string | undefined;
        let fileName: string | undefined;

        if ("canceled" in result) {
          if (!result.canceled && result.assets && result.assets.length > 0) {
            uri = result.assets[0].uri;
            fileName = result.assets[0].name || "";
          }
        } else if ("type" in result) {
          if (result.type === "success" && result.uri) {
            uri = result.uri as string;
            fileName = result.name || "";
          }
        }

        if (uri) {
          setSelectedFileName(fileName || "");
          // Odczytaj zawartość pliku
          try {
            const response = await fetch(uri);
            const fileContent = await response.text();
            setText(fileContent);
          } catch (error) {
            Alert.alert("Błąd", "Nie udało się odczytać pliku");
            console.error("Error reading file:", error);
          }
        }
      }
      setIsLoadingFile(false);
    } catch (error) {
      setIsLoadingFile(false);
      Alert.alert("Błąd", "Nie udało się wybrać pliku");
      console.error("Error picking file:", error);
    }
  }

  function createSelfHandler(): void {
    if (!text.trim()) {
      Alert.alert("Błąd", "Proszę wkleić tekst lub wybrać plik");
      return;
    }

    if (
      seperator === "Wybierz separator" ||
      seperator1 === "Wybierz separator"
    ) {
      Alert.alert("Błąd", "Proszę wybrać oba separatory");
      return;
    }

    const json = csvToJson(
      text,
      translator[seperator] ? translator[seperator] : seperator,
      translator[seperator1] ? translator[seperator1] : seperator1
    );

    if (json.length === 0) {
      Alert.alert("Błąd", "Nie znaleziono kart w tekście. Sprawdź separatory.");
      return;
    }

    router.push({
      pathname: "../stack/createSelfScreen",
      params: { cards: JSON.stringify(json) },
    });
  }

  function goBackHandler(): void {
    router.back();
  }

  function openList(): void {
    if (open) {
      // Jeśli menu jest już otwarte, zamknij je
      setOpen(false);
      dropDownHeight.value = withSpring(0);
      return;
    }

    list1ContainerRef.current.measure(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => {
        const conPageX = pageX;
        const conPageY = pageY;
        triggerRef.current.measure(
          (
            x: number,
            y: number,
            width: number,
            height: number,
            pageX: number,
            pageY: number
          ) => {
            setListPosition({
              top: pageY + height - conPageY,
              left: pageX - conPageX,
            });
            setOpen(true);
          }
        );
      }
    );

    dropDownHeight.value = withSpring(280);
  }

  function openList1(): void {
    if (open1) {
      // Jeśli menu jest już otwarte, zamknij je
      setOpen1(false);
      dropDownHeight1.value = withSpring(0);
      return;
    }

    list2ContainerRef.current.measure(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => {
        const conPageX = pageX;
        const conPageY = pageY;
        triggerRef1.current.measure(
          (
            x: number,
            y: number,
            width: number,
            height: number,
            pageX: number,
            pageY: number
          ) => {
            setListPosition1({
              top: pageY + height - conPageY,
              left: pageX - conPageX,
            });
            setOpen1(true);
          }
        );
      }
    );
    dropDownHeight1.value = withSpring(280);
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_100, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        <View style={styles.top}>
          <Pressable onPress={goBackHandler} style={styles.backButton}>
            <Ionicons
              style={styles.backIcon}
              name="chevron-back"
              size={35}
              color={Colors.primary_700}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={{ flex: 1, width: "100%" }}
            onPress={() => {
              Keyboard.dismiss();
              setOpen(false);
              setOpen1(false);
            }}
          >
            {/* Wybór trybu importu */}
            <View style={styles.modeSelectorContainer}>
              <Pressable
                style={[
                  styles.modeButton,
                  importMode === "paste" && styles.modeButtonActive,
                ]}
                onPress={() => {
                  setImportMode("paste");
                  setText("");
                  setSelectedFileName("");
                }}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={20}
                  color={
                    importMode === "paste"
                      ? Colors.primary_100
                      : Colors.primary_700
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    importMode === "paste" && styles.modeButtonTextActive,
                  ]}
                >
                  Wklej tekst
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modeButton,
                  importMode === "file" && styles.modeButtonActive,
                ]}
                onPress={() => {
                  setImportMode("file");
                  setText("");
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={
                    importMode === "file"
                      ? Colors.primary_100
                      : Colors.primary_700
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    importMode === "file" && styles.modeButtonTextActive,
                  ]}
                >
                  Wybierz plik
                </Text>
              </Pressable>
            </View>

            {/* Przycisk wyboru pliku */}
            {importMode === "file" && (
              <View style={styles.filePickerContainer}>
                <Pressable
                  style={styles.filePickerButton}
                  onPress={pickFileHandler}
                  disabled={isLoadingFile}
                >
                  {isLoadingFile ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.primary_700}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="document-text"
                        size={24}
                        color={Colors.primary_700}
                      />
                      <Text style={styles.filePickerText}>
                        {selectedFileName || "Wybierz plik tekstowy"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.listsContainer}>
              <View style={styles.listContainer} ref={list1ContainerRef}>
                <Text style={styles.seperatorTitle}>Przód/Tył</Text>
                <Pressable
                  onPress={openList}
                  onPressIn={() => {
                    setSelected(0);
                    dropDownOpacity.value = withSpring(0.5);
                  }}
                  onPressOut={() => {
                    dropDownOpacity.value = withSpring(1);
                  }}
                >
                  <Animated.View
                    style={[
                      styles.dropDown,
                      !open
                        ? { borderRadius: 10 }
                        : {
                            borderTopLeftRadius: 10,
                            borderTopRightRadius: 10,
                          },
                      selected === 0 && dropDownItemStyle,
                    ]}
                    ref={triggerRef}
                  >
                    <Text style={styles.dropDownText}>{seperator}</Text>
                  </Animated.View>
                </Pressable>
                {open ? (
                  <Animated.ScrollView
                    style={[
                      styles.dropDownContainer,
                      listPosition,
                      dropDownStyle,
                    ]}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {DUMMY_SEPERATORS.map((sep, idx) => {
                      return (
                        <Pressable
                          key={idx}
                          onPressIn={() => {
                            setSelected(idx + 1);
                            dropDownOpacity.value = withSpring(0.5);
                          }}
                          onPressOut={() => {
                            dropDownOpacity.value = withSpring(1);
                          }}
                          onPress={() => {
                            setOpen(false);
                            setSeperator(sep);
                            dropDownHeight.value = 0;
                          }}
                        >
                          <Animated.View
                            style={[
                              styles.disabledContainer,
                              selected === idx + 1 ? dropDownItemStyle : {},
                              idx === DUMMY_SEPERATORS.length - 1 && {
                                borderBottomLeftRadius: 10,
                                borderBottomRightRadius: 10,
                              },
                              idx === 0 && {
                                borderTopColor: Colors.primary_700,
                                borderTopWidth: 2,
                              },
                            ]}
                          >
                            <Text style={styles.dropDownText}>{sep}</Text>
                          </Animated.View>
                        </Pressable>
                      );
                    })}
                  </Animated.ScrollView>
                ) : (
                  <></>
                )}
                {selected === 4 && (
                  <View style={styles.seperatorInputContainer}>
                    <TextInput
                      maxLength={5}
                      style={styles.seperatorInput}
                      onChangeText={(text) => {
                        setSeperator(text);
                      }}
                    />
                  </View>
                )}
              </View>
              <View style={styles.listContainer} ref={list2ContainerRef}>
                <Text style={styles.seperatorTitle}>Nowa karta</Text>
                <Pressable
                  onPress={openList1}
                  onPressIn={() => {
                    setSelected1(0);
                    dropDownOpacity1.value = withSpring(0.5);
                  }}
                  onPressOut={() => {
                    dropDownOpacity1.value = withSpring(1);
                  }}
                >
                  <Animated.View
                    style={[
                      styles.dropDown,
                      !open1
                        ? { borderRadius: 10 }
                        : {
                            borderTopLeftRadius: 10,
                            borderTopRightRadius: 10,
                          },
                      selected1 === 0 && dropDownItemStyle1,
                    ]}
                    ref={triggerRef1}
                  >
                    <Text style={styles.dropDownText}>{seperator1}</Text>
                  </Animated.View>
                </Pressable>
                {open1 ? (
                  <Animated.ScrollView
                    style={[
                      styles.dropDownContainer,
                      listPosition1,
                      dropDownStyle1,
                    ]}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {DUMMY_SEPERATORS1.map((sep, idx) => {
                      return (
                        <Pressable
                          key={idx}
                          onPressIn={() => {
                            setSelected1(idx + 1);
                            dropDownOpacity1.value = withSpring(0.5);
                          }}
                          onPressOut={() => {
                            dropDownOpacity1.value = withSpring(1);
                          }}
                          onPress={() => {
                            setOpen1(false);
                            setSeperator1(sep);
                            dropDownHeight1.value = 0;
                          }}
                        >
                          <Animated.View
                            style={[
                              styles.disabledContainer,
                              selected1 === idx + 1 ? dropDownItemStyle1 : {},
                              idx === DUMMY_SEPERATORS1.length - 1 && {
                                borderBottomLeftRadius: 10,
                                borderBottomRightRadius: 10,
                              },
                              idx === 0 && {
                                borderTopColor: Colors.primary_700,
                                borderTopWidth: 2,
                              },
                            ]}
                          >
                            <Text style={styles.dropDownText}>{sep}</Text>
                          </Animated.View>
                        </Pressable>
                      );
                    })}
                  </Animated.ScrollView>
                ) : (
                  <></>
                )}
                {selected1 === 4 && (
                  <View style={styles.seperatorInputContainer}>
                    <TextInput
                      maxLength={5}
                      style={styles.seperatorInput}
                      onChangeText={(text) => {
                        setSeperator1(text);
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
            {importMode === "paste" && (
              <>
                <Text style={styles.seperatorTitle}>Wklej tekst tutaj</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    multiline={true}
                    style={styles.textInput}
                    value={text}
                    onChangeText={(text) => {
                      setText(text);
                    }}
                    placeholder="Wklej tutaj tekst z kartami..."
                    placeholderTextColor={Colors.primary_700_50}
                  />
                </View>
              </>
            )}

            {importMode === "file" && text && (
              <View style={styles.filePreviewContainer}>
                <Text style={styles.filePreviewLabel}>Podgląd pliku:</Text>
                <ScrollView style={styles.filePreviewText}>
                  <Text style={styles.filePreviewContent}>
                    {text.substring(0, 500)}
                    {text.length > 500 ? "..." : ""}
                  </Text>
                </ScrollView>
              </View>
            )}

            <Pressable onPress={createSelfHandler} style={styles.dalejButton}>
              <View style={styles.saveButton}>
                <Text style={styles.saveText}>Dalej</Text>
              </View>
            </Pressable>
          </Pressable>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 30,
    alignItems: "center",
  },
  saveButton: {
    alignSelf: "center",
    backgroundColor: Colors.primary_700,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
    minWidth: 150,
  },
  saveText: {
    textAlign: "center",
    fontSize: 20,
    color: Colors.primary_100,
    fontFamily: Fonts.primary,
    fontWeight: "900",
  },
  top: {
    alignItems: "flex-start",
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    alignSelf: "flex-start",
  },
  dropDown: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: Colors.primary_100,
    width: 150,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingVertical: 5,
  },
  dropDownContainer: {
    zIndex: 2,
    position: "absolute",
    width: 150,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    backgroundColor: Colors.primary_100,
    overflow: "hidden",
    maxHeight: 280,
  },
  dropDownText: {
    marginVertical: 12,
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "600",
    fontSize: 16,
  },
  disabledContainer: {
    zIndex: 2,
    backgroundColor: Colors.primary_100,
    paddingVertical: 10,
  },
  listsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    zIndex: 3,
    marginBottom: 20,
  },
  listContainer: {
    alignItems: "center",
  },
  seperatorInputContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    justifyContent: "center",
    alignItems: "center",
  },
  seperatorInput: {
    height: 40,
    width: 100,
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  seperatorTitle: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 5,
  },
  textInputContainer: {
    width: "80%",
    height: 400,
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  textInput: {
    flex: 1,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "600",
  },
  modeSelectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: 25,
    marginTop: 15,
    paddingHorizontal: 15,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: Colors.primary_100,
    borderWidth: 3,
    borderColor: Colors.primary_700,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary_700,
    borderColor: Colors.primary_700,
  },
  modeButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: Colors.primary_100,
    fontWeight: "900",
  },
  filePickerContainer: {
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    borderStyle: "dashed",
  },
  filePickerText: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    color: Colors.primary_700,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  filePreviewContainer: {
    width: "80%",
    maxHeight: 200,
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 15,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary_700,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filePreviewLabel: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 10,
  },
  filePreviewText: {
    maxHeight: 150,
  },
  filePreviewContent: {
    fontFamily: Fonts.secondary,
    fontSize: 16,
    color: Colors.primary_700,
    lineHeight: 22,
    fontWeight: "500",
  },
  dalejButton: {
    alignSelf: "center",
    marginTop: 20,
  },
});

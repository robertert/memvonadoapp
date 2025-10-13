import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

export default function createScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [cards, setCards] = useState<any[]>([]);
  const [seperator, setSeperator] = useState<string>("Select seperator");
  const [open, setOpen] = useState<boolean>(false);
  const [listPosition, setListPosition] = useState<ListPosition>({ top: 0, left: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [seperator1, setSeperator1] = useState<string>("Select seperator");
  const [open1, setOpen1] = useState<boolean>(false);
  const [selected1, setSelected1] = useState<number | null>(null);
  const [listPosition1, setListPosition1] = useState<ListPosition>({ top: 0, left: 0 });
  const [text, setText] = useState<string>("");

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

  function createSelfHandler(): void {
    const json = csvToJson(
      text,
      translator[seperator] ? translator[seperator] : seperator,
      translator[seperator1] ? translator[seperator1] : seperator1
    );
    router.push({
      pathname: "../stack/createSelfScreen",
      params: { cards: JSON.stringify(json) },
    });
  }

  function goBackHandler(): void {
    router.back();
  }

  function openList(): void {
    list1ContainerRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      const conPageX = pageX;
      const conPageY = pageY;
      triggerRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setListPosition({
          top: pageY + height - conPageY,
          left: pageX - conPageX,
        });
        setOpen(true);
      });
    });

    dropDownHeight.value = withSpring(200);
  }

  function openList1(): void {
    list2ContainerRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      const conPageX = pageX;
      const conPageY = pageY;
      triggerRef1.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setListPosition1({
          top: pageY + height - conPageY,
          left: pageX - conPageX,
        });
        setOpen1(true);
      });
    });
    dropDownHeight1.value = withSpring(200);
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_500, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top + 8 }]}>
        <Pressable
          style={{ flex: 1, width: "100%" }}
          onPress={() => {
            Keyboard.dismiss();
            setOpen(false);
            setOpen1(false);
          }}
        >
          <View style={styles.top}>
            <Pressable onPress={goBackHandler}>
              <Ionicons
                style={styles.backIcon}
                name="chevron-back"
                size={35}
                color={Colors.primary_100}
              />
            </Pressable>
          </View>
          <View style={styles.listsContainer}>
            <View style={styles.listContainer} ref={list1ContainerRef}>
              <Text style={styles.seperatorTitle}>Front/Back</Text>
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
                <Animated.View
                  style={[
                    styles.dropDownContainer,
                    listPosition,
                    dropDownStyle,
                  ]}
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
                </Animated.View>
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
              <Text style={styles.seperatorTitle}>New card</Text>
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
                <Animated.View
                  style={[
                    styles.dropDownContainer,
                    listPosition1,
                    dropDownStyle1,
                  ]}
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
                </Animated.View>
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
          <Text style={styles.seperatorTitle}>Put your text here</Text>
          <View style={styles.textInputContainer}>
            <TextInput
              multiline={true}
              style={styles.textInput}
              onChangeText={(text) => {
                setText(text);
              }}
            />
          </View>
          <Pressable onPress={createSelfHandler}>
            <View style={styles.saveButton}>
              <Text style={styles.saveText}>Create</Text>
            </View>
          </Pressable>
        </Pressable>
      </View>
    </LinearGradient>
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
  top: {
    alignItems: "flex-start",
    width: "100%",
  },
  backIcon: {
    alignSelf: "flex-start",
  },
  dropDown: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: Colors.primary_100,
    width: 150,
  },
  dropDownContainer: {
    zIndex: 2,
    position: "absolute",
    width: 150,
  },
  dropDownText: {
    marginVertical: 10,
    textAlign: "center",
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
  },
  disabledContainer: {
    zIndex: 2,
    backgroundColor: Colors.primary_100,
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
    backgroundColor: Colors.primary_100_30,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  seperatorInput: {
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
    textAlign: "center",
  },
  seperatorTitle: {
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    textAlign: "center",
    fontSize: 22,
  },
  textInputContainer: {
    width: "80%",
    height: 400,
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: Colors.primary_100_30,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
    fontSize: 18,
  },
});

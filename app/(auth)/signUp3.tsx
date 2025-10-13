import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors, Fonts, Subjects, SubjectsIndex } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image, ScrollView } from "react-native";
import { router } from "expo-router";

import { FontAwesome5 } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { UserContext } from "../../store/user-context";

const N = Subjects.length;
const tab = new Array(N).fill(false);

interface RenderItemProps {
  item: number;
  index: number;
}

export default function signUp3(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [isPicked, setIsPicked] = useState<boolean[]>(tab);
  const [counter, setCounter] = useState<number>(0);

  const userCtx = useContext(UserContext);

  function chooseCateHandler(category: number): void {
    if (isPicked[category]) {
      setCounter((prev) => prev - 1);
      setIsPicked((prev) => {
        const updatedState = [...prev];
        updatedState[category] = !updatedState[category];
        return updatedState;
      });
    } else if (counter < 3) {
      setCounter((prev) => prev + 1);
      setIsPicked((prev) => {
        const updatedState = [...prev];
        updatedState[category] = !updatedState[category];
        return updatedState;
      });
    }
  }

  async function saveHandler(): Promise<void> {
    const chosen = Subjects.filter((subject, index) => isPicked[index]);
    try {
      await updateDoc(doc(db, `users/${userCtx.id}`), {
        intrests: chosen,
      });
      router.replace("../tabs");
    } catch (e) {
      Alert.alert("Error", "Please try again later");
      console.log(e);
    }
  }

  function renderList({ item, index }: RenderItemProps): React.JSX.Element {
    return (
      <View style={styles.itemsContainer}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => chooseCateHandler(index * 2)}
        >
          <View
            style={[styles.itemContainer, isPicked[index * 2] && styles.picked]}
          >
            {!isPicked[index * 2] ? (
              <FontAwesome5
                style={styles.icon}
                name="circle"
                size={24}
                color={Colors.primary_700}
              />
            ) : (
              <FontAwesome
                style={styles.icon}
                name="check-circle"
                size={24}
                color={Colors.primary_700}
              />
            )}
            <Text style={styles.title}>{Subjects[index * 2]}</Text>
          </View>
        </Pressable>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => chooseCateHandler(index * 2 + 1)}
        >
          <View
            style={[
              styles.itemContainer,
              isPicked[index * 2 + 1] && styles.picked,
            ]}
          >
            {!isPicked[index * 2 + 1] ? (
              <FontAwesome5
                style={styles.icon}
                name="circle"
                size={24}
                color={Colors.primary_700}
              />
            ) : (
              <FontAwesome
                style={styles.icon}
                name="check-circle"
                size={24}
                color={Colors.primary_700}
              />
            )}
            <Text style={styles.title}>{Subjects[index * 2 + 1]} </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_500, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top }]}>
        <Text style={styles.title}>
          Choose 3 subjects you are interested it.
        </Text>
        <FlatList
          data={SubjectsIndex}
          renderItem={renderList}
          keyExtractor={(item) => item.toString()}
        />
        <Pressable onPress={saveHandler}>
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>Save</Text>
          </View>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pickerConatiner: {
    flex: 1,
    alignItems: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  topConatainer: {
    alignItems: "center",
  },
  title: {
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
    fontSize: 25,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  buttonContainer: {
    marginTop: 30,
    alignSelf: "center",
    backgroundColor: Colors.accent_500,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 80,
    marginBottom: 50,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.white,
  },
  itemsContainer: {
    alignSelf: "center",
    flexDirection: "row",
    width: "90%",
    height: 130,
    marginBottom: 16,
  },
  itemContainer: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: Colors.primary_100,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  picked: {
    borderWidth: 4,
    borderColor: "#00000080",
  },
  icon: {
    alignSelf: "flex-end",
    marginRight: 8,
  },
});

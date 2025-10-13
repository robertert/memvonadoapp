import React, { useContext, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  MediaTypeOptions,
  useCameraPermissions,
  launchCameraAsync,
  PermissionStatus,
  launchImageLibraryAsync,
} from "expo-image-picker";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Divider from "../../ui/Divider";

import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, storage } from "../../firebase";
import { UserContext } from "../../store/user-context";

export default function signUp2(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [invalidUsername, setInvalidUsername] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const userCtx = useContext(UserContext);

  const [cameraPermissionInformation, requestPermission] =
    useCameraPermissions();

  async function verifyPermission(): Promise<boolean> {
    if (!cameraPermissionInformation) {
      return false;
    }
    if (cameraPermissionInformation.status === PermissionStatus.UNDETERMINED) {
      const permissionResponse = await requestPermission();
      return permissionResponse.granted;
    }
    if (cameraPermissionInformation.status === PermissionStatus.DENIED) {
      Alert.alert("Error", "Permission not granted");
      return false;
    }
    return true;
  }

  async function imagePressHandler(type: string): Promise<void> {
    const hasPermissions = await verifyPermission();
    if (!hasPermissions) {
      return;
    }

    let result;

    if (type === "camera") {
      result = await launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        aspect: [4, 4],
      });
    } else {
      result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.5,
        aspect: [4, 4],
      });
    }
    console.log(result);
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
    toggleIsVisible();
  }

  function toggleIsVisible(): void {
    setIsVisible((prev) => !prev);
  }

  function usernameChanged(text: string): void {
    setMessage("");
    setUsername(text);
  }

  async function nextHandler(): Promise<void> {
    try {
      const data = await getDocs(
        query(collection(db, `users`), where("name", "==", username))
      );
      if (!data.empty) {
        setMessage("This username is taken");
      } else {
        updateDoc(doc(db, `users/${userCtx.id}`), {
          name: username,
        });
        if (image) {
          const fetchRes = await fetch(image);
          const blob = await fetchRes.blob();
          await uploadBytesResumable(
            ref(storage, `users/${userCtx.id}/photo.jpg`),
            blob
          );
        }
        router.navigate("./signUp3");
      }
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      style={styles.background}
      colors={[Colors.primary_500, Colors.primary_100]}
    >
      <View style={[styles.container, { paddingTop: safeArea.top }]}>
        <View style={styles.imageContainer}>
          <Pressable onPress={toggleIsVisible}>
            <Image
              style={styles.image}
              source={
                image
                  ? { uri: image }
                  : require("../../assets/memvocadoicon.png")
              }
            />
            <Text style={styles.imageText}>
              Click here to set profile picture
            </Text>
          </Pressable>
        </View>
        <View style={styles.form}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Username</Text>
            <View
              style={[
                styles.inputContainer,
                invalidUsername && styles.invalidContainer,
              ]}
            >
              <TextInput
                onChangeText={usernameChanged}
                value={username}
                style={styles.input}
              />
            </View>
          </View>
          {message && <Text style={styles.errorMessage}>{message}</Text>}
        </View>
        <Pressable onPress={nextHandler}>
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>Next</Text>
          </View>
        </Pressable>
        <Modal
          visible={isVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={toggleIsVisible}
        >
          <Pressable style={styles.modalOverlay} onPress={toggleIsVisible}>
            <View style={[styles.dialogContainer, styles.modalContent]}>
              <View style={styles.optionsContainer}>
                <Pressable onPress={() => imagePressHandler("library")}>
                  <View style={styles.optionContainer}>
                    <MaterialIcons
                      name="photo-library"
                      size={24}
                      color={Colors.primary_100}
                    />
                    <Text style={styles.dialogOption}>
                      {"Choose photo from library"}
                    </Text>
                  </View>
                </Pressable>
                <Divider />
                <Pressable onPress={() => imagePressHandler("camera")}>
                  <View style={styles.optionContainer}>
                    <MaterialIcons
                      name="photo-camera"
                      size={24}
                      color={Colors.primary_100}
                    />
                    <Text style={styles.dialogOption}>{"Take new photo"}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontSize: 55,
    color: Colors.primary_700,
    fontFamily: Fonts.primary,
  },
  imageContainer: {
    alignItems: "center",
    marginTop: 80,
    marginBottom: 40,
  },
  label: {
    textAlign: "center",
    fontSize: 18,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    marginBottom: 5,
  },
  imageText: {
    textAlign: "center",
    fontSize: 15,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
  },
  labelContainer: {
    marginTop: 20,
    marginVertical: 10,
  },
  inputContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary_500,
    borderRadius: 100,
  },
  form: {
    width: "70%",
  },
  input: {
    width: "80%",
    fontSize: 18,
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
  },
  info: {
    fontSize: 15,
    color: Colors.primary_700,
    fontFamily: Fonts.secondary,
    marginVertical: 5,
    textAlign: "center",
  },
  errorMessage: {
    textAlign: "center",
    color: "red",
    fontFamily: Fonts.secondary,
  },
  invalidContainer: {
    borderWidth: 2,
    borderColor: "red",
  },
  dialogContainer: {
    backgroundColor: Colors.primary_700,
    borderRadius: 20,
  },
  dialogOption: {
    marginVertical: 15,
    fontSize: 20,
    color: Colors.primary_100,
    marginHorizontal: 10,
    fontWeight: "700",
  },
  optionsContainer: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    marginBottom: 10,
    alignSelf: "center",
    height: 200,
    width: 200,
    borderRadius: 100,
  },
  buttonContainer: {
    marginTop: 100,
    alignSelf: "center",
    backgroundColor: Colors.accent_500,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 80,
    marginBottom: 30,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.white,
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

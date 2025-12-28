import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Fonts } from "../../constants/colors";
import { auth } from "../../firebase";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import Spinner from "react-native-loading-spinner-overlay";
import {
  MediaTypeOptions,
  useCameraPermissions,
  launchCameraAsync,
  launchImageLibraryAsync,
} from "expo-image-picker";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import { CATEGORY_OPTIONS } from "@/constants/settings";

type OnboardingStep = "username" | "photo" | "interests";

interface OnboardingData {
  username: string;
  photoUri?: string;
  photoUrl?: string;
  interests: string[];
}

export default function OnboardingScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const userCtx = useContext(UserContext);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("username");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    username: "",
    interests: [],
  });

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Step 1: Username
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Step 2: Photo
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  // Step 3: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  async function handleImagePicker(
    source: "camera" | "library"
  ): Promise<void> {
    try {
      if (source === "camera" && !cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert("Permission required", "Camera permission is required");
          return;
        }
      }

      const result =
        source === "camera"
          ? await launchCameraAsync({
              mediaTypes: MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            })
          : await launchImageLibraryAsync({
              mediaTypes: MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setData({ ...data, photoUri: result.assets[0].uri });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  }

  async function uploadPhoto(uri: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const response = await fetch(uri);
    const blob = await response.blob();
    const photoRef = ref(storage, `users/${user.uid}/photo.jpg`);

    await uploadBytesResumable(photoRef, blob);
    return await getDownloadURL(photoRef);
  }

  async function handleNext(): Promise<void> {
    if (currentStep === "username") {
      if (!username.trim() || username.length < 3) {
        setUsernameError("Username must be at least 3 characters");
        return;
      }
      try {
        setIsLoading(true);
        const response = await cloudFunctions.checkUsernameAvailability(
          username.trim()
        );
        if (!response.isAvailable) {
          setUsernameError("Username is already taken");
          return;
        }
        setData({ ...data, username: username.trim() });
        setCurrentStep("photo");
      } catch (error) {
        setUsernameError("Username is already taken");
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === "photo") {
      setCurrentStep("interests");
    } else if (currentStep === "interests") {
      if (selectedInterests.length < 3) {
        Alert.alert("Error", "Please select at least 3 interests");
        return;
      }

      // Zapisz wszystko do bazy przez Cloud Function
      await handleComplete();
    }
  }

  async function handleComplete(): Promise<void> {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      let photoUrl: string | undefined = undefined;
      if (photoUri) {
        photoUrl = await uploadPhoto(photoUri);
      }

      // Wywołaj Cloud Function do zapisania wszystkich danych
      await cloudFunctions.completeOnboarding({
        username: data.username || username,
        interests: selectedInterests,
      });

      // Zaktualizuj kontekst użytkownika
      userCtx.getUser(data.username || username, user.uid);

      // Przekieruj do głównej aplikacji
      router.replace("../tabs");
    } catch (error: any) {
      console.error("Complete onboarding error:", error);
      Alert.alert("Error", "Failed to complete setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleInterest(interest: string): void {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      } else if (prev.length < 3) {
        return [...prev, interest];
      }
      return prev;
    });
  }

  function renderStep(): React.JSX.Element {
    switch (currentStep) {
      case "username":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose your username</Text>
            <TextInput
              style={[styles.input, usernameError && styles.inputError]}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setUsernameError("");
              }}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : null}
          </View>
        );

      case "photo":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Add a profile photo</Text>
            <Pressable
              onPress={() =>
                Alert.alert("Choose source", "", [
                  {
                    text: "Camera",
                    onPress: () => handleImagePicker("camera"),
                  },
                  {
                    text: "Library",
                    onPress: () => handleImagePicker("library"),
                  },
                  { text: "Skip", onPress: () => setCurrentStep("interests") },
                ])
              }
            >
              <Image
                source={
                  photoUri
                    ? { uri: photoUri }
                    : require("../../assets/memvocadoicon.png")
                }
                style={styles.photoPreview}
              />
            </Pressable>
            <Text style={styles.photoHint}>Tap to change photo (optional)</Text>
          </View>
        );

      case "interests":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              Choose 3 subjects you're interested in
            </Text>
            <Text style={styles.stepSubtitle}>
              Selected: {selectedInterests.length}/3
            </Text>
            <ScrollView style={styles.interestsContainer}>
              {CATEGORY_OPTIONS.map((subject, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.interestItem,
                    selectedInterests.includes(subject) &&
                      styles.interestSelected,
                  ]}
                  onPress={() => toggleInterest(subject)}
                >
                  <Text
                    style={[
                      styles.interestText,
                      selectedInterests.includes(subject) &&
                        styles.interestTextSelected,
                    ]}
                  >
                    {subject}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
    }
  }

  return (
    <LinearGradient
      colors={[Colors.primary_100, Colors.primary_100]}
      style={[styles.container, { paddingTop: safeArea.top }]}
    >
      <View style={styles.content}>
        {renderStep()}
        <Pressable
          style={[
            styles.nextButton,
            currentStep === "interests" &&
              selectedInterests.length < 3 &&
              styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={
            isLoading ||
            (currentStep === "interests" && selectedInterests.length < 3)
          }
        >
          <Text style={styles.nextButtonText}>
            {currentStep === "interests" ? "Complete" : "Next"}
          </Text>
        </Pressable>
      </View>
      <Spinner visible={isLoading} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  stepContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: Fonts.primary,
    color: Colors.primary_700,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 18,
    fontFamily: Fonts.secondary,
    color: Colors.primary_700,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 300,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 50,
    fontSize: 18,
    fontFamily: Fonts.secondary,
    color: Colors.primary_700,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontFamily: Fonts.secondary,
    marginTop: 10,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
  },
  photoHint: {
    fontSize: 16,
    fontFamily: Fonts.secondary,
    color: Colors.primary_700,
  },
  interestsContainer: {
    flex: 1,
    width: "100%",
    marginTop: 20,
  },
  interestItem: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary_700,
  },
  interestSelected: {
    backgroundColor: Colors.accent_500,
    borderColor: Colors.primary_700,
  },
  interestText: {
    fontSize: 18,
    fontFamily: Fonts.secondary,
    color: Colors.primary_700,
    textAlign: "center",
  },
  interestTextSelected: {
    color: Colors.white,
    fontWeight: "700",
  },
  nextButton: {
    backgroundColor: Colors.accent_500,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 60,
    alignSelf: "center",
    marginBottom: 40,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 20,
    fontFamily: Fonts.primary,
    color: Colors.white,
    fontWeight: "900",
  },
});

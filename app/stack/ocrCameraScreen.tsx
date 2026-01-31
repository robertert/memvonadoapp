import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import {
  XMarkIcon,
  CameraIcon,
  PhotoIcon,
  BoltIcon,
  BoltSlashIcon,
} from "react-native-heroicons/outline";
import Toast from "react-native-toast-message";

import { Colors, Fonts } from "@/constants/colors";
import { useQuickAdd } from "@/store/quickAdd-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type SelectionType = "front" | "back";

export default function OCRCameraScreen(): React.JSX.Element {
  const safeArea = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { showQuickAdd } = useQuickAdd();

  // State
  const [mode, setMode] = useState<"camera" | "preview">("camera");
  const [flashOn, setFlashOn] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Selection state
  const [activeSelection, setActiveSelection] = useState<SelectionType>("front");
  const [frontSelection, setFrontSelection] = useState<SelectionBox | null>(null);
  const [backSelection, setBackSelection] = useState<SelectionBox | null>(null);
  const [frontText, setFrontText] = useState<string>("");
  const [backText, setBackText] = useState<string>("");

  // Zoom state
  const [zoom, setZoom] = useState(0);
  const zoomShared = useSharedValue(0);
  const savedZoom = useSharedValue(0);

  // Loading states
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessingFront, setIsProcessingFront] = useState(false);
  const [isProcessingBack, setIsProcessingBack] = useState(false);

  // Text preview modal
  const [showTextPreview, setShowTextPreview] = useState(false);

  // Gesture values for selection box
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const currentX = useSharedValue(0);
  const currentY = useSharedValue(0);
  const isDrawing = useSharedValue(false);

  // Calculate display dimensions for the image
  const getDisplayDimensions = useCallback(() => {
    if (!imageDimensions) return { width: SCREEN_WIDTH, height: SCREEN_WIDTH };

    const maxWidth = SCREEN_WIDTH;
    const maxHeight = SCREEN_HEIGHT - 300; // Leave room for header and footer

    const ratio = Math.min(
      maxWidth / imageDimensions.width,
      maxHeight / imageDimensions.height
    );

    return {
      width: imageDimensions.width * ratio,
      height: imageDimensions.height * ratio,
    };
  }, [imageDimensions]);

  // Take photo with camera
  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo) {
        setImageUri(photo.uri);
        setImageDimensions({ width: photo.width, height: photo.height });
        setMode("preview");
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Toast.show({
        type: "error",
        text1: "Blad",
        text2: "Nie udalo sie zrobic zdjecia.",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // Pick image from library
  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageDimensions({
          width: asset.width,
          height: asset.height,
        });
        setMode("preview");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({
        type: "error",
        text1: "Blad",
        text2: "Nie udalo sie wybrac zdjecia.",
      });
    }
  };

  // Process selection and extract text locally with ML Kit
  const processSelection = async (
    selection: SelectionBox,
    type: SelectionType
  ) => {
    if (!imageUri || !imageDimensions) return;

    const setProcessing =
      type === "front" ? setIsProcessingFront : setIsProcessingBack;
    const setText = type === "front" ? setFrontText : setBackText;

    try {
      setProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Calculate crop region relative to original image
      const displayDims = getDisplayDimensions();
      const scaleX = imageDimensions.width / displayDims.width;
      const scaleY = imageDimensions.height / displayDims.height;

      const cropRegion = {
        originX: Math.max(0, selection.x * scaleX),
        originY: Math.max(0, selection.y * scaleY),
        width: Math.min(
          selection.width * scaleX,
          imageDimensions.width - selection.x * scaleX
        ),
        height: Math.min(
          selection.height * scaleY,
          imageDimensions.height - selection.y * scaleY
        ),
      };

      // Crop the image
      const croppedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: cropRegion }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Run ML Kit Text Recognition locally on device
      const result = await TextRecognition.recognize(croppedImage.uri);
      const extractedText = result.text?.trim() || "";

      if (extractedText) {
        setText(extractedText);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: type === "front" ? "Przod" : "Tyl",
          text2: `Rozpoznano: ${extractedText.slice(0, 50)}${
            extractedText.length > 50 ? "..." : ""
          }`,
          visibilityTime: 2000,
        });
      } else {
        Toast.show({
          type: "info",
          text1: "Brak tekstu",
          text2: "Nie wykryto tekstu w zaznaczonym obszarze.",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error processing selection:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: "Blad OCR",
        text2: "Nie udalo sie rozpoznac tekstu.",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Update selection when gesture ends
  const updateSelection = useCallback(
    (box: SelectionBox) => {
      if (activeSelection === "front") {
        setFrontSelection(box);
        processSelection(box, "front");
      } else {
        setBackSelection(box);
        processSelection(box, "back");
      }
    },
    [activeSelection, imageUri, imageDimensions]
  );

  // Pan gesture for selection
  const panGesture = Gesture.Pan()
    .onStart((e) => {
      startX.value = e.x - 20;
      startY.value = e.y - 20;
      currentX.value = e.x - 20;
      currentY.value = e.y - 20;
      isDrawing.value = true;
    })
    .onUpdate((e) => {
      currentX.value = e.x - 20;
      currentY.value = e.y - 20;
    })
    .onEnd(() => {
      isDrawing.value = false;

      const x = Math.min(startX.value, currentX.value);
      const y = Math.min(startY.value, currentY.value);
      const width = Math.abs(currentX.value - startX.value);
      const height = Math.abs(currentY.value - startY.value);

      // Only process if selection is large enough
      if (width > 20 && height > 20) {
        runOnJS(updateSelection)({ x, y, width, height });
      }
    });

  // Animated style for current selection being drawn
  const drawingBoxStyle = useAnimatedStyle(() => {
    if (!isDrawing.value) {
      return { opacity: 0 };
    }

    const x = Math.min(startX.value, currentX.value);
    const y = Math.min(startY.value, currentY.value);
    const width = Math.abs(currentX.value - startX.value);
    const height = Math.abs(currentY.value - startY.value);

    return {
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      borderWidth: 2,
      borderColor:
        activeSelection === "front" ? Colors.primary_500 : Colors.accent_500,
      backgroundColor:
        activeSelection === "front"
          ? "rgba(79, 166, 100, 0.2)"
          : "rgba(255, 159, 67, 0.2)",
      opacity: 1,
    };
  });

  // Handle "Add Card" button
  const handleAddCard = () => {
    if (!frontText.trim()) {
      Toast.show({
        type: "info",
        text1: "Brak tekstu",
        text2: "Zaznacz obszar z tekstem dla przodu karty.",
        visibilityTime: 2000,
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();

    // Small delay to let the screen transition
    setTimeout(() => {
      showQuickAdd({
        front: frontText,
        back: backText,
        source: "ocr",
      });
    }, 300);
  };

  // Reset and go back to camera
  const resetToCamera = () => {
    setMode("camera");
    setImageUri(null);
    setImageDimensions(null);
    setFrontSelection(null);
    setBackSelection(null);
    setFrontText("");
    setBackText("");
    setZoom(0);
    zoomShared.value = 0;
    savedZoom.value = 0;
  };

  // Update zoom from gesture (worklet -> JS)
  const updateZoom = useCallback((value: number) => {
    setZoom(value);
  }, []);

  // Pinch gesture for camera zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedZoom.value = zoomShared.value;
    })
    .onUpdate((e) => {
      // Scale factor: pinch scale 1 = no change, 2 = double zoom
      const newZoom = Math.min(1, Math.max(0, savedZoom.value + (e.scale - 1) * 0.5));
      zoomShared.value = newZoom;
      runOnJS(updateZoom)(newZoom);
    });

  // Request camera permission
  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: safeArea.top }]}>
        <ActivityIndicator size="large" color={Colors.primary_500} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: safeArea.top }]}>
        <Text style={styles.permissionText}>
          Potrzebujemy dostepu do kamery
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Przyznaj dostep</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Anuluj</Text>
        </Pressable>
      </View>
    );
  }

  // Camera mode
  if (mode === "camera") {
    return (
      <GestureHandlerRootView style={[styles.container, { paddingTop: safeArea.top }]}>
        <GestureDetector gesture={pinchGesture}>
          <View style={styles.cameraFlex}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              enableTorch={flashOn}
              zoom={zoom}
            >
              {/* Header */}
              <View style={[styles.header, { paddingTop: safeArea.top + 10 }]}>
                <Pressable onPress={() => router.back()} hitSlop={10}>
                  <XMarkIcon size={28} color={Colors.white} />
                </Pressable>
                <Text style={styles.headerTitle}>Skanuj tekst</Text>
                <Pressable onPress={() => setFlashOn(!flashOn)} hitSlop={10}>
                  {flashOn ? (
                    <BoltIcon size={28} color={Colors.accent_500} />
                  ) : (
                    <BoltSlashIcon size={28} color={Colors.white} />
                  )}
                </Pressable>
              </View>

              {/* Zoom indicator */}
              {zoom > 1 && (
                <View style={styles.zoomIndicator}>
                  <Text style={styles.zoomIndicatorText}>
                    {(1 + zoom * 9).toFixed(1)}x
                  </Text>
                </View>
              )}

              {/* Bottom controls */}
              <View style={[styles.cameraControls, { paddingBottom: safeArea.bottom + 20 }]}>
                <Pressable style={styles.sourceButton} onPress={pickFromLibrary}>
                  <PhotoIcon size={28} color={Colors.white} />
                  <Text style={styles.sourceButtonText}>Galeria</Text>
                </Pressable>

                <Pressable
                  style={styles.captureButton}
                  onPress={takePhoto}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator size="small" color={Colors.primary_700} />
                  ) : (
                    <View style={styles.captureButtonInner} />
                  )}
                </Pressable>

                <View style={styles.sourceButton}>
                  <CameraIcon size={28} color={Colors.white} />
                  <Text style={styles.sourceButtonText}>Kamera</Text>
                </View>
              </View>
            </CameraView>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  // Preview mode with selection
  const displayDims = getDisplayDimensions();

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.container, { paddingTop: safeArea.top }]}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <Pressable onPress={resetToCamera} hitSlop={10}>
            <XMarkIcon size={28} color={Colors.primary_700} />
          </Pressable>
          <Text style={styles.previewHeaderTitle}>Zaznacz tekst</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Selection type toggle */}
        <View style={styles.selectionToggle}>
          <Pressable
            style={[
              styles.toggleButton,
              activeSelection === "front" && styles.toggleButtonActiveFront,
            ]}
            onPress={() => setActiveSelection("front")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                activeSelection === "front" && styles.toggleButtonTextActive,
              ]}
            >
              Przod
            </Text>
            {isProcessingFront && (
              <ActivityIndicator size="small" color={Colors.white} />
            )}
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              activeSelection === "back" && styles.toggleButtonActiveBack,
            ]}
            onPress={() => setActiveSelection("back")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                activeSelection === "back" && styles.toggleButtonTextActive,
              ]}
            >
              Tyl
            </Text>
            {isProcessingBack && (
              <ActivityIndicator size="small" color={Colors.white} />
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.previewScrollView}
          contentContainerStyle={styles.previewScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image with selection overlay */}
          <View style={styles.imageContainer}>
            <GestureDetector gesture={panGesture}>
              <View
                style={[
                  styles.imageWrapper,
                  { width: displayDims.width, height: displayDims.height },
                ]}
              >
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: displayDims.width,
                      height: displayDims.height,
                    }}
                    resizeMode="contain"
                  />
                )}

                {/* Front selection box */}
                {frontSelection && (
                  <View
                    style={[
                      styles.selectionBox,
                      styles.frontSelectionBox,
                      {
                        left: frontSelection.x,
                        top: frontSelection.y,
                        width: frontSelection.width,
                        height: frontSelection.height,
                      },
                    ]}
                  >
                    <Text style={styles.selectionLabel}>Przod</Text>
                  </View>
                )}

                {/* Back selection box */}
                {backSelection && (
                  <View
                    style={[
                      styles.selectionBox,
                      styles.backSelectionBox,
                      {
                        left: backSelection.x,
                        top: backSelection.y,
                        width: backSelection.width,
                        height: backSelection.height,
                      },
                    ]}
                  >
                    <Text style={styles.selectionLabelBack}>Tyl</Text>
                  </View>
                )}

                {/* Currently drawing box */}
                <Animated.View style={drawingBoxStyle} />
              </View>
            </GestureDetector>
          </View>

          {/* Text previews */}
          {(frontText || backText) ? (
            <Pressable style={styles.textPreviews} onPress={() => setShowTextPreview(true)}>
              {frontText ? (
                <View style={styles.textPreviewRow}>
                  <Text style={styles.textPreviewLabel}>Przod:</Text>
                  <Text style={styles.textPreviewText} numberOfLines={1}>
                    {frontText}
                  </Text>
                </View>
              ) : null}
              {backText ? (
                <View style={styles.textPreviewRow}>
                  <Text style={styles.textPreviewLabelBack}>Tyl:</Text>
                  <Text style={styles.textPreviewText} numberOfLines={1}>
                    {backText}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.textPreviewHint}>Kliknij, aby zobaczyc pelny tekst</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {/* Text preview modal */}
        <Modal
          visible={showTextPreview}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTextPreview(false)}
        >
          <View
            style={styles.textModalOverlay}
          >
              <View style={styles.textModalContent}>
              <ScrollView
                style={styles.textModalScroll}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
              >
              <View style={styles.textModalHeader}>
                <Text style={styles.textModalTitle}>Rozpoznany tekst</Text>
                <Pressable onPress={() => setShowTextPreview(false)} hitSlop={8}>
                  <XMarkIcon size={24} color={Colors.primary_700} />
                </Pressable>
              </View>

              
                {frontText ? (
                  <View style={styles.textModalSection}>
                    <Text style={styles.textModalLabel}>Przod</Text>
                    <View style={[styles.textModalBox, styles.textModalBoxFront]}>
                      <Text style={styles.textModalText} selectable>{frontText}</Text>
                    </View>
                  </View>
                ) : null}

                {backText ? (
                  <View style={styles.textModalSection}>
                    <Text style={styles.textModalLabelBack}>Tyl</Text>
                    <View style={[styles.textModalBox, styles.textModalBoxBack]}>
                      <Text style={styles.textModalText} selectable>{backText}</Text>
                    </View>
                  </View>
                ) : null}
                </ScrollView>


              <Pressable
                style={styles.textModalCloseButton}
                onPress={() => setShowTextPreview(false)}
              >
                <Text style={styles.textModalCloseButtonText}>Zamknij</Text>
              </Pressable>
              </View>
          </View>
        </Modal>

        {/* Bottom actions */}
        <View style={[styles.bottomActions, { paddingBottom: safeArea.bottom }]}>
          <Pressable
            style={[
              styles.addCardButton,
              !frontText.trim() && styles.addCardButtonDisabled,
            ]}
            onPress={handleAddCard}
            disabled={!frontText.trim() || isProcessingFront || isProcessingBack}
          >
            <Text style={styles.addCardButtonText}>Dodaj karte</Text>
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary_100,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cameraFlex: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerTitle: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },
  zoomIndicator: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: -20,
  },
  zoomIndicatorText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
  cameraControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sourceButton: {
    alignItems: "center",
    gap: 4,
    width: 70,
  },
  sourceButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    color: Colors.white,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Colors.primary_500,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary_500,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  previewHeaderTitle: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  selectionToggle: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: Colors.primary_700_30,
  },
  toggleButtonActiveFront: {
    backgroundColor: Colors.primary_500,
  },
  toggleButtonActiveBack: {
    backgroundColor: Colors.accent_500,
  },
  toggleButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary_700,
  },
  toggleButtonTextActive: {
    color: Colors.white,
  },
  previewScrollView: {
    flex: 1,
  },
  previewScrollContent: {
    alignItems: "center",
    paddingBottom: 10,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  },
  selectionBox: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 4,
  },
  frontSelectionBox: {
    borderColor: Colors.primary_500,
    backgroundColor: "rgba(79, 166, 100, 0.15)",
  },
  backSelectionBox: {
    borderColor: Colors.accent_500,
    backgroundColor: "rgba(255, 159, 67, 0.15)",
  },
  selectionLabel: {
    fontFamily: Fonts.primary,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.white,
    backgroundColor: Colors.primary_500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectionLabelBack: {
    fontFamily: Fonts.primary,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.white,
    backgroundColor: Colors.accent_500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textPreviews: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  textPreviewRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  textPreviewLabel: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary_500,
  },
  textPreviewLabelBack: {
    fontFamily: Fonts.primary,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.accent_500,
  },
  textPreviewText: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  addCardButton: {
    backgroundColor: Colors.primary_500,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  addCardButtonDisabled: {
    opacity: 0.5,
  },
  addCardButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },
  permissionText: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    color: Colors.primary_700,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary_500,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginBottom: 15,
  },
  permissionButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
  },
  textPreviewHint: {
    fontFamily: Fonts.primary,
    fontSize: 11,
    color: Colors.primary_700_50,
    textAlign: "center",
    marginTop: 4,
  },
  textModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  textModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "70%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  textModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  textModalTitle: {
    fontFamily: Fonts.primary,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary_700,
  },
  textModalScroll: {
    flexShrink: 1,
  },
  textModalSection: {
    marginBottom: 16,
  },
  textModalLabel: {
    fontFamily: Fonts.primary,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary_500,
    marginBottom: 8,
  },
  textModalLabelBack: {
    fontFamily: Fonts.primary,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.accent_500,
    marginBottom: 8,
  },
  textModalBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  textModalBoxFront: {
    backgroundColor: "rgba(79, 166, 100, 0.08)",
    borderColor: Colors.primary_500,
  },
  textModalBoxBack: {
    backgroundColor: "rgba(255, 159, 67, 0.08)",
    borderColor: Colors.accent_500,
  },
  textModalText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.primary_700,
    lineHeight: 24,
  },
  textModalCloseButton: {
    marginTop: 16,
    backgroundColor: Colors.primary_100,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  textModalCloseButtonText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_700,
  },
});

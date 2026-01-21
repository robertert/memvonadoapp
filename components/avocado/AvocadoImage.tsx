import React from "react";
import { View, Image, StyleSheet, ImageSourcePropType } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useSharedValue,
} from "react-native-reanimated";
import { AVOCADO_IMAGE_SIZES } from "@/constants/avocado";
import { Colors } from "@/constants/colors";

// Placeholder image - używane dla wszystkich obrazków dopóki nie zostaną dodane właściwe assety
const placeholderImage = require("@/assets/images/avocado/phases/phase-1.png");

const phaseImages: Record<number, { normal: ImageSourcePropType; wilted: ImageSourcePropType }> = {
  1: {
    normal: require("@/assets/images/avocado/phases/phase-1.png"),
    wilted: require("@/assets/images/avocado/phases/phase-1-wilted.png"),
  },
  2: {
    normal: require("@/assets/images/avocado/phases/phase-2.png"),
    wilted: require("@/assets/images/avocado/phases/phase-2-wilted.png"),
  },
  3: {
    normal: require("@/assets/images/avocado/phases/phase-3.png"),
    wilted: require("@/assets/images/avocado/phases/phase-3-wilted.png"),
  },
  4: {
    normal: require("@/assets/images/avocado/phases/phase-4.png"),
    wilted: require("@/assets/images/avocado/phases/phase-4-wilted.png"),
  },
  5: {
    normal: require("@/assets/images/avocado/phases/phase-5.png"),
    wilted: require("@/assets/images/avocado/phases/phase-5-wilted.png"),
  },
};

// TODO: Odkomentuj gdy dodasz właściwe obrazki skórek
// Skin images (for collection display)
// const skinImages: Record<string, ImageSourcePropType> = {
//   classic_avo: require("@/assets/images/avocado/skins/classic_avo.png"),
//   happy_avo: require("@/assets/images/avocado/skins/happy_avo.png"),
//   sleepy_avo: require("@/assets/images/avocado/skins/sleepy_avo.png"),
//   nerd_avo: require("@/assets/images/avocado/skins/nerd_avo.png"),
//   cool_avo: require("@/assets/images/avocado/skins/cool_avo.png"),
//   golden_avo: require("@/assets/images/avocado/skins/golden_avo.png"),
//   glitch_avo: require("@/assets/images/avocado/skins/glitch_avo.png"),
// };

// TODO: Odkomentuj gdy dodasz obrazek locked placeholder
// Locked placeholder
// const lockedPlaceholder = require("@/assets/images/avocado/ui/locked_placeholder.png");

interface AvocadoImageProps {
  phase?: 1 | 2 | 3 | 4 | 5;
  skinId?: string;
  size?: "small" | "medium" | "large";
  wilted?: boolean;
  showGlow?: boolean;
  locked?: boolean; // For collection - shows blurred placeholder
}

export default function AvocadoImage({
  phase,
  skinId,
  size = "medium",
  wilted = false,
  showGlow = false,
  locked = false,
}: AvocadoImageProps): React.JSX.Element {
  const imageSize = AVOCADO_IMAGE_SIZES[size];

  // Animated glow effect
  const glowOpacity = useSharedValue(0.5);
  const glowScale = useSharedValue(1);

  React.useEffect(() => {
    if (showGlow) {
      // Pulsing glow animation
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.10, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = 0;
      glowScale.value = 1;
    }
  }, [showGlow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  let imageSource: ImageSourcePropType;

  if (locked) {
    imageSource = placeholderImage;
    //imageSource = lockedPlaceholder;
  } 
  /*
  else if (skinId && skinImages[skinId]) {
    imageSource = placeholderImage;
    //imageSource = skinImages[skinId];
  } */
  else if (phase && phaseImages[phase]) {
    imageSource = wilted ? phaseImages[phase].wilted : phaseImages[phase].normal;
  } else {
    imageSource = phaseImages[1].normal;
  }

  // Tymczasowo używamy placeholder dla wszystkich obrazków

  return (
    <View style={[styles.container, { width: imageSize, height: imageSize }]}>
      {/* Glow layer */}
      {showGlow && (
        <Animated.View
          style={[
            styles.glowLayer,
            { width: imageSize, height: imageSize },
            glowStyle,
          ]}
        />
      )}

      {/* Main image */}
      <Image
        source={imageSource}
        style={[
          styles.image,
          { width: imageSize, height: imageSize },
          locked && styles.lockedImage,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    borderRadius: 8,
  },
  lockedImage: {
    opacity: 0.7,
  },  
  glowLayer: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: Colors.accent_500,
    shadowColor: Colors.accent_500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
});

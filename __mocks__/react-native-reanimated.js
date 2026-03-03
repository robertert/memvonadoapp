// Minimal stub for react-native-reanimated.
// Only type-level exports are needed; these are never called at runtime.
module.exports = {
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: (fn) => fn(),
  withSpring: (v) => v,
  withTiming: (v) => v,
  runOnJS: (fn) => fn,
  SharedValue: null,
};

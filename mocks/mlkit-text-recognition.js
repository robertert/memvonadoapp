// Stub for @react-native-ml-kit/text-recognition used only on local iOS
// simulator dev builds (see DISABLE_MLKIT in react-native.config.js and the
// conditional resolver in metro.config.js). MLKit has no arm64-simulator slice,
// so the native module is unlinked there; this keeps the OCR screen from
// crashing and simply returns no recognized text.
export default {
  recognize: async () => ({ text: "", blocks: [] }),
};

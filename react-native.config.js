// Temporary local dev helper.
//
// Google MLKit ships no arm64-simulator slice, so the pod forces
// EXCLUDED_ARCHS = arm64 on the simulator, producing an x86_64 build that
// cannot run on the arm64-only iOS 26 simulator runtimes.
//
// Setting DISABLE_MLKIT=1 unlinks the MLKit native module for iOS so the app
// builds natively as arm64 and runs on the simulator (text recognition is
// stubbed via metro.config.js in that case). Never set this for device / EAS /
// production builds - leave it unset there and MLKit works normally.
const disableMlkit = process.env.DISABLE_MLKIT === "1";

module.exports = {
  dependencies: {
    ...(disableMlkit
      ? { "@react-native-ml-kit/text-recognition": { platforms: { ios: null } } }
      : {}),
  },
};

// Learn more https://docs.expo.io/guides/customizing-metro

const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Temporary: on local iOS simulator dev builds (DISABLE_MLKIT=1) the MLKit
// native module is unlinked, so swap its JS entry for a stub. Device / EAS /
// production builds leave DISABLE_MLKIT unset and use the real module.
if (process.env.DISABLE_MLKIT === "1") {
  const mlkitStub = path.resolve(__dirname, "mocks/mlkit-text-recognition.js");
  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "@react-native-ml-kit/text-recognition") {
      return { type: "sourceFile", filePath: mlkitStub };
    }
    const resolver = defaultResolveRequest || context.resolveRequest;
    return resolver(context, moduleName, platform);
  };
}

module.exports = config;

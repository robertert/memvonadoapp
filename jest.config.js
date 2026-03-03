/**
 * Root Jest config for frontend unit tests (no Firebase emulator required).
 * Backend tests live under functions/ and use functions/jest.config.js.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    // Resolve @/ path alias used throughout the project
    "^@/(.*)$": "<rootDir>/$1",
    // Stub React Native modules so pure-utility tests don't need a full RN env
    "^react-native$": "<rootDir>/__mocks__/react-native.js",
    "^react-native-reanimated$":
      "<rootDir>/__mocks__/react-native-reanimated.js",
    "^react-native-gesture-handler$":
      "<rootDir>/__mocks__/react-native-gesture-handler.js",
  },
  // Don't run backend integration tests from the root runner
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/functions/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  // transformIgnorePatterns: allow ts-fsrs to be transformed (it ships ESM)
  transformIgnorePatterns: ["node_modules/(?!(ts-fsrs)/)"],
  testTimeout: 10000,
};

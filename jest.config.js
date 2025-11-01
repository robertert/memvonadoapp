module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Type declarations are picked up by tsconfig include; don't load .d.ts as setup file
  testMatch: ["**/__tests__/**/*.(ts|tsx|js)", "**/*.(test|spec).(ts|tsx|js)"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-reanimated|@react-native-async-storage|expo|@expo|expo-router|expo-linear-gradient|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-heroicons|ts-fsrs)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "services/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
};

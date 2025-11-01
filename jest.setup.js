import "react-native-gesture-handler/jestSetup";

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: "test-deck-id" }),
}));

// Mock Firebase
jest.mock("./firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock firebase/auth (ESM) to avoid ESM parsing by Jest
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(() => () => {}),
}));

// Mock cloud functions
const mockCloudFunctions = {
  getDeckDetails: jest.fn(),
  getUserSettings: jest.fn(),
  getDueDeckCards: jest.fn(),
  getNewDeckCards: jest.fn(),
  updateCardProgress: jest.fn(),
};

jest.mock("./services/cloudFunctions", () => ({
  cloudFunctions: mockCloudFunctions,
}));

// Export mocks for use in tests
global.mockCloudFunctions = mockCloudFunctions;

// Do not mock UserContext module here; tests provide their own Provider values

// Mock console.log to reduce noise in tests
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    args[0].includes("cardLogicState")
  ) {
    return; // Skip cardLogicState logs
  }
  originalConsoleLog(...args);
};

// Global test utilities
global.mockDate = (dateString) => {
  const mockDate = new Date(dateString);
  jest.spyOn(global, "Date").mockImplementation(() => mockDate);
  return mockDate;
};

global.restoreDate = () => {
  jest.restoreAllMocks();
};

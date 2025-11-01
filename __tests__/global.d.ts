// Global type declarations for tests
declare global {
  var mockCloudFunctions: {
    getDeckDetails: jest.Mock;
    getUserSettings: jest.Mock;
    getDueDeckCards: jest.Mock;
    getNewDeckCards: jest.Mock;
    updateCardProgress: jest.Mock;
  };
}

export {};

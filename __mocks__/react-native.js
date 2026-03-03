// Minimal React Native stub for pure-utility Jest tests.
// Only the APIs actually used by tested modules are implemented.
module.exports = {
  Dimensions: {
    get: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
  },
  Platform: {
    OS: "ios",
    select: (obj) => obj.ios ?? obj.default,
  },
};

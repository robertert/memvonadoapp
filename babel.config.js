module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@/app": "./app",
            "@/constants": "./constants",
            "@/store": "./store",
            "@/ui": "./ui",
            "@/assets": "./assets",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};

// Learn more https://docs.expo.io/guides/customizing-metro

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Dodaj aliasy zgodne z tsconfig.json
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Obsługa aliasów @/*
  if (moduleName.startsWith("@/")) {
    const newModuleName = moduleName.replace("@/", "./");
    return context.resolveRequest(context, newModuleName, platform);
  }
  // Domyślna logika rozwiązywania
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

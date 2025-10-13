module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    // Wyłączamy reguły formatowania, żeby nie kolidowały z Prettier
    "import/no-unresolved": 0,
    // Wyłączamy reguły formatowania, które kolidują z Prettier
    quotes: "off",
    indent: "off",
    "object-curly-spacing": "off",
    "array-bracket-spacing": "off",
    "operator-linebreak": "off",
    "max-len": "off",
    "comma-dangle": "off",
    semi: "off",
    "quote-props": "off", // Wyłączamy sprawdzanie spójności cudzysłowów w nazwach właściwości
  },
};

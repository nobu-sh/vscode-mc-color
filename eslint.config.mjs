import { config, configs } from "@ariesclark/eslint-config";
import node from "@ariesclark/eslint-config/node";

export default config({
  extends: [...configs.recommended, ...node],
  rules: {
    "prettier/prettier": [
      "warn",
      {
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: false,
        jsxSingleQuote: false,
        trailingComma: "none"
      },
      {
        usePrettierrc: false
      }
    ]
  }
});

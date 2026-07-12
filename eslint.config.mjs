import antfu from "@antfu/eslint-config";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default antfu(
  {
    type: "app",
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
  },
  {
    rules: {
      "ts/no-redeclare": "off",
      "ts/no-namespace": "off",
      "ts/consistent-type-definitions": "off",
      "ts/no-require-imports": "off",
      "node/file-extension-in-import": ["error", "always"],
      "node/prefer-global/buffer": "off",
      "no-console": ["warn"],
      "antfu/no-top-level-await": ["off"],
      "node/prefer-global/process": ["off"],
      "node/no-process-env": ["off"],
      "new-cap": "off",
      "no-useless-catch": "off",
      "prefer-const": "off",
      "regexp/no-unused-capturing-group": "off",
      "style/no-trailing-spaces": "off",
      "unicorn/prefer-number-properties": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "jsdoc/check-alignment": "off",
      "jsdoc/check-param-names": "off",
      "jsdoc/require-returns-description": "off",
      "perfectionist/sort-imports": [
        "error",
        {
          tsconfigRootDir: ".",
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: ["README.md"],
        },
      ],
      "test/prefer-lowercase-title": ["off"],
    },
  }
);

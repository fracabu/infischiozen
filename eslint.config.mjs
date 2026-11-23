// ESLint flat config, based on the rule-mcp scaffold (rule-toolchain-eslint).
// The @stylistic padding rules enforce two rule-mcp guardrails the scaffold
// does not cover: js-blank-line-before-return and js-blank-lines-blocks.
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  unicorn.configs.recommended,
  {
    plugins: { "@stylistic": stylistic },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-console": "off",
      "prefer-const": "error",
      "unicorn/prevent-abbreviations": "off",
      // rule-mcp file tree: PascalCase component folders, camelCase modules.
      "unicorn/filename-case": ["error", { cases: { kebabCase: true, camelCase: true, pascalCase: true } }],
      // JSDoc keeps its leading asterisks: rule-mcp requires JSDoc blocks.
      "unicorn/no-asterisk-prefix-in-documentation-comments": "off",
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
      "@stylistic/indent": ["error", 2],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: "*", next: "multiline-block-like" },
        { blankLine: "always", prev: "multiline-block-like", next: "*" },
        { blankLine: "always", prev: "*", next: ["multiline-const", "multiline-let", "multiline-expression"] },
        { blankLine: "always", prev: ["multiline-const", "multiline-let", "multiline-expression"], next: "*" },
      ],
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["server/**", "scripts/**", "tests/**", "*.config.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    ignores: ["dist/", "build/", "coverage/", "node_modules/", "dati/", ".claude/", ".githooks/"],
  },
]);

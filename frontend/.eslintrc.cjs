/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  rules: {
    // Hard rule from CLAUDE.md §3: the frontend is a pure face. Importing an
    // LLM SDK here is an architectural violation — fail the lint, not just review.
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "openai", message: "LLM SDKs belong in backend/. The frontend is UI/UX only." },
          { name: "@anthropic-ai/sdk", message: "LLM SDKs belong in backend/. The frontend is UI/UX only." },
          { name: "groq-sdk", message: "LLM SDKs belong in backend/. The frontend is UI/UX only." },
          { name: "langchain", message: "LangChain belongs in backend/. The frontend is UI/UX only." },
        ],
        patterns: [
          { group: ["langchain/*", "@langchain/*"], message: "LangChain belongs in backend/." },
        ],
      },
    ],
    "react-refresh/only-export-components": "warn",
  },
};

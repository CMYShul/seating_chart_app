import { defineConfig } from "eslint/config";

export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"]
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "warn"
    }
  }
];

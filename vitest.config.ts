import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/core/**/__tests__/**/*.test.ts",
      "src/core/__tests__/*.test.ts",
    ],
    deps: {
      inline: [/^@\/core/],
    },
  },
});

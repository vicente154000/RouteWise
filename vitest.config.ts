import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/core/**/__tests__/**/*.test.{ts,tsx}",
      "src/core/__tests__/*.test.{ts,tsx}",
    ],
    setupFiles: ["src/core/__tests__/test-setup.ts"],
    deps: {
      inline: [/^@\/core/],
    },
  },
});

process.env.VITEST_SKIP_INSTALL_CHECKS = "1";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fallbackPlugin } from "./vite.config";

export default defineConfig({
  plugins: [fallbackPlugin(), react({ fastRefresh: false })],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});

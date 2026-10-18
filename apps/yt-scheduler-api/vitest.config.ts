import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vitest/config";

function sqlText(): Plugin {
  return {
    name: "sql-text",
    load(id) {
      const file = id.split("?")[0] ?? id;
      if (!file.endsWith(".sql")) return null;
      return `export default ${JSON.stringify(readFileSync(file, "utf8"))};`;
    },
  };
}

export default defineConfig({
  plugins: [sqlText()],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

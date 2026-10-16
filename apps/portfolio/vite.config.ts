import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export function fallbackPlugin(): Plugin {
  const fallbacks: Record<string, string> = {
    "./styles/index.css": path.resolve(__dirname, "src/router/fallbacks/styles.css"),
    "./content": path.resolve(__dirname, "src/router/fallbacks/content.ts"),
    "./os/boot": path.resolve(__dirname, "src/router/fallbacks/boot.tsx"),
    "./os/window-manager": path.resolve(__dirname, "src/router/fallbacks/window-manager.tsx"),
    "./os/desktop": path.resolve(__dirname, "src/router/fallbacks/desktop.tsx"),
    "./classic": path.resolve(__dirname, "src/router/fallbacks/classic.tsx"),
  };

  return {
    name: "portfolio-fallbacks",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "/src/main.tsx" || source === "src/main.tsx") {
        return path.resolve(__dirname, "src/main.tsx");
      }
      if (!importer) return null;

      if (source in fallbacks) {
        const candidate = path.resolve(path.dirname(importer), source);
        const extensions = ["", ".ts", ".tsx", ".css", "/index.ts", "/index.tsx"];
        const exists = extensions.some((ext) => fs.existsSync(candidate + ext));
        if (!exists) {
          return fallbacks[source];
        }
      }

      if (source.startsWith("./") || source.startsWith("../")) {
        const dir = path.dirname(importer);
        const resolved = path.resolve(dir, source);
        const extensions = ["", ".tsx", ".ts", ".jsx", ".js", ".css", "/index.tsx", "/index.ts"];
        for (const ext of extensions) {
          const fullPath = resolved + ext;
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            return fullPath;
          }
        }
      }

    if (process.env.VITEST) {
      if (source === "react/jsx-dev-runtime") {
        const req = createRequire(importer);
        const dir = path.dirname(req.resolve("react/package.json"));
        return path.join(dir, "cjs/react-jsx-dev-runtime.development.js");
      }
      if (source === "react/jsx-runtime") {
        const req = createRequire(importer);
        const dir = path.dirname(req.resolve("react/package.json"));
        return path.join(dir, "cjs/react-jsx-runtime.development.js");
      }
      if (source === "react") {
        const req = createRequire(importer);
        const dir = path.dirname(req.resolve("react/package.json"));
        return path.join(dir, "cjs/react.development.js");
      }
      if (source === "react-dom") {
        const req = createRequire(importer);
        const dir = path.dirname(req.resolve("react-dom/package.json"));
        return path.join(dir, "cjs/react-dom.development.js");
      }
    }
      if (source === "react-dom/test-utils") {
        const req = createRequire(importer);
        const dir = path.dirname(req.resolve("react-dom/package.json"));
        return path.join(dir, "cjs/react-dom-test-utils.development.js");
      }
      if (source === "scheduler") {
        try {
          const req = createRequire(importer);
          const dir = path.dirname(req.resolve("scheduler/package.json"));
          return path.join(dir, "cjs/scheduler.development.js");
        } catch {
          // try via react-dom
          const reqDom = createRequire(importer);
          const reactDomPath = reqDom.resolve("react-dom");
          const reqSched = createRequire(reactDomPath);
          const dir = path.dirname(reqSched.resolve("scheduler/package.json"));
          return path.join(dir, "cjs/scheduler.development.js");
        }
      }
      if (source === "@testing-library/react") {
        const req = createRequire(importer);
        const dir = path.dirname(req.resolve("@testing-library/react/package.json"));
        return path.join(dir, "dist/@testing-library/react.esm.js");
      }
      if (source === "@testing-library/dom") {
        try {
          const req = createRequire(importer);
          const dir = path.dirname(req.resolve("@testing-library/dom/package.json"));
          return path.join(dir, "dist/@testing-library/dom.esm.js");
        } catch {
          const reqRtl = createRequire(importer);
          const rtlPath = reqRtl.resolve("@testing-library/react");
          const reqDom = createRequire(rtlPath);
          const dir = path.dirname(reqDom.resolve("@testing-library/dom/package.json"));
          return path.join(dir, "dist/@testing-library/dom.esm.js");
        }
      }

      if (
        !source.startsWith(".") &&
        !path.isAbsolute(source) &&
        source !== "vitest" &&
        !source.startsWith("vitest/")
      ) {
        try {
          const req = createRequire(importer);
          return req.resolve(source);
        } catch {
          // ignore
        }
      }

      return null;
    },
    load(id) {
      const filePath = id.split("?")[0];
      if (
        /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|svg)$/.test(filePath) &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()
      ) {
        return fs.readFileSync(filePath, "utf-8");
      }
      return null;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [fallbackPlugin(), react()],
});

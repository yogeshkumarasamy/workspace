import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { normalizeAppBase } from "./base-path.mjs";

const base = normalizeAppBase();

/** Public font URLs follow Vite's base, including previews. */
function publicAbsoluteUrls(): Plugin {
  return {
    name: "portfolio-public-base",
    transform(code, id) {
      if (!id.endsWith(".css") || !code.includes('url("/fonts/')) return null;
      return code.replaceAll('url("/fonts/', `url("${base}fonts/`);
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), publicAbsoluteUrls()],
});

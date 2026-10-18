import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { normalizeAppBase } from "./base-path.mjs";
import { legalPagesPlugin } from "./legal-pages.mjs";

const base = normalizeAppBase();
const pwaEnabled = process.env.VITE_PWA !== "off";

function nodeProxy(prefix: string): ProxyOptions {
  const stripped = prefix.replace(/\/$/, "");
  return {
    target: "http://localhost:8787",
    changeOrigin: true,
    rewrite: (requestPath) => requestPath.replace(new RegExp(`^${stripped}`), "") || "/",
  };
}

const icons = [
  { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" as const },
  { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" as const },
  { src: "icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" as const },
  { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" as const },
];

export default defineConfig({
  base,
  root: "web",
  plugins: [
    react(),
    legalPagesPlugin(base),
    VitePWA({
      disable: !pwaEnabled,
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon-32.png"],
      manifest: {
        id: base,
        name: "YT Scheduler",
        short_name: "YT Sched",
        description: "Schedule and manage YouTube uploads for your channels",
        theme_color: "#e11d48",
        background_color: "#0a0a0c",
        display: "standalone",
        orientation: "any",
        start_url: base,
        scope: base,
        categories: ["productivity", "video"],
        icons,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/api\//, /\/oauth\//, /\/privacy(?:\/|$)/, /\/terms(?:\/|$)/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/api/") || url.pathname.includes("/oauth/"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  css: { postcss: __dirname },
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: base === "/"
      ? { "/api": "http://localhost:8787", "/oauth": "http://localhost:8787" }
      : { [`${base}api`]: nodeProxy(base), [`${base}oauth`]: nodeProxy(base) },
  },
});

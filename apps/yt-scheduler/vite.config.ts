import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "web",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // we show our own "Update available" toast and also check hourly
      injectRegister: false,
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon-32.png"],
      manifest: {
        id: "/",
        name: "YT Scheduler",
        short_name: "YT Sched",
        description: "Schedule and manage YouTube uploads for your channels",
        theme_color: "#e11d48",
        background_color: "#0a0a0c",
        display: "standalone",
        orientation: "any",
        start_url: "/?source=pwa",
        scope: "/",
        categories: ["productivity", "video"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/oauth\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Never cache API or OAuth: always live, fail when offline.
          { urlPattern: ({ url }) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/oauth/"), handler: "NetworkOnly" },
        ],
      },
    }),
  ],
  css: { postcss: __dirname },
  build: { outDir: "../dist/web", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": "http://localhost:8787", "/oauth": "http://localhost:8787" } },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createAnalyzePlugin } = require("../../vite/createAnalyzePlugin.cjs");
const isAnalyze = process.env.ANALYZE === "true";
const analyzePlugin = createAnalyzePlugin();

/** Local CORS bypass: browser → localhost → orionai.euroland.com */
const ORION_AI_PROXY_PREFIX = "/orionai-euroland.com";

const buildOrionAiInsightsProxy = () => {
  const raw = process.env.REACT_APP_ORION_AI_INSIGHTS_URL;
  if (!raw || !/^https?:\/\//i.test(raw)) return {};
  try {
    const { origin } = new URL(raw);
    const prefixRe = new RegExp(`^${ORION_AI_PROXY_PREFIX.replace(/\./g, "\\.")}`);
    return {
      [ORION_AI_PROXY_PREFIX]: {
        target: origin,
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        autoRewrite: true,
        protocolRewrite: "http",
        rewrite: (p) => p.replace(prefixRe, "") || "/",
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const location = proxyRes.headers?.location;
            if (!location) return;
            try {
              const redirected = new URL(location, origin);
              if (redirected.origin === origin) {
                proxyRes.headers.location = `${ORION_AI_PROXY_PREFIX}${redirected.pathname}${redirected.search}${redirected.hash}`;
              }
            } catch {
              // ignore
            }
          });
        },
      },
    };
  } catch {
    return {};
  }
};

export default defineConfig(() => {
  // Dynamically map all env variables loaded by env-cmd starting with REACT_APP_
  const processEnvValues = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("REACT_APP_") || key === "NODE_ENV") {
      processEnvValues[`process.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  return {
    plugins: [
      react(),
      ...(analyzePlugin ? [analyzePlugin] : []),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        // Use apps/internal/public/manifest.json (linked in index.html)
        manifest: false,
        includeAssets: [
          "manifest.json",
          "euroland-logo_square.png",
          "euroland-logo-144x144.png",
          "euroland-logo-192x192.png",
          "euroland-logo-512x512.png",
        ],
        workbox: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot,json}",
          ],
          // Docker rewrites this file at container startup. It must always
          // come from nginx, never from a previous service-worker precache.
          globIgnores: ["**/env-config.js"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/env-config\.js$/,
            /\/[^/?]+\.[^/]+$/,
          ],
          runtimeCaching: [
            {
              urlPattern: ({ request }) =>
                request.destination === "image" ||
                request.destination === "font",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-media",
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        "@orion/shared": path.resolve(__dirname, "../../packages/shared"),
        styles: path.resolve(__dirname, "src/styles"),
        pages: path.resolve(__dirname, "src/pages"),
        store: path.resolve(__dirname, "src/store"),
        utils: path.resolve(__dirname, "src/utils"),
        services: path.resolve(__dirname, "src/services"),
        components: path.resolve(__dirname, "src/components"),
        hooks: path.resolve(__dirname, "src/hooks"),
        assets: path.resolve(__dirname, "src/assets"),
        constant: path.resolve(__dirname, "src/constant"),
        constants: path.resolve(__dirname, "src/constants"),
        events: path.resolve(__dirname, "../../node_modules/events/events.js"),
        "~bootstrap": path.resolve(__dirname, "../../node_modules/bootstrap"),
      },
    },
    css: {
      lightningcss: {
        // Legacy Bootstrap / vendor rules (e.g. *display hacks) — do not fail the build
        errorRecovery: true,
      },
      preprocessorOptions: {
        scss: {
          includePaths: [path.resolve(__dirname, "../../node_modules")],
          silenceDeprecations: ["import", "global-builtin", "color-functions"],
        },
      },
    },
    define: {
      ...processEnvValues,
      "process.env": {}, // fallback define for standard process.env checks
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        ...buildOrionAiInsightsProxy(),
      },
    },
    build: {
      outDir: "build",
      assetsDir: "static",
      sourcemap: isAnalyze,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react-router-dom")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("node_modules/react-bootstrap") ||
              id.includes("node_modules/bootstrap")
            ) {
              return "vendor-bootstrap";
            }
          },
        },
      },
    },
  };
});

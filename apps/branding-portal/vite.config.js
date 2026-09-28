import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createAnalyzePlugin } = require("../../vite/createAnalyzePlugin.cjs");
const isAnalyze = process.env.ANALYZE === "true";
const analyzePlugin = createAnalyzePlugin();

export default defineConfig(() => {
  // Dynamically map all env variables loaded by env-cmd starting with REACT_APP_
  const processEnvValues = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("REACT_APP_") || key === "NODE_ENV") {
      processEnvValues[`process.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  return {
    plugins: [react(), ...(analyzePlugin ? [analyzePlugin] : [])],
    resolve: {
      alias: {
        "@orion/shared": path.resolve(__dirname, "../../packages/shared"),
        "styles": path.resolve(__dirname, "src/styles"),
        "pages": path.resolve(__dirname, "src/pages"),
        "store": path.resolve(__dirname, "src/store"),
        "utils": path.resolve(__dirname, "src/utils"),
        "services": path.resolve(__dirname, "src/services"),
        "components": path.resolve(__dirname, "src/components"),
        "events": path.resolve(__dirname, "../../node_modules/events/events.js"),
        "~bootstrap": path.resolve(__dirname, "../../node_modules/bootstrap"),
      },
    },
    css: {
      lightningcss: {
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
    },
    build: {
      outDir: "build",
      assetsDir: "static",
      sourcemap: isAnalyze,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react") || 
                id.includes("node_modules/react-dom") || 
                id.includes("node_modules/react-router-dom")) {
              return "vendor-react";
            }
            if (id.includes("node_modules/react-bootstrap") || 
                id.includes("node_modules/bootstrap")) {
              return "vendor-bootstrap";
            }
          }
        }
      }
    }
  };
});

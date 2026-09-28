/**
 * Rollup bundle visualizer (treemap) — Vite replacement for webpack-bundle-analyzer.
 * Enabled when ANALYZE=true (see .env.analyze and npm run analyze:*).
 */
function createAnalyzePlugin() {
  if (process.env.ANALYZE !== "true") {
    return null;
  }

  const { visualizer } = require("rollup-plugin-visualizer");

  return visualizer({
    filename: "build/stats.html",
    title: "Bundle analysis",
    open: true,
    gzipSize: true,
    brotliSize: true,
    template: "treemap",
  });
}

module.exports = { createAnalyzePlugin };

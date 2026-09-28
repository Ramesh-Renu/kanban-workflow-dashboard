const path = require("path");
const purgecss = require("@fullhuman/postcss-purgecss").default;

/** Stylesheets that must never be purged (third-party + runtime-generated class names). */
const SKIP_PURGE_PATTERNS = [
  /node_modules[/\\]/,
  /[/\\]styles[/\\]vendor\.scss$/,
  /packages[/\\]shared[/\\]src[/\\]styles[/\\]fonts[/\\]/,
  /packages[/\\]shared[/\\]src[/\\]styles[/\\]icons[/\\]/,
  /@euroland[/\\]react[/\\]/,
];

function shouldPurge(file) {
  if (!file) {
    return false;
  }
  const normalized = file.replace(/\\/g, "/");
  return !SKIP_PURGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * PostCSS config factory for Vite apps.
 * PurgeCSS runs only on application SCSS in production — not Bootstrap, Euroland, fonts, or IcoMoon.
 *
 * @param {string} appDir Absolute path to apps/<name>
 */
function createAppPostcssConfig(appDir) {
  const contentGlobs = [
    path.join(appDir, "src/**/*.{js,jsx,ts,tsx}"),
    path.join(appDir, "src/**/*.scss"),
    path.join(appDir, "index.html"),
    path.join(appDir, "../../packages/shared/src/**/*.{js,jsx,ts,tsx}"),
    path.join(appDir, "../../packages/shared/src/**/*.scss"),
  ];

  return (ctx) => {
    const plugins = [require("autoprefixer")];

    if (process.env.NODE_ENV === "production" && shouldPurge(ctx?.file)) {
      plugins.push(
        purgecss({
          content: contentGlobs,
          defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
          // App-only libraries that add classes at runtime (not Bootstrap / icons)
          safelist: {
            standard: [/^ql-/, /^quill-/, /^react-flow/, /^rdt/],
            deep: [/^ql-/, /^react-flow/, /^rdt/],
            greedy: [/react-datetime/],
          },
        }),
      );
    }

    return { plugins };
  };
}

module.exports = createAppPostcssConfig;

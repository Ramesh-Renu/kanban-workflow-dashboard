# IcoMoon icon font (shared)

Single source for both `internal` and `branding-portal` apps.

## Updating icons

1. Export from [IcoMoon](https://icomoon.io/app/#/select/font) and replace files in this folder:
   - `fonts/` (`.woff`, `.ttf`, `.eot`, `.svg`)
   - `variables.scss`
   - `style.scss`
2. Restart dev or rebuild — no per-app copies required.

Apps load icons via `import "@orion/shared/src/styles/icons/style.scss"` in `App.jsx` so Vite resolves font URLs from this directory.

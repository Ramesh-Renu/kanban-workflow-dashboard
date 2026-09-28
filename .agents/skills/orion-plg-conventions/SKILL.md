---
name: orion-plg-conventions
description: |
  Apply when working on the orion-plg monorepo (any file under apps/, packages/, or project root).
  Covers project structure, naming conventions, state management patterns, component authoring,
  service layer patterns, styling rules, and Vite alias usage for the Orion PLG internal portal.
---

# Orion PLG — Project Conventions & Patterns

## 1. Monorepo Layout

```
orion-plg/
├── apps/
│   ├── internal/          # Main internal portal (@orion/internal)
│   └── branding-portal/   # Branding portal app (@orion/branding-portal)
├── packages/
│   └── shared/            # Cross-app shared library (@orion/shared)
├── vite/                  # Shared Vite plugin helpers
├── postcss/               # Shared PostCSS config
└── package.json           # Workspace root (npm workspaces)
```

**Key rules:**
- Root `package.json` uses **npm workspaces** (`apps/*`, `packages/*`).
- Always run scripts from the workspace root using `-w` flag (e.g. `npm start -w @orion/internal`).
- Never install packages directly inside `apps/` or `packages/` without updating the root lock file.

---

## 2. `apps/internal` — Source Structure

```
src/
├── App.jsx                  # Root router — lazy-loads all pages
├── index.jsx                # Entry point — wraps with providers & MSAL
├── authConfig.js            # MSAL B2C + ORG instance & request configs
├── assets/                  # Static images/icons
├── components/
│   ├── common/              # Reusable UI components (no page-specific logic)
│   ├── kanban/              # Kanban-specific complex components
│   ├── layout/              # Shell/layout wrappers (sidebar, user-layout)
│   └── routing/             # Route gates (ProtectedRoute, DashboardAccessGate, KnowledgeBaseAccessGate)
├── constant/                # App-wide constants (ColorCodes, common, countryList)
├── hooks/                   # Custom React hooks (use-prefixed, camelCase) — includes useKnowledgeBase
├── pages/                   # Page-level components (folder = page, index.jsx = entry)
│                            # KnowledgeBase/, OrderOrion/, Settings/, Dashboard/, …
├── services/                # API call functions (index.js = single export file)
├── store/
│   ├── context/             # React context providers (GlobalProvider, SocketProvider)
│   └── reducers/            # Per-slice reducers (one file per domain)
├── styles/
│   ├── index.scss           # App entry stylesheet (imports components/ and pages/)
│   ├── vendor.scss          # Third-party overrides (Bootstrap etc.) — PurgeCSS excluded
│   ├── components/          # Component-scoped SCSS partials
│   ├── pages/               # Page-scoped SCSS partials
│   └── mixins/              # SCSS mixins and functions
├── translations/            # i18n JSON files
└── utils/                   # Pure utility functions (common.jsx, dashboard.js, etc.)
```

---

## 3. Vite Path Aliases (Use These — Never Relative `../../`)

Defined in `apps/internal/vite.config.js`. Always import using these aliases:

| Alias | Resolves to |
|---|---|
| `@orion/shared` | `packages/shared` |
| `styles` | `src/styles` |
| `pages` | `src/pages` |
| `store` | `src/store` |
| `utils` | `src/utils` |
| `services` | `src/services` |
| `components` | `src/components` |
| `hooks` | `src/hooks` |
| `assets` | `src/assets` |
| `constant` | `src/constant` |
| `authConfig` | `src/authConfig.js` |

**Example:**
```js
// CORRECT
import useAuth from "hooks/useAuth";
import { globalMaster } from "services";
import { GATEWAY } from "@orion/shared/src/constant/plg-gateWayService";

// WRONG
import useAuth from "../../hooks/useAuth";
```

---

## 4. State Management — Context + `useReducer` (No Redux)

The app uses **React Context + `useReducer`** via a combined root reducer pattern.

### 4a. Adding a New Reducer

1. **Create** the reducer file in `src/store/reducers/<featureName>Reducer.js`.

   ```js
   // src/store/reducers/myFeatureReducer.js
   export const initialMyFeatureState = {
     data: [],
     loading: false,
     error: null,
   };

   export const myFeatureReducer = (state, action) => {
     switch (action?.type) {
       case "MY_FEATURE_LOADING":
         return { ...state, loading: true, error: null };
       case "MY_FEATURE_SUCCESS":
         return { ...state, data: action.payload, loading: false, error: null };
       case "MY_FEATURE_ERROR":
         return { ...state, loading: false, error: action.payload };
       default:
         return state;
     }
   };
   ```

   **State shape convention:** Every slice must have at minimum: `{ data, loading, error }`.

2. **Register** it in `src/store/context/GlobalProvider.jsx`:
   - Import `initialMyFeatureState` and `myFeatureReducer`.
   - Add to `rootReducer` object: `myFeatureState: myFeatureReducer`.
   - Add to `initialState` object: `myFeatureState: initialMyFeatureState`.

3. **Access** via `useGlobalContext()`:
   ```js
   const { myFeatureState, dispatch } = useGlobalContext();
   ```

### 4b. Master Data Reducer Pattern (Generic Key-Based)

`masterDataReducer` uses a generic `key` in `action.payload` to manage multiple data lists with a single reducer. Use action types `"LOADING"`, `"SUCCESS"`, `"ERROR"` with `{ key, data }` payload:

```js
dispatch({ type: "LOADING", payload: { key: "countryList" } });
dispatch({ type: "SUCCESS", payload: { key: "countryList", data: res.data } });
dispatch({ type: "ERROR", payload: { key: "countryList", error: err.message } });
```

---

## 5. Custom Hooks

- **Location:** `src/hooks/use<FeatureName>.js`
- **Naming:** Always `use`-prefixed camelCase.
- **Return pattern:** Return a **tuple** `[stateObj, actionsObj]` (same as the `useAuth` pattern):

```js
const useMyFeature = () => {
  const { myFeatureState, dispatch } = useGlobalContext();

  const fetchData = useCallback(async (params) => {
    dispatch({ type: "MY_FEATURE_LOADING" });
    try {
      const res = await myFeatureService(params);
      dispatch({ type: "MY_FEATURE_SUCCESS", payload: res.data });
      return { type: "myFeature/fulfilled", payload: res.data };
    } catch (error) {
      const meta = getApiErrorMeta(error);
      dispatch({ type: "MY_FEATURE_ERROR", payload: meta.message });
      return { type: "myFeature/rejected", error: meta };
    }
  }, [dispatch]);

  return [
    {
      data: myFeatureState.data,
      loading: myFeatureState.loading,
      error: myFeatureState.error,
    },
    { fetchData },
  ];
};

export default useMyFeature;
```

- Use `useCallback` for all async action functions with `[dispatch]` dependency.
- Use `useLayoutEffect` (not `useEffect`) for auth/token-related side effects.

---

## 6. Services Layer

**Location:** `src/services/index.js` — a **single flat export file** for all API functions.

**Pattern:**
```js
import plgBaseAPI from "@orion/shared/src/services/plgBaseAPI";
import { WITHOUTGATEWAY } from "@orion/shared/src/constant/service";
import { GATEWAY } from "@orion/shared/src/constant/plg-gateWayService";

// Live default (GATEWAY switch is commented in repo):
const API = WITHOUTGATEWAY;

/** MY FEATURE */
export const getMyFeatureList = (params) => plgBaseAPI.GET(API.GET_MY_FEATURE_LIST, params);
```

- Use `plgBaseAPI` — never raw `axios`.
- Group with `/** DOMAIN NAME */` comments.
- Add path constants to **both** `service.js` (WITHOUTGATEWAY) and `plg-gateWayService.js` (GATEWAY).
- Knowledge Base wrappers live under `/** KNOWLEDGE BASE */` … see skill `orion-plg-knowledge-base`.

---

## 7. Component Authoring (`.jsx`)

### Naming & File Structure

- **Common/reusable components:** `src/components/common/MyComponent.jsx` (PascalCase)
- **Page-level components:** `src/pages/MyPage/index.jsx` (folder = page name)
- **Route guard components:** `src/components/routing/route-guards.jsx`
- Use **named function components** (not arrow function default exports for pages).

### Page Component Pattern

```jsx
// src/pages/MyPage/index.jsx
import React from "react";
import { Outlet } from "react-router-dom";  // if layout page

const MyPage = () => {
  return (
    <main id="my-page-main" className="my-page-container" aria-label="My Page">
      {/* content */}
    </main>
  );
};

export default MyPage;
```

### Lazy Loading (App.jsx pattern)

All pages **must** be lazy-loaded in `App.jsx`:

```js
/** MY FEATURE PAGES */
const MyPage = lazy(() => import("pages/MyPage"));
const MyPageDetail = lazy(() => import("pages/MyPage/Detail"));
```

### Routing (App.jsx)

- Use `react-router-dom` v6 with `<Routes>` / `<Route>`.
- Wrap protected routes with route-guard components from `components/routing/route-guards`.
- Nest sub-routes using `<Outlet>`.
- Group routes with comments by feature area.

---

## 8. Styling — SCSS

- **Extension:** `.scss` only. No CSS modules, no inline styles for layout.
- **Variables:** Use CSS custom properties (e.g., `var(--color-light-light-gray)`) defined in `@orion/shared/src/styles/variables.scss`. Never hardcode raw color hex values directly in component SCSS.
- **Vendor styles:** Import Bootstrap and third-party overrides only in `vendor.scss` (excluded from PurgeCSS).
- **App styles:** Import component and page partials from `styles/index.scss`.

```scss
// SCSS file per component in styles/components/_my-component.scss
.my-component {
  &__header { ... }
  &__body { ... }
  &--modifier { ... }
}
```

- Use BEM-like naming for class selectors.
- Import shared icon styles: `@orion/shared/src/styles/icons/style.scss` (already in App.jsx).

---

## 9. `packages/shared` — Shared Library

**Location:** `packages/shared/src/`  
**Package name:** `@orion/shared`

### Adding a Shared Export

1. Create the component/hook/util under `packages/shared/src/<category>/`.
2. Export from `packages/shared/src/index.js`:
   ```js
   export { default as MySharedComponent } from './components/MySharedComponent';
   export { default as useMySharedHook } from './hooks/useMySharedHook';
   ```
3. Import in consuming apps as: `import { MySharedComponent } from "@orion/shared"`.

### Shared Service APIs

- `plgBaseAPI` — main PLG backend API client (injects auth token from context).
- `orionAiInsightsAPI` — AI insights API client (separate base URL).
- Both use `injectStore(state)` called from `GlobalProvider` to access the access token from context — **never** import `axios` directly in apps.

---

## 10. Environment Variables

- Prefix: `REACT_APP_` (e.g., `REACT_APP_MODE`, `REACT_APP_ORION_AI_INSIGHTS_URL`).
- Accessed as `process.env.REACT_APP_*` (mapped by Vite config's `define`).
- Environment files: `.env.testing`, `.env.production.clone`, `.env.analyze` at project root.

---

## 11. Key Dependencies

| Package | Purpose |
|---|---|
| `react` ^18 | UI framework |
| `react-router-dom` ^6 | Client-side routing |
| `react-bootstrap` / `bootstrap` ^5 | UI component library |
| `@azure/msal-react` | Azure AD / B2C authentication |
| `i18next` + `react-i18next` | Internationalization |
| `dayjs` | Date/time utilities (prefer over `moment`) |
| `lodash` | Utility functions |
| `axios` | HTTP (used only inside `plgBaseAPI` / `orionAiInsightsAPI`) |
| `vite` | Build tool (with `@vitejs/plugin-react-swc`) |
| `sass` | SCSS compilation |
| `vite-plugin-pwa` | PWA support |

---

## 12. Do's and Don'ts

**DO:**
- Use path aliases instead of relative imports going more than one level up.
- Group dispatch actions with `try/catch/finally` inside hooks.
- Return error metadata using `getApiErrorMeta(error)` from `@orion/shared`.
- Use `useCallback` with `[dispatch]` dependency for hook action functions.
- Lazy-load every new page component in `App.jsx`.
- Add new API constants to **both** `service.js` and `plg-gateWayService.js` before using in services.
- For Knowledge Base, Settings, or Kanban domain work, follow the matching `.cursor/skills/orion-plg-*` skill.
- Use `dayjs` for all date manipulation.
- Use `useGlobalContext()` to access state — never prop-drill context.

**DON'T:**
- Don't import `axios` directly in app code — use `plgBaseAPI`.
- Don't use Redux or Zustand — the project uses Context + useReducer.
- Don't use inline `style={{}}` for layout or theming — use SCSS classes.
- Don't use TailwindCSS — project uses SCSS with Bootstrap.
- Don't create new pages without adding a lazy route in `App.jsx`.
- Don't add shared utilities/components directly in `apps/` — put them in `packages/shared`.
- Don't use `moment.js` — use `dayjs`.
- Don't hardcode API URLs in components — always use gateway constants.

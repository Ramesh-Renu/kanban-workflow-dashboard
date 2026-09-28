const trimUrl = (value) => {
  if (value == null) return "";
  const text = String(value).trim();
  return text ? text.replace(/\/+$/, "") : "";
};

const PROCESS_ENV_BY_KEY = {
  REACT_APP_PLG_API_BASE_URL: process.env.REACT_APP_PLG_API_BASE_URL,
};

export const getRuntimeEnv = (key, fallback = "") => {
  const fromWindow = trimUrl(window._env_?.[key]);
  const fromProcess = trimUrl(PROCESS_ENV_BY_KEY[key]);
  return fromWindow || fromProcess || fallback;
};

export const didRuntimeEnvConfigFail = () =>
  Boolean(typeof window !== "undefined" && window._env_load_error);

/** API URL required before sign-in (login is served by the API). Empty after env-config.js timeout. */
export const isRuntimeAuthConfigReady = () =>
  Boolean(getRuntimeEnv("REACT_APP_PLG_API_BASE_URL"));

/**
 * Resolve Orion AI Insights base URL at call time (reads runtime env-config.js).
 * - Localhost: `/orionai-euroland.com` (Vite proxy → https://orionai.euroland.com)
 * - Deployed: absolute URL from REACT_APP_ORION_AI_INSIGHTS_URL
 *
 * Empty/missing URL must NOT fall back to the app origin (that caused
 * https://preprodorion.euroland.com/summarization in preprod).
 */
export const getOrionAiInsightsUrl = () => {
  const fromWindow = trimUrl(window._env_?.REACT_APP_ORION_AI_INSIGHTS_URL);
  const fromProcess = trimUrl(process.env.REACT_APP_ORION_AI_INSIGHTS_URL);
  const raw = fromWindow || fromProcess;
  if (!raw) return "";

  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";

  // Dev-only proxy path — never use this on deployed hosts
  if (isLocal && /^https?:\/\//i.test(raw)) {
    return "/orionai-euroland.com";
  }

  // Production / preprod must be absolute (https://orionai.euroland.com)
  if (!/^https?:\/\//i.test(raw)) {
    return "";
  }

  return raw;
};

/**
 * Resolve Kimai (time tracking) base URL at call time (reads runtime
 * env-config.js). Kimai's CORS already allows all origins for /api/, so
 * unlike Orion AI Insights, no localhost dev-proxy rewrite is needed here —
 * the raw absolute URL works both for the local Docker instance
 * (http://localhost:8001) and the deployed one (https://in-timetracking.euroland.com).
 */
export const getOrionTimeTrackingUrl = () => {
  const fromWindow = trimUrl(window._env_?.REACT_APP_ORION_TIME_TRACKING_URL);
  const fromProcess = trimUrl(process.env.REACT_APP_ORION_TIME_TRACKING_URL);
  return fromWindow || fromProcess || "";
};

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  plgBaseUrl:
    window._env_?.REACT_APP_PLG_API_BASE_URL || process.env.REACT_APP_PLG_API_BASE_URL,
  socketUrl: window._env_?.REACT_APP_SOCKET_URL || process.env.REACT_APP_SOCKET_URL,
  brandingGuidelinesUrl:
    window._env_?.REACT_APP_BRANDING_GUIDELINES_URL ||
    process.env.REACT_APP_BRANDING_GUIDELINES_URL,
  get orionAiInsightsUrl() {
    return getOrionAiInsightsUrl();
  },
  get orionTimeTrackingUrl() {
    return getOrionTimeTrackingUrl();
  },
  log: false,
  trackHttpTimeInConsole: false,
  trackHttpResponseInConsole: false,
};

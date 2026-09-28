import axios from "axios";
import Config from "../config";
import { setExpiresOn } from "../utils/storage";

/**
 * Username/password JWT session (replaces Azure MSAL).
 *
 * Tokens come from the Python API (`/master/auth/login`, `/master/auth/refresh`).
 * This module is the single source of truth for them; React state (authState.accessToken)
 * is kept in sync by the callers via setAuth().
 */

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const EXPIRES_KEY = "expiresOn";
const LOGIN_PATH = "/master/auth/login";
const REFRESH_PATH = "/master/auth/refresh";
const LOGOUT_PATH = "/master/api/AdManagement/sign-out";
/** Refresh a little before expiry so in-flight requests don't race the deadline. */
const EXPIRY_SKEW_SECONDS = 30;

const listeners = new Set();
let refreshInFlight = null;

// Plain axios (not axiosBase) so auth calls skip the token-waiting interceptor.
const authHttp = () =>
  axios.create({
    baseURL: Config.plgBaseUrl,
    headers: { "Content-Type": "application/json" },
  });

const read = (key) => {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

const notify = () => listeners.forEach((fn) => fn());

export const getAccessToken = () => read(ACCESS_KEY);
export const getRefreshToken = () => read(REFRESH_KEY);

export const getAccessTokenExpiry = () => {
  const value = Number(read(EXPIRES_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
};

export const isAccessTokenFresh = () => {
  const exp = getAccessTokenExpiry();
  return Boolean(getAccessToken() && exp && exp - EXPIRY_SKEW_SECONDS > Date.now() / 1000);
};

/** Signed in = we hold a refresh token (the access token can always be renewed). */
export const hasSession = () => Boolean(getRefreshToken());

const saveSession = ({ accessToken, refreshToken, expiresOn }) => {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  setExpiresOn(expiresOn);
  notify();
  return { accessToken, expiresOn };
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  setExpiresOn("");
  notify();
};

export const loginWithPassword = async (username, password) => {
  const { data } = await authHttp().post(LOGIN_PATH, { username, password });
  return saveSession(data);
};

/** Exchange the refresh token for a new pair. Concurrent callers share one request. */
export const refreshSession = () => {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new Error("No active session"));

  refreshInFlight = authHttp()
    .post(REFRESH_PATH, { refreshToken })
    .then(({ data }) => saveSession(data))
    .catch((error) => {
      // Only a definite rejection ends the session; network blips keep it for a retry.
      if (error?.response?.status === 401) clearSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

/** A usable access token, refreshing first when it is missing or about to expire. */
export const ensureAccessToken = async () => {
  if (isAccessTokenFresh()) {
    return { accessToken: getAccessToken(), expiresOn: getAccessTokenExpiry() };
  }
  return refreshSession();
};

/** Revoke the refresh token server-side (best effort) and drop local tokens. */
export const logoutSession = async () => {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  clearSession();
  if (!refreshToken) return;
  try {
    await authHttp().put(
      LOGOUT_PATH,
      { refreshToken },
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    );
  } catch (error) {
    console.warn("Server sign-out failed; local session cleared anyway.", error);
  }
};

export const subscribeSession = (listener) => {
  listeners.add(listener);
  const onStorage = (event) => {
    if ([ACCESS_KEY, REFRESH_KEY, EXPIRES_KEY, null].includes(event.key)) listener();
  };
  window.addEventListener("storage", onStorage); // other tabs signing in/out
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

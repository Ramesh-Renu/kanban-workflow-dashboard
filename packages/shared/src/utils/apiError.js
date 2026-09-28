import Config, { didRuntimeEnvConfigFail, isRuntimeAuthConfigReady } from "../config";

export const API_ERROR_TYPES = {
  CORS: "cors_error",
  NETWORK: "network_error",
  SERVER: "server_error",
  UNKNOWN: "unknown_error",
};

const isBrowserNetworkFailure = (error) => {
  if (!error) return false;
  if (error.code === "ERR_NETWORK") return true;
  if (error.message === "Network Error") return true;
  return !error.response && Boolean(error.request);
};

/**
 * Classify axios / fetch failures for UI and retry logic.
 */
export const getApiErrorMeta = (error) => {
  if (!error) {
    return {
      type: API_ERROR_TYPES.UNKNOWN,
      title: "Something went wrong",
      message: "An unexpected error occurred. Please try again.",
    };
  }

  if (isBrowserNetworkFailure(error)) {
    const apiBase = Config.plgBaseUrl || "the API server";
    return {
      type: API_ERROR_TYPES.CORS,
      title: "Cannot reach the application server",
      message: `Your sign-in succeeded, but the browser could not load data from ${apiBase}. This is usually a CORS or network configuration issue (API not running, wrong API URL in .env, or missing CORS headers on the server).`,
    };
  }

  const status = error.response?.status;
  const serverMessage =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.response?.statusText;

  if (status >= 500) {
    return {
      type: API_ERROR_TYPES.SERVER,
      title: "Server error",
      message:
        serverMessage ||
        "The server encountered a problem. Please try again in a few minutes.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      type: API_ERROR_TYPES.SERVER,
      title: "Access denied",
      message:
        serverMessage ||
        "You do not have permission to access this resource, or your session has expired.",
    };
  }

  return {
    type: API_ERROR_TYPES.UNKNOWN,
    title: "Request failed",
    message: serverMessage || error.message || "Something went wrong. Please try again.",
  };
};

export const getApiErrorMessage = (error) => getApiErrorMeta(error).message;

export const isConnectionBlockedError = (error) => {
  const type = getApiErrorMeta(error).type;
  return type === API_ERROR_TYPES.CORS || type === API_ERROR_TYPES.NETWORK;
};

export const getRuntimeConfigErrorMeta = () => ({
  type: API_ERROR_TYPES.NETWORK,
  title: "Cannot reach the application server",
  message:
    "The server is not responding, so sign-in configuration could not be loaded. Please try again when the server is available.",
});

export const isMsalConfigOrNetworkError = (error) => {
  const code = String(error?.errorCode || error?.code || "");
  const message = String(error?.message || error || "");
  return (
    didRuntimeEnvConfigFail() ||
    !isRuntimeAuthConfigReady() ||
    code === "empty_url_error" ||
    code === "empty_input_error" ||
    code === "endpoints_resolution_error" ||
    message.includes("empty_url") ||
    message.includes("URL was empty") ||
    message.includes("endpoints_resolution")
  );
};

export const getLoginConnectionErrorMeta = (error) => {
  if (didRuntimeEnvConfigFail() || !isRuntimeAuthConfigReady() || isMsalConfigOrNetworkError(error)) {
    return getRuntimeConfigErrorMeta();
  }
  return null;
};

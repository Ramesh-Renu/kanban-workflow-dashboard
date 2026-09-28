import axios from "axios";
import Config from "../config";
import loggerService from "./logger.service";
import { getApiErrorMeta, isConnectionBlockedError } from "../utils/apiError";
import {
  setExpiresOn,
  setActiveWorkSpace,
  setDeepLinkURL,
} from "../utils/storage";
import { clearSession } from "./authSession";
import { getKimaiCredentials } from "../utils/kimaiCredentials";

// Request methods
const GET = "GET";
const POST = "POST";
const PUT = "PUT";
const DELETE = "DELETE";

let setAuthFn;
let toastFn;
let logoutUserFn;

export const injectDependencies = ({
  setAuth,
  showToast,
  logoutUser,
}) => {
  setAuthFn = setAuth;
  toastFn = showToast;
  logoutUserFn = logoutUser;
};

const requestTracker = {};
let lastConnectionErrorToastAt = 0;
const CONNECTION_ERROR_TOAST_COOLDOWN_MS = 15000;

const notifyConnectionErrorOnce = (error) => {
  if (!toastFn || !isConnectionBlockedError(error)) return;
  const now = Date.now();
  if (now - lastConnectionErrorToastAt < CONNECTION_ERROR_TOAST_COOLDOWN_MS) return;
  lastConnectionErrorToastAt = now;
  const { title, message } = getApiErrorMeta(error);
  toastFn({
    title,
    message,
    variant: "danger",
  });
};

const allowDuplicateEndpoints = [
  // "/OrderTicketing/api/OrderTicketManagement/status-type?type=",
];

/**
 * Kimai JSON API headers.
 * Auth uses Kimai API password headers (not MSAL / PHP session cookies).
 */
export function getHttpHeader() {
  return {
    Accept: "application/json",
  };
}

export const axiosBase = axios.create({
  headers: getHttpHeader(),
});

// Active Kimai credentials for the current Orion user (module-level, kept in
// sync via injectStore below — mirrors how plgBaseAPI.js keeps AppStore in
// sync). Not read fresh from localStorage on every request.
let activeKimaiCredentials = null;
let lastKimaiUserName = null;

/** Push newly-saved credentials immediately, without waiting for the next store update. */
export const setActiveKimaiCredentials = (creds) => {
  activeKimaiCredentials = creds || null;
};

export const injectStore = (store) => {
  const userName = store?.authState?.activeUser?.data?.details?.userName ?? null;
  if (userName === lastKimaiUserName) return;
  lastKimaiUserName = userName;
  activeKimaiCredentials = getKimaiCredentials(userName);
};

// Create an Axios request interceptor — Kimai API token auth
axiosBase.interceptors.request.use(
  (config) => {
    // Always resolve at request time so Docker runtime env-config.js is used
    const baseURL = Config.orionTimeTrackingUrl;
    if (baseURL == null || baseURL === "") {
      return Promise.reject(
        new Error(
          "REACT_APP_ORION_TIME_TRACKING_URL is not set. Expected https://in-timetracking.euroland.com",
        ),
      );
    }
    config.baseURL = baseURL;

    // Strip Orion/MSAL headers — Kimai does not use them
    delete config.headers["Authorization"];
    delete config.headers["User-From-Frontend"];
    delete config.headers["WorkspaceId"];
    delete config.headers["UserType"];
    delete config.headers["Timezone"];
    delete config.headers["Access-Control-Allow-Origin"];

    // Kimai API Token auth (Profile → API Access → "+ Create") — per Orion
    // user, not a shared global credential. A token alone identifies the
    // Kimai user, no separate username needed. See kimaiCredentials.js /
    // injectStore above.
    const { token } = activeKimaiCredentials || {};
    if (!token) {
      const err = new Error(
        "Kimai account not connected. Connect your Kimai account (API Token from Kimai Profile → API Access) to log time.",
      );
      err.code = "KIMAI_NOT_CONNECTED";
      return Promise.reject(err);
    }
    config.headers["Authorization"] = `Bearer ${token}`;

    // GET/DELETE should not send Content-Type (also triggers preflight)
    const method = (config.method || "get").toLowerCase();
    if (method === "get" || method === "head" || method === "delete") {
      delete config.headers["Content-Type"];
    }

    if (allowDuplicateEndpoints.some((ep) => config.url.includes(ep))) {
      return config;
    }

    const requestKey = `${config.method}-${config.url}-${JSON.stringify(
      config.params,
    )}`;

    if (requestTracker[requestKey]) {
      return Promise.resolve(requestTracker[requestKey]);
    }

    // Mark the request as in-progress
    const cancelTokenSource = axios.CancelToken.source();
    config.cancelToken = cancelTokenSource.token;

    // Track the ongoing request
    const requestPromise = axiosBase(config).then(
      (response) => response,
      (error) => Promise.reject(error),
    );

    requestTracker[requestKey] = requestPromise;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
let isSessionExpired = false;
let lastForcedLogoutAt = 0;
const FORCED_LOGOUT_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Never force Orion logout on Kimai 401s — Kimai auth is separate from MSAL.
 */
const shouldForceLogoutOn401 = () => false;

// Response Interceptor to clean up request tracker
axiosBase.interceptors.response.use(
  (response) => {
    const requestKey = `${response.config.method}-${
      response.config.url
    }-${JSON.stringify(response.config.params)}`;
    delete requestTracker[requestKey]; // Remove the request from the tracker after completion
    return response;
  },
  // (error) => {
  //   const requestKey = `${error.config.method}-${
  //     error.config.url
  //   }-${JSON.stringify(error.config.params)}`;
  //   delete requestTracker[requestKey]; // Clean up in case of error
  //   return Promise.reject(error);
  // }

  async (error) => {
    // Safely clean up the request tracker
    if (error.config) {
      const requestKey = `${error.config.method}-${error.config.url}-${JSON.stringify(error.config.params)}`;
      delete requestTracker[requestKey];
    }

    // Check if the error is a 401 Unauthorized
    notifyConnectionErrorOnce(error);

    if (shouldForceLogoutOn401(error) && !isSessionExpired) {
      const now = Date.now();
      if (now - lastForcedLogoutAt < FORCED_LOGOUT_COOLDOWN_MS) {
        return Promise.reject(error);
      }
      lastForcedLogoutAt = now;
      isSessionExpired = true;
      console.warn("Session expired. Logging out user...");

      try {
        // Optionally show a toast or alert before redirect
        // alert("Your session has expired. Please log in again.");

        localStorage.setItem("sessionExpired", "true");
        setDeepLinkURL(""); // clear previous
        if (logoutUserFn) {
          logoutUserFn(); // Call the logout function to clear user state
        }

        if (toastFn) {
          toastFn({
            message:
              error.response?.data?.message ||
              "Session expired. Please log in again.",
            variant: "danger",
          });
        }

        if (setAuthFn) setAuthFn("");
        setExpiresOn("");
        setActiveWorkSpace("");

        clearSession();
        window.location.href = "/";
      } catch (logoutError) {
        console.error("Error handling 401 logout:", logoutError);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Http request
 */
export const request = async (
  method,
  path,
  httpParams,
  body,
  disableLoader = false,
  props,
) => {
  // Console request time
  consoleRequestResponseTime("request", Config.orionTimeTrackingUrl + "" + path);

  // Check method
  // eslint-disable-next-line default-case
  switch (method) {
    // Get
    case GET:
      return axiosBase
        .get(path, { params: httpParams })
        .then(function (response) {
          // handle success
          const processedData = processResponseData("success", path, response);
          return processedData;
        })
        .catch(function (error) {
          // handle error
          processResponseData("failure", path, error);
          throw error;
        })
        .finally(function () {});

    // Post
    case POST:
      return axiosBase
        .post(path, body, { params: httpParams })
        .then(function (response) {
          // handle success
          const processedData = processResponseData("success", path, response);
          return processedData;
        })
        .catch(function (error) {
          // handle error
          processResponseData("failure", path, error);
          throw error;
        })
        .finally(function () {});

    // Put
    case PUT:
      return axiosBase
        .put(path, body, { params: httpParams })
        .then(function (response) {
          // handle success
          const processedData = processResponseData("success", path, response);
          return processedData;
        })
        .catch(function (error) {
          // handle error
          processResponseData("failure", path, error);
          throw error;
        })
        .finally(function () {});
    // DELETE
    case DELETE:
      return axiosBase
        .delete(path, { data: body, params: httpParams })
        .then(function (response) {
          // handle success
          const processedData = processResponseData("success", path, response);
          return processedData;
        })
        .catch(function (error) {
          // handle error
          processResponseData("failure", path, error);
          throw error;
        })
        .finally(function () {});
  }
};

/**
 * Process the response data
 */
export const processResponseData = (type, path, data, failureMsg) => {
  // If success and data is object
  if (type === "success") {
    // data = convertNulltoEmpty(data);
    if (Config.trackHttpResponseInConsole) {
      loggerService.showLog("Response Success");
      loggerService.showLog(["Request Url", Config.orionTimeTrackingUrl + "" + path]);
      loggerService.showLog(["Body", data]);
    }
    return data;
  } else {
    if (Config.trackHttpResponseInConsole) {
      loggerService.showLog("Response Failure");
      loggerService.showLog(["Url", Config.orionTimeTrackingUrl + "" + path]);
      loggerService.showLog(["Body", data]);
    }

    /**
     * Show error msg if
     * 1. Message available in service
     * 2. Otherwise show custom error from each service request
     * 3. Otherwise, show default message 'Service Failure'
     */
    // Need to Confirm params
    console.log(failureMsg);
  }
};

/**
 * Convert json null to empty write console
 */
export const convertNulltoEmpty = (data) => {
  let stringifyData = JSON.stringify(data).replace(/null/i, '""');
  stringifyData = stringifyData.replace(/null/g, '""');
  const json = JSON.parse(stringifyData);
  return json;
};

/**
 * Request / Response Time Tracker
 */
const consoleRequestResponseTime = (type, url) => {
  if (Config.trackHttpTimeInConsole) {
    if (type === "request") {
      console.log("Request Url", url);
      console.log("Time Started", new Date());
    } else {
      console.log("Response Url", url);
      console.log("Time Ended", new Date());
    }
  }
};

/**
 * File upload handler
 */
export const doFileUpload = async (url, params) => {
  try {
    const formData = new FormData();
    if (params[0].body?.pageType === "comment") {
      // Append each file properly
      if (Array.isArray(params[0].files)) {
        params[0].files.forEach((file) => {
          formData.append("attachedFiles", file);
        });
      } else if (params[0].files instanceof File) {
        formData.append("attachedFiles", params[0].files);
      }
      formData.append("order_id", params[0].body?.order_id);
      formData.append("comment_id", params[0].body?.comment_id);
      formData.append("content", params[0].body?.content);
      formData.append("mentions", params[0].body?.mentions);
      if (params[0].body?.tool_ticket_id) {
        formData.append("tool_ticket_id", params[0].body.tool_ticket_id);
      }
      if (params[0].body?.boardId) {
        formData.append("board_id", params[0].body?.boardId);
      }
      if (params[0].body?.work_space_id) {
        formData.append("workspace_id", params[0].body?.work_space_id);
      }
      const deletedAttachmentIds =
        params[0].body?.deleted_attachments.join(",");

      formData.append("deleted_attachments", deletedAttachmentIds);
    } else {
      // Append each file properly
      if (Array.isArray(params[0].files)) {
        params[0].files.forEach((file) => {
          formData.append("files", file);
        });
      } else if (params[0].files instanceof File) {
        formData.append("files", params[0].files);
      }

      formData.append("module", `${params[0].body.module}`);
      formData.append("referenceId", `${params[0].body.referenceId}`);
    }
    const createXHR = () => new XMLHttpRequest();

    const response = await axios.post(url, formData, {
      baseURL: Config.orionAiInsightsUrl,
      headers: {
        Accept: "application/json",
      },
      httpAgent: createXHR,
    });

    const validResponse = response.data;
    const processedData = processResponseData("success", url, validResponse);
    return processedData;
  } catch (error) {
    console.error("Error during file upload:", error);
    throw error;
  }
};

/**
 * add tool info  data (link and attachments)
 **/

/**
 * Branding guidelines v2 — multipart save (section JSON + per-section files).
 */
export const uploadBrandingGuidelinesFormData = async (url, formData) => {
  try {
    const response = await axios.post(url, formData, {
      baseURL: Config.orionAiInsightsUrl,
      headers: {
        Accept: "application/json",
      },
    });
    const validResponse = response.data;
    return processResponseData("success", url, validResponse);
  } catch (err) {
    console.error("Branding guidelines upload error:", err);
    throw err;
  }
};

export const addToolInfoData = async (url, param) => {
  try {
    const formData = new FormData();
    formData.append("toolTicketInfoID", param[0]?.toolTicketInfoID ?? "");
    formData.append("toolTicketID", param[0]?.toolTicketID ?? "");
    formData.append("name", param[0]?.name ?? "");
    formData.append("toolLink", param[0]?.toolLink ?? "");
    formData.append("description", param[0]?.description ?? "");
    formData.append("type", param[0]?.type ?? "");
    formData.append("blobName", param[0]?.blobName ?? "");
    if (param[0].Files instanceof File) {
      formData.append("Files", param[0].Files);
    }
    // for (const [key, value] of formData.entries()) {
    //   console.log(`${key}:`, value);
    // }
    const response = await axios.post(url, formData, {
      baseURL: Config.orionAiInsightsUrl,
      headers: {
        Accept: "application/json",
      },
    });
    const validResponse = response.data;
    const processedData = processResponseData("success", url, validResponse);
    return processedData;
  } catch (err) {
    console.error("error", err);
  }
};

/**
 * File Download
 */
export const doFileDownload = async (
  path,
  httpParams,
  body,
  disableLoader = false,
) => {
  // Console request time
  consoleRequestResponseTime("request", Config.orionTimeTrackingUrl + "" + path);
  try {
    return axiosBase
      .get(path, {
        params: httpParams,
        responseType: "blob", // Ensure you get binary data
      })
      .then((res) => {
        if (res?.data) {
          const blob = new Blob([res.data]);
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;

          // Fallback for missing file name
          const fileName =
            body?.file_name || body?.fileName || "downloaded_file";
          link.setAttribute("download", fileName);

          document.body.appendChild(link);
          link.click();

          // Clean up
          link.remove();
          URL.revokeObjectURL(url);
        }
      })
      .catch(function (error) {
        processResponseData("failure", path, error);
        throw error;
      });
  } catch (error) {
    console.error("Error during file download:", error);
    throw error;
  }
};

export default {
  GET: (path, ...props) => request(GET, path, ...props),
  POST: (path, ...props) => request(POST, path, props.params, ...props),
  PUT: (path, ...props) => request(PUT, path, props.params, ...props),
  DELETE: (path, ...props) => request(DELETE, path, props.params, ...props),
  FILEUPLOAD: (path, ...props) => doFileUpload(path, props),
  FILEDOWNLOAD: (path, ...props) =>
    doFileDownload(path, props.params, ...props),
  ADD_TOOL_INFO_DATA: (path, ...props) => addToolInfoData(path, props),
  UPLOAD_BRANDING_GUIDELINES: (path, formData) =>
    uploadBrandingGuidelinesFormData(path, formData),
};

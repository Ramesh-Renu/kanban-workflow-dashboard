import axios from "axios";
import Config from "../config";
import loggerService from "./logger.service";
import { getApiErrorMeta, isConnectionBlockedError } from "../utils/apiError";
import {
  issetActiveWorkSpace,
  getActiveWorkSpace,
  issetAuthType,
  getAuthType,
  setExpiresOn,
  setActiveWorkSpace,
  setDeepLinkURL,
} from "../utils/storage";
import { clearSession, getAccessToken, refreshSession } from "./authSession";

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
  "downloadcommentfile",
];
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
/**
 * Set headers & base url
 */
export function getHttpHeader() {
  // Set default headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    Timezone: USER_TIMEZONE,
  };

  // if (issetAuthToken()) {
  //   headers['Authorization'] = `Bearer ${getAuthToken()}`;
  //   console.log(issetAuthToken(), getAuthToken())
  // }else{
  //   console.log(issetAuthToken(), getAuthToken())
  // }
  return headers;
}

export const axiosBase = axios.create({
  baseURL: Config.plgBaseUrl,
  headers: getHttpHeader(),
});

let AppStore; // placeholder

export const injectStore = (store) => {
  AppStore = store;
};

/** Session store first (updated synchronously on refresh), React store as fallback. */
const currentToken = () =>
  getAccessToken() || AppStore?.authState?.activeUser?.data?.accessToken;

const waitForToken = () => {
  return new Promise((resolve) => {
    const check = () => {
      const token = currentToken();
      if (token) {
        resolve(token);
      } else {
        setTimeout(check, 100); // Check every 100ms
      }
    };
    check();
  });
};

// Create an Axios request interceptor
axiosBase.interceptors.request.use(
  async (config) => {
    // Check if we should skip duplicate tracking for this request
    // if (config.params.skipDuplicateCheck) {
    //   return config; // If the flag is set, bypass the duplicate check and continue the request
    // }

    // Get the user's authentication status (you can use a state management library like Redux or React Context)

    // Public routes don't need to wait for a token
    const isPublicRoute = config.url.includes("/public/");
    const token = isPublicRoute ? null : await waitForToken();


    // Update the headers based on the user's authentication status
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      config.headers["User-From-Frontend"] = "true";
    } else {
      // Remove the Authorization header if the user is not authenticated
      delete config.headers["Authorization"];
    }

    if (issetActiveWorkSpace()) {
      config.headers["WorkspaceId"] = `${getActiveWorkSpace()}`;
    } else {
      // Remove the Authorization header if the user is not authenticated
      delete config.headers["WorkspaceId"];
    }

    if (issetAuthType()) {
      config.headers["UserType"] = `${getAuthType()}`;
    } else {
      delete config.headers["UserType"];
    }

    if (allowDuplicateEndpoints.some((ep) => config.url.includes(ep))) {
      return config;
    }

    // Blob downloads/previews must not enter the duplicate-tracker (it can deadlock
    // concurrent GETs to the same attachment URL, e.g. React Strict Mode remounts).
    if (config.responseType === "blob") {
      return config;
    }

    const requestKey = `${config.method}-${config.url}-${JSON.stringify(
      config.params,
    )}`;

    if (requestTracker[requestKey]) {
      // Cancel the duplicate request
      // const error = new Error('Duplicate request');
      // error.isDuplicate = true;
      // throw error;

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

const getErrorMessage = (error) =>
  (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.statusText ||
    ""
  )
    .toString()
    .toLowerCase();

/**
 * Only force logout for token/auth-expiry style 401s.
 * Avoid logging users out for generic endpoint-level 401s.
 */
const shouldForceLogoutOn401 = (error) => {
  if (error?.response?.status !== 401) return false;
  const message = getErrorMessage(error);
  const authHints = [
    "token",
    "jwt",
    "expired",
    "unauthorized",
    "invalid signature",
    "access denied",
    "auth",
  ];
  return authHints.some((hint) => message.includes(hint));
};

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

    // Expired access token: refresh once and replay the request before giving up.
    const original = error.config;
    if (
      error?.response?.status === 401 &&
      original &&
      !original._authRetried &&
      !String(original.url || "").includes("/master/auth/")
    ) {
      try {
        const { accessToken } = await refreshSession();
        if (setAuthFn) setAuthFn(accessToken);
        return axiosBase({ ...original, _authRetried: true });
      } catch {
        // fall through to the forced logout below
      }
    }

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
  consoleRequestResponseTime("request", Config.plgBaseUrl + "" + path);
  // console.log('props',props);

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
      loggerService.showLog(["Request Url", Config.plgBaseUrl + "" + path]);
      loggerService.showLog(["Body", data]);
    }
    return data;
  } else {
    if (Config.trackHttpResponseInConsole) {
      loggerService.showLog("Response Failure");
      loggerService.showLog(["Url", Config.plgBaseUrl + "" + path]);
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

    const token = currentToken();

    const response = await axios.post(url, formData, {
      baseURL: Config.plgBaseUrl,
      headers: {
        // Accept: "multipart/form-data",
        // "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
        "User-From-Frontend": true,
        Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    const token = currentToken();
    const response = await axios.post(url, formData, {
      baseURL: Config.plgBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "User-From-Frontend": true,
        Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    const token = currentToken();
    const response = await axios.post(url, formData, {
      baseURL: Config.plgBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "User-From-Frontend": true,
        Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
  consoleRequestResponseTime("request", Config.plgBaseUrl + "" + path);
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

/**
 * Fetch a file as Blob + object URL without triggering a browser download.
 * Caller must revoke `url` when done (URL.revokeObjectURL).
 * Concurrent GETs to the same path share one in-flight request (e.g. React Strict Mode).
 */
const inflightFileFetches = new Map();

export const doFileFetch = async (path, httpParams, body) => {
  consoleRequestResponseTime("request", Config.plgBaseUrl + "" + path);
  const cacheKey = `GET:${path}:${JSON.stringify(httpParams ?? null)}`;

  let shared = inflightFileFetches.get(cacheKey);
  if (!shared) {
    shared = (async () => {
      try {
        const res = await axiosBase.get(path, {
          params: httpParams,
          responseType: "blob",
        });
        if (!res?.data) {
          throw new Error("Empty file response");
        }
        const headerType =
          res.headers?.["content-type"] || res.headers?.["Content-Type"] || "";
        const mime =
          (headerType && !headerType.includes("octet-stream")
            ? headerType.split(";")[0].trim()
            : "") ||
          (res.data instanceof Blob ? res.data.type : "") ||
          "application/octet-stream";
        const blob =
          res.data instanceof Blob && res.data.type
            ? res.data
            : new Blob([res.data], { type: mime });
        const fileName = body?.file_name || body?.fileName || "file";
        return {
          blob,
          fileName,
          contentType: blob.type || mime,
        };
      } catch (error) {
        processResponseData("failure", path, error);
        throw error;
      } finally {
        inflightFileFetches.delete(cacheKey);
      }
    })();
    inflightFileFetches.set(cacheKey, shared);
  }

  const cached = await shared;
  return {
    blob: cached.blob,
    url: URL.createObjectURL(cached.blob),
    fileName: cached.fileName,
    contentType: cached.contentType,
  };
};

/**
 * Trigger a browser file download from a Blob.
 */
const triggerBrowserDownload = (blob, downloadName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", downloadName);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  // Keep object URL briefly so the browser can start the download.
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1500);
};

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const base64ToBlob = (base64, mimeType = EXCEL_MIME) => {
  const cleaned = String(base64).replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const extractExportFileFromJson = (payload, fallbackName) => {
  if (!payload || typeof payload !== "object") return null;

  const candidates = [
    payload,
    payload.data,
    payload.result,
    payload.Data,
    payload.Result,
  ].filter(Boolean);

  for (const item of candidates) {
    if (typeof item === "string") {
      // Absolute/relative file URL
      if (/^https?:\/\//i.test(item) || item.startsWith("/")) {
        return { url: item, fileName: fallbackName };
      }
      // Base64 excel/csv payload
      if (item.length > 64) {
        return {
          blob: base64ToBlob(item),
          fileName: payload.fileName || payload.fileDownloadName || fallbackName,
        };
      }
    }

    if (typeof item === "object") {
      const fileName =
        item.fileName ||
        item.fileDownloadName ||
        item.FileName ||
        item.FileDownloadName ||
        payload.fileName ||
        payload.fileDownloadName ||
        fallbackName;
      const mime =
        item.contentType ||
        item.ContentType ||
        payload.contentType ||
        EXCEL_MIME;
      const content =
        item.fileContents ||
        item.fileContent ||
        item.FileContents ||
        item.base64 ||
        item.base64String ||
        item.bytes ||
        item.fileBytes ||
        item.content ||
        item.data;

      if (typeof content === "string" && content.length > 64) {
        if (/^https?:\/\//i.test(content) || content.startsWith("/")) {
          return { url: content, fileName };
        }
        return { blob: base64ToBlob(content, mime), fileName };
      }

      if (Array.isArray(content)) {
        return {
          blob: new Blob([Uint8Array.from(content)], { type: mime }),
          fileName,
        };
      }
    }
  }

  return null;
};

/**
 * File Download via POST (binary / excel exports)
 * Uses a direct axios call (not axiosBase) to avoid the duplicate-request
 * interceptor short-circuiting binary responses.
 */
export const doFileDownloadPost = async (path, body, fileName) => {
  consoleRequestResponseTime("request", Config.plgBaseUrl + "" + path);
  try {
    const token = currentToken();
    const headers = {
      ...getHttpHeader(),
      "User-From-Frontend": true,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (issetActiveWorkSpace()) {
      headers.WorkspaceId = `${getActiveWorkSpace()}`;
    }
    if (issetAuthType()) {
      headers.UserType = `${getAuthType()}`;
    }

    const response = await axios.post(path, body, {
      baseURL: Config.plgBaseUrl,
      headers,
      responseType: "arraybuffer",
    });
    const buffer = response?.data;
    if (!buffer || (buffer.byteLength !== undefined && buffer.byteLength === 0)) {
      throw new Error("Export file is empty");
    }

    const contentType = (response?.headers?.["content-type"] || "").toLowerCase();
    const disposition = response?.headers?.["content-disposition"] || "";
    const matchedName = disposition.match(
      /filename\*?=(?:UTF-8''|")?([^\";]+)/i,
    );
    const downloadName =
      (matchedName?.[1] &&
        decodeURIComponent(matchedName[1].replace(/"/g, ""))) ||
      fileName ||
      `export-${Date.now()}.xlsx`;

    const bytes = new Uint8Array(buffer);
    // XLSX is a ZIP package (PK..). Prefer binary download when magic matches.
    const isZipBinary = bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
    const isOleBinary = bytes.length > 7 && bytes[0] === 0xd0 && bytes[1] === 0xcf; // legacy .xls

    // Detect JSON payload (common API envelope with base64/url).
    const looksLikeJson =
      !isZipBinary &&
      !isOleBinary &&
      (contentType.includes("application/json") ||
        contentType.includes("text/plain") ||
        contentType.includes("text/json") ||
        bytes[0] === 0x7b); // '{'

    if (looksLikeJson) {
      const text = new TextDecoder().decode(buffer);
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("Failed to parse export response");
      }

      if (payload?.status === false || payload?.Status === false) {
        throw new Error(payload?.message || payload?.Message || "Failed to export file");
      }

      const extracted = extractExportFileFromJson(payload, downloadName);
      if (!extracted) {
        throw new Error(payload?.message || payload?.Message || "Export file not found in response");
      }

      if (extracted.url) {
        const link = document.createElement("a");
        link.href = extracted.url;
        link.setAttribute("download", extracted.fileName || downloadName);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
      }

      triggerBrowserDownload(extracted.blob, extracted.fileName || downloadName);
      return true;
    }

    const mime =
      contentType && !contentType.includes("octet-stream")
        ? contentType.split(";")[0].trim()
        : EXCEL_MIME;
    triggerBrowserDownload(new Blob([buffer], { type: mime }), downloadName);
    return true;
  } catch (error) {
    let nextError = error;
    const errorData = error?.response?.data;
    if (errorData) {
      try {
        const text =
          errorData instanceof ArrayBuffer
            ? new TextDecoder().decode(errorData)
            : errorData instanceof Blob
              ? await errorData.text()
              : typeof errorData === "string"
                ? errorData
                : "";
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed?.message || parsed?.Message) {
            nextError = new Error(parsed.message || parsed.Message);
          }
        }
      } catch {
        /* keep original error */
      }
    }
    processResponseData("failure", path, nextError);
    throw nextError;
  }
};

export default {
  GET: (path, ...props) => request(GET, path, ...props),
  POST: (path, ...props) => request(POST, path, props.params, ...props),
  PUT: (path, ...props) => request(PUT, path, props.params, ...props),
  DELETE: (path, ...props) => request(DELETE, path, props.params, ...props),
  FILEUPLOAD: (path, ...props) => doFileUpload(path, props),
  FILEDOWNLOAD: (path, params) => doFileDownload(path, undefined, params),
  FILEFETCH: (path, params) => doFileFetch(path, undefined, params),
  FILEDOWNLOAD_POST: (path, body, fileName) =>
    doFileDownloadPost(path, body, fileName),
  ADD_TOOL_INFO_DATA: (path, ...props) => addToolInfoData(path, props),
  UPLOAD_BRANDING_GUIDELINES: (path, formData) =>
    uploadBrandingGuidelinesFormData(path, formData),
};

import {
  getAuthType,
  setAuthType,
  setDeepLinkURL,
  setExpiresOn,
} from "@orion/shared";
import {
  msalInstanceB2C,
  msalInstanceORG,
} from "authConfig";

const WORKSPACE_STORAGE_KEYS = [
  "workspaceState",
  "workspace_filters",
  "dashboard_workspace_filters",
  "order_filters",
  "isActiveTab",
  "deepLinkURL",
  "lastActive",
  "filterCount",
];

/** Full sign-out: API logout, MSAL popup, auth storage, workspace filters, redirect home. */
export const performAppLogout = async ({
  logoutUser,
  setAuth,
  navigate,
  onBeforeLogout,
} = {}) => {
  try {
    await logoutUser?.();
  } catch (err) {
    console.error("Background logout failed:", err);
  }

  onBeforeLogout?.();

  setAuth?.("");
  setExpiresOn("");
  setDeepLinkURL();

  const activeInstance = getAuthType() === "B2C" ? msalInstanceB2C : msalInstanceORG;
  activeInstance.logoutPopup({
    postLogoutRedirectUri: "/",
  });

  setAuthType("");
  WORKSPACE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

  if (typeof navigate === "function") {
    navigate("/");
  } else {
    window.location.href = "/";
  }

  localStorage.setItem("logout", "true");
  setTimeout(() => localStorage.removeItem("logout"), 500);
};

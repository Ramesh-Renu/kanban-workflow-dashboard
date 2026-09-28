import { setAuthType, setDeepLinkURL, logoutSession } from "@orion/shared";

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

/** Full sign-out: revoke session on the API, clear auth storage + workspace filters, redirect home. */
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
  // Covers callers that don't pass logoutUser; a no-op once the session is gone.
  await logoutSession();

  onBeforeLogout?.();

  setAuth?.("");
  setDeepLinkURL();
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

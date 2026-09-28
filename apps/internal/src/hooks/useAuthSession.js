import { useSyncExternalStore } from "react";
import { hasSession, subscribeSession } from "@orion/shared";

/**
 * Whether a username/password session exists (replaces MSAL's useIsAuthenticated).
 * Re-renders on sign-in/out in this tab and in other tabs.
 */
const useAuthSession = () => {
  const isAuthenticated = useSyncExternalStore(subscribeSession, hasSession, () => false);
  return { isAuthenticated };
};

export default useAuthSession;

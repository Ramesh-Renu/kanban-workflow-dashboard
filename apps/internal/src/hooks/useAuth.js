import { useCallback, useLayoutEffect } from "react";
import { getApiErrorMeta } from "@orion/shared";
import { useGlobalContext } from "store/context/GlobalProvider"; // your context hook

import {
  setAuthType,
  setActiveWorkSpace,
  ensureAccessToken,
  loginWithPassword,
  logoutSession,
} from "@orion/shared";
import { getUserInfo, getUserDetailsById } from "../services";
import useAuthSession from "./useAuthSession";

let userInfoRequestPromise = null;

const useAuth = () => {
  const { authState, dispatch } = useGlobalContext(); // using context instead of redux
  const { isAuthenticated } = useAuthSession();

  /** Username/password sign-in. Throws on failure so the form can show the message. */
  const getAuth = useCallback(
    async ({ username, password }) => {
      const { accessToken } = await loginWithPassword(username, password);
      dispatch({ type: "SET_AUTH", payload: accessToken });
      return accessToken;
    },
    [dispatch],
  );

  const setAuth = useCallback(
    (token) => {
      dispatch({ type: "SET_AUTH", payload: token });
    },
    [dispatch],
  );

  const getUserInfoData = useCallback(
    async (params) => {
      if (userInfoRequestPromise) {
        return userInfoRequestPromise;
      }

      userInfoRequestPromise = (async () => {
        dispatch({ type: "SET_USER_DETAILS_LOADING" });
        try {
          const res = await getUserInfo(params);
          dispatch({ type: "SET_USER_DETAILS", payload: res.data });
          return { type: "userInfo/fulfilled", payload: res.data };
        } catch (error) {
          const meta = getApiErrorMeta(error);
          dispatch({
            type: "SET_USER_DETAILS_ERROR",
            payload: {
              type: meta.type,
              error: meta.message,
              title: meta.title,
            },
          });
          return { type: "userInfo/rejected", error: meta };
        } finally {
          userInfoRequestPromise = null;
        }
      })();

      return userInfoRequestPromise;
    },
    [dispatch],
  );

  const getUserDetailsByIdData = useCallback(
    async (params) => {
      dispatch({ type: "SET_USER_DETAILS_BY_ID_LOADING" });
      try {
        const res = await getUserDetailsById(params);
        dispatch({ type: "SET_USER_DETAILS_BY_ID", payload: res.data });
        return { type: "userDetails/fulfilled", payload: res.data };
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: error.message,
        });
        return { type: "userDetails/rejected", error };
      }
    },
    [dispatch],
  );

  /** Revokes the refresh token server-side, then clears local session + state. */
  const logoutUser = useCallback(async () => {
    await logoutSession();
    dispatch({ type: "LOGOUT" });
    setAuthType("");
    setActiveWorkSpace("");
  }, [dispatch]);

  // Restore the session on reload: stored tokens → React state (refreshing if expired).
  useLayoutEffect(() => {
    if (!isAuthenticated || authState?.activeUser?.data?.accessToken) return;
    ensureAccessToken()
      .then(({ accessToken }) => setAuth(accessToken))
      .catch((error) => {
        console.error("Session restore failed", error);
        setActiveWorkSpace("");
      });
  }, [isAuthenticated, authState?.activeUser?.data?.accessToken, setAuth]);

  return [
    {
      data: authState?.activeUser?.data,
      loading: authState?.activeUser?.loading ?? false,
      userDetailsError: authState?.activeUser?.error ?? null,
      userDetailsErrorType: authState?.activeUser?.errorType ?? null,
      userDetailsErrorTitle: authState?.activeUser?.errorTitle ?? null,
      error: authState.error,
      logoutError: authState.logoutError,
      logoutLoading: authState.logoutLoading,
    },
    {
      getAuth,
      setAuth,
      getUserInfoData,
      getUserDetailsByIdData,
      logoutUser,
    },
  ];
};

export default useAuth;

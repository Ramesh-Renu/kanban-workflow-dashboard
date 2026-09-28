import { useCallback, useLayoutEffect } from "react";
import { getApiErrorMeta } from "@orion/shared";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useGlobalContext } from "store/context/GlobalProvider"; // your context hook
import {
  loginRequestB2C,
  loginRequestORG,
  msalInstanceB2C,
  msalInstanceORG,
} from "authConfig";

import {
  setExpiresOn,
  setAuthType,
  getAuthType,
  setActiveWorkSpace,
} from "@orion/shared";
import { getUserInfo, getLogin, logout, getUserDetailsById } from "../services";
import { acquireTokenWithFallback } from "../utils/common";

let userInfoRequestPromise = null;

const useAuth = () => {
  const { authState, dispatch } = useGlobalContext(); // using context instead of redux
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const getAuth = useCallback(
    async (params) => {
      dispatch({ type: "SET_LOADING" });

      try {
        // You can call login API if applicable
        const response = await getLogin(params); // <-- adjust URL
        const token = response.data.accessToken;

        dispatch({ type: "SET_AUTH", payload: token });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: error });
      }
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

  const logoutUser = useCallback(() => {
    try {
      // You can call login API if applicable
      const response = logout(); // <-- adjust URL
      if (response.data.status) {
        dispatch({ type: "LOGOUT" });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error });
    }
    setExpiresOn("");
    setAuthType("");
    setActiveWorkSpace("");
  }, [dispatch]);

  // Auto login if token available in localStorage
  useLayoutEffect(() => {
    if (
      authState?.activeUser?.data &&
      !authState?.activeUser?.data.accessToken &&
      isAuthenticated &&
      !authState?.activeUser?.data.expiresOn &&
      getAuthType()
    ) {
      const activeInstance = getAuthType() === "B2C" ? msalInstanceB2C : msalInstanceORG;
      const activeLoginRequest =
        getAuthType() === "B2C" ? loginRequestB2C : loginRequestORG;

      acquireTokenWithFallback(activeInstance, accounts[0], activeLoginRequest)
        .then((response) => {
          setAuth(response.accessToken);
          setExpiresOn(response.idTokenClaims.exp);
        })
        .catch((error) => {
          console.error("Token refresh failed", error);
          setExpiresOn("");
          setAuthType("");
          setActiveWorkSpace("");
        });
    }
  }, [authState]);

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

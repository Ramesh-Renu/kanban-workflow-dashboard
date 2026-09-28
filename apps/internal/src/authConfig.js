/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { LogLevel, PublicClientApplication } from "@azure/msal-browser";
import Config from "@orion/shared/src/config";

const getEnv = (key, fallback = "") => window._env_?.[key] || process.env[key] || fallback;

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const msalConfigORG = {
  auth: {
    clientId: getEnv("REACT_APP_PLG_B2B_CLIENT_ID"),
    authority: getEnv("REACT_APP_MSAL_AUTHORITY_URL"),
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            if (Config.log) {
              console.error(message);
            }
            return;
          case LogLevel.Info:
            if (Config.log) {
              console.info(message);
            }
            return;
          case LogLevel.Verbose:
            if (Config.log) {
              console.debug(message);
            }
            return;
          case LogLevel.Warning:
            if (Config.log) {
              console.warn(message);
            }
            return;
        }
      },
    },
  },
};

export const msalConfigB2C = {
  auth: {
    clientId: getEnv("REACT_APP_PLG_B2C_CLIENT_ID"),
    authority: getEnv("REACT_APP_MSAL_B2C_AUTHORITY_URL"),
    knownAuthorities: [getEnv("REACT_APP_MSAL_B2C_KNOWN_AUTHORITIES")].filter(Boolean), // Mark your B2C tenant's domain as trusted.
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // This configures where yo`1ur cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            if (Config.log) {
              console.error(message);
            }
            return;
          case LogLevel.Info:
            if (Config.log) {
              console.info(message);
            }
            return;
          case LogLevel.Verbose:
            if (Config.log) {
              console.debug(message);
            }
            return;
          case LogLevel.Warning:
            if (Config.log) {
              console.warn(message);
            }
            return;
        }
      },
    },
  },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequestORG = {
  scopes: [getEnv("REACT_APP_MSAL_API_SCOPE")].filter(Boolean)
};
export const loginRequestB2C = {
  // scopes: ["api://cc3a69c1-626f-45ef-bca1-8e5d0044e9bf/Api.Read"]
  prompt: "select_account",
  scopes: [    
    "openid",
    "profile",
    "offline_access",
    getEnv("REACT_APP_MSAL_B2C_API_SCOPE")
  ].filter(Boolean),
};
/**
 * Add here the scopes to request when obtaining an access token for MS Graph API. For more information, see:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/resources-and-scopes.md
 */
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

const msalInstanceORG = new PublicClientApplication(msalConfigORG);
const msalInstanceB2C = new PublicClientApplication(msalConfigB2C);

export { msalInstanceORG, msalInstanceB2C };

import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { loadVariableStyles } from "./utils";

import { MsalProvider } from "@azure/msal-react";
import { msalInstanceB2C, msalInstanceORG } from "./authConfig";
import { ToastDialog } from "@orion/shared";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import translate_EN from "./translations/EN.json";
import { getAuthType } from "@orion/shared";
import { GlobalProvider } from "./store/context/GlobalProvider";
import { SocketProvider } from "./store/context/SocketProvider";
import App from "./App";
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

// TRANSLATOR
i18n.use(initReactI18next).init({
  interpolation: { escapeValue: false },
  lng: "en",
  resources: {
    en: { ...translate_EN },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
const activeInstance = getAuthType() === "B2C" ? msalInstanceB2C : msalInstanceORG;

const setInitialActiveAccount = (instance) => {
  const cachedAccounts = instance.getAllAccounts();
  if (cachedAccounts.length > 0) {
    instance.setActiveAccount(cachedAccounts[0]);
  }
};

const renderApp = () => {
  loadVariableStyles();
  root.render(
    <StrictMode>
      <MsalProvider instance={activeInstance}>
        <I18nextProvider i18n={i18n}>
          <GlobalProvider>
            <SocketProvider>
              <BrowserRouter future={{ v7_startTransition: true }}>
                <ToastDialog />
                <App />
              </BrowserRouter>
            </SocketProvider>
          </GlobalProvider>
        </I18nextProvider>
      </MsalProvider>
    </StrictMode>,
  );
};

activeInstance
  .initialize()
  .then(() => activeInstance.handleRedirectPromise())
  .then((redirectResult) => {
    if (redirectResult?.account) {
      activeInstance.setActiveAccount(redirectResult.account);
    } else {
      setInitialActiveAccount(activeInstance);
    }
    renderApp();
  })
  .catch((error) => {
    console.error("MSAL initialization failed", error);
    const code = String(error?.errorCode || error?.code || "");
    const message = String(error?.message || "");
    if (
      code === "empty_url_error" ||
      message.includes("empty_url") ||
      message.includes("URL was empty")
    ) {
      window._env_load_error = true;
    }
    setInitialActiveAccount(activeInstance);
    renderApp();
  });

import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { loadVariableStyles } from "./utils";

import { ToastDialog } from "@orion/shared";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import translate_EN from "./translations/EN.json";
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

loadVariableStyles();
root.render(
  <StrictMode>
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
  </StrictMode>,
);

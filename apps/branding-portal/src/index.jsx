import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { loadVariableStyles } from "./utils";

import ToastDialog from "@orion/shared/src/components/ToastDialog";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import translate_EN from "./translations/EN.json";
import { GlobalProvider } from "./store/context/GlobalProvider";
import App from "./App";

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
        <BrowserRouter future={{ v7_startTransition: true }}>
          <ToastDialog />
          <App />
        </BrowserRouter>
      </GlobalProvider>
    </I18nextProvider>
  </StrictMode>,
);

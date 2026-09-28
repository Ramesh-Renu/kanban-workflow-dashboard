import React, { createContext, useContext, useReducer } from "react";
import { toastReducer, initialToastState } from "../reducers/toastReducer";

const GlobalContext = createContext();

const rootReducer = (state, action) => ({
  toastState: toastReducer(state.toastState, action),
});

const initialState = {
  toastState: initialToastState,
};

export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(rootReducer, initialState);
  return (
    <GlobalContext.Provider value={{ ...state, dispatch }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);

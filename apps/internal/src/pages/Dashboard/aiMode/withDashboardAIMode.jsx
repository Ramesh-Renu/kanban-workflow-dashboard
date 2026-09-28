import React, { memo } from "react";
import { DashboardAIModeProvider } from "./DashboardAIModeContext";
import DashboardAIModeEffects from "./DashboardAIModeEffects";

const withDashboardAIMode = (Component) => {
  const Wrapped = (props) => (
    <DashboardAIModeProvider>
      <Component {...props} />
      <DashboardAIModeEffects />
    </DashboardAIModeProvider>
  );
  Wrapped.displayName = `withDashboardAIMode(${Component.displayName || Component.name || "Component"})`;
  return memo(Wrapped);
};

export default withDashboardAIMode;

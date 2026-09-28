import React, { memo } from "react";
import { useDashboardAIModeOptional } from "./DashboardAIModeContext";

const SparkIcon = () => (
  <svg className="ai-mode-btn__spark" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z"
      fill="#2F6FED"
    />
    <path
      d="M18.5 14.5l.7 2.8 2.8.7-2.8.7-.7 2.8-.7-2.8-2.8-.7 2.8-.7.7-2.8z"
      fill="#33C7F0"
    />
  </svg>
);

const AIModeButton = ({ className = "" }) => {
  const ai = useDashboardAIModeOptional();
  if (!ai) return null;

  const { aiMode, toggleAIMode } = ai;

  return (
    <button
      type="button"
      className={`ai-mode-btn${aiMode ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      onClick={toggleAIMode}
      aria-pressed={aiMode}
      aria-label={aiMode ? "Exit AI Mode" : "Enter AI Mode"}
    >
      <span className="ai-mode-btn__pulse" aria-hidden="true" />
      <SparkIcon />
      <span className="ai-mode-btn__label">{aiMode ? "Exit AI Mode" : "AI Mode"}</span>
    </button>
  );
};

export default memo(AIModeButton);

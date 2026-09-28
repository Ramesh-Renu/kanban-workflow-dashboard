import React, { memo, useCallback, useRef } from "react";
import { useDashboardAIMode } from "./DashboardAIModeContext";

const DashboardAIHotspot = ({
  id,
  insight,
  className = "",
  children,
}) => {
  const { aiMode, selectedId, selectHotspot, deselect } = useDashboardAIMode();
  const ref = useRef(null);
  const isSelected = selectedId === id;

  const handleClick = useCallback(
    (event) => {
      if (!aiMode) return;
      event.preventDefault();
      event.stopPropagation();
      if (isSelected) {
        deselect();
        return;
      }
      selectHotspot(id, insight, ref.current);
    },
    [aiMode, deselect, id, insight, isSelected, selectHotspot],
  );

  return (
    <div
      ref={ref}
      className={`ai-dashboard-hotspot${aiMode ? " is-interactive" : ""}${
        isSelected ? " is-selected" : ""
      }${className ? ` ${className}` : ""}`}
      data-ai-hotspot={id}
      onClickCapture={handleClick}
      onKeyDown={(event) => {
        if (!aiMode) return;
        if (event.key === "Enter" || event.key === " ") {
          handleClick(event);
        }
      }}
      role={aiMode ? "button" : undefined}
      tabIndex={aiMode ? 0 : undefined}
      aria-pressed={aiMode ? isSelected : undefined}
      aria-label={aiMode ? `Analyze ${insight?.label || id}` : undefined}
    >
      {children}
      {isSelected ? <span className="ai-dashboard-hotspot__scan" aria-hidden="true" /> : null}
    </div>
  );
};

export default memo(DashboardAIHotspot);

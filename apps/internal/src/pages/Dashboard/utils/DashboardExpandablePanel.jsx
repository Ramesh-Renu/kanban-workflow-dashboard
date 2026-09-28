import React, { forwardRef, useState } from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { boardExpandIcon, closeIcon } from "assets/images";

const DashboardExpandablePanel = forwardRef(function DashboardExpandablePanel(
  {
    className = "",
    ariaLabel,
    expandDisabled = false,
    modalCustomClassName = "dashboard-chart-panel__modal-dialog",
    header,
    children,
    isExpanded: controlledExpanded,
    setIsExpanded: setControlledExpanded,
    onExpandedChange,
    showDefaultExpandButton = true,
  },
  ref,
) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const setExpanded = (nextValue) => {
    if (isControlled) {
      setControlledExpanded?.(nextValue);
      onExpandedChange?.(nextValue);
    } else {
      setInternalExpanded(nextValue);
    }
  };

  const openExpanded = () => setExpanded(true);
  const closeExpanded = () => setExpanded(false);

  const collapsedBody = typeof children === "function" ? children(false) : children;
  const expandedBody = typeof children === "function" ? children(true) : children;

  return (
    <>
      <section
        className={["dashboard-expandable-panel", className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
        ref={ref}
      >
        {header}
        <div className="dashboard-expandable-panel__body">{collapsedBody}</div>
      </section>

      <PopupModal
        show={isExpanded}
        onClose={closeExpanded}
        header={false}
        size="xl"
        customClassName={modalCustomClassName}
        className="dashboard-chart-panel__modal-body"
        children={
          <div className="dashboard-chart-panel__modal-shell">
            <button
              type="button"
              className="dashboard-chart-panel__modal-close"
              onClick={closeExpanded}
              aria-label="Close expanded view"
            >
              <img
                src={closeIcon}
                alt="close icon"
                className="dashboard-chart-panel__modal-close-icon"
              />
            </button>
            <div className="dashboard-chart-panel__modal-shell-content">
              {header}
              <div className="dashboard-expandable-panel__body dashboard-expandable-panel__body--expanded">
                {expandedBody}
              </div>
            </div>
          </div>
        }
      />
    </>
  );
});

export default DashboardExpandablePanel;

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getKanbanDetailsPath } from "../../utils/kanbanRoutes";
import { getDashboardTicketDetailsNav } from "../../utils/dashboard";

const ROW_HOVER_EVENT = "orion-tool-row-hover";

const isNodeInside = (root, node) => {
  if (!root || !(node instanceof Node)) return false;
  return root.contains(node);
};

const isOpenMenuTarget = (node) => {
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest(
      ".kebabDropDown, .dropdown-menu, .react-datepicker, .dueDateCalender, .modal",
    ),
  );
};

const isActionTarget = (node) => {
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest(
      ".second-col-assigne-menu, .kebab-btn, .kebab-assignee-btn, .tool-row-view-task-btn, .avatars, .kebab-notassignee-btn",
    ),
  );
};

/**
 * Wraps .tool-gropu-flex and tracks stable row hover.
 * Moving between child controls does not clear hover; only leaving the row does.
 * Hovering another row clears this row's hover/pin state.
 */
export const ToolRowHoverShell = ({
  children,
  disabled = false,
  className = "",
  selected = false,
  onHoverStart,
  onActionActivate,
}) => {
  const rootRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const rowId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [menuPinned, setMenuPinned] = useState(false);

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    clearLeaveTimer();
    setIsHovered(true);
    window.dispatchEvent(
      new CustomEvent(ROW_HOVER_EVENT, { detail: { rowId } }),
    );
    onHoverStart?.();
  };

  const handleMouseLeave = (event) => {
    clearLeaveTimer();
    const next = event.relatedTarget;
    if (isNodeInside(rootRef.current, next) || isOpenMenuTarget(next)) {
      return;
    }

    leaveTimerRef.current = setTimeout(() => {
      if (rootRef.current?.matches(":hover")) return;
      if (
        document.querySelector(
          ".kebabDropDown:hover, .dropdown-menu.show:hover, .kebabDropDown:focus-within, .dropdown-menu.show",
        )
      ) {
        return;
      }
      setMenuPinned(false);
      setIsHovered(false);
    }, 120);
  };

  useEffect(() => {
    const onOtherRowHover = (event) => {
      if (event.detail?.rowId === rowId) return;
      clearLeaveTimer();
      setIsHovered(false);
      setMenuPinned(false);
    };
    window.addEventListener(ROW_HOVER_EVENT, onOtherRowHover);
    return () => window.removeEventListener(ROW_HOVER_EVENT, onOtherRowHover);
  }, [rowId]);

  useEffect(() => {
    if (!menuPinned) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (isNodeInside(rootRef.current, target) || isOpenMenuTarget(target)) {
        return;
      }
      setMenuPinned(false);
      if (!rootRef.current?.matches(":hover")) {
        setIsHovered(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuPinned]);

  useEffect(() => () => clearLeaveTimer(), []);

  const showRowActions = !disabled && (selected || isHovered || menuPinned);

  return (
    <div
      ref={rootRef}
      className={`tool-gropu-flex ${showRowActions ? "is-row-actions-visible" : ""} ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(event) => {
        if (disabled) return;
        setMenuPinned(true);
        if (isActionTarget(event.target)) {
          onActionActivate?.();
        }
      }}
    >
      {typeof children === "function"
        ? children({
            isRowHovered: showRowActions,
            showRowActions,
          })
        : children}
    </div>
  );
};

export const ViewTaskIconButton = ({
  isTask = false,
  boardData,
  ticketData,
  flowTool,
  visible = true,
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const onView = useCallback(
    (event) => {
      event.stopPropagation();
      const toolTicketId = isTask ? flowTool?.toolTicketId : flowTool?.toolId;
      const boardId = boardData?.[0]?.boardID;
      const query = toolTicketId
        ? `?${isTask ? "taskId" : "toolId"}=${toolTicketId}`
        : "";

      if (location.pathname.includes("/dashboard")) {
        const { path, state } = getDashboardTicketDetailsNav(
          boardId,
          ticketData?.orderId,
          { query },
        );
        navigate(path, { state });
        return;
      }

      let path = getKanbanDetailsPath(boardId, ticketData?.orderId);
      if (query) path += query;
      navigate(path);
    },
    [
      boardData,
      flowTool,
      isTask,
      location.pathname,
      navigate,
      ticketData?.orderId,
    ],
  );

  return (
    <button
      type="button"
      className={`tool-row-view-task-btn ${visible ? "is-visible" : ""} ${className}`.trim()}
      title={isTask ? "View Task" : "View Tool"}
      aria-label={isTask ? "View Task" : "View Tool"}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onView}
    >
      <span className="icon-open-eye" aria-hidden />
    </button>
  );
};

export default ToolRowHoverShell;

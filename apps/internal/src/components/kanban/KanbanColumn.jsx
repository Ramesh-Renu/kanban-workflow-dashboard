import React, { useCallback, useEffect, useRef, useState } from "react";
import KanbanCard from "./KanbanCard";
import {
  isDashboardKanbanEmbed,
  readKanbanFiltersFromStorage,
} from "../../utils/kanbanRoutes";

const KanbanColumn = ({
  stages,
  stage,
  tasks,
  onDropToStage,
  onDragStartCard,
  onMoveSelectedNext,
  onDragStartTool,
  onDragOverStage,
  boardData,
  reloadTask,
  isDraggable,
  callApiOnScroll,
  isFullView,
  placeholder,
  windowWidth,
  activeTaskCodes,
}) => {
  /** Prefer prop (dashboard embed / parent) over shared isActiveTab LS —
   * another tab (IOD) can overwrite LS and break Non-IOD Task card UI. */
  const savedTask = localStorage.getItem("isActiveTab");
  let lsActiveCode;
  try {
    const parsedTask = savedTask ? JSON.parse(savedTask) : null;
    lsActiveCode = parsedTask?.tabs
      ?.filter((task) => task.isActive)
      ?.map((task) => task.code)?.[0];
  } catch {
    lsActiveCode = undefined;
  }
  const activeCodes = activeTaskCodes || lsActiveCode;
  const contentRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const isFetchingRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const ticketListLength = tasks?.ticketList?.length || 0;
  const totalTicketsCount = tasks?.total_tickets_count;
  const hasAllTickets =
    ticketListLength > 0 &&
    totalTicketsCount != null &&
    ticketListLength === totalTicketsCount;

  const requestMoreTickets = useCallback(() => {
    if (isFetchingRef.current || hasAllTickets || ticketListLength < 9) return;

    const fromDashboard = isDashboardKanbanEmbed();
    const parsed = readKanbanFiltersFromStorage(fromDashboard);
    if (!parsed) return;

    const pageSize = Number(parsed.pageSize) || 10;
    // Derive next page from how many tickets are already loaded for THIS stage.
    // Do not trust localStorage pageOffSet — dashboard embed skips persisting it
    // (disableDefaultAssignee), so LS stays at 0 and every scroll would send pageOffSet: 1.
    const nextOffset = Math.floor(ticketListLength / pageSize);
    if (nextOffset < 1) return;
    if (ticketListLength % pageSize !== 0) return;

    isFetchingRef.current = true;
    Promise.resolve(
      callApiOnScroll?.(
        {
          ...parsed,
          pageOffSet: nextOffset,
          stageScroll: [stage.labelId],
        },
        stage.labelId,
      ),
    ).finally(() => {
      // Allow the next page only after this request settles (or briefly later if sync).
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 300);
    });
  }, [callApiOnScroll, hasAllTickets, stage.labelId, ticketListLength]);

  // Column vertical scroll → load more near bottom (full board + dashboard).
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let lastScrollTop = 0;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
      const isScrollingDown = scrollTop > lastScrollTop;
      lastScrollTop = scrollTop;

      if (!isScrollingDown) return;
      if (distanceToBottom <= 100) {
        requestMoreTickets();
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [requestMoreTickets, tasks]);

  // When the column isn't tall enough to scroll (or user hasn't scrolled yet),
  // still page in more tickets once the end sentinel is in view.
  useEffect(() => {
    if (isCollapsed || hasAllTickets || ticketListLength < 9) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestMoreTickets();
        }
      },
      { root: null, rootMargin: "160px 0px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasAllTickets, isCollapsed, requestMoreTickets, ticketListLength]);

  const toggleCollapse = () => {
    setIsCollapsed((prevState) => !prevState);
  };

  return (
    <div
      className={`kanban-column position-relative ${
        !isCollapsed ? "flex-fill" : "is-collapsed"
      }`}
      onDragOver={(e) => onDragOverStage?.(e, stage)}
      onDrop={(e) => onDropToStage(e, stage, stage.labelId)}
      style={{
        backgroundColor: "var(--color-light-gray-5)",
        // minWidth: "435px",
        minWidth:
          windowWidth <= 600
            ? !isCollapsed
              ? "300px"
              : undefined
            : !isCollapsed
              ? "380px"
              : undefined,
        maxWidth: isFullView === 0 ? "380px" : "450px",
        whiteSpace: "nowrap",
        // width: !isDraggable ? "30%" : "100%",
        width: !isCollapsed && !isDraggable ? "30%" : isCollapsed ? undefined : "100%",
        border: "0.5px solid rgba(210, 210, 210, 0.5)",
        borderWidth: "0.5px",
        borderRadius: "8px",
      }}
      id={"label_" + stage.labelId}
    >
      <div
        className={`d-flex gap-2 align-items-center  w-100 kanban-column-head ${
          !isCollapsed
            ? "flex-row justify-content-between"
            : "flex-column justify-content-center h-100 position-relative"
        }`}
        style={{
          ...(!isCollapsed && {
            borderBottom: `1.5px solid ${stage.color}`,
            borderTop: undefined,
          }),
          ...(isCollapsed && {
            borderTop: `1.5px solid ${stage.color}`,
            borderBottom: undefined,
          }),
        }}
      >
        <div
          className={`d-flex gap-2 align-items-center kanban-column-head-col m-0 p-0 ${
            !isCollapsed ? "" : "flex-column"
          }`}
        >
          <button
            className="d-flex align-items-center collapse-arrow p-0"
            onClick={toggleCollapse}
            title="Collapse"
            type="button"
            aria-label={isCollapsed ? "Expand column" : "Collapse column"}
          >
            <span
              className={`icon-${
                isCollapsed ? "chevron-thin-down" : "chevron-thin-right"
              }`}
            />
          </button>
          <h6
            className={`text-left title ${!isCollapsed && "m-0"}`}
            aria-label={stage?.name}
          >
            {stage?.name}
          </h6>
        </div>
        <div className="taskBox rounded">
          {activeCodes === "MainTask" && tasks?.total_tickets_count}
          {activeCodes === "SubTask" && tasks?.total_tools_count}
          {activeCodes === "Task" && tasks?.total_tools_count}
        </div>
      </div>
      {!isCollapsed && (
        <div
          className={`kanban-card-container ${
            isFullView === 1 && "d-flex flex-wrap align-items-center gap-3"
          }`}
          ref={contentRef}
        >
          {ticketListLength > 0 ? (
            <>
              {tasks?.ticketList?.map((card, i) => (
                <React.Fragment key={i}>
                  {placeholder?.stageId === stage.labelId && placeholder?.index === i && (
                    <div
                      className={`kanban-drop-placeholder ${
                        placeholder?.type === "tool" ? "is-tool" : ""
                      }`}
                      style={{
                        height: `${placeholder?.height || 0}px`,
                      }}
                    />
                  )}
                  <KanbanCard
                    stages={stages}
                    card={card}
                    onDragStartCard={onDragStartCard}
                    onMoveSelectedNext={onMoveSelectedNext}
                    onDragStartTool={onDragStartTool}
                    isSubTask={activeCodes === "SubTask"}
                    isTask={activeCodes === "Task"}
                    isMainTask={activeCodes === "MainTask"}
                    borderColor={stage.color}
                    stage={stage}
                    boardData={boardData}
                    reloadTask={reloadTask}
                    isDraggable={isDraggable}
                    isFullView={isFullView}
                  />
                </React.Fragment>
              ))}
              {placeholder?.stageId === stage.labelId &&
                placeholder?.index === ticketListLength && (
                  <div
                    className={`kanban-drop-placeholder ${
                      placeholder?.type === "tool" ? "is-tool" : ""
                    }`}
                    style={{
                      height: `${placeholder?.height || 0}px`,
                    }}
                  />
                )}
            </>
          ) : (
            <>
              {placeholder?.stageId === stage.labelId && (
                <div
                  className={`kanban-drop-placeholder ${
                    placeholder?.type === "tool" ? "is-tool" : ""
                  }`}
                  style={{
                    height: `${placeholder?.height || 0}px`,
                  }}
                />
              )}
              <div className="noContentText"></div>
            </>
          )}
          {!hasAllTickets && ticketListLength >= 9 && (
            <div
              ref={loadMoreSentinelRef}
              className="kanban-column-load-more-sentinel"
              aria-hidden="true"
            />
          )}
          {hasAllTickets && totalTicketsCount > 9 && (
            <div className="boardContentArea__end">
              <span>Showing all tickets</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;

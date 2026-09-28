import { Fragment, useEffect, useMemo, useState, memo } from "react";
import dayjs from "dayjs";
import { safeParseLocalStorage } from "../../../utils/dashboard";
import DashboardTableSkeleton from "../utils/DashboardTableSkeleton";

const getRowKey = (row, index) =>
  String(row.orderId ?? row.ticketId ?? row.taskName ?? `row-${index}`);

const isDueDateInPast = (ticketDueDate) =>
  Boolean(
    ticketDueDate &&
    dayjs(ticketDueDate).isValid() &&
    dayjs(ticketDueDate).startOf("day").isBefore(dayjs().startOf("day")),
  );

const formatDate = (d) =>
  d && dayjs(d).isValid() ? dayjs(d).format("MMM DD, YYYY") : "—";

/** Resolve sub-task fields from various API shapes */
const toolAssignee = (tool) => {
  const a = tool.assignee ?? tool.assigneeName ?? tool.assigneeDisplayName;
  if (typeof a === "string") return a;
  if (Array.isArray(a) && a[0]) {
    return a[0].name ?? a[0].displayName ?? "—";
  }
  if (a && typeof a === "object") return a.name ?? a.displayName ?? "—";
  return "—";
};

const toolStage = (tool) =>
  tool.currentStage ?? tool.stageName ?? tool.stage ?? tool.workflowStage ?? "—";

const TaskOverview = ({
  apiLoading = false,
  taskOverdueData = [],
  dashboardMaterValue = [],
  pageSize = 10,
  // reserved for future navigation / search wiring
  placeholder: _placeholder,
  fromPage: _fromPage,
  authData: _authData,
}) => {
  const [expandedKey, setExpandedKey] = useState(null);
  const [page, setPage] = useState(1);
  /** `order` = one row per order, expand for tools. `task` = flat list of all tools. */
  const [viewMode, setViewMode] = useState("order");

  const statusToneForRow = (row) =>
    row.statusTone ?? row.healthLabel ?? row.overallStatusTone;

  const overallStatusLabel = (row) =>
    row.status ?? row.overallStatus ?? row.healthLabel ?? "—";
  const boardType = safeParseLocalStorage("selectBoardDashboard");

  const createdByLabel = (row) =>
    row.createdBy ??
    row.createdByName ??
    row.createdByDisplayName ??
    row.ownerName ??
    "—";

  const rows = useMemo(() => taskOverdueData || [], [taskOverdueData]);

  /** All tools from every order, with parent order row for context. */
  const allToolsFlat = useMemo(() => {
    const list = [];
    rows.forEach((row) => {
      (row.listOfTools || []).forEach((tool) => {
        list.push({ tool, parentOrder: row });
      });
    });
    return list;
  }, [rows]);

  const totalRows = viewMode === "order" ? rows.length : allToolsFlat.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const paginatedTools = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allToolsFlat.slice(start, start + pageSize);
  }, [allToolsFlat, page, pageSize]);

  useEffect(() => {
    setPage(1);
    setExpandedKey(null);
  }, [taskOverdueData]);

  useEffect(() => {
    setPage(1);
    setExpandedKey(null);
  }, [viewMode]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const rangeStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRows);

  const toggleExpand = (row, pageLocalIndex) => {
    const tools = row.listOfTools;
    if (!tools?.length) return;
    const key = getRowKey(row, (page - 1) * pageSize + pageLocalIndex);
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const colCountOrder = 5;
  const colCountTask = 6;

  const subtaskHeader = boardType?.id === 108 ? "TOOL NAME" : "SUB TASK NAME";

  return (
    <div className="workspace-widget__list">
      <div className="task-overview">
        <div className="task-overview__header">
          <div className="infoViewTabs_container d-flex  flex-row justify-content-between align-items-center pb-3">
            <div className="d-flex flex-row align-items-center gap-2 bg-white shadow-sm rounded p-2">
              <button
                className={`task-overview__header-button${viewMode === "order" ? " is-active" : ""}`}
                onClick={() => setViewMode("order")}
              >
                Order View
              </button>

              <button
                className={`task-overview__header-button${viewMode === "task" ? " is-active" : ""}`}
                onClick={() => setViewMode("task")}
              >
                Task View
              </button>
            </div>
          </div>
        </div>
        <div className="task-overview__scroll">
          {apiLoading && rows.length === 0 ? (
            <DashboardTableSkeleton
              columnCount={viewMode === "order" ? colCountOrder : colCountTask}
              rowCount={8}
              minHeight={280}
              className="task-overview__table-skeleton"
              ariaLabel="Loading task overview table"
            />
          ) : (
          <table className="task-overview__table" role="grid">
            <thead>
              {viewMode === "order" ? (
                <tr>
                  <th scope="col" className="task-overview__th">
                    ORDER NAME
                  </th>
                  <th scope="col" className="task-overview__th">
                    CREATED DATE
                  </th>
                  <th scope="col" className="task-overview__th">
                    DUE DATE
                  </th>
                  <th scope="col" className="task-overview__th">
                    CREATED BY
                  </th>
                  <th scope="col" className="task-overview__th">
                    OVERALL STATUS
                  </th>
                </tr>
              ) : (
                <tr>
                  <th scope="col" className="task-overview__th">
                    ORDER NAME
                  </th>
                  <th scope="col" className="task-overview__th">
                    {subtaskHeader}
                  </th>
                  <th scope="col" className="task-overview__th">
                    CREATED DATE
                  </th>
                  <th scope="col" className="task-overview__th">
                    DUE DATE
                  </th>
                  <th scope="col" className="task-overview__th">
                    CURRENT STAGE
                  </th>
                  <th scope="col" className="task-overview__th">
                    ASSIGNEE
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {!apiLoading && viewMode === "order" && rows.length === 0 && (
                <tr>
                  <td colSpan={colCountOrder} className="task-overview__td-empty">
                    No Tasks Found
                  </td>
                </tr>
              )}
              {!apiLoading && viewMode === "task" && allToolsFlat.length === 0 && (
                <tr>
                  <td colSpan={colCountTask} className="task-overview__td-empty">
                    No tools found
                  </td>
                </tr>
              )}
              {!apiLoading &&
                viewMode === "order" &&
                paginatedRows.map((row, index) => {
                  const globalIndex = (page - 1) * pageSize + index;
                  const key = getRowKey(row, globalIndex);
                  const open = expandedKey === key;
                  const tools = row.listOfTools || [];
                  const hasSubtasks = tools.length > 0;
                  const tone = statusToneForRow(row);
                  const statusColor = dashboardMaterValue?.find(
                    (check) =>
                      check.label?.toLowerCase()?.replaceAll(" ", "-") ===
                      String(tone || "").toLowerCase(),
                  )?.color;

                  return (
                    <Fragment key={key}>
                      <tr
                        className="task-overview__row"
                        onClick={() => toggleExpand(row, index)}
                      >
                        <td className="task-overview__td">
                          <div className="task-overview__task-name">
                            <span className="task-overview__task-title">
                              {row.taskName ?? "—"}
                            </span>
                            {hasSubtasks && (
                              <span className="task-overview__task-meta">
                                {tools.length}{" "}
                                {boardType?.id === 108 ? "Tool" : "Sub-Task"}
                                {tools.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="task-overview__td">
                          {formatDate(row.createdDate)}
                        </td>
                        <td className="task-overview__td">{formatDate(row.dueDate)}</td>
                        <td className="task-overview__td">{createdByLabel(row)}</td>
                        <td className="task-overview__td">
                          <span
                            className={`task-overview__status workspace-widget__status workspace-widget__status--${tone || "default"}`}
                            style={{
                              backgroundColor: statusColor
                                ? `${statusColor}15`
                                : undefined,
                              color: statusColor || undefined,
                            }}
                          >
                            {overallStatusLabel(row)}
                          </span>
                        </td>
                      </tr>
                      {open && hasSubtasks && (
                        <tr className="task-overview__row task-overview__row--nested">
                          <td
                            colSpan={colCountOrder}
                            className="task-overview__td-nested"
                          >
                            <div className="task-overview__nested">
                              <p className="task-overview__nested-title">
                                {/* Order →  */}
                                {boardType?.id === 108
                                  ? "Tool Details"
                                  : "Sub Task Details"}
                              </p>
                              <table className="task-overview__subtable">
                                <thead>
                                  <tr>
                                    <th>
                                      {boardType?.id === 108
                                        ? "TOOL NAME"
                                        : "SUB TASK NAME"}
                                    </th>
                                    <th>CREATED DATE</th>
                                    <th>DUE DATE</th>
                                    <th>CURRENT STAGE</th>
                                    <th>ASSIGNEE</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tools.map((tool, ti) => {
                                    const overdue =
                                      isDueDateInPast(tool.dueDate) &&
                                      tool.toolStatusId !== 7;
                                    const done = tool.toolStatusId === 7;
                                    return (
                                      <tr key={`${tool.toolTicketId ?? "t"}-${ti}`}>
                                        <td>
                                          <span className="task-overview__sub-name">
                                            {tool.toolName ?? "—"}
                                            {done && (
                                              <span className="task-overview__badge task-overview__badge--done">
                                                Completed
                                              </span>
                                            )}
                                          </span>
                                        </td>
                                        <td>{formatDate(tool.createdDate)}</td>
                                        <td
                                          className={
                                            overdue ? "task-overview__due--overdue" : ""
                                          }
                                        >
                                          {formatDate(tool.dueDate)}
                                          {overdue && (
                                            <span className="task-overview__overdue-label">
                                              {" "}
                                              (Overdue)
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <span className="task-overview__stage-pill">
                                            {toolStage(tool)}
                                          </span>
                                        </td>
                                        <td>{toolAssignee(tool)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              {!apiLoading &&
                viewMode === "task" &&
                paginatedTools.map((entry, index) => {
                  const { tool, parentOrder } = entry;
                  const overdue =
                    isDueDateInPast(tool.dueDate) && tool.toolStatusId !== 7;
                  const done = tool.toolStatusId === 7;
                  const rowKey = `${parentOrder.orderId ?? parentOrder.taskName}-${tool.toolTicketId ?? "t"}-${(page - 1) * pageSize + index}`;
                  return (
                    <tr
                      key={rowKey}
                      className="task-overview__row task-overview__row--task-flat"
                    >
                      <td className="task-overview__td">{parentOrder.taskName ?? "—"}</td>
                      <td className="task-overview__td">
                        <span className="task-overview__sub-name">
                          {tool.toolName ?? "—"}
                          {done && (
                            <span className="task-overview__badge task-overview__badge--done">
                              Completed
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="task-overview__td">
                        {formatDate(tool.createdDate)}
                      </td>
                      <td
                        className={`task-overview__td${overdue ? " task-overview__due--overdue" : ""}`}
                      >
                        {formatDate(tool.dueDate)}
                        {overdue && (
                          <span className="task-overview__overdue-label"> (Overdue)</span>
                        )}
                      </td>
                      <td className="task-overview__td">
                        <span className="task-overview__stage-pill">
                          {toolStage(tool)}
                        </span>
                      </td>
                      <td className="task-overview__td">{toolAssignee(tool)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          )}
        </div>

        {!apiLoading && totalRows > 0 && (
          <div
            className="task-overview__pagination"
            role="navigation"
            aria-label="Task list pagination"
          >
            <span className="task-overview__pagination-range">
              Showing {rangeStart}–{rangeEnd} of {totalRows}
            </span>
            <div className="task-overview__pagination-actions">
              <button
                type="button"
                className="task-overview__pagination-btn"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setExpandedKey(null);
                }}
              >
                Previous
              </button>
              <span className="task-overview__pagination-page">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="task-overview__pagination-btn"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  setExpandedKey(null);
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TaskOverview);

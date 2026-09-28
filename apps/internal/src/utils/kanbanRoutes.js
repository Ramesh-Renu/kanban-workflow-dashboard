/** Internal Order Delivery workspace — uses /orders routes and "Orders" labels. */
export const IOD_WORKSPACE_ID = 1;

export const getActiveWorkspaceId = () => {
  try {
    const raw = localStorage.getItem("workspaceState");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.activeWorkSpace?.[0]?.work_space_id;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
};

export const isOrdersWorkspace = (workspaceId = getActiveWorkspaceId()) =>
  Number(workspaceId) === IOD_WORKSPACE_ID;

/** Base path for kanban list + ticket details: `/orders` (IOD) or `/task` (others). */
export const getKanbanBasePath = (workspaceId = getActiveWorkspaceId()) =>
  isOrdersWorkspace(workspaceId) ? "/orders" : "/task";

export const getKanbanBreadcrumbLabel = (workspaceId = getActiveWorkspaceId()) =>
  isOrdersWorkspace(workspaceId) ? "Orders" : "Task";

export const getKanbanDetailsPath = (boardId, orderId, workspaceId) =>
  `${getKanbanBasePath(workspaceId)}/details/${boardId}/${orderId}`;

/** /orders|/task kanban filters — must not be overwritten by dashboard embed. */
export const KANBAN_FILTERS_STORAGE_KEY = "workspace_filters";
/** Dashboard Kanban embed filters (isolated from /orders filter count). */
export const DASHBOARD_KANBAN_FILTERS_STORAGE_KEY = "dashboard_workspace_filters";

export const getKanbanFiltersStorageKey = (fromDashboard = false) =>
  fromDashboard
    ? DASHBOARD_KANBAN_FILTERS_STORAGE_KEY
    : KANBAN_FILTERS_STORAGE_KEY;

export const readKanbanFiltersFromStorage = (fromDashboard = false) => {
  try {
    const raw = localStorage.getItem(getKanbanFiltersStorageKey(fromDashboard));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeKanbanFiltersToStorage = (filters, fromDashboard = false) => {
  localStorage.setItem(
    getKanbanFiltersStorageKey(fromDashboard),
    JSON.stringify(filters ?? {}),
  );
};

/** True when Kanban is mounted inside the dashboard Orders/Tasks card. */
export const isDashboardKanbanEmbed = () =>
  Boolean(
    typeof document !== "undefined" &&
      document.querySelector(".dashboard-orders-kanban"),
  );

/**
 * Fresh filters for post-move / delete / assignee reload.
 * Dashboard embed must use dashboard_workspace_filters (not /orders workspace_filters),
 * or assignee/date payload stays stale and heatmap counts drift.
 */
export const readActiveKanbanFiltersFromStorage = () =>
  readKanbanFiltersFromStorage(isDashboardKanbanEmbed()) || {};

/** Clear dashboard-polluted customDate flags that have no real from/to. */
export const sanitizeKanbanFiltersForCount = (filters) => {
  if (!filters || typeof filters !== "object") return filters;
  const next = { ...filters };
  [
    "orderDateRange",
    "dueDateRange",
    "subTaskDueDateRange",
    "deliveryDateRange",
  ].forEach((key) => {
    const range = next[key];
    if (!range || typeof range !== "object") return;
    const hasCustom = Boolean(
      range.customDateRange &&
        (range.customDateRange.from || range.customDateRange.to),
    );
    if (range.customDate === true && !hasCustom) {
      next[key] = { ...range, customDate: false };
    }
  });
  return next;
};

export const isKanbanPathname = (pathname = "") =>
  pathname === "/orders" ||
  pathname.startsWith("/orders/") ||
  pathname === "/task" ||
  pathname.startsWith("/task/");

/** Swap `/orders` ↔ `/task` prefix while preserving the rest of the path. */
export const replaceKanbanBaseInPath = (pathname, nextBase) => {
  if (!pathname) return nextBase;
  if (pathname === "/orders" || pathname.startsWith("/orders/")) {
    return `${nextBase}${pathname.slice("/orders".length)}`;
  }
  if (pathname === "/task" || pathname.startsWith("/task/")) {
    return `${nextBase}${pathname.slice("/task".length)}`;
  }
  return pathname;
};

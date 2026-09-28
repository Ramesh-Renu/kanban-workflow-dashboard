import {
  healthyTrendingUp,
  needAttentionTrendingUp,
  needAttentionTrendingDown,
  atRiskTrendingDown,
  atRiskStageIcon,
  healthyStageIcon,
  needAttentionStageIcon,
} from "../assets/images";
import HealthySVGImage from "./../pages/Dashboard/Widget/Icons/HealthySVGImage";
import AtRiskSVGImage from "./../pages/Dashboard/Widget/Icons/AtRiskSVGImage";
import NeedsAttentionSVGImage from "./../pages/Dashboard/Widget/Icons/NeedsAttentionSVGImage";

import dayjs from "dayjs";

const formatDate = (date) => {
  const y = date?.getFullYear();
  const m = String(date?.getMonth() + 1).padStart(2, "0");
  const d = String(date?.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfMonth = (date) => new Date(date?.getFullYear(), date?.getMonth(), 1);

const endOfMonth = (date) => new Date(date?.getFullYear(), date?.getMonth() + 1, 0);

const shiftMonth = (date, offset) =>
  new Date(date?.getFullYear(), date?.getMonth() + offset, 1);
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const getWorkspaceHealthParams = (rangeType) => {
  const today = new Date();

  let currentDate, compareDate;

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  switch (rangeType) {
    case "CURRENT_MONTH": {
      const prev = shiftMonth(today, -1);
      currentDate = today;
      compareDate = endOfMonth(prev);
      break;
    }

    case "LAST_MONTH": {
      const prev = shiftMonth(today, -2);

      currentDate = endOfMonth(lastMonth);
      compareDate = endOfMonth(prev);
      break;
    }

    case "LAST_3_MONTH": {
      currentDate = today;
      compareDate = endOfMonth(
        new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1),
      );
      break;
    }

    case "LAST_6_MONTH": {
      currentDate = today;
      compareDate = endOfMonth(
        new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 4, 1),
      );
      break;
    }

    default:
      return null;
  }

  return {
    currentDate: formatDate(currentDate),
    compareDate: formatDate(compareDate),
  };
};

export const getVelocityRangeParams = (rangeType, type) => {
  const today = new Date();

  let compareThisMonth, compareWithMonth;

  const lastMonth = shiftMonth(today, -1);

  switch (rangeType) {
    case "CURRENT_MONTH": {
      if (type === "graph") {
        compareThisMonth = startOfMonth(today);
        compareWithMonth = endOfMonth(today);
      } else {
        compareThisMonth = today;
        const prev = shiftMonth(today, -1);
        compareWithMonth = endOfMonth(prev);
      }
      break;
    }

    case "LAST_MONTH": {
      if (type === "graph") {
        const prev = shiftMonth(today, -1);
        compareThisMonth = startOfMonth(prev);
        compareWithMonth = endOfMonth(prev);
      } else {
        compareThisMonth = endOfMonth(lastMonth);
        const prev = shiftMonth(today, -2);
        compareWithMonth = endOfMonth(prev);
      }
      break;
    }

    case "LAST_3_MONTH": {
      if (type === "graph") {
        compareThisMonth = today;
        compareWithMonth = shiftMonth(today, -2);
      } else {
        compareThisMonth = today;
        const compare = shiftMonth(today, -1);
        compareWithMonth = endOfMonth(
          new Date(compare.getFullYear(), compare.getMonth() - 1, 1),
        );
      }
      break;
    }

    case "LAST_6_MONTH": {
      if (type === "graph") {
        compareThisMonth = startOfMonth(today);
        compareWithMonth = shiftMonth(today, -5);
      } else {
        compareThisMonth = today;
        const compare = shiftMonth(today, -1);
        compareWithMonth = endOfMonth(
          new Date(compare.getFullYear(), compare.getMonth() - 4, 1),
        );
      }
      break;
    }
    default:
      return null;
  }

  return {
    compareThisMonth: formatDate(compareThisMonth),
    compareWithMonth: formatDate(compareWithMonth),
  };
};

export const getOrionAiInsightsParams = (rangeType, type) => {
  const today = new Date();

  let current_date, compare_date;

  const lastMonth = shiftMonth(today, -1);

  switch (rangeType) {
    case "CURRENT_MONTH": {
      if (type === "graph") {
        current_date = endOfMonth(today);
        compare_date = startOfMonth(today);
      } else {
        current_date = today;
        const prev = shiftMonth(today, -1);
        compare_date = endOfMonth(prev);
      }
      break;
    }

    case "LAST_MONTH": {
      if (type === "graph") {
        const prev = shiftMonth(today, -1);
        current_date = endOfMonth(prev);
        compare_date = startOfMonth(prev);
      } else {
        current_date = endOfMonth(lastMonth);
        const prev = shiftMonth(today, -2);
        compare_date = endOfMonth(prev);
      }
      break;
    }

    case "LAST_3_MONTH": {
      if (type === "graph") {
        current_date = shiftMonth(today, -2);
        compare_date = today;
      } else {
        current_date = today;
        const compare = shiftMonth(today, -1);
        compare_date = endOfMonth(
          new Date(compare.getFullYear(), compare.getMonth() - 1, 1),
        );
      }
      break;
    }

    case "LAST_6_MONTH": {
      if (type === "graph") {
        current_date = shiftMonth(today, -5);
        compare_date = startOfMonth(today);
      } else {
        current_date = today;
        const compare = shiftMonth(today, -1);
        compare_date = endOfMonth(
          new Date(compare.getFullYear(), compare.getMonth() - 4, 1),
        );
      }
      break;
    }
   
    default:
      return null;
  }

  return {
    current_date: formatDate(current_date),
    compare_date: formatDate(compare_date),
  };
};

/**
 * Build summarization API params for All Workspaces / Workspace / Board pages.
 * @param {"all"|"workspace"|"board"} scope
 */
export const buildAISummaryRequestParams = ({
  scope = "all",
  auth,
  rangeType,
  getSelectedDate,
  workspaceId,
  boardId,
} = {}) => {
  if (!auth?.details?.regId || auth?.details?.user_type == null) return null;
  let dates = null;
  
  if (rangeType === "CUSTOM_RANGE" && getSelectedDate) {
    const custom = customMonthDashboardDates(getSelectedDate, scope ==="all" ? "workspace" : "board");
    const raw = custom?.orionaiinsights || {};   
    dates = {
      current_date: raw.current_date || raw.fromDate || raw.start_date,
      compare_date: raw.compare_date || raw.toDate || raw.end_date,
    };
  } else if (rangeType) {
    // Workspace page uses month ranges; board/task pages use day ranges (LAST_7_DAYS…).
      const boardRange = scope === "all" ? getWorkspaceHealthParams(rangeType) : getBoardPerformanceHealthParams(rangeType);
        dates = {
          compare_date: scope === "all" ? boardRange?.compareDate : boardRange?.toDate,
          current_date: scope === "all" ? boardRange?.currentDate : boardRange?.fromDate,
        };
  }

  if (!dates?.current_date || !dates?.compare_date) return null;

  // Ensure current_date is the earlier bound when both are present
  if (dates.current_date > dates.compare_date) {
    dates = {
      current_date: dates.current_date,
      compare_date: dates.compare_date,
    };
  }

  const params = {
    reg_id: auth.details.regId,
    user_type_id: auth.details.user_type,
    current_date: dates.current_date,
    compare_date: dates.compare_date,
  };

  if (scope === "workspace" || scope === "board") {
    const wsId = workspaceId ?? safeParseLocalStorage("selectWorkspaceDashboard")?.id;
    if (wsId != null) params.workspace_id = wsId;
  }

  if (scope === "board") {
    const bId = boardId ?? safeParseLocalStorage("selectBoardDashboard")?.id;
    if (bId != null) params.board_id = bId;
  }

  return params;
};

export const getPerformanceHealthParams = (rangeType) => {
  const today = new Date();
  let fromDate, toDate;
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  switch (rangeType) {
    case "CURRENT_MONTH": {
      fromDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 4, 1);
      toDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1);
      break;
    }
    default:
      fromDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 4, 1);
      toDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 2, 0);
  }
  return {
    fromDate: formatDate(fromDate),
    toDate: formatDate(toDate),
  };
};

export const getBoardHealthSummaryParams = (rangeType) => {
  const today = new Date();
  let currentDate, compareDate;

  switch (rangeType) {
    case "LAST_7_DAYS": {
      currentDate = today;
      compareDate = addDays(today, -6);
      break;
    }

    case "LAST_30_DAYS": {
      currentDate = today;
      compareDate = addDays(today, -29);
      break;
    }

    case "LAST_60_DAYS": {
      currentDate = today;
      compareDate = addDays(today, -59);
      break;
    }

    case "LAST_90_DAYS": {
      currentDate = today;
      compareDate = addDays(today, -89);
      break;
    }

    default:
      return null;
  }
  return {
    currentDate: formatDate(currentDate),
    compareDate: formatDate(compareDate),
  };
};

export const getBoardVelocityRangeParams = (rangeType, type) => {
  const today = new Date();

  let compareThisMonth, compareWithMonth;

  switch (rangeType) {
    case "LAST_7_DAYS": {
      compareThisMonth = today;
      compareWithMonth = addDays(today, -6);
      break;
    }

    case "LAST_30_DAYS": {
      compareThisMonth = today;
      compareWithMonth = addDays(today, -29);
      break;
    }

    case "LAST_60_DAYS": {
      compareThisMonth = today;
      compareWithMonth = addDays(today, -59);
      break;
    }

    case "LAST_90_DAYS": {
      compareThisMonth = today;
      compareWithMonth = addDays(today, -89);
      break;
    }

    default:
      return null;
  }
  return {
    compareThisMonth: formatDate(compareThisMonth),
    compareWithMonth: formatDate(compareWithMonth),
  };
};

export const getBoardPerformanceHealthParams = (rangeType) => {
  const today = new Date();

  let fromDate, toDate;

  switch (rangeType) {
    case "LAST_7_DAYS": {
      fromDate = today;
      toDate = addDays(today, -6);
      break;
    }

    case "LAST_30_DAYS": {
      fromDate = today;
      toDate = addDays(today, -29);
      break;
    }

    case "LAST_60_DAYS": {
      fromDate = today;
      toDate = addDays(today, -59);
      break;
    }

    case "LAST_90_DAYS": {
      fromDate = today;
      toDate = addDays(today, -89);
      break;
    }

    default:
      return null;
  }
  return {
    fromDate: formatDate(fromDate),
    toDate: formatDate(toDate),
  };
};

/**
 * Centralized mapping for trend icons.
 * Keeps visual logic in one place.
 */
export const TREND_ICON_MAP = {
  Healthy: {
    up: healthyTrendingUp,
    down: atRiskTrendingDown,
  },
  "Needs Attention": {
    up: needAttentionTrendingUp,
    down: needAttentionTrendingDown,
  },
  "At Risk": {
    up: healthyTrendingUp,
    down: atRiskTrendingDown,
  },
};

/**
 * Normalize API compareStatus → internal direction
 */
export const getTrendDirection = (compareStatus) => {
  if (compareStatus === "Increase") return "up";
  if (compareStatus === "Decrease") return "down";
  return null;
};

/** Centralized configuration for trend tone (text color) */
export const getTrendTone = (compareStatus, healthLabel) => {
  if (compareStatus === "Increase") {
    if (healthLabel === "Needs Attention" || healthLabel === "At Risk") return "danger";
    return "healthy";
  }

  if (compareStatus === "Decrease") {
    if (healthLabel === "Needs Attention" || healthLabel === "At Risk") return "healthy";
    return "danger";
  }

  return "default";
};

/**
 * Get trend icon safely
 */
export const getTrendIcon = (healthLabel, compareStatus) => {
  const direction = getTrendDirection(compareStatus);

  if (!direction) return null;

  return TREND_ICON_MAP?.[healthLabel]?.[direction] ?? null;
};

export const customMonthDashboardDates = (input, fromPage) => {
  const start = dayjs(input?.start);
  const end = dayjs(input?.end);
console.log("input", input);

  if (input?.getMonthCount === "single") {
    const fromDate = start.subtract(5, "months").startOf("month");
    const toDate = start.endOf("month");
    return {
      workspacehealthsummary: {
        currentDate: toDate.format("YYYY-MM-DD"),
        compareDate: start.subtract(1, "months").endOf("month").format("YYYY-MM-DD"),
      },

      performancehealthsummary: {
        fromDate: fromDate.format("YYYY-MM-DD"),
        toDate: toDate.format("YYYY-MM-DD"),
      },

      velocitycomparison: {
        compareThisMonth: start.subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
      },
      compareWithMonth: start.endOf("month").format("YYYY-MM-DD"),
      orionaiinsights: {
        fromDate: fromDate.format("YYYY-MM-DD"),
        toDate: toDate.format("YYYY-MM-DD"),
      },
    };
  }

  if (input?.getMonthCount === "multiple") {
    const perfFrom = end.subtract(5, "months").startOf("month");
    const perfTo = end.endOf("month");

    return {
      workspacehealthsummary: {
        currentDate:
          fromPage === "workspace" ? end.format("YYYY-MM-DD") : end.format("YYYY-MM-DD"),
        compareDate:
          fromPage === "workspace"
            ? start.format("YYYY-MM-DD")
            : start.format("YYYY-MM-DD"),
      },

      performancehealthsummary: {
        fromDate:
          fromPage === "workspace"
            ? perfFrom.format("YYYY-MM-DD")
            : start.format("YYYY-MM-DD"),
        toDate:
          fromPage === "workspace"
            ? perfTo.format("YYYY-MM-DD")
            : end.format("YYYY-MM-DD"),
      },

      velocitycomparison: {
        compareThisMonth:
          fromPage === "workspace"
            ? end.format("YYYY-MM-DD")
            : start.format("YYYY-MM-DD"),
        compareWithMonth:
          fromPage === "workspace"
            ? start.format("YYYY-MM-DD")
            : end.format("YYYY-MM-DD"),
      },
      orionaiinsights: {
        current_date:
        fromPage === "workspace" ? end.format("YYYY-MM-DD") : end.format("YYYY-MM-DD"),
        compare_date:
        fromPage === "workspace"
          ? start.format("YYYY-MM-DD")
          : start.format("YYYY-MM-DD"),
      },
    };
  }
};

export const COLORS_VALUES = (MaterValue) => {
  return {
    healthy:
      MaterValue?.filter(
        (check) =>
          check.label.toLowerCase().toString().replaceAll(" ", "-") === "healthy",
      )[0]?.color || "#0f9d74",
    needsAttention:
      MaterValue?.filter(
        (check) =>
          check.label.toLowerCase().toString().replaceAll(" ", "-") === "needs-attention",
      )[0]?.color || "#d97706",
    atRisk: MaterValue?.filter(
      (check) => check.label.toLowerCase().toString().replaceAll(" ", "-") === "at-risk",
    )[0]?.color,
    muted: "#e5e7eb",
    line:
      MaterValue?.filter(
        (check) =>
          check.label.toLowerCase().toString().replaceAll(" ", "-") === "healthy",
      )[0]?.color || "#e5e7eb",
    marker:
      MaterValue?.filter(
        (check) =>
          check.label.toLowerCase().toString().replaceAll(" ", "-") === "healthy",
      )[0]?.color || "#e5e7eb",
    disabled: "#e5e7eb",
    total: "#4F46E5",
  };
};

export const HEALTH_CONFIG = (dashboardMaterValue) => {
  return {
    healthy: {
      Icon: HealthySVGImage,
      color: COLORS_VALUES(dashboardMaterValue).healthy || "#0f9d74",
    },
    needs_attention: {
      Icon: NeedsAttentionSVGImage,
      color: COLORS_VALUES(dashboardMaterValue).needsAttention || "#d97706",
    },
    at_risk: {
      Icon: AtRiskSVGImage,
      color: COLORS_VALUES(dashboardMaterValue).atRisk || "#e11d48",
    },
  };
};

export const STATUS_CONFIG = () => {
  return {
    Healthy: {
      tone: "healthy",
      countTone: "healthy",
      icon: healthyStageIcon,
      cta: { label: "Review Details", tone: "neutral" },
    },
    "Needs Attention": {
      tone: "needs-attention",
      countTone: "warning",
      icon: needAttentionStageIcon,
      cta: { label: "Take Action", tone: "warning" },
    },
    "At Risk": {
      tone: "at-risk",
      countTone: "danger",
      icon: atRiskStageIcon,
      cta: { label: "Resolve Incidents", tone: "danger" },
    },
  };
};

export const WORKSPACE_FILTER_OPTIONS = [
  { label: "Current Month", value: "CURRENT_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
  { label: "Last 3 Month", value: "LAST_3_MONTH" },
  { label: "Last 6 Month", value: "LAST_6_MONTH" },
  { label: "Custom Date Range", value: "CUSTOM_RANGE" },
];

export const BOARD_FILTER_OPTIONS = [
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "Last 60 Days", value: "LAST_60_DAYS" },
  { label: "Last 90 Days", value: "LAST_90_DAYS" },
  { label: "Custom Date Range", value: "CUSTOM_RANGE" },
];

export const WORKSPACE_TABS = [
  "Overview Workspaces",
  "Board Performance",
  "Resource Allocation",
  "Stage Time Analytics",
];

export const BOARD_TASK_TABS = [
  { label: "All Task", value: "all_task" },
  { label: "My Task", value: "my_task" },
];

export const BOARD_ORDER_TOOL_TASK_TABS = [
  { filter_id: 2025, name: "Orders", key: "mainTask", value: "Maintask" },
  { filter_id: 2026, name: "Tools", key: "subTask", value: "Subtask" },
];

export const DASHBOARD_ROUTES = {
  home: "/dashboard",
  workspace: "/dashboard/workspace",
  board: "/dashboard/workspace/board",
  details: (boardId, orderId) => `/dashboard/board/details/${boardId}/${orderId}`,
};

/**
 * Same route + location.state as OrderAndToolsTable "external link" click,
 * so ticket details show Dashboard breadcrumbs (not Orders/Task kanban crumbs).
 */
export const getDashboardTicketDetailsNav = (boardId, orderId, extras = {}) => {
  const workSpaceId =
    extras.workSpaceId ?? safeParseLocalStorage("selectWorkspaceDashboard")?.id;
  const storedBoard = safeParseLocalStorage("selectBoardDashboard");
  const storedWorkspace = safeParseLocalStorage("selectWorkspaceDashboard");
  const boardType =
    extras.boardType ??
    (storedBoard?.type === "board"
      ? "board"
      : storedWorkspace?.type || "task");

  let path = DASHBOARD_ROUTES.details(boardId, Number(orderId));
  if (extras.query) path += extras.query;

  return {
    path,
    state: {
      from: "dashboard",
      boardType,
      workSpaceId,
      ticketId: Number(orderId),
      ...(extras.state || {}),
    },
  };
};

/** Order (IOD) vs Task workflow types on workspaceDTO */
export const WORKFLOW_TYPE = {
  ORDER: 60,
  TASK: 61,
};

export const isDashboardAdmin = (details) =>
  Boolean(details?.isSuperAdmin || details?.user_type_code === "ADM");

export const ADMIN_DASHBOARD_SCOPE = {
  ALL: "all",
  MINE: "mine",
};

export const ADMIN_DASHBOARD_SCOPE_KEY = "adminDashboardWorkspaceScope";
export const ADMIN_KANBAN_SCOPE_KEY = "adminKanbanWorkspaceScope";

/**
 * Admin (ADM) with board/workspace role assignments can switch My vs All workspace.
 * USR never sees this toggle — they always use workspaceDTO.
 */
export const hasAdminMyWorkspaceRoles = (details) =>
  details?.user_type_code === "ADM" &&
  Array.isArray(details?.userRoleResponseDetail) &&
  details.userRoleResponseDetail.filter(Boolean).length > 0;

export const getAdminDashboardScope = () => {
  try {
    const raw = localStorage.getItem(ADMIN_DASHBOARD_SCOPE_KEY);
    return raw === ADMIN_DASHBOARD_SCOPE.MINE
      ? ADMIN_DASHBOARD_SCOPE.MINE
      : ADMIN_DASHBOARD_SCOPE.ALL;
  } catch {
    return ADMIN_DASHBOARD_SCOPE.ALL;
  }
};

export const setAdminDashboardScope = (scope) => {
  try {
    localStorage.setItem(
      ADMIN_DASHBOARD_SCOPE_KEY,
      scope === ADMIN_DASHBOARD_SCOPE.MINE
        ? ADMIN_DASHBOARD_SCOPE.MINE
        : ADMIN_DASHBOARD_SCOPE.ALL,
    );
  } catch {
    /* ignore */
  }
};

/** Kanban defaults to My Workspace for admins with role assignments. */
export const getAdminKanbanScope = () => {
  try {
    const raw = localStorage.getItem(ADMIN_KANBAN_SCOPE_KEY);
    if (raw == null) return ADMIN_DASHBOARD_SCOPE.MINE;
    return raw === ADMIN_DASHBOARD_SCOPE.ALL
      ? ADMIN_DASHBOARD_SCOPE.ALL
      : ADMIN_DASHBOARD_SCOPE.MINE;
  } catch {
    return ADMIN_DASHBOARD_SCOPE.MINE;
  }
};

export const setAdminKanbanScope = (scope) => {
  try {
    localStorage.setItem(
      ADMIN_KANBAN_SCOPE_KEY,
      scope === ADMIN_DASHBOARD_SCOPE.ALL
        ? ADMIN_DASHBOARD_SCOPE.ALL
        : ADMIN_DASHBOARD_SCOPE.MINE,
    );
  } catch {
    /* ignore */
  }
};

export const isAdminMyWorkspaceMode = (details) =>
  hasAdminMyWorkspaceRoles(details) &&
  getAdminDashboardScope() === ADMIN_DASHBOARD_SCOPE.MINE;

export const isAdminKanbanMyWorkspaceMode = (details) =>
  hasAdminMyWorkspaceRoles(details) &&
  getAdminKanbanScope() === ADMIN_DASHBOARD_SCOPE.MINE;

/**
 * Map userRoleResponseDetail → workspaceDTO-shaped list (joined with workspaceDTO
 * for workflowType / board metadata when available).
 */
export const mapUserRoleResponseToWorkspaceDTO = (details) => {
  const roles = Array.isArray(details?.userRoleResponseDetail)
    ? details.userRoleResponseDetail.filter(Boolean)
    : [];
  const dtoList = Array.isArray(details?.workspaceDTO) ? details.workspaceDTO : [];

  return roles
    .map((roleWs) => {
      const workSpaceId = roleWs?.workSpaceId ?? roleWs?.work_space_id;
      if (workSpaceId == null) return null;

      const dtoWs = dtoList.find(
        (ws) => Number(ws?.work_space_id) === Number(workSpaceId),
      );
      const roleBoards = Array.isArray(roleWs?.boards) ? roleWs.boards : [];
      const roleBoardIds = new Set(
        roleBoards
          .map((board) => Number(board?.boardId ?? board?.boardID))
          .filter((id) => !Number.isNaN(id)),
      );

      let boardList = (dtoWs?.boardList || []).filter((board) =>
        roleBoardIds.has(Number(board?.boardID ?? board?.boardId)),
      );

      if (!boardList.length && roleBoards.length) {
        boardList = roleBoards.map((board) => {
          const boardId = board?.boardId ?? board?.boardID;
          const dtoBoard = (dtoWs?.boardList || []).find(
            (item) => Number(item?.boardID ?? item?.boardId) === Number(boardId),
          );
          return {
            ...(dtoBoard || {}),
            boardID: boardId ?? dtoBoard?.boardID ?? dtoBoard?.boardId,
            name: dtoBoard?.name ?? board?.boardName ?? board?.name,
            code: dtoBoard?.code ?? board?.boardCode ?? board?.code,
            mainBoardID:
              dtoBoard?.mainBoardID ??
              dtoBoard?.mainBoardId ??
              board?.mainBoardID ??
              board?.mainBoardId ??
              null,
            mainBoardId:
              dtoBoard?.mainBoardId ??
              dtoBoard?.mainBoardID ??
              board?.mainBoardId ??
              board?.mainBoardID ??
              null,
            mainBoardName:
              dtoBoard?.mainBoardName ?? board?.mainBoardName ?? null,
          };
        });
      }

      if (!boardList.length) return null;

      return {
        ...(dtoWs || {}),
        work_space_id: workSpaceId,
        name: dtoWs?.name ?? roleWs?.workSpaceName ?? roleWs?.name ?? "Workspace",
        workflowType:
          dtoWs?.workflowType ??
          dtoWs?.workFlowType ??
          roleWs?.workflowType ??
          roleWs?.workFlowType,
        boardList,
      };
    })
    .filter(Boolean);
};

/** Kanban switcher list: My → userRoleResponseDetail; All → workspaceDTO. */
export const getAdminKanbanWorkspaceList = (details) => {
  if (!hasAdminMyWorkspaceRoles(details)) {
    return Array.isArray(details?.workspaceDTO) ? details.workspaceDTO : [];
  }
  if (getAdminKanbanScope() === ADMIN_DASHBOARD_SCOPE.MINE) {
    return mapUserRoleResponseToWorkspaceDTO(details);
  }
  return Array.isArray(details?.workspaceDTO) ? details.workspaceDTO : [];
};

/** Treat like USR for API/list scoping (non-admin, or admin in My Workspace). */
export const isDashboardScopedToMyWorkspaces = (details) =>
  !isDashboardAdmin(details) || isAdminMyWorkspaceMode(details);

export const getWorkspaceDtoWorkflowTypes = (details) => {
  const types = new Set();
  (details?.workspaceDTO || []).forEach((workspace) => {
    const type = Number(workspace?.workflowType ?? workspace?.workFlowType);
    if (!Number.isNaN(type)) types.add(type);
  });
  return types;
};

/** Both Order (60) and Task (61) workspaces → workspace list first. */
export const hasOrderAndTaskWorkspaces = (details) => {
  const types = getWorkspaceDtoWorkflowTypes(details);
  return types.has(WORKFLOW_TYPE.ORDER) && types.has(WORKFLOW_TYPE.TASK);
};

/** Only Order (60) or only Task (61) → boards list directly. */
export const hasSingleWorkflowTypeBoardsHome = (details) => {
  const types = getWorkspaceDtoWorkflowTypes(details);
  if (types.size !== 1) return false;
  return types.has(WORKFLOW_TYPE.ORDER) || types.has(WORKFLOW_TYPE.TASK);
};

/**
 * Boards the member / "My Workspace" admin can open on the dashboard.
 * Admin "All Workspace" returns null (no single-board shortcut).
 */
export const getAccessibleDashboardBoards = (details) => {
  if (!details) return [];
  if (isDashboardAdmin(details) && !isAdminMyWorkspaceMode(details)) {
    return null;
  }

  const workspaces =
    isAdminMyWorkspaceMode(details) && hasAdminMyWorkspaceRoles(details)
      ? mapUserRoleResponseToWorkspaceDTO(details)
      : Array.isArray(details?.workspaceDTO)
        ? details.workspaceDTO
        : [];

  const boards = [];
  const seen = new Set();

  workspaces.forEach((workspace) => {
    const workspaceId = workspace?.work_space_id;
    const workspaceName = workspace?.name || "";
    (workspace?.boardList || []).forEach((board) => {
      const id = board?.boardID ?? board?.boardId;
      if (id == null) return;
      const key = String(id);
      if (seen.has(key)) return;
      seen.add(key);
      boards.push({
        id,
        name: String(board?.name ?? board?.boardName ?? "").trim(),
        workspaceId,
        workspaceName,
        code: board?.code ?? board?.boardCode ?? null,
      });
    });
  });

  return boards;
};

export const getSingleAccessibleDashboardBoard = (details) => {
  const boards = getAccessibleDashboardBoards(details);
  if (!boards || boards.length !== 1) return null;
  return boards[0];
};

/** Persist workspace + board selection used by /dashboard/workspace/board. */
export const persistDashboardBoardSelection = (board, extras = {}) => {
  if (!board?.id) return;
  localStorage.setItem(
    "selectBoardDashboard",
    JSON.stringify({
      type: "board",
      id: board.id,
      name: board.name || "",
      status: extras.status,
      statusTone: extras.statusTone,
      workspaceId: board.workspaceId ?? extras.workspaceId ?? null,
      workspaceName: board.workspaceName ?? extras.workspaceName ?? "",
    }),
  );
  if (board.workspaceId != null || extras.workspaceId != null) {
    localStorage.setItem(
      "selectWorkspaceDashboard",
      JSON.stringify({
        type: "workspace",
        id: board.workspaceId ?? extras.workspaceId,
        name: board.workspaceName ?? extras.workspaceName ?? "",
        status: extras.status,
        statusTone: extras.statusTone,
      }),
    );
  }
};

/**
 * When the user has exactly one accessible board, persist selection and return
 * the board dashboard route. Otherwise return null.
 */
export const ensureSingleBoardDashboardHome = (details) => {
  const board = getSingleAccessibleDashboardBoard(details);
  if (!board) return null;
  persistDashboardBoardSelection(board);
  return DASHBOARD_ROUTES.board;
};

/** USR has both Order (60) and Task (61) workspaces → show workspace list first. */
export const usrHasOrderAndTaskWorkspaces = (details) => {
  if (details?.user_type_code !== "USR") return false;
  return hasOrderAndTaskWorkspaces(details);
};

/** USR only has Order (60) or only Task (61) → go straight to boards list. */
export const usrHasSingleWorkflowTypeBoardsHome = (details) => {
  if (details?.user_type_code !== "USR") return false;
  return hasSingleWorkflowTypeBoardsHome(details);
};

/** Path when Admin switches to My Workspace (same 60/61 rules as USR). */
export const getAdminMyWorkspaceHomePath = (details) => {
  if (getSingleAccessibleDashboardBoard(details)) return DASHBOARD_ROUTES.board;
  if (hasOrderAndTaskWorkspaces(details)) return DASHBOARD_ROUTES.home;
  if (hasSingleWorkflowTypeBoardsHome(details)) return DASHBOARD_ROUTES.workspace;
  return DASHBOARD_ROUTES.workspace;
};

export const getDashboardHomePath = (details) => {
  if (getSingleAccessibleDashboardBoard(details)) return DASHBOARD_ROUTES.board;

  if (isDashboardAdmin(details)) {
    if (isAdminMyWorkspaceMode(details)) {
      return getAdminMyWorkspaceHomePath(details);
    }
    return DASHBOARD_ROUTES.home;
  }
  // USR with both 60 + 61: workspace list, then click workspace → boards
  if (usrHasOrderAndTaskWorkspaces(details)) return DASHBOARD_ROUTES.home;
  // USR with only 60 or only 61: boards dashboard / board list
  if (usrHasSingleWorkflowTypeBoardsHome(details)) return DASHBOARD_ROUTES.workspace;
  return DASHBOARD_ROUTES.workspace;
};

/**
 * Breadcrumb "up" target — never the board page itself.
 * Single-board shortcuts are for initial landing only; from Board the admin must
 * be able to return to the Workspaces (or My Workspace boards) list.
 */
export const getDashboardBreadcrumbHomePath = (details) => {
  if (isDashboardAdmin(details)) {
    if (isAdminMyWorkspaceMode(details)) {
      // Mixed Order+Task → workspaces list; otherwise My Workspace boards list
      if (hasOrderAndTaskWorkspaces(details)) return DASHBOARD_ROUTES.home;
      return DASHBOARD_ROUTES.workspace;
    }
    // All Workspace → always the workspaces overview
    return DASHBOARD_ROUTES.home;
  }
  if (usrHasOrderAndTaskWorkspaces(details)) return DASHBOARD_ROUTES.home;
  return DASHBOARD_ROUTES.workspace;
};

/** Label for the dashboard home breadcrumb. */
export const getDashboardHomeBreadcrumbLabel = () => "Dashboard";

/**
 * Restore localStorage so navigating to dashboard home shows the correct list
 * (All/My workspaces, or My Workspace boards) instead of a stale selection.
 */
export const prepareDashboardHomeNavigation = (details) => {
  const homePath = getDashboardBreadcrumbHomePath(details);
  localStorage.removeItem("selectBoardDashboard");

  if (homePath === DASHBOARD_ROUTES.workspace) {
    const dtoIds = (details?.workspaceDTO || [])
      .map((workspace) => Number(workspace?.work_space_id))
      .filter((id) => Number.isFinite(id));
    const soleIodWorkspace =
      dtoIds.length > 0 && dtoIds.every((id) => id === 1) ? 1 : null;

    localStorage.setItem(
      "selectWorkspaceDashboard",
      JSON.stringify({
        type: "workspace",
        ...(soleIodWorkspace != null ? { id: soleIodWorkspace } : {}),
        name: isAdminMyWorkspaceMode(details) ? "My Workspace" : "Workspace",
        myWorkspaceBoardsHome: true,
      }),
    );
  } else if (homePath === DASHBOARD_ROUTES.home) {
    localStorage.removeItem("selectWorkspaceDashboard");
  }

  return homePath;
};

export const getWorkspaceDtoIds = (details) =>
  (details?.workspaceDTO || [])
    .map((workspace) => workspace.work_space_id)
    .filter((id) => id != null);

export const getWorkspaceDtoBoardIds = (details) => {
  const fromDto = (details?.workspaceDTO || []).flatMap((workspace) =>
    (workspace.boardList || []).map((board) => board.boardID ?? board.boardId),
  );
  const ids = fromDto.filter((id) => id != null);
  if (ids.length) return ids;
  return (details?.userBoardIds || []).filter((id) => id != null);
};

export const getWorkspaceDtoBoardIdsForWorkspace = (details, workspaceId) => {
  if (workspaceId == null) return getWorkspaceDtoBoardIds(details);
  const workspace = (details?.workspaceDTO || []).find(
    (item) => Number(item.work_space_id) === Number(workspaceId),
  );
  if (!workspace) return getWorkspaceDtoBoardIds(details);
  return (workspace.boardList || [])
    .map((board) => board.boardID ?? board.boardId)
    .filter((id) => id != null);
};

/** Boards assigned through userRoleResponseDetail, optionally limited to one workspace. */
export const getUserRoleBoardIds = (details, workspaceId) => {
  const workspaces = mapUserRoleResponseToWorkspaceDTO(details);
  const scoped =
    workspaceId == null
      ? workspaces
      : workspaces.filter(
          (workspace) => Number(workspace.work_space_id) === Number(workspaceId),
        );
  return scoped
    .flatMap((workspace) =>
      (workspace.boardList || []).map((board) => board.boardID ?? board.boardId),
    )
    .filter((id) => id != null);
};

/**
 * My Workspace (admin) → boards from userRoleResponseDetail.
 * All Workspace / USR → boards from workspaceDTO.
 */
export const getScopedBoardIds = (details, workspaceId, isMyWorkspaceScope) => {
  const myWorkspaceScope = isMyWorkspaceScope ?? isAdminMyWorkspaceMode(details);
  if (myWorkspaceScope && hasAdminMyWorkspaceRoles(details)) {
    const roleBoardIds = getUserRoleBoardIds(details, workspaceId);
    if (roleBoardIds.length) return roleBoardIds;
  }
  return workspaceId == null
    ? getWorkspaceDtoBoardIds(details)
    : getWorkspaceDtoBoardIdsForWorkspace(details, workspaceId);
};

export const getDashboardApiWorkspaceIds = (details, boardType) => {
  const scopedToMine = isDashboardScopedToMyWorkspaces(details);
  if (scopedToMine && boardType === "workspace") {
    const selected = safeParseLocalStorage("selectWorkspaceDashboard");
    // Mixed 60+61: after clicking a workspace, scope APIs to that workspace only.
    if (
      hasOrderAndTaskWorkspaces(details) &&
      selected?.id != null &&
      !selected?.myWorkspaceBoardsHome
    ) {
      return [selected.id];
    }
    return getWorkspaceDtoIds(details);
  }
  if (boardType === "board") {
    const boardWorkspaceId = safeParseLocalStorage("selectBoardDashboard")?.workspaceId;
    if (boardWorkspaceId != null) return [boardWorkspaceId];
    const selectedId = safeParseLocalStorage("selectWorkspaceDashboard")?.id;
    return selectedId != null ? [selectedId] : getWorkspaceDtoIds(details);
  }
  if (boardType === "workspace") {
    const selected = safeParseLocalStorage("selectWorkspaceDashboard");
    if (selected?.id != null && !selected?.myWorkspaceBoardsHome) {
      return [selected.id];
    }
    return getWorkspaceDtoIds(details);
  }
  return getWorkspaceDtoIds(details);
};

export const getDashboardApiBoardIds = (
  details,
  {
    boardType,
    filterBoardId,
    taskType,
    isBoardScoped = false,
    adminDashboardWorkspaceScope,
  } = {},
) => {
  if (isBoardScoped || boardType === "board") {
    return filterBoardId ?? [safeParseLocalStorage("selectBoardDashboard")?.id];
  }
  if (isDashboardScopedToMyWorkspaces(details) && boardType === "workspace") {
    if (filterBoardId) return filterBoardId;
    const selected = safeParseLocalStorage("selectWorkspaceDashboard");
    if (
      hasOrderAndTaskWorkspaces(details) &&
      selected?.id != null &&
      !selected?.myWorkspaceBoardsHome
    ) {
      return getScopedBoardIds(details, selected.id, adminDashboardWorkspaceScope);
    }
    return getScopedBoardIds(details, null, adminDashboardWorkspaceScope);
  }
  if (
    isIodDashboardWorkspace() &&
    taskType === "Maintask"
  ) {
    return null;
  }
  return filterBoardId || null;
};

/** Board role from userinfo.userRoleResponseDetail for a selected board. */
export const getUserBoardRoleDetail = (details, boardId) => {
  if (!details || boardId == null) return null;
  const workspaces = Array.isArray(details.userRoleResponseDetail)
    ? details.userRoleResponseDetail
    : [];
  for (const workspace of workspaces) {
    const boards = Array.isArray(workspace?.boards) ? workspace.boards : [];
    const board = boards.find(
      (item) => Number(item?.boardId ?? item?.boardID) === Number(boardId),
    );
    if (board) return board;
  }
  return null;
};

export const isBoardManagerOrLeadRole = (roleDetail) => {
  const roleName = roleDetail?.roleName;
  const roleCode = roleDetail?.roleCode;
  return (
    roleName === "Manager" ||
    roleName === "Lead" ||
    roleCode === "MAN" ||
    roleCode === "LEA"
  );
};

export const isBoardMemberRole = (roleDetail) => {
  const roleName = roleDetail?.roleName;
  const roleCode = roleDetail?.roleCode;
  return roleName === "Member" || roleCode === "MEM";
};

/**
 * USR board dashboard: Manager/Lead can use assignee filter.
 * Member cannot — APIs must send their own regId as assignee.
 * Admin My Workspace: same as Member (hide filter, self-only data).
 * Admin All Workspace: keep assignee filter.
 */
export const canShowDashboardAssigneeFilter = (details, boardId) => {
  if (isAdminMyWorkspaceMode(details)) return false;
  if (isDashboardAdmin(details)) return true;
  if (details?.user_type_code !== "USR") return true;
  const roleDetail = getUserBoardRoleDetail(details, boardId);
  if (!roleDetail) return false;
  return isBoardManagerOrLeadRole(roleDetail);
};

export const resolveDashboardAssigneeParam = (details, boardId, selectedAssignee) => {
  if (isAdminMyWorkspaceMode(details)) {
    return details?.regId != null ? [details.regId] : null;
  }
  if (
    details?.user_type_code === "USR" &&
    isBoardMemberRole(getUserBoardRoleDetail(details, boardId))
  ) {
    return details?.regId != null ? [details.regId] : null;
  }
  if (Array.isArray(selectedAssignee) && selectedAssignee.length === 0) {
    return null;
  }
  return selectedAssignee || null;
};

export const isTaskDashboardPath = (pathname = "") =>
  pathname.includes(DASHBOARD_ROUTES.board) || pathname.includes("/board/task");

export const getDashboardTablePath = (boardType) =>
  boardType === "workspace" ? DASHBOARD_ROUTES.workspace : DASHBOARD_ROUTES.board;

export const BOARD_DASHBOARD_TABS = (workspaceId) => [
  { filter_id: 22, name: "Overview", key: "overview", value: "Overview" },
  {
    filter_id: 23,
    name: Number(workspaceId) === 1 ? "Orders" : "Tasks",
    key: "orderAndTools",
    value: "OrderAndTools",
  },
];
export const BOARD_MAIN_SUB_TASK_TABS = [
  { name: "Main Task", key: "mainTask", value: "Maintask", filter_id: 3020 },
  { name: "Sub Task", key: "subTask", value: "Subtask", filter_id: 3120 },
];
export const BOARD_HEALTH_FILTERS = [
  {
    name: "Healthy",
    key: "status",
    value: true,
    filter_id: 1,
  },
  {
    name: "Needs Attention",
    key: "status",
    value: true,
    filter_id: 2,
  },
  {
    name: "At Risk",
    key: "status",
    value: true,
    filter_id: 3,
  },
];
/** Maps tab / taskType values to `boardHealthSummary` keys in the API response (`mainTask`, `subTask`). */
export const BOARD_HEALTH_SUMMARY_RESPONSE_KEY = {
  Maintask: "mainTask",
  Subtask: "subTask",
};

export const TOOL_TIP_LIST = [
  { healthy: "Healthy" },
  { needsAttention: "Attention" },
  { atRisk: "At Risk" },
];

export const HEALTH_FILTERS = [
  // { id: 1, name: "All Healthy" },
  { id: 2, name: "Healthy" },
  { id: 3, name: "Needs Attention" },
  { id: 4, name: "At Risk" },
];
export const safeParseLocalStorage = (key, fallback = {}) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

/** IOD / Internal Order Delivery workspace id used by dashboard layouts. */
export const IOD_DASHBOARD_WORKSPACE_ID = 1;

const toWorkspaceIdNumber = (id) => {
  if (id == null || id === "") return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
};

/** Selected dashboard workspace id as a number (handles string ids from API/localStorage). */
export const getSelectedDashboardWorkspaceId = (details) => {
  const selected = safeParseLocalStorage("selectWorkspaceDashboard");
  const fromSelected = toWorkspaceIdNumber(selected?.id);
  if (fromSelected != null) return fromSelected;

  const fromBoard = toWorkspaceIdNumber(
    safeParseLocalStorage("selectBoardDashboard")?.workspaceId,
  );
  if (fromBoard != null) return fromBoard;

  // My Workspace boards home often has no id — if every accessible workspace is IOD, use 1.
  if (selected?.myWorkspaceBoardsHome && details) {
    const ids = getWorkspaceDtoIds(details)
      .map(toWorkspaceIdNumber)
      .filter((id) => id != null);
    if (ids.length > 0 && ids.every((id) => id === IOD_DASHBOARD_WORKSPACE_ID)) {
      return IOD_DASHBOARD_WORKSPACE_ID;
    }
  }

  return null;
};

/**
 * True for IOD workspace dashboard (Orders / Tools layout).
 * @param {number|string|object} [workspaceIdOrDetails] workspace id, or auth details for fallbacks
 */
export const isIodDashboardWorkspace = (workspaceIdOrDetails) => {
  // Explicit id (number/string)
  if (
    workspaceIdOrDetails != null &&
    (typeof workspaceIdOrDetails === "number" ||
      typeof workspaceIdOrDetails === "string")
  ) {
    return toWorkspaceIdNumber(workspaceIdOrDetails) === IOD_DASHBOARD_WORKSPACE_ID;
  }

  const details =
    workspaceIdOrDetails != null && typeof workspaceIdOrDetails === "object"
      ? workspaceIdOrDetails
      : null;

  if (getSelectedDashboardWorkspaceId(details) === IOD_DASHBOARD_WORKSPACE_ID) {
    return true;
  }

  // Scoped API workspace list is solely IOD
  if (details) {
    const ids = getWorkspaceDtoIds(details)
      .map(toWorkspaceIdNumber)
      .filter((id) => id != null);
    const selected = safeParseLocalStorage("selectWorkspaceDashboard");
    if (
      selected?.myWorkspaceBoardsHome &&
      ids.length > 0 &&
      ids.every((id) => id === IOD_DASHBOARD_WORKSPACE_ID)
    ) {
      return true;
    }
  }

  return false;
};

export const hexToRgba = (hex, alpha = 1) => {
  const cleanHex = hex?.replace("#", "");
  const bigint = parseInt(cleanHex ?? "000000", 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const normalizeSparklineSeries = (raw) => {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((point) => {
      if (typeof point === "number") return point;
      if (point == null) return 0;
      return Number(point.value ?? point.percentage ?? point.y ?? point.count ?? 0);
    });
  }

  return [];
};

/** Uses API graph series when present; otherwise builds a short overdue % trend from progress. */
export const buildWorkspaceSparklineSeries = (item = {}) => {
  const fromApi = normalizeSparklineSeries(
    item.graphData ??
      item.graph ??
      item.progress?.graph ??
      item.progress?.trendGraph ??
      item.progress?.graphData,
  );

  if (fromApi.length >= 2) return fromApi;

  const end = Math.max(0, Number(item.progress) || 0);
  const pointCount = 6;
  const direction =
    item.compareStatus === "Increase" ? 1 : item.compareStatus === "Decrease" ? -1 : 0;

  const start =
    direction > 0
      ? Math.max(0, end - Math.max(10, end * 0.4))
      : direction < 0
        ? end + Math.max(10, end * 0.25)
        : Math.max(0, end - 4);

  const seed = String(item.id ?? item.name ?? "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return Array.from({ length: pointCount }, (_, index) => {
    const t = index / (pointCount - 1);
    const base = start + (end - start) * t;
    const wobble = ((seed * (index + 1)) % 9) - 4;
    const value = index === pointCount - 1 ? end : base + wobble * 0.5;
    return Math.max(0, Math.round(value));
  });
};
/**
 * My Workspace (admin) → boards from userRoleResponseDetail.
 * All Workspace / USR → boards from workspaceDTO.
 */
export const getBoardsByWorkspace = (
  workspaceDTO,
  workspaceIds,
  userRoleResponseDetail,
  isMyWorkspaceScope = false,
) => {
  const hasRoles = (userRoleResponseDetail || []).filter(Boolean).length > 0;
  const workspaces =
    isMyWorkspaceScope && hasRoles
      ? mapUserRoleResponseToWorkspaceDTO({ workspaceDTO, userRoleResponseDetail })
      : workspaceDTO;
  const ids = (workspaceIds || []).map(Number);

  return (workspaces || [])
    .filter((ws) => ids.includes(Number(ws.work_space_id))) // ✅ filter workspace
    .flatMap((ws) =>
      (ws.boardList || []).map((board) => ({
        boardId: board.boardID ?? board.boardId,
        boardName: String(board.name ?? board.boardName ?? "").trim(), // clean extra space
      })),
    );
};

/** Boards (with labels) for dashboard stage filters — workspace view vs single board view. */
export const getBoardStageListFromWorkspaces = (
  workspacesData,
  { boardType, workspaceId, boardId } = {},
) => {
  const workspaces = workspacesData || [];

  if (boardType === "board" && boardId != null) {
    for (const workspace of workspaces) {
      const matchedBoard = (workspace?.boards || []).find(
        (board) => String(board.boardId) === String(boardId),
      );
      if (matchedBoard) {
        return [matchedBoard];
      }
    }
    return [];
  }

  const workspace = workspaces.find(
    (item) => String(item.workspaceId) === String(workspaceId),
  );
  return workspace?.boards || [];
};

const STAGE_DISTRIBUTION_COLORS = [
  "#00ADF0",
  "#22C55E",
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#94A3B8",
  "#14B8A6",
  "#8B5CF6",
];

export const resolveStageDistributionColor = (color, index = 0) => {
  if (typeof color === "string" && color.trim()) {
    return color.trim();
  }
  return STAGE_DISTRIBUTION_COLORS[index % STAGE_DISTRIBUTION_COLORS.length];
};

const getNumericMetric = (value, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  if (typeof value === "object") {
    return getNumericMetric(value.count ?? value.value ?? value.total, fallback);
  }
  return fallback;
};

const pickFirstArray = (...candidates) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
};

const isPlainObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

/** Unwrap axios/business envelopes so stage distribution keys are at the top level. */
export const unwrapDashboardApiPayload = (source) => {
  if (!isPlainObject(source)) return {};

  if (isPlainObject(source.data?.data)) {
    return { ...source.data, ...source.data.data };
  }
  if (isPlainObject(source.data)) {
    return source.data;
  }
  return source;
};

const getDistributionArray = (source, keys = []) => {
  if (!isPlainObject(source)) return [];

  const layers = [unwrapDashboardApiPayload(source)];
  if (isPlainObject(source.taskSummaryItem)) {
    layers.push(source.taskSummaryItem);
  }

  for (const layer of layers) {
    for (const key of keys) {
      if (Array.isArray(layer[key]) && layer[key].length > 0) {
        return layer[key];
      }
    }

    const lowerKeySet = new Set(keys.map((key) => key.toLowerCase()));
    for (const [entryKey, value] of Object.entries(layer)) {
      if (
        lowerKeySet.has(entryKey.toLowerCase()) &&
        Array.isArray(value) &&
        value.length > 0
      ) {
        return value;
      }
    }
  }

  return [];
};

const mapAgeListToBuckets = (ageList = []) => {
  const buckets = { age0To3: 0, age4To7: 0, age8Plus: 0 };
  const bucketByAgeId = {
    1: "age0To3",
    2: "age4To7",
    3: "age8Plus",
  };

  for (const item of ageList) {
    const count = getNumericMetric(item?.ageCount ?? item?.count);
    if (!count) continue;

    const ageId = Number(item?.ageId);
    const bucketKey = bucketByAgeId[ageId];
    if (bucketKey) {
      buckets[bucketKey] += count;
      continue;
    }

    const name = String(item?.ageName ?? item?.name ?? "").toLowerCase();
    if (name.includes("0-3") || name.includes("0 to 3")) {
      buckets.age0To3 += count;
    } else if (name.includes("4-7") || name.includes("4 to 7")) {
      buckets.age4To7 += count;
    } else if (name.includes("8+") || name.includes("8 +") || name.endsWith("8+d")) {
      buckets.age8Plus += count;
    }
  }

  return buckets;
};

const getStageRowName = (row) =>
  row?.stageName ?? row?.name ?? row?.label ?? row?.stage ?? "";

const getStageRowId = (row) => row?.stageId ?? row?.id ?? row?.labelId;

/** Map stage id/name to colors from the workload reference list. */
export const buildStageDistributionColorMap = (referenceRows = []) => {
  const map = new Map();

  referenceRows.forEach((row, index) => {
    const color = resolveStageDistributionColor(
      row.color ?? row.colorCode ?? row.color_Code,
      index,
    );
    const id = getStageRowId(row);
    const name = getStageRowName(row);
    if (id != null) map.set(String(id), color);
    if (name) map.set(name, color);
  });

  return map;
};

const alignRowsToReferenceOrder = (rows, referenceRows = []) => {
  if (!referenceRows.length) return rows;

  const orderIndex = new Map();
  referenceRows.forEach((row, index) => {
    const id = getStageRowId(row);
    const name = getStageRowName(row);
    if (id != null && !orderIndex.has(String(id))) {
      orderIndex.set(String(id), index);
    }
    if (name && !orderIndex.has(name)) {
      orderIndex.set(name, index);
    }
  });

  return [...rows].sort((a, b) => {
    const aIdx =
      orderIndex.get(String(a.id)) ?? orderIndex.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bIdx =
      orderIndex.get(String(b.id)) ?? orderIndex.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return aIdx - bIdx;
  });
};

/** Normalize stage performance rows for the task dashboard donut chart. */
export const normalizeTaskStagePerformanceData = (source = {}) => {
  const rows = getDistributionArray(source, ["taskbyWorkload", "taskByWorkload"]);

  if (!rows.length) return [];

  return rows.map((row, index) => {
    const count = getNumericMetric(row.count ?? row.taskCount ?? row.value ?? row.total);
    const percentage = getNumericMetric(
      row.percentage ?? row.percent ?? row.percentage ?? row.percentageValue,
    );
    const name = row.stageName ?? row.name ?? row.label ?? row.stage ?? "—";
    const colorCode = row.colorCode ?? row.color_Code ?? row.color ?? null;
    return {
      id: row.stageId ?? row.id ?? row.labelId ?? `${name}-${index}`,
      name,
      count,
      percentage,
      colorCode,
      color: resolveStageDistributionColor(colorCode, index),
    };
  });
};

/** Normalize top-five workload rows for collapsed task dashboard legends. */
export const normalizeTaskStageTopFiveWorkloadData = (
  source = {},
  referenceRows = [],
) => {
  const rows = getDistributionArray(source, [
    "topFiveStages",
    "topFiveTaskByWorkload",
    "topFiveByWorkload",
    "topFiveWorkload",
    "topFiveStagesByWorkload",
  ]);

  if (!rows.length) return [];

  const colorMap = buildStageDistributionColorMap(referenceRows);

  return rows.map((row, index) => {
    const count = getNumericMetric(row.count ?? row.taskCount ?? row.value ?? row.total);
    const percentage = getNumericMetric(
      row.percentage ?? row.percent ?? row.percentage ?? row.percentageValue,
    );
    const name = row.stageName ?? row.name ?? row.label ?? row.stage ?? "—";
    const id = row.stageId ?? row.id ?? row.labelId ?? `${name}-${index}`;
    const colorCode = row.colorCode ?? row.color_Code ?? row.color ?? null;
    return {
      id,
      name,
      count,
      percentage,
      colorCode,
      color: resolveStageDistributionColor(
        colorCode ?? colorMap.get(String(id)) ?? colorMap.get(name),
        index,
      ),
    };
  });
};

/** Normalize age-by-performance rows for the task dashboard stage list. */
export const normalizeTaskStageAgeData = (source = {}, options = {}) => {
  const { referenceRows = [], stageColorByKey = new Map() } = options;
  const rows = getDistributionArray(source, ["taskbyAge", "taskByAge"]);

  if (!rows.length) return [];

  const normalized = rows.map((row, index) => {
    const hasAgeList = Array.isArray(row.ageList) && row.ageList.length > 0;
    const ageBuckets = hasAgeList ? mapAgeListToBuckets(row.ageList) : null;
    const age0To3 = getNumericMetric(
      row.age0To3 ??
        ageBuckets?.age0To3 ??
        row.days0To3 ??
        row.bucket0To3 ??
        row.green ??
        row.zeroToThree,
    );
    const age4To7 = getNumericMetric(
      row.age4To7 ??
        ageBuckets?.age4To7 ??
        row.days4To7 ??
        row.bucket4To7 ??
        row.yellow ??
        row.fourToSeven,
    );
    const age8Plus = getNumericMetric(
      row.age8Plus ??
        ageBuckets?.age8Plus ??
        row.days8Plus ??
        row.bucket8Plus ??
        row.red ??
        row.eightPlus,
    );
    const bucketTotal = age0To3 + age4To7 + age8Plus;
    const total = hasAgeList
      ? bucketTotal
      : getNumericMetric(row.total ?? row.count ?? row.taskCount) || bucketTotal;

    const stageId = getStageRowId(row);
    const name = getStageRowName(row) || "—";

    return {
      id: stageId ?? `${name}-${index}`,
      name,
      total,
      age0To3,
      age4To7,
      age8Plus,
      color: resolveStageDistributionColor(
        stageColorByKey.get(String(stageId)) ??
          stageColorByKey.get(name) ??
          row.colorCode ??
          row.color_Code ??
          row.color,
        index,
      ),
    };
  });

  return alignRowsToReferenceOrder(normalized, referenceRows);
};

/** Merge task stage distribution payloads from dashboard API responses. */
export const resolveTaskStageDistributionSource = (...sources) => {
  const merged = {};
  const richestArrays = {
    taskbyWorkload: [],
    taskbyAge: [],
  };

  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    const layers = [unwrapDashboardApiPayload(source)];
    if (isPlainObject(source.taskSummaryItem)) {
      layers.push(source.taskSummaryItem);
    }

    for (const layer of layers) {
      Object.assign(merged, layer);

      const workloadRows = getDistributionArray(layer, [
        "taskbyWorkload",
        "taskByWorkload",
      ]);
      if (workloadRows.length > richestArrays.taskbyWorkload.length) {
        richestArrays.taskbyWorkload = workloadRows;
      }

      const ageRows = getDistributionArray(layer, ["taskbyAge", "taskByAge"]);
      if (ageRows.length > richestArrays.taskbyAge.length) {
        richestArrays.taskbyAge = ageRows;
      }
    }
  }

  if (richestArrays.taskbyWorkload.length) {
    merged.taskbyWorkload = richestArrays.taskbyWorkload;
  }
  if (richestArrays.taskbyAge.length) {
    merged.taskbyAge = richestArrays.taskbyAge;
  }

  return merged;
};

export const formatRangeDate = (value) => {
  if (!value) return "--";
  if (typeof value?.format === "function") return value.format("DD-MM-YYYY");

  const normalized = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(normalized.getTime())) return "--";

  const day = String(normalized.getDate()).padStart(2, "0");
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const year = String(normalized.getFullYear()).slice(-4);
  return `${day}/${month}/${year}`;
};

export const getDueTaskStatus = (dueDate, isLastStage = false, datas) => {
  const today = dayjs().startOf("day");
  const target = dayjs(dueDate).startOf("day"); // parses "2025-09-24T00:00:00"

  const diff = target.diff(today, "day");
  if (isLastStage) {
    return datas.find((d) => d.id === 71);
  } else if (diff < 0) {
    return datas.find((d) => d.id === 70); // overdue or today
  } else if (diff <= 5) {
    return datas.find((d) => d.id === 69); // due within next 5 days
  } else {
    return datas.find((d) => d.id === 68); // safe
  }
};

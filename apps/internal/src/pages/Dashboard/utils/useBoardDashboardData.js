import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBoardPerformanceTrend,
  getBoardHealthSummary,
  getWorkspaceList,
  getOrderToolsPerformanceTrend,
  getDashBoardFilterList,
  getUpcomingDeadlines,
  getWorkloadByUsers,
  getTaskByWorkload,
  getAverageTimePerStage,
  getBoardStageHeatmapSummary,
  exportMainSubGridSummary,
} from "services";
import useAuth from "hooks/useAuth";
import { useToast, useGlobalMaster } from "@orion/shared";
import dayjs from "dayjs";
import {
  customMonthDashboardDates,
  STATUS_CONFIG,
  getTrendTone,
  BOARD_FILTER_OPTIONS,
  safeParseLocalStorage,
  BOARD_MAIN_SUB_TASK_TABS,
  BOARD_ORDER_TOOL_TASK_TABS,
  getBoardHealthSummaryParams,
  getBoardPerformanceHealthParams,
  getBoardVelocityRangeParams,
  getBoardsByWorkspace,
  getBoardStageListFromWorkspaces,
  BOARD_DASHBOARD_TABS,
  formatRangeDate,
  unwrapDashboardApiPayload,
  isTaskDashboardPath,
  getDashboardApiWorkspaceIds,
  getDashboardApiBoardIds,
  canShowDashboardAssigneeFilter,
  resolveDashboardAssigneeParam,
  isAdminMyWorkspaceMode,
  isIodDashboardWorkspace,
  getSelectedDashboardWorkspaceId,
  IOD_DASHBOARD_WORKSPACE_ID,
} from "utils/dashboard";
import TrendingDown from "../Widget/Icons/TrendingDown";
import TrendingUp from "../Widget/Icons/TrendingUp";
import { useLocation } from "react-router-dom";
import { downloadMainSubGridExcel } from "./exportMainSubGridExcel";

const INITIAL_BOARD_FILTER_API = {
  status: null,
  boardId: null,
  assignee: null,
  dueStatusId: null,
  orderTypeId: null,
  orderLabelId: null,
  stageId: null,
  regionId: null,
  marketId: null,
  countryId: null,
  freeFlowLabelId: null,
};

const MAINTASK_SINGLE_BOARD_ID = 108;

const findBoardInHealthWorkspaces = (workspaces = [], boardId) => {
  for (const workspace of workspaces) {
    const board = workspace?.boardDetails?.find(
      (item) => Number(item.boardId) === Number(boardId),
    );
    if (board) {
      return { workspace, board };
    }
  }
  return null;
};

const flattenBoardHealthWorkspaces = (...workspaceGroups) =>
  workspaceGroups.flatMap((workspaces) =>
    (workspaces || []).flatMap((workspace) =>
      (workspace?.boardDetails || []).map((board) => ({ workspace, board })),
    ),
  );

const mapBoardHealthCard = (workspace, board) => {
  const label = board.healthLabel || "Healthy";
  const config = STATUS_CONFIG()[label] || STATUS_CONFIG()["Healthy"];
  const progressPct = Number(board?.progress?.percentage || 0);

  return {
    id: board.boardId,
    name: board.boardName,
    department: board.boardName,
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.workspaceName,
    allTask: board.createdTask,
    activeTasks: board.activeTask || board.activeTasks,
    overdueCount: board.overdueCount,
    completedTask: board.completedTask || board.CompletedTask,
    statusTone: config?.tone,
    progressDirection: board?.progress?.compareStatus
      ? board?.progress?.compareStatus === "Increase"
        ? "up"
        : "down"
      : null,
    progress: progressPct || 0,
    healthLabel: board.healthLabel || "Healthy",
    trendTone: getTrendTone(board?.progress?.compareStatus, board?.healthLabel),
    compareStatus: board?.progress?.compareStatus,
  };
};

const useBoardDashboardData = () => {
  const { showToast } = useToast();
  const location = useLocation();

  const [workspaceResponse, setWorkspaceResponse] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [getSelectedDate, setGetSelectedDate] = useState(null);
  const [velocityResponse, setVelocityResponse] = useState({
    velocity: [],
    summary: {},
  });
  const [orderToolsPerformanceTrendResponse, setOrderToolsPerformanceTrendResponse] =
    useState({ velocity: [], summary: {} });
  const [orderToolsPerformanceTrendLoading, setOrderToolsPerformanceTrendLoading] =
    useState(false);
  const dateTimeRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showTourGuide, setShowTourGuide] = useState(false);
  const [selectedRange, setSelectedRange] = useState([BOARD_FILTER_OPTIONS[0]]);
  const [loading, setLoading] = useState(false);
  const [{ data: auth }] = useAuth();
  const isTaskDashboardRoute = isTaskDashboardPath(location.pathname);
  const workspaceDashboard = isTaskDashboardRoute
    ? safeParseLocalStorage("selectBoardDashboard")
    : safeParseLocalStorage("selectWorkspaceDashboard");
  const boardType = workspaceDashboard.type;
  const isBoardScopedDashboard = boardType === "board" || isTaskDashboardRoute;
  const selectedBoardId = isBoardScopedDashboard
    ? safeParseLocalStorage("selectBoardDashboard")?.id
    : null;
  const showAssigneeFilter = useMemo(
    () =>
      isBoardScopedDashboard &&
      canShowDashboardAssigneeFilter(auth?.details, selectedBoardId),
    [auth?.details, isBoardScopedDashboard, selectedBoardId, location.pathname],
  );
  const resolveAssigneeParam = useCallback(
    (selectedAssignee) => {
      if (!isBoardScopedDashboard) return selectedAssignee || null;
      return resolveDashboardAssigneeParam(
        auth?.details,
        selectedBoardId,
        selectedAssignee,
      );
    },
    [auth?.details, isBoardScopedDashboard, selectedBoardId],
  );
  const dashboardWorkspaceIds = useMemo(
    () => getDashboardApiWorkspaceIds(auth?.details, boardType),
    [
      auth?.details,
      boardType,
      workspaceDashboard?.id,
      workspaceDashboard?.workspaceId,
      workspaceDashboard?.myWorkspaceBoardsHome,
      location.pathname,
      location.state?.adminDashboardScope,
    ],
  );
  /** Admin "My Workspace" → boards come from userRoleResponseDetail, not workspaceDTO. */
  const adminDashboardWorkspaceScope = useMemo(
    () => isAdminMyWorkspaceMode(auth?.details),
    [auth?.details, location.pathname, location.state?.adminDashboardScope],
  );

  const isIodWorkspace = useMemo(() => {
    if (isIodDashboardWorkspace(auth?.details)) return true;
    if (isIodDashboardWorkspace(getSelectedDashboardWorkspaceId(auth?.details))) {
      return true;
    }
    const ids = (dashboardWorkspaceIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
    return (
      ids.length > 0 && ids.every((id) => id === IOD_DASHBOARD_WORKSPACE_ID)
    );
  }, [auth?.details, dashboardWorkspaceIds, workspaceDashboard?.id]);

  const selectedDashboardWorkspaceId =
    getSelectedDashboardWorkspaceId(auth?.details) ??
    (isIodWorkspace ? IOD_DASHBOARD_WORKSPACE_ID : null);

  const getDashboardBoardIds = (filterParams, taskType) =>
    getDashboardApiBoardIds(auth?.details, {
      boardType,
      filterBoardId: filterParams?.boardId,
      taskType,
      isBoardScoped: isBoardScopedDashboard,
      adminDashboardWorkspaceScope,
    });

  const [healthSummaryloading, setHealthSummaryLoading] = useState(false);
  const [boardFilter, setBoardFilter] = useState(() =>
    boardType === "board" && safeParseLocalStorage("selectBoardDashboard")?.id === 108
      ? [BOARD_ORDER_TOOL_TASK_TABS[0]]
      : boardType === "board" && safeParseLocalStorage("selectBoardDashboard")?.id !== 108
        ? [BOARD_MAIN_SUB_TASK_TABS[1]]
        : isIodWorkspace
          ? [BOARD_ORDER_TOOL_TASK_TABS[0]]
          : [BOARD_MAIN_SUB_TASK_TABS[0]],
  );
  const [selectedBoardDashboard, setSelectedBoardDashboard] = useState([
    BOARD_DASHBOARD_TABS(selectedDashboardWorkspaceId)[1],
  ]);
  const [selectedTempRange, setSelectedTempRange] = useState([
    BOARD_FILTER_OPTIONS[0], // default: Current Month
  ]);
  const [filterResetToken, setFilterResetToken] = useState(0);
  const [boardFilterApi, setBoardFilterApi] = useState(INITIAL_BOARD_FILTER_API);
  const [workspaceDashboardState, setWorkspaceDashboardState] = useState(null);

  // Keep Orders/Tools vs Tasks tabs in sync when IOD detection resolves after mount
  useEffect(() => {
    if (boardType === "board") return;
    const nextTab = isIodWorkspace
      ? BOARD_ORDER_TOOL_TASK_TABS[0]
      : BOARD_MAIN_SUB_TASK_TABS[0];
    setBoardFilter((prev) => {
      if (prev?.[0]?.value === nextTab.value && prev?.[0]?.key === nextTab.key) {
        return prev;
      }
      return [nextTab];
    });
    setSelectedBoardDashboard([BOARD_DASHBOARD_TABS(selectedDashboardWorkspaceId)[1]]);

    // Persist IOD id when boards-home had no workspace id but scope is solely IOD
    if (isIodWorkspace && selectedDashboardWorkspaceId === IOD_DASHBOARD_WORKSPACE_ID) {
      try {
        const selected = safeParseLocalStorage("selectWorkspaceDashboard");
        if (selected?.myWorkspaceBoardsHome && selected?.id == null) {
          localStorage.setItem(
            "selectWorkspaceDashboard",
            JSON.stringify({
              ...selected,
              id: IOD_DASHBOARD_WORKSPACE_ID,
            }),
          );
        }
      } catch {
        /* ignore */
      }
    }
  }, [isIodWorkspace, boardType, selectedDashboardWorkspaceId]);
  const [orderToolsSearch, setOrderToolsSearch] = useState("");
  const [selectedUpcomingDeadline, setSelectedUpcomingDeadline] = useState(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [boardStageList, setBoardStageList] = useState([]);
  const [showCreatedTask, setShowCreatedTask] = useState(true);
  const [dashBoardFilterList, setDashBoardFilterList] = useState([]);
  const [dashBoardFilterLoading, setDashBoardFilterLoading] = useState(false);
  const [orderToolsExportLoading, setOrderToolsExportLoading] = useState(false);
  const [dashBoardFilterHasMore, setDashBoardFilterHasMore] = useState(true);
  const [orderToolsTablePage, setOrderToolsTablePage] = useState(1);
  const pageSize = 10;
  const dashBoardFilterPageRef = useRef({ pageOffset: 0, sortBy: null, sortOrder: null });
  const [workloadByUsersResponse, setWorkloadByUsersResponse] = useState(null);
  const [workloadByUsersLoading, setWorkloadByUsersLoading] = useState(false);
  const [taskByWorkloadResponse, setTaskByWorkloadResponse] = useState(null);
  const [taskByWorkloadLoading, setTaskByWorkloadLoading] = useState(false);
  const [boardStageSummaryItemResponse, setBoardStageSummaryItemResponse] =
    useState(null);
  const [boardStageSummaryItemLoading, setBoardStageSummaryItemLoading] = useState(false);
  const [taskByWorkloadSummary, setTaskByWorkloadSummary] = useState(null);
  const [taskByWorkloadSummaryLoading, setTaskByWorkloadSummaryLoading] = useState(false);
  const [boardStageHistoryResponse, setBoardStageHistoryResponse] = useState(null);
  const [boardStageHistoryLoading, setBoardStageHistoryLoading] = useState(false);
  const [boardStageHeatmapResponse, setBoardStageHeatmapResponse] = useState(null);
  const [boardStageHeatmapLoading, setBoardStageHeatmapLoading] = useState(false);
  const [upcomingDeadlinesLoading, setUpcomingDeadlinesLoading] = useState(false);
  const [leadUserData, setLeadUserData] = useState(null);

  const {
    orderType,
    regionList,
    roleList,
    getRoleList,
    countryList,
    getCountryList,
    labelList,
    stageList,
    suggestedMembersList,
    dashboardFormula,
    taskDueStatus,
    getDashboardFormulaData,
    getOrderType,
    getRegionList,
    getLabelList,
    getStageList,
    getSuggestedMembersList,
    getTaskDueStatusList,
    getMarketRegionList,
    marketRegionList,
    getTaskPriority,
    taskPriority,
    getTaskAgeStatusList,
    taskAgeStatusList,
    getFreeFlowLabelList,
    freeFlowLabelList,
    getToolsList,
    toolsList,
  } = useGlobalMaster();

  // --- Initial data loading ---

  useEffect(() => {
    if (
      !orderType?.loading &&
      (orderType?.data?.length === 0 || orderType === undefined)
    ) {
      getOrderType();
    }
    if (!countryList?.loading && countryList?.data?.length == 0) {
      getCountryList();
    }
    if (!labelList?.loading && labelList?.data?.length == 0) {
      getLabelList();
    }
    if (!stageList?.loading && stageList?.data?.length == 0) {
      getStageList();
    }
    if (!regionList?.loading && regionList?.data?.length == 0) {
      getRegionList();
    }
    if (!marketRegionList?.loading && marketRegionList?.data?.length === 0) {
      getMarketRegionList();
    }
    if (
      !toolsList?.loading &&
      toolsList?.data?.length === 0 &&
      isIodWorkspace
    ) {
      getToolsList();
    } else return;
  }, []);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const res = await getWorkspaceList();
      const workspacesData = res?.data || [];
      setLeadUserData(
        workspacesData.filter(
          (ws) =>
            ws.workspaceId === safeParseLocalStorage("selectWorkspaceDashboard")?.id,
        )[0]?.user_Info,
      );
      setBoardStageList(
        getBoardStageListFromWorkspaces(workspacesData, {
          boardType,
          workspaceId: safeParseLocalStorage("selectWorkspaceDashboard")?.id,
          boardId:
            boardType === "board"
              ? safeParseLocalStorage("selectBoardDashboard")?.id
              : null,
        }),
      );
    };
    loadWorkspaces();
  }, [boardType, location.pathname]);

  useEffect(() => {
    if (auth?.details?.workspaceDTO?.length > 0) {
      const workspaceIds =
        boardType === "board"
          ? [safeParseLocalStorage("selectBoardDashboard")?.id]
          : dashboardWorkspaceIds;
      const boards =
        boardType === "board"
          ? [
              {
                boardId: safeParseLocalStorage("selectBoardDashboard")?.id,
                boardName: safeParseLocalStorage("selectBoardDashboard")?.name,
              },
            ]
          : getBoardsByWorkspace(
              auth.details.workspaceDTO,
              workspaceIds,
              auth?.details?.userRoleResponseDetail,
              adminDashboardWorkspaceScope,
            );
      setWorkspaceDashboardState(boards);
    }
  }, [
    auth?.details?.workspaceDTO,
    auth?.details?.userRoleResponseDetail,
    adminDashboardWorkspaceScope,
    boardType,
    location.pathname,
    dashboardWorkspaceIds,
  ]);

  useEffect(() => {
    if (!roleList?.loading && roleList?.data?.length === 0) {
      getRoleList();
    }
  }, []);

  useEffect(() => {
    if (dashboardFormula?.data?.length === 0) {
      getDashboardFormulaData();
      setShowCalendar(false);
    }
  }, []);

  // --- Click outside to close calendar ---

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dateTimeRef.current) return;
      if (!dateTimeRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Upcoming deadlines ---
  const fetchTaskByWorkload = async (
    dateParams,
    boardFilterApi,
    taskType,
    { silent = false } = {},
  ) => {
    if (!auth?.details?.user_type || !auth?.details?.regId) return;
    try {
      if (!silent) setTaskByWorkloadLoading(true);
      const params = {
        ...dateParams,
        status: boardFilterApi?.status || null,
        regId: auth?.details?.regId || null,
        boardId: getDashboardBoardIds(boardFilterApi, taskType),
        userTypeId: auth?.details?.user_type,
        regId: auth?.details?.regId || null,
        workspaceId: dashboardWorkspaceIds,
        taskType: taskType || "mainTask",
        orderTypeId: boardFilterApi?.orderTypeId || null,
        orderLabelId: boardFilterApi?.orderLabelId || null,
        assignee: resolveAssigneeParam(boardFilterApi?.assignee),
        stageId: boardFilterApi?.stageId || null,
        regionId: boardFilterApi?.regionId || null,
        marketId: boardFilterApi?.marketId || null,
        countryId: boardFilterApi?.countryId || null,
        dueStatusId: boardFilterApi?.dueStatusId || null,
        freeFlowLabelId: boardFilterApi?.freeFlowLabelList || null,
        toolId: boardFilterApi?.toolsId || null,
        pageOffset: 0,
        pageSize: 0,
        sortBy: [],
        sortOrder: [],
      };
      const res = await getTaskByWorkload(params);
      if (res?.status) {
        setTaskByWorkloadResponse(res?.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      if (!silent) setTaskByWorkloadLoading(false);
    }
  };

  const fetchAverageTimePerStage = async (
    dateParams,
    boardFilterApi,
    taskType,
    { silent = false } = {},
  ) => {
    if (!auth?.details?.user_type || !auth?.details?.regId || !dateParams) return;

    try {
      if (!silent) setBoardStageHistoryLoading(true);
      const params = {
        ...dateParams,
        status: boardFilterApi?.status || null,
        regId: auth?.details?.regId || null,
        boardId: getDashboardBoardIds(boardFilterApi, taskType),
        userTypeId: auth?.details?.user_type,
        workspaceId: dashboardWorkspaceIds,
        taskType: taskType || "mainTask",
        orderTypeId: boardFilterApi?.orderTypeId || null,
        orderLabelId: boardFilterApi?.orderLabelId || null,
        assignee: resolveAssigneeParam(boardFilterApi?.assignee),
        stageId: boardFilterApi?.stageId || null,
        regionId: boardFilterApi?.regionId || null,
        marketId: boardFilterApi?.marketId || null,
        countryId: boardFilterApi?.countryId || null,
        dueStatusId: boardFilterApi?.dueStatusId || null,
        freeFlowLabelId: boardFilterApi?.freeFlowLabelList || null,
        toolId: boardFilterApi?.toolsId || null,
        pageOffset: 0,
        pageSize: 0,
        sortBy: [],
        sortOrder: [],
      };
      const res = await getAverageTimePerStage(params);
      if (res?.status) {
        setBoardStageHistoryResponse(res?.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      if (!silent) setBoardStageHistoryLoading(false);
    }
  };

  const fetchBoardStageHeatmap = async (
    dateParams,
    boardFilterApi,
    taskType,
    { silent = false } = {},
  ) => {
    if (!auth?.details?.user_type || !auth?.details?.regId || !dateParams) return;

    try {
      if (!silent) setBoardStageHeatmapLoading(true);
      const params = {
        ...dateParams,
        status: boardFilterApi?.status || null,
        regId: auth?.details?.regId || null,
        boardId: getDashboardBoardIds(boardFilterApi, taskType),
        userTypeId: auth?.details?.user_type,
        workspaceId: dashboardWorkspaceIds,
        taskType: taskType || "mainTask",
        orderTypeId: boardFilterApi?.orderTypeId || null,
        orderLabelId: boardFilterApi?.orderLabelId || null,
        assignee: resolveAssigneeParam(boardFilterApi?.assignee),
        stageId: boardFilterApi?.stageId || null,
        regionId: boardFilterApi?.regionId || null,
        marketId: boardFilterApi?.marketId || null,
        countryId: boardFilterApi?.countryId || null,
        dueStatusId: boardFilterApi?.dueStatusId || null,
        freeFlowLabelId: boardFilterApi?.freeFlowLabelList || null,
        toolId: boardFilterApi?.toolsId || null,
        pageOffset: 0,
        pageSize: 0,
        sortBy: [],
        sortOrder: [],
      };
      const res = await getBoardStageHeatmapSummary(params);
      if (res?.status) {
        setBoardStageHeatmapResponse(
          res?.data?.heatMap?.stageCongestionHeatmap ?? null,
        );
      }
    } catch (err) {
      console.log(err);
    } finally {
      if (!silent) setBoardStageHeatmapLoading(false);
    }
  };

  const fetchUpcomingDeadlines = async (boardFilterApi) => {
    if (!auth?.details?.user_type || !auth?.details?.regId) return;
    setUpcomingDeadlinesLoading(true);
    try {
      const params = {
        status: boardFilterApi?.status || null,
        boardId: getDashboardBoardIds(boardFilterApi),
        regId: auth?.details?.regId || null,
        userTypeId: auth?.details?.user_type || null,
        workspaceId: dashboardWorkspaceIds,
        orderTypeId: boardFilterApi?.orderTypeId || null,
        orderLabelId: boardFilterApi?.orderLabelId || null,
        assignee: resolveAssigneeParam(boardFilterApi?.assignee),
        stageId: boardFilterApi?.stageId || null,
        regionId: boardFilterApi?.regionId || null,
        marketId: boardFilterApi?.marketId || null,
        countryId: boardFilterApi?.countryId || null,
        dueStatusId: boardFilterApi?.taskDueStatus || null,
        freeFlowLabelId: boardFilterApi?.freeFlowLabelList || null,
        toolId: boardFilterApi?.toolsId || null,
      };

      const res = await getUpcomingDeadlines(params);
      if (res?.status) {
        setUpcomingDeadlines(res?.data);
        setUpcomingDeadlinesLoading(false);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setUpcomingDeadlinesLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingDeadlines(
      isBoardScopedDashboard
        ? {
            ...boardFilterApi,
            boardId: [safeParseLocalStorage("selectBoardDashboard")?.id],
          }
        : boardFilterApi,
    );
  }, [
    auth?.details?.regId,
    auth?.details?.user_type,
    workspaceDashboard?.id,
    dashboardWorkspaceIds,
    boardType,
    boardFilterApi,
    selectedRange,
  ]);

  // --- API call functions ---
  const getWorkloadByUsersData = async (
    dateParams,
    filterParams,
    taskType,
    { silent = false } = {},
  ) => {
    if (!auth?.details?.user_type) return;
    try {
      if (!silent) setWorkloadByUsersLoading(true);
      if (dateParams) {
        const response = await getWorkloadByUsers({
          ...dateParams,
          status: filterParams?.status || null,
          boardId: getDashboardBoardIds(filterParams, taskType),
          userTypeId: auth?.details?.user_type,
          regId: auth?.details?.regId,
          workspaceId: dashboardWorkspaceIds,
          taskType: taskType,
          myTask: auth?.details?.user_type === 44 ? true : false,
          orderTypeId: filterParams?.orderTypeId || null,
          orderLabelId: filterParams?.orderLabelId || null,
          assignee: resolveAssigneeParam(filterParams?.assignee),
          stageId: filterParams?.stageId || null,
          regionId: filterParams?.regionId || null,
          marketId: filterParams?.marketId || null,
          countryId: filterParams?.countryId || null,
          dueStatusId: filterParams?.dueStatusId || null,
          freeFlowLabelId: filterParams?.freeFlowLabelList || null,
          toolId: filterParams?.toolsId || null,
        });
        if (response?.status) {
          setWorkloadByUsersResponse(response?.data);
        }
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
    } finally {
      if (!silent) setWorkloadByUsersLoading(false);
    }
  };

  const getWorkspaceHealthSummary = async (
    dateParams,
    hardRefresh,
    filterParams,
    taskType,
  ) => {
    if (!auth?.details?.user_type) return;
    try {
      if (hardRefresh) setHealthSummaryLoading(true);
      if (dateParams) {
        const response = await getBoardHealthSummary({
          ...dateParams,
          status: filterParams?.status || null,
          boardId: getDashboardBoardIds(filterParams, taskType),
          userTypeId: auth?.details?.user_type,
          regId: auth?.details?.regId,
          workspaceId: dashboardWorkspaceIds,
          taskType: taskType,
          myTask: auth?.details?.user_type === 44 ? true : false,
          orderTypeId: filterParams?.orderTypeId || null,
          orderLabelId: filterParams?.orderLabelId || null,
          assignee: resolveAssigneeParam(filterParams?.assignee),
          stageId: filterParams?.stageId || null,
          regionId: filterParams?.regionId || null,
          marketId: filterParams?.marketId || null,
          countryId: filterParams?.countryId || null,
          dueStatusId: filterParams?.dueStatusId || null,
          freeFlowLabelId: filterParams?.freeFlowLabelList || null,
          toolId: filterParams?.toolsId || null,
        });
        if (response?.status) {
          setWorkspaceResponse(response?.data);
        }
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
    } finally {
      setHealthSummaryLoading(false);
    }
  };

  const getPerformanceVelocityData = async (dateParams, filterParams, taskType) => {
    try {
      setLoading(true);
      if (!dateParams || !auth?.details?.user_type) return;
      const response = await getBoardPerformanceTrend({
        ...dateParams,
        status: filterParams?.status || null,
        boardId: getDashboardBoardIds(filterParams, taskType),
        userTypeId: auth?.details?.user_type,
        regId: auth?.details?.regId,
        workspaceId: dashboardWorkspaceIds,
        freeFlowLabelId: filterParams?.freeFlowLabelList || null,
        toolId: filterParams?.toolsId || null,
      });

      if (response?.status) {
        setVelocityResponse((prev) => ({
          ...prev,
          velocity: response?.data?.velocity || [],
          type: response?.data?.type || "month",
        }));
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to load velocity data",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrderToolsPerformanceTrendData = async (
    dateParams,
    filterParams,
    taskType,
    { silent = false } = {},
  ) => {

    try {
      if (!silent) setOrderToolsPerformanceTrendLoading(true);
      if (!dateParams || !auth?.details?.user_type) return;
      const response = await getOrderToolsPerformanceTrend({
        ...dateParams,
        status: filterParams?.status || null,
        boardId: getDashboardBoardIds(filterParams, taskType),
        userTypeId: auth?.details?.user_type,
        regId: auth?.details?.regId,
        workspaceId: dashboardWorkspaceIds,
        taskType: taskType || "mainTask",
        orderTypeId: filterParams?.orderTypeId || null,
        orderLabelId: filterParams?.orderLabelId || null,
        assignee: resolveAssigneeParam(filterParams?.assignee),
        stageId: filterParams?.stageId || null,
        regionId: filterParams?.regionId || null,
        marketId: filterParams?.marketId || null,
        countryId: filterParams?.countryId || null,
        dueStatusId: filterParams?.dueStatusId || null,
        freeFlowLabelId: filterParams?.freeFlowLabelList || null,
        toolId: filterParams?.toolsId || null,
      });

      const isSuccess =
        response?.status === true ||
        response?.data?.status === true ||
        response?.status === 200;

      if (isSuccess) {
        const payload = unwrapDashboardApiPayload(response);
        setOrderToolsPerformanceTrendResponse((prev) => ({
          ...prev,
          ...payload,
          velocity: payload?.velocity ?? [],
          taskbyWorkload: payload?.taskbyWorkload ?? payload?.taskByWorkload ?? [],
          taskbyAge: payload?.taskbyAge ?? payload?.taskByAge ?? [],
          type: payload?.type ?? "month",
        }));
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to load order tools performance trend data",
        variant: "danger",
      });
    } finally {
      if (!silent) setOrderToolsPerformanceTrendLoading(false);
    }
  };

  const buildMainSubGridRequestParams = (
    dateParams,
    filterParams,
    taskType,
    {
      sortBy = null,
      sortOrder = null,
      searchTxt,
      pageOffset = null,
      pageSizeValue = null,
    } = {},
  ) => ({
    ...dateParams,
    status: filterParams?.status || null,
    boardId: getDashboardBoardIds(filterParams, taskType),
    userTypeId: auth?.details?.user_type,
    regId: auth?.details?.regId,
    workspaceId: dashboardWorkspaceIds,
    taskType: taskType || "mainTask",
    orderTypeId: filterParams?.orderTypeId || null,
    orderLabelId: filterParams?.orderLabelId || null,
    assignee: resolveAssigneeParam(filterParams?.assignee),
    stageId: filterParams?.stageId || null,
    regionId: filterParams?.regionId || null,
    marketId: filterParams?.marketId || null,
    countryId: filterParams?.countryId || null,
    dueStatusId: filterParams?.dueStatusId || null,
    pageOffset,
    pageSize: pageSizeValue,
    sortBy: sortBy !== null ? ["orderType"] : null,
    sortOrder: sortOrder !== null ? ["asc"] : null,
    searchTxt:
      searchTxt !== undefined ? searchTxt || null : orderToolsSearch?.trim() || null,
    freeFlowLabelId: filterParams?.freeFlowLabelList || null,
    toolId: filterParams?.toolsId || null,
  });

  const getDashBoardFilterListData = async (
    dateParams,
    filterParams,
    taskType,
    { append = false, pageOffset = 0, sortBy = null, sortOrder = null, searchTxt } = {},
  ) => {
    if (!auth?.details?.user_type || !dateParams) return;

    try {
      setDashBoardFilterLoading(true);
      if (!append) {
        dashBoardFilterPageRef.current = {
          ...dashBoardFilterPageRef.current,
          pageOffset,
          sortBy,
          sortOrder,
        };
      }

      const response = await getDashBoardFilterList(
        buildMainSubGridRequestParams(dateParams, filterParams, taskType, {
          pageOffset,
          pageSizeValue: pageSize,
          sortBy,
          sortOrder,
          searchTxt,
        }),
      );
      if (response?.status) {
        const newGrid = response?.data?.taskSummaryItem?.maintaskGrid?.maintaskList || [];
        if (append) {
          setDashBoardFilterList((prev) => {
            const prevList = prev?.taskSummaryItem?.maintaskGrid?.maintaskList || [];
            return {
              ...response.data,
              taskSummaryItem: {
                ...response.data.taskSummaryItem,
                maintaskGrid: {
                  ...response.data.taskSummaryItem.maintaskGrid,
                  maintaskList: [...prevList, ...newGrid],
                },
              },
            };
          });
        } else {
          setDashBoardFilterList(response?.data);
        }
        setDashBoardFilterHasMore(newGrid.length >= pageSize);
        if (!append) {
          setOrderToolsTablePage(pageOffset + 1);
        }
      }
    } catch (error) {
      console.log(error);
      showToast({
        message: error?.message || "Failed to load dashboard filter list",
        variant: "danger",
      });
    } finally {
      setDashBoardFilterLoading(false);
    }
  };

  const shouldLoadOrderToolsGrid = () =>
    selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard;

  // --- Data fetch on range / filter / tab change ---

  const getBoardDashboardDateParams = (rangeValue) => {
    if (rangeValue === "CUSTOM_RANGE") {
      if (!getSelectedDate) return null;
      const result = customMonthDashboardDates(getSelectedDate);
      return {
        workspace: result?.workspacehealthsummary,
        performance: result?.performancehealthsummary,
      };
    }
    return {
      workspace: getBoardHealthSummaryParams(rangeValue),
      performance: getBoardPerformanceHealthParams(rangeValue),
    };
  };

  useEffect(() => {
    if (selectedRange.length === 0) return;
    const rangeType = selectedRange[0].value;
    if (rangeType === "CUSTOM_RANGE" && !getSelectedDate) return;

    const dateParams = getBoardDashboardDateParams(rangeType);
    if (!dateParams?.workspace && !dateParams?.performance) return;

    const activeTabId = selectedBoardDashboard[0]?.filter_id;
    const taskType = boardFilter?.[0]?.value;

    getWorkspaceHealthSummary(dateParams.workspace, true, boardFilterApi, taskType);

    if (activeTabId === 22 && !isTaskDashboardRoute && dateParams.performance) {
      // getPerformanceVelocityData(dateParams.performance, boardFilterApi, taskType);
      getOrderToolsPerformanceTrendData(
        dateParams.performance,
        boardFilterApi,
        "Subtask",
      );
    }
    if (shouldLoadOrderToolsGrid() && dateParams.performance) {
      if (activeTabId === 23 || isBoardScopedDashboard) {
        getOrderToolsPerformanceTrendData(
          dateParams.performance,
          boardFilterApi,
          taskType,
        );
      }
      dashBoardFilterPageRef.current = {
        pageOffset: 0,
        sortBy: null,
        sortOrder: null,
      };
      getDashBoardFilterListData(dateParams.performance, boardFilterApi, taskType);
    }
    if (isBoardScopedDashboard) {
      getWorkloadByUsersData(dateParams.performance, boardFilterApi, taskType);
      fetchTaskByWorkload(dateParams.performance, boardFilterApi, taskType);
      fetchAverageTimePerStage(dateParams.performance, boardFilterApi, taskType);
      fetchBoardStageHeatmap(dateParams.performance, boardFilterApi, taskType);
    }

    if (rangeType !== "CUSTOM_RANGE") {
      setGetSelectedDate(null);
    }
  }, [
    selectedRange,
    auth?.details?.user_type,
    boardFilterApi,
    boardFilter,
    selectedBoardDashboard,
    getSelectedDate,
    boardType,
    location.pathname,
  ]);

  // --- Computed values ---

  const boardHealthStatusMasterValue = useMemo(
    () =>
      dashboardFormula?.data?.find((item) => item.name === "BoardHealthStatus")?.value ||
      [],
    [dashboardFormula?.data],
  );

  /** My Workspace: keep only role-assigned boards even if the API returns more. */
  const myWorkspaceBoardIds = useMemo(() => {
    if (!adminDashboardWorkspaceScope || isBoardScopedDashboard) return null;
    const ids = getDashboardApiBoardIds(auth?.details, {
      boardType: "workspace",
      adminDashboardWorkspaceScope,
    });
    return Array.isArray(ids) && ids.length ? new Set(ids.map(Number)) : null;
  }, [
    auth?.details,
    adminDashboardWorkspaceScope,
    isBoardScopedDashboard,
    location.pathname,
  ]);

  const workspaceCards = useMemo(() => {
    const key = boardFilter?.[0]?.value;
    const normalizedKey = "subTask";
    // key === "Maintask" ? "mainTask" : key === "Subtask" ? "subTask" : key;
    const items =
      workspaceResponse?.healthSummaryItem?.boardHealthSummary?.[normalizedKey] || [];

    const cards = items.flatMap(
      (workspace) =>
        workspace?.boardDetails?.map((board) => {
          const label = board.healthLabel || "Healthy";
          const config = STATUS_CONFIG()[label] || STATUS_CONFIG()["Healthy"];
          const progressPct = Number(board?.progress?.percentage || 0);
          return {
            id: board.boardId,
            name: board.boardName,
            department: board.boardName,
            workspaceId: workspace.workspaceId,
            workspaceName: workspace.workspaceName,
            allTask: board.createdTask,
            activeTasks: board.activeTask || board.activeTasks,
            overdueCount: board.overdueCount,
            completedTask: board.completedTask || board.CompletedTask,
            overdueTask: board.progress || board.progress,
            statusTone: config?.tone,
            overduePercentageTask:
              board?.overduePercentageTask || board?.overduePercentageTasks,
            progressDirection: board?.progress?.compareStatus
              ? board?.progress?.compareStatus === "Increase"
                ? "up"
                : "down"
              : null,
            progress: progressPct || 0,
            healthLabel: board.healthLabel || "Healthy",
            trendTone: getTrendTone(board?.progress?.compareStatus, board?.healthLabel),
            compareStatus: board?.progress?.compareStatus,
            graphData:
              board?.graph ??
              board?.graphData ??
              board?.progress?.graph ??
              board?.progress?.trendGraph ??
              board?.progress?.graphData,
            assignee:
              (Array.isArray(board?.leadInfo) ? board.leadInfo[0] : board?.leadInfo) ??
              board?.assignee?.[0] ??
              board?.assigneeName?.[0] ??
              board?.leadUser?.[0] ??
              board?.user_Info?.[0] ??
              board?.boardLead ??
              null,
            leadInfo: board?.leadInfo ?? null,
          };
        }) || [],
    );

    if (!myWorkspaceBoardIds) return cards;
    return cards.filter((card) => myWorkspaceBoardIds.has(Number(card.id)));
  }, [workspaceResponse, boardFilter, myWorkspaceBoardIds]);

  const filteredOrderAndToolsRows = useMemo(() => {
    const search = orderToolsSearch.trim().toLowerCase();
    if (!search) return workspaceCards;
    return workspaceCards.filter(
      (row) =>
        row?.name?.toLowerCase()?.includes(search) ||
        row?.workspaceName?.toLowerCase()?.includes(search),
    );
  }, [workspaceCards, orderToolsSearch]);

  const fullHomepageOrderAndToolsRows = useMemo(() => {
    const boardHealthSummary =
      workspaceResponse?.healthSummaryItem?.boardHealthSummary || {};
    return Object.entries(boardHealthSummary).flatMap(([taskType, workspaces]) =>
      (workspaces || []).flatMap((workspace) =>
        (workspace?.boardDetails || []).map((board) => {
          return {
            id: board?.boardId,
            name: board?.boardName,
            workspaceId: workspace?.workspaceId,
            workspaceName: workspace?.workspaceName,
            allTask: board?.createdTask,
            activeTasks: board?.activeTask,
            completedTask: board?.completedTask,
            overdueCount: board?.overdueCount,
            healthLabel: board?.healthLabel,
            taskType,
          };
        }),
      ),
    );
  }, [workspaceResponse]);

  const countCards = useMemo(() => {
    const key = boardFilter?.[0]?.value;
    const normalizedKey =
      (boardType === "board" &&
        isIodWorkspace &&
        safeParseLocalStorage("selectBoardDashboard")?.id !== 108) ||
      (boardType === "board" &&
        !isIodWorkspace)
        ? "subTask"
        : key === "Maintask"
          ? "mainTask"
          : key === "Subtask"
            ? "subTask"
            : key;

    const items =
      workspaceResponse?.healthSummaryItem?.boardGridCount?.[normalizedKey] || [];
    const titleSet =
      isIodWorkspace && key === "Maintask"
        ? "Orders"
        : !isIodWorkspace
          ? "Tasks"
          : "Tools";

    return [
      ...(showCreatedTask
        ? [
            {
              id: "total",
              title: "Total Tasks Created",
              subTitle: ` ${items?.createdTask?.percentage}% ${items?.createdTask?.trend ? items?.createdTask?.trend + (items?.createdTask?.trend !== "Ideal" ? "d" : "") : ""}`,
              healthLabel: "Created " + titleSet,
              value: items?.createdTask?.count || 0,
              progressDirection: items?.createdTask?.trend,
              Icon:
                items?.createdTask?.trend === "Decrease"
                  ? TrendingDown
                  : items?.createdTask?.trend === "Increase"
                    ? TrendingUp
                    : null,
              trend: items?.createdTask?.trend,
            },
          ]
        : []),
      {
        id: "totalActiveTask",
        title: "Total Active Tasks",
        subTitle: `${items?.activeTask?.percentage}% ${items?.activeTask?.trend ? items?.activeTask?.trend + (items?.activeTask?.trend !== "Ideal" ? "d" : "") : ""}`,
        healthLabel: "Active " + titleSet,
        value: items?.activeTask?.count || 0,
        progressDirection: items?.activeTask?.trend,
        Icon:
          items?.activeTask?.trend === "Decrease"
            ? TrendingDown
            : items?.activeTask?.trend === "Increase"
              ? TrendingUp
              : null,
        trend: items?.activeTask?.trend,
      },
      {
        id: "completed",
        title: "Total Tasks Completed",
        subTitle: `${items?.completedTask?.percentage}% ${items?.completedTask?.trend ? items?.completedTask?.trend + (items?.completedTask?.trend !== "Ideal" ? "d" : "") : ""}`,
        healthLabel: "Completed " + titleSet,
        value: items?.completedTask?.count || 0,
        progressDirection: items?.completedTask?.trend,
        Icon:
          items?.completedTask?.trend === "Decrease"
            ? TrendingDown
            : items?.completedTask?.trend === "Increase"
              ? TrendingUp
              : null,
        trend: items?.completedTask?.trend,
      },
      ...(normalizedKey === "subTask"
        ? [
            {
              id: "overdueCount",
              title: "Overdue",
              subTitle: `${items?.overdueCount?.percentage}% ${items?.overdueCount?.trend ? items?.overdueCount?.trend + (items?.overdueCount?.trend !== "Ideal" ? "d" : "") : ""}`,
              healthLabel: "Overdue " + titleSet,
              value: items?.overdueCount?.count || 0,
              progressDirection: items?.overdueCount?.trend
                ? items?.overdueCount?.trend
                : null,
              Icon:
                items?.overdueCount?.trend === "Decrease"
                  ? TrendingDown
                  : items?.overdueCount?.trend === "Increase"
                    ? TrendingUp
                    : null,
              trend: items?.overdueCount?.trend ? items?.overdueCount?.trend : null,
            },
          ]
        : []),
    ];
  }, [workspaceResponse, boardFilter]);

  const velocityDefaultRangeType = useMemo(
    () => selectedRange?.[0]?.value,
    [selectedRange],
  );

  const mapBoardLabelsToStageOptions = (labels = []) =>
    labels.map((label) => ({
      name: label.name,
      multiSelect: true,
      key: "stageList",
      value: true,
      filter_id: label.labelId,
      colorCode: label.color_Code,
    }));

  const findBoardStages = (boardId) =>
    boardStageList?.find((stage) => String(stage.boardId) === String(boardId));

  const filterOptions = useMemo(() => {
    if (boardType === "board") {
      const boardId = safeParseLocalStorage("selectBoardDashboard")?.id;
      const matchedBoard = findBoardStages(boardId) ?? boardStageList?.[0];
      return mapBoardLabelsToStageOptions(matchedBoard?.labels);
    }

    if (!workspaceDashboardState?.length) return [];

    return workspaceDashboardState
      .filter((item) => item.boardId !== 121)
      .map((item) => {
        const matchedBoard = findBoardStages(item.boardId);
        const searchList = mapBoardLabelsToStageOptions(matchedBoard?.labels);
        const shouldShowSubList = selectedBoardDashboard?.[0]?.filter_id === 23;

        return {
          name: item.boardName,
          key: "boardId",
          value: true,
          filter_id: item.boardId,
          ...(shouldShowSubList && {
            subList: [
              {
                id: item.boardId,
                multiSelect: true,
                key: "stageList",
                headerName: "Stage",
                searchList,
              },
            ],
          }),
        };
      });
  }, [workspaceDashboardState, boardStageList, selectedBoardDashboard, boardType]);

  useEffect(() => {
    if (suggestedMembersList?.loading) return;

    if (boardType === "board") {
      const boardId = safeParseLocalStorage("selectBoardDashboard")?.id;
      if (boardId) {
        getSuggestedMembersList(String(boardId));
      }
      return;
    }

    if (filterOptions?.length > 0) {
      getSuggestedMembersList(
        filterOptions
          .filter((item) => item.key === "boardId")
          .map((item) => item.filter_id)
          .join(","),
      );
    }
  }, [filterOptions, boardType, location.pathname]);

  const filterDatas = [
    ...(boardFilter[0]?.filter_id !== 2025 && boardType !== "board"
      ? [
          {
            id: "01",
            multiSelect: true,
            key: "boardId",
            headerName: "Boards",
            searchList: filterOptions,
          },
        ]
      : []),

    ...(boardType === "board" &&
    boardFilter[0]?.filter_id !== 2025 &&
    filterOptions.length > 0
      ? [
          {
            id: "01-stage",
            multiSelect: true,
            key: "stageList",
            headerName: "Stage",
            searchList: filterOptions,
          },
        ]
      : []),
    ...(isIodWorkspace &&
    (selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard)
      ? [
          {
            id: "02",
            multiSelect: true,
            key: "toolsId",
            headerName: "Tools",
            searchList:
              toolsList?.data?.map((item) => ({
                name: item.toolName,
                key: "toolsId",
                value: true,
                filter_id: item.toolId,
              })) || [],
          },
        ]
      : []),
    ...(isBoardScopedDashboard && showAssigneeFilter
      ? [
          {
            id: "02",
            multiSelect: true,
            key: "assignee",
            headerName: "Assignee",
            searchList: (() => {
              const loginRegId = String(auth?.details?.regId || "").toLowerCase();
              const assignees = Array.from(
                new Map(
                  (suggestedMembersList?.data || [])
                    .filter((item) => item?.regId != null)
                    .map((item) => [item.regId, item]),
                ).values(),
              ).map((item) => ({
                displayName: item.displayName,
                key: "assignee",
                value: true,
                regId: item.regId,
                photo: item.photo,
                filter_id: item.regId,
              }));
              if (!loginRegId) return assignees;
              const me = assignees.find(
                (item) => String(item.regId || "").toLowerCase() === loginRegId,
              );
              if (!me) return assignees;
              return [
                me,
                ...assignees.filter(
                  (item) => String(item.regId || "").toLowerCase() !== loginRegId,
                ),
              ];
            })(),
          },
        ]
      : []),
    ...(isIodWorkspace &&
    (selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard)
      ? [
          {
            id: "03",
            multiSelect: true,
            key: "orderType",
            headerName: "Order Type",
            searchList:
              orderType?.data?.map((item) => ({
                name: item.name,
                key: "orderType",
                value: true,
                filter_id: item.status_id,
              })) || [],
          },
          {
            id: "04",
            multiSelect: true,
            key: "regionList",
            headerName: "Region",
            searchList:
              regionList?.data?.map((item) => ({
                name: item.name,
                key: "regionList",
                value: true,
                filter_id: item.regionId,
              })) || [],
          },
          {
            id: "05",
            multiSelect: true,
            key: "countryId",
            headerName: "Country",
            searchList:
              [...(countryList?.data || [])]
                .sort((a, b) =>
                  (a?.country_name || "").localeCompare(
                    b?.country_name || "",
                    undefined,
                    { sensitivity: "base" },
                  ),
                )
                .map((item) => ({
                  name: item.country_name,
                  key: "countryId",
                  value: true,
                  filter_id: item.country_id,
                })) || [],
          },
        ]
      : []),
    ...((selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard) &&
    isIodWorkspace
      ? [
          {
            id: "07",
            multiSelect: true,
            key: "marketRegionList",
            headerName: "Primary Market",
            searchList:
              marketRegionList?.data?.map((item) => ({
                name: item.marketname,
                key: "marketRegionList",
                value: true,
                filter_id: item.marketid,
              })) || [],
          },
        ]
      : []),
    ...(selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard
      ? [
          {
            id: "06",
            multiSelect: true,
            key: "labels",
            headerName:
              isIodWorkspace
                ? "Labels"
                : "Priority",
            searchList:
              isIodWorkspace
                ? labelList?.data?.map((item) => ({
                    name: item.name,
                    key: "labels",
                    value: true,
                    filter_id: item.status_id,
                  }))
                : taskPriority?.data?.map((item) => ({
                    name: item.name,
                    key: "labels",
                    value: true,
                    filter_id: item.status_id,
                  })) || [],
          },
        ]
      : []),
    ...(selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard
      ? [
          {
            id: "08",
            multiSelect: true,
            key: "taskDueStatus",
            headerName: "Task Due Status",
            searchList:
              taskDueStatus?.data?.map((item) => ({
                name: item.name,
                key: "taskDueStatus",
                value: true,
                filter_id: item.status_id,
              })) || [],
          },
        ]
      : []),
    ...(isBoardScopedDashboard &&
    !isIodWorkspace
      ? [
          {
            id: "09",
            multiSelect: true,
            key: "freeFlowLabelList",
            headerName: "Free Flow Label",
            searchList:
              freeFlowLabelList?.data?.map((item) => ({
                name: item.name,
                key: "freeFlowLabelList",
                value: true,
                filter_id: item.status_id,
              })) || [],
          },
        ]
      : []),
  ];

  // --- Event handlers ---

  const handleExportOrderAndTools = async () => {
    if (orderToolsExportLoading) return;
    const dateParams = getFilterDateParams();
    if (!auth?.details?.user_type || !dateParams) {
      showToast({
        message: "Unable to export. Date range is missing.",
        variant: "danger",
      });
      return;
    }

    try {
      setOrderToolsExportLoading(true);
      const taskType = boardFilter?.[0]?.value || "Maintask";
      const { sortBy, sortOrder } = dashBoardFilterPageRef.current;
      const response = await exportMainSubGridSummary(
        buildMainSubGridRequestParams(dateParams, boardFilterApi, taskType, {
          pageOffset: null,
          pageSizeValue: null,
          sortBy,
          sortOrder,
          searchTxt: orderToolsSearch?.trim() || null,
        }),
      );
      const payload =
        response?.data?.data?.taskSummaryItem ||
        response?.data?.taskSummaryItem ||
        response?.taskSummaryItem;
      const exportGrid = payload?.exportGrid || payload;
      if (!exportGrid?.exportList?.length) {
        throw new Error("No records available to export");
      }

      downloadMainSubGridExcel(
        exportGrid,
        `board-task-export-${dayjs().format("YYYYMMDD-HHmm")}.xlsx`,
        { isOrderWorkspace: isIodWorkspace },
      );

      showToast({
        message: "Excel exported successfully",
        variant: "success",
      });
    } catch (error) {
      showToast({
        message: error?.message || "Failed to export excel",
        variant: "danger",
      });
    } finally {
      setOrderToolsExportLoading(false);
    }
  };

  const handleCustomMonthApply = async (date) => {
    setGetSelectedDate(date);
    const fromValue = date?.from || date?.start;
    const toValue = date?.to || date?.end;
    const result = customMonthDashboardDates(date);
    await Promise.all([
      getWorkspaceHealthSummary(
        result.workspacehealthsummary,
        false,
        boardFilterApi,
        boardFilter?.[0]?.value,
      ),
      ...(selectedBoardDashboard[0]?.filter_id === 22 && !isTaskDashboardRoute
        ? [
            getOrderToolsPerformanceTrendData(
              result.performancehealthsummary,
              boardFilterApi,
              "Subtask",
            ),
          ]
        : []),
      ...(shouldLoadOrderToolsGrid()
        ? [
            ...(selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard
              ? [
                  getOrderToolsPerformanceTrendData(
                    result.performancehealthsummary,
                    boardFilterApi,
                    boardFilter?.[0]?.value,
                  ),
                ]
              : []),
            getDashBoardFilterListData(
              {
                fromDate: result.performancehealthsummary.toDate,
                toDate: result.performancehealthsummary.fromDate,
              },
              boardFilterApi,
              boardFilter?.[0]?.value,
            ),
            ...(isBoardScopedDashboard
              ? [
                  getWorkloadByUsersData(
                    result.performancehealthsummary,
                    boardFilterApi,
                    boardFilter?.[0]?.value,
                  ),
                  fetchTaskByWorkload(
                    result.performancehealthsummary,
                    boardFilterApi,
                    boardFilter?.[0]?.value,
                  ),
                  fetchAverageTimePerStage(
                    result.performancehealthsummary,
                    boardFilterApi,
                    boardFilter?.[0]?.value,
                  ),
                  fetchBoardStageHeatmap(
                    result.performancehealthsummary,
                    boardFilterApi,
                    boardFilter?.[0]?.value,
                  ),
                  // fetchBoardStageSummaryItem(result.performancehealthsummary, boardFilterApi, boardFilter?.[0]?.value),
                ]
              : []),
          ]
        : []),
    ]);
    setSelectedRange([
      {
        label: `${formatRangeDate(fromValue)} To ${formatRangeDate(toValue)}`,
        value: "CUSTOM_RANGE",
      },
    ]);
  };

  const handleDashboardSync = async (taskTypeSelection, apiFilters = boardFilterApi) => {
    const rangeValue = selectedRange?.[0]?.value;
    const params =
      rangeValue !== "CUSTOM_RANGE"
        ? {
            velocity: { ...getBoardVelocityRangeParams(rangeValue) },
            workspace: { ...getBoardHealthSummaryParams(rangeValue) },
            performance: { ...getBoardPerformanceHealthParams(rangeValue) },
          }
        : { ...customMonthDashboardDates(getSelectedDate) };
    const taskType = taskTypeSelection?.[0]?.value;
    await Promise.all([
      getWorkspaceHealthSummary(
        params.workspace || params.workspacehealthsummary,
        false,
        apiFilters,
        taskType,
      ),
      ...(selectedBoardDashboard[0]?.filter_id === 22 && !isTaskDashboardRoute
        ? [
            getOrderToolsPerformanceTrendData(
              params.performance || params.performancehealthsummary,
              apiFilters,
              "Subtask",
            ),
          ]
        : []),
      ...(shouldLoadOrderToolsGrid()
        ? [
            ...(selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard
              ? [
                  getOrderToolsPerformanceTrendData(
                    params.performance || params.performancehealthsummary,
                    apiFilters,
                    taskType,
                  ),
                ]
              : []),
            getDashBoardFilterListData(
              params.performance || params.performancehealthsummary,
              apiFilters,
              taskType,
            ),
            ...(isBoardScopedDashboard
              ? [
                  getWorkloadByUsersData(
                    params.performance || params.performancehealthsummary,
                    apiFilters,
                    taskType,
                  ),
                  fetchTaskByWorkload(
                    params.performance || params.performancehealthsummary,
                    apiFilters,
                    taskType,
                  ),
                  fetchAverageTimePerStage(
                    params.performance || params.performancehealthsummary,
                    apiFilters,
                    taskType,
                  ),
                  fetchBoardStageHeatmap(
                    params.performance || params.performancehealthsummary,
                    apiFilters,
                    taskType,
                  ),
                  // fetchBoardStageSummaryItem(params.performance || params.performancehealthsummary, apiFilters, taskType),
                ]
              : []),
          ]
        : []),
    ]);
  };

  /**
   * After dashboard Kanban move/delete or SubTask stage change: soft-refresh
   * charts (stage distribution, trend, heatmap) + KPI without skeletons.
   */
  const handleDashboardSoftRefresh = async (
    taskTypeSelection = boardFilter,
    apiFilters = boardFilterApi,
  ) => {
    const rangeValue = selectedRange?.[0]?.value;
    const params =
      rangeValue !== "CUSTOM_RANGE"
        ? {
            workspace: { ...getBoardHealthSummaryParams(rangeValue) },
            performance: { ...getBoardPerformanceHealthParams(rangeValue) },
          }
        : { ...customMonthDashboardDates(getSelectedDate) };
    const taskType = taskTypeSelection?.[0]?.value;
    const workspaceDates = params.workspace || params.workspacehealthsummary;
    const performanceDates = params.performance || params.performancehealthsummary;
    await Promise.all([
      getWorkspaceHealthSummary(workspaceDates, false, apiFilters, taskType),
      ...(isBoardScopedDashboard && performanceDates
        ? [
            fetchTaskByWorkload(performanceDates, apiFilters, taskType, {
              silent: true,
            }),
            getOrderToolsPerformanceTrendData(performanceDates, apiFilters, taskType, {
              silent: true,
            }),
            getWorkloadByUsersData(performanceDates, apiFilters, taskType, {
              silent: true,
            }),
            fetchBoardStageHeatmap(performanceDates, apiFilters, taskType, {
              silent: true,
            }),
            fetchAverageTimePerStage(performanceDates, apiFilters, taskType, {
              silent: true,
            }),
          ]
        : []),
    ]);
  };

  const filterBoard = async (filterCriteria) => {
    const boardHealthData = boardHealthStatusMasterValue;

    const statusResult =
      Array.isArray(filterCriteria?.status) && filterCriteria?.status?.length > 0
        ? boardHealthData
            .filter((item) => filterCriteria?.status?.includes(Number(item.id)))
            .map((item) => item.label)
        : null;
    const boardParam = {
      status: statusResult || null,
      boardId:
        boardType === "board"
          ? [safeParseLocalStorage("selectBoardDashboard")?.id]
          : Array.isArray(filterCriteria?.boardId) && filterCriteria.boardId.length > 0
            ? filterCriteria.boardId
            : null,
      assignee: resolveAssigneeParam(filterCriteria.assignee),
      dueStatusId: filterCriteria.taskDueStatus || null,
      orderTypeId: filterCriteria.orderType || null,
      orderLabelId: filterCriteria.labels || null,
      stageId: filterCriteria.stageList || null,
      regionId: filterCriteria.regionList || null,
      marketId: filterCriteria.marketRegionList || null,
      countryId: filterCriteria.countryId || null,
      freeFlowLabelList: filterCriteria.freeFlowLabelList || null,
      toolsId: filterCriteria.toolsId || null,
    };

    setBoardFilterApi(boardParam);
    setShowCreatedTask(
      showAssigneeFilter
        ? boardParam.assignee?.length === 0 || boardParam.assignee?.length === undefined
        : true,
    );
    const rangeValue = selectedRange?.[0]?.value;
    const params =
      rangeValue === "CUSTOM_RANGE"
        ? { ...customMonthDashboardDates(getSelectedDate) }
        : {
            velocity: { ...getBoardVelocityRangeParams(rangeValue) },
            workspace: { ...getBoardHealthSummaryParams(rangeValue) },
            performance: { ...getBoardPerformanceHealthParams(rangeValue) },
          };
    await Promise.all([
      getWorkspaceHealthSummary(
        params.workspace || params.workspacehealthsummary,
        false,
        boardParam,
        boardFilter?.[0]?.value,
      ),
      ...(selectedBoardDashboard[0]?.filter_id === 22 && !isTaskDashboardRoute
        ? [
            getOrderToolsPerformanceTrendData(
              params?.performance || params?.performancehealthsummary,
              boardParam,
              "Subtask",
            ),
          ]
        : []),
      ...(shouldLoadOrderToolsGrid()
        ? [
            ...(selectedBoardDashboard[0]?.filter_id === 23 || isBoardScopedDashboard
              ? [
                  getOrderToolsPerformanceTrendData(
                    params?.performance || params?.performancehealthsummary,
                    boardParam,
                    boardFilter?.[0]?.value,
                  ),
                ]
              : []),
            getDashBoardFilterListData(
              params?.performance || params?.performancehealthsummary,
              boardParam,
              boardFilter?.[0]?.value,
            ),
            ...(isBoardScopedDashboard
              ? [
                  getWorkloadByUsersData(
                    params?.performance || params?.performancehealthsummary,
                    boardParam,
                    boardFilter?.[0]?.value,
                  ),
                  fetchTaskByWorkload(
                    params?.performance || params?.performancehealthsummary,
                    boardParam,
                    boardFilter?.[0]?.value,
                  ),
                  fetchAverageTimePerStage(
                    params?.performance || params?.performancehealthsummary,
                    boardParam,
                    boardFilter?.[0]?.value,
                  ),
                  fetchBoardStageHeatmap(
                    params?.performance || params?.performancehealthsummary,
                    boardParam,
                    boardFilter?.[0]?.value,
                  ),
                  // fetchBoardStageSummaryItem(params?.performance || params?.performancehealthsummary, boardParam, boardFilter?.[0]?.value),
                ]
              : []),
          ]
        : []),
    ]);
    setShowCalendar(false);
  };

  const handleBoardTaskChanged = (values) => {
    if (!values || values.length === 0) return;
    setBoardFilter(values);
    setFilterResetToken((prev) => prev + 1);
    setBoardFilterApi({
      ...INITIAL_BOARD_FILTER_API,
      ...(isBoardScopedDashboard
        ? { boardId: [safeParseLocalStorage("selectBoardDashboard")?.id] }
        : {}),
      assignee: resolveAssigneeParam(null),
    });
    setShowCreatedTask(true);
  };

  const handleBoardDashboardChanged = (value) => {
    setSelectedBoardDashboard(
      BOARD_DASHBOARD_TABS(selectedDashboardWorkspaceId)[1],
    );
  };

  useEffect(() => {
    if (selectedBoardDashboard[0]?.filter_id === 23) {
      getTaskPriority();
      getTaskDueStatusList();
      setBoardFilterApi({
        ...INITIAL_BOARD_FILTER_API,
        assignee: resolveAssigneeParam(null),
      });
      getFreeFlowLabelList();
    }
    if (boardType === "board" || isTaskDashboardRoute) {
      getTaskPriority();
      getTaskDueStatusList();
      getTaskAgeStatusList();
      getFreeFlowLabelList();
      setBoardFilterApi({
        ...INITIAL_BOARD_FILTER_API,
        boardId: [safeParseLocalStorage("selectBoardDashboard")?.id],
        assignee: resolveAssigneeParam(null),
      });
    }
  }, [
    selectedBoardDashboard[0]?.filter_id,
    boardType,
    location.pathname,
    resolveAssigneeParam,
  ]);

  const handleSelectedCustomMonthRange = (values) => {
    if (values.length === 0) return;
    setSelectedRange(values);
    if (values[0].value !== "CUSTOM_RANGE") {
      setShowCalendar(false);
    } else {
      setShowCalendar(!showCalendar);
    }
  };
  const onCancelCustomMonthApply = () => {
    setShowCalendar(false);
    setSelectedRange(selectedTempRange);
  };
  const handleViewMore = (deadline) => {
    setSelectedUpcomingDeadline(deadline);
    setShowPopup(true);
  };

  const getFilterDateParams = () => {
    const rangeValue = selectedRange?.[0]?.value;
    if (rangeValue === "CUSTOM_RANGE") {
      const result = customMonthDashboardDates(getSelectedDate);
      return result?.performancehealthsummary;
    }
    return getBoardPerformanceHealthParams(rangeValue);
  };

  const getOrderToolsTotalPages = useCallback(() => {
    const fromApi = Number(
      dashBoardFilterList?.taskSummaryItem?.maintaskGrid?.totalPageCount,
    );
    if (fromApi > 0) return fromApi;
    const list = dashBoardFilterList?.taskSummaryItem?.maintaskGrid?.maintaskList || [];
    if (list.length === 0 && !dashBoardFilterLoading) return 1;
    return dashBoardFilterHasMore
      ? orderToolsTablePage + 1
      : Math.max(1, orderToolsTablePage);
  }, [
    dashBoardFilterList?.taskSummaryItem?.maintaskGrid?.totalPageCount,
    dashBoardFilterList?.taskSummaryItem?.maintaskGrid?.maintaskList,
    dashBoardFilterHasMore,
    dashBoardFilterLoading,
    orderToolsTablePage,
  ]);

  const orderToolsLastPage = useMemo(
    () => getOrderToolsTotalPages(),
    [getOrderToolsTotalPages],
  );

  const handleOrderToolsPageChange = (page1Based) => {
    if (dashBoardFilterLoading) return;
    const lastPage = getOrderToolsTotalPages();
    if (page1Based < 1 || page1Based > lastPage) return;
    if (page1Based === orderToolsTablePage) return;
    const dateParams = getFilterDateParams();
    if (!dateParams) return;
    getDashBoardFilterListData(dateParams, boardFilterApi, boardFilter?.[0]?.value, {
      append: false,
      pageOffset: page1Based - 1,
      sortBy: dashBoardFilterPageRef.current.sortBy,
      sortOrder: dashBoardFilterPageRef.current.sortOrder,
    });
  };

  const handleSortOrderTools = (sortBy, sortOrder) => {
    dashBoardFilterPageRef.current = { pageOffset: 0, sortBy, sortOrder };
    const dateParams = getFilterDateParams();
    if (!dateParams) return;
    getDashBoardFilterListData(dateParams, boardFilterApi, boardFilter?.[0]?.value, {
      append: false,
      pageOffset: 0,
      sortBy,
      sortOrder,
    });
  };

  const applyOrderToolsSearch = (value) => {
    const trimmed = (value ?? "").trim();
    setOrderToolsSearch(trimmed);
    const dateParams = getFilterDateParams();
    if (!dateParams) return;
    getDashBoardFilterListData(dateParams, boardFilterApi, boardFilter?.[0]?.value, {
      append: false,
      pageOffset: 0,
      sortBy: dashBoardFilterPageRef.current.sortBy,
      sortOrder: dashBoardFilterPageRef.current.sortOrder,
      searchTxt: trimmed || null,
    });
  };

  const clearOrderToolsSearch = () => {
    setOrderToolsSearch("");
    const dateParams = getFilterDateParams();
    if (!dateParams) return;
    getDashBoardFilterListData(dateParams, boardFilterApi, boardFilter?.[0]?.value, {
      append: false,
      pageOffset: 0,
      sortBy: dashBoardFilterPageRef.current.sortBy,
      sortOrder: dashBoardFilterPageRef.current.sortOrder,
      searchTxt: null,
    });
  };

  return {
    auth,
    boardType,
    loading,
    healthSummaryloading,
    orderToolsPerformanceTrendLoading,
    getFilterDateParams,
    showCalendar,
    setShowCalendar,
    showPopup,
    setShowPopup,
    showTourGuide,
    setShowTourGuide,
    selectedRange,
    boardFilter,
    selectedBoardDashboard,
    filterResetToken,
    boardFilterApi,
    showCreatedTask,
    dashBoardFilterList,
    dateTimeRef,
    getSelectedDate,
    workspaceResponse,
    velocityResponse,
    orderToolsPerformanceTrendResponse,
    upcomingDeadlines,
    selectedUpcomingDeadline,
    workspaceCards,
    filteredOrderAndToolsRows,
    countCards,
    velocityDefaultRangeType,
    boardHealthStatusMasterValue,
    dashboardFormula,
    filterDatas,
    filterOptions,
    handleExportOrderAndTools,
    orderToolsExportLoading,
    handleCustomMonthApply,
    handleDashboardSync,
    handleDashboardSoftRefresh,
    filterBoard,
    handleBoardTaskChanged,
    handleBoardDashboardChanged,
    handleSelectedCustomMonthRange,
    onCancelCustomMonthApply,
    handleViewMore,
    dashBoardFilterLoading,
    dashBoardFilterHasMore,
    orderToolsTablePage,
    orderToolsLastPage,
    orderToolsPageSize: pageSize,
    orderToolsPageOffset: orderToolsTablePage - 1,
    handleOrderToolsPageChange,
    handleSortOrderTools,
    applyOrderToolsSearch,
    clearOrderToolsSearch,
    orderToolsSearch,
    getSelectedDate,
    workloadByUsersResponse,
    workloadByUsersLoading,
    taskByWorkloadResponse,
    taskByWorkloadLoading,
    taskByWorkloadSummary,
    taskAgeStatusList,
    boardStageHistoryResponse,
    boardStageHistoryLoading,
    boardStageHeatmapResponse,
    boardStageHeatmapLoading,
    upcomingDeadlinesLoading,
    freeFlowLabelList,
    taskPriorityList: taskPriority,
    leadUserData,
    isIodWorkspace,
    selectedDashboardWorkspaceId,
  };
};

export default useBoardDashboardData;

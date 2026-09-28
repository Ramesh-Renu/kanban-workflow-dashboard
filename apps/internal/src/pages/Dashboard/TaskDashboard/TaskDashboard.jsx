import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import dayjs from "dayjs";
import { initialWorkSpaceFilterState } from "store/reducers/workspaceFilterReducer";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";
import {
  safeParseLocalStorage,
  resolveDashboardAssigneeParam,
  isIodDashboardWorkspace,
  getSelectedDashboardWorkspaceId,
} from "../../../utils/dashboard";
import BoardDashboardHeader from "../BoardDashboard/BoardDashboardHeader";
import useBoardDashboardData from "../utils/useBoardDashboardData";
import OrderAndToolsTable from "../BoardDashboard/OrderAndToolsTable";
import DashboardCount from "../count";
import ExportUploadIcon from "../Widget/Icons/ExportUploadIcon";
import { PopupModal, SelectDropDown, useToast } from "@orion/shared";
import OverdueDeadlinesSidebar from "../BoardDashboard/OverdueDeadlinesSidebar";
import UpcomingDeadlinesList from "../BoardDashboard/UpcomingDeadlinesList";
import TaskStageDistribution from "./TaskStageDistribution";
import WorkloadByAssignee from "./WorkloadByAssignee";
import CongestionHeatmap from "./CongestionHeatmap";
import KanbanHome from "../../KanbanHome";
import useOrderToolsModalSidenavOffset from "../utils/useOrderToolsModalSidenavOffset";
import BoardOverdueHealthChart from "../BoardDashboard/BoardOverdueHealthChart";
import AverageTimePerStage from "./AverageTimePerStage";
import SkeletonLoading from "../../../components/common/SkeletonLoading";
import DonutChart from "../BoardDashboard/DonutChart";
import withDashboardAIMode from "../aiMode/withDashboardAIMode";
import DashboardAIHotspot from "../aiMode/DashboardAIHotspot";
import {
  buildKpiGroupInsight,
  buildSectionInsight,
} from "../aiMode/buildAIHotspotInsight";
import {
  listInActive,
  gridView,
  gridInActive,
  listActiveView,
  gridViewInactive,
  searchIcon,
  closeIcon,
  unCheckedBlueIcon,
  checkedBlueIcon,
} from "assets/images";

const TASK_DISTRIBUTION_OPTIONS = [
  {
    id: "freeFlowLabel",
    title: "Label distribution",
    centerLabel: "Label",
    masterKey: "freeFlowLabel",
  },
  {
    id: "priority",
    title: "Task Priority distribution",
    centerLabel: "Task Priority",
    masterKey: "priority",
  },
];

/** Dashboard's board filter → the filter shape KanbanHome/normalizeFilters expects.
 * Dashboard date params are reversed (fromDate = later date, toDate = earlier date). */
const buildKanbanFilterValues = ({
  boardFilterApi,
  dateParams,
  searchTxt,
  authDetails,
  boardId,
}) => {
  const base = initialWorkSpaceFilterState.filterValues;
  const hasDateRange = Boolean(dateParams?.fromDate && dateParams?.toDate);
  const dashboardAssignee =
    resolveDashboardAssigneeParam(authDetails, boardId, boardFilterApi?.assignee) || [];
  // API expects chronological from → to; dashboard params store the opposite.
  const rangeFrom = null;
  // hasDateRange
  //   ? dayjs(dateParams.toDate).format("YYYY-MM-DDT00:00:00")
  //   : null;
  const rangeTo = null;
  // hasDateRange
  //   ? dayjs(dateParams.fromDate).format("YYYY-MM-DDT00:00:00")
  //   : null;
  
  return {
    ...base,
    searchTxt: searchTxt?.trim() || null,
    orderLabels: boardFilterApi?.orderLabelId || [],
    orderType: boardFilterApi?.orderTypeId || [],
    // Dashboard assignee GUIDs (My Workspace / member / filter); never Kanban "Me".
    assignee: Array.isArray(dashboardAssignee) ? dashboardAssignee : [],
    meAndUnassigned: boardFilterApi?.meAndUnassigned
      ? [
          {
            regId: "unassigned",
            displayName: "Unassigned",
            isUnassigned: true,
          },
        ]
      : [],
    stageList: boardFilterApi?.stageId || null,
    freeFlowLabelId: boardFilterApi?.freeFlowLabelList || [],
    orderDateRange: hasDateRange
      ? {
          thisWeek: false,
          thisMonth: false,
          overDue: false,
          customDate: true,
          customDateRange: {
            from: rangeFrom,
            to: rangeTo,
          },
        }
      : base.orderDateRange,
  };
};

const TaskDashboard = () => {
  const {
    auth,
    loading,
    showCalendar,
    setShowCalendar,
    setShowTourGuide,
    selectedRange,
    filterResetToken,
    filterDatas,
    dateTimeRef,
    getSelectedDate,
    selectedBoardDashboard,
    boardHealthStatusMasterValue,
    handleCustomMonthApply,
    handleDashboardSync,
    handleDashboardSoftRefresh,
    filterBoard,
    handleBoardTaskChanged,
    handleSelectedCustomMonthRange,
    onCancelCustomMonthApply,
    boardFilter,
    boardFilterApi,
    workspaceCards,
    countCards,
    dashboardFormula,
    healthSummaryloading,
    upcomingDeadlines,
    orderToolsSearch,
    handleExportOrderAndTools,
    orderToolsExportLoading,
    handleSortOrderTools,
    dashBoardFilterLoading,
    orderToolsTablePage,
    orderToolsLastPage,
    orderToolsPageSize,
    handleOrderToolsPageChange,
    dashBoardFilterList,
    boardType,
    applyOrderToolsSearch,
    clearOrderToolsSearch,
    velocityResponse,
    orderToolsPerformanceTrendResponse,
    orderToolsPerformanceTrendLoading,
    showCreatedTask,
    handleViewMore,
    showPopup,
    setShowPopup,
    selectedUpcomingDeadline,
    workloadByUsersResponse,
    workloadByUsersLoading,
    taskByWorkloadResponse,
    taskByWorkloadLoading,
    taskAgeStatusList,
    boardStageHistoryResponse,
    boardStageHistoryLoading,
    boardStageHeatmapResponse,
    boardStageHeatmapLoading,
    orderToolsPageOffset,
    upcomingDeadlinesLoading,
    workspaceResponse,
    freeFlowLabelList,
    taskPriorityList,
    getFilterDateParams,
    isIodWorkspace,
    selectedDashboardWorkspaceId,
  } = useBoardDashboardData();

  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [getSearchValue, setSearchValue] = useState(orderToolsSearch);
  const debounceTimeoutRef = useRef(null);
  const chartsRowRef = useRef(null);
  const tableSectionRef = useRef(null);
  const flowChartRef = useRef(null);
  const overduePanelRef = useRef(null);
  const layout = "new";
  const [showStageDuration, setShowStageDuration] = useState("orders");
  const [ordersViewMode, setOrdersViewMode] = useState("list");
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(false);
  const { showToast } = useToast();
  const [selectedDistribution, setSelectedDistribution] = useState([
    TASK_DISTRIBUTION_OPTIONS[0],
  ]);

  const kanbanBoardId = safeParseLocalStorage("selectBoardDashboard")?.id;
  const isOrionOrdersWorkspace =
    isIodWorkspace || isIodDashboardWorkspace(auth?.details);
  const workspaceDashboardId =
    selectedDashboardWorkspaceId ?? getSelectedDashboardWorkspaceId(auth?.details);
  const kanbanActiveTaskCodes = isOrionOrdersWorkspace ? "SubTask" : "Task";
  // boardFilter?.[0]?.value === "Subtask" ? "SubTask" : "MainTask";
  const [unAssignedSelected, setUnAssignedSelected] = useState(false);

  const kanbanBoard = useMemo(() => {
    if (kanbanBoardId == null) return [];
    const workspaces = auth?.details?.workspaceDTO || [];
    for (const workspace of workspaces) {
      const matched = (workspace?.boardList || []).find(
        (board) => Number(board?.boardID ?? board?.boardId) === Number(kanbanBoardId),
      );
      if (matched) return [matched];
    }
    return [];
  }, [auth?.details?.workspaceDTO, kanbanBoardId]);
  const resetKanbanRefreshKey = () => setKanbanRefreshKey(false);
  const handleKanbanError = (errorType, message) => {
    showToast({ message: message || "Something went wrong.", variant: "danger" });
  };

  // Soft-refresh dashboard widgets after Kanban move/delete (data only — no page remount).
  const dashboardSoftRefreshTimerRef = useRef(null);

  const handleKanbanBoardDataChanged = useCallback(() => {
    if (dashboardSoftRefreshTimerRef.current) {
      clearTimeout(dashboardSoftRefreshTimerRef.current);
    }
    dashboardSoftRefreshTimerRef.current = setTimeout(() => {
      // Keep dashboard Kanban LS filters aligned for the next move reload payload.
      const dateParams = getFilterDateParams();
      const filterValues = buildKanbanFilterValues({
        boardFilterApi,
        dateParams,
        searchTxt: orderToolsSearch,
        authDetails: auth?.details,
        boardId: kanbanBoardId,
      });
      localStorage.setItem("dashboard_workspace_filters", JSON.stringify(filterValues));
      // Heatmap + KPI only — do not remount Kanban or trigger section skeletons.
      handleDashboardSoftRefresh(boardFilter, boardFilterApi);
    }, 400);
  }, [
    handleDashboardSoftRefresh,
    boardFilter,
    boardFilterApi,
    getFilterDateParams,
    orderToolsSearch,
    auth?.details,
    kanbanBoardId,
  ]);

  useEffect(
    () => () => {
      if (dashboardSoftRefreshTimerRef.current) {
        clearTimeout(dashboardSoftRefreshTimerRef.current);
      }
    },
    [],
  );

  // Keep embedded Kanban in sync with dashboard filters — one write + one refresh.
  useEffect(() => {
    if (ordersViewMode !== "kanban") return;
    if (kanbanBoardId == null) return;
    const dateParams = getFilterDateParams();
    const filterValues = buildKanbanFilterValues({
      boardFilterApi,
      dateParams,
      searchTxt: orderToolsSearch,
      authDetails: auth?.details,
      boardId: kanbanBoardId,
    });
    // meAndUnassigned must stay the array shape splitMeAndUnassignedFilters expects,
    // not the raw boolean — otherwise it's treated as an empty selection downstream.
    filterValues.meAndUnassigned = unAssignedSelected
      ? [{ regId: "unassigned", displayName: "Unassigned", isUnassigned: true }]
      : [];
    localStorage.setItem("dashboard_workspace_filters", JSON.stringify(filterValues));
    setKanbanRefreshKey(true);
  }, [
    ordersViewMode,
    boardFilterApi,
    selectedRange,
    getSelectedDate,
    orderToolsSearch,
    kanbanBoardId,
    kanbanActiveTaskCodes,
    auth?.details,
    unAssignedSelected,
  ]);

  // KanbanBoard's custom horizontal-scroll thumb is portaled to document.body and sized
  // against ".outlet-container" (the real board page's layout), which doesn't match this
  // dashboard card — it renders as a tiny misplaced, non-functional widget here. Mark the
  // body so we can hide that portal via CSS while this embed is mounted, and fall back to
  // a normal native scrollbar on the board itself.
  useEffect(() => {
    if (ordersViewMode !== "kanban") return undefined;
    document.body.classList.add("dashboard-kanban-active");
    return () => document.body.classList.remove("dashboard-kanban-active");
  }, [ordersViewMode]);

  useEffect(() => {
    setSearchValue(orderToolsSearch);
  }, [orderToolsSearch]);

  const applySearchFilter = (e) => {
    const value = typeof e === "string" ? e : e.target.value;
    setSearchValue(value);

    const shouldApply = typeof e === "string" || e.type === "click" || e.key === "Enter";
    if (!shouldApply) return;

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      applyOrderToolsSearch(value);
    }, 300);
  };

  const cleraSearchFilter = () => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setSearchValue("");
    clearOrderToolsSearch();
  };
  const getColor = boardHealthStatusMasterValue?.find(
    (check) =>
      check.label?.toLowerCase()?.replaceAll(" ", "-") ===
      safeParseLocalStorage("selectBoardDashboard")?.statusTone,
  );

  const activeTabId = selectedBoardDashboard[0]?.filter_id;

  useOrderToolsModalSidenavOffset(isTableExpanded);

  const orderAndToolsTableProps = useMemo(
    () => ({
      rows: dashBoardFilterList?.taskSummaryItem?.maintaskGrid || [],
      taskSummaryItem: dashBoardFilterList?.taskSummaryItem || [],
      onExport: handleExportOrderAndTools,
      filterApiCallParams: boardFilterApi,
      selectWorkspaceDashboard: workspaceDashboardId,
      taskType: boardFilter?.[0]?.value,
      boardType,
      authData: auth,
      selectedRange,
      onSortChange: handleSortOrderTools,
      scrollLoading: dashBoardFilterLoading,
      orderToolsTablePage,
      orderToolsLastPage,
      orderToolsPageSize,
      onOrderToolsPageChange: handleOrderToolsPageChange,
      getSelectedDate,
      orderToolsSearch,
      orderToolsPageOffset,
      onDashboardSoftRefresh: () =>
        handleDashboardSoftRefresh(boardFilter, boardFilterApi),
    }),
    [
      dashBoardFilterList?.taskSummaryItem?.maintaskGrid,
      dashBoardFilterList?.taskSummaryItem,
      handleExportOrderAndTools,
      boardFilterApi,
      boardFilter,
      boardType,
      auth,
      selectedRange,
      handleSortOrderTools,
      dashBoardFilterLoading,
      orderToolsTablePage,
      orderToolsLastPage,
      orderToolsPageSize,
      handleOrderToolsPageChange,
      getSelectedDate,
      orderToolsSearch,
      orderToolsPageOffset,
      handleDashboardSoftRefresh,
      workspaceDashboardId,
    ],
  );

  const isTaskFlowChart = true;

  const chartVelocityData = useMemo(() => {
    if (orderToolsPerformanceTrendResponse?.velocity?.length) {
      return orderToolsPerformanceTrendResponse.velocity;
    }
    return velocityResponse?.velocity || [];
  }, [orderToolsPerformanceTrendResponse?.velocity, velocityResponse?.velocity]);

  const syncOverduePanelHeight = useCallback(() => {
    const overduePanel = overduePanelRef.current;
    if (!overduePanel) return;

    const chartsRow = chartsRowRef.current;
    const tableSection = tableSectionRef.current;
    const isInChartsRow = Boolean(chartsRow?.contains(overduePanel));

    let nextHeight = 0;
    if (isInChartsRow && chartsRow) {
      // IOD: Overdues sits beside Task by workload / Workload by assignee
      const split = chartsRow.querySelector(".board-dashboard-distribution-split");
      const source = split || chartsRow;
      const sourceRect = source.getBoundingClientRect();
      const overdueTop = overduePanel.getBoundingClientRect().top;
      nextHeight = Math.max(0, Math.round(sourceRect.bottom - overdueTop));
    } else if (tableSection) {
      // Non-IOD: Overdues sits beside the tasks table
      const tableBottom = tableSection.getBoundingClientRect().bottom;
      const overdueTop = overduePanel.getBoundingClientRect().top;
      nextHeight = Math.max(0, Math.round(tableBottom - overdueTop));
    } else {
      return;
    }

    overduePanel.style.minHeight = `${nextHeight}px`;
    overduePanel.style.height = `${nextHeight}px`;
    overduePanel.style.maxHeight = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    const chartsRow = chartsRowRef.current;
    const observedNodes = [
      tableSectionRef.current,
      flowChartRef.current,
      chartsRow,
      overduePanelRef.current,
    ].filter(Boolean);

    if (chartsRow) {
      const split = chartsRow.querySelector(".board-dashboard-distribution-split");
      if (split) observedNodes.push(split);
      chartsRow
        .querySelectorAll(
          ".task-stage-distribution, .workload-by-assignee, .dashboard-expandable-panel",
        )
        .forEach((node) => observedNodes.push(node));
    }

    if (!observedNodes.length) return undefined;

    const scheduleSync = () => {
      requestAnimationFrame(syncOverduePanelHeight);
    };

    scheduleSync();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleSync);
      observedNodes.forEach((node) => observer.observe(node));
    }

    window.addEventListener("resize", scheduleSync);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [
    syncOverduePanelHeight,
    dashBoardFilterLoading,
    dashBoardFilterList?.taskSummaryItem?.maintaskGrid,
    orderAndToolsTableProps?.rows,
    chartVelocityData?.length,
    taskByWorkloadLoading,
    workloadByUsersLoading,
    upcomingDeadlinesLoading,
    upcomingDeadlines?.upcomingDeadlines,
    dashboardFormula?.data?.length,
  ]);

  const summaryKey = "subTask";
  const tasksTabCount =
    orderAndToolsTableProps?.taskSummaryItem?.maintaskGrid?.totalTaskCount;

  const leadUserData =
    workspaceResponse?.healthSummaryItem?.boardHealthSummary?.[summaryKey]?.[0]
      ?.boardDetails?.[0]?.leadInfo || [];

  const activeDistribution = selectedDistribution?.[0] || TASK_DISTRIBUTION_OPTIONS[0];
  const distributionChartData = useMemo(() => {
    const taskSummaryItem = dashBoardFilterList?.taskSummaryItem || {};
    return activeDistribution.id === "priority"
      ? taskSummaryItem.priority || []
      : taskSummaryItem.freeFlowLabel || [];
  }, [activeDistribution.id, dashBoardFilterList?.taskSummaryItem]);
  const distributionColorMaster = useMemo(
    () =>
      activeDistribution.masterKey === "priority"
        ? taskPriorityList?.data || []
        : freeFlowLabelList?.data || [],
    [activeDistribution.masterKey, taskPriorityList?.data, freeFlowLabelList?.data],
  );
  const entityLabel = isOrionOrdersWorkspace ? "Orders" : "Tasks";
  const kpiInsight = useMemo(
    () => buildKpiGroupInsight(countCards, entityLabel),
    [countCards, entityLabel],
  );
  const flowInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "task-flow",
        label: isOrionOrdersWorkspace ? "Order Flow Over Time" : "Task Flow Over Time",
        type: "chart",
        exec: `Shows ${entityLabel.toLowerCase()} flow for this board over the selected period.`,
      }),
    [entityLabel, isOrionOrdersWorkspace],
  );
  const overdueInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "overdue-panel",
        label: "Overdues",
        type: "table",
        trend: "down",
        exec: "Lists overdue work items that need immediate attention on this board.",
      }),
    [],
  );
  const priorityInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "task-priority",
        label: activeDistribution?.title || "Task Priority distribution",
        type: "chart",
        exec: `Shows how tasks are split across ${
          activeDistribution?.id === "priority" ? "priority levels" : "labels"
        } for this board.`,
      }),
    [activeDistribution?.id, activeDistribution?.title],
  );
  const taskWorkloadInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "task-by-workload-age",
        label: "Task by workload / Task by age",
        type: "chart",
        exec: "Shows stage distribution by workload volume or aging buckets for this board.",
        insights: [
          "Switch between Task by workload and Task by age inside this panel to compare volume versus aging risk.",
        ],
        actions: [
          "Focus first on stages with the highest workload and the oldest age buckets.",
        ],
      }),
    [],
  );
  const workloadByAssigneeInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "workload-by-assignee",
        label: "Workload by assignee",
        type: "chart",
        exec: "Breaks down active task load across assignees on this board.",
        actions: [
          "Rebalance work from overloaded assignees before overdue volume grows further.",
        ],
      }),
    [],
  );
  const congestionHeatmapInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "congestion-heatmap",
        label: "Congestion heatmap",
        type: "chart",
        exec: "Shows which board stages are holding the most cards, in pipeline order.",
        actions: [
          "Investigate the reddest stages first — that's where work is piling up.",
        ],
      }),
    [],
  );
  const ticketTableInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "ticket-table",
        label: isOrionOrdersWorkspace ? "Orders table" : "Tasks table",
        type: "table",
        exec: `Lists ${
          isOrionOrdersWorkspace ? "orders" : "tasks"
        } for this board with status, ownership, and timing signals.`,
        insights: [
          `${tasksTabCount || orderAndToolsTableProps?.rows?.length || 0} row(s) are currently available in this table view.`,
        ],
        actions: [
          "Open the highest-risk rows first, then confirm assignees and due dates are still accurate.",
        ],
      }),
    [isOrionOrdersWorkspace, orderAndToolsTableProps?.rows?.length, tasksTabCount],
  );

  const handleUnassignedClick = () => {
    setUnAssignedSelected((prev) => !prev);
  };

  return (
    <div className="dashboard-page">
      <TopProgressBar loading={loading} />
      <BoardDashboardHeader
        boardType="task"
        boardFilter={boardFilter}
        selectedRange={selectedRange}
        showCalendar={showCalendar}
        dateTimeRef={dateTimeRef}
        getSelectedDate={getSelectedDate}
        filterResetToken={filterResetToken}
        filterDatas={filterDatas}
        auth={auth}
        getColor={getColor}
        onBoardTaskChanged={handleBoardTaskChanged}
        onSelectedCustomMonthRange={handleSelectedCustomMonthRange}
        onCancelCustomMonthApply={onCancelCustomMonthApply}
        onCustomMonthApply={handleCustomMonthApply}
        onDashboardSync={handleDashboardSync}
        onFilterBoard={filterBoard}
        onShowTourGuide={() => setShowTourGuide(true)}
        onCloseCalendar={() => setShowCalendar(false)}
        activeTabId={activeTabId}
        leadUserData={leadUserData?.length > 0 ? leadUserData : null}
      />
      {layout === "new" && (
        <>
          <section
            className="dashboard-page__content task-dashboard-content-first-row"
            aria-label="Task dashboard summary"
          >
            <div className="dashboard-page__content-left board-dashboard-content-left">
              <DashboardAIHotspot id="kpi-summary" insight={kpiInsight}>
                <DashboardCount
                  cards={countCards}
                  dashboardMaterValue={
                    dashboardFormula?.data?.filter(
                      (item) => item.name === "BoardHealthStatus",
                    )[0]?.value || []
                  }
                  gridCount={2}
                  type={boardFilter?.[0]?.value === "Subtask" ? "subtask" : "maintask"}
                  boardFilter={boardFilterApi}
                  boardType={boardType}
                  loading={orderToolsPerformanceTrendLoading}
                  skeletonCount={4}
                />
              </DashboardAIHotspot>
            </div>
            {orderToolsPerformanceTrendLoading ? (
              <SkeletonLoading
                className="dashboard-page__content-right"
                count={1}
                height={430}
                margin={"0"}
              />
            ) : (
              <div
                className="dashboard-page__content-right task-dashboard-flow-chart"
                ref={flowChartRef}
              >
                <DashboardAIHotspot id="task-flow" insight={flowInsight}>
                  <BoardOverdueHealthChart
                    data={chartVelocityData}
                    type={selectedBoardDashboard}
                    taskFlowMode={isTaskFlowChart}
                    healthLabel={
                      isTaskFlowChart
                        ? isOrionOrdersWorkspace
                          ? "Order Flow Over Time"
                          : "Task Flow Over Time"
                        : "Board: Overdue Summary"
                    }
                    apiLoading={
                      loading || (isTaskFlowChart && orderToolsPerformanceTrendLoading)
                    }
                    dashboardMaterValue={
                      dashboardFormula?.data?.filter(
                        (item) => item.name === "BoardHealthStatus",
                      )[0]?.value || []
                    }
                    selectedRange={selectedRange}
                    getSelectedDate={getSelectedDate}
                    boardFilter={boardFilter}
                    showCreatedTask={showCreatedTask}
                    countCards={countCards}
                    boardType="task"
                    getChartHeight={200}
                  />
                </DashboardAIHotspot>
              </div>
            )}
          </section>

          <section
            className="dashboard-page__content task-dashboard-content--donut-row"
            aria-label="Distribution charts"
            ref={chartsRowRef}
          >
            {orderToolsPerformanceTrendLoading ? (
              <>
                <div className="board-dashboard-distribution-split">
                  <SkeletonLoading
                    className="dashboard-page__content-right"
                    count={2}
                    height={440}
                    margin={"0"}
                    flexDirection="row"
                    gap="16px"
                  />
                </div>
                <SkeletonLoading
                  className="dashboard-page__content-right"
                  count={1}
                  height={440}
                  margin={"0"}
                  flexDirection="row"
                  gap="16px"
                />
              </>
            ) : (
              <>
                <div className="board-dashboard-distribution-split">
                  <DashboardAIHotspot
                    id="task-by-workload-age"
                    insight={taskWorkloadInsight}
                  >
                    <TaskStageDistribution
                      boardHealthStatusMasterValue={boardHealthStatusMasterValue}
                      dashBoardFilterList={taskByWorkloadResponse}
                      workloadTrendSource={orderToolsPerformanceTrendResponse}
                      loading={taskByWorkloadLoading}
                      auth={auth}
                      boardFilterApi={boardFilterApi}
                      boardFilter={boardFilter}
                      boardType={boardType}
                      selectedRange={selectedRange}
                      getSelectedDate={getSelectedDate}
                      selectWorkspaceDashboard={workspaceDashboardId}
                      taskAgeStatusList={taskAgeStatusList}
                    />
                  </DashboardAIHotspot>
                  <DashboardAIHotspot
                    id="workload-by-assignee"
                    insight={workloadByAssigneeInsight}
                  >
                    <WorkloadByAssignee
                      loading={workloadByUsersLoading}
                      dashboardFormula={dashboardFormula}
                      selectWorkspaceDashboard={workspaceDashboardId}
                      boardFilter={boardFilter}
                      workloadByUsersResponse={workloadByUsersResponse}
                      boardType={boardType}
                    />
                  </DashboardAIHotspot>
                </div>
                {!isOrionOrdersWorkspace ? (
                  <DashboardAIHotspot id="task-priority" insight={priorityInsight}>
                    <DonutChart
                      title={activeDistribution.title}
                      headerContent={
                        <SelectDropDown
                          options={TASK_DISTRIBUTION_OPTIONS}
                          values={selectedDistribution}
                          onChange={(values) =>
                            setSelectedDistribution(
                              values?.length ? values : [TASK_DISTRIBUTION_OPTIONS[0]],
                            )
                          }
                          labelField="title"
                          valueField="id"
                          multi={false}
                          searchable={false}
                          clearable={false}
                          optionType="radio"
                          className="filter-select-dropDown dashboard-page__action-btn p-2 dashboard-page__action-btn--ghost task-stage-distribution__select"
                        />
                      }
                      centerLabel={activeDistribution.centerLabel}
                      variant={activeDistribution.id}
                      data={distributionChartData}
                      colorMaster={distributionColorMaster}
                      loading={orderToolsPerformanceTrendLoading}
                    />
                  </DashboardAIHotspot>
                ) : (
                  <DashboardAIHotspot id="overdue-panel" insight={overdueInsight}>
                    <OverdueDeadlinesSidebar
                      panelRef={overduePanelRef}
                      velocityResponse={velocityResponse}
                      orderToolsPerformanceTrendResponse={
                        orderToolsPerformanceTrendResponse
                      }
                      selectedBoardDashboard={selectedBoardDashboard}
                      loading={upcomingDeadlinesLoading}
                      orderToolsPerformanceTrendLoading={
                        orderToolsPerformanceTrendLoading
                      }
                      boardHealthStatusMasterValue={boardHealthStatusMasterValue}
                      selectedRange={selectedRange}
                      getSelectedDate={getSelectedDate}
                      boardFilter={boardFilter}
                      showCreatedTask={showCreatedTask}
                      upcomingDeadlines={upcomingDeadlines}
                      onViewMore={handleViewMore}
                      countCards={countCards}
                      boardType="task"
                    />
                  </DashboardAIHotspot>
                )}
              </>
            )}
          </section>

          <section
            className="dashboard-page__content task-dashboard-content--heatmap-row"
            aria-label="Congestion heatmap"
          >
            {orderToolsPerformanceTrendLoading ? (
              <SkeletonLoading
                className="dashboard-page__content-right"
                count={1}
                height={220}
                margin={"0"}
              />
            ) : (
              <DashboardAIHotspot
                id="congestion-heatmap"
                insight={congestionHeatmapInsight}
              >
                <CongestionHeatmap
                  data={boardStageHeatmapResponse}
                  loading={boardStageHeatmapLoading}
                />
              </DashboardAIHotspot>
            )}
          </section>

          <section
            className={`${isOrionOrdersWorkspace ? "dashboard-page__content task-dashboard-content-second-first-row" : "dashboard-page__content board-dashboard-content-second-row"}`}
            aria-label="Tasks table"
          >
            {orderToolsPerformanceTrendLoading ? (
              <>
                <SkeletonLoading
                  className="dashboard-page__content-right"
                  count={1}
                  height={400}
                  margin={"0"}
                  flexDirection="row"
                  gap="10px"
                />
                <SkeletonLoading
                  className="dashboard-page__content-right"
                  count={1}
                  height={400}
                  margin={"0"}
                  flexDirection="row"
                  gap="10px"
                />
              </>
            ) : (
              <>
                {dashboardFormula?.data?.length > 0 && (
                  <DashboardAIHotspot id="ticket-table" insight={ticketTableInsight}>
                    <div
                      className="task-dashboard-content-second-row-item"
                      ref={tableSectionRef}
                    >
                      <div className="task-dashboard-content-second-row-item-header">
                        <h4 className="workspace-widget__title no-background">
                          <div className="workspace-widget__title-buttons">
                            <button
                              type="button"
                              className={`workspace-widget__title-button ${
                                showStageDuration === "orders" &&
                                ordersViewMode === "list"
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() => {
                                setShowStageDuration("orders");
                                setOrdersViewMode("list");
                              }}
                            >
                              <img
                                src={
                                  ordersViewMode === "list"
                                    ? listActiveView
                                    : listInActive
                                }
                                width={"20px"}
                                alt="list-view"
                              />
                              {/* {isOrionOrdersWorkspace
                                ? "Orders"
                                : "Tasks"}{" "} */}
                              &#160; List
                            </button>
                            <button
                              type="button"
                              className={`workspace-widget__title-button ${
                                showStageDuration === "orders" &&
                                ordersViewMode === "kanban"
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() => {
                                setShowStageDuration("orders");
                                setOrdersViewMode("kanban");
                              }}
                            >
                              <img
                                src={
                                  ordersViewMode === "kanban"
                                    ? gridView
                                    : gridViewInactive
                                }
                                alt="grid-view"
                                width={"20px"}
                              />
                              &#160; Kanban
                            </button>
                            {showStageDuration === "orders" && tasksTabCount > 0 ? (
                              <span
                                className="tasks-count"
                                aria-label={`Total ${isOrionOrdersWorkspace ? "orders" : "tasks"}: ${tasksTabCount}`}
                              >
                                {String(tasksTabCount).padStart(2, "0")}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              className={`workspace-widget__title-button ${showStageDuration === "stage-duration" ? "active" : ""}`}
                              onClick={() => setShowStageDuration("stage-duration")}
                            >
                              {isOrionOrdersWorkspace
                                ? "Order Stage Duration"
                                : "Task Stage Duration"}
                            </button>
                          </div>
                          {showStageDuration === "orders" && (
                            <div className="d-flex align-items-center gap-2 workspace-widget__title-actions">
                              {ordersViewMode === "kanban" && (
                                <div className="d-flex align-items-center me-3">
                                  <button
                                    type="button"
                                    className={`btn dashboard-page__order-tools-unassigned-btn ${unAssignedSelected ? "active" : ""}`}
                                    onClick={() => handleUnassignedClick()}
                                  >
                                    <img
                                      className="dashboard-page__order-tools-unassigned-btn-icon"
                                      src={
                                        unAssignedSelected
                                          ? checkedBlueIcon
                                          : unCheckedBlueIcon
                                      }
                                      alt=""
                                    />{" "}
                                    Unassigned
                                  </button>
                                </div>
                              )}
                              <div className="search-ticket d-flex input-field position-relative">
                                <input
                                  className="search-input"
                                  placeholder={
                                    isOrionOrdersWorkspace
                                      ? "Search by Order Name"
                                      : "Search by Task Name"
                                  }
                                  type="text"
                                  value={getSearchValue || ""}
                                  onChange={(e) => applySearchFilter(e)}
                                  onKeyDown={(e) => applySearchFilter(e)}
                                  disabled={
                                    loading ||
                                    (orderAndToolsTableProps?.rows?.maintaskList &&
                                      orderAndToolsTableProps?.rows?.maintaskList
                                        ?.length === 0)
                                  }
                                />
                                {getSearchValue?.length > 0 && (
                                  <button
                                    tabIndex={0}
                                    role="button"
                                    className="icon-close-icon close_icon "
                                    onClick={(e) => cleraSearchFilter(e)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        cleraSearchFilter(e);
                                      }
                                    }}
                                  ></button>
                                )}
                                <img
                                  className="search-icon"
                                  src={searchIcon}
                                  tabIndex={0}
                                  role="button"
                                  alt="searchIcon"
                                  onClick={() => applySearchFilter(getSearchValue)}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn dashboard-page__order-tools-export-btn"
                                onClick={handleExportOrderAndTools}
                                disabled={loading || orderToolsExportLoading}
                                title="Export Excel"
                              >
                                <ExportUploadIcon color="#00ADF0" />
                                {orderToolsExportLoading ? "Exporting..." : "Export"}
                              </button>
                            </div>
                          )}
                        </h4>
                      </div>
                      {showStageDuration === "stage-duration" && (
                        <AverageTimePerStage
                          boardStageHistoryResponse={boardStageHistoryResponse}
                          boardStageHistoryLoading={boardStageHistoryLoading}
                        />
                      )}
                      {showStageDuration === "orders" && (
                        <div className="dashboard-page__content-left-container">
                          {ordersViewMode === "kanban" ? (
                            kanbanBoard.length > 0 ? (
                              <div className="dashboard-orders-kanban">
                                <KanbanHome
                                  filtersShow={false}
                                  activeTaskCodes={kanbanActiveTaskCodes}
                                  board={kanbanBoard}
                                  onError={handleKanbanError}
                                  refreshKey={kanbanRefreshKey}
                                  resetRefreshKey={resetKanbanRefreshKey}
                                  disableDefaultAssignee
                                  onBoardDataChanged={handleKanbanBoardDataChanged}
                                />
                              </div>
                            ) : (
                              <div className="dashboard-orders-kanban__empty">
                                No board selected for the Kanban view.
                              </div>
                            )
                          ) : (
                            <OrderAndToolsTable {...orderAndToolsTableProps} />
                          )}
                        </div>
                      )}
                    </div>
                  </DashboardAIHotspot>
                )}
                {!isOrionOrdersWorkspace && (
                  <DashboardAIHotspot id="overdue-panel" insight={overdueInsight}>
                    <OverdueDeadlinesSidebar
                      panelRef={overduePanelRef}
                      velocityResponse={velocityResponse}
                      orderToolsPerformanceTrendResponse={
                        orderToolsPerformanceTrendResponse
                      }
                      selectedBoardDashboard={selectedBoardDashboard}
                      loading={upcomingDeadlinesLoading}
                      orderToolsPerformanceTrendLoading={
                        orderToolsPerformanceTrendLoading
                      }
                      boardHealthStatusMasterValue={boardHealthStatusMasterValue}
                      selectedRange={selectedRange}
                      getSelectedDate={getSelectedDate}
                      boardFilter={boardFilter}
                      showCreatedTask={showCreatedTask}
                      upcomingDeadlines={upcomingDeadlines}
                      onViewMore={handleViewMore}
                      countCards={countCards}
                      boardType="task"
                    />
                  </DashboardAIHotspot>
                )}
              </>
            )}
          </section>
        </>
      )}

      <PopupModal
        show={showPopup}
        onClose={() => setShowPopup(false)}
        header={false}
        title="View More"
        customClassName="upcoming-deadlines-list__modal-dialog"
        children={
          <UpcomingDeadlinesList
            deadline={
              selectedUpcomingDeadline ??
              upcomingDeadlines?.upcomingDeadlines?.[0] ??
              upcomingDeadlines?.upcomingDeadlinesViewMore?.[0] ??
              null
            }
            data={upcomingDeadlines?.upcomingDeadlinesViewMore ?? []}
            onClose={() => setShowPopup(false)}
            boardFilter={boardFilter}
            dashboardFormulaData={boardHealthStatusMasterValue}
            selectWorkspaceDashboard={workspaceDashboardId}
            boardType={"task"}
            orderToolsPageSize={orderToolsPageSize}
            orderToolsPageOffset={orderToolsPageOffset}
          />
        }
      />

      <PopupModal
        show={isTableExpanded}
        onClose={() => setIsTableExpanded(false)}
        header={false}
        title={""}
        size="xl"
        centered={false}
        customClassName="order-tools-list__modal-dialog"
        className="dashboard-page__order-tools-modal-body"
        children={
          <>
            <h4 className="dashboard-page__order-tools-modal-header-title">
              &#160;{" "}
              {isOrionOrdersWorkspace
                ? "Orders"
                : "Tasks"}{" "}
              <button
                className="dashboard-page__order-tools-modal-header-close"
                onClick={() => setIsTableExpanded(false)}
              >
                <img
                  src={closeIcon}
                  alt="close icon"
                  className="dashboard-page__order-tools-modal-header-close-icon"
                />
              </button>
            </h4>
            <OrderAndToolsTable {...orderAndToolsTableProps} />
          </>
        }
      />
      <Outlet />
    </div>
  );
};

export default withDashboardAIMode(TaskDashboard);

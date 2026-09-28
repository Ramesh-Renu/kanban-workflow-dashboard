import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { safeParseLocalStorage, BOARD_DASHBOARD_TABS, isIodDashboardWorkspace, getSelectedDashboardWorkspaceId } from "utils/dashboard";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";
import PopupModal from "@orion/shared/src/components/PopupModal";
import DashboardCount from "../count";
import WorkspaceWidget from "../Widget/Workspace";
import OrderAndToolsTable from "./OrderAndToolsTable";
import UpcomingDeadlinesList from "./UpcomingDeadlinesList";
import DashboardTourGuide from "../Widget/DashboardTourGuide";
import BoardTourSteps, { BOARD_TOUR_TOTAL_STEPS } from "../Widget/BoardTourSteps";
import BoardDashboardHeader from "./BoardDashboardHeader";
import BoardHealthReport from "./BoardHealthReport";
import OverdueDeadlinesSidebar from "./OverdueDeadlinesSidebar";
import useBoardDashboardData from "../utils/useBoardDashboardData";
import useOrderToolsModalSidenavOffset from "../utils/useOrderToolsModalSidenavOffset";
import { boardExpandIcon, closeIcon } from "assets/images";
import searchIcon from "assets/images/search-icon.svg";
import ExportUploadIcon from "../Widget/Icons/ExportUploadIcon";
import BoardOverdueHealthChart from "./BoardOverdueHealthChart";
import DonutChart from "./DonutChart";
import CountryDistribution from "./CountryDistribution";
import MarketBarChart from "./MarketBarChart";
import SkeletonLoading from "components/common/SkeletonLoading";
import withDashboardAIMode from "../aiMode/withDashboardAIMode";
import DashboardAIHotspot from "../aiMode/DashboardAIHotspot";
import {
  buildKpiGroupInsight,
  buildSectionInsight,
} from "../aiMode/buildAIHotspotInsight";

const BoardDashboard = () => {
  const location = useLocation();

  const {
    auth,
    boardType,
    loading,
    healthSummaryloading,
    orderToolsPerformanceTrendLoading,
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
    countCards,
    boardHealthStatusMasterValue,
    dashboardFormula,
    filterDatas,
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
    orderToolsPageSize,
    handleOrderToolsPageChange,
    handleSortOrderTools,
    applyOrderToolsSearch,
    clearOrderToolsSearch,
    orderToolsSearch,
    orderToolsPageOffset,
    upcomingDeadlinesLoading,
    freeFlowLabelList,
    taskPriorityList,
    leadUserData,
    isIodWorkspace,
    selectedDashboardWorkspaceId,
  } = useBoardDashboardData();

  const getColor = boardHealthStatusMasterValue?.find(
    (check) =>
      check.label?.toLowerCase()?.replaceAll(" ", "-") ===
      safeParseLocalStorage("selectWorkspaceDashboard")?.statusTone,
  );

  const activeTabId = selectedBoardDashboard[0]?.filter_id;
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  useOrderToolsModalSidenavOffset(isTableExpanded);
  const [getSearchValue, setSearchValue] = useState(orderToolsSearch);
  const debounceTimeoutRef = useRef(null);
  const overduePanelRef = useRef(null);
  const tableSectionRef = useRef(null);
  const donutRowRef = useRef(null);
  const flowChartRef = useRef(null);
  const activeBoardsRef = useRef(null);
  const workspaceDashboardId =
    selectedDashboardWorkspaceId ?? getSelectedDashboardWorkspaceId(auth?.details);
  const isOrionOrdersWorkspace =
    isIodWorkspace || isIodDashboardWorkspace(auth?.details);
  const entityLabel = isOrionOrdersWorkspace ? "Orders" : "Tasks";
  const kpiInsight = useMemo(
    () => buildKpiGroupInsight(countCards, entityLabel),
    [countCards, entityLabel],
  );
  const flowInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "order-flow",
        label: isOrionOrdersWorkspace ? "Order Flow Over Time" : "Task Flow Over Time",
        type: "chart",
        exec: `Shows ${entityLabel.toLowerCase()} created, completed, and active volume across the selected date range.`,
        insights: [
          `Compare this flow chart with the ${entityLabel} KPI strip to confirm intake versus throughput.`,
        ],
      }),
    [entityLabel, isOrionOrdersWorkspace],
  );
  const activeBoardsInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "active-boards",
        label: "Active Boards",
        type: "table",
        trend: "flat",
        exec: "Lists boards in this workspace with overdue and completion signals.",
        insights: [
          `${workspaceCards?.length || 0} board card(s) are currently visible in this panel.`,
        ],
        actions: ["Open the highest-overdue board first and confirm ownership coverage."],
      }),
    [workspaceCards?.length],
  );
  const countryInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "country-dist",
        label: "Country distribution",
        type: "chart",
        exec: "Breaks down orders by country of origin for the selected period.",
      }),
    [],
  );
  const regionInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "region-dist",
        label: "Region distribution",
        type: "chart",
        exec: "Groups the same order set into broader regions.",
      }),
    [],
  );
  const marketInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "stock-exchange",
        label: "Orders by Stock Exchange",
        type: "chart",
        exec: "Ranks order volume by associated stock exchange.",
      }),
    [],
  );
  const priorityInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "task-priority",
        label: "Task Priority distribution",
        type: "chart",
        exec: "Shows how tasks are split across priority levels for the selected period.",
        insights: [
          `${dashBoardFilterList?.taskSummaryItem?.priority?.length || 0} priority segment(s) are currently available in this chart.`,
        ],
      }),
    [dashBoardFilterList?.taskSummaryItem?.priority?.length],
  );
  const overdueInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "overdue-panel",
        label: "Overdues",
        type: "table",
        trend: "down",
        exec: "Lists overdue work items that need immediate attention on this board.",
        insights: [
          `${upcomingDeadlines?.upcomingDeadlines?.length || 0} overdue item(s) are currently listed in this panel.`,
        ],
        actions: ["Clear the oldest overdue items first, then re-check board health."],
      }),
    [upcomingDeadlines?.upcomingDeadlines?.length],
  );
  const tasksTabCount =
    dashBoardFilterList?.taskSummaryItem?.maintaskGrid?.totalTaskCount;
  const ticketTableInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "ticket-table",
        label: isOrionOrdersWorkspace ? "Orders table" : "Tasks table",
        type: "table",
        exec: `Lists ${
          isOrionOrdersWorkspace ? "orders" : "tasks"
        } for this workspace board with status, ownership, and timing signals.`,
        insights: [
          `${tasksTabCount || 0} ${
            isOrionOrdersWorkspace ? "order" : "task"
          }(s) are currently available in this table view.`,
        ],
        actions: [
          "Open the highest-risk rows first, then confirm assignees and due dates are still accurate.",
        ],
      }),
    [isOrionOrdersWorkspace, tasksTabCount],
  );

  useEffect(() => {
    setSearchValue(orderToolsSearch);
  }, [orderToolsSearch]);

  const syncActiveBoardsHeight = useCallback(() => {
    const chart = flowChartRef.current;
    const activeBoards = activeBoardsRef.current;
    if (!chart || !activeBoards) return;

    // Align Active Boards bottom with BoardOverdueHealthChart bottom.
    const chartBottom = chart.getBoundingClientRect().bottom;
    const boardsTop = activeBoards.getBoundingClientRect().top;
    const nextHeight = Math.max(0, Math.round(chartBottom - boardsTop));

    activeBoards.style.minHeight = `${nextHeight}px`;
    activeBoards.style.height = `${nextHeight}px`;
    activeBoards.style.maxHeight = `${nextHeight}px`;
  }, []);

  const syncOverduePanelHeight = useCallback(() => {
    const overduePanel = overduePanelRef.current;
    if (!overduePanel) return;

    // Non-Orion: Overdues sits in the donut row — match donut chart height.
    if (!isOrionOrdersWorkspace && donutRowRef.current) {
      const donutCard = donutRowRef.current.querySelector(
        ".board-donut-chart, .dashboard-expandable-panel.board-donut-chart",
      );
      if (donutCard) {
        // Clear first so Overdues doesn't inflate the row while measuring graphs.
        overduePanel.style.minHeight = "0";
        overduePanel.style.height = "auto";
        overduePanel.style.maxHeight = "none";

        const nextHeight = Math.max(
          0,
          Math.round(donutCard.getBoundingClientRect().height),
        );
        overduePanel.style.minHeight = `${nextHeight}px`;
        overduePanel.style.height = `${nextHeight}px`;
        overduePanel.style.maxHeight = `${nextHeight}px`;
        return;
      }
    }

    // Orion (and table row): match the Orders/Tasks table section bottom.
    const tableSection = tableSectionRef.current;
    if (!tableSection) return;

    // Clear first so a stale min-height doesn't inflate the measurement source.
    overduePanel.style.minHeight = "0";
    overduePanel.style.height = "auto";
    overduePanel.style.maxHeight = "none";

    const tableRect = tableSection.getBoundingClientRect();
    const overdueTop = overduePanel.getBoundingClientRect().top;
    const nextHeight = Math.max(
      0,
      Math.round(Math.max(tableRect.height, tableRect.bottom - overdueTop)),
    );
    overduePanel.style.minHeight = `${nextHeight}px`;
    overduePanel.style.height = `${nextHeight}px`;
    overduePanel.style.maxHeight = `${nextHeight}px`;
  }, [isOrionOrdersWorkspace]);

  /** APPLY SEARCH FILTER */
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
  const orderAndToolsModalTitle = BOARD_DASHBOARD_TABS(workspaceDashboardId)[1]?.name;

  const isTaskFlowChart =
    boardType === "task" || selectedBoardDashboard[0]?.filter_id === 23;

  const chartVelocityData = useMemo(() => {
    if (isTaskFlowChart) {
      return orderToolsPerformanceTrendResponse?.velocity?.length
        ? orderToolsPerformanceTrendResponse.velocity
        : velocityResponse?.velocity || [];
    }
    return velocityResponse?.velocity || [];
  }, [
    isTaskFlowChart,
    orderToolsPerformanceTrendResponse?.velocity,
    velocityResponse?.velocity,
  ]);

  const shouldRenderChart =
    Array.isArray(chartVelocityData) && chartVelocityData.length > 0;

  useEffect(() => {
    const observedNodes = [flowChartRef.current, activeBoardsRef.current].filter(Boolean);
    if (!observedNodes.length) return undefined;

    const scheduleSync = () => {
      requestAnimationFrame(syncActiveBoardsHeight);
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
    syncActiveBoardsHeight,
    loading,
    orderToolsPerformanceTrendLoading,
    healthSummaryloading,
    chartVelocityData?.length,
    workspaceCards?.length,
    shouldRenderChart,
    isTaskFlowChart,
    selectedBoardDashboard,
  ]);

  useEffect(() => {
    if (activeTabId !== 23 || isTableExpanded) return undefined;

    const tableSection = tableSectionRef.current;
    const observedNodes = [
      overduePanelRef.current,
      isOrionOrdersWorkspace ? tableSection : donutRowRef.current,
    ].filter(Boolean);

    if (isOrionOrdersWorkspace && tableSection) {
      const tableHotspot = tableSection.closest(".ai-dashboard-hotspot");
      if (tableHotspot) observedNodes.push(tableHotspot);
      tableSection
        .querySelectorAll("table, .order-tools-table, .pagination, .table-responsive")
        .forEach((node) => observedNodes.push(node));
    }

    if (!observedNodes.length) return undefined;

    const scheduleSync = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(syncOverduePanelHeight);
      });
    };

    scheduleSync();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleSync);
      observedNodes.forEach((node) => observer.observe(node));

      // Also watch each donut card so Overdues tracks graph height changes.
      if (!isOrionOrdersWorkspace && donutRowRef.current) {
        donutRowRef.current
          .querySelectorAll(
            ".board-donut-chart, .dashboard-expandable-panel.board-donut-chart",
          )
          .forEach((node) => observer.observe(node));
      }
    }

    window.addEventListener("resize", scheduleSync);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [
    syncOverduePanelHeight,
    activeTabId,
    isTableExpanded,
    isOrionOrdersWorkspace,
    dashBoardFilterLoading,
    healthSummaryloading,
    orderToolsPerformanceTrendLoading,
    orderAndToolsTableProps?.rows,
    orderAndToolsTableProps?.taskSummaryItem?.maintaskGrid,
    orderToolsTablePage,
    upcomingDeadlinesLoading,
    upcomingDeadlines?.upcomingDeadlines,
    dashBoardFilterList?.taskSummaryItem?.priority,
    dashBoardFilterList?.taskSummaryItem?.freeFlowLabel,
  ]);

  return (
    <div className="dashboard-page">
      <TopProgressBar loading={loading} />

      <BoardDashboardHeader
        boardType={boardType}
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
        // leadUserData={leadUserData}
      />

      {location?.state?.name && <h4>{location?.state?.name}</h4>}

      <section
        className={`dashboard-page__content board-dashboard-content-second-row
          ${
            !isOrionOrdersWorkspace
              ? " board-dashboard-content-second-row--task-boards"
              : ""
          }
        `}
        aria-label="Board dashboard content"
      >
        <div className={`dashboard-page__content-left board-dashboard-content-left`}>
          <DashboardAIHotspot id="kpi-summary" insight={kpiInsight}>
            <DashboardCount
              cards={countCards}
              dashboardMaterValue={
                dashboardFormula?.data?.filter((item) => item.name === "BoardHealthStatus")[0]
                  ?.value || []
              }
              gridCount={boardFilter?.[0]?.value === "Maintask" ? 3 : 4}
              type={boardFilter?.[0]?.value === "Subtask" ? "subtask" : "maintask"}
              boardFilter={boardFilterApi}
              boardType={safeParseLocalStorage("selectWorkspaceDashboard")?.type}
              loading={orderToolsPerformanceTrendLoading || healthSummaryloading}
            />
          </DashboardAIHotspot>
          {orderToolsPerformanceTrendLoading ? (
            <div
              ref={flowChartRef}
              className={`${isOrionOrdersWorkspace ? "board-dashboard-donut-row-4 board-dashboard-donut-row-4--task-boards nonIOD-boards" : "dashboard-page__content board-dashboard-donut-row-4 nonIOD-boards"}`}
            >
              <SkeletonLoading
                className="dashboard-page__content-right dashboard-page__content-right-skeleton"
                count={1}
                height={400}
                margin={"0"}
                flexDirection="row"
                gap="26px"
              />
              {!isOrionOrdersWorkspace && (
                <SkeletonLoading
                  className="dashboard-page__content-right dashboard-page__content-right-skeleton"
                  count={1}
                  height={400}
                  margin={"0"}
                  flexDirection="row"
                  gap="26px"
                />
              )}
            </div>
          ) : (
            <>
              <div
                ref={flowChartRef}
                className={`${isOrionOrdersWorkspace ? "board-dashboard-donut-row-4 board-dashboard-donut-row-4--task-boards nonIOD-boards" : "dashboard-page__content board-dashboard-donut-row-4 nonIOD-boards"}`}
              >
                <DashboardAIHotspot id="order-flow" insight={flowInsight}>
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
                    apiLoading={orderToolsPerformanceTrendLoading}
                    dashboardMaterValue={dashboardFormula?.data?.filter(
                      (item) => item.name === "BoardHealthStatus",
                    )[0]?.value || []}
                    selectedRange={selectedRange}
                    getSelectedDate={getSelectedDate}
                    boardFilter={boardFilter}
                    showCreatedTask={showCreatedTask}
                    countCards={countCards}
                    getChartHeight={300}
                  />
                </DashboardAIHotspot>

                {!isOrionOrdersWorkspace && (
                  <DashboardAIHotspot id="task-priority" insight={priorityInsight}>
                    <DonutChart
                      title="Task Priority distribution"
                      centerLabel="Task Priority"
                      variant="priority"
                      data={dashBoardFilterList?.taskSummaryItem?.priority || []}
                      colorMaster={taskPriorityList?.data || []}
                      loading={orderToolsPerformanceTrendLoading}
                    />
                  </DashboardAIHotspot>
                )}
              </div>
            </>
          )}
        </div>

        {(orderToolsPerformanceTrendLoading || healthSummaryloading) ? (
          <SkeletonLoading
            className="dashboard-page__content-right"
            count={1}
            height={549}
            margin={"0"}
          />
        ) : (
          workspaceCards?.length > 0 && (
            <div className="dashboard-page__content-right">
              <DashboardAIHotspot id="active-boards" insight={activeBoardsInsight}>
                <div
                  ref={activeBoardsRef}
                  className="workspace-widget__active-boards-shell"
                >
                  <WorkspaceWidget
                    workspaces={workspaceCards}
                    dashboardMaterValue={dashboardFormula?.data?.filter(
                      (item) => item.name === "BoardHealthStatus",
                    )[0]?.value || []}
                    apiLoading={orderToolsPerformanceTrendLoading}
                    placeholder="Search by Work board"
                    fromPage="board"
                    boardFilter={boardFilter}
                    upcomingDeadlinesData={
                      upcomingDeadlines?.upcomingDeadlinesViewMore || []
                    }
                    selectedRange={selectedRange}
                    completedTrendCard={countCards?.find((card) => card.id === "completed")}
                  />
                </div>
              </DashboardAIHotspot>
            </div>
          )
        )}
      </section>

      {orderToolsPerformanceTrendLoading ? (
        <section
          className="dashboard-page__content board-dashboard-donut-row-3"
          aria-label="Distribution charts"
        >
          <SkeletonLoading
            className="dashboard-page__content-right"
            count={3}
            height={340}
            margin={"0"}
            flexDirection="row"
            gap="16px"
          />
        </section>
      ) : (
        <>
          {isOrionOrdersWorkspace && (
            <section
              className="dashboard-page__content board-dashboard-donut-row-3 board-dashboard-donut-row-3--orders"
              aria-label="Distribution charts"
            >
              <div className="board-dashboard-distribution-split">
                <DashboardAIHotspot id="country-dist" insight={countryInsight}>
                  <CountryDistribution
                    title="Country distribution"
                    centerLabel="Orders"
                    data={dashBoardFilterList?.taskSummaryItem}
                    loading={orderToolsPerformanceTrendLoading}
                  />
                </DashboardAIHotspot>
                <DashboardAIHotspot id="region-dist" insight={regionInsight}>
                  <DonutChart
                    title="Region distribution"
                    centerLabel="Region"
                    variant="region"
                    data={dashBoardFilterList?.taskSummaryItem}
                    loading={orderToolsPerformanceTrendLoading}
                  />
                </DashboardAIHotspot>
              </div>
              <DashboardAIHotspot id="stock-exchange" insight={marketInsight}>
                <MarketBarChart
                  title="Orders by Stock Exchange"
                  subtitle="Order volume across major global stock exchanges."
                  data={dashBoardFilterList?.taskSummaryItem?.market}
                  loading={orderToolsPerformanceTrendLoading}
                />
              </DashboardAIHotspot>
            </section>
          )}
        </>
      )}

      <section
        className="dashboard-page__content board-dashboard-content board-dashboard-content-second-row board-dashboard-content-table-row"
        aria-label="Board dashboard tasks and overdues"
      >
        {dashboardFormula?.data?.length > 0 &&
          activeTabId === 23 &&
          !orderToolsPerformanceTrendLoading && (
            <>
              <DashboardAIHotspot id="ticket-table" insight={ticketTableInsight}>
                <div
                  className="board-dashboard-content-second-row-item"
                  ref={tableSectionRef}
                >
                <h4 className="workspace-widget__title no-background">
                  <div className="workspace-widget__title-buttons">
                    <button className={`workspace-widget__title-button default-active`}>
                      {isOrionOrdersWorkspace
                        ? "Orders"
                        : "Tasks"}
                      &#160;
                      {tasksTabCount > 0 ? (
                        <span className="tasks-count">
                          {String(tasksTabCount).padStart(2, "0")}
                        </span>
                      ) : (
                        ""
                      )}
                    </button>
                  </div>
                  <div className="d-flex align-items-center gap-2 workspace-widget__title-actions">
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
                        disabled={loading}
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
                  {/* {orderAndToolsTableProps?.taskSummaryItem?.maintaskGrid?.totalPageCount >
                  0 && (
                  <span className="total-task-count">
                    Showing Result data{" "}
                    <strong>
                      {
                        orderAndToolsTableProps?.taskSummaryItem?.maintaskGrid
                          ?.totalTaskCount
                      }
                    </strong>{" "}
                    entries found
                  </span>
                )} */}
                </h4>
                {!isTableExpanded && <OrderAndToolsTable {...orderAndToolsTableProps} />}
                </div>
              </DashboardAIHotspot>
              {activeTabId !== 24 && (
                <DashboardAIHotspot id="overdue-panel" insight={overdueInsight}>
                  <OverdueDeadlinesSidebar
                    panelRef={overduePanelRef}
                    velocityResponse={velocityResponse}
                    orderToolsPerformanceTrendResponse={orderToolsPerformanceTrendResponse}
                    selectedBoardDashboard={selectedBoardDashboard}
                    loading={upcomingDeadlinesLoading}
                    orderToolsPerformanceTrendLoading={orderToolsPerformanceTrendLoading}
                    boardHealthStatusMasterValue={dashboardFormula?.data?.filter(
                      (item) => item.name === "BoardHealthStatus",
                    )[0]?.value || []}
                    selectedRange={selectedRange}
                    getSelectedDate={getSelectedDate}
                    boardFilter={boardFilter}
                    showCreatedTask={showCreatedTask}
                    upcomingDeadlines={upcomingDeadlines}
                    onViewMore={handleViewMore}
                    countCards={countCards}
                    boardType="board"
                  />
                </DashboardAIHotspot>
              )}
            </>
          )}
        {orderToolsPerformanceTrendLoading && (
          <>
            <SkeletonLoading
              className="dashboard-page__content-right"
              count={1}
              height={340}
              margin={"0"}
              flexDirection="row"
            />
            <SkeletonLoading
              className="dashboard-page__content-right"
              count={1}
              height={340}
              margin={"0"}
              flexDirection="row"
            />
          </>
        )}
      </section>

      <PopupModal
        show={showPopup}
        onClose={() => setShowPopup(!showPopup)}
        header={false}
        title="View More"
        customClassName="upcoming-deadlines-list__modal-dialog"
        children={
          <UpcomingDeadlinesList
            deadline={
              selectedUpcomingDeadline ??
              upcomingDeadlines?.upcomingDeadlines?.[0] ??
              null
            }
            data={upcomingDeadlines?.upcomingDeadlinesViewMore ?? []}
            onClose={() => setShowPopup(!showPopup)}
            boardFilter={boardFilter}
            dashboardFormulaData={dashboardFormula?.data?.filter(
              (item) => item.name === "BoardHealthStatus",
            )[0]?.value || []}
            selectWorkspaceDashboard={workspaceDashboardId}
            boardType={safeParseLocalStorage("selectWorkspaceDashboard")?.type}
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
            <OrderAndToolsTable
              {...orderAndToolsTableProps}
              isTableExpanded={isTableExpanded}
            />
          </>
        }
      />

      <DashboardTourGuide
        show={showTourGuide}
        onClose={() => setShowTourGuide(false)}
        title="Board Dashboard Tour"
        StepsComponent={BoardTourSteps}
        totalSteps={BOARD_TOUR_TOTAL_STEPS}
        dashboardFormulaData={dashboardFormula?.data?.filter(
          (item) => item.name === "BoardHealthStatus",
        )[0]?.value || []}
      />

      <Outlet />
    </div>
  );
};

export default withDashboardAIMode(BoardDashboard);

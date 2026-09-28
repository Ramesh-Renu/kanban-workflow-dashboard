import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import SelectDropDown from "@orion/shared/src/components/SelectDropDown";
import DashboardExpandablePanel from "../utils/DashboardExpandablePanel";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";
import {
  buildStageDistributionColorMap,
  normalizeTaskStageAgeData,
  normalizeTaskStagePerformanceData,
  normalizeTaskStageTopFiveWorkloadData,
  resolveStageDistributionColor,
  resolveTaskStageDistributionSource,
} from "utils/dashboard";
import { boardExpandIcon } from "assets/images";
import { getBoardStageSummaryItem } from "services";
import StageAgingAnalysisModal from "./StageAgingAnalysisModal";
import {
  customMonthDashboardDates,
  getBoardPerformanceHealthParams,
  getDashboardApiWorkspaceIds,
  getDashboardApiBoardIds,
  resolveDashboardAssigneeParam,
  safeParseLocalStorage,
} from "utils/dashboard";
import TotalOutline from "../Widget/Icons/TotalOutline";
import { COLORS_VALUES } from "utils/dashboard";

const VIEW_OPTIONS = [
  { id: "taskbyWorkload", name: "Task by workload" },
  { id: "taskbyAge", name: "Task by age" },
];

const AGE_BUCKET_BY_STATUS_ID = {
  1: "age0To3",
  2: "age4To7",
  3: "age8Plus",
};

const DEFAULT_AGE_LEGEND = [
  { key: "age0To3", label: "0–3 days", color: "#84CC16" },
  { key: "age4To7", label: "4–7 days", color: "#F59E0B" },
  { key: "age8Plus", label: "8+ days", color: "#EF4444" },
];

const buildAgeLegend = (taskAgeStatusList) => {
  const items = taskAgeStatusList?.data;
  if (!Array.isArray(items) || !items.length) {
    return DEFAULT_AGE_LEGEND;
  }

  const legend = items
    .map((item) => {
      const key = AGE_BUCKET_BY_STATUS_ID[Number(item.status_id)];
      if (!key) return null;
      const bucketIndex = DEFAULT_AGE_LEGEND.findIndex((bucket) => bucket.key === key);
      const defaultBucket = DEFAULT_AGE_LEGEND[bucketIndex];
      return {
        key,
        label: item.name,
        color: resolveStageDistributionColor(
          item.color_code || defaultBucket?.color,
          bucketIndex >= 0 ? bucketIndex : 0,
        ),
      };
    })
    .filter(Boolean);

  return legend.length ? legend : DEFAULT_AGE_LEGEND;
};

const WORKLOAD_LEGEND_COLLAPSED_LIMIT = 5;
const AGE_STAGE_COLLAPSED_LIMIT = 3;
const WORKLOAD_OTHERS_LEGEND_COLOR = "#94A3B8";
const DEFAULT_STAGE_DONUT_COLOR = WORKLOAD_OTHERS_LEGEND_COLOR;

const EMPTY_DONUT_PLACEHOLDER = [
  { id: "__donut-placeholder__", name: "", value: 1, count: 0 },
];

const getStageApiColor = (entry) => {
  const color = entry?.colorCode ?? entry?.color_Code ?? entry?.sourceColor;
  return typeof color === "string" && color.trim() ? color.trim() : null;
};

const getPerformanceDonutSliceColor = (entry, index = 0) =>
  getStageApiColor(entry) ?? resolveStageDistributionColor(entry?.color, index);

const buildAgeListDisplay = (
  rows = [],
  isExpanded = false,
  limit = AGE_STAGE_COLLAPSED_LIMIT,
) => {
  if (isExpanded || rows.length <= limit) {
    return { visibleRows: rows, hiddenLabelCount: 0 };
  }

  return {
    visibleRows: rows.slice(0, limit),
    hiddenLabelCount: rows.length - limit,
  };
};

const buildWorkloadLegendItems = (
  allRows = [],
  isExpanded = false,
  limit = 5,
  topFiveRows = [],
) => {
  if (isExpanded) {
    return allRows;
  }

  const legendTopRows = topFiveRows.length ? topFiveRows : allRows.slice(0, limit);

  if (!legendTopRows.length) {
    return allRows;
  }

  const topIds = new Set(legendTopRows.map((row) => String(row.id)));
  const hiddenRows = allRows.filter((row) => !topIds.has(String(row.id)));

  if (hiddenRows.length === 0) {
    return legendTopRows;
  }

  const othersCount = hiddenRows.reduce(
    (sum, row) => sum + Number(row.count ?? row.value ?? 0),
    0,
  );

  return [
    ...legendTopRows,
    {
      id: "__workload-others__",
      name: "+ Others",
      count: othersCount,
      value: othersCount,
      color: WORKLOAD_OTHERS_LEGEND_COLOR,
      isOthers: true,
    },
  ];
};

const withComputedPercentages = (rows = []) => {
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  if (!totalCount) {
    return rows.map((row) => ({
      ...row,
      percentage: row.percentage || 0,
      value: row.count || 0,
    }));
  }

  return rows.map((row) => {
    const percentage =
      row.percentage > 0
        ? Math.round(row.percentage)
        : Math.round((row.count / totalCount) * 100);
    return {
      ...row,
      percentage,
      value: row.count,
    };
  });
};

const PerformanceDonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const row = item?.payload ?? {};
  const color = row.color ?? item.color ?? "#94A3B8";

  return (
    <div className="workload-by-assignee__chart-tooltip velocity-widget__chart-tooltip">
      <p style={{ margin: "0 0 6px" }}>
        <strong>{row.name}</strong>
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <p
          style={{
            display: "flex",
            gap: "8px",
            margin: 0,
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              background: color,
              width: "10px",
              height: "10px",
              display: "block",
            }}
          />
          <span>Tasks</span>
        </p>
        <span style={{ fontWeight: "600", minWidth: "35px", textAlign: "right" }}>
          {Math.round(Number(row.value ?? item.value) || 0)}
        </span>
      </div>
    </div>
  );
};

const DONUT_HOVER_OFFSET = 8;
const DONUT_HOVER_ANIMATION_MS = 220;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const useAnimatedHoverProgress = (isActive) => {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const target = isActive ? 1 : 0;
    const from = progressRef.current;
    if (from === target) return undefined;

    const start = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / DONUT_HOVER_ANIMATION_MS);
      const next = from + (target - from) * easeOutCubic(t);
      progressRef.current = next;
      setProgress(next);

      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isActive]);

  return progress;
};

const DonutSliceShape = ({
  cx,
  cy,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  index,
  hoveredSliceIndex,
  hoverProgress,
}) => {
  const offset = index === hoveredSliceIndex ? DONUT_HOVER_OFFSET * hoverProgress : 0;

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + offset}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ cursor: "pointer" }}
    />
  );
};

const blurChartFocus = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const AgeByPerformanceRow = ({ row, ageLegend, handleShowTaskByWorkload }) => {
  const bucketTotal = row.age0To3 + row.age4To7 + row.age8Plus;
  const total = bucketTotal > 0 ? bucketTotal : Number(row.total ?? 0);
  const segments = ageLegend.map((bucket) => ({
    ...bucket,
    count: row[bucket.key] ?? 0,
    width: total > 0 ? `${Math.max(0, (row[bucket.key] / total) * 100)}%` : "0%",
  }));

  return (
    <button
      type="button"
      className="task-stage-distribution__age-row"
      onClick={() => handleShowTaskByWorkload(row)}
    >
      <div className="task-stage-distribution__age-row-head">
        <span className="task-stage-distribution__age-row-title">
          <span
            className="task-stage-distribution__legend-dot"
            style={{
              backgroundColor: resolveStageDistributionColor(row.color),
            }}
          />
          {row.name}
        </span>
        <span className="task-stage-distribution__age-row-total">
          {total}
          <span className="task-stage-distribution__age-row-chevron" aria-hidden>
            ›
          </span>
        </span>
      </div>
      <div className="task-stage-distribution__age-bar" aria-hidden>
        {segments.map((segment) =>
          segment.count > 0 ? (
            <span
              key={segment.key}
              className="task-stage-distribution__age-bar-segment"
              style={{
                width: segment.width,
                backgroundColor: resolveStageDistributionColor(segment.color),
              }}
            />
          ) : null,
        )}
      </div>
      <div className="task-stage-distribution__age-breakdown">
        {segments.map((segment) => (
          <span key={segment.key} className="task-stage-distribution__age-breakdown-item">
            <span
              className="task-stage-distribution__legend-dot task-stage-distribution__legend-dot--sm"
              style={{
                backgroundColor: resolveStageDistributionColor(segment.color),
              }}
            />
            <strong>{segment.count}</strong>
            <span
              className="task-stage-distribution__age-breakdown-separator"
              aria-hidden
            >
              ᛫
            </span>
            {segment.label}
          </span>
        ))}
      </div>
    </button>
  );
};

const AgeOtherLabelsRow = ({ hiddenLabelCount, onExpand }) => {
  if (hiddenLabelCount <= 0) return null;

  return (
    <button
      type="button"
      className="task-stage-distribution__age-others"
      onClick={onExpand}
    >
      + Other Labels {hiddenLabelCount}
    </button>
  );
};

const StageLayersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 3L3 8l9 5 9-5-9-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M3 12l9 5 9-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M3 16l9 5 9-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const StageTasksTrendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M4 16l5-5 4 4 7-8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 7h5v5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StageDistributionSummary = ({
  totalStages,
  totalTasks,
  boardHealthStatusMasterValue,
}) => (
  <div className="task-stage-distribution__summary">
    <article className="task-stage-distribution__summary-card">
      <div className="task-stage-distribution__summary-icon task-stage-distribution__summary-icon--stages">
        <TotalOutline
          color={COLORS_VALUES(boardHealthStatusMasterValue).total}
          isTransparent={true}
          bgColor="transparent"
          needDivElement={false}
          style={{ width: "16px", height: "16px" }}
        />
      </div>
      <div className="task-stage-distribution__summary-card-content">
        <p className="task-stage-distribution__summary-value">{totalStages}</p>
        <p className="task-stage-distribution__summary-label">Total Stages</p>
      </div>
    </article>
    <article className="task-stage-distribution__summary-card">
      <div className="task-stage-distribution__summary-icon task-stage-distribution__summary-icon--tasks">
        <StageTasksTrendIcon />
      </div>
      <div className="task-stage-distribution__summary-card-content">
        <p className="task-stage-distribution__summary-value">{totalTasks}</p>
        <p className="task-stage-distribution__summary-label">Active Tasks</p>
      </div>
    </article>
  </div>
);

const TaskStageDistribution = ({
  dashBoardFilterList,
  workloadTrendSource,
  loading = false,
  auth,
  boardFilterApi,
  boardFilter,
  boardType,
  selectedRange,
  getSelectedDate,
  selectWorkspaceDashboard,
  taskAgeStatusList,
  boardHealthStatusMasterValue,
}) => {
  const [viewOption, setViewOption] = useState([VIEW_OPTIONS[0]]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSliceIndex, setActiveSliceIndex] = useState(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState(null);
  const [showStageSummaryPopup, setShowStageSummaryPopup] = useState(false);
  const [selectedStageRow, setSelectedStageRow] = useState(null);
  const [stageSummaryResponse, setStageSummaryResponse] = useState(null);
  const [stageSummaryLoading, setStageSummaryLoading] = useState(false);
  const viewId = viewOption?.[0]?.id ?? "taskbyWorkload";
  const isSliceHovered = activeSliceIndex != null;
  const hoverProgress = useAnimatedHoverProgress(isSliceHovered);
  const ageLegend = useMemo(() => buildAgeLegend(taskAgeStatusList), [taskAgeStatusList]);
  const distributionSource = useMemo(
    () => resolveTaskStageDistributionSource(dashBoardFilterList, workloadTrendSource),
    [dashBoardFilterList, workloadTrendSource],
  );

  const workloadReferenceRows = useMemo(
    () => normalizeTaskStagePerformanceData(distributionSource),
    [distributionSource],
  );

  const performanceRows = useMemo(
    () => withComputedPercentages(workloadReferenceRows),
    [workloadReferenceRows],
  );

  const topFiveWorkloadRows = useMemo(
    () =>
      withComputedPercentages(
        normalizeTaskStageTopFiveWorkloadData(distributionSource, workloadReferenceRows),
      ),
    [distributionSource, workloadReferenceRows],
  );

  const stageColorByKey = useMemo(
    () => buildStageDistributionColorMap(workloadReferenceRows),
    [workloadReferenceRows],
  );

  const ageRows = useMemo(
    () =>
      normalizeTaskStageAgeData(distributionSource, {
        referenceRows: workloadReferenceRows,
        stageColorByKey,
      }),
    [distributionSource, workloadReferenceRows, stageColorByKey],
  );

  const highlightedSegment = useMemo(() => {
    if (!performanceRows.length) return null;
    return [...performanceRows].sort(
      (a, b) => b.percentage - a.percentage || b.value - a.value,
    )[0];
  }, [performanceRows]);

  const totalStages = performanceRows.length;
  const totalTasks = useMemo(
    () =>
      performanceRows.reduce((sum, row) => sum + Number(row.count ?? row.value ?? 0), 0),
    [performanceRows],
  );

  const handlePieEnter = useCallback((_, index) => {
    setActiveSliceIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActiveSliceIndex(null);
  }, []);

  const handleChartMouseLeave = useCallback(() => {
    blurChartFocus();
    setActiveSliceIndex(null);
  }, []);

  useEffect(() => {
    if (activeSliceIndex != null) {
      setHoveredSliceIndex(activeSliceIndex);
      return;
    }

    if (hoverProgress < 0.01) {
      setHoveredSliceIndex(null);
    }
  }, [activeSliceIndex, hoverProgress]);

  const renderDonutSliceShape = useCallback(
    (props) => (
      <DonutSliceShape
        {...props}
        hoveredSliceIndex={hoveredSliceIndex}
        hoverProgress={hoverProgress}
      />
    ),
    [hoveredSliceIndex, hoverProgress],
  );

  const hasPerformanceData = performanceRows.length > 0;
  const hasAgeData = ageRows.length > 0;
  const isPerformanceView = viewId === "taskbyWorkload";
  const showEmptyState = isPerformanceView ? !hasPerformanceData : !hasAgeData;

  const performanceDonutSlices = useMemo(
    () => performanceRows.filter((row) => Number(row.count ?? row.value ?? 0) > 0),
    [performanceRows],
  );

  const centerSegment = useMemo(() => {
    if (activeSliceIndex != null && performanceDonutSlices[activeSliceIndex]) {
      return performanceDonutSlices[activeSliceIndex];
    }
    return highlightedSegment;
  }, [activeSliceIndex, performanceDonutSlices, highlightedSegment]);

  const showGreyDonutPlaceholder = useMemo(() => {
    if (loading) return true;
    if (!performanceDonutSlices.length) return true;
    if (totalTasks === 0) return true;
    return false;
  }, [loading, performanceDonutSlices, totalTasks]);

  const donutChartData = showGreyDonutPlaceholder
    ? EMPTY_DONUT_PLACEHOLDER
    : performanceDonutSlices;

  const donutSize = (expanded) => ({
    height: expanded ? 340 : 220,
    innerRadius: expanded ? 88 : 62,
    outerRadius: expanded ? 128 : 92,
  });

  const fetchBoardStageSummaryItem = useCallback(
    async (row) => {
      if (!auth?.details?.user_type || !auth?.details?.regId) return;

      const orderToolsPerformanceTrendDateParams =
        selectedRange?.[0]?.value === "CUSTOM_RANGE"
          ? { ...customMonthDashboardDates(getSelectedDate).performancehealthsummary }
          : getBoardPerformanceHealthParams(selectedRange?.[0]?.value);

      const taskType = boardFilter?.[0]?.value || "Maintask";
      const dateParams = {
        ...boardFilterApi,
        ...orderToolsPerformanceTrendDateParams,
        fromDate: orderToolsPerformanceTrendDateParams.toDate,
        toDate: orderToolsPerformanceTrendDateParams.fromDate,
        pageOffset: 0,
        pageSize: 10,
        sortBy: null,
        sortOrder: null,
      };

      const params = {
        ...dateParams,
        status: boardFilterApi?.status || null,
        regId: auth?.details?.regId || null,
        boardId: getDashboardApiBoardIds(auth?.details, {
          boardType,
          filterBoardId: boardFilterApi?.boardId,
          taskType,
        }),
        userTypeId: auth?.details?.user_type,
        workspaceId: getDashboardApiWorkspaceIds(auth?.details, boardType),
        taskType,
        orderTypeId: boardFilterApi?.orderTypeId || null,
        orderLabelId: boardFilterApi?.orderLabelId || null,
        assignee: resolveDashboardAssigneeParam(
          auth?.details,
          safeParseLocalStorage("selectBoardDashboard")?.id,
          boardFilterApi?.assignee,
        ),
        stageId: row?.id != null ? [row.id] : boardFilterApi?.stageId || null,
        regionId: boardFilterApi?.regionId || null,
        marketId: boardFilterApi?.marketId || null,
        countryId: boardFilterApi?.countryId || null,
        dueStatusId: boardFilterApi?.dueStatusId || null,
      };

      try {
        setStageSummaryLoading(true);
        setStageSummaryResponse(null);
        const res = await getBoardStageSummaryItem(params);
        if (res?.status) {
          setStageSummaryResponse(res?.data);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setStageSummaryLoading(false);
      }
    },
    [auth, boardFilter, boardFilterApi, boardType, getSelectedDate, selectedRange],
  );

  const handleStageSelect = useCallback(
    (row) => {
      if (!row) return;

      const isSameStage =
        selectedStageRow?.id != null &&
        row.id != null &&
        String(selectedStageRow.id) === String(row.id);

      if (isSameStage && showStageSummaryPopup) {
        return;
      }

      setSelectedStageRow(row);
      setShowStageSummaryPopup(true);
      fetchBoardStageSummaryItem(row);
    },
    [fetchBoardStageSummaryItem, selectedStageRow, showStageSummaryPopup],
  );

  const handleOpenStagesModal = useCallback(
    (row) => {
      const initialRow = row ?? ageRows[0];
      if (initialRow) {
        handleStageSelect(initialRow);
      }
    },
    [ageRows, handleStageSelect],
  );

  const handleExpandView = useCallback(() => {
    if (isPerformanceView) {
      setIsExpanded(true);
      return;
    }
    handleOpenStagesModal(ageRows[0]);
  }, [ageRows, handleOpenStagesModal, isPerformanceView]);

  const handleCloseStageSummaryPopup = useCallback(() => {
    setShowStageSummaryPopup(false);
    setSelectedStageRow(null);
    setStageSummaryResponse(null);
  }, []);

  return (
    <>
      <DashboardExpandablePanel
        className="task-stage-distribution"
        ariaLabel="Task stage distribution"
        expandDisabled={loading}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        showDefaultExpandButton={false}
        header={
          <>
            <div className="task-stage-distribution__head">
              {!isExpanded && (
                <SelectDropDown
                  options={VIEW_OPTIONS}
                  values={viewOption}
                  onChange={(value) => {
                    const selected = Array.isArray(value) ? value[0] : value;
                    setViewOption(selected?.id ? [selected] : [VIEW_OPTIONS[0]]);
                  }}
                  labelField="name"
                  valueField="id"
                  multi={false}
                  searchable={false}
                  clearable={false}
                  optionType="radio"
                  className="filter-select-dropDown dashboard-page__action-btn p-2 dashboard-page__action-btn--ghost task-stage-distribution__select"
                />
              )}
              {!isExpanded && (
                <div className="dashboard-expandable-panel__toolbar">
                  <button
                    type="button"
                    className="board-overdue-health-chart__subtitle-expand"
                    role="button"
                    tabIndex={0}
                    onClick={handleExpandView}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleExpandView();
                      }
                    }}
                    disabled={loading || (!isPerformanceView && showEmptyState)}
                  >
                    Expand &#160;
                    <img
                      src={boardExpandIcon}
                      alt="boardExpand"
                    />
                  </button>
                </div>
              )}
            </div>
          </>
        }
      >
        {(panelExpanded) => {
          const workloadLegendItems = buildWorkloadLegendItems(
            performanceRows,
            panelExpanded,
            WORKLOAD_LEGEND_COLLAPSED_LIMIT,
            topFiveWorkloadRows,
          );
          const { visibleRows: visibleAgeRows, hiddenLabelCount } = buildAgeListDisplay(
            ageRows,
            panelExpanded,
            AGE_STAGE_COLLAPSED_LIMIT,
          );

          return loading && !isPerformanceView ? (
            <DashboardChartSkeleton
              variant="donut"
              expanded={panelExpanded}
              legendCount={5}
              className="task-stage-distribution__chart-skeleton"
              ariaLabel="Loading stage distribution chart"
            />
          ) : showEmptyState && !isPerformanceView ? (
            <div className="task-stage-distribution__empty">
              No stage distribution data available.
            </div>
          ) : isPerformanceView ? (
            <div
              className={`task-stage-distribution__performance${
                panelExpanded ? " task-stage-distribution__performance--expanded" : ""
              }`}
            >
              <div
                className={`task-stage-distribution__donut-wrap${
                  showGreyDonutPlaceholder
                    ? " task-stage-distribution__donut-wrap--placeholder"
                    : ""
                }`}
                aria-busy={loading || undefined}
                onMouseDown={(event) => {
                  if (!event.target.closest(".recharts-sector")) {
                    blurChartFocus();
                  }
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height={donutSize(panelExpanded).height}
                >
                  <PieChart
                    onMouseLeave={
                      showGreyDonutPlaceholder ? undefined : handleChartMouseLeave
                    }
                  >
                    <Pie
                      data={donutChartData}
                      dataKey="value"
                      nameKey="name"
                      fill={DEFAULT_STAGE_DONUT_COLOR}
                      innerRadius={donutSize(panelExpanded).innerRadius}
                      outerRadius={donutSize(panelExpanded).outerRadius}
                      paddingAngle={showGreyDonutPlaceholder ? 0 : 2}
                      stroke="none"
                      isAnimationActive={!showGreyDonutPlaceholder}
                      animationDuration={450}
                      animationEasing="ease-out"
                      shape={showGreyDonutPlaceholder ? undefined : renderDonutSliceShape}
                      onMouseEnter={showGreyDonutPlaceholder ? undefined : handlePieEnter}
                      onMouseLeave={showGreyDonutPlaceholder ? undefined : handlePieLeave}
                      onClick={showGreyDonutPlaceholder ? undefined : blurChartFocus}
                    >
                      {donutChartData.map((entry, index) => (
                        <Cell
                          key={entry.id}
                          fill={
                            showGreyDonutPlaceholder
                              ? DEFAULT_STAGE_DONUT_COLOR
                              : getPerformanceDonutSliceColor(entry, index)
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {!showGreyDonutPlaceholder && centerSegment && (
                  <div className="task-stage-distribution__donut-center" aria-hidden>
                    <strong>{centerSegment.count}</strong>
                    <span>{centerSegment.name}</span>
                  </div>
                )}
              </div>
              <ul
                className={`task-stage-distribution__legend${
                  panelExpanded ? " task-stage-distribution__legend--scroll" : ""
                }`}
              >
                {workloadLegendItems.map((row, index) => {
                  const rowSliceIndex = performanceDonutSlices.findIndex(
                    (item) => String(item.id) === String(row.id),
                  );

                  return (
                    <li
                      key={row.id}
                      className={`task-stage-distribution__legend-item${
                        row.isOthers
                          ? " task-stage-distribution__legend-item--others"
                          : ""
                      }${
                        !showGreyDonutPlaceholder &&
                        activeSliceIndex != null &&
                        rowSliceIndex === activeSliceIndex
                          ? " task-stage-distribution__legend-item--active"
                          : ""
                      }`}
                      {...(row.isOthers && !panelExpanded && !showGreyDonutPlaceholder
                        ? {
                            role: "button",
                            tabIndex: 0,
                            onClick: () => setIsExpanded(true),
                            onKeyDown: (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setIsExpanded(true);
                              }
                            },
                          }
                        : {})}
                    >
                      <span
                        className="task-stage-distribution__legend-dot"
                        style={{
                          backgroundColor: row.isOthers
                            ? WORKLOAD_OTHERS_LEGEND_COLOR
                            : getPerformanceDonutSliceColor(row, index),
                        }}
                      />
                      <span className="task-stage-distribution__legend-label">
                        {row.name}
                      </span>
                      <span className="task-stage-distribution__legend-value">
                        {showGreyDonutPlaceholder ? 0 : row.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {panelExpanded && !showGreyDonutPlaceholder && (
                <StageDistributionSummary
                  totalStages={totalStages}
                  totalTasks={totalTasks}
                  boardHealthStatusMasterValue={boardHealthStatusMasterValue}
                />
              )}
            </div>
          ) : (
            <div
              className={`task-stage-distribution__age-view${
                panelExpanded ? " task-stage-distribution__age-view--expanded" : ""
              }`}
            >
              <div className="task-stage-distribution__age-legend">
                {ageLegend.map((item, index) => (
                  <span
                    key={item.key}
                    className="task-stage-distribution__age-legend-item"
                  >
                    <span
                      className="task-stage-distribution__legend-dot task-stage-distribution__legend-dot--sm"
                      style={{
                        backgroundColor: resolveStageDistributionColor(item.color, index),
                      }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
              <div
                className={`task-stage-distribution__age-list${
                  panelExpanded ? " task-stage-distribution__age-list--expanded" : ""
                }`}
              >
                {visibleAgeRows.map((row) => (
                  <AgeByPerformanceRow
                    key={row.id}
                    row={row}
                    ageLegend={ageLegend}
                    handleShowTaskByWorkload={handleStageSelect}
                  />
                ))}
                {!panelExpanded && hiddenLabelCount > 0 && (
                  <AgeOtherLabelsRow
                    hiddenLabelCount={hiddenLabelCount}
                    onExpand={() =>
                      handleOpenStagesModal(ageRows[AGE_STAGE_COLLAPSED_LIMIT])
                    }
                  />
                )}
              </div>
            </div>
          );
        }}
      </DashboardExpandablePanel>

      <StageAgingAnalysisModal
        show={showStageSummaryPopup}
        onClose={handleCloseStageSummaryPopup}
        loading={stageSummaryLoading}
        stageRow={selectedStageRow}
        stageRows={ageRows}
        ageLegend={ageLegend}
        onStageSelect={handleStageSelect}
        summaryResponse={
          stageSummaryResponse?.boardStageSummaryItem?.taskStageDistribution
        }
        selectWorkspaceDashboard={selectWorkspaceDashboard}
      />
    </>
  );
};

export default memo(TaskStageDistribution);

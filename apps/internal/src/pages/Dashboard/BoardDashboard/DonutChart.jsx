import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import DashboardExpandablePanel from "../utils/DashboardExpandablePanel";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";
import { boardExpandIcon } from "assets/images";
import { COLORS_VALUES } from "utils/dashboard";

const DONUT_COLORS = [
  "#00ADF0",
  "#6366F1",
  "#F59E0B",
  "#14B8A6",
  "#22C55E",
  "#EC4899",
  "#8B5CF6",
  "#94A3B8",
];

const OTHERS_LEGEND_COLOR = "#94A3B8";

const DISTRIBUTION_SCHEMAS = {
  region: {
    topFive: "topFiveRegions",
    all: "allRegions",
    overall: "overallRegionCount",
    name: "regionName",
    count: "regionCount",
    id: "regionId",
  },
  country: {
    topFive: "topFiveCountries",
    all: "allCountries",
    overall: "overallCountryCount",
    name: "countryName",
    count: "countryCount",
    id: "countryId",
  },
  priority: {
    topFive: "topFivePriorities",
    all: "allPriorities",
    overall: "overallPriorityCount",
    name: "priorityName",
    count: "priorityCount",
    id: "priorityId",
  },
  freeFlowLabel: {
    topFive: "topFiveFreeFlowLabels",
    all: "allFreeFlowLabels",
    overall: "overallFreeFlowLabelCount",
    name: "freeFlowLabelName",
    count: "freeFlowLabelCount",
    id: "freeFlowLabelId",
  },
};

const WORKSPACE_HEALTH_SEGMENTS = [
  { id: "healthy", name: "Healthy", metricKey: "healthy", colorKey: "healthy" },
  {
    id: "needsAttention",
    name: "Needs Attention",
    metricKey: "needsAttention",
    colorKey: "needsAttention",
  },
  { id: "atRisk", name: "At Risk", metricKey: "atRisk", colorKey: "atRisk" },
];

const mapWorkspaceHealthRows = (data, dashboardMaterValue = []) => {
  if (!data || typeof data !== "object") return [];

  const colors = COLORS_VALUES(dashboardMaterValue);
  const overall = WORKSPACE_HEALTH_SEGMENTS.reduce(
    (sum, segment) => sum + getNumericMetric(data[segment.metricKey]),
    0,
  );

  if (!overall) return [];

  return WORKSPACE_HEALTH_SEGMENTS.map((segment) => {
    const count = getNumericMetric(data[segment.metricKey]);
    return {
      id: segment.id,
      name: segment.name,
      count,
      value: count,
      percentage: Math.round((count / overall) * 100),
      color: colors[segment.colorKey] || DONUT_COLORS[0],
    };
  }).filter((row) => row.count > 0);
};

const getNumericMetric = (value, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
};

const resolveDistributionSource = (data, variant) => {
  const schema = DISTRIBUTION_SCHEMAS[variant];
  if (!schema || !data || typeof data !== "object") return null;

  const nested = data[variant];
  if (
    nested &&
    typeof nested === "object" &&
    (Array.isArray(nested[schema.topFive]) || Array.isArray(nested[schema.all]))
  ) {
    return { ...schema, source: nested };
  }

  if (Array.isArray(data[schema.topFive]) || Array.isArray(data[schema.all])) {
    return { ...schema, source: data };
  }

  return null;
};

const mapDistributionRows = (items = [], schema, overallCount, colorById = null) =>
  items
    .map((row, index) => {
      const count = getNumericMetric(
        row[schema.count] ?? row.count ?? row.totalCount,
      );
      const name = row[schema.name] ?? row.name ?? "—";
      const id = row[schema.id] ?? row.id ?? `${name}-${index}`;
      return {
        id,
        name: typeof name === "string" && name.trim() ? name : "—",
        count,
        color: colorById?.get(String(id)) ?? DONUT_COLORS[index % DONUT_COLORS.length],
      };
    })
    .filter((row) => row.count > 0)
    .map((row) => ({
      ...row,
      percentage: overallCount > 0 ? Math.round((row.count / overallCount) * 100) : 0,
      value: row.count,
    }));

const getMasterItemColor = (item) =>
  item?.colour_code ||
  item?.colorCode ||
  item?.back_ground_colour ||
  item?.color_Code ||
  item?.color ||
  null;

const buildMasterColorMap = (masterList = []) => {
  const map = new Map();
  (Array.isArray(masterList) ? masterList : masterList?.data || []).forEach((item) => {
    const id = item?.status_id ?? item?.id;
    const color = getMasterItemColor(item);
    if (id != null && color) {
      map.set(String(id), color);
    }
  });
  return map;
};

const buildDistributionColorMap = (rows = [], masterColorMap = null) => {
  const map = new Map();
  rows.forEach((row, index) => {
    const masterColor = masterColorMap?.get(String(row.id));
    map.set(
      String(row.id),
      masterColor || row.color || DONUT_COLORS[index % DONUT_COLORS.length],
    );
  });
  return map;
};

const buildDistributionLegendItems = (
  topFiveRows = [],
  allRows = [],
  isExpanded = false,
) => {
  if (isExpanded) {
    return allRows;
  }

  if (!topFiveRows.length) {
    return allRows;
  }

  const topFiveIds = new Set(topFiveRows.map((row) => String(row.id)));
  const hiddenRows = allRows.filter((row) => !topFiveIds.has(String(row.id)));
  const othersCount = hiddenRows.reduce((sum, row) => sum + row.count, 0);

  if (hiddenRows.length === 0 || othersCount <= 0) {
    return topFiveRows;
  }

  return [
    ...topFiveRows,
    {
      id: "__distribution-others__",
      name: "+ Others",
      count: othersCount,
      value: othersCount,
      percentage: 0,
      color: OTHERS_LEGEND_COLOR,
      isOthers: true,
    },
  ];
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

const DonutChart = ({
  title = "",
  centerLabel = "Total",
  variant = "region",
  data = null,
  loading = false,
  dashboardMaterValue = [],
  colorMaster = [],
  headerContent = null,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSliceIndex, setActiveSliceIndex] = useState(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState(null);
  const isWorkspaceHealth = variant === "workspaceHealth";

  const masterColorMap = useMemo(
    () => buildMasterColorMap(colorMaster),
    [colorMaster],
  );

  const distribution = useMemo(
    () => (isWorkspaceHealth ? null : resolveDistributionSource(data, variant)),
    [data, variant, isWorkspaceHealth],
  );

  const allRows = useMemo(() => {
    if (isWorkspaceHealth) {
      return mapWorkspaceHealthRows(data, dashboardMaterValue);
    }

    if (!distribution) return [];
    const allItems = distribution.source[distribution.all] ?? [];
    const overallCount = getNumericMetric(distribution?.source?.[distribution?.overall]);
    const rows = mapDistributionRows(
      allItems,
      distribution,
      overallCount,
      masterColorMap.size ? masterColorMap : null,
    );
    const colorById = buildDistributionColorMap(rows, masterColorMap);
    return rows.map((row) => ({
      ...row,
      color: colorById.get(String(row.id)) ?? row.color,
    }));
  }, [isWorkspaceHealth, data, dashboardMaterValue, distribution, masterColorMap]);

  const topFiveRows = useMemo(() => {
    if (isWorkspaceHealth) return allRows;

    if (!distribution) return [];
    const topFive = distribution.source[distribution.topFive] ?? [];
    const overallCount = getNumericMetric(distribution?.source?.[distribution?.overall]);
    const colorById = buildDistributionColorMap(allRows, masterColorMap);
    return mapDistributionRows(topFive, distribution, overallCount, colorById);
  }, [isWorkspaceHealth, allRows, distribution, masterColorMap]);

  const overallCount = useMemo(() => {
    if (isWorkspaceHealth) {
      return allRows.reduce((sum, row) => sum + row.count, 0);
    }
    return getNumericMetric(distribution?.source?.[distribution?.overall]);
  }, [isWorkspaceHealth, allRows, distribution]);

  const isSliceHovered = activeSliceIndex != null;
  const hoverProgress = useAnimatedHoverProgress(isSliceHovered);
  const showEmptyState = isWorkspaceHealth
    ? !data || allRows.length === 0
    : !distribution || overallCount <= 0 || allRows.length === 0;

  const centerDisplay = useMemo(() => {
    if (isWorkspaceHealth) {
      if (activeSliceIndex != null && allRows[activeSliceIndex]) {
        const segment = allRows[activeSliceIndex];
        return {
          count: `${segment.count}%`,
          label: segment.name,
        };
      }

      const atRiskRow = allRows.find((row) => row.id === "atRisk");
      const atRiskValue = atRiskRow?.count ?? getNumericMetric(data?.atRisk);
      return {
        count: `${atRiskValue}%`,
        label: "At Risk",
      };
    }

    if (activeSliceIndex != null && allRows[activeSliceIndex]) {
      const segment = allRows[activeSliceIndex];
      return { count: segment.count, label: segment.name };
    }

    // Region center shows number of regions, not order volume from overallRegionCount.
    const centerCount =
      variant === "region" ? allRows?.filter((row) => row?.id !== 0)?.length : overallCount;
    return { count: centerCount, label: centerLabel };
  }, [
    isWorkspaceHealth,
    activeSliceIndex,
    allRows,
    data,
    overallCount,
    centerLabel,
    variant,
  ]);

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

  const donutSize = (expanded) => ({
    height: expanded ? 340 : 220,
    innerRadius: expanded ? 88 : 62,
    outerRadius: expanded ? 128 : 92,
  });

  return (
    <DashboardExpandablePanel
      className={`task-stage-distribution board-donut-chart${
        variant ? ` board-donut-chart--${variant}` : ""
      }`}
      ariaLabel={title || "Distribution chart"}
      expandDisabled={loading}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      showDefaultExpandButton={false}
      header={
        <div className="task-stage-distribution__head">
          {headerContent || (title ? <h4 className="task-stage-distribution__title">{title}</h4> : null)}
          {!isExpanded && (
            <div className="dashboard-expandable-panel__toolbar">
              <button
                type="button"
                className="board-overdue-health-chart__subtitle-expand"
                aria-label={`Expand ${title || "chart"}`}
                onClick={() => setIsExpanded(true)}
                disabled={loading || showEmptyState}
              >
                Expand &#160;
                <img src={boardExpandIcon} alt="" />
              </button>
            </div>
          )}
        </div>
      }
    >
      {(panelExpanded) => {
        const legendItems = buildDistributionLegendItems(
          topFiveRows,
          allRows,
          panelExpanded,
        );

        if (loading) {
          return (
            <DashboardChartSkeleton
              variant="donut"
              expanded={panelExpanded}
              legendCount={isWorkspaceHealth ? 3 : 5}
              className="task-stage-distribution__chart-skeleton"
              ariaLabel={`Loading ${title || "chart"}`}
            />
          );
        }

        if (!loading && showEmptyState) {
          return (
            <div className="task-stage-distribution__empty">
              <p className="workspace-widget__no-data-found w-100">No Data Found</p>
            </div>
          );
        }

        return (
          <div
            className={`task-stage-distribution__performance${
              panelExpanded ? " task-stage-distribution__performance--expanded" : ""
            }`}
          >
            <div
              className="task-stage-distribution__donut-wrap"
              onMouseDown={(event) => {
                if (!event.target.closest(".recharts-sector")) {
                  blurChartFocus();
                }
              }}
            >
              <ResponsiveContainer width="100%" height={donutSize(panelExpanded).height}>
                <PieChart onMouseLeave={handleChartMouseLeave}>
                  <Pie
                    data={allRows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={donutSize(panelExpanded).innerRadius}
                    outerRadius={donutSize(panelExpanded).outerRadius}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive
                    animationDuration={450}
                    animationEasing="ease-out"
                    shape={renderDonutSliceShape}
                    onMouseEnter={handlePieEnter}
                    onMouseLeave={handlePieLeave}
                    onClick={blurChartFocus}
                  >
                    {allRows.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="task-stage-distribution__donut-center" aria-hidden>
                <strong>{centerDisplay.count}</strong>
                <span>{centerDisplay.label}</span>
              </div>
            </div>
            <ul
              className={`task-stage-distribution__legend${
                panelExpanded ? " task-stage-distribution__legend--scroll" : ""
              }`}
            >
              {legendItems.map((row) => {
                const rowSliceIndex = allRows.findIndex((item) => item.id === row.id);

                return (
                <li
                  key={row.id}
                  className={`task-stage-distribution__legend-item${
                    row.isOthers ? " task-stage-distribution__legend-item--others" : ""
                  }${
                    activeSliceIndex != null && rowSliceIndex === activeSliceIndex
                      ? " task-stage-distribution__legend-item--active"
                      : ""
                  }`}
                  {...(row.isOthers && !panelExpanded
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
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="task-stage-distribution__legend-label">
                    {row.name}
                  </span>
                  <span className="task-stage-distribution__legend-value">
                    {isWorkspaceHealth ? `${row.count}%` : row.count}
                  </span>
                </li>
                );
              })}
            </ul>
          </div>
        );
      }}
    </DashboardExpandablePanel>
  );
};

export default memo(DonutChart);

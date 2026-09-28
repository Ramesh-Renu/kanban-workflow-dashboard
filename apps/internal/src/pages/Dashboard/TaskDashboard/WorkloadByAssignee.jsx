import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import DashboardExpandablePanel from "../utils/DashboardExpandablePanel";
import { boardExpandIcon } from "assets/images";
import { colorCodeCardName } from "constant/ColorCodes";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const AssigneeAvatar = ({ name, photoUrl }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const showInitials = !photoUrl || imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  return (
    <div
      className="workload-by-assignee__x-avatar"
      style={{ backgroundColor: showInitials ? avatarColor : "transparent" }}
      title={name}
    >
      {showInitials ? (
        <span className="workload-by-assignee__x-avatar-initials">{initials}</span>
      ) : (
        <img
          src={photoUrl}
          alt={name}
          className="workload-by-assignee__x-avatar-img"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
};

const getAvatarColor = (name = "") => {
  const key = name.trim().charAt(0).toLowerCase();
  return colorCodeCardName.find((item) => item.name === key)?.color || "#94A3B8";
};

/** Default view: avatar only. Expanded view: avatar + wrapped name. */
const getAssigneeSlotLayout = (chartWidth, count, isPanelExpanded = false) => {
  if (!chartWidth || !count) {
    return {
      slotWidth: 88,
      labelMode: isPanelExpanded ? "wrap" : "hidden",
      tickHeight: isPanelExpanded ? 70 : 38,
    };
  }

  const rawSlotWidth = Math.max(40, Math.floor((chartWidth - 36) / count) - 4);
  const slotWidth = count === 1 ? Math.min(rawSlotWidth, 112) : rawSlotWidth;
  const labelMode = isPanelExpanded ? "wrap" : "hidden";
  const tickHeight = isPanelExpanded ? 70 : 38;

  return {
    slotWidth,
    labelMode,
    tickHeight,
  };
};

/** Pick y-axis step/ticks from data range so low values (Orders) still show 5, 10, 15… */
const buildWorkloadYAxisScale = (peakValue) => {
  const safePeak = Math.max(Number(peakValue) || 0, 1);
  const step = safePeak > 75 ? 25 : safePeak > 35 ? 10 : 5;
  const domainMax = Math.ceil(safePeak / step) * step;
  const tickCount = domainMax / step + 1;

  return {
    domainMax,
    ticks: Array.from({ length: tickCount }, (_, index) => index * step),
  };
};

const AssigneeAxisTick = ({
  x = 0,
  y = 0,
  payload,
  assigneeRows = [],
  slotWidth = 88,
  labelMode = "hidden",
  tickHeight = 38,
}) => {
  const rowId = payload?.value ?? "";
  const row =
    assigneeRows.find((item) => item.id === rowId) ??
    payload?.payload ??
    {};
  const name = row?.name ?? "Unknown";
  const photoUrl = row?.photoUrl;
  const halfSlot = slotWidth / 2;
  const showName = labelMode === "wrap";
  const labelClassName =
    "workload-by-assignee__x-label workload-by-assignee__x-label--wrap";

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-halfSlot} y={0} width={slotWidth} height={tickHeight}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="workload-by-assignee__x-tick"
        >
          <AssigneeAvatar name={name} photoUrl={photoUrl} />
          {showName ? (
            <div className={labelClassName} title={name}>
              {name}
            </div>
          ) : null}
        </div>
      </foreignObject>
    </g>
  );
};

const STATUS_COLORS = {
  overload: "#EF4444",
  attention: "#F59E0B",
  underutilized: "#22C55E",
};

const STATUS_LABELS = {
  overload: "Overload",
  attention: "Needs attention",
  underutilized: "Underutilized",
};

const TEAM_AVERAGE_LINE_COLOR = "#8B7CF6";

/** Figma bar palette — vivid top color that fades toward the base. */
const WORKLOAD_BAR_PALETTE = [
  "#F43F5E",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#A855F7",
  "#06B6D4",
  "#EC4899",
];

const getWorkloadBarColor = (index = 0) =>
  WORKLOAD_BAR_PALETTE[index % WORKLOAD_BAR_PALETTE.length];

const formatTeamAverage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const roundedTopBarPath = (x, y, width, height, radius = 12) => {
  if (width <= 0 || height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    "Z",
  ].join(" ");
};

const WorkloadBarShape = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (height <= 0 || width <= 0 || !payload?.gradientId) return null;

  return (
    <path
      className="workload-by-assignee__bar"
      d={roundedTopBarPath(x, y, width, height,4)}
      fill={`url(#${payload.gradientId})`}
    />
  );
};

/** Dashed average line always; callout only while hovering the line. */
const TeamAverageShape = (props) => {
  const {
    x1,
    x2,
    y1,
    stroke,
    strokeWidth,
    strokeDasharray,
    axisY = null,
    onHoverChange,
  } = props;
  const [hoverX, setHoverX] = useState(null);

  if (![x1, x2, y1].every((value) => Number.isFinite(value))) return null;

  const hitHeight = 16;
  const markerX = hoverX;
  const verticalEndY = Number.isFinite(axisY) ? axisY : y1;

  const resolveSvgX = (event) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return Math.min(x2, Math.max(x1, local.x));
  };

  const emitHover = (nextX) => {
    setHoverX(nextX);
    if (typeof onHoverChange === "function") {
      onHoverChange(nextX == null ? null : { x: nextX, y: y1 });
    }
  };

  return (
    <g className="workload-by-assignee__team-avg">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y1}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        pointerEvents="none"
      />
      <rect
        className="workload-by-assignee__team-avg-hit"
        x={x1}
        y={y1 - hitHeight / 2}
        width={Math.max(0, x2 - x1)}
        height={hitHeight}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={(event) => {
          const nextX = resolveSvgX(event);
          if (nextX != null) emitHover(nextX);
        }}
        onMouseMove={(event) => {
          const nextX = resolveSvgX(event);
          if (nextX != null) emitHover(nextX);
        }}
        onMouseLeave={() => emitHover(null)}
      />
      {markerX != null ? (
        <g className="workload-by-assignee__team-avg-guide" pointerEvents="none">
          <line
            x1={markerX}
            y1={y1}
            x2={markerX}
            y2={verticalEndY}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          <circle
            cx={markerX}
            cy={y1}
            r={5}
            fill="#FFFFFF"
            stroke={stroke}
            strokeWidth={1.75}
          />
        </g>
      ) : null}
    </g>
  );
};

/** Captures the pixel Y of domain value 0 (x-axis) for clipping the vertical guide. */
const ZeroAxisProbe = ({ y, onAxisY }) => {
  useEffect(() => {
    if (Number.isFinite(y)) onAxisY(y);
  }, [y, onAxisY]);
  return null;
};

const getWorkloadStatus = (value, average) => {
  if (value > average * 1.15) return "overload";
  if (value < average * 0.85) return "underutilized";
  return "attention";
};

const getWorkloadRowValue = (row, viewMode, selectWorkspaceDashboard) => {
  if (row?.workload != null) {
    return Number(row.workload);
  }
  if (viewMode === "order" && selectWorkspaceDashboard === 1) {
    return Number(row?.order ?? row?.orderCount ?? row?.count ?? row?.value ?? 0);
  }
  return Number(row?.tools ?? row?.taskCount ?? row?.count ?? row?.value ?? 0);
};

const getAssigneeFromRow = (row, index = 0) => {
  const assignee = Array.isArray(row?.assigneeName) ? row.assigneeName[0] : null;
  const id =
    assignee?.regId ??
    assignee?.userId ??
    row?.regId ??
    row?.userId ??
    row?.assigneeId ??
    row?.id ??
    `assignee-${index}`;

  return {
    id: String(id),
    name: assignee?.name ?? row?.name ?? "Unknown",
    photoUrl: assignee?.photo ?? row?.photoUrl ?? row?.photo ?? null,
  };
};

/** Supports API bundle `{ ordersByWorkload, taskByWorkload }` or assignee workload rows. */
const resolveWorkloadRows = (data, viewMode, selectWorkspaceDashboard) => {
  if (!data) return [];

  const bundle = Array.isArray(data)
    ? (data.find((item) => item?.ordersByWorkload || item?.taskByWorkload) ?? data[0])
    : data;

  if (bundle?.ordersByWorkload || bundle?.taskByWorkload) {
    const rows =
      viewMode === "order" && selectWorkspaceDashboard === 1
        ? bundle.ordersByWorkload
        : bundle.taskByWorkload;
    return Array.isArray(rows) ? rows : [];
  }

  if (
    Array.isArray(data) &&
    data.some((row) => row?.workload != null || row?.assigneeName != null)
  ) {
    return data;
  }

  if (Array.isArray(data) && data.some((row) => row?.name != null)) {
    return data;
  }

  return [];
};

const WorkloadAssigneeChart = ({
  chartRows,
  viewMode,
  selectWorkspaceDashboard,
  isPanelExpanded,
}) => {
  const chartRef = useRef(null);
  const teamAvgTooltipRef = useRef(null);
  const gradientScopeId = useId().replace(/:/g, "");
  const [chartWidth, setChartWidth] = useState(0);
  const [axisY, setAxisY] = useState(null);
  const onHoverChangeRef = useRef(null);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      setChartWidth(node.getBoundingClientRect().width || 0);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, [isPanelExpanded, viewMode, chartRows.length]);

  const teamAverage = chartRows[0]?.average ?? 0;
  const chartPeak = Math.max(...chartRows.map((row) => row.value), teamAverage, 1);

  const { ticks: yAxisTicks, domainMax: yDomainMax } = useMemo(
    () => buildWorkloadYAxisScale(chartPeak),
    [chartPeak],
  );

  const assigneeAxisLayout = useMemo(
    () => getAssigneeSlotLayout(chartWidth, chartRows.length, isPanelExpanded),
    [chartWidth, chartRows.length, isPanelExpanded],
  );

  const xAxisHeight = assigneeAxisLayout.tickHeight + 6;
  const chartBottomMargin = assigneeAxisLayout.labelMode === "wrap" ? 76 : 44;

  const renderAssigneeAxisTick = useCallback(
    (props) => (
      <AssigneeAxisTick {...props} assigneeRows={chartRows} {...assigneeAxisLayout} />
    ),
    [chartRows, assigneeAxisLayout],
  );

  const barChartRows = useMemo(
    () =>
      chartRows.map((row) => {
        const safeId = String(row.id).replace(/[^a-zA-Z0-9_-]/g, "_");
        return {
          ...row,
          gradientId: `${gradientScopeId}-grad-${safeId}`,
        };
      }),
    [chartRows, gradientScopeId],
  );

  const renderValueLabel = useCallback((props) => {
    const { x = 0, y = 0, width = 0, value } = props;
    if (value == null) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        className="workload-by-assignee__bar-value"
      >
        {Math.round(Number(value) || 0)}
      </text>
    );
  }, []);

  const handleAxisY = useCallback((nextY) => {
    setAxisY((prev) => (prev === nextY ? prev : nextY));
  }, []);

  const svgPointToContainer = useCallback((svgX, svgY) => {
    const container = chartRef.current;
    const svg = container?.querySelector("svg.recharts-surface");
    if (!container || !svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = svgX;
    point.y = svgY;
    const screen = point.matrixTransform(ctm);
    const rect = container.getBoundingClientRect();
    return {
      x: screen.x - rect.left,
      y: screen.y - rect.top,
    };
  }, []);

  // Imperative tooltip updates — avoid setState so BarChart / labels do not re-render.
  useEffect(() => {
    onHoverChangeRef.current = (point) => {
      const tooltip = teamAvgTooltipRef.current;
      if (!tooltip) return;
      if (!point) {
        tooltip.hidden = true;
        return;
      }
      const next = svgPointToContainer(point.x, point.y);
      if (!next) {
        tooltip.hidden = true;
        return;
      }
      tooltip.hidden = false;
      tooltip.style.left = `${next.x}px`;
      tooltip.style.top = `${next.y}px`;
    };
  }, [svgPointToContainer]);

  const handleTeamAvgHover = useCallback((point) => {
    onHoverChangeRef.current?.(point);
  }, []);

  const renderZeroAxisProbe = useCallback(
    (props) => <ZeroAxisProbe y={props.y1} onAxisY={handleAxisY} />,
    [handleAxisY],
  );

  const renderTeamAverageShape = useCallback(
    (props) => (
      <TeamAverageShape
        {...props}
        axisY={axisY}
        onHoverChange={handleTeamAvgHover}
      />
    ),
    [axisY, handleTeamAvgHover],
  );

  return (
    <div className="workload-by-assignee__chart" ref={chartRef}>
      <ResponsiveContainer width="100%" height={isPanelExpanded ? 420 : 300}>
        <BarChart
          key={`${viewMode}-${chartWidth}-${assigneeAxisLayout.labelMode}`}
          data={barChartRows}
          margin={{ top: 36, right: 12, left: 4, bottom: chartBottomMargin }}
          barCategoryGap={chartRows.length > 5 ? "18%" : "24%"}
        >
          <defs>
            {barChartRows.map((row) => (
              <linearGradient
                key={`defs-${row.id}`}
                id={row.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={row.color} stopOpacity={1} />
                <stop offset="42%" stopColor={row.color} stopOpacity={0.82} />
                <stop offset="100%" stopColor={row.color} stopOpacity={0.06} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="id"
            interval={0}
            height={xAxisHeight}
            padding={
              chartRows.length <= 1 ? { left: 0, right: 0 } : { left: 8, right: 8 }
            }
            tick={renderAssigneeAxisTick}
            axisLine={{ stroke: "#DDDDDD", strokeWidth: 1 }}
            tickLine={false}
          />
          <YAxis
            domain={[0, yDomainMax]}
            ticks={yAxisTicks}
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#DDDDDD", strokeWidth: 1 }}
            tickLine={false}
            allowDecimals={false}
            width={32}
            label={{
              value:
                selectWorkspaceDashboard === 1
                  ? viewMode === "order"
                    ? "Order"
                    : "Tools"
                  : "Tasks",
              position: "top",
              fill: "#64748B",
              fontSize: 12,
              fontWeight: 600,
              offset: 20,
            }}
          />
          <Bar
            dataKey="value"
            shape={<WorkloadBarShape />}
            maxBarSize={isPanelExpanded ? 64 : 36}
            activeBar={false}
            isAnimationActive={false}
          >
            <LabelList dataKey="value" content={renderValueLabel} />
          </Bar>
          <ReferenceLine
            y={0}
            stroke="transparent"
            strokeWidth={0}
            ifOverflow="extendDomain"
            shape={renderZeroAxisProbe}
            label={false}
          />
          {Number.isFinite(teamAverage) && teamAverage > 0 && (
            <ReferenceLine
              y={teamAverage}
              stroke={TEAM_AVERAGE_LINE_COLOR}
              strokeWidth={1.5}
              strokeDasharray="2 2"
              ifOverflow="extendDomain"
              shape={renderTeamAverageShape}
              label={false}
              zIndex={1000}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      <div
        ref={teamAvgTooltipRef}
        className="workload-by-assignee__team-avg-tooltip"
        hidden
      >
        <span className="workload-by-assignee__team-avg-tooltip-label">
          Team Average
        </span>
        <span className="workload-by-assignee__team-avg-tooltip-value">
          {formatTeamAverage(teamAverage)}
        </span>
      </div>
    </div>
  );
};

const WorkloadByAssignee = ({
  loading = false,
  dashboardFormula,
  selectWorkspaceDashboard,
  boardFilter,
  workloadByUsersResponse,
  boardType,
}) => {
  const [viewMode, setViewMode] = useState(
    boardFilter[0]?.key === "mainTask" ? "order" : "tools",
  );
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setViewMode(boardFilter[0]?.key === "mainTask" ? "order" : "tools");
  }, [boardFilter]);

  const workloadData =
    workloadByUsersResponse?.workloadByAssignee ?? workloadByUsersResponse;

  const chartRows = useMemo(() => {
    const rows = resolveWorkloadRows(workloadData, viewMode, selectWorkspaceDashboard);
    const numericValues = rows.map((row) =>
      getWorkloadRowValue(row, viewMode, selectWorkspaceDashboard),
    );
    const average = numericValues.length
      ? Math.round(
          (numericValues.reduce((sum, value) => sum + value, 0) /
            numericValues.length) *
            10,
        ) / 10
      : 0;

    const usedIds = new Set();

    return rows.map((row, index) => {
      const value = numericValues[index];
      const { id: rawId, name, photoUrl } = getAssigneeFromRow(row, index);
      const status = getWorkloadStatus(value, average);

      let id = rawId;
      if (usedIds.has(id)) {
        id = `${rawId}-${index}`;
      }
      usedIds.add(id);

      return {
        id,
        name,
        value,
        status,
        color: getWorkloadBarColor(index),
        statusColor: STATUS_COLORS[status],
        average,
        photoUrl,
      };
    });
  }, [viewMode, workloadData, selectWorkspaceDashboard]);

  const showEmptyState = chartRows?.length === 0;

  return (
    <DashboardExpandablePanel
      className="workload-by-assignee"
      ariaLabel="Workload by assignee"
      expandDisabled={loading}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      showDefaultExpandButton={false}
      header={
        <>
          <div className="workload-by-assignee__head">
            <div className="workload-by-assignee__head-left">
              <div className="workload-by-assignee__head-left-content">
                <h4 className="workload-by-assignee__title">Workload by assignee</h4>
                <p className="workload-by-assignee__subtitle">
                  See how tasks are distributed across your team
                </p>
              </div>
              {!isExpanded && (
                <div className="dashboard-expandable-panel__toolbar">
                  <button
                    type="button"
                    className="board-overdue-health-chart__subtitle-expand"
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsExpanded(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsExpanded(true);
                      }
                    }}
                    disabled={loading || showEmptyState}
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
            {/* {selectWorkspaceDashboard === 1 && (
              <div
                className="workload-by-assignee__toggle"
                role="tablist"
                aria-label="Assignee view"
              >
                {[
                  { id: "tools", label: "Tools" },
                  { id: "order", label: "Orders" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === option.id}
                    className={`workload-by-assignee__toggle-btn${
                      viewMode === option.id ? " is-active" : ""
                    }`}
                    onClick={() => setViewMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )} */}
          </div>

          {/* <div className="workload-by-assignee__legend">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <span key={key} className="workload-by-assignee__legend-item">
                <span
                  className="workload-by-assignee__legend-dot"
                  style={{ backgroundColor: STATUS_COLORS[key] }}
                />
                {label}
              </span>
            ))}
          </div> */}
        </>
      }
    >
      {(isExpanded) =>
        loading ? (
          <div className="board-overdue-health-chart board-overdue-health-chart--loading">
            <div className="board-overdue-health-chart__head">
              <h4 className="board-overdue-health-chart__title">Workload by assignee</h4>
            </div>
            <DashboardChartSkeleton
              variant="bar"
              height={280}
              barCount={6}
              className="board-overdue-health-chart__chart-skeleton"
              ariaLabel={`Loading Workload by assignee`}
            />
          </div>
        ) : showEmptyState ? (
          <div className="workload-by-assignee__empty">No Data Found</div>
        ) : (
          <WorkloadAssigneeChart
            chartRows={chartRows}
            viewMode={viewMode}
            selectWorkspaceDashboard={selectWorkspaceDashboard}
            isPanelExpanded={isExpanded}
          />
        )
      }
    </DashboardExpandablePanel>
  );
};

export default memo(WorkloadByAssignee);

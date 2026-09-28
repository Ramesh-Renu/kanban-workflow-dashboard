import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { boardExpandIcon, closeIcon } from "assets/images/index";
import React, {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Curve,
  Line,
  Rectangle,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS_VALUES, getVelocityRangeParams, hexToRgba } from "utils/dashboard";
import TrendingDown from "../Widget/Icons/TrendingDown";
import TrendingUp from "../Widget/Icons/TrendingUp";
import DashboardCountCard from "../DashboardCountCard";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";
import SkeletonLoading from "components/common/SkeletonLoading";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/** Overdue % / Overdue count line colors from Figma. */
const OVERDUE_PERCENT_LINE = "#00ADF0";
const OVERDUE_COUNT_LINE = "#E11D48";
/** Created series stays fixed; other task-flow colors map to workspace health master. */
const CREATED_LINE = "#3B82F6";
const TASK_FLOW_SERIES_COLOR_FALLBACKS = {
  completed: "#12B981",
  active: "#F59E0B",
  overdue: "#EF4444",
};

/** completed → Healthy, active → Needs Attention, overdue → At Risk */
const getTaskFlowSeriesColors = (dashboardMaterValue) => {
  const theme = COLORS_VALUES(dashboardMaterValue);
  return {
    completed: theme.healthy || TASK_FLOW_SERIES_COLOR_FALLBACKS.completed,
    active: theme.needsAttention || TASK_FLOW_SERIES_COLOR_FALLBACKS.active,
    overdue: theme.atRisk || TASK_FLOW_SERIES_COLOR_FALLBACKS.overdue,
  };
};
const CHART_TICK_COLOR = "#6D6E78";
const CHART_GRID_COLOR = "#DDDDDD";
const CHART_GRID_STROKE_WIDTH = 1;
const CHART_GRID_STROKE_DASH = "1 2";
const TASK_FLOW_LINE_STROKE_DASH = "4 3";
/** Health Status bars use solid, brighter fills (no translucent wash) */
const HEALTH_STATUS_BAR_OPACITY_ACTIVE = 1;
const HEALTH_STATUS_BAR_OPACITY_MUTED = 0.6;
const CHART_ANIMATION_DURATION_MS = 1400;
const CHART_ANIMATION_EASING = "ease-out";
/** Bounded smoothing prevents task-flow curves from exceeding axis min/max values. */
const TASK_FLOW_BOUNDED_CURVE = "monotone";
const LEFT_AXIS_TICKS = [0, 20, 40, 60, 80, 100];
const getOrdinalSuffix = (day) => {
  const value = Number(day) || 0;
  if (value % 100 >= 11 && value % 100 <= 13) return "th";
  if (value % 10 === 1) return "st";
  if (value % 10 === 2) return "nd";
  if (value % 10 === 3) return "rd";
  return "th";
};

const getChartRowDate = (row) => {
  if (!row) return null;
  if (row.dateFrom) {
    const fromApi = dayjs(row.dateFrom);
    if (fromApi.isValid()) return fromApi;
  }
  if (row.key) {
    const fromKey = dayjs(
      row.key,
      ["YYYY-MM-DD", "MMM DD, YYYY", "MMM DD", "MMM D"],
      true,
    );
    if (fromKey.isValid()) return fromKey;
    const fallback = dayjs(row.key);
    if (fallback.isValid()) return fallback;
  }
  return null;
};

const getChartPlotMargins = (isTaskFlowMode, bottom) => ({
  top: 10,
  right: isTaskFlowMode ? 20 : 6,
  bottom,
  left: 0,
});

/**
 * Category Axis points sit at band centers. Shift first/last x so the line and
 * fill start at the first bar's left edge and end at the last bar's right edge.
 * `edgeOffset` defaults to half a category band when omitted / invalid.
 */
const extendPointsToBarEdges = (points, edgeOffset) => {
  if (!Array.isArray(points) || points.length < 2) return points;

  let halfBand = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (
      prev &&
      next &&
      Number.isFinite(prev.x) &&
      Number.isFinite(next.x) &&
      prev.x !== next.x
    ) {
      halfBand = Math.abs(next.x - prev.x) / 2;
      break;
    }
  }

  let half = Number(edgeOffset);
  if (!(half > 0)) half = halfBand;
  else if (halfBand > 0) half = Math.min(half, halfBand);
  if (!(half > 0)) return points;

  const lastIndex = points.length - 1;
  return points.map((point, index) => {
    if (!point || !Number.isFinite(point.x)) return point;
    if (index === 0) return { ...point, x: point.x - half };
    if (index === lastIndex) return { ...point, x: point.x + half };
    return point;
  });
};

const extendAreaBaselineToBarEdges = (baseLine, points, edgeOffset) => {
  if (!Array.isArray(baseLine) || !Array.isArray(points) || points.length < 2) {
    return baseLine;
  }
  const paired = baseLine.map((entry, index) => ({
    x: Number.isFinite(entry?.x) ? entry.x : points[index]?.x,
    y: entry?.y,
  }));
  const extended = extendPointsToBarEdges(paired, edgeOffset);
  return baseLine.map((entry, index) => ({
    ...entry,
    x: extended[index]?.x ?? entry?.x,
  }));
};

const createEdgeToEdgeAreaShape = (edgeOffset) => (props) => {
  const { points, baseLine, type = "monotone", ...rest } = props;
  if (!points || points.length < 2) return null;
  return (
    <Curve
      {...rest}
      type={type}
      points={extendPointsToBarEdges(points, edgeOffset)}
      baseLine={extendAreaBaselineToBarEdges(baseLine, points, edgeOffset)}
    />
  );
};

const createEdgeToEdgeLineShape = (edgeOffset) => (props) => {
  const { points, type = "monotone", ...rest } = props;
  if (!points || points.length < 2) return null;
  return (
    <Curve {...rest} type={type} points={extendPointsToBarEdges(points, edgeOffset)} />
  );
};

const getGroupedBarCenterOffset = (seriesKey, barKeys, barSize, barGap) => {
  const barIndex = barKeys.indexOf(seriesKey);
  if (barIndex < 0) return 0;
  if (barKeys.length <= 1) return 0;
  return (barIndex - (barKeys.length - 1) / 2) * (barSize + barGap);
};

const getSeriesColumnXOffset = (seriesKey, groupKeys, barSize, barGap) =>
  getGroupedBarCenterOffset(seriesKey, groupKeys, barSize, barGap);

const shiftPointsBySeriesColumnOffset = (
  points,
  seriesKey,
  groupKeys,
  barSize,
  barGap,
) => {
  if (!Array.isArray(points)) return points;
  const offset = getSeriesColumnXOffset(seriesKey, groupKeys, barSize, barGap);
  if (!offset) return points;
  return points.map((point) => {
    if (!point || !Number.isFinite(point.x)) return point;
    return { ...point, x: point.x + offset };
  });
};

/**
 * Pixel y of value 0 on the plot (SVG bottom of the band).
 * Line shape props keep `height` but strip `top`, so never rely on top alone.
 */
const getPlotAxisZeroY = (props, domainMax) => {
  const samples = (Array.isArray(props?.points) ? props.points : []).filter(
    (point) => point && Number.isFinite(point.y) && Number.isFinite(Number(point.value)),
  );

  // Two distinct values → recover the linear y-scale intercept at value 0.
  for (let i = 0; i < samples.length; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      const v1 = Number(samples[i].value);
      const v2 = Number(samples[j].value);
      if (v1 === v2) continue;
      const zeroY = samples[i].y + ((samples[i].y - samples[j].y) / (v2 - v1)) * v1;
      if (Number.isFinite(zeroY)) return zeroY;
    }
  }

  const zeroYs = samples
    .filter((point) => Number(point.value) <= 0)
    .map((point) => point.y);
  if (zeroYs.length) return Math.max(...zeroYs);

  // Flat non-zero series: y(0) = y(v) + height * (v / domainMax).
  const height = Number(props?.height);
  const max = Number(domainMax);
  if (samples.length && Number.isFinite(height) && height > 0 && max > 0) {
    const value = Number(samples[0].value);
    return samples[0].y + (value / max) * height;
  }

  const top = Number(props?.top);
  if (Number.isFinite(top) && Number.isFinite(height)) return top + height;

  return null;
};

const createAdaptiveTaskFlowAreaShape =
  (seriesKey, groupKeys, barSize, barGap) => (props) => {
    const { points, baseLine, type = "linear", ...rest } = props;
    if (!points || points.length < 2) return null;

    const shiftedPoints = shiftPointsBySeriesColumnOffset(
      points,
      seriesKey,
      groupKeys,
      barSize,
      barGap,
    );

    const baselineY = Array.isArray(baseLine) ? null : Number(baseLine);
    const shiftedBaseline = shiftedPoints.map((point, index) => ({
      x: point.x,
      y: Array.isArray(baseLine)
        ? (baseLine[index]?.y ?? baselineY ?? point.y)
        : Number.isFinite(baselineY)
          ? baselineY
          : point.y,
    }));

    return (
      <Curve
        {...rest}
        type={TASK_FLOW_BOUNDED_CURVE}
        points={shiftedPoints}
        baseLine={shiftedBaseline}
        stroke="none"
      />
    );
  };

/** Recharts 3 ignores Area `shape`; bind fill onto Line so Curve aligns with bar columns. */
const bindTaskFlowAreaFillShape = (areaShape, fill, domainMax) => (props) => {
  const axisZeroY = getPlotAxisZeroY(props, domainMax);
  // Never fall back to 0 — that is the SVG top and inverts the mountain.
  if (!Number.isFinite(axisZeroY)) return null;
  return areaShape({
    ...props,
    baseLine: axisZeroY,
    fill,
    fillOpacity: 1,
    stroke: "none",
  });
};

const createAdaptiveTaskFlowLineShape =
  (seriesKey, groupKeys, barSize, barGap) => (props) => {
    const { points, ...rest } = props;
    if (!points || points.length < 2) return null;

    return (
      <Curve
        {...rest}
        type={TASK_FLOW_BOUNDED_CURVE}
        points={shiftPointsBySeriesColumnOffset(
          points,
          seriesKey,
          groupKeys,
          barSize,
          barGap,
        )}
        fill="none"
      />
    );
  };

/** Clip only the part of a zero-value line stroke that falls below the X-axis. */
const createBottomClippedTaskFlowLineShape =
  (seriesKey, clipId, groupKeys, barSize, barGap) => (props) => {
    const { points, type = TASK_FLOW_BOUNDED_CURVE, ...rest } = props;
    if (!points || points.length < 2) return null;

    const shiftedPoints = shiftPointsBySeriesColumnOffset(
      points,
      seriesKey,
      groupKeys,
      barSize,
      barGap,
    );

    const zeroPointYs = points
      .filter((point) => (Number(point?.payload?.[seriesKey]) || 0) <= 0)
      .map((point) => point?.y)
      .filter(Number.isFinite);
    const zeroY = zeroPointYs.length ? Math.max(...zeroPointYs) : null;

    return (
      <>
        {Number.isFinite(zeroY) && (
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <rect x={-1000000} y={-1000000} width={2000000} height={1000000 + zeroY} />
            </clipPath>
          </defs>
        )}
        <Curve
          {...rest}
          type={type}
          points={shiftedPoints}
          fill="none"
          clipPath={Number.isFinite(zeroY) ? `url(#${clipId})` : undefined}
        />
      </>
    );
  };

/**
 * Keep each bar in its fixed slot within the full visible key list so bars stay
 * under their line/area when other series are toggled off.
 */
const createAdaptiveGroupBarShape =
  (seriesKey, groupKeys, lineKeys, barGap, getOpacity) => (props) => {
    const { x, y, width, height, payload, fill, radius } = props;
    const value = Number(payload?.[seriesKey]) || 0;

    if (value <= 0 || !Number.isFinite(height) || height <= 0) {
      return null;
    }

    if (!groupKeys.includes(seriesKey)) {
      return null;
    }

    const opacity =
      typeof getOpacity === "function"
        ? getOpacity(payload)
        : HEALTH_STATUS_BAR_OPACITY_ACTIVE;

    return (
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        radius={radius}
        fill={fill}
        opacity={opacity}
      />
    );
  };

/** Months in the selected workspace filter stay full opacity; others are muted. */
const getHealthStatusBarHighlightRange = (selectedRange, getSelectedDate) => {
  const rangeType = Array.isArray(selectedRange)
    ? selectedRange[0]?.value
    : selectedRange;

  if (!rangeType) return null;

  if (rangeType === "CUSTOM_RANGE") {
    const start = dayjs(getSelectedDate?.start || getSelectedDate?.from);
    const end = dayjs(getSelectedDate?.end || getSelectedDate?.to);
    if (!start.isValid() || !end.isValid()) return null;
    return start.isBefore(end) || start.isSame(end, "month")
      ? { from: start.startOf("month"), to: end.endOf("month") }
      : { from: end.startOf("month"), to: start.endOf("month") };
  }

  const params = getVelocityRangeParams(rangeType, "graph");
  if (!params) return null;

  const start = dayjs(params.compareWithMonth);
  const end = dayjs(params.compareThisMonth);
  if (!start.isValid() || !end.isValid()) return null;

  return start.isBefore(end) || start.isSame(end, "month")
    ? { from: start.startOf("month"), to: end.endOf("month") }
    : { from: end.startOf("month"), to: start.endOf("month") };
};

const getChartPlotInset = (isTaskFlowMode) => ({
  left: isTaskFlowMode ? 52 : 44,
  right: isTaskFlowMode ? 20 : 6,
});

const getPlotPointerPosition = (reactEvent, chartWrap, chartPlotInset) => {
  if (!reactEvent || !chartWrap) return null;

  const { left: plotLeft, right: plotRight } = chartPlotInset;
  const rect = chartWrap.getBoundingClientRect();
  const plotWidth = Math.max(rect.width - plotLeft - plotRight, 1);
  const plotX = reactEvent.clientX - rect.left - plotLeft;

  if (plotX < 0 || plotX > plotWidth) {
    return null;
  }

  return { plotX, plotWidth, plotLeft, rect };
};

const getXAxisTickLabel = (tickValues, index) => {
  const date = getChartRowDate({ key: tickValues[index] });
  return date ? date.format("MMM DD") : String(tickValues[index] ?? "");
};

const dedupeVisibleXAxisLabelIndices = (indices, tickValues) => {
  if (!tickValues.length) return indices;

  const lastIndex = tickValues.length - 1;
  const labelToIndex = new Map();

  for (const idx of [...indices].sort((a, b) => a - b)) {
    const label = getXAxisTickLabel(tickValues, idx);
    const existing = labelToIndex.get(label);
    if (existing == null) {
      labelToIndex.set(label, idx);
      continue;
    }

    const keepIdx =
      idx === 0 || idx === lastIndex
        ? idx
        : existing === 0 || existing === lastIndex
          ? existing
          : Math.max(existing, idx);
    labelToIndex.set(label, keepIdx);
  }

  return new Set(labelToIndex.values());
};

const TARGET_X_AXIS_LABELS = 8;

/** How often to render a visible X-axis label (grid still draws at every tick). */
const getXAxisLabelStep = (tickCount) => {
  if (tickCount <= TARGET_X_AXIS_LABELS) return 1;
  return Math.max(2, Math.ceil(tickCount / TARGET_X_AXIS_LABELS));
};

const resolveXAxisTickIndex = ({ index, payload }, tickValues) => {
  if (Number.isFinite(index) && index >= 0) return index;
  const payloadIndex = payload?.index;
  if (Number.isFinite(payloadIndex) && payloadIndex >= 0) return payloadIndex;
  const value = payload?.value;
  if (value == null || !tickValues?.length) return -1;
  return tickValues.indexOf(value);
};

/** First/last labels always show; spaced middle labels; fill oversized gaps with one midpoint. */
const getVisibleXAxisLabelIndices = (tickCount, labelStep, tickValues = []) => {
  if (tickCount <= 0) return new Set();
  if (tickCount === 1) return new Set([0]);
  if (labelStep <= 1) {
    return new Set(Array.from({ length: tickCount }, (_, i) => i));
  }

  const lastIndex = tickCount - 1;
  const minGap = labelStep + 1;
  const maxGap = labelStep * 2;
  const indices = new Set([0, lastIndex]);

  for (let i = labelStep; i < lastIndex; i += labelStep) {
    if (i >= minGap && lastIndex - i >= minGap) {
      indices.add(i);
    }
  }

  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end - start < maxGap) continue;

    const filler = Math.round((start + end) / 2);
    if (filler <= start || filler >= end) continue;

    const fillerLabel = getXAxisTickLabel(tickValues, filler);
    const startLabel = getXAxisTickLabel(tickValues, start);
    const endLabel = getXAxisTickLabel(tickValues, end);
    if (fillerLabel && fillerLabel !== startLabel && fillerLabel !== endLabel) {
      indices.add(filler);
    }
  }

  return dedupeVisibleXAxisLabelIndices(indices, tickValues);
};

const ChartXAxisTick = ({
  x,
  y,
  payload,
  showYear,
  index,
  tickValues = [],
  visibleLabelIndices,
  tickCount = 0,
  showAllDates = false,
  slantLabels = false,
}) => {
  const tickIndex = resolveXAxisTickIndex({ index, payload }, tickValues);
  if (!visibleLabelIndices?.has(tickIndex)) {
    return null;
  }

  const date = getChartRowDate({ key: payload?.value });
  const label = date ? date.format("MMM DD") : payload?.value;
  const useSlant = slantLabels;
  // Always center on the category tick so labels stay under bar groups.
  const textAnchor = "middle";
  const tickStyle = {
    fill: CHART_TICK_COLOR,
    fontSize: showAllDates ? 12 : useSlant ? 11 : 12,
    fontWeight: 500,
  };
  const tickTransform = useSlant ? `rotate(-20, ${x}, ${y})` : undefined;

  if (!showYear || !date) {
    return (
      <text
        x={x}
        y={y}
        dy={useSlant ? 10 : 14}
        dx={0}
        textAnchor={textAnchor}
        transform={tickTransform}
        {...tickStyle}
      >
        {label}
      </text>
    );
  }

  return (
    <g transform={`translate(${x},${y})${useSlant ? " rotate(-20)" : ""}`}>
      <text x={0} y={0} dy={12} textAnchor={textAnchor} {...tickStyle}>
        {label}
      </text>
      <text x={0} y={0} dy={26} textAnchor={textAnchor} {...tickStyle}>
        {date.format("YYYY")}
      </text>
    </g>
  );
};

/** Recharts category axis needs unique keys (e.g. avoid duplicate "May 01" across years). */
const normalizeChartRowKeys = (rows) =>
  (rows || []).map((row) => {
    const date = getChartRowDate(row);
    if (!date) return row;
    return {
      ...row,
      key: date.format("YYYY-MM-DD"),
    };
  });

const ZONE_LABELS = {
  healthy: "Healthy",
  needs: "Needs Attention",
  risk: "At Risk",
};

const STATUS_BY_KEY = {
  healthy: ["healthy"],
  needs: ["needs-attention", "needs_attention", "needsattention"],
  risk: ["at-risk", "at_risk", "atrisk"],
};

const normalizeLabel = (label) => (label || "").toLowerCase().replaceAll(" ", "");

const getRangeValue = (range, key, fallback) => {
  const value = Number(range?.[key]);
  return Number.isFinite(value) ? value : fallback;
};

const buildRightAxisScale = (maxValue) => {
  const safeMax = Number(maxValue);
  if (!Number.isFinite(safeMax) || safeMax <= 0) {
    return { domainMax: 4, ticks: [0, 1, 2, 3, 4] };
  }
  const stepEstimate = safeMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(stepEstimate));
  const normalizedStep = stepEstimate / magnitude;
  const stepMultiplier =
    normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  const step = stepMultiplier * magnitude;
  const domainMax = step * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => index * step);

  return { domainMax, ticks };
};

const deriveOverdueRanges = (dashboardMaterValue = []) => {
  const findByAliases = (aliases) =>
    dashboardMaterValue.find((item) => aliases.includes(normalizeLabel(item?.label)));

  const healthy = findByAliases(STATUS_BY_KEY.healthy);
  const needs = findByAliases(STATUS_BY_KEY.needs);
  const risk = findByAliases(STATUS_BY_KEY.risk);
  return {
    healthy: {
      min: getRangeValue(healthy?.overduePercentageRange, "min", 0),
      max: getRangeValue(healthy?.overduePercentageRange, "max", 20),
    },
    needs: {
      min: getRangeValue(needs?.overduePercentageRange, "min", 20),
      max: getRangeValue(needs?.overduePercentageRange, "max", 30),
    },
    risk: {
      min: getRangeValue(risk?.overduePercentageRange, "min", 30),
      max: getRangeValue(risk?.overduePercentageRange, "max", 100),
    },
  };
};

export const aggregateBoardOverdueSeries = (days) => {
  if (!Array.isArray(days) || days.length === 0) return [];
  return days.map((day) => {
    const overduePercent = getNumericValue(
      day?.percentage,
      day?.overdueTasks?.percentage,
      day?.overduePercent,
    );
    const overdueCount = getNumericValue(day?.overdueTasks, day?.overdueCount);
    const trend =
      (typeof day?.trend === "string" ? day.trend : null) ||
      (typeof day?.overdueTasks?.trend === "string" ? day.overdueTasks.trend : null) ||
      "Ideal";

    return {
      key: day.key,
      dateFrom: day.dateFrom,
      dateTo: day.dateTo,
      overduePercent,
      overdueCount,
      trend,
    };
  });
};

const getNumericValue = (...values) => {
  const normalizedValues = values.map((value) => {
    if (value && typeof value === "object") {
      return value.count ?? value.value ?? value.total ?? value.percentage;
    }
    return value;
  });
  const valid = normalizedValues.find((value) => Number.isFinite(Number(value)));
  return Number(valid) || 0;
};

export const aggregateTaskFlowSeries = (days, viewMode) => {
  if (!Array.isArray(days) || days.length === 0) return [];

  return days.map((day) => {
    const created = getNumericValue(
      viewMode === "count" ? day?.createdTasks?.count : day?.createdTasks?.percentage,
    );
    const active = getNumericValue(
      viewMode === "count" ? day?.activeTasks?.count : day?.activeTasks?.percentage,
    );
    const completed = getNumericValue(
      viewMode === "count" ? day?.completedTasks?.count : day?.completedTasks?.percentage,
    );
    const overdue = getNumericValue(
      viewMode === "count" ? day?.overdueTasks?.count : day?.overdueTasks?.percentage,
    );

    return {
      key: day.key,
      dateFrom: day.dateFrom,
      dateTo: day.dateTo,
      created,
      active,
      completed,
      overdue,
      trend: day?.completedTasks?.trend ? day?.completedTasks?.trend : "Ideal",
      completedTasksPercent: day?.completedTasks?.percentage
        ? Number(day?.completedTasks?.percentage)
        : 0,
    };
  });
};

const TooltipDateTitle = ({ row, showYear }) => {
  const from = row?.dateFrom ? dayjs(row.dateFrom) : null;
  const to = row?.dateTo ? dayjs(row.dateTo) : null;
  const hasValidRange = from?.isValid?.() && to?.isValid?.();
  const date = hasValidRange ? from : getChartRowDate(row);

  if (!date) return null;

  if (!hasValidRange || from.isSame(to, "day")) {
    const dayNumber = date.format("D");
    const formattedDate = `${date.format("dddd, MMM D")}${getOrdinalSuffix(dayNumber)}`;

    if (!showYear) {
      return <p className="board-overdue-health-chart__tooltip-title">{formattedDate}</p>;
    }

    return (
      <p className="board-overdue-health-chart__tooltip-title">
        {formattedDate}
        <br />
        {date.format("YYYY")}
      </p>
    );
  }

  const sameYear = from.isSame(to, "year");
  const sameMonth = from.isSame(to, "month");
  const rangeLabel = sameMonth
    ? `${from.format("MMM DD")} - ${to.format("MMM DD")}`
    : `${from.format("MMM DD")} - ${to.format("MMM DD")}`;
  const yearLabel = sameYear
    ? from.format("YYYY")
    : `${from.format("YYYY")} - ${to.format("YYYY")}`;

  if (!showYear && sameYear) {
    return <p className="board-overdue-health-chart__tooltip-title">{rangeLabel}</p>;
  }

  return (
    <p className="board-overdue-health-chart__tooltip-title">
      {rangeLabel}
      <br />
      {yearLabel}
    </p>
  );
};

const OverdueTooltip = ({
  active,
  payload,
  countLineColor,
  showYear = false,
  seriesVisibility = { overduePercent: true, overdueCount: true },
}) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className={`board-overdue-health-chart__tooltip`}>
      <TooltipDateTitle row={row} showYear={showYear} />
      {seriesVisibility.overduePercent && (
        <div className="board-overdue-health-chart__tooltip-row">
          <span
            className="board-overdue-health-chart__tooltip-swatch"
            style={{ background: OVERDUE_PERCENT_LINE }}
          />
          <span className="board-overdue-health-chart__tooltip-value">Overdue %</span>
          <span className="board-overdue-health-chart__tooltip-status">
            {Number(row.overduePercent) || 0}%
          </span>
        </div>
      )}
      {seriesVisibility.overdueCount && (
        <div className="board-overdue-health-chart__tooltip-row">
          <span
            className="board-overdue-health-chart__tooltip-swatch"
            style={{ background: countLineColor }}
          />
          <span className="board-overdue-health-chart__tooltip-value">Overdue Count</span>
          <span className="board-overdue-health-chart__tooltip-count">
            {row.overdueCount ?? 0}
          </span>
        </div>
      )}
    </div>
  );
};

const TaskFlowTooltip = ({
  active,
  payload,
  viewMode = "count",
  showYear = false,
  seriesVisibility = {
    created: true,
    active: true,
    completed: true,
    overdue: false,
  },
  activeColor = TASK_FLOW_SERIES_COLOR_FALLBACKS.active,
  completedColor = TASK_FLOW_SERIES_COLOR_FALLBACKS.completed,
  overdueColor = TASK_FLOW_SERIES_COLOR_FALLBACKS.overdue,
  isTaskDueStatusMode = false,
  isHealthStatusMode = false,
}) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;
  const isPercentageMode = viewMode === "percentage";
  const formatValue = (value) => {
    const numeric = Number(value) || 0;
    return isPercentageMode ? `${numeric}%` : numeric;
  };
  const showOverdue =
    seriesVisibility.overdue && (isTaskDueStatusMode || isHealthStatusMode);
  const activeLabel = isHealthStatusMode ? "Needs Attention" : "Active";
  const completedLabel = isHealthStatusMode ? "Healthy" : "Completed";
  const overdueLabel = isHealthStatusMode ? "At Risk" : "Overdue";

  const createdRow = seriesVisibility.created &&
    !isHealthStatusMode && {
      key: "created",
      label: "Created",
      color: CREATED_LINE,
      value: row.created,
    };
  const activeRow = seriesVisibility.active && {
    key: "active",
    label: activeLabel,
    color: activeColor,
    value: row.active,
  };
  const completedRow = seriesVisibility.completed && {
    key: "completed",
    label: completedLabel,
    color: completedColor,
    value: row.completed,
  };
  const overdueRow = showOverdue && {
    key: "overdue",
    label: overdueLabel,
    color: overdueColor,
    value: row.overdue,
  };

  // Health tooltip order: At Risk → Needs Attention → Healthy
  const tooltipRows = (
    isHealthStatusMode
      ? [overdueRow, activeRow, completedRow]
      : [createdRow, activeRow, completedRow, overdueRow]
  ).filter(Boolean);

  return (
    <div className={`board-overdue-health-chart__tooltip`}>
      <TooltipDateTitle row={row} showYear={showYear} />
      {tooltipRows.map((item) => (
        <div key={item.key} className="board-overdue-health-chart__tooltip-row">
          <span
            className="board-overdue-health-chart__legend-bar board-overdue-health-chart__legend-bar--solid board-overdue-health-chart__tooltip-swatch"
            style={{
              backgroundColor: item.color,
              borderColor: item.color,
            }}
          />
          <span className="board-overdue-health-chart__tooltip-value">{item.label}</span>
          <span className="board-overdue-health-chart__tooltip-count">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CHART_HEIGHT = 300;
const CHART_EXPANDED_HEIGHT = 460;
const EMPTY_CHART_FOCUS = { index: -1, x: null, y: null, clientX: null, clientY: null };
const TASK_FLOW_BAR_SIZE_COLLAPSED = 30;
const TASK_FLOW_BAR_SIZE_EXPANDED = 60;
const TASK_FLOW_BAR_GAP_COLLAPSED = 2;
const TASK_FLOW_BAR_GAP_EXPANDED = 4;
const CHART_LINE_DOT_RADIUS = 3;
const CHART_LINE_DOT_ACTIVE_RADIUS = 4;
const CHART_LINE_DOT_STROKE_WIDTH = 1.5;

const ChartOpenCircleDot = ({ cx, cy, stroke, r = CHART_LINE_DOT_RADIUS }) => {
  if (cx == null || cy == null || !stroke) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="#fff"
      stroke={stroke}
      strokeWidth={CHART_LINE_DOT_STROKE_WIDTH}
      style={{ cursor: "pointer" }}
    />
  );
};

const TaskFlowLegendBarIcon = ({ color }) => (
  <span
    className="board-overdue-health-chart__legend-bar board-overdue-health-chart__legend-bar--solid"
    style={{ backgroundColor: color, borderColor: color }}
    aria-hidden
  />
);

const TaskFlowLegendLineIcon = ({ color, dashed = false }) => (
  <svg
    width="22"
    height="10"
    className="board-overdue-health-chart__legend-line"
    aria-hidden
  >
    <line
      x1="0"
      y1="5"
      x2="22"
      y2="5"
      stroke={color}
      strokeWidth="2"
      strokeDasharray={dashed ? TASK_FLOW_LINE_STROKE_DASH : undefined}
    />
    <circle cx="11" cy="5" r="2.5" fill="#fff" stroke={color} strokeWidth="1.5" />
  </svg>
);

const createTaskFlowSeriesVisibility = (overrides = {}) => ({
  created: { bar: false, line: false },
  active: { bar: true, line: false },
  completed: { bar: true, line: false },
  overdue: { bar: true, line: false },
  ...overrides,
});

const TASK_FLOW_SERIES_KEYS = ["created", "active", "completed", "overdue"];

const getHighestTaskFlowSeriesKey = ({
  rows = [],
  showCreatedTask = false,
  includeOverdue = false,
} = {}) => {
  const eligibleKeys = ["completed", "active"];
  if (showCreatedTask) eligibleKeys.unshift("created");
  if (includeOverdue) eligibleKeys.push("overdue");

  if (!rows.length) return eligibleKeys[0] || "completed";

  const latest = rows[rows.length - 1];
  let highestKey = eligibleKeys[0];
  let highestValue = Number(latest?.[highestKey]) || 0;

  for (let index = 1; index < eligibleKeys.length; index += 1) {
    const key = eligibleKeys[index];
    const value = Number(latest?.[key]) || 0;
    if (value > highestValue) {
      highestValue = value;
      highestKey = key;
    }
  }

  return highestKey;
};

const buildTaskFlowSeriesVisibility = ({
  isTaskDueStatusMode = false,
  isHealthStatusMode = false,
  showCreatedTask = false,
  highestSeriesKey = "completed",
} = {}) => {
  const includeOverdue = isTaskDueStatusMode || isHealthStatusMode;
  const visibility = createTaskFlowSeriesVisibility({
    created: showCreatedTask ? { bar: true, line: false } : { bar: false, line: false },
    overdue: includeOverdue ? { bar: true, line: false } : { bar: false, line: false },
  });

  const lineKey = TASK_FLOW_SERIES_KEYS.includes(highestSeriesKey)
    ? highestSeriesKey
    : "completed";

  if (visibility[lineKey]) {
    visibility[lineKey] = { ...visibility[lineKey], line: true };
  }

  return visibility;
};

const isTaskFlowLayerOn = (visibility, seriesKey, layer) =>
  Boolean(visibility?.[seriesKey]?.[layer]);

const getVisibleTaskFlowBarKeys = ({
  taskFlowSeriesVisibility,
  showCreatedTask = false,
  includeOverdue = false,
  rows = [],
}) => {
  const keys = [];
  if (showCreatedTask && isTaskFlowLayerOn(taskFlowSeriesVisibility, "created", "bar")) {
    keys.push("created");
  }
  if (isTaskFlowLayerOn(taskFlowSeriesVisibility, "completed", "bar")) {
    keys.push("completed");
  }
  if (isTaskFlowLayerOn(taskFlowSeriesVisibility, "active", "bar")) {
    keys.push("active");
  }
  if (includeOverdue && isTaskFlowLayerOn(taskFlowSeriesVisibility, "overdue", "bar")) {
    keys.push("overdue");
  }

  // Drop all-zero series so they do not consume bar slots and push real bars
  // off the category tick (labels stay centered on the tick).
  if (!rows.length) return keys;
  return keys.filter((key) => rows.some((row) => (Number(row?.[key]) || 0) > 0));
};

const isTaskFlowSeriesOn = (visibility, seriesKey) =>
  isTaskFlowLayerOn(visibility, seriesKey, "bar") ||
  isTaskFlowLayerOn(visibility, seriesKey, "line");

const TaskFlowLegendItem = ({
  label,
  color,
  dashed = false,
  barVisible = true,
  lineVisible = true,
  onToggleBar,
  onToggleLine,
}) => (
  <div className="board-overdue-health-chart__legend-item board-overdue-health-chart__legend-item--combo">
    <button
      type="button"
      className={`board-overdue-health-chart__legend-toggle${
        barVisible ? "" : " is-off"
      }`}
      aria-pressed={barVisible}
      title={`${barVisible ? "Hide" : "Show"} ${label} bars`}
      onClick={onToggleBar}
    >
      <TaskFlowLegendBarIcon color={color} />
    </button>
    <button
      type="button"
      className={`board-overdue-health-chart__legend-toggle${
        lineVisible ? "" : " is-off"
      }`}
      aria-pressed={lineVisible}
      title={`${lineVisible ? "Hide" : "Show"} ${label} line`}
      onClick={onToggleLine}
    >
      <TaskFlowLegendLineIcon color={color} dashed={dashed} />
    </button>
    <span className="board-overdue-health-chart__legend-label">{label}</span>
  </div>
);

const BoardOverdueHealthChart = ({
  data = [],
  apiLoading = false,
  dashboardMaterValue = [],
  type = [],
  selectedRange = "LAST_7_DAYS",
  getSelectedDate = null,
  healthLabel,
  boardFilter = [],
  showCreatedTask = false,
  countCards = [],
  taskFlowMode = false,
  /** Workspace Health Status velocity (healthy / needsAttention / atRisk) */
  healthStatusMode = false,
  subTitle = "",
  getChartHeight = CHART_HEIGHT,
}) => {
  const chartWrapRef = useRef(null);
  const expandedShellRef = useRef(null);
  const tooltipDataLengthRef = useRef(0);
  const outsideClickPulseTimerRef = useRef(null);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isOutsideClickPulseActive, setIsOutsideClickPulseActive] = useState(false);
  const [chartFocus, setChartFocus] = useState(EMPTY_CHART_FOCUS);
  const isTaskFlowMode = taskFlowMode || type[0]?.filter_id === 23;
  const isTaskDueStatusMode = boardFilter[0]?.key === "subTask";
  const isHealthStatusMode = Boolean(healthStatusMode);
  const theme = useMemo(() => COLORS_VALUES(dashboardMaterValue), [dashboardMaterValue]);
  const [taskFlowSeriesVisibility, setTaskFlowSeriesVisibility] = useState(() =>
    buildTaskFlowSeriesVisibility(),
  );

  const [overdueSeriesVisibility, setOverdueSeriesVisibility] = useState({
    overduePercent: true,
    overdueCount: true,
  });
  const [taskFlowChartDisplay, setTaskFlowChartDisplay] = useState({
    showGrid: true,
    showDots: true,
  });
  const [viewMode, setViewMode] = useState(isHealthStatusMode ? "percentage" : "count");

  useEffect(() => {
    if (isHealthStatusMode) {
      setViewMode("percentage");
    }
  }, [isHealthStatusMode]);
  const overdueRanges = useMemo(
    () => deriveOverdueRanges(dashboardMaterValue),
    [dashboardMaterValue],
  );
  const breathingRoomPercentageRange = useMemo(() => {
    const findByAliases = (aliases) =>
      (dashboardMaterValue || []).find((item) =>
        aliases.includes(normalizeLabel(item?.label)),
      );

    const keyMap = {
      healthy: STATUS_BY_KEY.healthy,
      needs: STATUS_BY_KEY.needs,
      risk: STATUS_BY_KEY.risk,
    };

    return Object.entries(keyMap).reduce((acc, [fixedKey, aliases]) => {
      const matched = findByAliases(aliases);
      const value = Number(matched?.breathingRoomPercentageRange);
      acc[fixedKey] = Number.isFinite(value) ? value : 0;
      return acc;
    }, {});
  }, [dashboardMaterValue]);

  const legendBands = useMemo(
    () => ({
      healthy: theme.healthy,
      needs: theme.needsAttention,
      risk: theme.atRisk,
    }),
    [theme],
  );
  const taskFlowLineColors = useMemo(
    () => getTaskFlowSeriesColors(dashboardMaterValue),
    [dashboardMaterValue],
  );

  // When the mountain/line is on, keep bars translucent so the fade under the
  // line stays visible (solid bars were covering the gradient at peaks).
  const getTaskFlowBarFill = useCallback(
    (color, seriesKey) => {
      const lineOn = isTaskFlowLayerOn(taskFlowSeriesVisibility, seriesKey, "line");
      return lineOn ? hexToRgba(color, 0.22) : color;
    },
    [taskFlowSeriesVisibility],
  );
  const taskFlowBarStrokeWidth = 0;
  const toggleTaskFlowSeriesLayer = useCallback((seriesKey, layer) => {
    setTaskFlowSeriesVisibility((prev) => ({
      ...prev,
      [seriesKey]: {
        ...prev[seriesKey],
        [layer]: !prev[seriesKey]?.[layer],
      },
    }));
  }, []);

  const taskFlowTooltipVisibility = useMemo(
    () => ({
      created: isTaskFlowSeriesOn(taskFlowSeriesVisibility, "created"),
      active: isTaskFlowSeriesOn(taskFlowSeriesVisibility, "active"),
      completed: isTaskFlowSeriesOn(taskFlowSeriesVisibility, "completed"),
      overdue: isTaskFlowSeriesOn(taskFlowSeriesVisibility, "overdue"),
    }),
    [taskFlowSeriesVisibility],
  );

  const toggleOverdueSeries = useCallback((seriesKey) => {
    setOverdueSeriesVisibility((prev) => ({
      ...prev,
      [seriesKey]: !prev[seriesKey],
    }));
  }, []);

  const toggleTaskFlowChartDisplay = useCallback((optionKey) => {
    setTaskFlowChartDisplay((prev) => ({
      ...prev,
      [optionKey]: !prev[optionKey],
    }));
  }, []);

  const getTaskFlowLineDot = useCallback(
    (color, seriesKey, groupKeys, barSize, barGap) =>
      taskFlowChartDisplay.showDots
        ? (dotProps) => {
            const offset = getSeriesColumnXOffset(seriesKey, groupKeys, barSize, barGap);
            return (
              <ChartOpenCircleDot
                {...dotProps}
                cx={Number.isFinite(dotProps.cx) ? dotProps.cx + offset : dotProps.cx}
                stroke={color}
              />
            );
          }
        : false,
    [taskFlowChartDisplay.showDots],
  );

  const getTaskFlowActiveDot = useCallback(
    (color, seriesKey, groupKeys, barSize, barGap) => (dotProps) => {
      const offset = getSeriesColumnXOffset(seriesKey, groupKeys, barSize, barGap);
      return (
        <ChartOpenCircleDot
          {...dotProps}
          cx={Number.isFinite(dotProps.cx) ? dotProps.cx + offset : dotProps.cx}
          stroke={color}
          r={CHART_LINE_DOT_ACTIVE_RADIUS}
        />
      );
    },
    [],
  );

  const renderOverduePercentDot = useCallback(
    (dotProps) => <ChartOpenCircleDot {...dotProps} stroke={OVERDUE_PERCENT_LINE} />,
    [],
  );

  const renderOverduePercentActiveDot = useCallback(
    (dotProps) => (
      <ChartOpenCircleDot
        {...dotProps}
        stroke={OVERDUE_PERCENT_LINE}
        r={CHART_LINE_DOT_ACTIVE_RADIUS}
      />
    ),
    [],
  );

  const renderOverdueCountDot = useCallback(
    (dotProps) => <ChartOpenCircleDot {...dotProps} stroke={OVERDUE_COUNT_LINE} />,
    [],
  );

  const renderOverdueCountActiveDot = useCallback(
    (dotProps) => (
      <ChartOpenCircleDot
        {...dotProps}
        stroke={OVERDUE_COUNT_LINE}
        r={CHART_LINE_DOT_ACTIVE_RADIUS}
      />
    ),
    [],
  );

  const chartData = useMemo(() => {
    if (isTaskFlowMode) return aggregateTaskFlowSeries(data, viewMode);

    const rows = aggregateBoardOverdueSeries(data, overdueRanges);
    return rows;
  }, [data, theme, overdueRanges, isTaskFlowMode, viewMode]);

  const latestOverdueValues = useMemo(() => {
    if (!chartData.length) {
      return { overduePercent: null, overdueCount: null };
    }
    const last = chartData[chartData.length - 1];
    return {
      overduePercent: Math.round(Number(last?.overduePercent) || 0),
      overdueCount: Number(last?.overdueCount) || 0,
    };
  }, [chartData]);

  const chartDataWithFill = chartData.map((d) => ({
    ...d,
    // ONLY show when above 40
    blueZone: d.overduePercent > 40 ? d.overduePercent : null,
  }));

  const taskFlowDisplayData = useMemo(() => {
    if (!isTaskFlowMode) return chartData;
    if (viewMode !== "percentage") return chartData;
    return chartData.map((row) => {
      const created = Number(row.created) || 0;
      const active = Number(row.active) || 0;
      const completed = Number(row.completed) || 0;
      const overdue = Number(row.overdue) || 0;
      const total = created + active + completed + overdue;
      if (total <= 0) {
        return {
          ...row,
          created: 0,
          active: 0,
          completed: 0,
          overdue: 0,
        };
      }
      return {
        ...row,
        created: created,
        active: active,
        completed: completed,
        overdue: overdue,
      };
    });
  }, [chartData, isTaskFlowMode, viewMode]);

  const activeChartRows = useMemo(() => {
    const rows = isTaskFlowMode ? taskFlowDisplayData : chartDataWithFill;
    return normalizeChartRowKeys(rows);
  }, [isTaskFlowMode, taskFlowDisplayData, chartDataWithFill]);

  const highestTaskFlowSeriesKey = useMemo(
    () =>
      getHighestTaskFlowSeriesKey({
        rows: taskFlowDisplayData,
        showCreatedTask,
        includeOverdue: isTaskDueStatusMode || isHealthStatusMode,
      }),
    [taskFlowDisplayData, showCreatedTask, isTaskDueStatusMode, isHealthStatusMode],
  );

  useEffect(() => {
    if (!isTaskFlowMode) return;

    setTaskFlowSeriesVisibility(
      buildTaskFlowSeriesVisibility({
        isTaskDueStatusMode,
        isHealthStatusMode,
        showCreatedTask,
        highestSeriesKey: highestTaskFlowSeriesKey,
      }),
    );
  }, [
    isTaskFlowMode,
    isTaskDueStatusMode,
    isHealthStatusMode,
    showCreatedTask,
    highestTaskFlowSeriesKey,
  ]);

  // Task-flow area fill uses the same shifted shape as the line so shading stays
  // under its bar column instead of spanning the full category band.
  useEffect(() => {
    if (!import.meta.env.DEV || !isHealthStatusMode || !isTaskFlowMode) return;

    const lineSeries = TASK_FLOW_SERIES_KEYS.filter((key) =>
      isTaskFlowLayerOn(taskFlowSeriesVisibility, key, "line"),
    );
  }, [
    isHealthStatusMode,
    isTaskFlowMode,
    activeChartRows,
    taskFlowSeriesVisibility,
    highestTaskFlowSeriesKey,
  ]);

  const shouldShowYearOnXAxis = useMemo(() => {
    if (activeChartRows.length < 2) return false;
    const dates = activeChartRows.map((row) => getChartRowDate(row)).filter(Boolean);
    if (dates.length < 2) return false;
    return Math.abs(dates[dates.length - 1].diff(dates[0], "day")) > 90;
  }, [activeChartRows]);

  const xAxisTickValues = useMemo(
    () => activeChartRows.map((row) => row.key),
    [activeChartRows],
  );

  const showAllXAxisDates = isChartExpanded;

  const xAxisLabelStep = useMemo(
    () => getXAxisLabelStep(xAxisTickValues.length),
    [xAxisTickValues.length],
  );

  const visibleXAxisLabelIndices = useMemo(() => {
    if (showAllXAxisDates) {
      return new Set(Array.from({ length: xAxisTickValues.length }, (_, i) => i));
    }
    return getVisibleXAxisLabelIndices(
      xAxisTickValues.length,
      xAxisLabelStep,
      xAxisTickValues,
    );
  }, [showAllXAxisDates, xAxisTickValues.length, xAxisLabelStep]);

  // Keep date labels horizontal (no diagonal tilt) so they align straight above the legend.
  const slantXAxisLabels = false;

  const renderXAxisTick = useCallback(
    (props) => (
      <ChartXAxisTick
        {...props}
        showYear={shouldShowYearOnXAxis}
        tickValues={xAxisTickValues}
        visibleLabelIndices={visibleXAxisLabelIndices}
        tickCount={xAxisTickValues.length}
        showAllDates={showAllXAxisDates}
        slantLabels={slantXAxisLabels}
      />
    ),
    [
      shouldShowYearOnXAxis,
      xAxisTickValues,
      visibleXAxisLabelIndices,
      showAllXAxisDates,
      slantXAxisLabels,
    ],
  );

  const chartRowsRef = useRef([]);
  chartRowsRef.current = activeChartRows;
  const gradientScopeId = useId().replace(/:/g, "");

  const chartAnimationKey = useMemo(() => {
    if (!activeChartRows.length) return "empty";
    const modePrefix = isTaskFlowMode ? `task-flow-${viewMode}` : "overdue-health";
    const seriesFingerprint = activeChartRows
      .map((row) => {
        if (isTaskFlowMode) {
          return [row.key, row.created, row.active, row.completed, row.overdue].join(":");
        }
        return [row.key, row.overduePercent, row.overdueCount].join(":");
      })
      .join("|");
    return `${modePrefix}:${seriesFingerprint}`;
  }, [activeChartRows, isTaskFlowMode, viewMode]);

  // Remount the chart after load/data changes so Recharts always grows bars from 0.
  // (Updating isAnimationActive alone does not restart a completed bar tween.)
  const [barAnimationNonce, setBarAnimationNonce] = useState(0);
  useEffect(() => {
    if (apiLoading || !activeChartRows.length) return undefined;
    setBarAnimationNonce((nonce) => nonce + 1);
  }, [apiLoading, chartAnimationKey, activeChartRows.length]);

  const composedChartKey = `${chartAnimationKey}::anim-${barAnimationNonce}`;

  const getSeriesAnimation = useCallback(
    (animationBegin = 0) => ({
      isAnimationActive: !apiLoading && barAnimationNonce > 0,
      animationDuration: CHART_ANIMATION_DURATION_MS,
      animationEasing: CHART_ANIMATION_EASING,
      animationBegin,
    }),
    [apiLoading, barAnimationNonce],
  );

  // Independent bar entrance (Healthy → Needs Attention → At Risk)
  const taskFlowBarAnimation = useMemo(
    () => ({
      created: getSeriesAnimation(0),
      completed: getSeriesAnimation(0),
      active: getSeriesAnimation(90),
      overdue: getSeriesAnimation(180),
    }),
    [getSeriesAnimation],
  );

  const chartSeriesAnimation = useMemo(() => getSeriesAnimation(0), [getSeriesAnimation]);

  const lineAreaGradientId = useCallback(
    (seriesKey) => `bohc-line-area-${gradientScopeId}-${seriesKey}`,
    [gradientScopeId],
  );

  useEffect(() => {
    setChartFocus(EMPTY_CHART_FOCUS);
  }, [composedChartKey]);

  const trendInfo = useMemo(() => {
    if (chartData.length < 2) return null;
    const current = chartData[chartData.length - 1]?.trend || null;

    return {
      direction: current,
      value: isTaskFlowMode
        ? Number(chartData[chartData.length - 1]?.completedTasksPercent)
        : Number(chartData[chartData.length - 1]?.overduePercent),
      isIncrease: current === "Increase" ? true : false,
    };
  }, [chartData, isTaskFlowMode]);

  const rightAxisScale = useMemo(() => {
    if (!chartData.length || isTaskFlowMode) return buildRightAxisScale(0);
    const max = Math.max(...chartData.map((d) => Number(d.overdueCount) || 0), 0);
    return buildRightAxisScale(max);
  }, [chartData, isTaskFlowMode]);

  /** Left axis for Overdue Summary: allow overdue % above 100 when data or configured risk range requires it. */
  const overduePercentAxisScale = useMemo(() => {
    if (isTaskFlowMode) {
      return { domainMax: 100, ticks: LEFT_AXIS_TICKS };
    }
    const configuredRiskMax = Number(overdueRanges.risk.max);
    const riskCeiling = Number.isFinite(configuredRiskMax) ? configuredRiskMax : 100;
    const dataPeak = chartData.length
      ? Math.max(...chartData.map((d) => Number(d.overduePercent) || 0), 0)
      : 0;
    const neededMax = Math.max(100, riskCeiling, dataPeak);
    if (neededMax <= 100) {
      return { domainMax: 100, ticks: LEFT_AXIS_TICKS };
    }
    return buildRightAxisScale(neededMax);
  }, [chartData, isTaskFlowMode, overdueRanges.risk.max]);

  const dominantOverdueSeriesKey = useMemo(() => {
    if (isTaskFlowMode || !chartData.length) return "overduePercent";

    const last = chartData[chartData.length - 1];
    const percent = Number(last?.overduePercent) || 0;
    const count = Number(last?.overdueCount) || 0;
    const percentMax = overduePercentAxisScale.domainMax || 100;
    const countMax = rightAxisScale.domainMax || 1;

    return percent / percentMax >= count / countMax ? "overduePercent" : "overdueCount";
  }, [
    chartData,
    isTaskFlowMode,
    overduePercentAxisScale.domainMax,
    rightAxisScale.domainMax,
  ]);

  useEffect(() => {
    if (isTaskFlowMode) return;

    setOverdueSeriesVisibility({
      overduePercent: dominantOverdueSeriesKey === "overduePercent",
      overdueCount: dominantOverdueSeriesKey === "overdueCount",
    });
  }, [isTaskFlowMode, dominantOverdueSeriesKey]);

  const taskFlowAxisScale = useMemo(() => {
    if (!taskFlowDisplayData.length || !isTaskFlowMode) return buildRightAxisScale(0);
    // Health Status percentages never exceed 100%
    if (isHealthStatusMode || viewMode === "percentage") {
      return { domainMax: 100, ticks: LEFT_AXIS_TICKS };
    }
    const keys = ["created", "active", "completed", "overdue"].filter((key) =>
      isTaskFlowSeriesOn(taskFlowSeriesVisibility, key),
    );
    const targetKeys = keys.length ? keys : ["created", "active", "completed", "overdue"];
    const max = Math.max(
      ...taskFlowDisplayData.map((d) =>
        Math.max(...targetKeys.map((key) => Number(d[key]) || 0)),
      ),
      0,
    );
    return buildRightAxisScale(max);
  }, [
    taskFlowDisplayData,
    isTaskFlowMode,
    taskFlowSeriesVisibility,
    viewMode,
    isHealthStatusMode,
  ]);

  const chartHeight = isChartExpanded ? CHART_EXPANDED_HEIGHT : getChartHeight;

  const chartPlotBottomMargin = useMemo(() => {
    if (isChartExpanded) {
      if (showAllXAxisDates && shouldShowYearOnXAxis) return 52;
      if (showAllXAxisDates) return 35;
      return shouldShowYearOnXAxis ? 48 : 36;
    }
    // Slanted labels render inside the XAxis height band — avoid double bottom padding.
    if (slantXAxisLabels) return 2;
    return shouldShowYearOnXAxis ? 36 : 20;
  }, [isChartExpanded, shouldShowYearOnXAxis, showAllXAxisDates, slantXAxisLabels]);

  const chartXAxisHeight = useMemo(() => {
    if (isChartExpanded) {
      if (showAllXAxisDates && shouldShowYearOnXAxis) return 52;
      if (showAllXAxisDates) return 20;
      return shouldShowYearOnXAxis ? 48 : 36;
    }
    if (slantXAxisLabels && shouldShowYearOnXAxis) return 38;
    if (slantXAxisLabels) return 35;
    return shouldShowYearOnXAxis ? 40 : 24;
  }, [isChartExpanded, shouldShowYearOnXAxis, showAllXAxisDates, slantXAxisLabels]);

  const chartPlotMargins = useMemo(
    () => getChartPlotMargins(isTaskFlowMode, chartPlotBottomMargin),
    [isTaskFlowMode, chartPlotBottomMargin],
  );

  const chartPlotInset = useMemo(
    () => getChartPlotInset(isTaskFlowMode),
    [isTaskFlowMode],
  );

  const taskFlowBarSize = useMemo(() => {
    const pointCount = activeChartRows.length || 1;
    const base = isChartExpanded
      ? TASK_FLOW_BAR_SIZE_EXPANDED
      : TASK_FLOW_BAR_SIZE_COLLAPSED;
    const minSize = isChartExpanded ? 14 : 4;

    if (pointCount > 60) return Math.max(minSize, base - (isChartExpanded ? 14 : 4));
    if (pointCount > 30) return Math.max(minSize, base - (isChartExpanded ? 10 : 2));
    if (pointCount > 14) return Math.max(minSize, base - (isChartExpanded ? 6 : 2));
    return base;
  }, [activeChartRows.length, isChartExpanded]);

  const taskFlowBarGap = isChartExpanded
    ? TASK_FLOW_BAR_GAP_EXPANDED
    : TASK_FLOW_BAR_GAP_COLLAPSED;

  const visibleTaskFlowBarKeys = useMemo(
    () =>
      getVisibleTaskFlowBarKeys({
        taskFlowSeriesVisibility,
        showCreatedTask,
        includeOverdue: isTaskDueStatusMode || isHealthStatusMode,
        rows: activeChartRows,
      }),
    [
      taskFlowSeriesVisibility,
      showCreatedTask,
      isTaskDueStatusMode,
      isHealthStatusMode,
      activeChartRows,
    ],
  );

  const visibleTaskFlowLineKeys = useMemo(
    () =>
      TASK_FLOW_SERIES_KEYS.filter((key) =>
        isTaskFlowLayerOn(taskFlowSeriesVisibility, key, "line"),
      ),
    [taskFlowSeriesVisibility],
  );

  const healthBarHighlightRange = useMemo(() => {
    if (!isHealthStatusMode) return null;
    return getHealthStatusBarHighlightRange(selectedRange, getSelectedDate);
  }, [isHealthStatusMode, selectedRange, getSelectedDate]);

  const getHealthBarOpacity = useCallback(
    (payload) => {
      if (!isHealthStatusMode || !healthBarHighlightRange) {
        return HEALTH_STATUS_BAR_OPACITY_ACTIVE;
      }
      const date = getChartRowDate(payload);
      if (!date) return HEALTH_STATUS_BAR_OPACITY_ACTIVE;

      const inRange =
        date.isSameOrAfter(healthBarHighlightRange.from, "month") &&
        date.isSameOrBefore(healthBarHighlightRange.to, "month");

      return inRange ? HEALTH_STATUS_BAR_OPACITY_ACTIVE : HEALTH_STATUS_BAR_OPACITY_MUTED;
    },
    [isHealthStatusMode, healthBarHighlightRange],
  );

  const taskFlowSeriesShapes = useMemo(() => {
    const barOpacity = isHealthStatusMode ? getHealthBarOpacity : undefined;
    const buildSeriesShape = (seriesKey) => ({
      bar: createAdaptiveGroupBarShape(
        seriesKey,
        visibleTaskFlowBarKeys,
        visibleTaskFlowLineKeys,
        taskFlowBarGap,
        barOpacity,
      ),
      area: createAdaptiveTaskFlowAreaShape(
        seriesKey,
        visibleTaskFlowBarKeys,
        taskFlowBarSize,
        taskFlowBarGap,
      ),
      line: createAdaptiveTaskFlowLineShape(
        seriesKey,
        visibleTaskFlowBarKeys,
        taskFlowBarSize,
        taskFlowBarGap,
      ),
      bottomClippedLine: createBottomClippedTaskFlowLineShape(
        seriesKey,
        `bohc-bottom-line-clip-${gradientScopeId}-${seriesKey}`,
        visibleTaskFlowBarKeys,
        taskFlowBarSize,
        taskFlowBarGap,
      ),
    });

    return {
      created: buildSeriesShape("created"),
      active: buildSeriesShape("active"),
      completed: buildSeriesShape("completed"),
      overdue: buildSeriesShape("overdue"),
    };
  }, [
    visibleTaskFlowBarKeys,
    visibleTaskFlowLineKeys,
    taskFlowBarGap,
    taskFlowBarSize,
    gradientScopeId,
    isHealthStatusMode,
    getHealthBarOpacity,
  ]);

  const getTaskFlowAreaFillShape = useCallback(
    (seriesKey) => {
      const areaShape = taskFlowSeriesShapes[seriesKey]?.area;
      if (!areaShape) return undefined;
      return bindTaskFlowAreaFillShape(
        areaShape,
        `url(#${lineAreaGradientId(seriesKey)})`,
        taskFlowAxisScale.domainMax,
      );
    },
    [taskFlowSeriesShapes, lineAreaGradientId, taskFlowAxisScale.domainMax],
  );

  /** Overdue % chart has no grouped bars — span the full category band. */
  const edgeToEdgeShapes = useMemo(
    () => ({
      overdueArea: createEdgeToEdgeAreaShape(),
      overdueLine: createEdgeToEdgeLineShape(),
    }),
    [],
  );

  const isEmpty = chartData.length === 0;
  tooltipDataLengthRef.current = activeChartRows.length;
  const tooltipRow = chartFocus.index >= 0 ? activeChartRows[chartFocus.index] : null;
  const chartWidth = chartWrapRef.current?.clientWidth || 0;
  const tooltipWidth = 168;
  const showTooltipOnLeftSide = useMemo(() => {
    if (!Number.isFinite(chartFocus.x)) return false;

    if (isChartExpanded && expandedShellRef.current && chartWrapRef.current) {
      const shellRect = expandedShellRef.current.getBoundingClientRect();
      const wrapRect = chartWrapRef.current.getBoundingClientRect();
      const wrapOffsetLeft = wrapRect.left - shellRect.left;
      return wrapOffsetLeft + chartFocus.x + tooltipWidth > shellRect.width - 12;
    }

    if (chartWidth > 0) {
      return chartFocus.x + tooltipWidth > chartWidth - 8;
    }
    return chartFocus.x > 260;
  }, [chartFocus.x, chartWidth, isChartExpanded]);

  const expandedTooltipStyle = useMemo(() => {
    if (
      !isChartExpanded ||
      !Number.isFinite(chartFocus.x) ||
      !Number.isFinite(chartFocus.y) ||
      !expandedShellRef.current ||
      !chartWrapRef.current
    ) {
      return null;
    }

    const shellRect = expandedShellRef.current.getBoundingClientRect();
    const wrapRect = chartWrapRef.current.getBoundingClientRect();
    const wrapOffsetLeft = wrapRect.left - shellRect.left;
    const wrapOffsetTop = wrapRect.top - shellRect.top;
    const rawLeft =
      wrapOffsetLeft + chartFocus.x + (showTooltipOnLeftSide ? -tooltipWidth - 12 : 18);
    const rawTop = wrapOffsetTop + chartFocus.y + 14;

    return {
      position: "absolute",
      left: Math.min(Math.max(8, rawLeft), shellRect.width - tooltipWidth - 8),
      top: Math.max(8, rawTop),
      transform: "translateY(-100%)",
      pointerEvents: "none",
      zIndex: 10,
    };
  }, [chartFocus.x, chartFocus.y, isChartExpanded, showTooltipOnLeftSide]);

  const resolveHoveredChartIndex = useCallback(
    (_state, reactEvent) => {
      const rows = chartRowsRef.current;
      const n = rows.length;
      if (n === 0) return null;

      const pointer = getPlotPointerPosition(
        reactEvent,
        chartWrapRef.current,
        chartPlotInset,
      );
      if (!pointer) return null;

      const { plotX, plotWidth } = pointer;

      if (n === 1) return 0;

      // Map pointer X to category index. Do not use Recharts activeTooltipIndex —
      // it often sticks to 0 when hovering the x-axis label band.
      const segmentWidth = plotWidth / n;
      return Math.min(n - 1, Math.max(0, Math.floor(plotX / segmentWidth)));
    },
    [chartPlotInset],
  );

  const handleChartMouseMove = useCallback(
    (state, reactEvent) => {
      const n = chartRowsRef.current.length;
      const pointer = getPlotPointerPosition(
        reactEvent,
        chartWrapRef.current,
        chartPlotInset,
      );

      if (!pointer) {
        setChartFocus(EMPTY_CHART_FOCUS);
        return;
      }

      let index = resolveHoveredChartIndex(state, reactEvent);

      if (index == null || index < 0 || index >= n) {
        setChartFocus(EMPTY_CHART_FOCUS);
        return;
      }

      const x = pointer
        ? pointer.plotLeft + pointer.plotX
        : Number.isFinite(Number(state?.activeCoordinate?.x))
          ? Number(state.activeCoordinate.x)
          : reactEvent && chartWrapRef.current
            ? reactEvent.clientX - chartWrapRef.current.getBoundingClientRect().left
            : null;
      const y = Number.isFinite(Number(state?.activeCoordinate?.y))
        ? Number(state.activeCoordinate.y)
        : chartHeight / 2;

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        setChartFocus(EMPTY_CHART_FOCUS);
        return;
      }

      setChartFocus({
        index,
        x,
        y,
        clientX: reactEvent?.clientX ?? null,
        clientY: reactEvent?.clientY ?? null,
      });
    },
    [chartHeight, chartPlotInset, resolveHoveredChartIndex],
  );

  const handleChartMouseLeave = useCallback(() => {
    setChartFocus(EMPTY_CHART_FOCUS);
  }, []);

  const clearChartFocus = useCallback(() => {
    setChartFocus(EMPTY_CHART_FOCUS);
  }, []);

  const renderActiveTooltip = () =>
    isTaskFlowMode ? (
      <TaskFlowTooltip
        active
        viewMode={viewMode}
        showYear={shouldShowYearOnXAxis}
        seriesVisibility={taskFlowTooltipVisibility}
        activeColor={taskFlowLineColors.active}
        completedColor={taskFlowLineColors.completed}
        overdueColor={taskFlowLineColors.overdue}
        payload={[{ payload: tooltipRow ?? {} }]}
        isTaskDueStatusMode={isTaskDueStatusMode}
        isHealthStatusMode={isHealthStatusMode}
      />
    ) : (
      <OverdueTooltip
        active
        showYear={shouldShowYearOnXAxis}
        payload={[{ payload: tooltipRow ?? {} }]}
        countLineColor={OVERDUE_COUNT_LINE}
        seriesVisibility={overdueSeriesVisibility}
      />
    );

  const triggerOutsideClickPulse = useCallback(() => {
    clearChartFocus();
    if (!isChartExpanded) return;
    if (outsideClickPulseTimerRef.current) {
      clearTimeout(outsideClickPulseTimerRef.current);
    }
    setIsOutsideClickPulseActive(false);
    window.requestAnimationFrame(() => {
      setIsOutsideClickPulseActive(true);
      outsideClickPulseTimerRef.current = setTimeout(() => {
        setIsOutsideClickPulseActive(false);
      }, 220);
    });
  }, [clearChartFocus, isChartExpanded]);

  useEffect(() => {
    if (!isChartExpanded) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isChartExpanded]);

  useEffect(
    () => () => {
      if (outsideClickPulseTimerRef.current) {
        clearTimeout(outsideClickPulseTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (!chartWrapRef.current?.contains(event.target)) {
        clearChartFocus();
      }
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    return () => document.removeEventListener("mousedown", handleOutsidePointer);
  }, [clearChartFocus]);

  if (apiLoading && isEmpty) {
    return (
      <div className="board-overdue-health-chart board-overdue-health-chart--loading">
        <div className="board-overdue-health-chart__head">
          <h4 className="board-overdue-health-chart__title">{healthLabel}</h4>
        </div>
        {/* <DashboardChartSkeleton
          variant="bar"
          height={280}
          barCount={6}
          className="board-overdue-health-chart__chart-skeleton"
          ariaLabel={`Loading ${healthLabel}`}
        /> */}
        <SkeletonLoading
          variant="bar"
          height={340}
          barCount={6}
          className="board-overdue-health-chart__chart-skeleton"
        />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="board-overdue-health-chart board-overdue-health-chart--empty">
        <div className="board-overdue-health-chart__head">
          <h4 className="board-overdue-health-chart__title">{healthLabel}</h4>
        </div>
        <div className="board-overdue-health-chart__empty">
          <p className="workspace-widget__no-data-found w-100" style={{ margin: "0" }}>
            No Data Found
          </p>
        </div>
      </div>
    );
  }

  const chartPanel = (
    <div
      className={`board-overdue-health-chart${
        isChartExpanded ? " board-overdue-health-chart--expanded" : ""
      }`}
    >
      <div className="board-overdue-health-chart__head">
        <div className="board-overdue-health-chart__head-top">
          <h4 className="board-overdue-health-chart__title">{healthLabel}</h4>
          {/* {isTaskFlowMode && (
            <div
              className="workspace-widget__view-toggle"
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                className={`workspace-widget__view-btn ${viewMode === "count" ? "is-active" : ""}`}
                onClick={() => setViewMode("count")}
                aria-pressed={viewMode === "count"}
                title="Count View"
              >
                Count View
              </button>
              <button
                type="button"
                className={`workspace-widget__view-btn ${viewMode === "percentage" ? "is-active" : ""}`}
                onClick={() => setViewMode("percentage")}
                aria-pressed={viewMode === "percentage"}
                title="Percentage View"
              >
                Percentage View
              </button>
            </div>
          )} */}
          {!isChartExpanded && (
            <button
              className="board-overdue-health-chart__subtitle-expand"
              role="button"
              tabIndex={0}
              onClick={() => setIsChartExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsChartExpanded(true);
                }
              }}
            >
              Expand &#160;
              <img src={boardExpandIcon} alt="boardExpand" />
            </button>
          )}
        </div>

        {trendInfo ? (
          <div
            className={`board-overdue-health-chart__subtitle ${isChartExpanded ? "board-overdue-health-chart__subtitle--expanded" : ""}`}
          >
            {!isTaskFlowMode && type[0]?.filter_id === 22 && (
              <p className="board-overdue-health-chart__subtitle-text">
                {subTitle ? (
                  <>{subTitle}</>
                ) : (
                  <>
                    {trendInfo.direction === "Increase" && (
                      <>
                        <span
                          className="board-overdue-health-chart__trend-icon"
                          aria-hidden
                        >
                          <TrendingUp
                            color={COLORS_VALUES(dashboardMaterValue).atRisk}
                            isTransparent={true}
                            bgColor="transparent"
                            needDivElement={false}
                            style={{
                              verticalAlign: "-2px",
                              width: "13px",
                              height: "15px",
                            }}
                          />
                        </span>
                      </>
                    )}
                    {trendInfo.direction === "Decrease" && (
                      <>
                        <span
                          className="board-overdue-health-chart__trend-icon"
                          aria-hidden
                        >
                          <TrendingDown
                            color={COLORS_VALUES(dashboardMaterValue).healthy}
                            isTransparent={true}
                            bgColor="transparent"
                            needDivElement={false}
                            style={{
                              verticalAlign: "-2px",
                              width: "13px",
                              height: "15px",
                            }}
                          />
                        </span>
                      </>
                    )}
                    <span className="board-overdue-health-chart__subtitle-strong">
                      Overdue
                    </span>{" "}
                    {trendInfo.direction} by{" "}
                    <span className="board-overdue-health-chart__subtitle-strong">
                      {trendInfo.isIncrease && "+"} {trendInfo.isIncrease && "-"}
                      {trendInfo.value && trendInfo.value}%
                    </span>{" "}
                    {/* from yesterday */}
                    from {selectedRange[0].label}
                  </>
                )}
              </p>
            )}
            {isTaskFlowMode && (
              <p className="board-overdue-health-chart__subtitle-text">
                {subTitle ? (
                  <>{subTitle}</>
                ) : (
                  <>
                    {trendInfo.isIncrease && (
                      <>
                        <span
                          className="board-overdue-health-chart__trend-icon"
                          aria-hidden
                        >
                          <TrendingUp
                            color={COLORS_VALUES(dashboardMaterValue).healthy}
                            isTransparent={true}
                            bgColor="transparent"
                            needDivElement={false}
                            style={{
                              verticalAlign: "-2px",
                              width: "13px",
                              height: "15px",
                            }}
                          />
                        </span>
                      </>
                    )}
                    {trendInfo.direction === "Decrease" && (
                      <>
                        <span
                          className="board-overdue-health-chart__trend-icon"
                          aria-hidden
                        >
                          <TrendingDown
                            color={COLORS_VALUES(dashboardMaterValue).atRisk}
                            isTransparent={true}
                            bgColor="transparent"
                            needDivElement={false}
                            style={{
                              verticalAlign: "-2px",
                              width: "13px",
                              height: "15px",
                            }}
                          />
                        </span>
                      </>
                    )}
                    <span className="board-overdue-health-chart__subtitle-strong">
                      Completed
                    </span>{" "}
                    {trendInfo.direction} by{" "}
                    <span className="board-overdue-health-chart__subtitle-strong">
                      {trendInfo.value && trendInfo.value}%
                    </span>{" "}
                    {/* from yesterday */}
                    from {selectedRange[0].label}
                  </>
                )}
              </p>
            )}
          </div>
        ) : null}
      </div>
      {isChartExpanded && countCards?.length > 0 && (
        <div className="board-overdue-health-chart__count-cards">
          {countCards?.map((card) => (
            <DashboardCountCard
              key={card.id}
              card={card}
              type={isHealthStatusMode ? "worspace" : type}
              dashboardMaterValue={dashboardMaterValue}
              variant="chart"
            />
          ))}
        </div>
      )}

      <div
        className={`board-overdue-health-chart__scroll-body${
          isChartExpanded ? " board-overdue-health-chart__scroll-body--expanded" : ""
        }`}
      >
        <div
          className="board-overdue-health-chart__chart-wrap"
          ref={chartWrapRef}
          style={{ position: "relative" }}
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart
              key={composedChartKey}
              data={activeChartRows}
              barCategoryGap={
                isTaskFlowMode ? (isChartExpanded ? "22%" : "10%") : undefined
              }
              barGap={isTaskFlowMode ? (isChartExpanded ? 4 : 2) : undefined}
              margin={chartPlotMargins}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              {!isTaskFlowMode && (
                <>
                  <defs>
                    <linearGradient
                      id={lineAreaGradientId("overduePercent")}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={OVERDUE_PERCENT_LINE}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="70%"
                        stopColor={OVERDUE_PERCENT_LINE}
                        stopOpacity={0.08}
                      />
                      <stop
                        offset="100%"
                        stopColor={OVERDUE_PERCENT_LINE}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id={lineAreaGradientId("overdueCount")}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={OVERDUE_COUNT_LINE}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="70%"
                        stopColor={OVERDUE_COUNT_LINE}
                        stopOpacity={0.08}
                      />
                      <stop
                        offset="100%"
                        stopColor={OVERDUE_COUNT_LINE}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="greenGradient" x1="1" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={legendBands.healthy}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={legendBands.healthy}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="orangeGradient" x1="1" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={legendBands.needs} stopOpacity={0.4} />
                      <stop
                        offset="100%"
                        stopColor={legendBands.needs}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="redGradient" x1="1" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={legendBands.risk} stopOpacity={0.4} />
                      <stop
                        offset="100%"
                        stopColor={legendBands.risk}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <ReferenceArea
                    yAxisId="left"
                    y1={Number(overdueRanges.healthy.min)}
                    y2={Number(
                      overdueRanges.healthy.max + breathingRoomPercentageRange.healthy,
                    )}
                    fill="url(#greenGradient)"
                  />
                  <ReferenceArea
                    yAxisId="left"
                    y1={Number(overdueRanges.needs.min)}
                    y2={Number(
                      overdueRanges.needs.max + breathingRoomPercentageRange.needs,
                    )}
                    fill="url(#orangeGradient)"
                  />

                  <ReferenceArea
                    yAxisId="left"
                    y1={Number(overdueRanges.risk.min)}
                    y2={Math.max(
                      Number(overdueRanges.risk.max),
                      Number(overduePercentAxisScale.domainMax) || 100,
                    )}
                    fill="url(#redGradient)"
                  />
                  {overdueSeriesVisibility.overduePercent && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="overduePercent"
                      stroke="none"
                      fill={`url(#${lineAreaGradientId("overduePercent")})`}
                      fillOpacity={1}
                      connectNulls
                      dot={false}
                      activeDot={false}
                      shape={edgeToEdgeShapes.overdueArea}
                      isAnimationActive={chartSeriesAnimation.isAnimationActive}
                      animationDuration={chartSeriesAnimation.animationDuration}
                      animationEasing={chartSeriesAnimation.animationEasing}
                      animationBegin={chartSeriesAnimation.animationBegin}
                    />
                  )}
                  {overdueSeriesVisibility.overdueCount && (
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="overdueCount"
                      stroke="none"
                      fill={`url(#${lineAreaGradientId("overdueCount")})`}
                      fillOpacity={1}
                      connectNulls
                      dot={false}
                      activeDot={false}
                      shape={edgeToEdgeShapes.overdueArea}
                      isAnimationActive={chartSeriesAnimation.isAnimationActive}
                      animationDuration={chartSeriesAnimation.animationDuration}
                      animationEasing={chartSeriesAnimation.animationEasing}
                      animationBegin={chartSeriesAnimation.animationBegin}
                    />
                  )}
                </>
              )}
              {isTaskFlowMode && (
                <defs>
                  <linearGradient
                    id={lineAreaGradientId("created")}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={CREATED_LINE} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CREATED_LINE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id={lineAreaGradientId("completed")}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={taskFlowLineColors.completed}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={taskFlowLineColors.completed}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id={lineAreaGradientId("active")}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={taskFlowLineColors.active}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={taskFlowLineColors.active}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id={lineAreaGradientId("overdue")}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={taskFlowLineColors.overdue}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={taskFlowLineColors.overdue}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              )}
              <XAxis
                dataKey="key"
                axisLine={false}
                tickLine={false}
                ticks={xAxisTickValues}
                interval={0}
                height={chartXAxisHeight}
                tick={renderXAxisTick}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                yAxisId={isTaskFlowMode ? "main" : "left"}
                width={isTaskFlowMode ? 52 : 44}
                axisLine={false}
                tickLine={false}
                domain={
                  isTaskFlowMode
                    ? [0, taskFlowAxisScale.domainMax]
                    : [0, overduePercentAxisScale.domainMax]
                }
                ticks={
                  isTaskFlowMode ? taskFlowAxisScale.ticks : overduePercentAxisScale.ticks
                }
                tickFormatter={(v) =>
                  isTaskFlowMode
                    ? viewMode === "percentage"
                      ? `${v}%`
                      : `${v}`
                    : `${v}%`
                }
                tick={{ fill: CHART_TICK_COLOR, fontSize: 10, fontWeight: 500 }}
              />
              {!isTaskFlowMode && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={24}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, rightAxisScale.domainMax]}
                  ticks={rightAxisScale.ticks}
                  tick={{ fill: CHART_TICK_COLOR, fontSize: 10, fontWeight: 500 }}
                />
              )}
              {isTaskFlowMode && taskFlowChartDisplay.showGrid && (
                <CartesianGrid
                  yAxisId="main"
                  vertical
                  horizontal
                  syncWithTicks
                  stroke={CHART_GRID_COLOR}
                  strokeWidth={CHART_GRID_STROKE_WIDTH}
                  // strokeDasharray={CHART_GRID_STROKE_DASH}
                  opacity={0.5}
                />
              )}
              <Tooltip content={() => null} cursor={false} />
              {isTaskFlowMode ? (
                <>
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "created", "line") &&
                    showCreatedTask && (
                      <Line
                        yAxisId="main"
                        type="linear"
                        dataKey="created"
                        legendType="none"
                        stroke="none"
                        fill={`url(#${lineAreaGradientId("created")})`}
                        fillOpacity={1}
                        connectNulls
                        dot={false}
                        activeDot={false}
                        shape={getTaskFlowAreaFillShape("created")}
                        isAnimationActive={chartSeriesAnimation.isAnimationActive}
                        animationDuration={chartSeriesAnimation.animationDuration}
                        animationEasing={chartSeriesAnimation.animationEasing}
                        animationBegin={chartSeriesAnimation.animationBegin}
                      />
                    )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "active", "line") && (
                    <Line
                      yAxisId="main"
                      type="linear"
                      dataKey="active"
                      legendType="none"
                      stroke="none"
                      fill={`url(#${lineAreaGradientId("active")})`}
                      fillOpacity={1}
                      connectNulls
                      dot={false}
                      activeDot={false}
                      shape={getTaskFlowAreaFillShape("active")}
                      isAnimationActive={chartSeriesAnimation.isAnimationActive}
                      animationDuration={chartSeriesAnimation.animationDuration}
                      animationEasing={chartSeriesAnimation.animationEasing}
                      animationBegin={chartSeriesAnimation.animationBegin}
                    />
                  )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "completed", "line") && (
                    <Line
                      yAxisId="main"
                      type="linear"
                      dataKey="completed"
                      legendType="none"
                      stroke="none"
                      fill={`url(#${lineAreaGradientId("completed")})`}
                      fillOpacity={1}
                      connectNulls
                      dot={false}
                      activeDot={false}
                      shape={getTaskFlowAreaFillShape("completed")}
                      isAnimationActive={chartSeriesAnimation.isAnimationActive}
                      animationDuration={chartSeriesAnimation.animationDuration}
                      animationEasing={chartSeriesAnimation.animationEasing}
                      animationBegin={chartSeriesAnimation.animationBegin}
                    />
                  )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "overdue", "line") &&
                    (isTaskDueStatusMode || isHealthStatusMode) && (
                      <Line
                        yAxisId="main"
                        type="linear"
                        dataKey="overdue"
                        legendType="none"
                        stroke="none"
                        fill={`url(#${lineAreaGradientId("overdue")})`}
                        fillOpacity={1}
                        connectNulls
                        dot={false}
                        activeDot={false}
                        shape={getTaskFlowAreaFillShape("overdue")}
                        isAnimationActive={chartSeriesAnimation.isAnimationActive}
                        animationDuration={chartSeriesAnimation.animationDuration}
                        animationEasing={chartSeriesAnimation.animationEasing}
                        animationBegin={chartSeriesAnimation.animationBegin}
                      />
                    )}
                  {visibleTaskFlowBarKeys.includes("created") && showCreatedTask && (
                    <Bar
                      yAxisId="main"
                      dataKey="created"
                      name="Created"
                      fill={CREATED_LINE}
                      stroke={undefined}
                      strokeWidth={0}
                      barSize={taskFlowBarSize}
                      radius={[4, 4, 0, 0]}
                      shape={taskFlowSeriesShapes.created.bar}
                      {...taskFlowBarAnimation.created}
                    />
                  )}
                  {visibleTaskFlowBarKeys.includes("completed") && (
                    <Bar
                      yAxisId="main"
                      dataKey="completed"
                      name={isHealthStatusMode ? "Healthy" : "Completed"}
                      fill={getTaskFlowBarFill(taskFlowLineColors.completed)}
                      stroke={undefined}
                      strokeWidth={taskFlowBarStrokeWidth}
                      barSize={taskFlowBarSize}
                      radius={[4, 4, 0, 0]}
                      shape={taskFlowSeriesShapes.completed.bar}
                      {...taskFlowBarAnimation.completed}
                    />
                  )}
                  {visibleTaskFlowBarKeys.includes("active") && (
                    <Bar
                      yAxisId="main"
                      dataKey="active"
                      name={isHealthStatusMode ? "Needs Attention" : "Active"}
                      fill={getTaskFlowBarFill(taskFlowLineColors.active)}
                      stroke={undefined}
                      strokeWidth={taskFlowBarStrokeWidth}
                      barSize={taskFlowBarSize}
                      radius={[4, 4, 0, 0]}
                      shape={taskFlowSeriesShapes.active.bar}
                      {...taskFlowBarAnimation.active}
                    />
                  )}
                  {visibleTaskFlowBarKeys.includes("overdue") &&
                    (isTaskDueStatusMode || isHealthStatusMode) && (
                      <Bar
                        yAxisId="main"
                        dataKey="overdue"
                        name={isHealthStatusMode ? "At Risk" : "Overdue"}
                        fill={getTaskFlowBarFill(taskFlowLineColors.overdue)}
                        stroke={undefined}
                        strokeWidth={taskFlowBarStrokeWidth}
                        barSize={taskFlowBarSize}
                        radius={[4, 4, 0, 0]}
                        shape={taskFlowSeriesShapes.overdue.bar}
                        {...taskFlowBarAnimation.overdue}
                      />
                    )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "created", "line") &&
                    showCreatedTask && (
                      <Line
                        yAxisId="main"
                        type={TASK_FLOW_BOUNDED_CURVE}
                        dataKey="created"
                        name="Created"
                        stroke={CREATED_LINE}
                        strokeWidth={2}
                        strokeLinecap="round"
                        fill="none"
                        connectNulls
                        shape={taskFlowSeriesShapes.created.bottomClippedLine}
                        dot={getTaskFlowLineDot(
                          CREATED_LINE,
                          "created",
                          visibleTaskFlowBarKeys,
                          taskFlowBarSize,
                          taskFlowBarGap,
                        )}
                        activeDot={getTaskFlowActiveDot(
                          CREATED_LINE,
                          "created",
                          visibleTaskFlowBarKeys,
                          taskFlowBarSize,
                          taskFlowBarGap,
                        )}
                        {...chartSeriesAnimation}
                      />
                    )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "active", "line") && (
                    <Line
                      yAxisId="main"
                      type={TASK_FLOW_BOUNDED_CURVE}
                      dataKey="active"
                      name={isHealthStatusMode ? "Needs Attention" : "Active"}
                      stroke={taskFlowLineColors.active}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray={TASK_FLOW_LINE_STROKE_DASH}
                      fill="none"
                      connectNulls
                      shape={taskFlowSeriesShapes.active.bottomClippedLine}
                      dot={getTaskFlowLineDot(
                        taskFlowLineColors.active,
                        "active",
                        visibleTaskFlowBarKeys,
                        taskFlowBarSize,
                        taskFlowBarGap,
                      )}
                      activeDot={getTaskFlowActiveDot(
                        taskFlowLineColors.active,
                        "active",
                        visibleTaskFlowBarKeys,
                        taskFlowBarSize,
                        taskFlowBarGap,
                      )}
                      {...chartSeriesAnimation}
                    />
                  )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "completed", "line") && (
                    <Line
                      yAxisId="main"
                      type={TASK_FLOW_BOUNDED_CURVE}
                      dataKey="completed"
                      name={isHealthStatusMode ? "Healthy" : "Completed"}
                      stroke={taskFlowLineColors.completed}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                      connectNulls
                      shape={taskFlowSeriesShapes.completed.bottomClippedLine}
                      dot={getTaskFlowLineDot(
                        taskFlowLineColors.completed,
                        "completed",
                        visibleTaskFlowBarKeys,
                        taskFlowBarSize,
                        taskFlowBarGap,
                      )}
                      activeDot={getTaskFlowActiveDot(
                        taskFlowLineColors.completed,
                        "completed",
                        visibleTaskFlowBarKeys,
                        taskFlowBarSize,
                        taskFlowBarGap,
                      )}
                      {...chartSeriesAnimation}
                    />
                  )}
                  {isTaskFlowLayerOn(taskFlowSeriesVisibility, "overdue", "line") &&
                    (isTaskDueStatusMode || isHealthStatusMode) && (
                      <Line
                        yAxisId="main"
                        type={TASK_FLOW_BOUNDED_CURVE}
                        dataKey="overdue"
                        name={isHealthStatusMode ? "At Risk" : "Overdue"}
                        stroke={taskFlowLineColors.overdue}
                        strokeWidth={2}
                        strokeLinecap="round"
                        fill="none"
                        connectNulls
                        shape={taskFlowSeriesShapes.overdue.bottomClippedLine}
                        dot={getTaskFlowLineDot(
                          taskFlowLineColors.overdue,
                          "overdue",
                          visibleTaskFlowBarKeys,
                          taskFlowBarSize,
                          taskFlowBarGap,
                        )}
                        activeDot={getTaskFlowActiveDot(
                          taskFlowLineColors.overdue,
                          "overdue",
                          visibleTaskFlowBarKeys,
                          taskFlowBarSize,
                          taskFlowBarGap,
                        )}
                        {...chartSeriesAnimation}
                      />
                    )}
                </>
              ) : (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="overduePercent"
                    name="Overdue %"
                    stroke={OVERDUE_PERCENT_LINE}
                    strokeWidth={overdueSeriesVisibility.overduePercent ? 2 : 0}
                    strokeLinecap="round"
                    shape={edgeToEdgeShapes.overdueLine}
                    dot={
                      overdueSeriesVisibility.overduePercent
                        ? renderOverduePercentDot
                        : false
                    }
                    activeDot={
                      overdueSeriesVisibility.overduePercent
                        ? renderOverduePercentActiveDot
                        : false
                    }
                    {...chartSeriesAnimation}
                  />
                  {overdueSeriesVisibility.overdueCount && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="overdueCount"
                      name="Overdue count"
                      stroke={OVERDUE_COUNT_LINE}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      strokeLinecap="round"
                      shape={edgeToEdgeShapes.overdueLine}
                      dot={renderOverdueCountDot}
                      activeDot={renderOverdueCountActiveDot}
                      {...chartSeriesAnimation}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
          {!isChartExpanded && tooltipRow ? (
            <div
              style={{
                position: "absolute",
                left: Number.isFinite(chartFocus.x)
                  ? chartFocus.x + (showTooltipOnLeftSide ? -170 : 18)
                  : 18,
                top: (Number.isFinite(chartFocus.y) ? chartFocus.y : 48) + 14,
                transform: "translateY(-100%)",
                pointerEvents: "none",
                zIndex: 400,
              }}
            >
              {renderActiveTooltip()}
            </div>
          ) : null}
        </div>

        <div className="board-overdue-health-chart__legend board-overdue-health-chart__legend">
          {type[0]?.filter_id === 22 && !taskFlowMode && (
            <div className="board-overdue-health-chart__legend board-overdue-health-chart__legend--top">
              <button
                type="button"
                className={`board-overdue-health-chart__legend-item`}
                aria-pressed={overdueSeriesVisibility.overduePercent}
                style={{
                  opacity: overdueSeriesVisibility.overduePercent ? 1 : 0.4,
                  cursor: "pointer",
                }}
                title="Show or hide Overdue % on chart"
                onClick={() => toggleOverdueSeries("overduePercent")}
              >
                <svg width="24" height="10" aria-hidden>
                  <line
                    x1="0"
                    y1="5"
                    x2="24"
                    y2="5"
                    stroke={OVERDUE_PERCENT_LINE}
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="5" r="3" fill={OVERDUE_PERCENT_LINE} />
                </svg>
                Overdue %
              </button>
              <button
                type="button"
                className={`board-overdue-health-chart__legend-item`}
                aria-pressed={overdueSeriesVisibility.overdueCount}
                style={{
                  opacity: overdueSeriesVisibility.overdueCount ? 1 : 0.4,
                  cursor: "pointer",
                }}
                title="Show or hide Overdue Count on chart"
                onClick={() => toggleOverdueSeries("overdueCount")}
              >
                <svg width="24" height="10" aria-hidden>
                  <line
                    x1="0"
                    y1="5"
                    x2="24"
                    y2="5"
                    stroke={OVERDUE_COUNT_LINE}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <circle cx="12" cy="5" r="3" fill={OVERDUE_COUNT_LINE} />
                </svg>
                Overdue Count
              </button>
            </div>
          )}
          {(type[0]?.filter_id === 23 || taskFlowMode) && (
            <>
              {showCreatedTask && (
                <TaskFlowLegendItem
                  label="Created"
                  color={CREATED_LINE}
                  barVisible={isTaskFlowLayerOn(
                    taskFlowSeriesVisibility,
                    "created",
                    "bar",
                  )}
                  lineVisible={isTaskFlowLayerOn(
                    taskFlowSeriesVisibility,
                    "created",
                    "line",
                  )}
                  onToggleBar={() => toggleTaskFlowSeriesLayer("created", "bar")}
                  onToggleLine={() => toggleTaskFlowSeriesLayer("created", "line")}
                />
              )}
              <TaskFlowLegendItem
                label={isHealthStatusMode ? "Healthy" : "Completed"}
                color={taskFlowLineColors.completed}
                barVisible={isTaskFlowLayerOn(
                  taskFlowSeriesVisibility,
                  "completed",
                  "bar",
                )}
                lineVisible={isTaskFlowLayerOn(
                  taskFlowSeriesVisibility,
                  "completed",
                  "line",
                )}
                onToggleBar={() => toggleTaskFlowSeriesLayer("completed", "bar")}
                onToggleLine={() => toggleTaskFlowSeriesLayer("completed", "line")}
              />
              <TaskFlowLegendItem
                label={isHealthStatusMode ? "Needs Attention" : "Active"}
                color={taskFlowLineColors.active}
                dashed
                barVisible={isTaskFlowLayerOn(taskFlowSeriesVisibility, "active", "bar")}
                lineVisible={isTaskFlowLayerOn(
                  taskFlowSeriesVisibility,
                  "active",
                  "line",
                )}
                onToggleBar={() => toggleTaskFlowSeriesLayer("active", "bar")}
                onToggleLine={() => toggleTaskFlowSeriesLayer("active", "line")}
              />
              {(isTaskDueStatusMode || isHealthStatusMode) && (
                <TaskFlowLegendItem
                  label={isHealthStatusMode ? "At Risk" : "Overdue"}
                  color={taskFlowLineColors.overdue}
                  barVisible={isTaskFlowLayerOn(
                    taskFlowSeriesVisibility,
                    "overdue",
                    "bar",
                  )}
                  lineVisible={isTaskFlowLayerOn(
                    taskFlowSeriesVisibility,
                    "overdue",
                    "line",
                  )}
                  onToggleBar={() => toggleTaskFlowSeriesLayer("overdue", "bar")}
                  onToggleLine={() => toggleTaskFlowSeriesLayer("overdue", "line")}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isChartExpanded && (
        <div
          className="board-overdue-health-chart__backdrop"
          onClick={triggerOutsideClickPulse}
          aria-hidden="true"
        />
      )}
      {isChartExpanded ? (
        <div
          ref={expandedShellRef}
          className={`board-overdue-health-chart__expanded-shell${
            isOutsideClickPulseActive
              ? " board-overdue-health-chart__expanded-shell--outside-click-pulse"
              : ""
          }`}
        >
          <button
            type="button"
            className="board-overdue-health-chart__close"
            onClick={() => setIsChartExpanded(false)}
            aria-label="Close expanded chart"
          >
            <img src={closeIcon} alt="close icon" className="close-popup-modal__icon" />
          </button>
          {chartPanel}
          {tooltipRow && expandedTooltipStyle ? (
            <div
              className="board-overdue-health-chart__tooltip-float"
              style={expandedTooltipStyle}
            >
              {renderActiveTooltip()}
            </div>
          ) : null}
        </div>
      ) : (
        chartPanel
      )}
    </>
  );
};

export default memo(BoardOverdueHealthChart);

import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
} from "recharts";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  COLORS_VALUES,
  getVelocityRangeParams,
  TOOL_TIP_LIST,
} from "../../../utils/dashboard";
import useAuth from "../../../hooks/useAuth";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const CustomTooltip = ({ active, payload, label, COLOR_MAP }) => {
  if (!active || !payload?.length) return null;

  const rows = payload.filter((p) =>
    ["healthy", "needsAttention", "atRisk"].includes(p.dataKey),
  );

  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="velocity-widget__chart-tooltip">
      <p style={{ margin: "0 0 6px" }}>
        <strong>{label}</strong>
      </p>
      {rows.map((item) => {
        const pct = total ? ((Number(item.value || 0) / total) * 100).toFixed(1) : 0;

        const labelObj = TOOL_TIP_LIST.find((obj) => obj[item.dataKey]);
        const labelText = labelObj ? labelObj[item.dataKey] : item.dataKey;

        return (
          <div
            key={item.dataKey}
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
                  background: COLOR_MAP[item.dataKey],
                  width: "10px",
                  height: "10px",
                  display: "block",
                }}
              />
              <span>{labelText}</span>
            </p>
            <span style={{ fontWeight: "600", width: "35px" }}>
              {Math.round(item.value)} %
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Helper: generate weeks for a single month
const generateWeekData = (monthData) => {
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const start = new Date(monthData.dateFrom);
  const end = new Date(monthData.dateTo);
  const totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
  const daysPerWeek = Math.floor(totalDays / 4);

  return weeks.map((week, i) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + i * daysPerWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + daysPerWeek - 1);

    const healthy = Math.floor(monthData.healthy / 4);
    const needsAttention = Math.floor(monthData.needsAttention / 4);
    const atRisk = Math.floor(monthData.atRisk / 4);
    const total = healthy + needsAttention + atRisk;

    return {
      key: week,
      healthy,
      needsAttention,
      atRisk,
      total,
      dateFrom: weekStart.toISOString().slice(0, 10),
      dateTo: weekEnd.toISOString().slice(0, 10),
    };
  });
};

// Helper: generate days for a single week
const generateDayData = (weekData) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const start = new Date(weekData.dateFrom);
  const end = new Date(weekData.dateTo);
  const totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;

  return days.map((day, i) => {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const healthy = Math.floor(weekData.healthy / 7);
    const needsAttention = Math.floor(weekData.needsAttention / 7);
    const atRisk = Math.floor(weekData.atRisk / 7);
    const total = healthy + needsAttention + atRisk;

    return {
      key: day,
      healthy,
      needsAttention,
      atRisk,
      total,
      dateFrom: dayDate.toISOString().slice(0, 10),
      dateTo: dayDate.toISOString().slice(0, 10),
    };
  });
};

const VelocityWidget = ({
  data = [],
  summary = {},
  type = "month",
  defaultRangeType = "CURRENT_MONTH",
  onRangeSelected,
  dashboardMaterValue,
  barHighlightMonth,
  apiLoading,
  getSelectedDate,
  fromPage,
}) => {
  const [{ data: auth }] = useAuth();
  const [chartType, setChartType] = useState(fromPage === "workspace" ? "bar" : "line");
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [hoveredBarKey, setHoveredBarKey] = useState(null);
  const isFirstRender = useRef(true);
  const onRangeSelectedRef = useRef(onRangeSelected);
  const lastEmittedPayloadRef = useRef("");

  useEffect(() => {
    onRangeSelectedRef.current = onRangeSelected;
  }, [onRangeSelected]);

  // Normalize data based on type
  const velocityData = useMemo(() => {
    if (!data || !data.length) return [];

    let normalized = data.map((item) => ({
      key: item.key,
      healthy: item.healthy,
      needsAttention: item.needsAttention,
      atRisk: item.atRisk,
      total: item.healthy + item.needsAttention + item.atRisk,
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
      name: item.healthLabel,
    }));

    // Single month → show weeks
    if (type === "month" && normalized.length === 1) {
      normalized = generateWeekData(normalized[0]);
    }

    // Single week → show days
    if (type === "week" && normalized.length === 1) {
      normalized = generateDayData(normalized[0]);
    }

    return normalized;
  }, [data, type]);

  const summaryData = useMemo(() => {
    if (!summary?.primary) return null;

    return {
      primary: summary.primary,
      compareWith: summary.compareWith,
      overallHealthPercentage: summary.overallHealthPercentage,
      comparison: summary.comparison || [],
    };
  }, [summary]);

  const defaultMonth = velocityData?.[0]?.key || "Period";
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedLegend, setSelectedLegend] = useState(null);

  const lightenColor = (hex, amount = 20) => {
    const safeHex = String(hex || "").replace("#", "");
    if (!/^[0-9A-Fa-f]{6}$/.test(safeHex)) return hex;

    const mix = (channel) =>
      Math.round(channel + ((255 - channel) * amount) / 100)
        .toString(16)
        .padStart(2, "0");

    const r = parseInt(safeHex.slice(0, 2), 16);
    const g = parseInt(safeHex.slice(2, 4), 16);
    const b = parseInt(safeHex.slice(4, 6), 16);
    return `#${mix(r)}${mix(g)}${mix(b)}`;
  };

  const getFill = (month, key) => {
    const baseColor = COLORS_VALUES(dashboardMaterValue)[key];
    if (hoveredBarKey && hoveredBarKey === month) {
      return lightenColor(baseColor, 22);
    }

    if (selectedLegend) {
      return selectedLegend === key
        ? baseColor
        : COLORS_VALUES(dashboardMaterValue).disabled;
    }

    return baseColor;
  };

  const buildRangePayload = useCallback(
    (keys) => {
      if (!Array.isArray(keys) || keys.length !== 2) return null;

      const [first, second] = keys;
      const firstItem = velocityData.find((d) => d.key === first);
      const secondItem = velocityData.find((d) => d.key === second);

      if (!firstItem || !secondItem) return null;

      return {
        fromDate: firstItem.dateFrom,
        toDate: firstItem.dateTo,
        compareWithFromDate: secondItem.dateFrom,
        compareWithToDate: secondItem.dateTo,
      };
    },
    [velocityData],
  );

  const emitRangeSelected = useCallback((payload) => {
    if (!payload || !onRangeSelectedRef.current) return;

    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastEmittedPayloadRef.current) return;

    lastEmittedPayloadRef.current = payloadKey;
    onRangeSelectedRef.current(payload);
  }, []);

  useEffect(() => {
    if (!velocityData?.length) return;

    const startEndMonth =
      defaultRangeType === "CUSTOM_RANGE"
        ? {
            compareThisMonth: getSelectedDate?.start,
            compareWithMonth: getSelectedDate?.end,
          }
        : getVelocityRangeParams(defaultRangeType, "graph");
    if (!startEndMonth) return;

    const start = dayjs(startEndMonth.compareWithMonth);
    const end = dayjs(startEndMonth.compareThisMonth);

    // Ensure correct order
    const [from, to] = start.isBefore(end) ? [start, end] : [end, start];

    const selectedKeys = velocityData
      .filter((d) => {
        const current = dayjs(d.dateFrom);
        return (
          current.isSameOrAfter(from, "month") && current.isSameOrBefore(to, "month")
        );
      })
      .map((d) => d.key);

    setSelectedPoints(selectedKeys);

    if (selectedKeys.length) {
      setSelectedMonth(selectedKeys[selectedKeys.length - 1]);
    }

    if (selectedKeys.length >= 2) {
      const payload = buildRangePayload(selectedKeys);
      emitRangeSelected(payload);
    }
  }, [velocityData, defaultRangeType, buildRangePayload, emitRangeSelected]);

  useEffect(() => {
    isFirstRender.current = true;
    lastEmittedPayloadRef.current = "";
  }, [defaultRangeType]);

  useEffect(() => {
    // 🚫 Prevent first render trigger
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (selectedPoints.length === 2) {
      const payload = buildRangePayload(selectedPoints);
      emitRangeSelected(payload);
    }
  }, [selectedPoints, velocityData, buildRangePayload, emitRangeSelected]);

  const handleSelectPoint = (key) => {
    setSelectedPoints((prev) => {
      let newPoints;
      if (prev.includes(key)) {
        newPoints = prev.filter((k) => k !== key);
      } else if (prev.length < 2) {
        newPoints = [...prev, key];
      } else {
        newPoints = [prev[1], key]; // replace first
      }

      return newPoints;
    });
  };

  const CustomDot = ({ cx, cy, payload, type }) => {
    const color = getFill(payload.key, type);
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke={color} />;
  };

  const getRadius = (entry, type) => {
    const order = ["healthy", "needsAttention", "atRisk"];

    const values = order.filter((key) => entry[key] > 0);

    const first = values[0];
    const last = values[values.length - 1];

    if (type === first && type === last) return [8, 8, 8, 8]; // single bar
    if (type === first) return [0, 0, 8, 8]; // bottom
    if (type === last) return [8, 8, 0, 0]; // top

    return [0, 0, 0, 0]; // middle
  };

  const displayYear = useMemo(() => {
    const y1 = dayjs(barHighlightMonth?.compareThisMonth).year();
    const y2 = dayjs(barHighlightMonth?.compareWithMonth).year();

    const min = Math.min(y1, y2);
    const max = Math.max(y1, y2);

    return min === max ? `${min}` : `${min} - ${String(max).slice(-2)}`;
  }, [barHighlightMonth]);
  const isEmpty = velocityData === undefined || velocityData?.length === 0;
  const isCompareEmpty = summaryData === null || summaryData?.length === 0;

  return (
    <section className="velocity-widget" aria-label="Velocity trend widget">
      <header className="velocity-widget__head">
        <div>
          <h2 className="velocity-widget__title">
            Workspace Health Overview
            {/* Monthly Performance Anlaysis */}
          </h2>
          <p className="velocity-widget__subtitle">
            {type === "month"
              ? "Same-date month-to-date comparison with last month."
              : type === "week"
                ? "Two-weeks comparison trend. Click to view detailed insights."
                : "Two-days comparison trend. Click to view detailed insights."}
          </p>
        </div>
      </header>

      <div className="velocity-widget__chart-wrap">
        {apiLoading && isEmpty ? (
          <DashboardChartSkeleton
            variant="bar"
            height={290}
            barCount={6}
            className="velocity-widget__chart-skeleton"
            ariaLabel="Loading workspace health overview chart"
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={290}>
              {isEmpty ? (
                <div
                  style={{
                    height: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-light-red-3)",
                    fontSize: "14px",
                    fontWeight: 500,
                    padding: "10px",
                    width: "300px",
                  }}
                >
                  No data found
                </div>
              ) : (
                <ComposedChart
                  data={velocityData}
                  margin={{ top: 12, right: 24, bottom: 24, left: 0 }}
                  onMouseLeave={() => setHoveredBarKey(null)}
                >
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e6e6e7" />
              <XAxis
                dataKey="key"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6D6E78", fontSize: 12 }}
                padding={chartType === "line" ? { left: 20, right: 10 } : ""}
              />
              <YAxis
                width={35}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                interval={0}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: "#6D6E78", fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip COLOR_MAP={COLORS_VALUES(dashboardMaterValue)} />}
                cursor={false}
              />

              {chartType === "bar" ? (
                <>
                  <Bar dataKey="healthy" stackId="a" barSize={32} activeBar={false}>
                    {velocityData.map((entry) => (
                      <Cell
                        key={`healthy-${entry.key}`}
                        fill={getFill(entry.key, "healthy")}
                        radius={getRadius(entry, "healthy")}
                        onMouseEnter={() => setHoveredBarKey(entry.key)}
                        // cursor="pointer"
                        // onClick={() => handleSelectPoint(entry.key)}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="needsAttention"
                    stackId="a"
                    barSize={32}
                    activeBar={false}
                  >
                    {velocityData.map((entry) => (
                      <Cell
                        key={`attention-${entry.key}`}
                        fill={getFill(entry.key, "needsAttention")}
                        radius={getRadius(entry, "needsAttention")}
                        onMouseEnter={() => setHoveredBarKey(entry.key)}
                        // cursor="pointer"
                        // onClick={() => handleSelectPoint(entry.key)}
                      />
                    ))}
                  </Bar>

                  <Bar dataKey="atRisk" stackId="a" barSize={32} activeBar={false}>
                    {velocityData.map((entry) => (
                      <Cell
                        key={`risk-${entry.key}`}
                        fill={getFill(entry.key, "atRisk")}
                        radius={getRadius(entry, "atRisk")}
                        onMouseEnter={() => setHoveredBarKey(entry.key)}
                        // cursor="pointer"
                        // onClick={() => handleSelectPoint(entry.key)}
                      />
                    ))}
                  </Bar>
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="healthy"
                    stroke={COLORS_VALUES(dashboardMaterValue).healthy}
                    strokeWidth={2}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="needsAttention"
                    stroke={COLORS_VALUES(dashboardMaterValue).needsAttention}
                    strokeWidth={2}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="atRisk"
                    stroke={COLORS_VALUES(dashboardMaterValue).atRisk}
                    strokeWidth={2}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                </>
              )}
            </ComposedChart>
              )}
            </ResponsiveContainer>
            {!isEmpty && (
              <>
                <div className="velocity-year-indicators">
                  Year: <strong>{displayYear}</strong>
                </div>

                <div className="velocity-indicators">
                  <div className="velocity-indicators-list">
                    <span
                      className="indicator-dot"
                      style={{
                        background: COLORS_VALUES(dashboardMaterValue).healthy,
                      }}
                    ></span>
                    Healthy
                  </div>

                  <div className="velocity-indicators-list">
                    <span
                      className="indicator-dot"
                      style={{
                        background: COLORS_VALUES(dashboardMaterValue).needsAttention,
                      }}
                    ></span>
                    Needs Attention
                  </div>

                  <div className="velocity-indicators-list">
                    <span
                      className="indicator-dot"
                      style={{
                        background: COLORS_VALUES(dashboardMaterValue).atRisk,
                      }}
                    ></span>
                    At Risk
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* VELOCITY TREND */}
      {fromPage === "workspace" && <div className="velocity-widget__trend"></div>}
    </section>
  );
};

export default memo(VelocityWidget);

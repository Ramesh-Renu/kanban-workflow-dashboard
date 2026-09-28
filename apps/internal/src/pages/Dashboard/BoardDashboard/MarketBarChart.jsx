import React, { memo, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardExpandablePanel from "../utils/DashboardExpandablePanel";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";
import { boardExpandIcon } from "assets/images";

const BAR_COLOR = "#00ADF0";

const MARKET_SCHEMA = {
  topFive: "topFiveMarkets",
  all: "allMarkets",
  overall: "overallMarketCount",
  name: "marketName",
  count: "marketCount",
  id: "marketId",
};

const getNumericMetric = (value, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
};

const mapMarketRows = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((row, index) => ({
      id: row[MARKET_SCHEMA.id] ?? `${row[MARKET_SCHEMA.name]}-${index}`,
      name: row[MARKET_SCHEMA.name] ?? "—",
      count: getNumericMetric(row[MARKET_SCHEMA.count]),
      value: getNumericMetric(row[MARKET_SCHEMA.count]),
    }))
    .filter((row) => row.count > 0);

const buildXAxisDomain = (rows = []) => {
  const peak = Math.max(...rows.map((row) => row.count), 0);
  if (peak <= 0) return [0, 1];

  const paddedMax = peak * 1.08;
  const step = paddedMax <= 5 ? 0.5 : paddedMax <= 10 ? 1 : Math.ceil(paddedMax / 5);
  const domainMax = Math.ceil(paddedMax / step) * step;

  return [0, domainMax];
};

const MarketBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload ?? {};

  return (
    <div className="board-market-bar-chart__tooltip">
      <strong>{row.name}</strong>
      <span>{row.count} orders</span>
    </div>
  );
};

const MarketBarChart = ({
  title = "Orders by Stock Exchange",
  subtitle = "Order volume across major global stock exchanges.",
  data = null,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const overallCount = useMemo(
    () => getNumericMetric(data?.[MARKET_SCHEMA.overall]),
    [data],
  );

  const collapsedRows = useMemo(
    () => mapMarketRows(data?.[MARKET_SCHEMA.all]).slice(0, 9),
    [data],
  );

  const expandedRows = useMemo(() => mapMarketRows(data?.[MARKET_SCHEMA.all]), [data]);

  const showEmptyState = overallCount <= 0 || collapsedRows.length === 0;

  return (
    <DashboardExpandablePanel
      className="board-market-bar-chart"
      ariaLabel={title || "Market distribution"}
      expandDisabled={loading}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      showDefaultExpandButton={false}
      header={
        <div className="board-market-bar-chart__head">
          <div className="board-market-bar-chart__head-text">
            {title ? <h4 className="board-market-bar-chart__title">{title}</h4> : null}
            {subtitle ? (
              <p className="board-market-bar-chart__subtitle">{subtitle}</p>
            ) : null}
          </div>
          {!isExpanded && (
            <button
              type="button"
              className="board-overdue-health-chart__subtitle-expand"
              aria-label={`Expand ${title || "chart"}`}
              onClick={() => setIsExpanded(true)}
              disabled={loading || showEmptyState}
            >
              Expand &#160;
              <img src={boardExpandIcon} alt="" aria-hidden />
            </button>
          )}
        </div>
      }
    >
      {(panelExpanded) => {
        const chartRows = panelExpanded ? expandedRows : collapsedRows;
        const [xMin, xMax] = buildXAxisDomain(chartRows);
        const chartHeight = panelExpanded
          ? Math.max(320, chartRows.length * 52 + 48)
          : Math.max(220, chartRows.length * 44 + 40);

        if (loading) {
          return (
            <DashboardChartSkeleton
              variant="horizontalBar"
              height={chartHeight}
              barCount={panelExpanded ? 8 : 5}
              className="board-market-bar-chart__chart-skeleton"
              ariaLabel={`Loading ${title || "chart"}`}
            />
          );
        }

        if (showEmptyState) {
          return (
            <div className="board-market-bar-chart__empty">
              <p className="workspace-widget__no-data-found w-100">No Data Found</p>
            </div>
          );
        }

        return (
          <div
            className={`board-market-bar-chart__body${
              panelExpanded ? " board-market-bar-chart__body--expanded" : ""
            }`}
          >
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                layout="vertical"
                data={chartRows}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E8EDF3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[xMin, xMax]}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={{ stroke: "#DDDDDD" }}
                  tickLine={false}
                  allowDecimals={xMax <= 5}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fill: "#334155", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<MarketBarTooltip />}
                  cursor={{ fill: "rgba(0, 173, 240, 0.08)" }}
                  wrapperStyle={{ outline: "none", zIndex: 20 }}
                  contentStyle={{
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                    padding: 0,
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={panelExpanded ? 28 : 22}
                >
                  {chartRows.map((row) => (
                    <Cell key={row.id} fill={BAR_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }}
    </DashboardExpandablePanel>
  );
};

export default memo(MarketBarChart);

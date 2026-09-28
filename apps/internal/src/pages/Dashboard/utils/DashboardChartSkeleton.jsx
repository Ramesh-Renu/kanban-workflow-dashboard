import React, { memo, useMemo } from "react";

const DEFAULT_BAR_HEIGHTS = [86, 72, 94, 68, 88, 76, 82, 70];
const DEFAULT_HORIZONTAL_BAR_WIDTHS = [78, 62, 88, 54, 72];

const DonutChartSkeleton = ({ expanded = false, legendCount = 3 }) => {
  const ringSize = expanded ? 256 : 184;
  const ringThickness = expanded ? 40 : 30;
  const holeSize = ringSize - ringThickness * 2;

  const legendRows = useMemo(
    () => Array.from({ length: legendCount }, (_, index) => index),
    [legendCount],
  );

  return (
    <div
      className={`dashboard-chart-skeleton dashboard-chart-skeleton--donut${
        expanded ? " dashboard-chart-skeleton--donut-expanded" : ""
      }`}
      aria-hidden
    >
      <div className="dashboard-chart-skeleton__donut-layout">
        <div
          className="dashboard-chart-skeleton__donut-wrap"
          style={{ width: ringSize, height: ringSize }}
        >
          <div
            className="dashboard-chart-skeleton__donut-ring dashboard-chart-skeleton__shimmer"
            style={{ width: ringSize, height: ringSize }}
          >
            <div
              className="dashboard-chart-skeleton__donut-hole"
              style={{ width: holeSize, height: holeSize }}
            />
          </div>
          <div className="dashboard-chart-skeleton__donut-center">
            <span className="dashboard-chart-skeleton__line dashboard-chart-skeleton__line--lg dashboard-chart-skeleton__shimmer" />
            <span className="dashboard-chart-skeleton__line dashboard-chart-skeleton__line--sm dashboard-chart-skeleton__shimmer" />
          </div>
        </div>

        <ul className="dashboard-chart-skeleton__legend">
          {legendRows.map((row) => (
            <li key={row} className="dashboard-chart-skeleton__legend-item">
              <span className="dashboard-chart-skeleton__legend-dot dashboard-chart-skeleton__shimmer" />
              <span className="dashboard-chart-skeleton__legend-label dashboard-chart-skeleton__shimmer" />
              <span className="dashboard-chart-skeleton__legend-value dashboard-chart-skeleton__shimmer" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const BarChartSkeleton = ({ height = 290, barCount = 6 }) => {
  const bars = useMemo(() => {
    const heights = DEFAULT_BAR_HEIGHTS.slice(0, barCount);
    while (heights.length < barCount) {
      heights.push(DEFAULT_BAR_HEIGHTS[heights.length % DEFAULT_BAR_HEIGHTS.length]);
    }
    return heights;
  }, [barCount]);

  const yTicks = [100, 80, 60, 40, 20, 0];

  return (
    <div
      className="dashboard-chart-skeleton dashboard-chart-skeleton--bar"
      style={{ height }}
      aria-hidden
    >
      <div className="dashboard-chart-skeleton__bar-chart">
        <div className="dashboard-chart-skeleton__y-axis">
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="dashboard-chart-skeleton__axis-tick dashboard-chart-skeleton__shimmer"
            />
          ))}
        </div>

        <div className="dashboard-chart-skeleton__plot">
          <div className="dashboard-chart-skeleton__grid-lines">
            {yTicks.map((tick) => (
              <span key={tick} className="dashboard-chart-skeleton__grid-line" />
            ))}
          </div>

          <div className="dashboard-chart-skeleton__bars">
            {bars.map((barHeight, index) => (
              <div
                key={`bar-${index}`}
                className="dashboard-chart-skeleton__bar-column"
                style={{ height: `${barHeight}%` }}
              >
                <span className="dashboard-chart-skeleton__bar-segment dashboard-chart-skeleton__shimmer dashboard-chart-skeleton__bar-segment--top" />
                <span className="dashboard-chart-skeleton__bar-segment dashboard-chart-skeleton__shimmer dashboard-chart-skeleton__bar-segment--middle" />
                <span className="dashboard-chart-skeleton__bar-segment dashboard-chart-skeleton__shimmer dashboard-chart-skeleton__bar-segment--bottom" />
              </div>
            ))}
          </div>

          <div className="dashboard-chart-skeleton__x-axis">
            {bars.map((_, index) => (
              <span
                key={`x-${index}`}
                className="dashboard-chart-skeleton__axis-tick dashboard-chart-skeleton__shimmer"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-chart-skeleton__bar-footer">
        <span className="dashboard-chart-skeleton__footer-year dashboard-chart-skeleton__shimmer" />
        <div className="dashboard-chart-skeleton__footer-legend">
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index} className="dashboard-chart-skeleton__footer-legend-item">
              <span className="dashboard-chart-skeleton__legend-dot dashboard-chart-skeleton__shimmer" />
              <span className="dashboard-chart-skeleton__footer-legend-label dashboard-chart-skeleton__shimmer" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const HorizontalBarChartSkeleton = ({ height = 220, barCount = 5 }) => {
  const bars = useMemo(() => {
    const widths = DEFAULT_HORIZONTAL_BAR_WIDTHS.slice(0, barCount);
    while (widths.length < barCount) {
      widths.push(
        DEFAULT_HORIZONTAL_BAR_WIDTHS[widths.length % DEFAULT_HORIZONTAL_BAR_WIDTHS.length],
      );
    }
    return widths;
  }, [barCount]);

  return (
    <div
      className="dashboard-chart-skeleton dashboard-chart-skeleton--horizontal-bar"
      style={{ minHeight: height }}
      aria-hidden
    >
      <div className="dashboard-chart-skeleton__horizontal-bars">
        {bars.map((width, index) => (
          <div key={`hbar-${index}`} className="dashboard-chart-skeleton__horizontal-row">
            <span className="dashboard-chart-skeleton__horizontal-label dashboard-chart-skeleton__shimmer" />
            <span
              className="dashboard-chart-skeleton__horizontal-bar dashboard-chart-skeleton__shimmer"
              style={{ width: `${width}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardChartSkeleton = ({
  variant = "bar",
  height,
  expanded = false,
  barCount,
  legendCount = 3,
  className = "",
  ariaLabel = "Loading chart",
}) => {
  const content = (() => {
    switch (variant) {
      case "donut":
        return <DonutChartSkeleton expanded={expanded} legendCount={legendCount} />;
      case "horizontalBar":
        return (
          <HorizontalBarChartSkeleton
            height={height ?? 220}
            barCount={barCount ?? 5}
          />
        );
      case "bar":
      default:
        return <BarChartSkeleton height={height ?? 290} barCount={barCount ?? 6} />;
    }
  })();

  return (
    <div
      className={`dashboard-chart-skeleton-wrap${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {content}
    </div>
  );
};

export default memo(DashboardChartSkeleton);

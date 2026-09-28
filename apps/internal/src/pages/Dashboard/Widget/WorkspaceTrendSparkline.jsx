import React, { memo, useId, useMemo } from "react";
import { curveCardinal } from "d3-shape";
import { Area, AreaChart } from "recharts";

/** Slight corner radius on the mountain — not a full smooth spline */
const MOUNTAIN_CURVE = curveCardinal.tension(0.2);

const WorkspaceTrendSparkline = ({
  data = [],
  color = "#16A34A",
  width = 110,
  height = 36,
}) => {
  const gradientId = useId().replace(/:/g, "");

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2) return null;
    return data.map((value, index) => ({
      index,
      value: Math.max(0, Number(value) || 0),
    }));
  }, [data]);

  if (!chartData) {
    return <span className="workspace-widget__sparkline-empty">—</span>;
  }

  return (
    <div
      className="workspace-widget__sparkline"
      style={{ width, height, minWidth: width, minHeight: height }}
      aria-hidden
    >
      <AreaChart
        width={width}
        height={height}
        data={chartData}
        margin={{ top: 4, right: 2, bottom: 2, left: 2 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <Area
          type={MOUNTAIN_CURVE}
          dataKey="value"
          stroke={color}
          strokeWidth={1.25}
          fill={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          isAnimationActive={true}
        />
      </AreaChart>
    </div>
  );
};

export default memo(WorkspaceTrendSparkline);

import React, { memo, useEffect, useId, useMemo, useState } from "react";
import { COLORS_VALUES, getTrendDirection } from "utils/dashboard";
import SkeletonLoading from "components/common/SkeletonLoading";

const DEFAULT_COLORS = {
  atRisk: "#C8104A",
  needsAttention: "#D97A00",
  healthy: "#48C19E",
};

/** Left → right = low → high (At Risk → Needs Attention → Healthy) */
const SEGMENTS = [
  { id: "atRisk", name: "At Risk", metricKey: "atRisk", colorKey: "atRisk" },
  {
    id: "needsAttention",
    name: "Needs Attention",
    metricKey: "needsAttention",
    colorKey: "needsAttention",
  },
  { id: "healthy", name: "Healthy", metricKey: "healthy", colorKey: "healthy" },
];

/**
 * Outer rim ≈ 65% of a full circle, open at the bottom.
 * Angle 0 = 12 o'clock; positive angles sweep clockwise.
 */
const ARC_SWEEP = 360 * 0.65; // 234°
const ARC_START = -ARC_SWEEP / 2;
const ARC_END = ARC_START + ARC_SWEEP;
const CX = 140;
const CY = 128;
const RADIUS = 108;
const RIM_WIDTH = 6;
/** Inner white hub — larger so content sits comfortably */
const HUB_R = 72;
/** Soft inset glow — kept well inside the rim so it never reads as a 2nd ring */
const RIM_INNER = RADIUS - RIM_WIDTH / 2;
const GLOW_WIDTH = 26;
const GLOW_RADIUS = Math.max(HUB_R + 10, RIM_INNER - GLOW_WIDTH / 2 - 10);
/** Mountain arrow sits on the white hub edge */
const NEEDLE_BASE_R = HUB_R - 2;
const NEEDLE_TIP_R = HUB_R + 14;
const NEEDLE_HALF_W = 8.5;
const MARKER_R = 4.2;
/** Equal visual gaps between rim segments (px along the circumference) */
const SEGMENT_GAP_PX = 9;
const SEGMENT_GAP_DEG = (SEGMENT_GAP_PX / RADIUS) * (180 / Math.PI);
/** Room for arc ends below the horizontal */
const SVG_WIDTH = 280;
const SVG_HEIGHT = Math.ceil(
  CY + RADIUS * Math.sin(((ARC_SWEEP / 2 - 90) * Math.PI) / 180) + RIM_WIDTH + 8,
);

/** 0° at top; positive clockwise (SVG y-down). */
const polarToCartesian = (cx, cy, r, angle) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

/**
 * Circular arc from startAngle → endAngle along a shared radius.
 * Always uses the same clockwise sweep so every segment shares one circle.
 */
const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const delta = endAngle - startAngle;
  const sweep = Math.abs(delta);
  const largeArc = sweep > 180 ? 1 : 0;
  // SVG sweep-flag 1 = clockwise (matches our angle convention)
  const sweepFlag = delta >= 0 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
};

/** Outward-pointing triangle (base nearer center / tip toward rim). */
const getNeedlePoints = (cx, cy, angle, baseR, tipR, halfWidth = 6) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  const tx = Math.cos(rad);
  const ty = Math.sin(rad);
  const px = -ty;
  const py = tx;
  const tipX = cx + tipR * tx;
  const tipY = cy + tipR * ty;
  const b1x = cx + baseR * tx + halfWidth * px;
  const b1y = cy + baseR * ty + halfWidth * py;
  const b2x = cx + baseR * tx - halfWidth * px;
  const b2y = cy + baseR * ty - halfWidth * py;
  return `${b1x},${b1y} ${b2x},${b2y} ${tipX},${tipY}`;
};

/** Trend zig-zag above the % — filled with status color */
const TrendArrowIcon = ({ color, direction = "up" }) => {
  const isUp = direction !== "down";
  return (
    <svg
      className="workspace-health-gauge__trend"
      width="14"
      height="9"
      viewBox="0 0 14 9"
      fill="none"
      aria-hidden="true"
    >
      {isUp ? (
        <path
          d="M14.0003 0.5V4.5C14.0003 4.63261 13.9476 4.75979 13.8538 4.85355C13.7601 4.94732 13.6329 5 13.5003 5C13.3677 5 13.2405 4.94732 13.1467 4.85355C13.053 4.75979 13.0003 4.63261 13.0003 4.5V1.70687L7.85403 6.85375C7.80759 6.90024 7.75245 6.93712 7.69175 6.96228C7.63105 6.98744 7.56599 7.00039 7.50028 7.00039C7.43457 7.00039 7.36951 6.98744 7.30881 6.96228C7.24811 6.93712 7.19296 6.90024 7.14653 6.85375L5.00028 4.70687L0.854028 8.85375C0.760208 8.94757 0.63296 9.00028 0.500278 9.00028C0.367596 9.00028 0.240348 8.94757 0.146528 8.85375C0.0527077 8.75993 0 8.63268 0 8.5C0 8.36732 0.0527077 8.24007 0.146528 8.14625L4.64653 3.64625C4.69296 3.59976 4.74811 3.56288 4.80881 3.53772C4.86951 3.51256 4.93457 3.49961 5.00028 3.49961C5.06599 3.49961 5.13105 3.51256 5.19175 3.53772C5.25245 3.56288 5.30759 3.59976 5.35403 3.64625L7.50028 5.79313L12.2934 1H9.50028C9.36767 1 9.24049 0.947321 9.14672 0.853553C9.05296 0.759785 9.00028 0.632608 9.00028 0.5C9.00028 0.367392 9.05296 0.240215 9.14672 0.146447C9.24049 0.0526785 9.36767 0 9.50028 0H13.5003C13.6329 0 13.7601 0.0526785 13.8538 0.146447C13.9476 0.240215 14.0003 0.367392 14.0003 0.5Z"
          fill={color}
        />
      ) : (
        <path
          d="M14.0003 8.5V4.5C14.0003 4.36739 13.9476 4.24021 13.8538 4.14645C13.7601 4.05268 13.6329 4 13.5003 4C13.3677 4 13.2405 4.05268 13.1467 4.14645C13.053 4.24021 13.0003 4.36739 13.0003 4.5V7.29313L7.85403 2.14625C7.80759 2.09976 7.75245 2.06288 7.69175 2.03772C7.63105 2.01256 7.56599 1.99961 7.50028 1.99961C7.43457 1.99961 7.36951 2.01256 7.30881 2.03772C7.24811 2.06288 7.19296 2.09976 7.14653 2.14625L5.00028 4.29313L0.854028 0.14625C0.760208 0.0524294 0.63296 -0.000278473 0.500278 -0.000278473C0.367596 -0.000278473 0.240348 0.0524294 0.146528 0.14625C0.0527077 0.24007 0 0.367318 0 0.5C0 0.632682 0.0527077 0.75993 0.146528 0.85375L4.64653 5.35375C4.69296 5.40024 4.74811 5.43712 4.80881 5.46228C4.86951 5.48744 4.93457 5.50039 5.00028 5.50039C5.06599 5.50039 5.13105 5.48744 5.19175 5.46228C5.25245 5.43712 5.30759 5.40024 5.35403 5.35375L7.50028 3.20687L12.2934 8H9.50028C9.36767 8 9.24049 8.05268 9.14672 8.14645C9.05296 8.24021 9.00028 8.36739 9.00028 8.5C9.00028 8.63261 9.05296 8.75979 9.14672 8.85355C9.24049 8.94732 9.36767 9 9.50028 9H13.5003C13.6329 9 13.7601 8.94732 13.8538 8.85355C13.9476 8.75979 14.0003 8.63261 14.0003 8.5Z"
          fill={color}
        />
      )}
    </svg>
  );
};

const getNumeric = (value, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
};

const formatAverageLabel = (data) => {
  if (!data || typeof data !== "object") return null;
  const raw =
    data.averageLabel ||
    data.averageTimeLabel ||
    data.averageTime ||
    data.avgTime ||
    data.average ||
    data.averageMinutes;
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    return raw.toLowerCase().includes("average") ? raw : `Average - ${raw}`;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `Average - ${Math.round(raw)} min`;
  }
  return null;
};

const buildHealthModel = (data, dashboardMaterValue = []) => {
  const colors = COLORS_VALUES(dashboardMaterValue);
  const rows = SEGMENTS.map((segment) => {
    const value = getNumeric(data?.[segment.metricKey]);
    return {
      ...segment,
      value,
      color: colors[segment.colorKey] || DEFAULT_COLORS[segment.colorKey],
    };
  });

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) {
    return { rows, arcs: [], needlePct: 0, featured: null };
  }

  // Arc length = share of total (At Risk → Needs Attention → Healthy, left → right)
  const ranges = [];
  let cursorPct = 0;

  rows.forEach((row) => {
    const share = (row.value / total) * 100;
    const startPct = cursorPct;
    const endPct = cursorPct + share;
    cursorPct = endPct;

    ranges.push({
      ...row,
      startPct,
      endPct,
      midPct: startPct + share / 2,
      share,
    });
  });

  const halfGap = SEGMENT_GAP_DEG / 2;
  const drawable = ranges.filter((row) => row.share > 0);
  const arcs = drawable
    .map((row, index) => {
      const bandStart = ARC_START + (row.startPct / 100) * ARC_SWEEP;
      const bandEnd = ARC_START + (row.endPct / 100) * ARC_SWEEP;
      const start = index === 0 ? bandStart : bandStart + halfGap;
      const end = index === drawable.length - 1 ? bandEnd : bandEnd - halfGap;
      if (end <= start) return null;
      return {
        id: row.id,
        color: row.color,
        start,
        end,
      };
    })
    .filter(Boolean);

  const featured = ranges.reduce(
    (best, row) => (row.value > best.value ? row : best),
    ranges[0],
  );

  // Needle in the middle of the featured value-based segment
  const needlePct = featured?.midPct ?? 0;

  return {
    rows,
    arcs,
    needlePct,
    featured,
  };
};

function HealthGauge({
  title = "Workspace Health Distribution",
  subTitle = "Show the current month's overall workspace health distribution",
  value: valueProp,
  data = null,
  loading = false,
  dashboardMaterValue = [],
  averageLabel: averageLabelProp,
  animate = true,
  animationDuration = 2600,
}) {
  const reactId = useId().replace(/:/g, "");
  const hubShadowFilterId = `health-gauge-hub-shadow-${reactId}`;
  const colorShadowFilterId = `health-gauge-color-shadow-${reactId}`;
  const colorShadowClipId = `health-gauge-color-clip-${reactId}`;

  const model = useMemo(
    () => buildHealthModel(data, dashboardMaterValue),
    [data, dashboardMaterValue],
  );

  const featured = model.featured;
  const displayValue =
    valueProp != null && Number.isFinite(Number(valueProp))
      ? Number(valueProp)
      : (featured?.value ?? 0);

  // Needle sits in the middle of the featured value-based arc
  const needlePct =
    valueProp != null && Number.isFinite(Number(valueProp))
      ? Math.min(100, Math.max(0, Number(valueProp)))
      : Math.min(100, Math.max(0, model.needlePct));
  const targetAngle = ARC_START + (needlePct / 100) * ARC_SWEEP;
  const targetValue = displayValue;

  // Identity of the health payload — triggers animation even when mid-band
  // geometry would have stayed the same under the old equal-band midpoints.
  const dataSignature = useMemo(() => {
    if (!data || typeof data !== "object") return "empty";
    return [
      getNumeric(data.healthy),
      getNumeric(data.needsAttention),
      getNumeric(data.atRisk),
      getNumeric(data.compareStatus, ""),
    ].join("|");
  }, [data]);

  const [needleAngle, setNeedleAngle] = useState(ARC_START);
  const [animatedValue, setAnimatedValue] = useState(0);
  /** 0–100 along the full rim — reveals colored arcs left → right with the needle */
  const [revealPct, setRevealPct] = useState(0);

  useEffect(() => {
    // Gauge is unmounted while loading; wait until it is visible again
    if (loading) return undefined;

    if (!animate) {
      setNeedleAngle(targetAngle);
      setAnimatedValue(targetValue);
      setRevealPct(100);
      return undefined;
    }

    // Always reset to the left/start (0%) before each run — never continue
    // from the previous needle / arc position.
    setNeedleAngle(ARC_START);
    setAnimatedValue(0);
    setRevealPct(0);

    let rafId = 0;
    let startFrame = 0;
    const duration = Math.max(0, animationDuration);
    const easeOut = (t) => 1 - (1 - t) ** 3;

    // One frame after reset so the start pose paints before the tween begins
    startFrame = requestAnimationFrame(() => {
      const startedAt = performance.now();

      const tick = (now) => {
        const progress =
          duration <= 0 ? 1 : Math.min(1, (now - startedAt) / duration);
        const eased = easeOut(progress);

        setNeedleAngle(ARC_START + (targetAngle - ARC_START) * eased);
        setAnimatedValue(targetValue * eased);
        setRevealPct(100 * eased);

        if (progress < 1) rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(startFrame);
      cancelAnimationFrame(rafId);
    };
  }, [animate, animationDuration, loading, targetAngle, targetValue, dataSignature]);

  const revealAngle = ARC_START + (revealPct / 100) * ARC_SWEEP;

  const visibleArcs = useMemo(
    () =>
      model.arcs
        .map((arc) => {
          if (revealAngle <= arc.start) return null;
          const end = Math.min(arc.end, revealAngle);
          if (end <= arc.start) return null;
          return { ...arc, end };
        })
        .filter(Boolean),
    [model.arcs, revealAngle],
  );

  const averageLabel = averageLabelProp ?? formatAverageLabel(data);
  const showEmpty = !loading && (!featured || model.arcs.length === 0);

  const statusColor = featured?.color || DEFAULT_COLORS.healthy;
  const statusLabel = featured?.name || "Healthy";
  const trendDirection = getTrendDirection(data?.compareStatus) || "up";

  // Round marker centered on the colored rim line (not outside it)
  const marker = polarToCartesian(CX, CY, RADIUS, needleAngle);
  // Mountain arrow on the hub edge, tip pointing toward the rim
  const needlePoints = getNeedlePoints(
    CX,
    CY,
    needleAngle,
    NEEDLE_BASE_R,
    NEEDLE_TIP_R,
    NEEDLE_HALF_W,
  );

  return (
    <div className="workspace-health-gauge" aria-label={title}>
      <div className="workspace-health-gauge__head">
        {title ? <h4 className="workspace-health-gauge__title">{title}</h4> : null}
        {subTitle ? (
          <p className="workspace-health-gauge__sub-title">{subTitle}</p>
        ) : null}
      </div>
      {loading ? (
        // <DashboardChartSkeleton
        //   variant="donut"
        //   expanded={false}
        //   legendCount={3}
        //   className="workspace-health-gauge__skeleton"
        //   ariaLabel={`Loading ${title}`}
        // />
        <SkeletonLoading
          variant="donut"
          expanded={false}
          legendCount={3}
          height={360}
          className="workspace-health-gauge__skeleton"
          ariaLabel={`Loading ${title}`}
        />
      ) : null}

      {!loading && showEmpty ? (
        <div className="workspace-health-gauge__empty">
          <p className="workspace-widget__no-data-found w-100">No Data Found</p>
        </div>
      ) : null}

      {!loading && !showEmpty ? (
        <div className="workspace-health-gauge__body">
          <div className="workspace-health-gauge__meter">
            <div
              className="workspace-health-gauge__canvas"
              style={{ aspectRatio: `${SVG_WIDTH} / ${SVG_HEIGHT}` }}
            >
              <svg
                className="workspace-health-gauge__svg"
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                width="100%"
                height="100%"
                role="img"
                aria-label={`${Math.round(animatedValue)}% ${statusLabel}`}
              >
                <defs>
                  <filter
                    id={colorShadowFilterId}
                    x="-40%"
                    y="-40%"
                    width="180%"
                    height="180%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
                  </filter>
                  {/* Keep glow strictly inside the rim — never past the outer line */}
                  <clipPath id={colorShadowClipId}>
                    <circle cx={CX} cy={CY} r={RIM_INNER - 0.5} />
                  </clipPath>{" "}
                  <filter
                    id={hubShadowFilterId}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feDropShadow
                      dx="0"
                      dy="4"
                      stdDeviation="10"
                      floodColor="#0F172A"
                      floodOpacity="0.07"
                    />
                  </filter>
                </defs>

                {/* Soft inset color wash — revealed left → right with the needle */}
                <g
                  className="workspace-health-gauge__color-shadow"
                  clipPath={`url(#${colorShadowClipId})`}
                  filter={`url(#${colorShadowFilterId})`}
                  opacity="0.22"
                >
                  {visibleArcs.map((arc) => (
                    <path
                      key={`shadow-${arc.id}`}
                      d={describeArc(CX, CY, GLOW_RADIUS, arc.start, arc.end)}
                      stroke={arc.color}
                      strokeWidth={GLOW_WIDTH}
                      fill="none"
                      strokeLinecap="butt"
                    />
                  ))}
                </g>

                {/* Continuous base track on the exact rim circle */}
                <path
                  className="workspace-health-gauge__rim-track"
                  d={describeArc(CX, CY, RADIUS, ARC_START, ARC_END)}
                  stroke="#FFFFFF"
                  strokeWidth={RIM_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Colored rim — clipped to revealPct so it paints left → right */}
                <g className="workspace-health-gauge__rim">
                  {visibleArcs.map((arc) => (
                    <path
                      key={`rim-${arc.id}`}
                      d={describeArc(CX, CY, RADIUS, arc.start, arc.end)}
                      stroke={arc.color}
                      strokeWidth={RIM_WIDTH}
                      fill="none"
                      strokeLinecap="round"
                    />
                  ))}
                </g>

                {/* Mountain arrow on hub edge (not the line indicator) */}
                <polygon
                  className="workspace-health-gauge__needle"
                  points={needlePoints}
                  fill="#0F172A"
                />

                <circle
                  className="workspace-health-gauge__hub"
                  cx={CX}
                  cy={CY}
                  r={HUB_R}
                  fill="#FFFFFF"
                  filter={`url(#${hubShadowFilterId})`}
                />

                {/* Rounded pointer — centered on the colored rim line */}
                <circle
                  className="workspace-health-gauge__marker"
                  cx={marker.x}
                  cy={marker.y}
                  r={MARKER_R}
                  fill="#fff"
                  stroke={statusColor}
                  strokeWidth="2"
                />
              </svg>

              <div
                className="workspace-health-gauge__value-content"
                style={{
                  left: `${(CX / SVG_WIDTH) * 100}%`,
                  top: `${(CY / SVG_HEIGHT) * 100}%`,
                  // Inset from hub edge so % + status stay inside the white circle
                  width: `${((HUB_R * 2 * 0.86) / SVG_WIDTH) * 100}%`,
                  height: `${((HUB_R * 2 * 0.86) / SVG_HEIGHT) * 100}%`,
                }}
              >
                <TrendArrowIcon color={statusColor} direction={trendDirection} />
                <div className="workspace-health-gauge__value">
                  {Math.round(animatedValue)}%
                </div>
                <div
                  className="workspace-health-gauge__status"
                  style={{ color: statusColor }}
                >
                  {statusLabel}
                </div>
              </div>
            </div>

            {averageLabel ? (
              <div className="workspace-health-gauge__average">{averageLabel}</div>
            ) : null}
          </div>

          <ul className="workspace-health-gauge__legend" aria-label="Health breakdown">
            {model.rows.map((segment) => (
              <li key={segment.id} className="workspace-health-gauge__legend-item">
                <span
                  className="workspace-health-gauge__legend-swatch"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
                <span className="workspace-health-gauge__legend-label">
                  {segment.name}
                </span>
                <span className="workspace-health-gauge__legend-value">
                  {Math.round(segment.value)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default memo(HealthGauge);

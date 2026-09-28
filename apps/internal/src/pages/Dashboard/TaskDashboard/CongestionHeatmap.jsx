import { useMemo } from "react";

const HEAT_TILE_CLASS = {
  red: "congestion-heatmap__tile--red",
  orange: "congestion-heatmap__tile--orange",
  yellow: "congestion-heatmap__tile--yellow",
  green: "congestion-heatmap__tile--green",
};

/** Fixed pipeline order — no "Pipeline order / Most blocked" toggle. */
const resolveHeatmapStages = (data) => {
  const stages = Array.isArray(data?.stages) ? data.stages : [];
  return [...stages].sort(
    (a, b) => (a?.pipelinePosition ?? 0) - (b?.pipelinePosition ?? 0),
  );
};

const formatPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${numeric % 1 === 0 ? numeric : numeric.toFixed(1)}%`;
};

const HeatmapTileSkeleton = ({ index }) => (
  <div
    key={`congestion-heatmap-skeleton-${index}`}
    className="congestion-heatmap__tile congestion-heatmap__tile--skeleton"
    aria-hidden
  >
    <span className="congestion-heatmap__tile-shimmer dashboard-chart-skeleton__shimmer" />
  </div>
);

const CongestionHeatmap = ({ data, loading = false }) => {
  const stages = useMemo(() => resolveHeatmapStages(data), [data]);

  const maxPercentage = useMemo(
    () =>
      stages.reduce((max, stage) => Math.max(max, Number(stage?.percentage) || 0), 0) ||
      1,
    [stages],
  );

  const hasStages = stages.length > 0;

  return (
    <div className="congestion-heatmap">
      <div className="congestion-heatmap__head">
        <div className="congestion-heatmap__head-left">
          <h4 className="congestion-heatmap__title">Congestion heatmap</h4>
          <p className="congestion-heatmap__subtitle">Hotter cells hold more cards.</p>
        </div>
        <div className="congestion-heatmap__legend" aria-hidden>
          <span className="congestion-heatmap__legend-label">Clear</span>
          <span className="congestion-heatmap__legend-bar" />
          <span className="congestion-heatmap__legend-label">Congested</span>
        </div>
      </div>

      <div className="congestion-heatmap__grid">
        {loading ? (
          Array.from({ length: 10 }, (_, index) => (
            <HeatmapTileSkeleton key={`congestion-heatmap-skeleton-${index}`} index={index} />
          ))
        ) : hasStages ? (
          stages.map((stage) => {
            const taskCount = Number(stage?.taskCount) || 0;
            const hasCards = taskCount > 0;
            const stageName = (stage?.stageName || "").trim() || "Untitled stage";
            const heatClass = hasCards
              ? HEAT_TILE_CLASS[stage?.heatColor] || HEAT_TILE_CLASS.green
              : "congestion-heatmap__tile--muted";
            const fillWidth = hasCards
              ? Math.max(
                  6,
                  Math.min(100, ((Number(stage?.percentage) || 0) / maxPercentage) * 100),
                )
              : 0;

            return (
              <div
                key={stage.stageId ?? stageName}
                className={`congestion-heatmap__tile ${heatClass}`}
                title={`${stageName} — ${taskCount} card${taskCount === 1 ? "" : "s"} (${formatPercentage(stage?.percentage)})`}
              >
                <div className="congestion-heatmap__tile-top">
                  <span className="congestion-heatmap__tile-name">{stageName}</span>
                  {hasCards && stage?.congestionRank != null && (
                    <span className="congestion-heatmap__tile-rank">
                      #{stage.congestionRank}
                    </span>
                  )}
                </div>
                <div className="congestion-heatmap__tile-count">{taskCount}</div>
                {hasCards ? (
                  <div className="congestion-heatmap__tile-percentage">
                    {formatPercentage(stage?.percentage)}
                  </div>
                ) : (
                  <div className="congestion-heatmap__tile-empty">no Tasks/Orders</div>
                )}
                <div className="congestion-heatmap__tile-track">
                  <span
                    className="congestion-heatmap__tile-fill"
                    style={{ width: `${fillWidth}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="congestion-heatmap__empty">
            No stage data available for the selected criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default CongestionHeatmap;

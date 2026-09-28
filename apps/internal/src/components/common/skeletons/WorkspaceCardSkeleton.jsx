import React, { memo, useMemo } from "react";
import { SkeletonBone } from "../SkeletonLoading";

const WorkspaceCardSkeletonItem = () => (
  <article className="workspace-card-skeleton" aria-hidden>
    <div className="workspace-card-skeleton__heading">
      <SkeletonBone width="58%" height="18px" />
      <SkeletonBone width="72px" height="22px" borderRadius="999px" />
    </div>
    <div className="workspace-card-skeleton__metrics">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={`metric-skel-${index}`} className="workspace-card-skeleton__metric-row">
          <SkeletonBone width="42%" height="12px" />
          <SkeletonBone width="28px" height="14px" />
        </div>
      ))}
    </div>
  </article>
);

const WorkspaceCardSkeleton = ({
  count = 4,
  columns = 4,
  className = "",
  ariaLabel = "Loading workspace cards",
}) => {
  const cards = useMemo(() => Array.from({ length: Math.max(count, 1) }, (_, i) => i), [count]);
  const columnClass =
    columns <= 2 ? "template-columns-2" : columns === 1 ? "template-columns-1" : "template-columns-4";

  return (
    <div
      className={`workspace-widget__grid workspace-card-skeleton-grid ${columnClass}${
        className ? ` ${className}` : ""
      }`}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {cards.map((index) => (
        <WorkspaceCardSkeletonItem key={`workspace-card-skel-${index}`} />
      ))}
    </div>
  );
};

export default memo(WorkspaceCardSkeleton);

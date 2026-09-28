import React, { memo, useMemo } from "react";
import { SkeletonBone } from "../SkeletonLoading";

const InsightCardSkeletonItem = () => (
  <article className="insight-card-skeleton" aria-hidden>
    <div className="insight-card-skeleton__icon">
      <SkeletonBone width="28px" height="28px" borderRadius="8px" />
    </div>
    <div className="insight-card-skeleton__body">
      <SkeletonBone width="54%" height="16px" />
      <SkeletonBone width="88%" height="12px" />
      <SkeletonBone width="72%" height="12px" />
    </div>
  </article>
);

const InsightCardSkeleton = ({
  count = 4,
  ariaLabel = "Loading insights",
}) => {
  const cards = useMemo(() => Array.from({ length: Math.max(count, 1) }, (_, i) => i), [count]);

  return (
    <div
      className="insight-card-skeleton-list"
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {cards.map((index) => (
        <InsightCardSkeletonItem key={`insight-card-skel-${index}`} />
      ))}
    </div>
  );
};

export default memo(InsightCardSkeleton);

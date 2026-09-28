import React, { memo, useMemo } from "react";
import { SkeletonBone } from "../SkeletonLoading";

const DeadlineRowSkeletonItem = () => (
  <div className="deadline-row-skeleton" aria-hidden>
    <SkeletonBone className="deadline-row-skeleton__date" width="50px" height="43px" borderRadius="8px" />
    <div className="deadline-row-skeleton__content">
      <SkeletonBone width="72%" height="14px" />
      <SkeletonBone width="46%" height="12px" />
    </div>
  </div>
);

const DeadlineRowSkeleton = ({
  count = 3,
  ariaLabel = "Loading overdue deadlines",
}) => {
  const rows = useMemo(() => Array.from({ length: Math.max(count, 1) }, (_, i) => i), [count]);

  return (
    <div role="status" aria-busy="true" aria-label={ariaLabel}>
      {rows.map((index) => (
        <DeadlineRowSkeletonItem key={`deadline-row-skel-${index}`} />
      ))}
    </div>
  );
};

export default memo(DeadlineRowSkeleton);

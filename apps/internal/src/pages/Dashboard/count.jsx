import React, { memo, useEffect, useRef, useState } from "react";
import DashboardCountCard from "./DashboardCountCard";
import SkeletonLoading from "components/common/SkeletonLoading";

const KPI_SECTION_LABEL = {
  worspace: "Workspace health summary",
  maintask: "Board task summary",
  subtask: "Board subtask summary",
  board: "Task dashboard summary",
};

const DashboardCount = ({
  cards = [],
  dashboardMaterValue,
  gridCount,
  type,
  boardType,
  loading = false,
  skeletonCount,
}) => {
  const sectionAriaLabel = KPI_SECTION_LABEL[type] || "Dashboard metrics summary";
  const [animationKey, setAnimationKey] = useState(0);
  const previousCardsRef = useRef(null);

  // Replay all counters together on every cards refresh (skip the initial mount bump).
  useEffect(() => {
    if (previousCardsRef.current === null) {
      previousCardsRef.current = cards;
      return;
    }
    if (previousCardsRef.current !== cards) {
      previousCardsRef.current = cards;
      setAnimationKey((key) => key + 1);
    }
  }, [cards]);
  const skeletonCountArray = Array.from({ length: skeletonCount || gridCount }, (_, index) => index);
    
  return (
    <section
      className={`dashboard-health-overview ${type !== "worspace" ? "dashboard-background" : ""} ${boardType ? boardType : ""}`}
      aria-label={sectionAriaLabel}
    >
      <div className={`dashboard-count-${gridCount ? gridCount : "4"}`} role="list">
        {loading
          ? skeletonCountArray?.map((index) => (
              <SkeletonLoading
                key={index}
                count={1}
                height={skeletonCount ? 200 : 120}
                flexDirection="row"
                gap={16}
                className="dashboard-count-skeleton"
              />
            ))
          : cards.map((card) => (
              <DashboardCountCard
                key={card.id}
                card={card}
                type={type}
                dashboardMaterValue={dashboardMaterValue}
                animationKey={animationKey}
              />
            ))}
      </div>
    </section>
  );
};

export default memo(DashboardCount);

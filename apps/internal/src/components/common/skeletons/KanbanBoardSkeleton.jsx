import React, { memo, useMemo } from "react";
import { SkeletonBone } from "../SkeletonLoading";

const DEFAULT_CARD_COUNTS = [4, 3, 4, 2, 3, 3];
const MAX_SKELETON_CARDS = 5;

const KanbanCardSkeleton = () => (
  <div className="kanban-card-skeleton" aria-hidden>
    <div className="kanban-card-skeleton__top">
      <SkeletonBone className="kanban-card-skeleton__badge" width="72px" height="22px" />
      <SkeletonBone className="kanban-card-skeleton__id" width="118px" height="14px" />
    </div>
    <SkeletonBone className="kanban-card-skeleton__title" width="72%" height="18px" />
    <SkeletonBone className="kanban-card-skeleton__date" width="48%" height="12px" />
    <div className="kanban-card-skeleton__tools">
      <span className="kanban-card-skeleton__tools-accent" />
      <SkeletonBone width="40%" height="12px" />
      <SkeletonBone className="kanban-card-skeleton__tools-chevron" width="12px" height="12px" />
    </div>
  </div>
);

const KanbanColumnSkeleton = ({ cardCount = 3 }) => (
  <div className="kanban-column kanban-column-skeleton" aria-hidden>
    <div className="kanban-column-skeleton__head">
      <div className="kanban-column-skeleton__head-left">
        <SkeletonBone width="14px" height="14px" borderRadius="4px" />
        <SkeletonBone width="132px" height="16px" />
      </div>
      <SkeletonBone
        className="kanban-column-skeleton__count"
        width="36px"
        height="24px"
        borderRadius="6px"
      />
    </div>
    <div className="kanban-card-container kanban-column-skeleton__cards">
      {Array.from({ length: cardCount }, (_, index) => (
        <KanbanCardSkeleton key={`kanban-card-skel-${index}`} />
      ))}
    </div>
  </div>
);

/**
 * Renders a kanban-shaped loading state.
 * Prefer passing `columns` derived from the last known stage/ticket layout
 * so card counts match expected content instead of a fixed mismatch.
 */
const KanbanBoardSkeleton = ({
  columns,
  columnCount = 4,
  cardsPerColumn,
  ariaLabel = "Loading kanban board",
}) => {
  const resolvedColumns = useMemo(() => {
    if (Array.isArray(columns) && columns.length > 0) {
      return columns.map((column, index) => {
        const rawCount =
          typeof column === "number"
            ? column
            : column?.cardCount ?? cardsPerColumn ?? DEFAULT_CARD_COUNTS[index % DEFAULT_CARD_COUNTS.length];
        return {
          cardCount: Math.min(Math.max(Number(rawCount) || 3, 1), MAX_SKELETON_CARDS),
        };
      });
    }

    return Array.from({ length: Math.max(columnCount, 1) }, (_, index) => ({
      cardCount: Math.min(
        Math.max(
          Number(cardsPerColumn) ||
            DEFAULT_CARD_COUNTS[index % DEFAULT_CARD_COUNTS.length],
          1,
        ),
        MAX_SKELETON_CARDS,
      ),
    }));
  }, [columns, columnCount, cardsPerColumn]);

  return (
    <div
      className="d-flex gap-3 kanbanContainer kanban-board-skeleton"
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {resolvedColumns.map((column, index) => (
        <KanbanColumnSkeleton
          key={`kanban-col-skel-${index}`}
          cardCount={column.cardCount}
        />
      ))}
    </div>
  );
};

export default memo(KanbanBoardSkeleton);

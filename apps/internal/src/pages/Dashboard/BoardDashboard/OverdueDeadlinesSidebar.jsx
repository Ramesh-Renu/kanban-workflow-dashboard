import React, { memo } from "react";
import dayjs from "dayjs";
import { clockIcon, boardExpandIcon } from "assets/images";
import { hexToRgba } from "utils/dashboard";
import DeadlineRowSkeleton from "components/common/skeletons/DeadlineRowSkeleton";
const isDueWithinCurrentMonth = (ticketDueDate) =>
  Boolean(
    ticketDueDate &&
    dayjs(ticketDueDate).isValid() &&
    dayjs(ticketDueDate).isSame(dayjs(), "month"),
  );

const isDueDateInPast = (ticketDueDate) =>
  Boolean(
    ticketDueDate &&
    dayjs(ticketDueDate).isValid() &&
    dayjs(ticketDueDate).startOf("day").isBefore(dayjs().startOf("day")),
  );

const isDueWithinMonthAndPast = (ticketDueDate) =>
  isDueWithinCurrentMonth(ticketDueDate) || isDueDateInPast(ticketDueDate);

const OverdueDeadlinesSidebar = ({
  loading,
  upcomingDeadlines,
  onViewMore,
  boardType,
  panelRef,
}) => {
  const overduePreview = upcomingDeadlines?.upcomingDeadlines ?? [];
  const overdueViewMore = upcomingDeadlines?.upcomingDeadlinesViewMore ?? [];
  const hasOverdueItems = overduePreview.length > 0 || overdueViewMore.length > 0;
  const defaultOverdueDeadline = overduePreview[0] ?? overdueViewMore[0] ?? null;

  const handleExpandOverdues = () => {
    onViewMore(defaultOverdueDeadline);
  };

  return (
    <aside
      className={`dashboard-page__content-right${
        boardType === "task" ? " task-dashboard-overdue-sidebar" : ""
      }`}
      aria-label="Charts, overdue items, and upcoming deadlines"
    >
      <div className="dashboard-page__content-right-footer" ref={panelRef}>
        <div className="dashboard-page__content-right-footer-item-header">
          <h4 className="dashboard-page__content-right-footer-item-header-title">
            Overdues{" "}
            {/* {safeParseLocalStorage("selectWorkspaceDashboard")?.id === 1
              ? "Tools"
              : "Task"} */}
            {upcomingDeadlines?.upcomingDeadlinesViewMore?.length > 0 && (
              <span className="dashboard-page__content-right-footer-item-header-title-count">
                {upcomingDeadlines?.upcomingDeadlinesViewMore?.length}
              </span>
            )}
          </h4>
          <button
            type="button"
            className="dashboard-page__content-right-footer-item-header-view-more"
            tabIndex={0}
            aria-label="View all overdue items"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleExpandOverdues();
              }
            }}
            onClick={handleExpandOverdues}
            disabled={!hasOverdueItems}
          >
            Expand &#160;
            <img src={boardExpandIcon} alt="boardExpand" />
          </button>
        </div>
        <div className="dashboard-page__content-right-footer-item-content">
          <div className="dashboard-page__content-right-footer-item-content-item">
            {loading ? (
              <DeadlineRowSkeleton count={3} />
            ) : upcomingDeadlines?.upcomingDeadlines?.length === 0 ? (
              <div
                className="dashboard-page__content-right-footer-item-content-item-row dashboard-page__content-right-footer-item-content-item-row--empty"
              >
                <p
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "var(--color-light-red-3)",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  No Overdue Task Found
                </p>
              </div>
            ) : (
              upcomingDeadlines?.upcomingDeadlines?.map((deadline) => (
                <DeadlineRow
                  key={deadline.orderId}
                  deadline={deadline}
                  onViewMore={onViewMore}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

const DeadlineRow = ({ deadline, onViewMore }) => {
  const isPast = isDueDateInPast(deadline?.dueDate);
  const isCurrentMonth = isDueWithinCurrentMonth(deadline?.dueDate);
  const isNotCompleted = deadline?.toolStatusId !== 7;

  const textColor =
    isPast && isNotCompleted
      ? hexToRgba("#F03131", 1)
      : deadline?.dueDate && isNotCompleted && isCurrentMonth
        ? hexToRgba("#F03131", 1)
        : hexToRgba("#F03131", 0.6);

  const rowBgColor =
    isPast && isNotCompleted
      ? "#FFF6F8"
      : deadline?.dueDate && isCurrentMonth
        ? hexToRgba("#D6E3FF", 0.05)
        : hexToRgba("#E2E8F0", 0.05);

  const rowHoverBgColor =
    isPast && isNotCompleted
      ? "#FFEDF1"
      : deadline?.dueDate && isCurrentMonth
        ? hexToRgba("#D6E3FF", 0.14)
        : hexToRgba("#E2E8F0", 0.14);

  const dateBoxColor =
    isPast && isNotCompleted
      ? hexToRgba("#F03131", 1)
      : deadline?.dueDate && isNotCompleted && isCurrentMonth
        ? hexToRgba("#F03131", 1)
        : hexToRgba("#F03131", 0.6);

  const nameColor =
    deadline.dueDate && isDueWithinMonthAndPast(deadline.dueDate)
      ? hexToRgba("#1E293B", 1)
      : hexToRgba("#1E293B", 0.5);

  const boxStyle = {
    background: "#ffffff",
    color: dateBoxColor,
    borderRadius: "4px",
    padding: "4px 12px",
    width: "40px",
    minHeight: "40px",
    height: "100%",
    boxShadow: "0px 1px 2px 0px #0000000D",
  };

  return (
    <div
      className="dashboard-page__content-right-footer-item-content-item-row"
      style={{
        "--deadline-row-bg": rowBgColor,
        "--deadline-row-hover-bg": rowHoverBgColor,
        "--deadline-row-text": textColor,
      }}
      onClick={() => onViewMore(deadline)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onViewMore(deadline);
      }}
    >
      <div className="dashboard-page__content-right-footer-item-content-item-row-header">
        <p style={boxStyle}>
          <span
            style={{
              fontSize: "8px",
              fontWeight: "500",
              lineHeight: "10px",
              verticalAlign: "middle",
            }}
          >
            {deadline.dueDate && dayjs(deadline.dueDate).format("MMM")}
          </span>
          <span
            style={{
              fontSize: "15px",
              fontWeight: "600",
              lineHeight: "16px",
              verticalAlign: "middle",
            }}
          >
            {(deadline.dueDate && dayjs(deadline.dueDate).format("DD")) || "\u2014"}
          </span>
        </p>
      </div>
      <div className="dashboard-page__content-right-footer-item-content-item-row-content">
        <p className="dashboard-page__content-right-footer-item-content-item-row-content-ticket">
          <span
            className="dashboard-page__content-right-footer-item-content-item-row-content-item-name"
            style={{ color: nameColor }}
          >
            {deadline.taskName}
          </span>
        </p>
        <p
          className="dashboard-page__content-right-footer-item-content-item-row-content-ticket-details"
          style={{ color: nameColor }}
        >
          <span className="dashboard-page__content-right-footer-item-content-item-row-content-ticket-details-item">
            This work is overdue. Please check the reason.
          </span>
        </p>
      </div>
      <p className="dashboard-page__content-right-footer-item-content-item-row-overdue-count">
        {deadline.overdueToolCount} Overdue
      </p>
    </div>
  );
};

export default memo(OverdueDeadlinesSidebar);

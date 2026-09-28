import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";

const formatChangedOn = (value) => {
  if (!value || !dayjs(value).isValid()) return null;
  return dayjs(value).format("MMM DD [at] hh:mm a");
};

const normalizeDueDateChangedReasons = (value) => {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeDueDateChangedReasons(parsed);
    } catch {
      return [{ reason: value, changedOn: null }];
    }
  }

  if (Array.isArray(value)) {
    return value.filter((item) => item?.reason);
  }

  if (typeof value === "object" && value.reason) {
    return [value];
  }

  return [];
};

const getStageDueDateChangedReasons = (stageHistory = []) =>
  stageHistory
    .flatMap((entry) => normalizeDueDateChangedReasons(entry.dueDateChangedReason))
    .sort((a, b) => {
      const aTime =
        a.changedOn && dayjs(a.changedOn).isValid() ? dayjs(a.changedOn).valueOf() : 0;
      const bTime =
        b.changedOn && dayjs(b.changedOn).isValid() ? dayjs(b.changedOn).valueOf() : 0;
      return aTime - bTime;
    });

const getStageMovedFromMessages = (stageHistory = []) =>
  stageHistory.map((entry) => entry?.movedFrom?.trim()).filter(Boolean);

const parseFormattedDurationToMinutes = (value) => {
  if (value == null || value === "---") return 0;

  const text = String(value).trim().toLowerCase();
  if (!text) return 0;

  // API uses "<1m" for sub-minute durations — treat as 0 for aggregation
  if (text.startsWith("<")) return 0;

  const dayMatch = text.match(/(\d+)\s*d/);
  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);

  if (!dayMatch && !hourMatch && !minuteMatch) return 0;

  let totalMinutes = 0;
  if (dayMatch) totalMinutes += Number(dayMatch[1]) * 24 * 60;
  if (hourMatch) totalMinutes += Number(hourMatch[1]) * 60;
  if (minuteMatch) totalMinutes += Number(minuteMatch[1]);

  return totalMinutes;
};

/** Keep API duration text as-is when it uses "<" (e.g. "<1m"). */
const formatDurationForDisplay = (value) => {
  if (value == null || value === "") return "0m";
  const text = String(value).trim();
  if (text.startsWith("<")) return text;
  return text;
};

const getStageTotalDuration = (stageHistory = [], isOngoing, activeHistory) => {
  if (isOngoing) {
    return formatDurationForDisplay(activeHistory?.stageDuration || "0m") + " (Ongoing)";
  }

  if (!stageHistory.length) return "0m";

  // Single visit — show API string unchanged (preserves "<1m")
  if (stageHistory.length === 1) {
    return formatDurationForDisplay(stageHistory[0]?.stageDuration);
  }

  const allLessThanMinute = stageHistory.every((entry) =>
    String(entry?.stageDuration ?? "")
      .trim()
      .startsWith("<"),
  );
  if (allLessThanMinute) {
    return formatDurationForDisplay(stageHistory[0]?.stageDuration);
  }

  return sumStageDurations(stageHistory);
};

const formatMinutesToDuration = (totalMinutes) => {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m";

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);

  return parts.join(" ");
};

const sumStageDurations = (stageHistory = []) =>
  formatMinutesToDuration(
    stageHistory.reduce(
      (sum, entry) => sum + parseFormattedDurationToMinutes(entry.stageDuration),
      0,
    ),
  );

const resolveTrackingRecord = (data) => {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
};

const getStageStatus = (stage) => {
  const lastHistory = stage.stageHistory?.[stage.stageHistory.length - 1];
  const isOngoing = Boolean(lastHistory && lastHistory.stageExitedDate == null);

  if (isOngoing) return "current";
  if (stage.enteredDate || stage.stageHistory?.length > 0) return "completed";
  return "pending";
};

const isStageEmpty = (stage) =>
  (!stage?.stageHistory || stage.stageHistory.length === 0) &&
  !stage?.enteredDate &&
  !stage?.exitDate;

const getVisibleStages = (stages = []) =>
  stages.filter((stage, index) => {
    if (!isStageEmpty(stage)) return true;
    const laterStageReached = stages
      .slice(index + 1)
      .some((laterStage) => !isStageEmpty(laterStage));
    return !laterStageReached;
  });

const getBoardCurrentStage = (board) =>
  board.stages?.find((stage) => getStageStatus(stage) === "current") ?? null;

const getBoardKey = (board, index) => {
  const id = board?.boardId;
  return id != null && id !== "" ? String(id) : `board-${index}`;
};

/** Stable UI key for a stage visit. API may repeat stageId when a stage is revisited. */
const getStageOccurrenceKey = (stage, index) =>
  `${stage?.stageId ?? "stage"}-${index}`;

const findBoardByKey = (boards, boardKey) =>
  boards.find((board, index) => getBoardKey(board, index) === boardKey);

const getStageTimelineDate = (stage, status) => {
  const lastHistory = stage.stageHistory?.[stage.stageHistory.length - 1];

  if (status === "current") {
    return lastHistory?.stageEnteredDate || stage.enteredDate || null;
  }

  if (status === "completed") {
    return stage.exitDate || lastHistory?.stageExitedDate || stage.enteredDate || null;
  }

  return null;
};

const getActiveHistoryEntry = (stage) => {
  if (!stage?.stageHistory?.length) return null;
  const ongoing = [...stage.stageHistory]
    .reverse()
    .find((entry) => entry.stageExitedDate == null);
  return ongoing ?? stage.stageHistory[stage.stageHistory.length - 1];
};

const getUniqueAssignees = (stageHistory = []) => {
  const assigneeMap = new Map();

  stageHistory.forEach((entry) => {
    entry.assigned?.forEach((person) => {
      const key = person.regId || person.email || person.name;
      if (key && !assigneeMap.has(key)) {
        assigneeMap.set(key, person);
      }
    });
  });

  return [...assigneeMap.values()];
};

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
    <path
      d="M2.5 6.2 4.8 8.5 9.5 3.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TIMELINE_SCROLL_STEP = 150;
const EMPTY_BOARDS = [];

const ChevronRightIcon = () => (
  <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
    <path
      d="M2 2 L10 10 L2 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
    <path
      d="M10 2 L2 10 L10 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TimelineScrollContainer = ({ children, stageCount = 0 }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

    const nextCanScrollLeft = scrollLeft > 1;
    const nextCanScrollRight = maxScrollLeft > 1 && scrollLeft < maxScrollLeft - 1;

    setCanScrollLeft((prev) => (prev === nextCanScrollLeft ? prev : nextCanScrollLeft));
    setCanScrollRight((prev) => (prev === nextCanScrollRight ? prev : nextCanScrollRight));
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollButtons();

    element.addEventListener("scroll", updateScrollButtons, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(element);

    const timeline = element.firstElementChild;
    if (timeline) {
      resizeObserver.observe(timeline);
    }

    return () => {
      element.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [stageCount, updateScrollButtons]);

  const scrollTimeline = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction * TIMELINE_SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <div className="subtask-progress-time-tracking__timeline-scroll">
      {canScrollLeft ? (
        <button
          type="button"
          className="subtask-progress-time-tracking__timeline-scroll-button subtask-progress-time-tracking__timeline-scroll-button--left"
          onClick={() => scrollTimeline(-1)}
          aria-label="Scroll timeline left"
        >
          <ChevronLeftIcon />
          <ChevronLeftIcon />
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className="subtask-progress-time-tracking__timeline-viewport"
      >
        {children}
      </div>
      {canScrollRight ? (
        <button
          type="button"
          className="subtask-progress-time-tracking__timeline-scroll-button subtask-progress-time-tracking__timeline-scroll-button--right"
          onClick={() => scrollTimeline(1)}
          aria-label="Scroll timeline right"
        >
          <ChevronRightIcon />
          <ChevronRightIcon />
        </button>
      ) : null}
    </div>
  );
};

const StageTimeline = ({ board, boardKey, selectedStageKey, onStageSelect }) => {
  const visibleStages = getVisibleStages(board.stages);

  return (
    <TimelineScrollContainer stageCount={visibleStages.length}>
      <div
        className={`subtask-progress-time-tracking__timeline${
          selectedStageKey ? " has-selection" : ""
        }`}
      >
        {visibleStages.map((stage, index) => {
          const stageKey = getStageOccurrenceKey(stage, index);
          const status = getStageStatus(stage);
          const isSelected = selectedStageKey === stageKey;
          const timelineDate = getStageTimelineDate(stage, status);
          const isLast = index === visibleStages.length - 1;
          const nextStage = visibleStages[index + 1];
          const nextStatus = nextStage ? getStageStatus(nextStage) : null;
          const isLineActive =
            status === "completed" &&
            (nextStatus === "completed" || nextStatus === "current");

          return (
            <div
              key={stageKey}
              className={`subtask-progress-time-tracking__timeline-step subtask-progress-time-tracking__timeline-step--${status}${
                isSelected ? " is-selected" : ""
              }`}
            >
              <div className="subtask-progress-time-tracking__timeline-track">
                {!isLast ? (
                  <span
                    className={`subtask-progress-time-tracking__timeline-line${
                      isLineActive
                        ? " subtask-progress-time-tracking__timeline-line--active"
                        : ""
                    }`}
                  />
                ) : null}
                <button
                  type="button"
                  className={`subtask-progress-time-tracking__timeline-node${
                    isSelected ? " is-selected" : ""
                  }`}
                  onClick={() => onStageSelect(boardKey, stageKey)}
                  aria-pressed={isSelected}
                  aria-label={`${stage.stageName} stage`}
                >
                  {status === "completed" ? <CheckIcon /> : null}
                </button>
              </div>
              <button
                type="button"
                className={`subtask-progress-time-tracking__timeline-label${
                  isSelected ? " is-selected" : ""
                }`}
                onClick={() => onStageSelect(boardKey, stageKey)}
              >
                {stage.stageName}
              </button>
              {timelineDate ? (
                <span className="subtask-progress-time-tracking__timeline-date">
                  {timelineDate}
                </span>
              ) : (
                <span className="subtask-progress-time-tracking__timeline-date" aria-hidden>
                  &nbsp;
                </span>
              )}
            </div>
          );
        })}
      </div>
    </TimelineScrollContainer>
  );
};

const BoardTrackingRow = ({
  board,
  boardIndex,
  boardKey,
  selectedStageKey,
  onStageSelect,
  isSummaryOpen,
  onToggleSummary,
}) => {
  const visibleStages = getVisibleStages(board.stages);
  const selectedStage = visibleStages.find(
    (stage, index) => getStageOccurrenceKey(stage, index) === selectedStageKey,
  );

  return (
    <section
      className={`subtask-progress-time-tracking__board-card${
        isSummaryOpen ? " is-expanded" : ""
      }`}
    >
      <div
        className={`subtask-progress-time-tracking__board-card-header${
          isSummaryOpen ? " is-expanded" : ""
        }`}
        onClick={() => onToggleSummary(boardKey)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleSummary(boardKey);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isSummaryOpen}
        aria-label={isSummaryOpen ? "Hide board summary" : "Show board summary"}
      >
        <h3 className="subtask-progress-time-tracking__board-title">
          Board {boardIndex + 1}: {board.boardName}
        </h3>
        <button
          type="button"
          className="subtask-progress-time-tracking__board-card-summary-button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSummary(boardKey);
          }}
          aria-expanded={isSummaryOpen}
          aria-label={isSummaryOpen ? "Hide board summary" : "Show board summary"}
        >
          {isSummaryOpen ? "Hide" : "Show"}
        </button>
      </div>
      {isSummaryOpen && (
        <div className="subtask-progress-time-tracking__board-card-body">
          <div className="subtask-progress-time-tracking__board-card-summary">
            <StageTimeline
              board={board}
              boardKey={boardKey}
              selectedStageKey={selectedStageKey}
              onStageSelect={onStageSelect}
            />
            <aside className="subtask-progress-time-tracking__board-summary">
              <p className="subtask-progress-time-tracking__board-summary-duration">
                {board.boardDuration}
              </p>
              <p className="subtask-progress-time-tracking__board-summary-range">
                {board.boardDurationDateFromTo}
              </p>
            </aside>
          </div>
          {selectedStage ? (
            <div className="subtask-progress-time-tracking__board-card-details">
              <StageDetailsCard board={board} stage={selectedStage} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

const StageDetailsCard = ({ board, stage }) => {
  const status = getStageStatus(stage);
  const activeHistory = getActiveHistoryEntry(stage);
  const assignees = getUniqueAssignees(stage.stageHistory);
  const dueDateChangedReasons = getStageDueDateChangedReasons(stage.stageHistory);
  const movedFromMessages = getStageMovedFromMessages(stage.stageHistory);
  const isOngoing = !stage?.stageHistory[0]?.isFinalStage && stage?.stageHistory[0]?.stageDurationOngoing;
 
  const totalStageDuration = getStageTotalDuration(
    stage.stageHistory,
    isOngoing,
    activeHistory,
  );

  return (
    <Fragment>
      <section className="subtask-progress-time-tracking__details-card">
        <div className="subtask-progress-time-tracking__details-header">
          <h3 className="subtask-progress-time-tracking__details-breadcrumb">
            <span className="subtask-progress-time-tracking__details-breadcrumb-text">
              {board.boardName} &#160;&#160;
              <span className="icon-chevron-thin-right"></span>
              &#160;&#160;
              {stage.stageName}
            </span>
            {isOngoing ? (
              <span className="subtask-progress-time-tracking__details-badge">
                Current Stage
              </span>
            ) : null}
          </h3>
        </div>
        {stage.stageHistory.length > 0 ? (
          <div className="subtask-progress-time-tracking__details-content">
            <h5 className="subtask-progress-time-tracking__details-title">
              Stage Details
            </h5>
            <div className="subtask-progress-time-tracking__details-grid">
              <div className="subtask-progress-time-tracking__details-item">
                <span className="subtask-progress-time-tracking__details-label">
                  Stage
                </span>
                <strong>{stage.stageName}</strong>
              </div>
              <div className="subtask-progress-time-tracking__details-item">
                <span className="subtask-progress-time-tracking__details-label">
                  Stage Entered
                </span>
                <strong>
                  {activeHistory?.stageEnteredDate || stage.enteredDate || "—"}
                </strong>
              </div>
              <div className="subtask-progress-time-tracking__details-item">
                <span className="subtask-progress-time-tracking__details-label">
                  Stage Exited
                </span>
                <strong>
                  {isOngoing
                    ? "—"
                    : activeHistory?.stageExitedDate || stage.exitDate || "—"}
                </strong>
              </div>
              <div className="subtask-progress-time-tracking__details-item subtask-progress-time-tracking__details-item--duration">
                <span className="subtask-progress-time-tracking__details-label">
                  Total Time in Stage
                </span>
                <div className="subtask-progress-time-tracking__duration-pill">
                  <strong>{totalStageDuration}</strong>
                  {/* {isOngoing ? (
                    <span className="subtask-progress-time-tracking__duration-note">
                      (Ongoing)
                    </span>
                  ) : null} */}
                </div>
              </div>
              {movedFromMessages.length > 0 && (
                <div className="subtask-progress-time-tracking__details-item subtask-progress-time-tracking__details-item--full">
                  <span className="subtask-progress-time-tracking__details-label">
                    Moved From
                  </span>
                  <ul className="subtask-progress-time-tracking__moved-from-list">
                    {movedFromMessages.map((message, index) => (
                      <li
                        key={`${message}-${index}`}
                        className="subtask-progress-time-tracking__moved-from-item"
                      >
                        <strong>{message}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeHistory?.dueDate && (
                <div className="subtask-progress-time-tracking__details-item ">
                  <p className="subtask-progress-time-tracking__details-label">
                    Due Date 
                  </p>
                  <p className="subtask-progress-time-tracking__details-value">
                    <strong>
                      {dayjs(activeHistory?.dueDate).format("MMM DD, YYYY")}
                    </strong>{" "}
                    {activeHistory?.overDueDateStatus && (
                      <span className="subtask-progress-time-tracking__details-label-overdue">
                        Overdue
                      </span>
                    )}
                  </p>
                </div>
              )}

              {dueDateChangedReasons?.length > 0 && (
                <div className="subtask-progress-time-tracking__details-item subtask-progress-time-tracking__details-item--full">
                  <span className="subtask-progress-time-tracking__details-label">
                    Due Date Changed Reason
                  </span>
                  <ul className="subtask-progress-time-tracking__change-reason-list">
                    {dueDateChangedReasons?.map((item, index) => (
                      <li
                        key={`${item?.changedOn || item?.reason}-${index}`}
                        className="subtask-progress-time-tracking__change-reason-item"
                      >
                        <strong>{item?.reason}</strong>
                        {item?.changedOn ? (
                          <span className="subtask-progress-time-tracking__change-reason-date">
                            {formatChangedOn(item?.changedOn)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="subtask-progress-time-tracking__assignees">
              <span className="subtask-progress-time-tracking__details-label">
                Assignee(s)
              </span>
              {assignees.length > 0 ? (
                <ul className="subtask-progress-time-tracking__assignee-list">
                  {assignees.map((assignee) => (
                    <li key={assignee.regId || assignee.email || assignee.name}>
                      <LogoAvatarShowLetter
                        genaralData={assignee}
                        profilePhotoName="photo"
                        profileName="name"
                        outerClassName="subtask-progress-time-tracking__assignee-avatar"
                        innerClassName="subtask-progress-time-tracking__assignee-initials"
                      />
                      <span>{assignee.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <strong>—</strong>
              )}
            </div>
          </div>
        ) : (
          <div className="subtask-progress-time-tracking__details">
            <p className="subtask-progress-time-tracking__details-empty">
              <strong>Note:</strong> This stage is not yet started or no time tracking
              data available for this stage.
            </p>
          </div>
        )}
      </section>
    </Fragment>
  );
};

export const SubTaskProgressTimeTracking = ({
  trackingData,
  title,
}) => {
  const record = useMemo(() => resolveTrackingRecord(trackingData), [trackingData]);
  const boards = useMemo(() => record?.boards ?? EMPTY_BOARDS, [record?.boards]);

  const [expandedBoardKeys, setExpandedBoardKeys] = useState(() => new Set());
  const [boardSelections, setBoardSelections] = useState({});

  useEffect(() => {
    const nextBoards = resolveTrackingRecord(trackingData)?.boards ?? EMPTY_BOARDS;
    const firstBoard = nextBoards[0];

    if (!firstBoard) {
      setExpandedBoardKeys(new Set());
      setBoardSelections({});
      return;
    }

    const boardKey = getBoardKey(firstBoard, 0);
    setExpandedBoardKeys(new Set([boardKey]));
    setBoardSelections({});
  }, [trackingData]);

  const handleToggleSummary = (boardKey) => {
    setExpandedBoardKeys((prev) => {
      const next = new Set(prev);

      if (next.has(boardKey)) {
        next.delete(boardKey);
        setBoardSelections((selections) => {
          if (!(boardKey in selections)) return selections;
          const { [boardKey]: _removed, ...rest } = selections;
          return rest;
        });
      } else {
        next.add(boardKey);
      }

      return next;
    });
  };

  const isInProgress = boards.some((board) => getBoardCurrentStage(board));

  const handleStageSelect = (boardKey, stageKey) => {
    setBoardSelections((prev) => {
      if (prev[boardKey] === stageKey) {
        const { [boardKey]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [boardKey]: stageKey };
    });
  };

  if (!record) {
    return (
      <div className="subtask-progress-time-tracking">
        <p className="subtask-progress-time-tracking__empty">
          No time tracking data available.
        </p>
      </div>
    );
  }

  return (
    <div className="subtask-progress-time-tracking">
      <header className="subtask-progress-time-tracking__header">
        <div className="subtask-progress-time-tracking__header-left">
          <h2 className="subtask-progress-time-tracking__title">{record.ticketName}</h2>
          <div className="subtask-progress-time-tracking__meta">
            {record.orderId && (
              <span className="subtask-progress-time-tracking__ticket-id">
                Order ID: {record.orderId}
              </span>
            )}
            {record.taskName && (
              <>
                <span className="subtask-progress-time-tracking__details-label">
                 { title }:
                </span>
                <span className={`subtask-progress-time-tracking__status-badge`}>
                  {record.taskName}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="subtask-progress-time-tracking__header-right">
          <span className="subtask-progress-time-tracking__overall-label">
            OVERALL TIME (All Boards)
          </span>
          <strong className="subtask-progress-time-tracking__overall-duration">
            {record.overallTime}
          </strong>
          <span className="subtask-progress-time-tracking__overall-range">
            {record.overallTimeFrom}&#160; – &#160;{record.overallTimeTo}
          </span>
          {trackingData.overallDurationOngoing &&
          <h6 className="subtask-progress-time-tracking__boards-title">Ongoing</h6>
        }
        </div>
        
      </header>
      <section className="subtask-progress-time-tracking__boards">
        {boards.map((board, index) => {
          const boardKey = getBoardKey(board, index);

          return (
            <BoardTrackingRow
              key={boardKey}
              board={board}
              boardIndex={index}
              boardKey={boardKey}
              selectedStageKey={boardSelections[boardKey] ?? null}
              onStageSelect={handleStageSelect}
              isSummaryOpen={expandedBoardKeys.has(boardKey)}
              onToggleSummary={handleToggleSummary}
            />
          );
        })}
      </section>
    </div>
  );
};

export default SubTaskProgressTimeTracking;

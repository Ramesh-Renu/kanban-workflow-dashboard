import React, {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { COLORS_VALUES } from "../../../utils/dashboard";
import {
  buildInsightThemeStyles,
  getInsightCloudToneStyle,
  getWorkspaceRecommendationContext,
  mapAIExecutiveInsightsToCards,
} from "../utils/AIExecutiveInsights";
import { syncIcon } from "../../../assets/images";
import InsightCardSkeleton from "components/common/skeletons/InsightCardSkeleton";

const InsightThemeContext = createContext({});

const useInsightThemeStyle = () => useContext(InsightThemeContext);

const CLOUD_GAP = 26;
const VIEWPORT_PADDING = 12;
const CLOUD_WIDTH_FALLBACK = 420;

const computeStickyNotePosition = (anchorEl, cloudEl) => {
  if (!anchorEl) {
    return { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING };
  }

  const anchorRect = anchorEl.getBoundingClientRect();
  const cloudWidth = cloudEl?.offsetWidth || CLOUD_WIDTH_FALLBACK;
  const cloudHeight = cloudEl?.offsetHeight || 320;

  let left = anchorRect.left - cloudWidth - CLOUD_GAP;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - cloudWidth - VIEWPORT_PADDING),
  );

  let top = anchorRect.top + anchorRect.height / 2 - cloudHeight / 2;
  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, window.innerHeight - cloudHeight - VIEWPORT_PADDING),
  );

  return { top, left };
};

const useInsightCloudPopup = ({ isOpen, anchorRef, cloudRef, onClose }) => {
  const [position, setPosition] = useState({
    top: VIEWPORT_PADDING,
    left: VIEWPORT_PADDING,
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const next = computeStickyNotePosition(anchor, cloudRef.current);
    setPosition((prev) => {
      if (
        Math.round(prev.top) === Math.round(next.top) &&
        Math.round(prev.left) === Math.round(next.left)
      ) {
        return prev;
      }
      return next;
    });
  }, [anchorRef, cloudRef]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    updatePosition();
    const frameId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const cloud = cloudRef.current;

    const handleOutsideClick = (event) => {
      const anchor = anchorRef.current;
      if (anchor?.contains(event.target) || cloudRef.current?.contains(event.target)) {
        return;
      }
      onCloseRef.current?.();
    };

    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    let resizeObserver;
    const anchor = anchorRef.current;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleReposition);
      if (cloud) resizeObserver.observe(cloud);
      if (anchor) resizeObserver.observe(anchor);
    }

    const layoutContainer = document.querySelector(".layout-container");
    layoutContainer?.addEventListener("transitionend", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      resizeObserver?.disconnect();
      layoutContainer?.removeEventListener("transitionend", handleReposition);
    };
  }, [isOpen, anchorRef, cloudRef, updatePosition]);

  return position;
};

const SparkleIcon = ({ primary, secondary }) => (
  <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden>
    <path
      d="M12 2L13.4 8.6L20 10L13.4 11.4L12 18L10.6 11.4L4 10L10.6 8.6L12 2Z"
      fill={primary}
    />
    <g transform="translate(19, 6) scale(1.7) translate(-19, -6)">
      <path
        d="M19 3L19.6 5.4L22 6L19.6 6.6L19 9L18.4 6.6L16 6L18.4 5.4L19 3Z"
        fill={primary}
      />
    </g>
  </svg>
);

const InsightIcons = {
  risk: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L3 20H21L12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4H17L19 8V20H5V8L7 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 4V8H15V4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 14L10.5 16.5L16 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  purple: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
};

const InsightCloudShell = forwardRef(
  ({ title, tone, position, onClose, children, ariaLabel }, ref) => {
    const themeStyle = useInsightThemeStyle();
    const toneCloudStyle = useMemo(
      () => getInsightCloudToneStyle(themeStyle, tone),
      [themeStyle, tone],
    );

    return (
      <div
        ref={ref}
        className={`workspace-ai-insights__cloud workspace-ai-insights__cloud--${tone}`}
        role="dialog"
        aria-label={ariaLabel || title}
        style={{
          ...themeStyle,
          ...toneCloudStyle,
          top: position.top,
          left: position.left,
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="workspace-ai-insights__cloud-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className="workspace-ai-insights__cloud-header">
          <span className="workspace-ai-insights__cloud-badge">AI Insight</span>
          <h4 className="workspace-ai-insights__cloud-title">{title}</h4>
        </div>
        <div className="workspace-ai-insights__cloud-body">{children}</div>
        <span className="workspace-ai-insights__cloud-tail" aria-hidden />
      </div>
    );
  },
);

InsightCloudShell.displayName = "InsightCloudShell";

const SectionInsightCloud = forwardRef(({ insight, position, onClose }, ref) => (
  <InsightCloudShell
    ref={ref}
    title={insight.title}
    tone={insight.tone}
    position={position}
    onClose={onClose}
    ariaLabel={`${insight.title} details`}
  >
    {insight.headline ? (
      <p className="workspace-ai-insights__cloud-headline">{insight.headline}</p>
    ) : null}
    {insight.detail ? (
      <p className="workspace-ai-insights__cloud-text workspace-ai-insights__cloud-text--summary">
        {insight.detail}
      </p>
    ) : null}

    {insight.boards?.length > 0 ? (
      <div className="workspace-ai-insights__cloud-board-list">
        {insight.boards.map((board) => (
          <article
            key={`${board.rank}-${board.workspace}-${board.board}`}
            className="workspace-ai-insights__cloud-board-item"
          >
            <div className="workspace-ai-insights__cloud-board-rank">#{board.rank}</div>
            <div className="workspace-ai-insights__cloud-board-content">
              <p className="workspace-ai-insights__cloud-board-meta">
                <strong>{board.workspace}</strong>
                {board.board ? ` · ${board.board}` : ""}
              </p>
              <p className="workspace-ai-insights__cloud-text">{board.issue}</p>
            </div>
          </article>
        ))}
      </div>
    ) : null}
  </InsightCloudShell>
));

SectionInsightCloud.displayName = "SectionInsightCloud";

const WorkspaceInsightCloud = forwardRef(({ context, position, onClose }, ref) => {
  if (!context) return null;

  const {
    workspaceName,
    recommendationItem,
    criticalBoards,
    bottleneckBoards,
    topPerformerBoards,
  } = context;

  return (
    <InsightCloudShell
      ref={ref}
      title={workspaceName}
      tone="purple"
      position={position}
      onClose={onClose}
      ariaLabel={`${workspaceName} recommendation details`}
    >
      {recommendationItem?.board ? (
        <p className="workspace-ai-insights__cloud-board">{recommendationItem.board}</p>
      ) : null}

      {recommendationItem ? (
        <div className="workspace-ai-insights__cloud-section">
          <p className="workspace-ai-insights__cloud-label">Recommended action</p>
          <p className="workspace-ai-insights__cloud-text">{recommendationItem.action}</p>
          <p className="workspace-ai-insights__cloud-label">Expected impact</p>
          <p className="workspace-ai-insights__cloud-text">
            {recommendationItem.expected_impact}
          </p>
        </div>
      ) : null}

      {criticalBoards.length > 0 ? (
        <div className="workspace-ai-insights__cloud-section workspace-ai-insights__cloud-section--risk">
          <p className="workspace-ai-insights__cloud-label">Critical risk</p>
          {criticalBoards.map((board) => (
            <p
              key={`${board.board}-${board.rank}`}
              className="workspace-ai-insights__cloud-text"
            >
              <strong>{board.board}:</strong> {board.issue}
            </p>
          ))}
        </div>
      ) : null}

      {bottleneckBoards.length > 0 ? (
        <div className="workspace-ai-insights__cloud-section workspace-ai-insights__cloud-section--warning">
          <p className="workspace-ai-insights__cloud-label">Delivery bottleneck</p>
          {bottleneckBoards.map((board) => (
            <p
              key={`${board.board}-${board.rank}`}
              className="workspace-ai-insights__cloud-text"
            >
              <strong>{board.board}:</strong> {board.issue}
            </p>
          ))}
        </div>
      ) : null}

      {topPerformerBoards.length > 0 ? (
        <div className="workspace-ai-insights__cloud-section workspace-ai-insights__cloud-section--success">
          <p className="workspace-ai-insights__cloud-label">Top performance</p>
          {topPerformerBoards.map((board) => (
            <p
              key={`${board.board}-${board.rank}`}
              className="workspace-ai-insights__cloud-text"
            >
              <strong>{board.board}:</strong> {board.issue}
            </p>
          ))}
        </div>
      ) : null}
    </InsightCloudShell>
  );
});

WorkspaceInsightCloud.displayName = "WorkspaceInsightCloud";

const SectionInsightCard = ({ insight, loading }) => {
  const cardRef = useRef(null);
  const cloudRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const cloudPosition = useInsightCloudPopup({
    isOpen,
    anchorRef: cardRef,
    cloudRef,
    onClose: handleClose,
  });

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggle();
      }
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    },
    [handleToggle, isOpen],
  );

  return (
    <article
      ref={cardRef}
      className={`workspace-ai-insights__card workspace-ai-insights__card--${insight.tone} workspace-ai-insights__card--section${
        isOpen ? " workspace-ai-insights__card--active" : ""
      }${loading ? " workspace-ai-insights__card--loading" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`workspace-ai-insights__card-icon workspace-ai-insights__card-icon--${insight.tone}`}
        aria-hidden
      >
        {InsightIcons[insight.tone]}
      </div>
      <div className="workspace-ai-insights__card-body">
        <h3 className="workspace-ai-insights__card-title">{insight.title}</h3>
        {insight.headline ? (
          <p className="workspace-ai-insights__card-headline">{insight.headline}</p>
        ) : null}
        {insight.detail ? (
          <p className="workspace-ai-insights__card-text">{insight.detail}</p>
        ) : null}
      </div>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <SectionInsightCloud
              ref={cloudRef}
              insight={insight}
              position={cloudPosition}
              onClose={handleClose}
            />,
            document.body,
          )
        : null}
    </article>
  );
};

const ExecutiveRecommendationCard = ({ insight, insightSource, loading }) => {
  const cardRef = useRef(null);
  const cloudRef = useRef(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);

  const workspaceNames = insight.recommendation?.workspace_names ?? [];

  const activeContext = useMemo(
    () =>
      activeWorkspace
        ? getWorkspaceRecommendationContext(insightSource, activeWorkspace)
        : null,
    [activeWorkspace, insightSource],
  );

  const handleClose = useCallback(() => setActiveWorkspace(null), []);

  const cloudPosition = useInsightCloudPopup({
    isOpen: Boolean(activeWorkspace),
    anchorRef: cardRef,
    cloudRef,
    onClose: handleClose,
  });

  const handleWorkspaceClick = useCallback((event, workspaceName) => {
    event.stopPropagation();
    setActiveWorkspace((prev) => (prev === workspaceName ? null : workspaceName));
  }, []);

  return (
    <article
      ref={cardRef}
      className={`workspace-ai-insights__card workspace-ai-insights__card--${insight.tone} workspace-ai-insights__card--recommendation${
        activeWorkspace ? " workspace-ai-insights__card--active" : ""
      }${loading ? " workspace-ai-insights__card--loading" : ""}`}
    >
      <div
        className={`workspace-ai-insights__card-icon workspace-ai-insights__card-icon--${insight.tone}`}
        aria-hidden
      >
        {InsightIcons[insight.tone]}
      </div>

      <div className="workspace-ai-insights__card-body">
        <h3 className="workspace-ai-insights__card-title">{insight.title}</h3>
        <p className="workspace-ai-insights__card-text">
          Select a workspace to view tailored recommendations.
        </p>

        <div className="workspace-ai-insights__workspace-tags">
          {workspaceNames.length > 0 ? workspaceNames.map((workspaceName) => (
            <button
              key={workspaceName}
              type="button"
              className={`workspace-ai-insights__workspace-btn${
                activeWorkspace === workspaceName
                  ? " workspace-ai-insights__workspace-btn--active"
                  : ""
              }`}
              onClick={(event) => handleWorkspaceClick(event, workspaceName)}
              aria-expanded={activeWorkspace === workspaceName}
            >
              {workspaceName}
            </button>
          )) : <p className="workspace-ai-insights__card-empty">No workspaces found</p>}
        </div>
      </div>

      {activeContext && typeof document !== "undefined"
        ? createPortal(
            <WorkspaceInsightCloud
              ref={cloudRef}
              context={activeContext}
              position={cloudPosition}
              onClose={handleClose}
            />,
            document.body,
          )
        : null}
    </article>
  );
};

const WorkspaceAIExecutiveInsights = ({
  data = [],
  loading = false,
  dashboardMaterValue = [],
  handleRefresh = () => {},
}) => {
  const insightSource = useMemo(() => (Array.isArray(data) ? data[0] : data), [data]);
  const insights = useMemo(() => mapAIExecutiveInsightsToCards(data), [data]);
  const theme = useMemo(() => COLORS_VALUES(dashboardMaterValue), [dashboardMaterValue]);
  const themeStyle = useMemo(
    () => buildInsightThemeStyles(dashboardMaterValue),
    [dashboardMaterValue],
  );

  return (
    <InsightThemeContext.Provider value={themeStyle}>
      <aside
        className="workspace-ai-insights"
        aria-label="AI Executive Insights"
        style={themeStyle}
      >
        <header className="workspace-ai-insights__header">
          <div className="workspace-ai-insights__title-row">
            <span className="workspace-ai-insights__sparkle" aria-hidden>
              <SparkleIcon
                primary={theme.total}
                secondary={theme.line || theme.healthy}
              />
            </span>
            <h2 className="workspace-ai-insights__title">
              AI Executive Insights{" "}
              {/* <button
                type="button"
                className="dashboard-page__action-btn sync"
                onClick={() => handleRefresh()}
                aria-label="Refresh dashboard data"
              >
                <img src={syncIcon} alt="" aria-hidden="true" />
              </button> */}
            </h2>
          </div>
          <p className="workspace-ai-insights__subtitle">
            AI-powered insights for strategic decisions
          </p>
        </header>

        <div className="workspace-ai-insights__cards">
          {loading ? (
            <InsightCardSkeleton count={4} ariaLabel="Loading AI insights" />
          ) : (
            insights?.map((insight) =>
              insight?.type === "recommendation" ? (
                <ExecutiveRecommendationCard
                  key={insight.id}
                  insight={insight}
                  insightSource={insightSource}
                  loading={loading}
                />
              ) : (
                <SectionInsightCard
                  key={insight.id}
                  insight={insight}
                  loading={loading}
                />
              ),
            )
          )}
        </div>
      </aside>
    </InsightThemeContext.Provider>
  );
};

export default memo(WorkspaceAIExecutiveInsights);

import React, { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getOrionAiInsights } from "../../../services";
import { useToast } from "@orion/shared";

const SCAN_DURATION_MS = 1400;
const STREAM_INTERVAL_MS = 16;
const STREAM_CHARS_PER_TICK = 2;
const POPUP_VIEWPORT_PAD = 12;
const POPUP_GAP_BELOW_BUTTON = 12;
const POPUP_MIN_HEIGHT = 160;
const POPUP_MAX_WIDTH = 600;

const getPopupLayoutVars = (rect) => {
  if (!rect) return {};
  const viewport = window.visualViewport;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportBottom = viewportTop + viewportHeight;
  const maxHeight = Math.max(
    POPUP_MIN_HEIGHT,
    Math.floor(
      viewportBottom - rect.bottom - POPUP_GAP_BELOW_BUTTON - POPUP_VIEWPORT_PAD,
    ),
  );
  const maxWidth = Math.min(
    POPUP_MAX_WIDTH,
    window.innerWidth - POPUP_VIEWPORT_PAD * 2,
  );
  const shiftX = Math.max(0, maxWidth - (rect.right - POPUP_VIEWPORT_PAD));
  return {
    ["--ai-summary-max-h"]: `${maxHeight}px`,
    ["--ai-summary-shift-x"]: `${shiftX}px`,
  };
};

const THINKING_COPY = {
  all: {
    intro:
      "Preparing your overall workspace briefing from the current dashboard filters…",
    lines: [
      "Reviewing performance and health signals across all workspaces…",
      "Checking task activity, overdue trends, workload, and completion patterns…",
      "Identifying key trends and recommended focus areas for this period…",
    ],
  },
  workspace: {
    intro: "Preparing your workspace briefing from the current workspace data…",
    lines: [
      "Reviewing workspace health and performance across active boards…",
      "Checking task progress, overdue volume, workload, and completion trends…",
      "Identifying key areas that need attention and recommended actions…",
    ],
  },
  board: {
    intro: "Preparing your board briefing from the current board data…",
    lines: [
      "Reviewing board activity, task progress, and completion signals…",
      "Checking overdue tasks, workload distribution, and current bottlenecks…",
      "Identifying priority areas and recommended actions for this board…",
    ],
  },
};

const getThinkingCopy = (scope = "all") => THINKING_COPY[scope] || THINKING_COPY.all;

const SparkIcon = ({ className = "ai-summary-btn__spark" }) => {
  const gradId = useId().replace(/:/g, "");
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2F6FED" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M18.5 14.5l.7 2.8 2.8.7-2.8.7-.7 2.8-.7-2.8-2.8-.7 2.8-.7.7-2.8z"
        fill="#33C7F0"
      />
    </svg>
  );
};

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path
      d="M3.2 3.2l7.6 7.6M10.8 3.2l-7.6 7.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

function HealthIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12h3.5l2-5 3 10 2.5-6H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RisksIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4l9 16H3L12 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PositiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l2.2 5.4L20 9.2l-4.4 3.6L17 19l-5-3.2L7 19l1.4-6.2L4 9.2l5.8-.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="3"
        y="10"
        width="18"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="3"
        y="16"
        width="12"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ActionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.8c-.7.5-1.1 1.1-1.3 1.7H9.8c-.2-.6-.6-1.2-1.3-1.7A6 6 0 0 1 12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SECTION_DEFS = [
  {
    key: "header",
    title: "Overall Health",
    theme: "health",
    Icon: HealthIcon,
  },
  {
    key: "priority_risks",
    title: "Top Risks",
    theme: "risks",
    Icon: RisksIcon,
  },
  {
    key: "performance_trends",
    title: "Trend",
    theme: "trend",
    Icon: TrendIcon,
  },
  {
    key: "positive_indicators",
    title: "Positive Highlight",
    theme: "positive",
    Icon: PositiveIcon,
  },
  {
    key: "workload_distribution",
    title: "Workload Distribution",
    theme: "workload",
    Icon: WorkloadIcon,
  },
  {
    key: "takeaway",
    title: "Recommended Actions",
    theme: "actions",
    Icon: ActionsIcon,
  },
];

const toBullets = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : item?.text || item?.title || item?.message || "",
      )
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Map summarization API shape to sectioned popup content.
 * New: header, priority_risks, performance_trends, positive_indicators,
 * workload_distribution, takeaway.
 * Legacy: value1–value4 (+ takeaway) fallback.
 */
const normalizeSummaryPayload = (raw) => {
  const root = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const data =
    root?.data &&
    typeof root.data === "object" &&
    (root.data.header ||
      root.data.priority_risks ||
      root.data.value1 ||
      root.data.takeaway)
      ? root.data
      : (root ?? {});

  const hasNewShape =
    SECTION_DEFS.some(
      (section) => section.key !== "header" && data[section.key] != null,
    ) ||
    (typeof data.header === "string" && !/^Hi\s+/i.test(data.header));

  if (hasNewShape || data.priority_risks != null || data.performance_trends != null) {
    const sections = SECTION_DEFS.map((def) => ({
      ...def,
      bullets: toBullets(data[def.key]),
    })).filter((section) => section.bullets.length > 0);

    return { sections };
  }

  // Legacy value1–value4
  const legacyBullets = ["value1", "value2", "value3", "value4"]
    .map((key) => data[key])
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());

  const takeaway = typeof data.takeaway === "string" ? data.takeaway.trim() : "";
  if (takeaway) legacyBullets.push(takeaway);

  if (legacyBullets.length) {
    return {
      sections: [
        {
          key: "legacy",
          title: "Summary",
          theme: "health",
          Icon: HealthIcon,
          bullets: legacyBullets,
        },
      ],
    };
  }

  const legacySummary =
    data.summary || data.briefing || data.overview || data.summarization || "";
  const legacyInsights = Array.isArray(data.insights)
    ? data.insights
    : Array.isArray(data.bullets)
      ? data.bullets
      : Array.isArray(data.points)
        ? data.points
        : [];

  const bullets = [
    ...(typeof legacySummary === "string" && legacySummary.trim()
      ? [legacySummary.trim()]
      : []),
    ...legacyInsights
      .map((item) =>
        typeof item === "string" ? item.trim() : item?.text || item?.title || "",
      )
      .filter(Boolean),
  ];

  return {
    sections: bullets.length
      ? [
          {
            key: "legacy",
            title: "Summary",
            theme: "health",
            Icon: HealthIcon,
            bullets,
          },
        ]
      : [],
  };
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

/**
 * Sequential typewriter for intro → section bullets.
 * Greeting uses a wave animation instead of typewriter.
 */
const useSummaryStream = ({ active, intro, sections }) => {
  const segments = [
    { key: "intro", text: intro || "" },
    ...sections.flatMap((section, sIndex) =>
      section.bullets.map((text, bIndex) => ({
        key: `s${sIndex}-b${bIndex}`,
        text: text || "",
      })),
    ),
  ].filter((segment) => segment.text);

  const contentKey = segments.map((segment) => segment.text).join("\u0001");
  const [streamedByKey, setStreamedByKey] = useState({});
  const [cursorKey, setCursorKey] = useState(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const frameRef = useRef(null);

  useEffect(() => {
    if (frameRef.current) {
      clearInterval(frameRef.current);
      frameRef.current = null;
    }

    if (!active || !segments.length) {
      setStreamedByKey({});
      setCursorKey(null);
      setDone(false);
      setStarted(false);
      return undefined;
    }

    setStarted(true);

    if (prefersReducedMotion()) {
      const full = Object.fromEntries(
        segments.map((segment) => [segment.key, segment.text]),
      );
      setStreamedByKey(full);
      setCursorKey(null);
      setDone(true);
      return undefined;
    }

    let segmentIndex = 0;
    let charIndex = 0;
    setStreamedByKey({});
    setCursorKey(segments[0].key);
    setDone(false);

    frameRef.current = setInterval(() => {
      const current = segments[segmentIndex];
      if (!current) {
        clearInterval(frameRef.current);
        frameRef.current = null;
        setCursorKey(null);
        setDone(true);
        return;
      }

      charIndex = Math.min(charIndex + STREAM_CHARS_PER_TICK, current.text.length);
      const partial = current.text.slice(0, charIndex);
      setStreamedByKey((prev) => ({ ...prev, [current.key]: partial }));
      setCursorKey(current.key);

      if (charIndex >= current.text.length) {
        segmentIndex += 1;
        charIndex = 0;
        if (segmentIndex >= segments.length) {
          clearInterval(frameRef.current);
          frameRef.current = null;
          setCursorKey(null);
          setDone(true);
        }
      }
    }, STREAM_INTERVAL_MS);

    return () => {
      if (frameRef.current) {
        clearInterval(frameRef.current);
        frameRef.current = null;
      }
    };
    // Restart only when popup opens or content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, contentKey]);

  return {
    started,
    introText: streamedByKey.intro || "",
    getBulletText: (sIndex, bIndex) => streamedByKey[`s${sIndex}-b${bIndex}`] || "",
    hasAnyBullet: (sIndex, bullets) =>
      bullets.some((_, bIndex) => streamedByKey[`s${sIndex}-b${bIndex}`]),
    cursorKey,
    done,
  };
};

const StreamCursor = () => (
  <span className="ai-summary-popup__cursor" aria-hidden="true" />
);

/** Letter-by-letter wave animation for "Hello" + name. */
const WaveGreeting = ({ userName = "there" }) => {
  const waveText = `Hello ${userName}`;
  return (
    <p className="ai-summary-popup__greeting">
      <span className="ai-summary-popup__greeting-name" aria-label={waveText}>
        {Array.from(waveText).map((char, index) => (
          <span
            key={`wave-${index}-${char}`}
            className="ai-summary-popup__greeting-char"
            style={{ animationDelay: `${index * 0.07}s` }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
      <span className="ai-summary-popup__greeting-suffix">! </span>
      <span className="ai-summary-popup__greeting-wave" aria-hidden="true">
        👋
      </span>
    </p>
  );
};

/**
 * AI Summary button + full-page scan, then sectioned briefing popup.
 * Fetches `/summarization` once per open/params change.
 */
const AISummaryButton = ({
  params,
  userName = "there",
  contextLabel = "",
  scope = "all",
  className = "",
}) => {
  const { showToast } = useToast();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const inFlightRef = useRef(false);
  const fetchedParamsKeyRef = useRef("");
  const paramsRef = useRef(params);
  const showToastRef = useRef(showToast);
  const scanTimerRef = useRef(null);
  const thinkingCopy = getThinkingCopy(scope);

  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [anchorRect, setAnchorRect] = useState(null);

  const paramsKey = params ? JSON.stringify(params) : "";
  paramsRef.current = params;
  showToastRef.current = showToast;

  const measureAnchor = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
    };
  }, []);

  const closePopup = useCallback(() => {
    setOpen(false);
    setAnchorRect(null);
  }, []);

  const fetchSummary = useCallback(async (force = false) => {
    const nextParams = paramsRef.current;
    const nextKey = nextParams ? JSON.stringify(nextParams) : "";
    if (!nextParams || !nextKey) return;
    if (inFlightRef.current) return;
    if (!force && fetchedParamsKeyRef.current === nextKey) return;

    inFlightRef.current = true;
    fetchedParamsKeyRef.current = nextKey;
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await getOrionAiInsights(nextParams);
      const body = response?.data ?? response;
      if (body?.status === false) {
        throw new Error(body?.message || "Failed to load AI summary");
      }
      setPayload(body);
    } catch (error) {
      setPayload(null);
      const message = error?.message || "Something went wrong loading AI summary";
      setErrorMessage(message);
      showToastRef.current?.({
        message,
        variant: "danger",
      });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
      document.body.classList.remove("ai-summary-scanning");
      document.body.classList.remove("ai-summary-popup-open");
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.classList.add("ai-summary-popup-open");
    } else {
      document.body.classList.remove("ai-summary-popup-open");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closePopup();
    };
    const onReposition = () => {
      const next = measureAnchor();
      if (next) setAnchorRect(next);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    window.visualViewport?.addEventListener("resize", onReposition);
    window.visualViewport?.addEventListener("scroll", onReposition);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      window.visualViewport?.removeEventListener("resize", onReposition);
      window.visualViewport?.removeEventListener("scroll", onReposition);
    };
  }, [open, closePopup, measureAnchor]);

  const startScanAndOpen = () => {
    if (scanning) return;
    setOpen(false);
    setScanning(true);
    document.body.classList.add("ai-summary-scanning");

    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      setScanning(false);
      document.body.classList.remove("ai-summary-scanning");
      const nextRect = measureAnchor();
      if (nextRect) setAnchorRect(nextRect);
      setOpen(true);
      if (paramsKey && fetchedParamsKeyRef.current !== paramsKey) {
        fetchSummary();
      } else if (!payload && paramsKey) {
        fetchSummary(true);
      }
      scanTimerRef.current = null;
    }, SCAN_DURATION_MS);
  };

  const handleToggle = () => {
    if (!params) {
      showToast({
        message: "Select a date range to generate an AI summary",
        variant: "warning",
      });
      return;
    }
    if (open || scanning) return;
    startScanAndOpen();
  };

  const handleRetry = () => {
    fetchedParamsKeyRef.current = "";
    fetchSummary(true);
  };

  const summaryContent = normalizeSummaryPayload(payload);
  const introText = contextLabel
    ? `Here is your summary for the ${contextLabel}.`
    : "Here is your summary for the selected dashboard filters.";
  const sections = summaryContent.sections;
  const isThinking = open && loading;
  const canStream = open && !loading && !errorMessage && Boolean(payload);

  const stream = useSummaryStream({
    active: canStream,
    intro: introText,
    sections,
  });

  const renderPopupBody = () => {
    if (isThinking) {
      return (
        <div className="ai-summary-popup__thinking">
          <div className="ai-summary-popup__thinking-head">
            <SparkIcon className="ai-summary-popup__thinking-spark" />
            <span className="ai-summary-popup__thinking-label">
              Analyzing Data&#160;
              <span className="ai-summary-popup__thinking-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </span>
          </div>
          <p className="ai-summary-popup__intro ai-summary-popup__intro--thinking">
            {thinkingCopy.intro}
          </p>
          <ul className="ai-summary-popup__list ai-summary-popup__list--placeholder">
            {thinkingCopy.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="ai-summary-popup__error">
          {/* <WaveGreeting userName={userName} /> */}
          <p className="ai-summary-popup__greeting">{`Hello ${userName}!`} 👋</p>
          <p className="ai-summary-popup__intro">{errorMessage}</p>
          <button type="button" className="ai-summary-popup__retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        {canStream ? (
          <p className="ai-summary-popup__greeting">{`Hello ${userName}!`}</p>
        ) : null}
        {stream.introText ? (
          <p className="ai-summary-popup__intro">
            {stream.introText}
            {stream.cursorKey === "intro" ? <StreamCursor /> : null}
          </p>
        ) : null}

        <div className="ai-summary-popup__sections">
          {sections.map((section, sIndex) => {
            if (!stream.hasAnyBullet(sIndex, section.bullets)) return null;
            const Icon = section.Icon;
            return (
              <section
                key={section.key}
                className={`ai-summary-section ai-summary-section--${section.theme}`}
              >
                <div className="ai-summary-section__head">
                  <span className="ai-summary-section__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h4 className="ai-summary-section__title">{section.title}</h4>
                </div>
                <ul className="ai-summary-section__list">
                  {section.bullets.map((_, bIndex) => {
                    const text = stream.getBulletText(sIndex, bIndex);
                    if (!text) return null;
                    return (
                      <li key={`${section.key}-${bIndex}`}>
                        {text}
                        {stream.cursorKey === `s${sIndex}-b${bIndex}` ? (
                          <StreamCursor />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {!loading && !sections.length && stream.done ? (
          <p className="ai-summary-popup__intro">
            No summary available for the selected filters.
          </p>
        ) : null}
      </>
    );
  };

  const floatStyle = anchorRect
    ? {
        top: `${anchorRect.top}px`,
        left: `${anchorRect.left}px`,
        width: `${anchorRect.width}px`,
        ["--ai-summary-btn-w"]: `${anchorRect.width}px`,
        ...getPopupLayoutVars(anchorRect),
      }
    : undefined;

  return (
    <div
      className={`ai-summary${className ? ` ${className}` : ""}${open ? " is-open" : ""}${
        scanning ? " is-scanning" : ""
      }`}
      ref={rootRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`ai-summary-btn${open || scanning ? " is-active" : ""}${
          open ? " is-placeholder" : ""
        }`}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="AI Summary"
        disabled={scanning}
        tabIndex={open ? -1 : undefined}
      >
        <SparkIcon className="ai-summary-btn__spark" />
        <span className="ai-summary-btn__label">AI Summary</span>
      </button>

      {scanning &&
        createPortal(
          <div className="ai-summary-scan" aria-hidden="true">
            <div className="ai-summary-scan__veil" />
            <div className="ai-summary-scan__beam" />
            <div className="ai-summary-scan__label">
              <SparkIcon className="ai-summary-popup__thinking-spark" />
              <span>Scanning dashboard…</span>
            </div>
          </div>,
          document.body,
        )}

      {open &&
        anchorRect &&
        createPortal(
          <>
            <div
              className="ai-summary-backdrop"
              aria-hidden="true"
              onClick={closePopup}
            />
            <div className="ai-summary-float" style={floatStyle}>
              <button
                type="button"
                className="ai-summary-btn is-active"
                onClick={closePopup}
                aria-expanded="true"
                aria-haspopup="dialog"
                aria-label="Close AI Summary"
              >
                <SparkIcon className="ai-summary-btn__spark" />
                <span className="ai-summary-btn__label">AI Summary</span>
              </button>
              <span className="ai-summary-float__arrow" aria-hidden="true" />
              <div className="ai-summary-popup" role="dialog" aria-label="AI Summary">
                <button
                  type="button"
                  className="ai-summary-popup__close"
                  onClick={closePopup}
                  aria-label="Close AI Summary"
                >
                  <CloseIcon />
                </button>
                <div className="ai-summary-popup__body">{renderPopupBody()}</div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default memo(AISummaryButton);

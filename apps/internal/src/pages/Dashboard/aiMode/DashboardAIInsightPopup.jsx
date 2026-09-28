import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDashboardAIMode } from "./DashboardAIModeContext";

const THINKING = [
  "Reading dashboard metrics...",
  "Understanding trends...",
  "Comparing historical performance...",
  "Detecting anomalies...",
  "Generating executive insights...",
];

const TrendBadge = ({ trend }) => {
  if (trend === "up") return <span className="ai-insight-loading__trend is-up">↑ Rising</span>;
  if (trend === "down")
    return <span className="ai-insight-loading__trend is-down">↓ Declining</span>;
  return <span className="ai-insight-loading__trend is-flat">→ Flat</span>;
};

const positionNearAnchor = (anchorEl, floatingEl) => {
  if (!anchorEl || !floatingEl) return { top: 24, left: 24 };
  const gap = 14;
  const width = floatingEl.offsetWidth || 360;
  const height = floatingEl.offsetHeight || 280;
  const rect = anchorEl.getBoundingClientRect();
  let left = rect.right + gap;
  let top = rect.top;

  if (left + width > window.innerWidth - 8) {
    left = rect.left - width - gap;
  }
  if (left < 8) {
    left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    top = rect.bottom + gap;
  }
  top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  return { top, left };
};

const DashboardAIInsightPopup = () => {
  const { phase, selectedMeta, selectedAnchor, deselect } = useDashboardAIMode();
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ top: 24, left: 24 });
  const [thinkingIndex, setThinkingIndex] = useState(0);

  useEffect(() => {
    if (phase !== "loading") {
      setThinkingIndex(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setThinkingIndex((i) => (i + 1) % THINKING.length);
    }, 320);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "idle" || !selectedAnchor) return undefined;
    const update = () => {
      setPosition(positionNearAnchor(selectedAnchor, cardRef.current));
    };
    update();
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [phase, selectedAnchor, selectedMeta]);

  if (phase === "idle" || !selectedMeta) return null;

  const data = selectedMeta.data || {};
  const isLoading = phase === "loading";

  return createPortal(
    <div
      className={`ai-insight-loading${isLoading ? "" : " is-summary"}`}
      style={{ top: position.top, left: position.left }}
      ref={cardRef}
      role={isLoading ? undefined : "dialog"}
      aria-label={
        isLoading
          ? `Analyzing ${selectedMeta.label}`
          : `AI insight for ${selectedMeta.label}`
      }
    >
      {isLoading ? (
        <>
          <div className="ai-insight-loading__orb" aria-hidden="true">
            <span className="ai-insight-loading__ring" />
            <span className="ai-insight-loading__core" />
          </div>
          <div className="ai-insight-loading__text">
            <b>Analyzing {selectedMeta.label}</b>
            <span>{THINKING[thinkingIndex]}</span>
          </div>
        </>
      ) : (
        <>
          <div className="ai-insight-loading__summary-head">
            <div className="ai-insight-loading__summary-title">
              <b>✦ AI Insight · {selectedMeta.label}</b>
              <span>
                {(selectedMeta.type || "chart").charAt(0).toUpperCase() +
                  (selectedMeta.type || "chart").slice(1)}{" "}
                · generated just now
              </span>
            </div>
            <button
              type="button"
              className="ai-insight-loading__close"
              onClick={(event) => {
                event.stopPropagation();
                deselect();
              }}
              aria-label="Close AI insight"
            >
              ✕
            </button>
          </div>

          <div className="ai-insight-loading__summary-body">
            <section className="ai-insight-loading__sec">
              <div className="ai-insight-loading__sec-head">
                <span className="dot" style={{ background: "#2F6FED" }} />
                Executive Summary
              </div>
              <p>{data.exec}</p>
            </section>

            <section className="ai-insight-loading__sec">
              <div className="ai-insight-loading__sec-head">
                <span className="dot" style={{ background: "#6E5AF5" }} />
                Key Insights
              </div>
              <ul>
                {(data.insights || []).map((item) => (
                  <li key={item}>
                    <span className="ico">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ai-insight-loading__sec ai-insight-loading__sec--trend">
              <div className="ai-insight-loading__sec-head" style={{ marginBottom: 0 }}>
                <span className="dot" style={{ background: "#33C7F0" }} />
                Trends
              </div>
              <TrendBadge trend={selectedMeta.trend} />
            </section>

            <section className="ai-insight-loading__sec">
              <p>{data.trendText}</p>
            </section>

            <section className="ai-insight-loading__sec is-risk">
              <div className="ai-insight-loading__sec-head">
                <span className="dot" style={{ background: "#E23B3B" }} />
                Risks
              </div>
              <ul>
                {(data.risks || []).map((item) => (
                  <li key={item}>
                    <span className="ico">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ai-insight-loading__sec is-action">
              <div className="ai-insight-loading__sec-head">
                <span className="dot" style={{ background: "#2F6FED" }} />
                Recommended Actions
              </div>
              <ul>
                {(data.actions || []).map((item) => (
                  <li key={item}>
                    <span className="ico">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ai-insight-loading__sec">
              <div className="ai-insight-loading__sec-head">
                <span className="dot" style={{ background: "#F59E0B" }} />
                Business Impact
              </div>
              <p>{data.impact}</p>
            </section>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
};

export default memo(DashboardAIInsightPopup);

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { matchFreeFlowLabels } from "utils/subToolLabels";

const GAP = 8;
const MORE_BTN_MIN_WIDTH = 42;

const SubToolLabelChip = ({ label, measure = false, className = "" }) => {
  const bg = label?.back_ground_colour || label?.colour_code || "transparent";
  return (
    <div
      className={`bg-gray_label ticket-priority sub-tool-label-item ${measure ? "sub-tool-label-measure-item" : ""} ${className}`}
      style={{
        backgroundColor: bg,
        color: "#ffffff",
        border: "none",
        borderRadius: "18px",
        lineHeight: "16px",
        fontSize: "11px",
        padding: "0px",
      }}
      title={label?.name || ""}
    >
      <span className="sub-tool-label-text">{label?.name || "---"}</span>
    </div>
  );
};

const resolveLabelIds = (card, labelIds) => {
  if (labelIds != null && labelIds !== "") {
    const list = Array.isArray(labelIds) ? labelIds : [labelIds];
    if (list.length) return list;
  }
  if (Array.isArray(card?.subToolLabels) && card.subToolLabels.length) {
    return card.subToolLabels;
  }
  if (card?.freeFlowLabelId != null && card.freeFlowLabelId !== "") {
    const list = Array.isArray(card.freeFlowLabelId)
      ? card.freeFlowLabelId
      : [card.freeFlowLabelId];
    if (list.length) return list;
  }
  return [];
};

/**
 * Width-based label chips with +N overflow tooltip.
 * Accepts either pre-resolved `labels`, or `labelIds`/`card` + `labelList`.
 */
const SubToolLabels = ({
  card,
  labelList,
  labelIds,
  labels: labelsProp,
  className = "",
}) => {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const moreBtnRef = useRef(null);
  const tooltipRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(null);
  const [openMore, setOpenMore] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const labels = useMemo(() => {
    if (Array.isArray(labelsProp)) {
      return labelsProp.filter(Boolean);
    }
    return matchFreeFlowLabels(labelList, resolveLabelIds(card, labelIds));
  }, [card, labelIds, labelList, labelsProp]);

  const recalc = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || !labels.length) {
      setVisibleCount(labels.length);
      return;
    }

    const available = container.clientWidth;
    if (available <= 0) {
      setVisibleCount(labels.length);
      return;
    }

    const chips = Array.from(
      measure.querySelectorAll(".sub-tool-label-measure-item"),
    );
    if (!chips.length) {
      setVisibleCount(labels.length);
      return;
    }

    let totalWidth = 0;
    chips.forEach((chip, index) => {
      totalWidth += chip.offsetWidth + (index > 0 ? GAP : 0);
    });

    if (totalWidth <= available) {
      setVisibleCount(labels.length);
      return;
    }

    let used = 0;
    let count = 0;
    for (let i = 0; i < chips.length; i += 1) {
      const width = chips[i].offsetWidth;
      const nextUsed = used + (count > 0 ? GAP : 0) + width;
      if (nextUsed + GAP + MORE_BTN_MIN_WIDTH <= available) {
        used = nextUsed;
        count = i + 1;
      } else {
        break;
      }
    }

    setVisibleCount(count);
  }, [labels]);

  useLayoutEffect(() => {
    recalc();
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => recalc());
    observer.observe(node);
    return () => observer.disconnect();
  }, [recalc]);

  useEffect(() => {
    setOpenMore(false);
  }, [card?.orderId, card?.toolTicketId, labels.length]);

  useEffect(() => {
    if (!openMore) return undefined;

    const updatePosition = () => {
      const btn = moreBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setTooltipPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left),
      });
    };

    updatePosition();

    const onPointerDown = (event) => {
      if (
        moreBtnRef.current?.contains(event.target) ||
        tooltipRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpenMore(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenMore(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMore]);

  if (!labels.length) return null;

  const shownCount = visibleCount == null ? labels.length : visibleCount;
  const visibleLabels = labels.slice(0, shownCount);
  const remainingLabels = labels.slice(shownCount);
  const remainingCount = remainingLabels.length;

  return (
    <div className={`sub-tool-labels ${className}`.trim()} ref={containerRef}>
      <div className="sub-tool-labels-measure" ref={measureRef} aria-hidden="true">
        {labels.map((label, i) => (
          <SubToolLabelChip key={`measure-${label?.status_id ?? i}`} label={label} measure />
        ))}
      </div>

      <div className="d-flex flex-row flex-nowrap align-items-center gap-2 sub-tool-labels-visible">
        {visibleLabels.map((label, i) => (
          <SubToolLabelChip key={label?.status_id ?? i} label={label} />
        ))}
        {remainingCount > 0 && (
          <button
            type="button"
            ref={moreBtnRef}
            className="sub-tool-labels-more-btn"
            onClick={(event) => {
              event.stopPropagation();
              setOpenMore((prev) => !prev);
            }}
            aria-expanded={openMore}
            aria-label={`Show ${remainingCount} more labels`}
          >
            +{remainingCount}
          </button>
        )}
      </div>

      {openMore &&
        remainingCount > 0 &&
        createPortal(
          <div
            ref={tooltipRef}
            className="sub-tool-labels-more-tooltip"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {remainingLabels.map((label, i) => (
              <SubToolLabelChip
                key={`more-${label?.status_id ?? i}`}
                label={label}
                className="sub-tool-label-tooltip-item"
              />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SubToolLabels;

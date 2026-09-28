import React from "react";

/**
 * Small source-origin chip displayed in section headers when branding
 * data was extracted by the scraper.
 *
 * source: "figma" | "pdf"
 * onViewReference: optional callback — renders "View reference" button
 *   next to badge (only meaningful when source === "figma" and a url is set)
 * hideBadge: hides the source chip while preserving the reference action
 */
const BrandingSourceBadge = ({ source, onViewReference, hideBadge = false }) => {
  if (!source || (hideBadge && !onViewReference)) return null;

  return (
    <div className="branding-source-badge-group">
      {onViewReference && (
        <button
          type="button"
          className="branding-source-badge__view-ref btn btn-sm"
          onClick={onViewReference}
        >
          <span className="branding-source-badge__view-ref-dot" aria-hidden="true" />
          View reference
        </button>
      )}
    </div>
  );
};

export default BrandingSourceBadge;

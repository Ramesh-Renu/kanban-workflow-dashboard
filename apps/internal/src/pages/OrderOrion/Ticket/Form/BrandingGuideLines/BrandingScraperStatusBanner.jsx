import React, { useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import { t } from "i18next";
import {
  SCRAPER_JOB_STATUS,
  buildScraperJobSourceStatusRows,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";

function SourceStatusMarker({ state }) {
  if (state === "active") {
    return (
      <span
        className="branding-scraper-progress__marker branding-scraper-progress__marker--active"
        aria-hidden="true"
      >
        <span className="icon-hour-glass branding-scraper-progress__sandclock" />
      </span>
    );
  }

  const iconClass =
    state === "completed"
      ? "icon-success-tick"
      : state === "cancelled"
        ? "icon-failure-cross"
        : "icon-failure-cross";

  return (
    <span
      className={`branding-scraper-progress__marker branding-scraper-progress__marker--${state}`}
      aria-hidden="true"
    >
      <span className={iconClass}>
        <span className="path1" />
        <span className="path2" />
      </span>
    </span>
  );
}

const BrandingScraperStatusBanner = ({ scraperJob, onRetry, onCancel }) => {
  const status = scraperJob?.status;
  const canRetry = Boolean(scraperJob?.canRetry);
  const [isCancelling, setIsCancelling] = useState(false);
  const rows = useMemo(
    () => buildScraperJobSourceStatusRows(scraperJob),
    [scraperJob],
  );

  if (!status || status === SCRAPER_JOB_STATUS.IDLE || !rows.length) return null;

  const hasFailedRow = rows.some((row) => row.state === "failed");
  const hasCancelledRow = rows.some((row) => row.state === "cancelled");
  const hasCompletedRow = rows.some((row) => row.state === "completed");
  const hasActiveRow = rows.some((row) => row.state === "active");
  const isFailed =
    status === SCRAPER_JOB_STATUS.FAILED ||
    (hasFailedRow && !hasCompletedRow && !hasActiveRow && !hasCancelledRow);
  const isCompleted =
    status === SCRAPER_JOB_STATUS.COMPLETED && !hasFailedRow && !hasActiveRow;
  const isMixed =
    (hasFailedRow || hasCancelledRow) && hasCompletedRow && !hasActiveRow;
  const showRetry =
    (isFailed || isMixed) &&
    canRetry &&
    !hasCancelledRow &&
    typeof onRetry === "function";

  const canCancelFigmaRow = (row) =>
    row.sourceId === "figma" &&
    row.state === "active" &&
    Boolean(row.jobId) &&
    typeof onCancel === "function";

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  const bannerClass = hasActiveRow
    ? "branding-scraper-status--in-progress"
    : isMixed
      ? "branding-scraper-status--mixed"
      : hasCancelledRow && !hasFailedRow
        ? "branding-scraper-status--cancelled"
        : isFailed
          ? "branding-scraper-status--failed"
          : isCompleted
            ? "branding-scraper-status--completed"
            : "branding-scraper-status--in-progress";

  const ariaLabel = isFailed
    ? t("order_view.branding_scraper_failed_aria", "Branding generation failed")
    : isMixed
      ? t(
          "order_view.branding_scraper_partial_aria",
          "Branding extraction finished with partial failures",
        )
      : t("order_view.branding_scraper_progress_aria", "Branding scraper job progress");

  return (
    <div
      className={`branding-scraper-status branding-scraper-progress ${bannerClass}`}
      role={isFailed || isMixed ? "alert" : "status"}
      aria-live={isFailed || isMixed ? "assertive" : "polite"}
      aria-label={ariaLabel}
    >
      <ul className="branding-scraper-progress__sources list-unstyled mb-0">
        {rows.map((row) => (
          <li
            key={row.sourceId}
            className={`branding-scraper-progress__source branding-scraper-progress__source--${row.state}`}
          >
            <SourceStatusMarker state={row.state} />
            <span className="branding-scraper-progress__source-name">
              {t(
                `order_view.branding_scraper_source_${row.sourceId}`,
                row.sourceFallback,
              )}
            </span>
            <div className="branding-scraper-progress__source-actions">
              <span
                className={`branding-scraper-progress__source-status branding-scraper-progress__source-status--${row.state} ${row.customClassName || ""}`}
              >
                {t(`order_view.${row.statusLabelKey}`, row.statusFallback)}
              </span>
              {canCancelFigmaRow(row) ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="branding-scraper-progress__cancel-btn text-decoration-none"
                  disabled={isCancelling}
                  onClick={handleCancel}
                >
                  {isCancelling
                    ? t("common.cancelling", "Cancelling...")
                    : t("common.cancel", "Cancel")}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {showRetry ? (
        <div className="branding-scraper-progress__actions">
          <Button
            type="button"
            variant="outline-secondary"
            size="sm"
            className="branding-scraper-progress__retry-btn"
            onClick={onRetry}
          >
            {t("order_view.branding_scraper_retry", "Retry")}
          </Button>
        </div>
      ) : isFailed || (isMixed && hasFailedRow) ? (
        <p className="branding-scraper-progress__failed-note mb-0 fs-12">
          {t(
            "order_view.branding_scraper_failed_reextract_hint",
            isMixed
              ? "Some sources failed. Use Re-extract to run again with your sources."
              : "Extraction failed. Use Re-extract to run again with your sources.",
          )}
        </p>
      ) : null}
    </div>
  );
};

export default BrandingScraperStatusBanner;

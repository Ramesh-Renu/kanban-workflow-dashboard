import React from "react";
import { t } from "i18next";
import {
  BASE_SCRAPER_TAB_LABELS,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";

const BrandingSectionSourceTabs = ({
  sectionId,
  availableSources = [],
  selectedSource = "",
  onSelectSource,
  onResetSource,
}) => {
  if (!sectionId || availableSources.length === 0) {
    return null;
  }

  const activeSource = availableSources.includes(selectedSource)
    ? selectedSource
    : "";

  return (
    <div
      className="branding-section-source-tabs"
      role="group"
      aria-label={t(
        "order_view.branding_scraper_section_source",
        "Generated source",
      )}
    >
      {availableSources.map((sourceId) => {
        const isActive = sourceId === activeSource;
        return (
          <button
            key={sourceId}
            id={`branding-scraper-source-${sectionId}-${sourceId}`}
            type="button"
            aria-pressed={isActive}
            className={`branding-section-source-tabs__tab${isActive ? " active" : ""}`}
            onClick={() => onSelectSource?.(sectionId, sourceId)}
          >
            {t(
              `order_view.branding_scraper_source_${sourceId}`,
              BASE_SCRAPER_TAB_LABELS[sourceId] || sourceId,
            )}
          </button>
        );
      })}
      {selectedSource ? (
        <button
          type="button"
          className="branding-section-source-tabs__reset"
          onClick={() => onResetSource?.(sectionId)}
        >
          {t("order_view.branding_scraper_source_reset", "Reset")}
        </button>
      ) : null}
    </div>
  );
};

export function shouldShowSectionSourceTabs(scraperJob) {
  return (
    Array.isArray(scraperJob?.availableSources) &&
    scraperJob.availableSources.length > 0
  );
}

export default BrandingSectionSourceTabs;

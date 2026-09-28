import React from "react";
import { t } from "i18next";

const RECOMMENDATIONS_BY_TAB = {
  figma: [
    {
      key: "figma_url",
      fallback: "Enter the full Figma design file URL (required with Figma PDF).",
    },
    {
      key: "figma_pdf",
      fallback: "Upload a PDF export of the branding frames (required with Figma URL).",
    },
    {
      key: "default_source",
      fallback: "Turn on Set as Default when this should populate the form first.",
    },
  ],
  website: [
    {
      key: "website_url",
      fallback: "Enter the public marketing or style-guide page URL.",
    },
    {
      key: "website_access",
      fallback: "Ensure the page is reachable without login for reliable scraping.",
    },
    {
      key: "default_source",
      fallback: "Mark as default if website data should take priority over other sources.",
    },
  ],
  pdf: [
    {
      key: "pdf_quality",
      fallback: "Upload a clear branding guidelines PDF (text and colors visible).",
    },
    {
      key: "pdf_single",
      fallback: "One PDF per upload — combine sections into a single file when possible.",
    },
    {
      key: "default_source",
      fallback: "Enable Set as Default to apply PDF values to the form after generation.",
    },
  ],
};

const BaseScraperRecommendations = ({ activeTab }) => {
  const items = RECOMMENDATIONS_BY_TAB[activeTab] || RECOMMENDATIONS_BY_TAB.pdf;

  return (
    <div className="branding-base-scraper__recommendations" role="note">
      <p className="branding-base-scraper__recommendations-title mb-2">
        {t("order_view.branding_scraper_recommendations_title", "Before you proceed")}
      </p>
      <ul className="branding-base-scraper__recommendations-list mb-0">
        {items.map((item) => (
          <li key={item.key}>
            {t(`order_view.branding_scraper_rec_${item.key}`, item.fallback)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BaseScraperRecommendations;

import { t } from "i18next";
import React from "react";

/**
 * Tinted panel listing scraper-detected alternative fonts with "Use as primary".
 */
const BrandingFontAlternativesPanel = ({
  alternatives = [],
  activeFont = "",
  onSelect,
  disabled = false,
}) => {
  if (!alternatives.length) return null;

  const active = String(activeFont ?? "").trim().toLowerCase();

  return (
    <div className="branding-font-alternatives">
      <div className="branding-font-alternatives__title">
        {t(
          "order_view.branding_alternative_fonts_detected",
          "ALTERNATIVE FONTS DETECTED"
        )}
      </div>
      <ul className="branding-font-alternatives__list">
        {alternatives.map((font) => {
          const isActive = font.toLowerCase() === active;
          return (
            <li
              key={font}
              className={[
                "branding-font-alternatives__item",
                isActive ? "branding-font-alternatives__item--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="branding-font-alternatives__name">{font}</span>
              <button
                type="button"
                className="branding-font-alternatives__use-btn btn btn-link p-0"
                disabled={disabled || isActive}
                onClick={() => onSelect?.(font)}
              >
                {t("order_view.branding_use_as_primary", "Use as primary")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BrandingFontAlternativesPanel;

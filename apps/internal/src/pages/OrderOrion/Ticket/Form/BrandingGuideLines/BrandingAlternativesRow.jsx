import { t } from "i18next";
import React from "react";

/**
 * "Alternatives: ▢ ▢ ▢ ▢ ▢" row shown below color fields when the
 * scraper detected multiple candidate colors for that field.
 *
 * alternatives  — string[] of hex colors
 * activeColor   — currently selected hex (highlighted with a ring)
 * onSelect      — (hexColor: string) => void
 * disabled      — suppresses clicks
 */
const BrandingAlternativesRow = ({ alternatives = [], activeColor = "", onSelect, disabled }) => {
  if (!alternatives.length) return null;

  return (
    <div className="branding-alternatives-row">
      <span className="branding-alternatives-row__label">
        {t("order_view.branding_alternatives", "Alternatives:")}
      </span>
      <div className="branding-alternatives-row__swatches">
        {alternatives.map((color) => {
          const isActive =
            color.toLowerCase() === (activeColor ?? "").toLowerCase();
          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              title={color}
              aria-label={`${t("order_view.branding_select_alternative", "Select")} ${color}`}
              className={[
                "branding-alternatives-row__swatch",
                isActive ? "branding-alternatives-row__swatch--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ backgroundColor: color }}
              onClick={() => onSelect?.(color)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BrandingAlternativesRow;

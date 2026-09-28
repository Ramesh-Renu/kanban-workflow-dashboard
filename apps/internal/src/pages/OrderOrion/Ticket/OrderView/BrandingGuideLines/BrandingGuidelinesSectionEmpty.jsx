import { t } from "i18next";
import React from "react";

/**
 * Empty state for a branding section with no saved field values, notes, or attachments.
 */
const BrandingGuidelinesSectionEmpty = ({ sectionTitle }) => {
  return (
    <div
      className="branding-guidelines-section-empty text-center"
      role="status"
      aria-live="polite"
    >
      <div className="branding-guidelines-section-empty__visual mx-auto mb-3" aria-hidden>
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="8"
            y="6"
            width="32"
            height="36"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M16 14h16M16 22h16M16 30h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="34" cy="34" r="8" fill="var(--color-light-gray, #f5f5f5)" stroke="currentColor" strokeWidth="1.5" />
          <path d="M31.5 34h5M34 31.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="branding-guidelines-section-empty__title fw-semibold mb-2">
        {t("order_view.branding_section_empty_title", "Nothing to display")}
      </p>
      <p className="branding-guidelines-section-empty__description text-muted mb-0 mx-auto">
        {sectionTitle
          ? t("order_view.branding_section_empty_description_named", {
              section: sectionTitle,
              defaultValue:
                "No field values, notes, or attachments were saved for {{section}} on this order.",
            })
          : t(
              "order_view.branding_section_empty_description",
              "No field values, notes, or attachments were saved for this section on this order."
            )}
      </p>
    </div>
  );
};

export default BrandingGuidelinesSectionEmpty;

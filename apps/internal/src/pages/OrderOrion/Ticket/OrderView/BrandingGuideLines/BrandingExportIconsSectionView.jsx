import React from "react";
import { t } from "i18next";
import BrandingGuidelinesAttachmentFile from "./BrandingGuidelinesAttachmentFile";

/**
 * Read-only export icons list: one header row, compact name + attachment per icon.
 */
const BrandingExportIconsSectionView = ({ entries = [] }) => {
  const iconNameLabel = t("order_view.branding_field_icon_name", "Icon Name");
  const attachmentLabel = t("order_view.attachment", "Attachment");

  if (!entries.length) {
    return <p className="value_field mb-0">—</p>;
  }

  return (
    <div
      className="branding-export-icons-view"
      role="table"
      aria-label={t("order_view.branding_section_export_icons", "Export icons")}
    >
      <div className="branding-export-icons-view__header" role="row">
        <div className="branding-export-icons-view__header-cell" role="columnheader">
          {iconNameLabel}
        </div>
        <div className="branding-export-icons-view__header-cell" role="columnheader">
          {attachmentLabel}
        </div>
      </div>

      {entries.map((entry) => {
        const displayName = String(entry.iconName || "").trim() || "—";

        return (
          <div key={entry.key} className="branding-export-icons-view__row" role="row">
            <div
              className="branding-export-icons-view__cell branding-export-icons-view__cell--name"
              role="cell"
              data-label={iconNameLabel}
            >
              {displayName}
            </div>
            <div
              className="branding-export-icons-view__cell branding-export-icons-view__cell--attachment"
              role="cell"
              data-label={attachmentLabel}
            >
              {entry.attachment ? (
                <BrandingGuidelinesAttachmentFile file={entry.attachment} />
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BrandingExportIconsSectionView;

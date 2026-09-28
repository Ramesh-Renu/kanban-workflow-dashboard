import React, { Fragment } from "react";
import { t } from "i18next";
import {
  isBrandingNotesHtmlEmpty,
  sanitizeBrandingNotesPreviewHtml,
} from "../utils/brandingGuidelinesConfig";

const TEXT_FORMAT_CHIP_LABELS = {
  bold: "B",
  italic: "I",
  underline: "U",
  uppercase: "AA",
  lowercase: "aa",
  capitalize: "Aa",
};

const TEXT_FORMAT_CHIP_CLASS = {
  bold: "branding-preview-values-format-chip--bold",
  italic: "branding-preview-values-format-chip--italic",
  underline: "branding-preview-values-format-chip--underline",
};

const CSS_HEX_COLOR_REGEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const isFullWidthPreviewItem = (item) =>
  item.type === "html" || item.key === "section-notes" || item.key === "guideline-notes";

const shouldHidePreviewItemLabel = (item) => item.key === "guideline-notes";

/** Ensures hex codes render correctly as CSS background colors. */
export const normalizeBrandingPreviewColor = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return "";
  if (CSS_HEX_COLOR_REGEX.test(raw)) {
    return raw.startsWith("#") ? raw : `#${raw}`;
  }
  return "";
};

const renderColorWithCode = (value) => (
  <span className="d-inline-flex align-items-center gap-2 branding-preview-values-color">
    <span
      className="branding-preview-values-swatch flex-shrink-0"
      style={{ backgroundColor: value }}
      title={value}
      aria-hidden
    />
    <span className="text-uppercase branding-preview-values-color-code">{value}</span>
  </span>
);

export const renderBrandingPreviewValue = (it) => {
  if (it.type === "color") {
    const colorValue = normalizeBrandingPreviewColor(it.value);
    if (!colorValue) return "—";
    return renderColorWithCode(colorValue);
  }

  if (it.type === "textFormatting") {
    const formats = Array.isArray(it.value) ? it.value : [];
    if (formats.length === 0) return "—";
    return (
      <div className="d-flex flex-wrap gap-1 justify-content-end branding-preview-values-formats">
        {formats.map((f) => {
          const formatKey = String(f).toLowerCase();
          const styleClass = TEXT_FORMAT_CHIP_CLASS[formatKey] || "";
          return (
            <span
              key={f}
              className={`branding-preview-values-format-chip ${styleClass}`.trim()}
              title={formatKey}
            >
              {TEXT_FORMAT_CHIP_LABELS[formatKey] || f}
            </span>
          );
        })}
      </div>
    );
  }

  if (it.type === "attachment") {
    const name = String(it.value || "").trim();
    if (!name) return "—";
    return <span className="fst-italic">{name}</span>;
  }

  if (it.type === "html") {
    if (isBrandingNotesHtmlEmpty(it.value)) return "—";
    const html = sanitizeBrandingNotesPreviewHtml(it.value);
    return (
      <div
        className="branding-preview-values-html text-start w-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const text = String(it.value ?? "").trim();
  return text || "—";
};

const renderPreviewItem = (it) => {
  if (it.type === "exportIconEntry") {
    const iconName = String(it.iconName || "").trim() || "—";
    const fileName = String(it.fileName || "").trim();

    return (
      <div key={it.key} className="branding-preview-export-icon-entry">
        <div className="branding-preview-values-row d-flex justify-content-between gap-3 align-items-start">
          <span className="small branding-preview-values-item-label flex-shrink-0">
            {t("order_view.branding_field_icon_name", "Icon Name")}
          </span>
          <span className="small fw-semibold text-break d-flex gap-2 branding-preview-values-item-value text-end align-items-center">
            {iconName}
          </span>
        </div>
        <div className="branding-preview-values-row d-flex justify-content-between gap-3 align-items-start">
          <span className="small branding-preview-values-item-label flex-shrink-0">
            {t("order_view.attachment", "Attachment")}
          </span>
          <span className="small fw-semibold text-break d-flex gap-2 branding-preview-values-item-value text-end align-items-center">
            {fileName ? <span className="fst-italic">{fileName}</span> : "—"}
          </span>
        </div>
      </div>
    );
  }

  if (isFullWidthPreviewItem(it)) {
    return (
      <div
        key={it.key}
        className="branding-preview-values-row branding-preview-values-row--notes d-flex flex-column align-items-stretch gap-1"
      >
        {!shouldHidePreviewItemLabel(it) && (
          <span className="small branding-preview-values-item-label">{it.label}</span>
        )}
        <div className="small text-break branding-preview-values-item-value text-start w-100">
          {renderBrandingPreviewValue(it)}
        </div>
      </div>
    );
  }

  return (
    <div
      key={it.key}
      className="branding-preview-values-row d-flex justify-content-between gap-3 align-items-start"
    >
      <span className="small branding-preview-values-item-label flex-shrink-0">{it.label}</span>
      <span className="small text-break d-flex gap-2 branding-preview-values-item-value text-end align-items-center">
        {renderBrandingPreviewValue(it)}
      </span>
    </div>
  );
};

export const BrandingPreviewSectionBody = ({
  section,
  sectionTitle,
  excludeAttachments = false,
  pdfPageBreaks = false,
}) => {
  if (!section?.groups?.length) {
    const empty = (
      <p className="text-muted fs-14 mb-0 py-3">
        {t(
          "order_view.branding_preview_section_empty",
          "No field values to display for this section."
        )}
      </p>
    );

    if (!pdfPageBreaks) return empty;

    return (
      <div className="branding-preview-pdf-block">
        {sectionTitle ? (
          <h6 className="branding-preview-values-title mb-0">{sectionTitle}</h6>
        ) : null}
        {empty}
      </div>
    );
  }

  const groups = section.groups
    .map((group, gIdx) => {
      const visibleItems = group.items.filter(
        (it) =>
          it.type === "exportIconEntry" || !excludeAttachments || it.type !== "attachment"
      );
      if (visibleItems.length === 0) return null;

      const groupContent = (
        <div className="branding-preview-values-group">
          {gIdx === 0 && sectionTitle ? (
            <h6 className="branding-preview-values-title mb-0">{sectionTitle}</h6>
          ) : null}
          {group.title ? (
            <div className="text-uppercase fw-bold mb-2 branding-preview-values-group-title fs-12">
              {group.title}
            </div>
          ) : null}
          <div className="branding-preview-values-group-card">
            {visibleItems.map((it) => renderPreviewItem(it))}
          </div>
        </div>
      );

      if (pdfPageBreaks) {
        return (
          <div key={`${section.sectionId}-${gIdx}`} className="branding-preview-pdf-block">
            {groupContent}
          </div>
        );
      }

      return <Fragment key={`${section.sectionId}-${gIdx}`}>{groupContent}</Fragment>;
    })
    .filter(Boolean);

  if (pdfPageBreaks) {
    return <>{groups}</>;
  }

  return <div className="d-flex flex-column gap-2 branding-preview-values-sections">{groups}</div>;
};

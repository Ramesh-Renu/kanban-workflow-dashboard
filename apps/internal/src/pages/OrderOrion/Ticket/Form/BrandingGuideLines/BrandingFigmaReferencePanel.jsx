import { t } from "i18next";
import React from "react";

/** True when the reference URL points at a raster/vector image (not a Figma embed). */
function isDirectImageReferenceUrl(url = "") {
  const value = String(url).trim();
  if (!value) return false;
  try {
    const { pathname } = new URL(value);
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(pathname);
  } catch {
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(value);
  }
}

/**
 * Slide-in panel that displays a Figma section imageReference.
 * Scraper refs are usually Azure blob JPEGs — render those as <img>.
 * Non-image URLs (legacy Figma file links) still use an iframe embed.
 *
 * referenceUrl — direct image URL from scraper imageReference
 * sectionTitle — human-readable name for the active section
 * onClose      — close callback
 */
const BrandingFigmaReferencePanel = ({ referenceUrl, sectionTitle, onClose }) => {
  const url = String(referenceUrl ?? "").trim();
  const showAsImage = isDirectImageReferenceUrl(url);
  const iframeSrc = showAsImage
    ? ""
    : url
      ? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
      : "";

  return (
    <div className="branding-figma-ref-panel">
      <div className="branding-figma-ref-panel__header">
        <span className="branding-figma-ref-panel__header-dot" aria-hidden="true" />
        <span className="branding-figma-ref-panel__header-label">
          {t("order_view.branding_figma_reference", "FIGMA REFERENCE")}
        </span>
        <div className="ms-auto d-flex gap-2 align-items-center">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="branding-figma-ref-panel__actual-size-btn"
            >
              {t("order_view.branding_figma_actual_size", "Actual size")}
            </a>
          )}
          <button
            type="button"
            className="branding-figma-ref-panel__close-btn"
            onClick={onClose}
            aria-label={t("order_view.branding_figma_close", "Close reference")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="branding-figma-ref-panel__content">
        {url ? (
          <div className="branding-figma-ref-panel__frame-wrap">
            {showAsImage ? (
              <img
                className="branding-figma-ref-panel__image"
                src={url}
                alt={t("order_view.branding_figma_reference_alt", {
                  defaultValue: `Figma reference — ${sectionTitle}`,
                  section: sectionTitle,
                })}
              />
            ) : (
              <iframe
                className="branding-figma-ref-panel__iframe"
                src={iframeSrc}
                allowFullScreen
                title={`Figma reference — ${sectionTitle}`}
              />
            )}
          </div>
        ) : (
          <div className="branding-figma-ref-panel__placeholder">
            <p className="mb-1">
              {t("order_view.branding_figma_no_url", "No Figma reference image is available.")}
            </p>
            <p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>
              {t(
                "order_view.branding_figma_no_url_hint",
                "View reference appears when the Figma extraction includes an imageReference."
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandingFigmaReferencePanel;

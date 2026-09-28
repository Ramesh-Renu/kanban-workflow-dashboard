import { t } from "i18next";
import React, { forwardRef } from "react";
import { Col } from "react-bootstrap";
import { BrandingPreviewSectionBody } from "./BrandingPreviewValues";

const BrandingPreviewExportHeader = ({ exportMetadata }) => (
  <div className="branding-preview-panel__pdf-meta">
    <div className="branding-preview-panel__pdf-meta-head">
      <p className="branding-preview-panel__pdf-eyebrow mb-0">
        {t("order_view.branding_pdf_report_label", "Branding report")}
      </p>
      <h1 className="branding-preview-panel__pdf-title mb-0">
        {t("order_view.branding_guidelines", "Branding Guidelines")}
      </h1>
    </div>

    <div className="branding-preview-panel__pdf-info-grid">
      <div className="branding-preview-panel__pdf-info-card">
        <span className="branding-preview-panel__pdf-info-label">
          {t("order_view.branding_pdf_order_id", "Order ID")}
        </span>
        <span className="branding-preview-panel__pdf-info-value">
          {exportMetadata.orderId || "—"}
        </span>
      </div>
      <div className="branding-preview-panel__pdf-info-card">
        <span className="branding-preview-panel__pdf-info-label">
          {t("order_view.company_name", "Company Name")}
        </span>
        <span className="branding-preview-panel__pdf-info-value">
          {exportMetadata.companyName || "—"}
        </span>
      </div>
    </div>
  </div>
);

const BrandingPreviewPanelContent = forwardRef(
  ({ previewSections, excludeAttachments = false, exportMetadata = null }, ref) => {
    const pdfPageBreaks = Boolean(exportMetadata);

    return (
      <div
        ref={ref}
        className={`border rounded-3 p-0 bg-white branding-preview-panel${
          exportMetadata ? " branding-preview-panel--pdf-export" : ""
        }`}
      >
        {exportMetadata ? (
          <div className="branding-preview-pdf-block">
            <BrandingPreviewExportHeader exportMetadata={exportMetadata} />
          </div>
        ) : (
          <div className="branding-preview-panel__head px-3 pt-3 pb-2">
            <h6 className="mb-0 fw-semibold fs-14">
              {t("order_view.branding_preview_title", "Preview")}
            </h6>
            <p className="text-muted mb-0 mt-1 branding-preview-panel__subtitle fs-12">
              {t(
                "order_view.branding_preview_subtitle",
                "Live summary of all entered branding values."
              )}
            </p>
          </div>
        )}

        <div className="branding-preview-panel__body branding-guidelines-v2__preview-values branding-preview-values">
          {previewSections.length === 0 ? (
            <p className="text-muted fs-14 mb-0 text-center py-5">
              {t(
                "order_view.branding_preview_empty",
                "No branding values entered yet. Fill in section fields to see the preview."
              )}
            </p>
          ) : pdfPageBreaks ? (
            previewSections.map((sec) => (
              <BrandingPreviewSectionBody
                key={sec.sectionId}
                section={sec}
                sectionTitle={sec.title}
                excludeAttachments={excludeAttachments}
                pdfPageBreaks
              />
            ))
          ) : (
            previewSections.map((sec) => (
              <section
                key={sec.sectionId}
                className="branding-preview-panel__section"
                aria-label={sec.title}
              >
                <BrandingPreviewSectionBody
                  section={sec}
                  sectionTitle={sec.title}
                  excludeAttachments={excludeAttachments}
                />
              </section>
            ))
          )}
        </div>
      </div>
    );
  }
);

BrandingPreviewPanelContent.displayName = "BrandingPreviewPanelContent";

const BrandingPreviewPanel = forwardRef(
  (
    { previewSections, excludeAttachments = false, standalone = false, exportMetadata = null },
    ref
  ) => {
    const content = (
      <BrandingPreviewPanelContent
        ref={ref}
        previewSections={previewSections}
        excludeAttachments={excludeAttachments}
        exportMetadata={exportMetadata}
      />
    );

    if (standalone) {
      return content;
    }

    return (
      <Col xs={12} lg={6} className="branding-guidelines-v2__preview-column p-0">
        {content}
      </Col>
    );
  }
);

BrandingPreviewPanel.displayName = "BrandingPreviewPanel";

export default BrandingPreviewPanel;

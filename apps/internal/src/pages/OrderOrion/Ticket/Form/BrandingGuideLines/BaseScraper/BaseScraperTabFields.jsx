import React from "react";
import { Col, Form, Row } from "react-bootstrap";
import { t } from "i18next";
import BrandingDeferredUpload from "../BrandingDeferredUpload";
import ToggleSwitch from "../../../../../../components/common/ToggleSwitch";
import { canEnableDefaultToggle } from "@orion/shared/src/utils/brandingGuidelines/baseScraper";

const BaseScraperTabFields = ({
  tabId,
  tabState = {},
  urlError = "",
  pdfError = "",
  onUrlChange,
  onPdfChange,
  onOnlyCurrentPageChange,
  onDefaultToggle,
}) => {
  const isDefaultToggleDisabled = !canEnableDefaultToggle(tabId, tabState);
  const isFigmaRequired = tabId === "figma";
  const onlyCurrentPage = Boolean(tabState.onlyCurrentPage);
  const urlLabel =
    tabId === "figma"
      ? t("order_view.branding_scraper_figma_url", "Figma URL")
      : t("order_view.branding_scraper_website_url", "Website URL");
  const urlPlaceholder =
    tabId === "figma"
      ? t(
          "order_view.branding_scraper_figma_url_placeholder",
          "https://www.figma.com/design/...",
        )
      : t(
          "order_view.branding_scraper_website_url_placeholder",
          "https://www.example.com",
        );
  const pdfLabel =
    tabId === "figma"
      ? t("order_view.branding_scraper_figma_pdf", "Figma PDF")
      : t("order_view.branding_scraper_pdf_upload", "PDF Attachment");

  return (
    <Row className="w-100 form-group d-flex flex-wrap align-items-baseline justify-content-flex-start row g-3 company-info-form m-0">
      {(tabId === "figma" || tabId === "website") && (
        <Col xs={12} className="input-field branding-field-col p-0">
          <Form.Group>
            <Form.Label className="label-header fs-14">
              {urlLabel}
              {isFigmaRequired ? <sup className="text-danger">*</sup> : null}
            </Form.Label>
            <Form.Control
              type="text"
              className="fs-14 branding-input-fixed-height"
              value={tabState.url ?? ""}
              isInvalid={Boolean(urlError)}
              placeholder={urlPlaceholder}
              onChange={(e) => onUrlChange?.(e.target.value)}
            />
            {urlError ? <span className="error-msg">{urlError}</span> : null}
          </Form.Group>
        </Col>
      )}

      {tabId === "website" ? (
        <Col xs={12} className="branding-field-col branding-base-scraper__scraping-scope p-0">
          <Form.Group>
            <Form.Label className="label-header fs-14">
              {t("order_view.branding_scraper_scraping_scope", "Scraping scope")}
            </Form.Label>
            <div>
              <Form.Check
                type="radio"
                id="scraping-scope-whole-website"
                name="scraping-scope"
                label={t(
                  "order_view.branding_scraper_scope_whole_website",
                  "Whole website",
                )}
                checked={!onlyCurrentPage}
                onChange={() => onOnlyCurrentPageChange?.(false)}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                id="scraping-scope-current-url"
                name="scraping-scope"
                label={t(
                  "order_view.branding_scraper_scope_current_url",
                  "Current URL only",
                )}
                checked={onlyCurrentPage}
                onChange={() => onOnlyCurrentPageChange?.(true)}
                className="mb-2"
              />
            </div>
          </Form.Group>
        </Col>
      ) : null}

      {(tabId === "figma" || tabId === "pdf") && (
        <Col xs={12} className="branding-field-col p-0">
          <BrandingDeferredUpload
            label={
              <>
                {pdfLabel}
                {isFigmaRequired ? <sup className="text-danger">*</sup> : null}
              </>
            }
            compact
            single
            accept=".pdf,application/pdf"
            className="branding-base-scraper__upload"
            pendingFiles={tabState.pdfFile ? [tabState.pdfFile] : []}
            onStageFiles={(files) => onPdfChange?.(files?.[0] ?? null)}
            onRemovePending={() => onPdfChange?.(null)}
            isAccessDelete
          />
          {pdfError ? <span className="error-msg">{pdfError}</span> : null}
        </Col>
      )}

      <Col xs={12} className="branding-base-scraper__default-toggle p-0">
        <Form.Group controlId={`${tabId}-is-default`}>
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 fs-14">
              {t("order_view.branding_scraper_is_default", "Set as Default")}
            </Form.Label>
            <ToggleSwitch
              toggled={Boolean(tabState.isDefault)}
              disabled={isDefaultToggleDisabled}
              onClick={(enabled) => {
                if (!isDefaultToggleDisabled) {
                  onDefaultToggle?.(enabled);
                }
              }}
            />
          </div>
        </Form.Group>
      </Col>
    </Row>
  );
};

export default BaseScraperTabFields;

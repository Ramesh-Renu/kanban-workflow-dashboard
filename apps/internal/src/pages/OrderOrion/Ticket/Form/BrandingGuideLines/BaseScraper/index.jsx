import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Button, Tab, Tabs } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import {
  BASE_SCRAPER_VISIBLE_TAB_IDS,
  BASE_SCRAPER_TAB_LABELS,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";
import BaseScraperTabFields from "./BaseScraperTabFields";
import BaseScraperRecommendations from "./BaseScraperRecommendations";
import useBaseScraper from "./useBaseScraper";

const BaseScraper = forwardRef(({
  show = false,
  onClose,
  formData,
  setFormData,
  onSkip,
  onGenerateSuccess,
  onJobStarted,
  brandingBuildOptions,
}, ref) => {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const {
    scraperState,
    activeTab,
    urlErrors,
    allUrlErrors,
    pdfErrors,
    allPdfErrors,
    isJobRunning,
    canSubmit,
    isDirty,
    showRegenerateConfirm,
    setShowRegenerateConfirm,
    updateActiveTab,
    updateTabField,
    handleDefaultToggle,
    handleGenerateClick,
    handleSkip,
    runGenerate,
    retryGenerate,
  } = useBaseScraper({
    formData,
    setFormData,
    onGenerateSuccess,
    onJobStarted,
    brandingBuildOptions,
  });

  useImperativeHandle(
    ref,
    () => ({
      retryGenerate,
    }),
    [retryGenerate],
  );

  const showRegenerate = scraperState.hasGenerated;
  // Re-extract is always a fresh request once the user has selected current inputs.
  const actionDisabled = !canSubmit;

  const handleRequestClose = useCallback(() => {
    if (isJobRunning) return onClose?.();
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose?.();
  }, [isDirty, isJobRunning, onClose]);

  const handleDiscardConfirm = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose?.();
  }, [onClose]);

  const handleSkipClick = useCallback(() => {
    if (isJobRunning) return;
    if (onSkip) {
      onSkip();
      return;
    }
    handleSkip();
    onClose?.();
  }, [handleSkip, isJobRunning, onClose, onSkip]);

  return (
    <>
      <PopupModal
      size={"lg"}
      show={show}
      onClose={handleRequestClose}
      header={true}
      title={t("order_view.branding_guidelines", "Branding Guidelines")}
      className="branding-import-modal branding-base-scraper-modal popupModal"
      >
       
        <div className="branding-import-modal__body branding-base-scraper-modal__body p-0">
          
          <BaseScraperRecommendations activeTab={activeTab} />

          <div className="branding-import-modal__card branding-base-scraper">
            <Tabs
              activeKey={activeTab}
              onSelect={(key) => key && updateActiveTab(key)}
              transition={false}
              className="order-details-section branding-import-modal__tabs"
            >
              {BASE_SCRAPER_VISIBLE_TAB_IDS.map((tabId) => (
                <Tab
                  key={tabId}
                  eventKey={tabId}
                  title={BASE_SCRAPER_TAB_LABELS[tabId]}
                  className="order-details-section w-100 branding-import-modal__tab-content"
                >
                  <BaseScraperTabFields
                    tabId={tabId}
                    tabState={scraperState[tabId]}
                    urlError={urlErrors[tabId] || allUrlErrors[tabId] || ""}
                    pdfError={pdfErrors[tabId] || allPdfErrors[tabId] || ""}
                    onUrlChange={(value) => updateTabField(tabId, "url", value)}
                    onPdfChange={(file) => updateTabField(tabId, "pdfFile", file)}
                    onOnlyCurrentPageChange={(value) =>
                      updateTabField(tabId, "onlyCurrentPage", value)
                    }
                    onDefaultToggle={(enabled) => handleDefaultToggle(tabId, enabled)}
                  />
                </Tab>
              ))}
            </Tabs>

            {isJobRunning ? (
              <p
                className="branding-import-modal__status text-primary mb-2"
                role="status"
                aria-live="polite"
              >
                {t(
                  "order_view.branding_scraper_generating_hint",
                  "Generation in progress. You can close this dialog and track progress on the form.",
                )}
              </p>
            ) : null}

            <div className="branding-import-modal__actions">
              <button
                className="btn-0 branding-import-modal__generate-btn px-4"
                disabled={actionDisabled}
                onClick={handleGenerateClick}
              >
                {isJobRunning
                  ? t("order_view.branding_scraper_generating", "Generating…")
                  : showRegenerate
                    ? t("order_view.branding_scraper_regenerate", "Regenerate")
                    : t("order_view.branding_import_generate", "Generate")}
              </button>
              <button
                className="btn btn-0 branding-import-modal__skip-btn"
                disabled={isJobRunning}
                onClick={handleSkipClick}
              >
                {t("order_view.branding_import_skip", "Skip")}
              </button>
            </div>
          </div>
        </div>
      </PopupModal>

      {showRegenerateConfirm && (
        <PopupModal
          show={showRegenerateConfirm}
          onClose={() => setShowRegenerateConfirm(false)}
          className="popupModal bg-white rounded-4"
          width="40vh"
        >
          <div>
            <h5 className="text-center">
              {t(
                "order_view.branding_scraper_regenerate_confirm",
                "Existing scraped values will be overridden. Do you want to continue?",
              )}
            </h5>
            <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
              <button
                type="button"
                className="btn btn-0 modalDelete_btn px-3"
                disabled={isJobRunning}
                onClick={runGenerate}
              >
                {t("order_view.branding_scraper_yes", "Yes")}
              </button>
              <button
                type="button"
                className="btn btn-0 modalCancel_btn px-3"
                onClick={() => setShowRegenerateConfirm(false)}
              >
                {t("order_view.branding_scraper_no", "No")}
              </button>
            </div>
          </div>
        </PopupModal>
      )}

      {showDiscardConfirm && (
        <PopupModal
          show={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          className="popupModal bg-white rounded-4"
          width="40vh"
        >
          <div>
            <h5 className="text-center">
              {t(
                "order_view.branding_scraper_discard_confirm",
                "You have unsaved scraper inputs. Close without saving?",
              )}
            </h5>
            <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
              <button
                type="button"
                className="btn btn-0 modalDelete_btn px-3"
                onClick={handleDiscardConfirm}
              >
                {t("order_view.branding_scraper_yes", "Yes")}
              </button>
              <button
                type="button"
                className="btn btn-0 modalCancel_btn px-3"
                onClick={() => setShowDiscardConfirm(false)}
              >
                {t("order_view.branding_scraper_no", "No")}
              </button>
            </div>
          </div>
        </PopupModal>
      )}

    </>
  );
});

BaseScraper.displayName = "BaseScraper";

export default BaseScraper;

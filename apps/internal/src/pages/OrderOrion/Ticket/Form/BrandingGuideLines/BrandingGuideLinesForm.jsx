import { t } from "i18next";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { BRANDING_SECTION_I18N, BRANDING_NAV_SECTION_IDS, BRANDING_NOTES_SECTION_ID } from "@orion/shared/src/utils/brandingGuidelinesConfig";
import {
  BASE_SCRAPER_TAB_LABELS,
  isScraperJobActive,
  canShowFigmaViewReference,
  getDefaultScraperTabId,
  resolveFigmaImageReferenceForSection,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";
import PopupModal from "@orion/shared/src/components/PopupModal";
import useBrandingForm from "./useBrandingForm";
import useBrandingPreviewPdf from "./useBrandingPreviewPdf";
import BrandingFieldRenderer from "./BrandingFieldRenderer";
import BrandingPreviewPanel from "@orion/shared/src/components/BrandingPreviewPanel";
import BrandingSectionFeedback from "@orion/shared/src/components/BrandingSectionFeedback";
import BrandingSectionUpload from "./BrandingSectionUpload";
import BrandingSectionNotesField from "./BrandingSectionNotesField";
import BrandingExportIconsSection from "./BrandingExportIconsSection";
import BrandingColorSchemeSection from "./BrandingColorSchemeSection";
import BrandingScraperStatusBanner from "./BrandingScraperStatusBanner";
import BrandingSectionSourceTabs from "./BrandingSectionSourceSelect";
import BrandingSourceBadge from "./BrandingSourceBadge";
import BrandingFigmaReferencePanel from "./BrandingFigmaReferencePanel";
import { useToast } from "@orion/shared";
import { pencilSimpleLine } from "../../../../../assets/images";

/**
 * Derives display metadata for the source badge and Figma reference panel
 * from persisted baseScraper / scraperJob state.
 */
export function buildScraperDisplayMeta(branding, { sectionId, sectionSources } = {}) {
  
  const { baseScraper, scraperJob, sections } = branding ?? {};

  if (!baseScraper?.hasGenerated && !scraperJob?.defaultSourceType) {
    return null;
  }

  let source = scraperJob?.defaultSourceType || getDefaultScraperTabId(baseScraper) || "";
  if (!source) {
    if (baseScraper?.figma?.url) source = "figma";
    else if (baseScraper?.pdf?.isDefault) source = "pdf";
    else if (baseScraper?.website?.url) source = "website";
  }

  if (!source) return null;

  const brandingForMeta = {
    ...(branding || {}),
    sections: sections || branding?.sections,
    scraperJob: branding?.scraperJob,
    baseScraper,
  };

  return {
    source: ["figma", "pdf"].includes(source) ? source : null,
    figmaUrl: baseScraper?.figma?.url?.trim?.() || "",
    imageReference: resolveFigmaImageReferenceForSection({
      branding: brandingForMeta,
      sectionId,
    }),
    showFigmaReference: canShowFigmaViewReference({
      branding: brandingForMeta,
      sectionId,
      sectionSources,
    }),
  };
}

const BrandingGuideLinesForm = forwardRef(
  (
    {
      formData,
      setFormData,
      setCannotEidit,
      validationCheck,
      setErrorExist,
      onGoToBaseScraper,
      onRetryScraperGenerate,
      onCancelScraperGenerate,
      showScraperStatus = true,
    },
    ref,
  ) => {
    const { showToast } = useToast();
    const cannotEdit = setCannotEidit || [];
    const [refPanelOpen, setRefPanelOpen] = useState(false);
    const [pendingSourceSelection, setPendingSourceSelection] = useState(null);

    const {
      activeSectionId,
      setActiveSectionId,
      previewOpen,
      setPreviewOpen,
      feedbackModalOpen,
      setFeedbackModalOpen,
      feedbackDraft,
      setFeedbackDraft,
      guidelineNotes,
      handleGuidelineNotesChange,
      sectionFeedbackList,
      addSectionFeedback,
      editSectionFeedback,
      getCurrentAuthorName,
      fieldErrors,
      activeSectionFields,
      sectionFieldDefinitions,
      sectionTitle,
      previewSections,
      handleFieldChange,
      fontFamilyList,
      addFontFamilyList,
      getFontFamilyList,
      languageList,
      pendingSectionAttachments,
      pendingTypographyFontFiles,
      attachmentsLoading,
      getExistingAttachmentsForSection,
      getExistingTypographyFontAttachments,
      stageSectionFiles,
      stageTypographyFontFile,
      removeTypographyFontFile,
      markTypographyFontAttachmentDeleted,
      removePendingFile,
      markAttachmentDeleted,
      exportIconEntries,
      getExistingAttachmentForExportIconEntry,
      addExportIconEntry,
      removeExportIconEntry,
      updateExportIconName,
      stageExportIconFile,
      removeExportIconPendingFile,
      markExportIconAttachmentDeleted,
      colorSchemeFields,
      updatePrimaryColorAt,
      addPrimaryColor,
      removePrimaryColorAt,
      reorderPrimaryColors,
      updateSecondaryColorAt,
      addSecondaryColor,
      removeSecondaryColorAt,
      reorderSecondaryColors,
      primaryColorAlternatives,
      secondaryColorAlternatives,
      selectPrimaryColorAlternative,
      selectSecondaryColorAlternative,
      getFieldColorAlternatives,
      getLanguageFontAlternatives,
      buildBrandingSaveFormData,
      isBrandingV2Dirty,
      isBrandingGuidelinesDirty,
      resetBrandingBaseline,
      validateBrandingForm,
      brandingSections,
      scraperJob,
      showSectionSourceTabs,
      availableScraperSources,
      sectionSources,
      shouldConfirmSectionSourceChange,
      handleSectionSourceChange,
      handleSectionSourceReset,
    } = useBrandingForm({ formData, setFormData, validationCheck, setErrorExist });

    const { pdfExportRef, pdfGenerating, handleGeneratePdf, exportMetadata } = useBrandingPreviewPdf({
      previewSections,
      orderId: formData?.orderId,
      companyName: formData?.companyInfo?.companyName,
      showToast,
    });

    useImperativeHandle(ref, () => ({
      buildBrandingSaveFormData,
      isBrandingV2Dirty,
      isBrandingGuidelinesDirty,
      resetBrandingBaseline,
      validateBrandingForm,
    }));

    const companyName = formData?.companyInfo?.companyName || "";
    const isProcessing = isScraperJobActive(scraperJob?.status);
    const scraperMeta = useMemo(
      () =>
        buildScraperDisplayMeta(
          {
            ...(formData?.branding || {}),
            sections: brandingSections || formData?.branding?.sections,
            scraperJob: scraperJob || formData?.branding?.scraperJob,
          },
          {
            sectionId: activeSectionId,
            sectionSources,
          },
        ),
      [formData?.branding, brandingSections, scraperJob, activeSectionId, sectionSources],
    );
    const showFigmaReference = Boolean(scraperMeta?.showFigmaReference);
    const defaultSource = scraperJob?.defaultSourceType;
    const hideSourceBadge = Boolean(
      defaultSource &&
      formData?.branding?.baseScraper?.[defaultSource]?.isDefault,
    );
    const isSplitView = previewOpen || (refPanelOpen && showFigmaReference);
    const pendingSourceLabel = pendingSourceSelection?.sourceId
      ? t(
        `order_view.branding_scraper_source_${pendingSourceSelection.sourceId}`,
        BASE_SCRAPER_TAB_LABELS[pendingSourceSelection.sourceId] ||
        pendingSourceSelection.sourceId,
      )
      : "";

    useEffect(() => {
      if (!showFigmaReference && refPanelOpen) {
        setRefPanelOpen(false);
      }
    }, [showFigmaReference, refPanelOpen]);

    const confirmSectionSourceChange = () => {
      if (!pendingSourceSelection) return;
      handleSectionSourceChange(
        pendingSourceSelection.sectionId,
        pendingSourceSelection.sourceId,
      );
      setPendingSourceSelection(null);
    };

    return (
      <Col xs={12} className={`brandingGuidelines branding-guidelines-v2${isSplitView ? " branding-guidelines-v2--preview-open" : ""}`}>
        <div className="branding-guidelines-v2__banner">
          <div className="branding-guidelines-v2__banner-content">
            <h5 className="mb-0">
              {t("order_view.branding_guidelines", "Branding Guidelines")}
            </h5>
          </div>
          <div className="d-flex gap-2 flex-wrap align-items-center branding-guidelines-v2__banner-actions">
            <Button
              variant="outline-info"
              size="sm"
              className="branding-guidelines-v2__action-btn hover:text-white"
              onClick={() => onGoToBaseScraper?.()}
              disabled={!onGoToBaseScraper || isProcessing}
            >
              <span className="icon-upload_file" aria-hidden />
              {t("order_view.branding_import_reextract", "Re-extract")}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="branding-guidelines-v2__action-btn"
              onClick={() => setPreviewOpen((p) => !p)}
            >
              {previewOpen ? (
                <span className="icon-open-eye-slash" aria-hidden>
                  <span className="path1" />
                  <span className="path2" />
                  <span className="path3" />
                </span>
              ) : (
                <span className="icon-open-eye" aria-hidden />
              )}
              {previewOpen
                ? t("order_view.branding_hide_preview", "Hide preview")
                : t("order_view.branding_show_preview", "Show preview")}
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="branding-guidelines-v2__action-btn"
              onClick={handleGeneratePdf}
              disabled={pdfGenerating || !previewSections.length}
            >
              <span className="icon-pdf-file" aria-hidden />
              {pdfGenerating
                ? t("order_view.branding_generate_pdf_loading", "Generating PDF…")
                : t("order_view.branding_generate_pdf", "Generate PDF")}
            </Button>
          </div>
        </div>

        {showScraperStatus ? (
          <BrandingScraperStatusBanner
            scraperJob={scraperJob}
            onRetry={onRetryScraperGenerate}
            onCancel={onCancelScraperGenerate}
          />
        ) : null}

        <div className={`branding-guidelines-v2__form-wrapper`}>
          <Row className="branding-guidelines-v2__workspace align-items-stretch g-2 g-md-3 flex-grow-0">
            <Col xs={12} lg={previewOpen || refPanelOpen ? 6 : 12} className="branding-guidelines-v2__form-column">
              <div className="branding-guidelines-v2__form-panel border rounded">
                <Row className="m-0">
                  <Col xs={12} md={3} className="p-0 bg-light border-end branding-guidelines-v2__nav-column rounded-start">
                    <div className="d-flex flex-md-column flex-row flex-wrap brandingGuidelines-section-nav">
                      {BRANDING_NAV_SECTION_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className={`btn text-start w-100 py-3 px-3 fs-16 rounded-0 ${activeSectionId === id ? "bg-white active" : ""}`}
                          onClick={() => setActiveSectionId(id)}
                        >
                          {t(`order_view.${BRANDING_SECTION_I18N[id]}`, BRANDING_SECTION_I18N[id])}
                        </button>
                      ))}
                    </div>
                  </Col>

                  <Col xs={12} md={9} className="bg-white branding-guidelines-v2__section-content rounded-end pb-4">
                    <div className="branding-guidelines-v2__section-head d-flex justify-content-between align-items-center px-0 pt-3 pb-3 gap-2 mb-2">
                      <div className="d-flex align-items-center gap-4">
                        <h6 className="mb-0 fw-semibold">{sectionTitle}</h6>
                        {showFigmaReference ? (
                          <BrandingSourceBadge
                            source="figma"
                            onViewReference={() => setRefPanelOpen((p) => !p)}
                            hideBadge={hideSourceBadge}
                          />
                        ) : null}
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                        {showSectionSourceTabs &&
                          activeSectionId !== BRANDING_NOTES_SECTION_ID &&
                          activeSectionId !== "exportIcons" ? (
                          <BrandingSectionSourceTabs
                            sectionId={activeSectionId}
                            availableSources={availableScraperSources}
                            selectedSource={sectionSources[activeSectionId] || ""}
                            onSelectSource={(sectionId, sourceId) => {
                              if (
                                shouldConfirmSectionSourceChange(sectionId, sourceId)
                              ) {
                                setPendingSourceSelection({ sectionId, sourceId });
                              }
                            }}
                            onResetSource={handleSectionSourceReset}
                          />
                        ) : null}
                      </div>
                    </div>

                    <Row
                      className={`w-100 m-0 ${activeSectionId === BRANDING_NOTES_SECTION_ID
                          ? ""
                          : activeSectionId === "typography"
                            ? "g-2 branding-typography-fields company-info-form"
                            : ["buttons", "tabs", "tables", "inputFields", "checkbox", "radioButtons", "dropDown"].includes(activeSectionId)
                              ? "g-2 branding-interactive-fields company-info-form"
                              : activeSectionId === "exportIcons"
                                ? "g-2 branding-export-icons-fields company-info-form"
                                : activeSectionId === "colorScheme"
                                  ? "g-2 branding-color-scheme-fields company-info-form"
                                  : ""
                        }`}
                    >
                      {activeSectionId === BRANDING_NOTES_SECTION_ID ? (
                        <BrandingSectionNotesField
                          value={guidelineNotes}
                          onChange={handleGuidelineNotesChange}
                          disabled={cannotEdit.includes("notes")}
                          centralized
                        />
                      ) : activeSectionId === "colorScheme" ? (
                        <BrandingColorSchemeSection
                          primaryColors={colorSchemeFields?.primaryColor ?? []}
                          secondaryColors={colorSchemeFields?.secondaryColor ?? []}
                          primaryAlternatives={primaryColorAlternatives}
                          secondaryAlternatives={secondaryColorAlternatives}
                          fieldErrors={fieldErrors}
                          disabled={cannotEdit.includes("primaryColor") || cannotEdit.includes("secondaryColor")}
                          onPrimaryColorChange={updatePrimaryColorAt}
                          onAddPrimaryColor={addPrimaryColor}
                          onRemovePrimaryColor={removePrimaryColorAt}
                          onReorderPrimaryColors={reorderPrimaryColors}
                          onSecondaryColorChange={updateSecondaryColorAt}
                          onAddSecondaryColor={addSecondaryColor}
                          onRemoveSecondaryColor={removeSecondaryColorAt}
                          onReorderSecondaryColors={reorderSecondaryColors}
                          onSelectPrimaryAlternative={selectPrimaryColorAlternative}
                          onSelectSecondaryAlternative={selectSecondaryColorAlternative}
                        />
                      ) : activeSectionId === "exportIcons" ? (
                        <BrandingExportIconsSection
                          entries={exportIconEntries}
                          getExistingAttachmentForEntry={getExistingAttachmentForExportIconEntry}
                          onIconNameChange={updateExportIconName}
                          onStageFile={stageExportIconFile}
                          onRemovePending={removeExportIconPendingFile}
                          onMarkExistingDeleted={markExportIconAttachmentDeleted}
                          onAddEntry={addExportIconEntry}
                          onRemoveEntry={removeExportIconEntry}
                          fieldErrors={fieldErrors}
                          attachmentsLoading={attachmentsLoading}
                        />
                      ) : (
                        sectionFieldDefinitions.map((field) => (
                          <BrandingFieldRenderer
                            key={field.key}
                            compactLayout={activeSectionId === "typography"}
                            field={field}
                            value={
                              field.type === "languageFontFamilyInput" ||
                                field.type === "languageFontStyleSelect"
                                ? activeSectionFields.fontStylesByLanguage?.[field.languageId] ?? ""
                                : activeSectionFields[field.key] ?? ""
                            }
                            typographyFields={activeSectionId === "typography" ? activeSectionFields : undefined}
                            typographyFontPendingFiles={
                              activeSectionId === "typography" ? pendingTypographyFontFiles : undefined
                            }
                            getExistingTypographyFontAttachments={getExistingTypographyFontAttachments}
                            onStageTypographyFontFile={stageTypographyFontFile}
                            onRemoveTypographyFontFile={removeTypographyFontFile}
                            onMarkTypographyFontAttachmentDeleted={markTypographyFontAttachmentDeleted}
                            hasError={Boolean(fieldErrors[`${activeSectionId}.${field.key}`])}
                            disabled={cannotEdit.includes(field.key)}
                            activeSectionId={activeSectionId}
                            onFieldChange={handleFieldChange}
                            fontFamilyList={fontFamilyList}
                            addFontFamilyList={addFontFamilyList}
                            getFontFamilyList={getFontFamilyList}
                            languageList={languageList}
                            showToast={showToast}
                            colorAlternatives={
                              field.type === "color"
                                ? getFieldColorAlternatives(field.key)
                                : []
                            }
                            fontAlternatives={
                              field.type === "languageFontFamilyInput"
                                ? getLanguageFontAlternatives(field.languageId)
                                : []
                            }
                          />
                        ))
                      )}
                    </Row>

                    {activeSectionId !== BRANDING_NOTES_SECTION_ID ? (
                      <BrandingSectionUpload
                        activeSectionId={activeSectionId === "exportIcons" ? null : activeSectionId}
                        compact={activeSectionId === "typography"}
                        existingAttachments={getExistingAttachmentsForSection(activeSectionId)}
                        pendingFiles={pendingSectionAttachments[activeSectionId] || []}
                        onStageFiles={(files) => stageSectionFiles(activeSectionId, files)}
                        onRemovePending={(index) => removePendingFile(activeSectionId, index)}
                        onMarkExistingDeleted={markAttachmentDeleted}
                        loading={attachmentsLoading}
                      />
                    ) : null}
                  </Col>
                </Row>
              </div>
            </Col>

            {refPanelOpen && showFigmaReference && !previewOpen && (
              <Col xs={12} lg={6} className="branding-guidelines-v2__ref-column">
                <BrandingFigmaReferencePanel
                  referenceUrl={scraperMeta?.imageReference ?? ""}
                  sectionTitle={sectionTitle}
                  onClose={() => setRefPanelOpen(false)}
                />
              </Col>
            )}

            {previewOpen && (
              <BrandingPreviewPanel previewSections={previewSections} excludeAttachments />
            )}
          </Row>
        </div>

        <BrandingSectionFeedback
          show={feedbackModalOpen}
          onHide={() => setFeedbackModalOpen(false)}
          sectionTitle={`${t("order_view.branding_section_feedback", "Feedback")} — ${sectionTitle}`}
          sectionFeedbackList={sectionFeedbackList}
          sectionFeedbackDraft={feedbackDraft}
          onDraftChange={setFeedbackDraft}
          onAddNote={addSectionFeedback}
          onEditNote={editSectionFeedback}
          currentUser={getCurrentAuthorName()}
          editIcon={pencilSimpleLine}
        />

        {pendingSourceSelection ? (
          <PopupModal
            show
            onClose={() => setPendingSourceSelection(null)}
            className="popupModal bg-white rounded-4"
            width="40vh"
          >
            <div>
              <h6 className="text-center">
                {t(
                  "order_view.branding_scraper_source_replace_confirm",
                  `Selecting ${pendingSourceLabel} will replace the current values in this section. Do you want to continue?`,
                )}
              </h6>
              <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
                <button
                  type="button"
                  className="btn btn-0 modalDelete_btn px-2 fs-14"
                  onClick={confirmSectionSourceChange}
                >
                  {t("order_view.branding_scraper_replace", "Replace")}
                </button>
                <button
                  type="button"
                  className="btn btn-0 modalCancel_btn px-2 fs-14"
                  onClick={() => setPendingSourceSelection(null)}
                >
                  {t("common.cancel", "Cancel")}
                </button>
              </div>
            </div>
          </PopupModal>
        ) : null}

        <div className="branding-preview-pdf-export brandingGuidelines branding-guidelines-v2" aria-hidden="true">
          <div ref={pdfExportRef} className="branding-preview-pdf-capture">
            <BrandingPreviewPanel
              standalone
              previewSections={previewSections}
              excludeAttachments
              exportMetadata={exportMetadata}
            />
          </div>
        </div>
      </Col>
    );
  }
);

BrandingGuideLinesForm.displayName = "BrandingGuideLinesForm";

export default BrandingGuideLinesForm;
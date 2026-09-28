import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useGlobalMaster } from "@orion/shared";
import { mergeScrappingSourceIntoBranding, normalizeScrappingSourceList } from "@orion/shared/src/utils/brandingGuidelines/baseScraper";
import BaseScraper from "./BaseScraper";
import BrandingGuideLinesForm from "./BrandingGuideLinesForm";
import useBrandingScraperPolling from "./useBrandingScraperPolling";

function shouldAutoOpenScraperModal(branding, formData) {
  const scraper = branding?.baseScraper;
  const job = branding?.scraperJob;
  const hasScrappingSource = normalizeScrappingSourceList(formData?.scrappingSource).length > 0;
  if (scraper?.skipped || scraper?.hasGenerated || hasScrappingSource) return false;
  if (job?.status && job.status !== "idle") return false;
  return true;
}

const BrandingGuideLinesContainer = forwardRef(
  (
    { formData, setFormData, setCannotEidit, validationCheck, setErrorExist },
    ref,
  ) => {
    const brandingRef = useRef(null);
    const baseScraperRef = useRef(null);
    const { languageList, fontFamilyList } = useGlobalMaster();
    const brandingBuildOptions = useMemo(
      () => ({
        languageList: languageList?.data || [],
        fontFamilyList: fontFamilyList?.data || [],
      }),
      [languageList?.data, fontFamilyList?.data],
    );

    const [scraperModalOpen, setScraperModalOpen] = useState(() =>
      shouldAutoOpenScraperModal(formData?.branding, formData),
    );

    const hydratedSourceKeyRef = useRef("");

    useEffect(() => {
      const orderId = formData?.orderId;
      if (!orderId) return;

      const scrappingSource = normalizeScrappingSourceList(formData?.scrappingSource);
      if (!scrappingSource.length) return;

      // Re-apply whenever server scrappingSource changes (not only once per order).
      const sourceKey = `${orderId}::${JSON.stringify(scrappingSource)}`;
      if (hydratedSourceKeyRef.current === sourceKey) return;
      hydratedSourceKeyRef.current = sourceKey;

      setFormData?.((prev) => ({
        ...prev,
        scrappingSource,
        branding: mergeScrappingSourceIntoBranding(prev?.branding, {
          ...prev,
          scrappingSource,
        }),
      }));
    }, [formData?.orderId, formData?.scrappingSource, setFormData]);

    const { startPolling, cancelActiveJobs, shouldShowStatus } =
      useBrandingScraperPolling({ formData, setFormData });

    const openScraperModal = useCallback(() => setScraperModalOpen(true), []);
    const closeScraperModal = useCallback(() => setScraperModalOpen(false), []);

    const handleJobStarted = useCallback(
      (jobTarget, refreshedFormData) => {
        startPolling(jobTarget, {
          notifyOnTerminal: true,
          formDataSnapshot: refreshedFormData,
        });
      },
      [startPolling],
    );

    const handleRetryGenerate = useCallback(() => {
      baseScraperRef.current?.retryGenerate?.();
    }, []);

    const handleSkip = useCallback(() => {
      setFormData?.((prev) => ({
        ...prev,
        branding: {
          ...prev?.branding,
          baseScraper: {
            ...(prev?.branding?.baseScraper || {}),
            skipped: true,
          },
        },
      }));
      closeScraperModal();
    }, [closeScraperModal, setFormData]);

    const handleGenerateSuccess = useCallback(() => {
      closeScraperModal();
    }, [closeScraperModal]);

    useImperativeHandle(ref, () => ({
      buildBrandingSaveFormData: (...args) =>
        brandingRef.current?.buildBrandingSaveFormData?.(...args),
      isBrandingV2Dirty: (...args) => brandingRef.current?.isBrandingV2Dirty?.(...args),
      isBrandingGuidelinesDirty: (...args) =>
        brandingRef.current?.isBrandingGuidelinesDirty?.(...args),
      resetBrandingBaseline: (...args) =>
        brandingRef.current?.resetBrandingBaseline?.(...args),
      validateBrandingForm: (...args) => brandingRef.current?.validateBrandingForm?.(...args),
    }));

    return (
      <>
        <BrandingGuideLinesForm
          ref={brandingRef}
          formData={formData}
          setFormData={setFormData}
          setCannotEidit={setCannotEidit}
          validationCheck={validationCheck}
          setErrorExist={setErrorExist}
          onGoToBaseScraper={openScraperModal}
          onRetryScraperGenerate={handleRetryGenerate}
          onCancelScraperGenerate={cancelActiveJobs}
          showScraperStatus={shouldShowStatus}
        />

        <BaseScraper
          ref={baseScraperRef}
          show={scraperModalOpen}
          onClose={closeScraperModal}
          formData={formData}
          setFormData={setFormData}
          brandingBuildOptions={brandingBuildOptions}
          onSkip={handleSkip}
          onGenerateSuccess={handleGenerateSuccess}
          onJobStarted={handleJobStarted}
        />
      </>
    );
  },
);

BrandingGuideLinesContainer.displayName = "BrandingGuideLinesContainer";

export default BrandingGuideLinesContainer;

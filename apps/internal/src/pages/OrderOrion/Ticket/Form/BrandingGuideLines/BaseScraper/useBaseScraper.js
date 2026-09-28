import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { generateBrandingFromScraper, getTicketDetails } from "../../../../../../services";
import {
  beginScraperJobExtract,
  buildBaseScraperFormData,
  buildInitialJobsBySourceFromScraperState,
  extractScraperJobIdFromResponse,
  getAllScraperPdfErrors,
  getAllScraperUrlErrors,
  getDefaultScraperTabId,
  getScraperUrlError,
  handleScrapperJobsArrayResponse,
  hasAnyBaseScraperInput,
  hasFreshBaseScraperExtractInput,
  hasRetryableBaseScraperInput,
  isBaseScraperStateDirty,
  isBaseScraperStateValid,
  isScraperJobActive,
  canEnableDefaultToggle,
  mergeOrderTicketDetailsIntoFormData,
  mergeScraperJobFailure,
  mergeScraperJobStatusUpdate,
  normalizeScrapperJobsArray,
  sanitizeScraperDefaultFlags,
  normalizeBaseScraperState,
  resolveBaseScraperStateFromFormData,
  SCRAPER_JOB_PROGRESS_STAGE,
  SCRAPER_JOB_STATUS,
  setDefaultScraperTab,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";
import { useGlobalContext } from "store/context/GlobalProvider";

function resolveActiveBoardId(route) {
  try {
    const saved = localStorage.getItem("workspaceState");
    const parsed = saved ? JSON.parse(saved) : {};
    return route?.state?.boardId ?? parsed?.activeBoard?.[0]?.boardID ?? null;
  } catch {
    return route?.state?.boardId ?? null;
  }
}

const useBaseScraper = ({
  formData,
  setFormData,
  onGenerateSuccess,
  onJobStarted,
  brandingBuildOptions,
}) => {
  const route = useLocation();
  const brandingBuildOptionsRef = useRef(brandingBuildOptions);
  brandingBuildOptionsRef.current = brandingBuildOptions;

  const [scraperState, setScraperState] = useState(() =>
    resolveBaseScraperStateFromFormData(formData),
  );
  const [urlErrors, setUrlErrors] = useState({});
  const [pdfErrors, setPdfErrors] = useState({});
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baselineRef = useRef(resolveBaseScraperStateFromFormData(formData));
  const generatedBaselineRef = useRef(
    scraperState.hasGenerated ? normalizeBaseScraperState(scraperState) : null,
  );
  const hydratedOrderRef = useRef(
    hasAnyBaseScraperInput(scraperState) ? formData?.orderId ?? null : null,
  );

  const scraperJobStatus = formData?.branding?.scraperJob?.status;
  const isJobRunning = isSubmitting || isScraperJobActive(scraperJobStatus);
  const { dispatch } = useGlobalContext();

  // Rehydrate local scraper form from persisted scrappingSource after navigating
  // away and back. Do not re-merge on local baseScraper persists — that restored
  // the previous Figma URL when the user tried to clear it after a failed extract.
  // When already hydrated for this order, still sync website.onlyCurrentPage from
  // ticket scrappingSource so Re-extract shows the saved scraping scope.
  useEffect(() => {
    const orderId = formData?.orderId;
    if (!orderId) {
      hydratedOrderRef.current = null;
      return;
    }

    const resolved = resolveBaseScraperStateFromFormData(formData);
    if (!hasAnyBaseScraperInput(resolved)) return;

    setScraperState((prev) => {
      if (hydratedOrderRef.current === orderId) {
        const nextOnlyCurrentPage = Boolean(resolved.website?.onlyCurrentPage);
        if (Boolean(prev.website?.onlyCurrentPage) === nextOnlyCurrentPage) {
          return prev;
        }
        const next = normalizeBaseScraperState({
          ...prev,
          website: {
            ...prev.website,
            onlyCurrentPage: nextOnlyCurrentPage,
          },
        });
        // Keep baselines in sync so restoring scope from the ticket is not "dirty".
        if (baselineRef.current) {
          baselineRef.current = normalizeBaseScraperState({
            ...baselineRef.current,
            website: {
              ...baselineRef.current.website,
              onlyCurrentPage: nextOnlyCurrentPage,
            },
          });
        }
        if (generatedBaselineRef.current) {
          generatedBaselineRef.current = normalizeBaseScraperState({
            ...generatedBaselineRef.current,
            website: {
              ...generatedBaselineRef.current.website,
              onlyCurrentPage: nextOnlyCurrentPage,
            },
          });
        }
        return next;
      }

      hydratedOrderRef.current = orderId;
      const normalized = normalizeBaseScraperState(resolved);
      baselineRef.current = normalized;
      if (normalized.hasGenerated) {
        generatedBaselineRef.current = normalized;
      }
      return normalized;
    });
  }, [formData?.orderId, formData?.scrappingSource]);

  const persistScraperState = useCallback(
    (nextState) => {
      setScraperState(nextState);
      setFormData?.((prev) => ({
        ...prev,
        branding: {
          ...prev?.branding,
          baseScraper: {
            ...nextState,
            figma: { ...nextState.figma, pdfFile: null },
            pdf: { ...nextState.pdf, pdfFile: null },
          },
        },
      }));
    },
    [setFormData],
  );

  const activeTab = scraperState.activeTab;

  const isDirty = useMemo(
    () => isBaseScraperStateDirty(scraperState, baselineRef.current),
    [scraperState],
  );

  const isModifiedSinceGenerate = useMemo(() => {
    if (!scraperState.hasGenerated || !generatedBaselineRef.current) return isDirty;
    return isBaseScraperStateDirty(scraperState, generatedBaselineRef.current);
  }, [scraperState, isDirty]);

  const allUrlErrors = useMemo(
    () => getAllScraperUrlErrors(scraperState),
    [scraperState],
  );

  const allPdfErrors = useMemo(
    () => getAllScraperPdfErrors(scraperState),
    [scraperState],
  );

  const canSubmit =
    !isJobRunning &&
    isBaseScraperStateValid(scraperState) &&
    Object.keys(allUrlErrors).length === 0 &&
    Object.keys(allPdfErrors).length === 0 &&
    hasFreshBaseScraperExtractInput(scraperState);

  const updateActiveTab = useCallback(
    (tabId) => {
      persistScraperState({ ...scraperState, activeTab: tabId });
      setUrlErrors({});
      setPdfErrors({});
    },
    [persistScraperState, scraperState],
  );

  const updateTabField = useCallback(
    (tabId, field, value) => {
      const next = sanitizeScraperDefaultFlags({
        ...scraperState,
        [tabId]: {
          ...scraperState[tabId],
          [field]: value,
        },
      });
      persistScraperState(next);

      if (tabId === "figma") {
        setUrlErrors((prev) => ({
          ...prev,
          figma: getAllScraperUrlErrors(next).figma || "",
        }));
        setPdfErrors((prev) => ({
          ...prev,
          figma: getAllScraperPdfErrors(next).figma || "",
        }));
        return;
      }

      if (field === "url") {
        const label = tabId === "figma" ? "Figma URL" : "Website URL";
        setUrlErrors((prev) => ({
          ...prev,
          [tabId]: getScraperUrlError(value, label),
        }));
      }
    },
    [persistScraperState, scraperState],
  );

  const handleDefaultToggle = useCallback(
    (tabId, enabled) => {
      if (enabled) {
        if (!canEnableDefaultToggle(tabId, scraperState[tabId])) return;
        persistScraperState(setDefaultScraperTab(scraperState, tabId));
        return;
      }
      persistScraperState(
        sanitizeScraperDefaultFlags({
          ...scraperState,
          [tabId]: { ...scraperState[tabId], isDefault: false },
        }),
      );
    },
    [persistScraperState, scraperState],
  );

  const runGenerate = useCallback((options = {}) => {
    const allowRetry = options.allowRetry === true;
    if (isSubmitting) return;
    if (!allowRetry && !canSubmit) return;

    const workingState = normalizeBaseScraperState(scraperState);

    if (allowRetry) {
      if (isScraperJobActive(scraperJobStatus)) return;
      if (
        !isBaseScraperStateValid(workingState) ||
        !hasRetryableBaseScraperInput(workingState)
      ) {
        return;
      }
    }

    const validationErrors = getAllScraperUrlErrors(workingState);
    const pdfValidationErrors = getAllScraperPdfErrors(workingState);
    if (
      Object.keys(validationErrors).length > 0 ||
      Object.keys(pdfValidationErrors).length > 0
    ) {
      setUrlErrors(validationErrors);
      setPdfErrors(pdfValidationErrors);
      const firstErrorTab =
        Object.keys(validationErrors)[0] || Object.keys(pdfValidationErrors)[0];
      if (firstErrorTab) {
        persistScraperState({ ...workingState, activeTab: firstErrorTab });
      }
      return;
    }

    if (!isBaseScraperStateValid(workingState)) return;

    const snapshot = normalizeBaseScraperState(workingState);
    const defaultSourceType = getDefaultScraperTabId(snapshot);
    const orderId = formData?.orderId;
    const payload = buildBaseScraperFormData(snapshot, orderId);
    const initialJobsBySource = buildInitialJobsBySourceFromScraperState(snapshot);

    const nextScraperState = { ...snapshot, hasGenerated: true };
    generatedBaselineRef.current = normalizeBaseScraperState(nextScraperState);
    persistScraperState(nextScraperState);

    // Re-extract only the selected sources; keep completed siblings visible/usable.
    setFormData?.((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        scraperJob: beginScraperJobExtract(prev.branding?.scraperJob, {
          defaultSourceType,
          orderId,
          jobsBySource: initialJobsBySource,
        }),
      },
    }));

    onGenerateSuccess?.();
    setIsSubmitting(true);
    setShowRegenerateConfirm(false);

    generateBrandingFromScraper(payload)
      .then(async (response) => {
        let workingFormData = {
          ...formData,
          branding: {
            ...formData?.branding,
            baseScraper: nextScraperState,
            scraperJob: beginScraperJobExtract(formData?.branding?.scraperJob, {
              defaultSourceType,
              orderId,
              jobsBySource: initialJobsBySource,
            }),
          },
        };

        const boardID = resolveActiveBoardId(route);
        if (orderId && boardID) {
          try {
            const ticketRes = await getTicketDetails({
              ticketId: orderId,
              boardID,
            });
            if (ticketRes?.status && ticketRes.data?.orderTicketDetails) {
              workingFormData = mergeOrderTicketDetailsIntoFormData(
                workingFormData,
                ticketRes.data.orderTicketDetails,
              );
              
              dispatch({ type: "SET_TICKET_DETAILS", payload: ticketRes?.data });
              
            }
          } catch {
            // Order refresh is best-effort; polling can still proceed with generate response.
          }
        }

        const generatedJobId = extractScraperJobIdFromResponse(response);
        const responseJobs = normalizeScrapperJobsArray(response);

        if (generatedJobId && responseJobs.length === 0) {
          let nextFormData = workingFormData;
          setFormData?.((latestFormData) => {
            nextFormData = mergeScraperJobStatusUpdate(latestFormData, {
              jobId: generatedJobId,
              orderId,
              status: SCRAPER_JOB_STATUS.GENERATING,
              progressStage: SCRAPER_JOB_PROGRESS_STAGE.QUEUED,
              defaultSourceType,
            });
            return nextFormData;
          });
          const jobTarget = {
            jobId: generatedJobId,
            tabId: defaultSourceType,
            typeId:
              workingFormData?.branding?.baseScraper?.[defaultSourceType]?.typeId ??
              nextFormData?.branding?.baseScraper?.[defaultSourceType]?.typeId ??
              null,
          };

          onJobStarted?.(jobTarget, nextFormData);
          return;
        }

        let handled = handleScrapperJobsArrayResponse(
          workingFormData,
          response,
          brandingBuildOptionsRef.current,
        );

        setFormData?.((latestFormData) => {
          handled = handleScrapperJobsArrayResponse(
            latestFormData,
            response,
            brandingBuildOptionsRef.current,
          );
          return handled.nextFormData;
        });

        if (!handled.isTerminal) {
          const jobsToPoll =
            Array.isArray(handled.pendingJobs) && handled.pendingJobs.length > 0
              ? handled.pendingJobs
              : handled.primaryPendingJob?.jobId
                ? [handled.primaryPendingJob]
                : [];
          if (jobsToPoll.length > 0) {
            onJobStarted?.(jobsToPoll, handled.nextFormData);
          }
        }
      })
      .catch(() => {
        setFormData?.((prev) => {
          const currentJobs = prev?.branding?.scraperJob?.jobsBySource || {};
          const nextJobsBySource = { ...currentJobs };
          Object.keys(initialJobsBySource).forEach((sourceId) => {
            nextJobsBySource[sourceId] = {
              ...(nextJobsBySource[sourceId] || initialJobsBySource[sourceId]),
              status: SCRAPER_JOB_STATUS.FAILED,
              progressStage: SCRAPER_JOB_PROGRESS_STAGE.FAILED,
            };
          });
          return mergeScraperJobFailure(prev, {
            canRetry: true,
            jobsBySource: nextJobsBySource,
          });
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    canSubmit,
    formData,
    isSubmitting,
    onGenerateSuccess,
    onJobStarted,
    persistScraperState,
    route,
    scraperJobStatus,
    scraperState,
    setFormData,
  ]);

  const handleGenerateClick = useCallback(() => {
    if (scraperState.hasGenerated) {
      setShowRegenerateConfirm(true);
      return;
    }
    runGenerate();
  }, [runGenerate, scraperState.hasGenerated]);

  const retryGenerate = useCallback(() => {
    runGenerate({ allowRetry: true });
  }, [runGenerate]);

  const handleSkip = useCallback(() => {
    const next = { ...scraperState, skipped: true };
    persistScraperState(next);
    onGenerateSuccess?.();
  }, [onGenerateSuccess, persistScraperState, scraperState]);

  return {
    scraperState,
    activeTab,
    urlErrors,
    allUrlErrors,
    pdfErrors,
    allPdfErrors,
    isJobRunning,
    canSubmit,
    isDirty,
    isModifiedSinceGenerate,
    showRegenerateConfirm,
    setShowRegenerateConfirm,
    updateActiveTab,
    updateTabField,
    handleDefaultToggle,
    handleGenerateClick,
    handleSkip,
    runGenerate,
    retryGenerate,
  };
};

export default useBaseScraper;

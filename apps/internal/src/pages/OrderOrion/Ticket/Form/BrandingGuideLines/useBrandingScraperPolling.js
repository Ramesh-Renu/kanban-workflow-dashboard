import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "i18next";
import { useGlobalMaster, useToast } from "@orion/shared";
import {
  cancelBrandingScraperJob,
  getBrandingScraperJobsByOrder,
  getBrandingScraperJobStatus,
} from "../../../../../services";
import {
  BRANDING_SCRAPER_POLL_INTERVAL_MS,
  SCRAPER_JOB_PROGRESS_STAGE,
  SCRAPER_JOB_STATUS,
  collectPendingJobsFromScraperJob,
  collectScraperTypeIds,
  enrichPendingJobWithTypeId,
  handleScrapperJobsArrayResponse,
  handleScraperJobStatusResponse,
  isScraperJobActive,
  mapScrapperTypeToTabId,
  mapTabIdToScrapperType,
  mergeScraperJobCancelled,
  mergeScraperJobFailure,
  normalizeScrapperJobsArray,
  normalizeScrappingSourceList,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";

const INITIAL_STATUS_REVEAL_DELAY_MS = 200;

function buildFailedStatusPayload(job = {}) {
  return {
    jobId: job?.jobId,
    typeId: job?.typeId,
    scrapperType: job?.scrapperType || mapTabIdToScrapperType(job?.tabId),
    status: SCRAPER_JOB_STATUS.FAILED,
    result: {},
  };
}

function normalizeJobTargets(jobTarget) {
  if (!jobTarget) return [];
  if (Array.isArray(jobTarget)) return jobTarget.filter(Boolean);
  if (Array.isArray(jobTarget.pendingJobs) && jobTarget.pendingJobs.length) {
    return jobTarget.pendingJobs.filter(Boolean);
  }
  if (jobTarget.jobId) return [jobTarget];
  return [];
}

function buildPollKey(orderId, jobs = []) {
  const jobKeys = [...jobs]
    .map(
      (job) =>
        `${String(job?.jobId ?? "")}:${String(job?.typeId ?? "")}:${String(job?.tabId ?? "")}`,
    )
    .sort();
  return JSON.stringify({ orderId: String(orderId ?? ""), jobs: jobKeys });
}

function buildScraperResumeKey(formData = {}) {
  const orderId = formData?.orderId;
  if (!orderId) return "";
  // One resume attempt per order after ticket payload is known.
  // Do not include draft form inputs or in-flight scraperJob fields.
  return String(orderId);
}

function shouldReconcileScraperJobsFromServer(formData = {}) {
  const scrappingSource = normalizeScrappingSourceList(formData?.scrappingSource);
  if (scrappingSource.length > 0) return true;

  const existingJob = formData?.branding?.scraperJob;
  if (isScraperJobActive(existingJob?.status)) return true;
  if (existingJob?.jobId) return true;
  if (collectPendingJobsFromScraperJob(existingJob, formData).length > 0) {
    return true;
  }

  return false;
}

const useBrandingScraperPolling = ({ formData, setFormData }) => {
  const { showToast } = useToast();
  const { languageList, fontFamilyList } = useGlobalMaster();
  const brandingBuildOptionsRef = useRef({
    languageList: languageList?.data || [],
    fontFamilyList: fontFamilyList?.data || [],
  });
  brandingBuildOptionsRef.current = {
    languageList: languageList?.data || [],
    fontFamilyList: fontFamilyList?.data || [],
  };

  const pollTimerRef = useRef(null);
  const activePollKeyRef = useRef("");
  const isPollingRef = useRef(false);
  const pollRequestInFlightRef = useRef(false);
  const activeJobsRef = useRef([]);
  const resumedKeyRef = useRef("");
  const formDataRef = useRef(formData);
  const setFormDataRef = useRef(setFormData);
  const showToastRef = useRef(showToast);
  const [resolvedInitialStatusOrderId, setResolvedInitialStatusOrderId] =
    useState(null);
  const [showStatusWhileResolving, setShowStatusWhileResolving] =
    useState(false);

  formDataRef.current = formData;
  setFormDataRef.current = setFormData;
  showToastRef.current = showToast;

  const scraperResumeKey = useMemo(
    () => buildScraperResumeKey(formData),
    [formData?.orderId],
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
    pollRequestInFlightRef.current = false;
    activePollKeyRef.current = "";
    activeJobsRef.current = [];
  }, []);

  const notifyTerminalResult = useCallback((result) => {
    if (!result?.isTerminal) return;

    const completedAutoApplied =
      result.status === SCRAPER_JOB_STATUS.COMPLETED &&
      Boolean(result.nextFormData?.branding?.scraperJob?.autoApplied);

    if (result.status === SCRAPER_JOB_STATUS.COMPLETED) {
      showToastRef.current({
        message: completedAutoApplied
          ? t(
              "order_view.branding_scraper_generate_success",
              "Branding data generated and applied to the form.",
            )
          : t(
              "order_view.branding_scraper_generate_ready",
              "Branding data is ready. Select a source from each section dropdown to populate values.",
            ),
        variant: "success",
      });
      return;
    }

    if (result.status === SCRAPER_JOB_STATUS.FAILED) {
      showToastRef.current({
        message: t(
          "order_view.branding_scraper_generate_failed_title",
          "Generation failed",
        ),
        variant: "danger",
      });
    }
  }, []);

  const applyJobsResponse = useCallback(
    (
      response,
      {
        notify = false,
        useSingleJobHandler = false,
        allowAutoApply = true,
        restrictToJobId,
        restrictToTabId,
      } = {},
    ) => {
      const setter = setFormDataRef.current;
      if (!setter) return { isTerminal: true, pendingJobs: [] };

      const handlerOptions = {
        ...brandingBuildOptionsRef.current,
        canRetryOnFailure: notify,
        allowAutoApply,
        restrictToJobId,
        restrictToTabId,
      };
      const handleResponse = (currentFormData) =>
        useSingleJobHandler
          ? handleScraperJobStatusResponse(
              currentFormData,
              response,
              handlerOptions,
            )
          : handleScrapperJobsArrayResponse(
              currentFormData,
              response,
              handlerOptions,
            );
      const result = handleResponse(formDataRef.current);

      setter((latestFormData) => {
        const latestResult =
          latestFormData === formDataRef.current
            ? result
            : handleResponse(latestFormData);
        formDataRef.current = latestResult.nextFormData;
        return latestResult.nextFormData;
      });

      if (notify) {
        notifyTerminalResult(result);
      }

      return result;
    },
    [notifyTerminalResult],
  );

  const applyMultipleJobStatusResponses = useCallback(
    (
      responses = [],
      { notify = false, allowAutoApply = true, jobRestrictions = [] } = {},
    ) => {
      const setter = setFormDataRef.current;
      if (!setter) return { isTerminal: true, pendingJobs: [] };

      let workingFormData = formDataRef.current;
      let result = {
        nextFormData: workingFormData,
        isTerminal: true,
        status: SCRAPER_JOB_STATUS.IDLE,
        primaryPendingJob: null,
        pendingJobs: [],
      };

      responses.forEach((response, index) => {
        const restriction = jobRestrictions[index] || {};
        result = handleScraperJobStatusResponse(workingFormData, response, {
          ...brandingBuildOptionsRef.current,
          canRetryOnFailure: notify,
          allowAutoApply,
          restrictToJobId: restriction.jobId,
          restrictToTabId: restriction.tabId,
        });
        workingFormData = result.nextFormData;
      });

      formDataRef.current = workingFormData;
      setter(() => workingFormData);

      if (notify) {
        notifyTerminalResult(result);
      }

      return result;
    },
    [notifyTerminalResult],
  );

  const resolveActiveJobs = useCallback((currentFormData) => {
    const pendingFromState = collectPendingJobsFromScraperJob(
      currentFormData?.branding?.scraperJob,
      currentFormData,
    );
    const pendingIds = new Set(
      pendingFromState.map((job) => String(job?.jobId ?? "")),
    );

    const stillActiveTracked = (activeJobsRef.current || [])
      .map((job) => enrichPendingJobWithTypeId(job, currentFormData))
      .filter(
        (job) =>
          job?.jobId && pendingIds.has(String(job.jobId)),
      );

    if (stillActiveTracked.length) return stillActiveTracked;
    return pendingFromState;
  }, []);

  const cancelActiveJobs = useCallback(async () => {
    const currentFormData = formDataRef.current;
    const activeJobs = resolveActiveJobs(currentFormData);
    const figmaJobs = activeJobs.filter(
      (job) =>
        job.tabId === "figma" ||
        mapScrapperTypeToTabId(job.scrapperType) === "figma",
    );
    const jobIds = [
      ...new Set(
        figmaJobs.map((job) => String(job?.jobId ?? "").trim()).filter(Boolean),
      ),
    ];
    if (!jobIds.length) return false;

    await Promise.all(jobIds.map((jobId) => cancelBrandingScraperJob(jobId)));

    const remainingActiveJobs = activeJobs.filter(
      (job) => !jobIds.includes(String(job?.jobId ?? "").trim()),
    );

    if (remainingActiveJobs.length === 0) {
      stopPolling();
    } else {
      activeJobsRef.current = remainingActiveJobs.map((job) =>
        enrichPendingJobWithTypeId(job, formDataRef.current),
      );
    }

    const setter = setFormDataRef.current;
    if (setter) {
      setter((prev) => {
        const currentJob = prev?.branding?.scraperJob || {};
        const currentJobsBySource = currentJob.jobsBySource || {};
        const nextJobsBySource = Object.fromEntries(
          Object.entries(currentJobsBySource).map(([sourceId, job]) => {
            if (sourceId !== "figma") return [sourceId, job];

            const isCancelledJob =
              jobIds.includes(String(job?.jobId ?? "").trim()) &&
              isScraperJobActive(job?.status);
            if (!isCancelledJob) return [sourceId, job];

            return [
              sourceId,
              {
                ...(job || {}),
                scrapperType: job?.scrapperType || mapTabIdToScrapperType("figma"),
                status: SCRAPER_JOB_STATUS.CANCELLED,
                progressStage: SCRAPER_JOB_PROGRESS_STAGE.CANCELLED,
              },
            ];
          }),
        );

        return mergeScraperJobCancelled(prev, {
          jobId: jobIds[0],
          jobsBySource: nextJobsBySource,
        });
      });
    }

    showToastRef.current({
      message: t(
        "order_view.branding_scraper_generate_cancelled",
        "Figma generation cancelled",
      ),
      variant: "warning",
    });

    return true;
  }, [resolveActiveJobs, stopPolling]);

  const pollScraperJobs = useCallback(
    async ({ notifyOnTerminal = false } = {}) => {
      const currentFormData = formDataRef.current;
      const orderId = currentFormData?.orderId;
      if (!orderId) return { isTerminal: true, pendingJobs: [] };

      const activeJobs = resolveActiveJobs(currentFormData);

      try {
        if (activeJobs.length > 1) {
          const settled = await Promise.allSettled(
            activeJobs.map((job) =>
              getBrandingScraperJobStatus({
                jobId: job.jobId,
                orderId,
                typeId: job.typeId,
              }),
            ),
          );
          const responses = settled
            .map((entry, index) => {
              if (entry.status === "fulfilled") return entry.value;
              // HTTP 500 / network errors fail only this job, never siblings.
              return buildFailedStatusPayload(activeJobs[index]);
            })
            .filter(Boolean);
          const result = applyMultipleJobStatusResponses(responses, {
            notify: notifyOnTerminal,
            jobRestrictions: activeJobs.map((job) => ({
              jobId: job.jobId,
              tabId: job.tabId,
            })),
          });
          activeJobsRef.current = (result.pendingJobs || []).map((job) =>
            enrichPendingJobWithTypeId(job, formDataRef.current),
          );
          return result;
        }

        if (activeJobs.length === 1) {
          const activeJob = activeJobs[0];
          let response;
          try {
            response = await getBrandingScraperJobStatus({
              jobId: activeJob.jobId,
              orderId,
              typeId: activeJob.typeId,
            });
          } catch {
            response = buildFailedStatusPayload(activeJob);
          }
          const result = applyJobsResponse(response, {
            notify: notifyOnTerminal,
            useSingleJobHandler: true,
            restrictToJobId: activeJob.jobId,
            restrictToTabId: activeJob.tabId,
          });
          activeJobsRef.current = (result.pendingJobs || []).map((job) =>
            enrichPendingJobWithTypeId(job, formDataRef.current),
          );
          return result;
        }

        // No tracked jobIds — do not probe getscraperjobs from the poll loop.
        // Server reconcile belongs only in resumeJobForOrder after Generate/history.
        return { isTerminal: true, pendingJobs: [] };
      } catch {
        const setter = setFormDataRef.current;
        if (setter) {
          setter((prev) => {
            const currentJobs = prev?.branding?.scraperJob?.jobsBySource || {};
            const polled = activeJobsRef.current || [];
            const nextJobsBySource = { ...currentJobs };
            polled.forEach((job) => {
              const sourceId =
                job?.tabId || mapScrapperTypeToTabId(job?.scrapperType);
              const current = sourceId ? nextJobsBySource[sourceId] : null;
              if (
                !sourceId ||
                !current ||
                current.status === SCRAPER_JOB_STATUS.COMPLETED
              ) {
                return;
              }
              nextJobsBySource[sourceId] = {
                ...current,
                status: SCRAPER_JOB_STATUS.FAILED,
                progressStage: SCRAPER_JOB_PROGRESS_STAGE.FAILED,
              };
            });
            return mergeScraperJobFailure(prev, {
              canRetry: notifyOnTerminal,
              jobId: polled[0]?.jobId,
              tabId: polled[0]?.tabId,
              jobsBySource: nextJobsBySource,
            });
          });
        }
        if (notifyOnTerminal) {
          showToastRef.current({
            message: t(
              "order_view.branding_scraper_generate_failed_title",
              "Generation failed",
            ),
            variant: "danger",
          });
        }
        return {
          isTerminal: true,
          status: SCRAPER_JOB_STATUS.FAILED,
          pendingJobs: [],
        };
      }
    },
    [applyJobsResponse, applyMultipleJobStatusResponses, resolveActiveJobs],
  );

  const startPolling = useCallback(
    (jobTarget, { notifyOnTerminal = true, formDataSnapshot } = {}) => {
      if (formDataSnapshot) {
        formDataRef.current = formDataSnapshot;
      }

      const orderId = formDataRef.current?.orderId;
      if (!orderId) return;

      const normalizedTargets = normalizeJobTargets(jobTarget)
        .map((job) => enrichPendingJobWithTypeId(job, formDataRef.current))
        .filter((job) => job?.jobId);

      const fallbackTargets = normalizedTargets.length
        ? normalizedTargets
        : collectPendingJobsFromScraperJob(
            formDataRef.current?.branding?.scraperJob,
            formDataRef.current,
          );

      const pollKey = buildPollKey(orderId, fallbackTargets);

      if (isPollingRef.current && activePollKeyRef.current === pollKey) {
        return;
      }

      stopPolling();
      activePollKeyRef.current = pollKey;
      activeJobsRef.current = fallbackTargets;
      isPollingRef.current = true;

      const runPoll = async () => {
        if (pollRequestInFlightRef.current) return;
        pollRequestInFlightRef.current = true;
        try {
          const result = await pollScraperJobs({ notifyOnTerminal });
          if (result?.isTerminal) {
            stopPolling();
          } else if (Array.isArray(result?.pendingJobs)) {
            activeJobsRef.current = result.pendingJobs
              .map((job) =>
                enrichPendingJobWithTypeId(job, formDataRef.current),
              )
              .filter((job) => job?.jobId);
            activePollKeyRef.current = buildPollKey(
              orderId,
              activeJobsRef.current,
            );
          }
          return result;
        } finally {
          pollRequestInFlightRef.current = false;
        }
      };

      const initialPoll = runPoll();
      pollTimerRef.current = setInterval(
        runPoll,
        BRANDING_SCRAPER_POLL_INTERVAL_MS,
      );
      return initialPoll;
    },
    [pollScraperJobs, stopPolling],
  );

  const resumeJobForOrder = useCallback(async () => {
    const orderId = formDataRef.current?.orderId;
    if (!orderId) return;

    const existingJob = formDataRef.current?.branding?.scraperJob;
    if (
      existingJob?.status === SCRAPER_JOB_STATUS.COMPLETED &&
      existingJob?.resultsBySource &&
      Object.keys(existingJob.resultsBySource).length > 0
    ) {
      return;
    }

    // Draft form edits (URL/file) alone must never hit getscraperjobs.
    if (!shouldReconcileScraperJobsFromServer(formDataRef.current)) {
      return;
    }

    const typeIds = collectScraperTypeIds(
      formDataRef.current?.branding,
      formDataRef.current,
    );
    const pendingFromState = collectPendingJobsFromScraperJob(
      existingJob,
      formDataRef.current,
    );

    const hasServerScrappingSource =
      normalizeScrappingSourceList(formDataRef.current?.scrappingSource).length >
      0;

    // Reconcile from server only when the ticket already has scrape history.
    // API contract: typeId must be an array, e.g. [1, 2].
    if (hasServerScrappingSource && typeIds.length > 0) {
      try {
        const response = await getBrandingScraperJobsByOrder({
          orderId,
          typeId: typeIds,
        });
        const jobs = normalizeScrapperJobsArray(response);

        if (jobs.length > 0) {
          const result = applyJobsResponse(
            { data: jobs },
            {
              notify: false,
              allowAutoApply: false,
            },
          );

          const pendingJobs = (result?.pendingJobs || []).filter(
            (job) => job?.jobId,
          );
          if (!result?.isTerminal && isScraperJobActive(result?.status)) {
            const jobsToPoll = pendingJobs.length
              ? pendingJobs
              : result.primaryPendingJob?.jobId
                ? [result.primaryPendingJob]
                : [];
            if (jobsToPoll.length) {
              startPolling(jobsToPoll, { notifyOnTerminal: false });
            }
          }
          return;
        }
      } catch {
        // Fall through to in-memory polling if getscraperjobs fails.
      }
    }

    if (
      pendingFromState.length > 0 &&
      String(existingJob?.orderId || orderId) === String(orderId) &&
      isScraperJobActive(existingJob?.status)
    ) {
      await startPolling(pendingFromState, { notifyOnTerminal: false });
      return;
    }

    if (
      existingJob?.jobId &&
      String(existingJob.orderId || orderId) === String(orderId) &&
      isScraperJobActive(existingJob.status)
    ) {
      await startPolling(
        {
          jobId: existingJob.jobId,
          typeId:
            existingJob.jobsBySource?.[existingJob.defaultSourceType]
              ?.typeId ??
            typeIds[0] ??
            null,
        },
        { notifyOnTerminal: false },
      );
    }
  }, [applyJobsResponse, startPolling]);

  useEffect(() => {
    resumedKeyRef.current = "";
    setResolvedInitialStatusOrderId(null);
  }, [formData?.orderId]);

  // Stop polling only when leaving the order / unmounting — not when ticket
  // fields hydrate after Generate (that used to kill an in-flight poll).
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [formData?.orderId, stopPolling]);

  useEffect(() => {
    const orderId = formData?.orderId;
    if (!orderId || !scraperResumeKey) return undefined;

    // Ticket payload may still be loading.
    if (formData?.scrappingSource === undefined) {
      return undefined;
    }

    if (resumedKeyRef.current === scraperResumeKey) {
      setResolvedInitialStatusOrderId(orderId);
      return undefined;
    }

    let cancelled = false;
    setShowStatusWhileResolving(false);

    const statusRevealTimer = setTimeout(() => {
      if (!cancelled) {
        setShowStatusWhileResolving(true);
      }
    }, INITIAL_STATUS_REVEAL_DELAY_MS);

    resumeJobForOrder()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          clearTimeout(statusRevealTimer);
          resumedKeyRef.current = scraperResumeKey;
          setResolvedInitialStatusOrderId(orderId);
          setShowStatusWhileResolving(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(statusRevealTimer);
    };
  }, [
    formData?.orderId,
    formData?.scrappingSource,
    scraperResumeKey,
    resumeJobForOrder,
  ]);

  const isResolvingInitialStatus =
    Boolean(formData?.orderId) &&
    resolvedInitialStatusOrderId !== formData.orderId;

  return {
    cancelActiveJobs,
    startPolling,
    shouldShowStatus: !isResolvingInitialStatus || showStatusWhileResolving,
  };
};

export default useBrandingScraperPolling;

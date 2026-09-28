/** Base Scraper — tab config, validation, and branding injection helpers */

import { BRANDING_SECTION_IDS, BRANDING_UI_TO_API_SECTION } from "./constants.js";
import { mapApiCustomerBrandingToSections } from "./api.js";
import { normalizeSectionFields } from "./sections.js";
import { buildBrandingPayload } from "./persistence.js";
import {
  customerBrandingHasSectionData,
  resolveCustomerBranding,
} from "./attachments.js";
import { resolveSectionImageReference } from "./alternatives.js";

export const BASE_SCRAPER_TAB_IDS = ["figma", "website", "pdf"];

/** Visible scraper sources in the UI (Website remains hidden for now). */
export const BASE_SCRAPER_VISIBLE_TAB_IDS = ["figma", "pdf", "website"];

export const SCRAPER_TYPE_ID_BY_TAB = {
  figma: 1,
  pdf: 2,
  website: 3,
};

function normalizeScraperTypeId(value) {
  const typeId = Number(value);
  return Object.values(SCRAPER_TYPE_ID_BY_TAB).includes(typeId)
    ? typeId
    : null;
}

export const SCRAPER_JOB_STATUS = {
  IDLE: "idle",
  GENERATING: "generating",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const SCRAPER_JOB_PROGRESS_STAGE = {
  QUEUED: "queued",
  EXTRACTING_CONTENT: "extracting_content",
  GENERATING_BRANDING_DATA: "generating_branding_data",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const SCRAPER_JOB_PIPELINE_STAGES = [
  SCRAPER_JOB_PROGRESS_STAGE.QUEUED,
  SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT,
  SCRAPER_JOB_PROGRESS_STAGE.GENERATING_BRANDING_DATA,
];

const SCRAPER_JOB_PROGRESS_STAGE_META = {
  [SCRAPER_JOB_PROGRESS_STAGE.QUEUED]: {
    labelKey: "branding_scraper_progress_queued",
    fallback: "Queued",
  },
  [SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT]: {
    labelKey: "branding_scraper_progress_extracting",
    customClassName: "inprogress",
    fallback: "Extraction inprogress...",
  },
  [SCRAPER_JOB_PROGRESS_STAGE.GENERATING_BRANDING_DATA]: {
    labelKey: "branding_scraper_progress_generating",
    fallback: "Generating Branding Data",
  },
  [SCRAPER_JOB_PROGRESS_STAGE.COMPLETED]: {
    labelKey: "branding_scraper_progress_completed",
    customClassName: "completed",
    fallback: "Extraction completed",
  },
  [SCRAPER_JOB_PROGRESS_STAGE.FAILED]: {
    labelKey: "branding_scraper_progress_failed",
    customClassName: "failed",
    fallback: "Failed",
  },
  [SCRAPER_JOB_PROGRESS_STAGE.CANCELLED]: {
    labelKey: "branding_scraper_progress_cancelled",
    customClassName: "cancelled",
    fallback: "Cancelled",
  },
};

export const ACTIVE_SCRAPER_JOB_STATUSES = [
  SCRAPER_JOB_STATUS.GENERATING,
  SCRAPER_JOB_STATUS.IN_PROGRESS,
];

function markFailedJobsBySource(
  jobsBySource = {},
  { jobId, tabId } = {},
) {
  const matchId = String(jobId ?? "").trim();
  const next = { ...(jobsBySource || {}) };
  let matched = false;

  Object.entries(next).forEach(([sourceId, job]) => {
    const isMatch =
      (tabId && sourceId === tabId) ||
      (matchId !== "" && String(job?.jobId ?? "").trim() === matchId);
    if (!isMatch) return;
    matched = true;
    next[sourceId] = {
      ...(job || {}),
      status: SCRAPER_JOB_STATUS.FAILED,
      progressStage: SCRAPER_JOB_PROGRESS_STAGE.FAILED,
    };
  });

  if (matched) return next;

  const sourceIds = Object.keys(next);
  if (sourceIds.length === 1) {
    const sourceId = sourceIds[0];
    next[sourceId] = {
      ...(next[sourceId] || {}),
      status: SCRAPER_JOB_STATUS.FAILED,
      progressStage: SCRAPER_JOB_PROGRESS_STAGE.FAILED,
    };
  }

  return next;
}

function mergeIncomingJobsBySource(prevJobsBySource = {}, incomingJobsBySource = {}) {
  const next = { ...prevJobsBySource };
  Object.entries(incomingJobsBySource || {}).forEach(([sourceId, incoming]) => {
    const prev = next[sourceId];
    const incomingStatus = mapApiScraperJobStatus(incoming?.status);
    const prevStatus = mapApiScraperJobStatus(prev?.status);
    const prevHasResult =
      prev?.result &&
      typeof prev.result === "object" &&
      Object.keys(prev.result).length > 0;

    // A failed sibling payload must not downgrade a completed/in-flight source.
    if (
      incomingStatus === SCRAPER_JOB_STATUS.FAILED &&
      prev &&
      (prevStatus === SCRAPER_JOB_STATUS.COMPLETED ||
        prevHasResult ||
        (prevStatus !== SCRAPER_JOB_STATUS.FAILED &&
          String(prev?.jobId ?? "").trim() !== "" &&
          String(incoming?.jobId ?? "").trim() !== "" &&
          String(prev.jobId) !== String(incoming.jobId)))
    ) {
      return;
    }

    next[sourceId] = incoming;
  });
  return next;
}

function markJobsBySourceAsExtracting(jobsBySource = {}) {
  return Object.fromEntries(
    Object.entries(jobsBySource).map(([sourceId, job]) => {
      // Preserve terminal failures/cancellations — siblings must not reset them.
      if (
        job?.status === SCRAPER_JOB_STATUS.FAILED ||
        job?.status === SCRAPER_JOB_STATUS.CANCELLED
      ) {
        return [sourceId, job];
      }
      const hasResult =
        job?.result &&
        typeof job.result === "object" &&
        Object.keys(job.result).length > 0;
      if (job?.status === SCRAPER_JOB_STATUS.COMPLETED && hasResult) {
        return [sourceId, job];
      }
      return [
        sourceId,
        {
          ...job,
          status: SCRAPER_JOB_STATUS.IN_PROGRESS,
          progressStage: SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT,
        },
      ];
    }),
  );
}

export const BRANDING_SCRAPER_POLL_INTERVAL_MS = 15000;
export const BASE_SCRAPER_TAB_LABELS = {
  figma: "Figma",
  website: "Website",
  pdf: "PDF",
};

const URL_PATTERN =
  /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;

/** Coerce API / FormData boolean-ish values without treating "false" as true. */
export function parseScraperBoolean(value, fallback = false) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (value == null || value === "") return Boolean(fallback);
  return Boolean(value);
}

export function createEmptyBaseScraperState() {
  return {
    activeTab: BASE_SCRAPER_VISIBLE_TAB_IDS[0],
    skipped: false,
    hasGenerated: false,
    figma: { url: "", pdfFile: null, isDefault: false, typeId: null },
    website: { url: "", isDefault: false, typeId: null, onlyCurrentPage: false },
    pdf: { pdfFile: null, isDefault: false, typeId: null },
  };
}

export function mapScrapperTypeToTabId(scrapperType = "") {
  const key = String(scrapperType ?? "").trim().toUpperCase();
  if (key === "FIGMA") return "figma";
  if (key === "PDF") return "pdf";
  if (key === "WEBSITE") return "website";
  return "";
}

export function mapTabIdToScrapperType(tabId = "") {
  const map = { figma: "FIGMA", pdf: "PDF", website: "WEBSITE" };
  return map[tabId] || "";
}

function collectJobsArrayFromUnknown(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
}

export function normalizeScrapperJobsArray(response) {
  const data = response?.data ?? response;
  const nestedLists = [
    data,
    data?.data,
    data?.jobs,
    data?.scrapperJobs,
    data?.jobList,
    data?.data?.jobs,
    data?.data?.scrapperJobs,
  ];
  for (const candidate of nestedLists) {
    const list = collectJobsArrayFromUnknown(candidate);
    if (list.length) return list;
  }
  if (
    data &&
    typeof data === "object" &&
    (data.scrapperType || data.jobId || data.JobId)
  ) {
    return [data];
  }
  return [];
}

/**
 * OrderTicketDetails may return scrappingSource as an array or a single object.
 */
export function normalizeScrappingSourceList(scrappingSource) {
  if (scrappingSource == null) return [];
  if (Array.isArray(scrappingSource)) {
    return scrappingSource.filter((item) => item && typeof item === "object");
  }
  if (typeof scrappingSource === "object") {
    const hasSourceFields =
      scrappingSource.figmaTypeId != null ||
      scrappingSource.FigmaTypeId != null ||
      scrappingSource.pdfTypeId != null ||
      scrappingSource.PdfTypeId != null ||
      scrappingSource.websiteTypeId != null ||
      scrappingSource.WebsiteTypeId != null ||
      scrappingSource.figmaURL ||
      scrappingSource.figmaUrl ||
      scrappingSource.FigmaURL ||
      scrappingSource.figmaAttachments ||
      scrappingSource.pdfAttachments ||
      scrappingSource.PdfAttachments ||
      scrappingSource.websiteURL ||
      scrappingSource.websiteUrl ||
      scrappingSource.WebsiteURL;
    return hasSourceFields ? [scrappingSource] : [];
  }
  return [];
}

export function mapScrappingSourceToBaseScraper(scrappingSource = []) {
  const state = createEmptyBaseScraperState();
  const sources = normalizeScrappingSourceList(scrappingSource);
  if (!sources.length) return state;

  let hasAny = false;
  sources.forEach((item) => {
    if (!item || typeof item !== "object") return;

    if (
      item.figmaTypeId != null ||
      item.FigmaTypeId != null ||
      item.figmaURL ||
      item.figmaUrl ||
      item.FigmaURL ||
      item.figmaAttachments
    ) {
      state.figma = {
        ...state.figma,
        typeId: item.figmaTypeId ?? item.FigmaTypeId ?? state.figma.typeId,
        url: String(item.figmaURL ?? item.figmaUrl ?? item.FigmaURL ?? state.figma.url ?? "").trim(),
        isDefault: Boolean(item.figmaIsDefault),
        existingAttachment: item.figmaAttachments ?? state.figma.existingAttachment ?? null,
      };
      if (state.figma.url || state.figma.existingAttachment) hasAny = true;
    }

    if (
      item.pdfTypeId != null ||
      item.PdfTypeId != null ||
      item.pdfAttachments ||
      item.PdfAttachments
    ) {
      state.pdf = {
        ...state.pdf,
        typeId: item.pdfTypeId ?? item.PdfTypeId ?? state.pdf.typeId,
        isDefault: Boolean(item.pdfIsDefault),
        existingAttachment:
          item.pdfAttachments ?? item.PdfAttachments ?? state.pdf.existingAttachment ?? null,
      };
      if (state.pdf.existingAttachment) hasAny = true;
    }

    if (
      item.websiteTypeId != null ||
      item.WebsiteTypeId != null ||
      item.websiteURL ||
      item.websiteUrl ||
      item.WebsiteURL
    ) {
      state.website = {
        ...state.website,
        typeId: item.websiteTypeId ?? item.WebsiteTypeId ?? state.website.typeId,
        url: String(
          item.websiteURL ?? item.websiteUrl ?? item.WebsiteURL ?? state.website.url ?? "",
        ).trim(),
        isDefault: Boolean(item.websiteIsDefault),
        onlyCurrentPage: parseScraperBoolean(
          item.onlyCurrentPage ?? item.OnlyCurrentPage,
          false,
        ),
      };
      if (state.website.url) hasAny = true;
    }
  });

  if (hasAny) state.hasGenerated = true;
  return sanitizeScraperDefaultFlags(state);
}

export function collectScraperTypeIds(branding = {}, formData = {}) {
  const ids = new Set();
  const scrappingSource = normalizeScrappingSourceList(
    formData?.scrappingSource ?? branding?.scrappingSource ?? formData?.branding?.scrappingSource,
  );

  if (scrappingSource.length) {
    scrappingSource.forEach((item) => {
      const figmaTypeId = normalizeScraperTypeId(
        item?.figmaTypeId ?? item?.FigmaTypeId,
      );
      const pdfTypeId = normalizeScraperTypeId(
        item?.pdfTypeId ?? item?.PdfTypeId,
      );
      const websiteTypeId = normalizeScraperTypeId(
        item?.websiteTypeId ?? item?.WebsiteTypeId,
      );
      if (figmaTypeId != null) ids.add(figmaTypeId);
      if (pdfTypeId != null) ids.add(pdfTypeId);
      if (websiteTypeId != null) ids.add(websiteTypeId);

      // Source present without explicit typeId — still resume with contract ids.
      if (
        figmaTypeId == null &&
        (item?.figmaURL || item?.figmaUrl || item?.FigmaURL || item?.figmaAttachments)
      ) {
        ids.add(SCRAPER_TYPE_ID_BY_TAB.figma);
      }
      if (
        pdfTypeId == null &&
        (item?.pdfAttachments || item?.PdfAttachments)
      ) {
        ids.add(SCRAPER_TYPE_ID_BY_TAB.pdf);
      }
      if (
        websiteTypeId == null &&
        (item?.websiteURL || item?.websiteUrl || item?.WebsiteURL)
      ) {
        ids.add(SCRAPER_TYPE_ID_BY_TAB.website);
      }
    });
  }

  const baseScraper = branding?.baseScraper || {};
  BASE_SCRAPER_TAB_IDS.forEach((tabId) => {
    const typeId = normalizeScraperTypeId(baseScraper[tabId]?.typeId);
    if (typeId != null) {
      ids.add(typeId);
      return;
    }
    if (hasBaseScraperInput(tabId, baseScraper[tabId])) {
      const fallback = SCRAPER_TYPE_ID_BY_TAB[tabId];
      if (fallback != null) ids.add(fallback);
    }
  });

  const jobsBySource = branding?.scraperJob?.jobsBySource || {};
  Object.entries(jobsBySource).forEach(([tabId, job]) => {
    const typeId =
      normalizeScraperTypeId(job?.typeId) ?? SCRAPER_TYPE_ID_BY_TAB[tabId] ?? null;
    if (typeId != null) ids.add(typeId);
  });

  return [...ids].sort((a, b) => a - b);
}

export function mergeScrappingSourceIntoBranding(branding = {}, formData = {}) {
  const scrappingSource = normalizeScrappingSourceList(
    formData?.scrappingSource ?? branding?.scrappingSource ?? formData?.branding?.scrappingSource,
  );
  if (!scrappingSource.length) {
    return branding;
  }

  const mapped = mapScrappingSourceToBaseScraper(scrappingSource);
  const current = normalizeBaseScraperState(branding?.baseScraper);

  const mergeTab = (tabId) => ({
    ...current[tabId],
    typeId: current[tabId]?.typeId ?? mapped[tabId]?.typeId ?? null,
    // Keep an explicit local URL (including "") so Re-extract can clear a failed Figma URL.
    url:
      typeof current[tabId]?.url === "string"
        ? current[tabId].url
        : String(mapped[tabId]?.url ?? ""),
    isDefault: Boolean(current[tabId]?.isDefault || mapped[tabId]?.isDefault),
    existingAttachment:
      current[tabId]?.existingAttachment ?? mapped[tabId]?.existingAttachment ?? null,
    ...(tabId === "website"
      ? {
          // Prefer ticket scrappingSource so Re-extract restores the saved scope.
          // Do not use ?? with a local false default — that would ignore API true.
          onlyCurrentPage: parseScraperBoolean(
            mapped.website?.onlyCurrentPage,
            parseScraperBoolean(current.website?.onlyCurrentPage, false),
          ),
        }
      : {}),
  });

  return {
    ...branding,
    scrappingSource,
    baseScraper: current.hasGenerated
      ? sanitizeScraperDefaultFlags({
          ...current,
          figma: mergeTab("figma"),
          website: mergeTab("website"),
          pdf: mergeTab("pdf"),
        })
      : mapped,
  };
}

/**
 * Resolve base-scraper UI state from in-memory branding and/or persisted scrappingSource.
 * Used after remount so Retry / Re-extract still have URLs and existing attachments.
 */
export function resolveBaseScraperStateFromFormData(formData = {}) {
  const fromBranding = normalizeBaseScraperState(formData?.branding?.baseScraper);
  const scrappingSource = normalizeScrappingSourceList(
    formData?.scrappingSource ?? formData?.branding?.scrappingSource,
  );

  if (!scrappingSource.length) {
    return fromBranding;
  }

  // Prefer merging ticket scrappingSource so newly persisted sources appear on Edit,
  // even when a prior in-memory baseScraper (hasGenerated) is still present.
  return mergeScrappingSourceIntoBranding(
    { baseScraper: fromBranding },
    { scrappingSource },
  ).baseScraper;
}

function hasPdfScraperAttachment(tabState = {}) {
  return Boolean(
    tabState.pdfFile ||
      tabState.existingAttachment?.fileName ||
      tabState.existingAttachment?.fileUrl,
  );
}

export function hasValidInputForDefaultTab(tabId, tabState = {}) {
  if (tabId === "figma") {
    const url = String(tabState.url ?? "").trim();
    return Boolean(url && isValidScraperUrl(url) && hasPdfScraperAttachment(tabState));
  }
  if (tabId === "website") {
    const url = String(tabState.url ?? "").trim();
    return Boolean(url && isValidScraperUrl(url));
  }
  if (tabId === "pdf") {
    return hasPdfScraperAttachment(tabState);
  }
  return false;
}

export function canEnableDefaultToggle(tabId, tabState = {}) {
  return hasValidInputForDefaultTab(tabId, tabState);
}

export function sanitizeScraperDefaultFlags(state = {}) {
  const next = {
    ...state,
    figma: { ...(state.figma || {}) },
    website: { ...(state.website || {}) },
    pdf: { ...(state.pdf || {}) },
  };

  BASE_SCRAPER_TAB_IDS.forEach((id) => {
    if (next[id]?.isDefault && !hasValidInputForDefaultTab(id, next[id])) {
      next[id] = { ...next[id], isDefault: false };
    }
  });

  let foundDefault = false;
  BASE_SCRAPER_TAB_IDS.forEach((id) => {
    if (!next[id]?.isDefault) return;
    if (foundDefault) {
      next[id] = { ...next[id], isDefault: false };
    } else {
      foundDefault = true;
    }
  });

  return next;
}

export function normalizeBaseScraperState(raw = {}) {
  const defaults = createEmptyBaseScraperState();
  const figma = { ...defaults.figma, ...(raw.figma || {}) };
  const website = {
    ...defaults.website,
    ...(raw.website || {}),
    onlyCurrentPage: parseScraperBoolean(
      raw.website?.onlyCurrentPage,
      defaults.website.onlyCurrentPage,
    ),
  };
  const pdf = { ...defaults.pdf, ...(raw.pdf || {}) };

  return sanitizeScraperDefaultFlags({
    ...defaults,
    ...raw,
    activeTab: BASE_SCRAPER_VISIBLE_TAB_IDS.includes(raw.activeTab) ? raw.activeTab : defaults.activeTab,
    figma,
    website,
    pdf,
  });
}

export function isValidScraperUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return true;
  return URL_PATTERN.test(trimmed);
}

export function getScraperUrlError(value, label = "URL") {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (!URL_PATTERN.test(trimmed)) {
    return `Enter a valid ${label}`;
  }
  return "";
}

export function setDefaultScraperTab(state, tabId) {
  const next = normalizeBaseScraperState(state);
  BASE_SCRAPER_TAB_IDS.forEach((id) => {
    next[id] = { ...next[id], isDefault: id === tabId };
  });
  return next;
}

export function hasBaseScraperInput(tabId, tabState = {}) {
  if (tabId === "figma") {
    return Boolean(
      String(tabState.url ?? "").trim() ||
        tabState.pdfFile ||
        tabState.existingAttachment?.fileName ||
        tabState.existingAttachment?.fileUrl,
    );
  }
  if (tabId === "website") {
    return Boolean(String(tabState.url ?? "").trim());
  }
  if (tabId === "pdf") {
    return hasPdfScraperAttachment(tabState);
  }
  return false;
}

export function isBaseScraperTabValid(tabId, tabState = {}) {
  if (tabId === "figma") {
    const url = String(tabState.url ?? "").trim();
    const hasPdf = hasPdfScraperAttachment(tabState);
    // Figma is optional as a source, but once used both URL and PDF are mandatory.
    if (!url && !hasPdf) return true;
    if (!url || !isValidScraperUrl(url)) return false;
    if (!hasPdf) return false;
    return true;
  }
  if (tabId === "website") {
    const url = String(tabState.url ?? "").trim();
    if (!url) return true;
    return isValidScraperUrl(url);
  }
  return true;
}

export function isBaseScraperStateDirty(current, baseline) {
  const cur = normalizeBaseScraperState(current);
  const base = normalizeBaseScraperState(baseline);

  return BASE_SCRAPER_TAB_IDS.some((tabId) => {
    const curTab = cur[tabId] || {};
    const baseTab = base[tabId] || {};
    if (Boolean(curTab.isDefault) !== Boolean(baseTab.isDefault)) return true;
    if (String(curTab.url ?? "") !== String(baseTab.url ?? "")) return true;
    if (
      tabId === "website" &&
      Boolean(curTab.onlyCurrentPage) !== Boolean(baseTab.onlyCurrentPage)
    ) {
      return true;
    }

    const curFile = curTab.pdfFile instanceof File ? curTab.pdfFile : null;
    const baseFile = baseTab.pdfFile instanceof File ? baseTab.pdfFile : null;
    // A newly staged File is always a change — even when the filename matches a
    // previous attachment (re-extract of the same failed file).
    if (curFile && (!baseFile || curFile !== baseFile)) return true;
    if (!curFile && baseFile) return true;

    const curExisting = curTab.existingAttachment?.fileName ?? "";
    const baseExisting = baseTab.existingAttachment?.fileName ?? "";
    if (curExisting !== baseExisting) return true;
    return false;
  });
}

export function hasAnyBaseScraperInput(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  return BASE_SCRAPER_TAB_IDS.some((tabId) =>
    hasBaseScraperInput(tabId, normalized[tabId]),
  );
}

/**
 * Inputs that can be sent as a fresh extract request (no reused attachment names).
 * Figma requires both a valid URL and a newly staged PDF file.
 */
export function hasFreshBaseScraperExtractInput(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  return BASE_SCRAPER_TAB_IDS.some((tabId) =>
    hasFreshExtractSource(tabId, normalized[tabId]),
  );
}

function hasFreshExtractSource(tabId, tabState = {}) {
  if (tabId === "website") {
    return Boolean(String(tabState.url ?? "").trim());
  }
  if (tabId === "figma") {
    const url = String(tabState.url ?? "").trim();
    return Boolean(
      url && isValidScraperUrl(url) && tabState.pdfFile instanceof File,
    );
  }
  if (tabId === "pdf") {
    return tabState.pdfFile instanceof File;
  }
  return false;
}

/** Retry requires in-memory File objects — persisted filenames alone are not accepted by the API. */
export function hasRetryableBaseScraperInput(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  return BASE_SCRAPER_TAB_IDS.some((tabId) =>
    hasFreshExtractSource(tabId, normalized[tabId]),
  );
}

export function isBaseScraperStateValid(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  return BASE_SCRAPER_TAB_IDS.every((tabId) =>
    isBaseScraperTabValid(tabId, normalized[tabId]),
  );
}

export function getAllScraperUrlErrors(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  const errors = {};
  const figmaUrl = String(normalized.figma?.url ?? "").trim();
  const figmaHasPdf = hasPdfScraperAttachment(normalized.figma);
  if (figmaHasPdf && !figmaUrl) {
    errors.figma = "Figma URL is required";
  } else {
    const figmaError = getScraperUrlError(normalized.figma?.url, "Figma URL");
    if (figmaError) errors.figma = figmaError;
  }
  const websiteError = getScraperUrlError(normalized.website?.url, "Website URL");
  if (websiteError) errors.website = websiteError;
  return errors;
}

/** PDF field errors for scraper tabs that require an attachment. */
export function getAllScraperPdfErrors(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  const errors = {};
  const figmaUrl = String(normalized.figma?.url ?? "").trim();
  const figmaHasPdf = hasPdfScraperAttachment(normalized.figma);
  if (figmaUrl && !figmaHasPdf) {
    errors.figma = "Figma PDF is required";
  }
  return errors;
}

export function getDefaultScraperTabId(state = {}) {
  const normalized = normalizeBaseScraperState(state);
  return BASE_SCRAPER_TAB_IDS.find((id) => normalized[id]?.isDefault) ?? "";
}

export function normalizeDefaultSourceType(value = "") {
  const tabId = mapScrapperTypeToTabId(value);
  if (tabId) return tabId;
  const lowered = String(value ?? "").trim().toLowerCase();
  return BASE_SCRAPER_TAB_IDS.includes(lowered) ? lowered : "";
}

export function buildBaseScraperFormData(scraperState = {}, orderId) {
  const state = normalizeBaseScraperState(scraperState);
  // Fresh extract only — include sources the user selected now (File / URL),
  // never reuse prior completed jobs via existingAttachment filenames.
  const selectedTabIds = BASE_SCRAPER_TAB_IDS.filter((tabId) =>
    hasFreshExtractSource(tabId, state[tabId]),
  );
  const sourceType = selectedTabIds.map(mapTabIdToScrapperType).filter(Boolean).join(",");
  const formData = new FormData();

  formData.append("orderId", String(orderId ?? ""));
  if (sourceType) {
    formData.append("sourceType", sourceType);
  }

  const includeFigma = selectedTabIds.includes("figma");
  const includeWebsite = selectedTabIds.includes("website");
  const includePdf = selectedTabIds.includes("pdf");

  formData.append(
    "figmaIsDefault",
    includeFigma && Boolean(state.figma?.isDefault) ? "true" : "false",
  );
  formData.append(
    "websiteIsDefault",
    includeWebsite && Boolean(state.website?.isDefault) ? "true" : "false",
  );
  formData.append(
    "pdfIsDefault",
    includePdf && Boolean(state.pdf?.isDefault) ? "true" : "false",
  );

  if (includeFigma) {
    const figmaUrl = String(state.figma?.url ?? "").trim();
    formData.append("figmaUrl", figmaUrl);
    if (state.figma?.pdfFile instanceof File) {
      formData.append("figmaFile", state.figma.pdfFile);
    }
  }

  if (includeWebsite) {
    const websiteUrl = String(state.website?.url ?? "").trim();
    if (websiteUrl) formData.append("websiteUrl", websiteUrl);
    formData.append(
      "onlyCurrentPage",
      parseScraperBoolean(state.website?.onlyCurrentPage) ? "true" : "false",
    );
  }

  if (includePdf && state.pdf?.pdfFile instanceof File) {
    formData.append("pdfFile", state.pdf.pdfFile);
  }

  return formData;
}

export function mergeOrderTicketDetailsIntoFormData(prevFormData = {}, orderTicketDetails = {}) {
  if (!orderTicketDetails || typeof orderTicketDetails !== "object") {
    return prevFormData;
  }

  const scrappingSource = normalizeScrappingSourceList(
    orderTicketDetails.scrappingSource ?? prevFormData.scrappingSource,
  );
  const mergedFormData = {
    ...prevFormData,
    ...orderTicketDetails,
    scrappingSource,
    branding: mergeScrappingSourceIntoBranding(prevFormData?.branding || {}, {
      ...prevFormData,
      ...orderTicketDetails,
      scrappingSource,
    }),
  };

  return mergedFormData;
}

export function enrichPendingJobWithTypeId(pendingJob = {}, formData = {}) {
  if (!pendingJob) return pendingJob;

  const providedTypeId = normalizeScraperTypeId(pendingJob.typeId);
  if (providedTypeId != null) {
    return { ...pendingJob, typeId: providedTypeId };
  }

  const tabId =
    pendingJob.tabId ||
    mapScrapperTypeToTabId(pendingJob.scrapperType) ||
    formData?.branding?.scraperJob?.defaultSourceType;
  if (!tabId) return pendingJob;

  const typeIdKeys = {
    figma: "figmaTypeId",
    pdf: "pdfTypeId",
    website: "websiteTypeId",
  };
  const typeIdKey = typeIdKeys[tabId];
  const scrappingSource = normalizeScrappingSourceList(formData?.scrappingSource);
  const matchingTypeId =
    formData?.branding?.baseScraper?.[tabId]?.typeId ??
    (typeIdKey
      ? scrappingSource.find((item) => item?.[typeIdKey] != null)?.[typeIdKey]
      : null);
  const collectedTypeIds = collectScraperTypeIds(
    formData?.branding || {},
    formData,
  );
  const typeId =
    normalizeScraperTypeId(
      matchingTypeId ??
        (collectedTypeIds.length === 1 ? collectedTypeIds[0] : null),
    ) ??
    SCRAPER_TYPE_ID_BY_TAB[tabId] ??
    null;

  return typeId != null ? { ...pendingJob, tabId, typeId } : { ...pendingJob, tabId };
}

export function extractCustomerBrandingFromScraperResponse(response) {
  const data = response?.data ?? response;
  if (!data || typeof data !== "object") return null;
  if (data.result) {
    const fromResult = resolveSourceBrandingPayload(data.result);
    if (fromResult) return fromResult;
  }
  if (data.customerBranding) return data.customerBranding;
  if (data.CustomerBranding) return data.CustomerBranding;
  if (data.brandingGuidelines) return data.brandingGuidelines;
  if (data.branding?.customerBranding) return data.branding.customerBranding;
  return data;
}

function resolveSourceBrandingPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.brandingGuidelines) return raw.brandingGuidelines;
  if (raw.BrandingGuidelines) return raw.BrandingGuidelines;
  if (raw.customerBranding) return raw.customerBranding;
  if (raw.CustomerBranding) return raw.CustomerBranding;
  if (raw.typography || raw.colors || raw.buttons || raw.tabs) return raw;
  return null;
}

export function extractScraperResultsBySource(response) {
  const data = response?.data ?? response;
  if (!data || typeof data !== "object") return {};

  if (data.result && data.scrapperType) {
    const tabId = mapScrapperTypeToTabId(data.scrapperType);
    const branding = resolveSourceBrandingPayload(data.result);
    if (tabId && branding) return { [tabId]: branding };
  }

  const fromJobsArray = buildResultsBySourceFromJobs(normalizeScrapperJobsArray(response));
  if (Object.keys(fromJobsArray).length > 0) return fromJobsArray;

  const fromBuckets = {};
  BASE_SCRAPER_TAB_IDS.forEach((id) => {
    const branding = resolveSourceBrandingPayload(data[id]);
    if (branding && typeof branding === "object") {
      fromBuckets[id] = branding;
    }
  });
  if (Object.keys(fromBuckets).length > 0) return fromBuckets;

  if (data.sources && typeof data.sources === "object") {
    BASE_SCRAPER_TAB_IDS.forEach((id) => {
      const branding = resolveSourceBrandingPayload(data.sources[id]);
      if (branding && typeof branding === "object") {
        fromBuckets[id] = branding;
      }
    });
    if (Object.keys(fromBuckets).length > 0) return fromBuckets;
  }

  const single = extractCustomerBrandingFromScraperResponse(response);
  if (single) {
    const fallbackSource =
      data.defaultSourceType || data.defaultSource || BASE_SCRAPER_TAB_IDS[0];
    return { [fallbackSource]: single };
  }

  return {};
}

export function getAvailableScraperSources(resultsBySource = {}) {
  return BASE_SCRAPER_TAB_IDS.filter((id) => resultsBySource[id]);
}

/**
 * Keep early completed sources visible/usable while sibling jobs are still running.
 */
function attachPartialScraperResults(nextFormData, resultsBySource = {}) {
  if (!nextFormData?.branding?.scraperJob) return nextFormData;
  const availableSources = getAvailableScraperSources(resultsBySource);
  return {
    ...nextFormData,
    branding: {
      ...nextFormData.branding,
      scraperJob: {
        ...nextFormData.branding.scraperJob,
        resultsBySource,
        availableSources,
      },
    },
  };
}

export function buildInitialJobsBySourceFromScraperState(scraperState = {}) {
  const state = normalizeBaseScraperState(scraperState);
  const jobsBySource = {};
  BASE_SCRAPER_TAB_IDS.forEach((tabId) => {
    if (!hasFreshExtractSource(tabId, state[tabId])) return;
    jobsBySource[tabId] = {
      scrapperType: mapTabIdToScrapperType(tabId),
      jobId: null,
      status: SCRAPER_JOB_STATUS.GENERATING,
      progressStage: SCRAPER_JOB_PROGRESS_STAGE.QUEUED,
      typeId:
        normalizeScraperTypeId(state[tabId]?.typeId) ??
        SCRAPER_TYPE_ID_BY_TAB[tabId] ??
        null,
      result: {},
    };
  });
  return jobsBySource;
}

export function createScraperJobGenerating(
  defaultSourceType = "",
  orderId = "",
  { jobsBySource, manualIntervention = false } = {},
) {
  return {
    jobId: "",
    orderId: String(orderId ?? ""),
    status: SCRAPER_JOB_STATUS.GENERATING,
    progressStage: SCRAPER_JOB_PROGRESS_STAGE.QUEUED,
    defaultSourceType,
    availableSources: [],
    resultsBySource: {},
    sectionSources: {},
    jobsBySource: jobsBySource ?? {},
    autoApplied: false,
    manualIntervention,
  };
}

/**
 * Start (or re-start) extraction for the given sources while preserving
 * sibling source jobs/results that are not part of this request.
 */
export function beginScraperJobExtract(
  prevScraperJob = {},
  {
    defaultSourceType = "",
    orderId = "",
    jobsBySource = {},
    manualIntervention = false,
  } = {},
) {
  const prev = prevScraperJob && typeof prevScraperJob === "object" ? prevScraperJob : {};
  const extractingSourceIds = Object.keys(jobsBySource || {});
  const prevJobsBySource = prev.jobsBySource || {};

  const nextJobsBySource = {
    ...prevJobsBySource,
    ...jobsBySource,
  };

  const nextResultsBySource = { ...(prev.resultsBySource || {}) };
  extractingSourceIds.forEach((sourceId) => {
    delete nextResultsBySource[sourceId];
  });

  const nextAvailableSources = getAvailableScraperSources(nextResultsBySource);
  const resolvedDefault =
    normalizeDefaultSourceType(defaultSourceType) ||
    normalizeDefaultSourceType(prev.defaultSourceType) ||
    "";

  return {
    ...prev,
    jobId: "",
    orderId: String(orderId ?? prev.orderId ?? ""),
    status: SCRAPER_JOB_STATUS.GENERATING,
    progressStage: SCRAPER_JOB_PROGRESS_STAGE.QUEUED,
    defaultSourceType: resolvedDefault,
    availableSources: nextAvailableSources,
    resultsBySource: nextResultsBySource,
    // Keep prior section→source bindings; completed siblings stay usable.
    sectionSources: { ...(prev.sectionSources || {}) },
    jobsBySource: nextJobsBySource,
    autoApplied: false,
    manualIntervention: Boolean(manualIntervention || prev.manualIntervention),
    canRetry: false,
  };
}

/**
 * Resolves the imageReference URL used by "View reference" for a section.
 * Prefers hydrated section state; falls back to the raw Figma scrape payload
 * (including typography heading/body nested refs).
 */
export function resolveFigmaImageReferenceForSection({
  branding = {},
  sectionId = "",
} = {}) {
  const fromSection = resolveSectionImageReference(
    branding?.sections?.[sectionId],
  );
  if (fromSection) return fromSection;

  const apiKey = BRANDING_UI_TO_API_SECTION[sectionId] || sectionId;
  const figmaResult = branding?.scraperJob?.resultsBySource?.figma;
  if (!figmaResult || typeof figmaResult !== "object") return "";

  return resolveSectionImageReference(figmaResult?.[apiKey]);
}

/** Figma View Reference is allowed for a Figma-sourced section with imageReference. */
export function canShowFigmaViewReference({
  branding = {},
  sectionId = "",
  sectionSources = {},
} = {}) {
  const scraperJob = branding?.scraperJob || {};
  const selectedSource =
    sectionSources?.[sectionId] ||
    scraperJob?.defaultSourceType ||
    "";
  if (selectedSource !== "figma") return false;

  const imageReference = resolveFigmaImageReferenceForSection({
    branding,
    sectionId,
  });
  if (!imageReference) return false;

  // Persisted section already has a Figma image ref (e.g. after save/reload).
  const sectionHasRef = Boolean(
    resolveSectionImageReference(branding?.sections?.[sectionId]),
  );
  if (sectionHasRef) return true;

  const figmaJob = scraperJob?.jobsBySource?.figma;
  if (figmaJob?.status !== SCRAPER_JOB_STATUS.COMPLETED) return false;

  const figmaResult = scraperJob?.resultsBySource?.figma;
  if (!figmaResult || typeof figmaResult !== "object") return false;
  if (Object.keys(figmaResult).length === 0) return false;

  return true;
}

export function buildResultsBySourceFromJobs(jobs = []) {
  const resultsBySource = {};
  jobs.forEach((job) => {
    const tabId = resolveTabIdFromScraperJob(job);
    const branding = resolveSourceBrandingPayload(job?.result);
    if (tabId && branding && Object.keys(branding).length > 0) {
      resultsBySource[tabId] = branding;
    }
  });
  return resultsBySource;
}

export function shouldAutoApplyScrapedBranding(
  branding = {},
  defaultSourceType = "",
  resultsBySource = {},
  { allowAutoApply = true } = {},
) {
  if (!allowAutoApply) return false;
  if (!defaultSourceType || !resultsBySource[defaultSourceType]) return false;
  if (branding?.scraperJob?.manualIntervention) return false;

  const baseScraper = normalizeBaseScraperState(branding?.baseScraper);
  return Boolean(baseScraper[defaultSourceType]?.isDefault);
}

export function hasPersistedBrandingGuidelines(branding = {}) {
  if (customerBrandingHasSectionData(resolveCustomerBranding(branding))) {
    return true;
  }

  return Object.values(branding?.sections || {}).some((section) => {
    const apiSectionId = section?.apiSectionId;
    const activeSource = String(section?.activeSource ?? "").trim();
    return (
      activeSource !== "" ||
      (apiSectionId != null && String(apiSectionId).trim() !== "")
    );
  });
}

function resolveTabIdFromScraperJob(job = {}) {
  const fromType = mapScrapperTypeToTabId(job?.scrapperType);
  if (fromType) return fromType;
  const typeId = normalizeScraperTypeId(job?.typeId);
  if (typeId == null) return "";
  return (
    BASE_SCRAPER_TAB_IDS.find((tabId) => SCRAPER_TYPE_ID_BY_TAB[tabId] === typeId) ||
    ""
  );
}

export function buildJobsBySourceFromApiJobs(jobs = [], baseScraper = {}) {
  const jobsBySource = {};
  jobs.forEach((job) => {
    const tabId = resolveTabIdFromScraperJob(job);
    if (!tabId) return;
    const status = mapApiScraperJobStatus(job.status);
    jobsBySource[tabId] = {
      scrapperType: job.scrapperType || mapTabIdToScrapperType(tabId),
      jobId: job.jobId ?? null,
      status,
      progressStage: extractScraperJobProgressStageFromPayload(job, { status }),
      typeId:
        normalizeScraperTypeId(job.typeId) ??
        normalizeScraperTypeId(baseScraper?.[tabId]?.typeId) ??
        SCRAPER_TYPE_ID_BY_TAB[tabId] ??
        null,
      result: job.result ?? {},
    };
  });
  return jobsBySource;
}

export function getAggregateScraperJobStatus(jobs = []) {
  if (!jobs.length) return SCRAPER_JOB_STATUS.IDLE;
  const statuses = jobs.map((job) => mapApiScraperJobStatus(job?.status));

  // One failure must not stop siblings that are still running.
  if (statuses.some((status) => isScraperJobActive(status))) {
    return SCRAPER_JOB_STATUS.IN_PROGRESS;
  }
  if (statuses.every((status) => status === SCRAPER_JOB_STATUS.COMPLETED)) {
    return SCRAPER_JOB_STATUS.COMPLETED;
  }
  // Mixed terminal outcomes: keep successful results available overall.
  if (statuses.some((status) => status === SCRAPER_JOB_STATUS.COMPLETED)) {
    return SCRAPER_JOB_STATUS.COMPLETED;
  }
  if (statuses.every((status) => status === SCRAPER_JOB_STATUS.CANCELLED)) {
    return SCRAPER_JOB_STATUS.CANCELLED;
  }
  if (statuses.some((status) => status === SCRAPER_JOB_STATUS.CANCELLED)) {
    return SCRAPER_JOB_STATUS.CANCELLED;
  }
  if (statuses.every((status) => status === SCRAPER_JOB_STATUS.FAILED)) {
    return SCRAPER_JOB_STATUS.FAILED;
  }
  return SCRAPER_JOB_STATUS.FAILED;
}

export function findAllPendingScrapperJobs(jobs = []) {
  return (Array.isArray(jobs) ? jobs : []).filter(
    (job) =>
      job?.jobId != null &&
      job.jobId !== "" &&
      isScraperJobActive(mapApiScraperJobStatus(job.status)),
  );
}

export function findPrimaryPendingScrapperJob(jobs = []) {
  return findAllPendingScrapperJobs(jobs)[0] || null;
}

function buildPendingJobTarget(job = {}, jobsBySource = {}, formData = {}) {
  if (!job?.jobId) return null;
  const tabId =
    mapScrapperTypeToTabId(job.scrapperType) ||
    job.tabId ||
    "";
  return enrichPendingJobWithTypeId(
    {
      jobId: job.jobId,
      typeId:
        job.typeId ??
        jobsBySource[tabId]?.typeId ??
        formData?.branding?.baseScraper?.[tabId]?.typeId ??
        SCRAPER_TYPE_ID_BY_TAB[tabId] ??
        null,
      scrapperType: job.scrapperType || jobsBySource[tabId]?.scrapperType,
      tabId: tabId || undefined,
    },
    formData,
  );
}

export function collectPendingJobsFromScraperJob(scraperJob = {}, formData = {}) {
  const jobsBySource = scraperJob?.jobsBySource || {};
  return Object.entries(jobsBySource)
    .filter(
      ([, job]) =>
        job?.jobId != null &&
        job.jobId !== "" &&
        isScraperJobActive(job.status),
    )
    .map(([tabId, job]) =>
      enrichPendingJobWithTypeId(
        {
          jobId: job.jobId,
          typeId: job.typeId,
          scrapperType: job.scrapperType,
          tabId,
        },
        formData,
      ),
    );
}

export function getAggregateStatusFromJobsBySource(jobsBySource = {}) {
  const jobs = Object.values(jobsBySource || {});
  if (!jobs.length) return SCRAPER_JOB_STATUS.IDLE;
  return getAggregateScraperJobStatus(
    jobs.map((job) => ({
      status: job?.status,
      jobId: job?.jobId,
      scrapperType: job?.scrapperType,
      result: job?.result,
    })),
  );
}

export function extractScraperJobIdFromResponse(response) {
  const jobs = normalizeScrapperJobsArray(response);
  if (jobs.length) {
    const pending = findPrimaryPendingScrapperJob(jobs);
    if (pending?.jobId != null) return String(pending.jobId);
    const withId = jobs.find((job) => job?.jobId != null && job.jobId !== "");
    if (withId) return String(withId.jobId);
    return "";
  }

  const data = response?.data ?? response;
  if (typeof data === "string" || typeof data === "number") {
    return String(data).trim();
  }
  if (!data || typeof data !== "object") return "";
  return String(data.jobId ?? data.JobId ?? data.job_id ?? "").trim();
}

export function resolveScraperJobPayload(response) {
  return response?.data ?? response ?? {};
}

export function mapApiScraperJobStatus(apiStatus) {
  const status = String(apiStatus ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (["completed", "complete", "success", "succeeded", "done"].includes(status)) {
    return SCRAPER_JOB_STATUS.COMPLETED;
  }
  if (["cancelled", "canceled"].includes(status)) {
    return SCRAPER_JOB_STATUS.CANCELLED;
  }
  if (["failed", "failure", "error"].includes(status)) {
    return SCRAPER_JOB_STATUS.FAILED;
  }
  if (["in_progress", "inprogress", "processing", "running", "active"].includes(status)) {
    return SCRAPER_JOB_STATUS.IN_PROGRESS;
  }
  if (["generating", "pending", "queued", "submitted", "started"].includes(status)) {
    return SCRAPER_JOB_STATUS.GENERATING;
  }
  return SCRAPER_JOB_STATUS.IN_PROGRESS;
}

export function extractScraperJobProgressStageFromPayload(
  payload = {},
  { status, previousStage } = {},
) {
  const raw =
    payload.progressStage ??
    payload.progress_stage ??
    payload.jobStage ??
    payload.job_stage ??
    payload.stage ??
    payload.currentStage ??
    payload.current_stage ??
    "";

  const normalized = String(raw).trim().toLowerCase().replace(/\s+/g, "_");

  if (["queued", "queue", "pending", "submitted", "started", "waiting"].includes(normalized)) {
    return SCRAPER_JOB_PROGRESS_STAGE.QUEUED;
  }
  if (
    [
      "extracting_content",
      "extracting",
      "extract_content",
      "content_extraction",
      "scraping",
      "scrape",
    ].includes(normalized)
  ) {
    return SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT;
  }
  if (
    [
      "generating_branding_data",
      "generating_branding",
      "branding_generation",
      "processing_branding",
      "building_branding",
    ].includes(normalized)
  ) {
    return SCRAPER_JOB_PROGRESS_STAGE.GENERATING_BRANDING_DATA;
  }
  if (["completed", "complete", "success", "succeeded", "done"].includes(normalized)) {
    return SCRAPER_JOB_PROGRESS_STAGE.COMPLETED;
  }
  if (["cancelled", "canceled"].includes(normalized)) {
    return SCRAPER_JOB_PROGRESS_STAGE.CANCELLED;
  }
  if (["failed", "failure", "error"].includes(normalized)) {
    return SCRAPER_JOB_PROGRESS_STAGE.FAILED;
  }

  const mappedStatus =
    status ?? mapApiScraperJobStatus(payload.status ?? payload.jobStatus);

  if (mappedStatus === SCRAPER_JOB_STATUS.COMPLETED) {
    return SCRAPER_JOB_PROGRESS_STAGE.COMPLETED;
  }
  if (mappedStatus === SCRAPER_JOB_STATUS.CANCELLED) {
    return SCRAPER_JOB_PROGRESS_STAGE.CANCELLED;
  }
  if (mappedStatus === SCRAPER_JOB_STATUS.FAILED) {
    if (
      previousStage &&
      SCRAPER_JOB_PIPELINE_STAGES.includes(previousStage)
    ) {
      return previousStage;
    }
    return SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT;
  }
  if (mappedStatus === SCRAPER_JOB_STATUS.GENERATING) {
    return SCRAPER_JOB_PROGRESS_STAGE.QUEUED;
  }
  if (mappedStatus === SCRAPER_JOB_STATUS.IN_PROGRESS) {
    if (
      previousStage &&
      previousStage !== SCRAPER_JOB_PROGRESS_STAGE.QUEUED
    ) {
      return previousStage;
    }
    return SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT;
  }

  return previousStage || SCRAPER_JOB_PROGRESS_STAGE.QUEUED;
}

function resolveSourceStatusDisplay(job = {}) {
  const status = job.status || SCRAPER_JOB_STATUS.GENERATING;

  if (status === SCRAPER_JOB_STATUS.COMPLETED) {
    return {
      state: "completed",
      ...SCRAPER_JOB_PROGRESS_STAGE_META[SCRAPER_JOB_PROGRESS_STAGE.COMPLETED],
    };
  }

  if (status === SCRAPER_JOB_STATUS.FAILED) {
    return {
      state: "failed",
      ...SCRAPER_JOB_PROGRESS_STAGE_META[SCRAPER_JOB_PROGRESS_STAGE.FAILED],
    };
  }

  if (status === SCRAPER_JOB_STATUS.CANCELLED) {
    return {
      state: "cancelled",
      ...SCRAPER_JOB_PROGRESS_STAGE_META[SCRAPER_JOB_PROGRESS_STAGE.CANCELLED],
    };
  }

  return {
    state: "active",
    ...SCRAPER_JOB_PROGRESS_STAGE_META[
      SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT
    ],
  };
}

export function buildScraperJobSourceStatusRows(scraperJob = {}) {
  const { status, jobsBySource = {} } = scraperJob;

  if (!status || status === SCRAPER_JOB_STATUS.IDLE) return [];

  const sourceIds = BASE_SCRAPER_TAB_IDS.filter((id) => jobsBySource[id]);
  const entries = sourceIds.length
    ? sourceIds.map((sourceId) => [sourceId, jobsBySource[sourceId]])
    : [
        [
          scraperJob.defaultSourceType || "source",
          {
            status,
            progressStage: scraperJob.progressStage,
          },
        ],
      ];

  return entries.map(([sourceId, job]) => {
    const display = resolveSourceStatusDisplay(job);
    const jobId = String(
      job?.jobId ??
        (sourceId === scraperJob.defaultSourceType ? scraperJob.jobId : "") ??
        "",
    ).trim();
    return {
      sourceId,
      sourceFallback: BASE_SCRAPER_TAB_LABELS[sourceId] || sourceId,
      state: display.state,
      statusLabelKey: display.labelKey,
      statusFallback: display.fallback,
      customClassName: display.customClassName,
      jobId: jobId || null,
    };
  });
}

export function mergeScraperJobStatusUpdate(
  prevFormData,
  { status, jobId, orderId, defaultSourceType, progressStage, jobsBySource },
) {
  const currentBranding = prevFormData?.branding || {};
  const currentJob = currentBranding.scraperJob || createScraperJobGenerating();
  return {
    ...prevFormData,
    branding: {
      ...currentBranding,
      scraperJob: {
        ...currentJob,
        jobId: jobId || currentJob.jobId,
        orderId: String(orderId ?? currentJob.orderId ?? prevFormData?.orderId ?? ""),
        status,
        progressStage: progressStage ?? currentJob.progressStage,
        defaultSourceType: defaultSourceType ?? currentJob.defaultSourceType,
        jobsBySource: jobsBySource ?? currentJob.jobsBySource ?? {},
      },
    },
  };
}

export function mergeScraperJobCancelled(
  prevFormData,
  { jobId, progressStage, jobsBySource } = {},
) {
  const currentBranding = prevFormData?.branding || {};
  const currentJob = currentBranding.scraperJob || createScraperJobGenerating();
  const nextJobsBySource = jobsBySource ?? currentJob.jobsBySource;
  const aggregateStatus = getAggregateStatusFromJobsBySource(nextJobsBySource);

  return {
    ...prevFormData,
    branding: {
      ...currentBranding,
      scraperJob: {
        ...currentJob,
        jobId: jobId || currentJob.jobId,
        status:
          aggregateStatus === SCRAPER_JOB_STATUS.IDLE
            ? SCRAPER_JOB_STATUS.CANCELLED
            : aggregateStatus,
        progressStage: progressStage ?? currentJob.progressStage,
        jobsBySource: nextJobsBySource,
        canRetry: false,
      },
    },
  };
}

export function mergeScraperJobFailure(
  prevFormData,
  { jobId, progressStage, jobsBySource, canRetry = false, tabId } = {},
) {
  const currentBranding = prevFormData?.branding || {};
  const currentJob = currentBranding.scraperJob || createScraperJobGenerating();
  const nextJobsBySource =
    jobsBySource != null
      ? jobsBySource
      : markFailedJobsBySource(currentJob.jobsBySource, { jobId, tabId });
  const aggregateStatus = getAggregateStatusFromJobsBySource(nextJobsBySource);

  return {
    ...prevFormData,
    branding: {
      ...currentBranding,
      scraperJob: {
        ...currentJob,
        jobId: jobId || currentJob.jobId,
        status:
          aggregateStatus === SCRAPER_JOB_STATUS.IDLE
            ? SCRAPER_JOB_STATUS.FAILED
            : aggregateStatus,
        progressStage:
          progressStage ||
          (SCRAPER_JOB_PIPELINE_STAGES.includes(currentJob.progressStage)
            ? currentJob.progressStage
            : SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT),
        jobsBySource: nextJobsBySource,
        canRetry: Boolean(canRetry),
      },
    },
  };
}

export function mergeScraperJobCompletion(
  prevFormData,
  { resultsBySource = {}, defaultSourceType = "", jobId, options = {}, jobsBySource = {} } = {},
) {
  const availableSources = getAvailableScraperSources(resultsBySource);
  if (!availableSources.length) {
    const prevJobs = prevFormData?.branding?.scraperJob?.jobsBySource;
    return mergeScraperJobFailure(prevFormData, {
      jobId,
      jobsBySource:
        jobsBySource && Object.keys(jobsBySource).length > 0
          ? jobsBySource
          : prevJobs,
    });
  }

  const currentBranding = prevFormData?.branding || {};
  const shouldAutoApply = shouldAutoApplyScrapedBranding(
    currentBranding,
    defaultSourceType,
    resultsBySource,
    options,
  );
  const sectionSources = shouldAutoApply
    ? buildSectionSourcesMap(availableSources, defaultSourceType)
    : { ...(currentBranding.scraperJob?.sectionSources || {}) };

  let nextBranding = {
    ...currentBranding,
    scraperJob: {
      ...(currentBranding.scraperJob || createScraperJobGenerating()),
      jobId: jobId || currentBranding.scraperJob?.jobId,
      orderId: String(prevFormData?.orderId ?? currentBranding.scraperJob?.orderId ?? ""),
      status: SCRAPER_JOB_STATUS.COMPLETED,
      progressStage: SCRAPER_JOB_PROGRESS_STAGE.COMPLETED,
      defaultSourceType,
      availableSources,
      resultsBySource,
      sectionSources,
      jobsBySource: jobsBySource ?? currentBranding.scraperJob?.jobsBySource ?? {},
      autoApplied: shouldAutoApply,
      // Retry is session-only: live poll/generate can offer it. Resume after
      // navigating away must not, because uploaded files are no longer in memory.
      canRetry:
        Boolean(options.canRetryOnFailure) &&
        Object.values(
          jobsBySource ?? currentBranding.scraperJob?.jobsBySource ?? {},
        ).some(
          (job) =>
            mapApiScraperJobStatus(job?.status) === SCRAPER_JOB_STATUS.FAILED,
        ),
    },
  };

  if (shouldAutoApply) {
    const hydrated = applyScrapedSectionsFromSource({
      currentBranding: nextBranding,
      sourceCustomerBranding: resultsBySource[defaultSourceType],
      activeSource: defaultSourceType,
      options,
    });
    nextBranding = {
      ...nextBranding,
      customerBranding: resultsBySource[defaultSourceType],
      sections: hydrated.sections,
      commentsBySection: hydrated.commentsBySection,
      guidelineNotes: hydrated.guidelineNotes,
    };
  }

  return { ...prevFormData, branding: nextBranding };
}

export function handleScrapperJobsArrayResponse(prevFormData, response, options = {}) {
  const { canRetryOnFailure = false, restrictToJobId, restrictToTabId } = options;
  let jobs = normalizeScrapperJobsArray(response);
  if (restrictToJobId || restrictToTabId) {
    jobs = jobs.filter((job) => {
      if (
        restrictToJobId &&
        String(job?.jobId ?? "") === String(restrictToJobId)
      ) {
        return true;
      }
      return Boolean(
        restrictToTabId && resolveTabIdFromScraperJob(job) === restrictToTabId,
      );
    });
  }
  if (!jobs.length) {
    const prevJob = prevFormData?.branding?.scraperJob;
    const pendingJobs = collectPendingJobsFromScraperJob(prevJob, prevFormData);
    const prevJobsBySource = prevJob?.jobsBySource || {};
    if (pendingJobs.length > 0 || Object.keys(prevJobsBySource).length > 1) {
      return {
        nextFormData: prevFormData,
        status: getAggregateStatusFromJobsBySource(prevJobsBySource),
        isTerminal: false,
        primaryPendingJob: pendingJobs[0] || null,
        pendingJobs,
      };
    }
    return {
      nextFormData: mergeScraperJobFailure(prevFormData, { canRetry: canRetryOnFailure }),
      status: SCRAPER_JOB_STATUS.FAILED,
      isTerminal: true,
      primaryPendingJob: null,
      pendingJobs: [],
    };
  }

  const baseScraper = prevFormData?.branding?.baseScraper || {};
  const incomingJobsBySource = buildJobsBySourceFromApiJobs(jobs, baseScraper);
  // Merge so a single-job status payload does not wipe sibling sources
  // (FIGMA/PDF can complete on independent poll cycles).
  const jobsBySource = mergeIncomingJobsBySource(
    prevFormData?.branding?.scraperJob?.jobsBySource || {},
    incomingJobsBySource,
  );
  const aggregateStatus = getAggregateStatusFromJobsBySource(jobsBySource);
  const resultsBySource = {
    ...(prevFormData?.branding?.scraperJob?.resultsBySource || {}),
    ...buildResultsBySourceFromJobs(
      Object.entries(jobsBySource).map(([sourceId, job]) => ({
        scrapperType: job?.scrapperType || mapTabIdToScrapperType(sourceId),
        jobId: job?.jobId,
        status: job?.status,
        result: job?.result,
      })),
    ),
  };
  const defaultSourceType = normalizeDefaultSourceType(
    prevFormData?.branding?.scraperJob?.defaultSourceType ||
      getDefaultScraperTabId(baseScraper),
  );
  const pendingJobs = collectPendingJobsFromScraperJob(
    { jobsBySource },
    prevFormData,
  );
  const primaryPendingJob = pendingJobs[0] || null;
  const primaryJobId = primaryPendingJob?.jobId ?? extractScraperJobIdFromResponse(response);
  const jobForDetailPolling =
    pendingJobs[0] ||
    Object.values(jobsBySource).find((job) => {
      if (job?.jobId == null || job.jobId === "") return false;
      const status = mapApiScraperJobStatus(job.status);
      return (
        status !== SCRAPER_JOB_STATUS.FAILED &&
        status !== SCRAPER_JOB_STATUS.CANCELLED
      );
    }) ||
    null;

  if (aggregateStatus === SCRAPER_JOB_STATUS.COMPLETED && Object.keys(resultsBySource).length > 0) {
    return {
      nextFormData: mergeScraperJobCompletion(prevFormData, {
        resultsBySource,
        defaultSourceType,
        jobId: primaryJobId,
        jobsBySource,
        options,
      }),
      status: SCRAPER_JOB_STATUS.COMPLETED,
      isTerminal: true,
      primaryPendingJob: null,
      pendingJobs: [],
    };
  }

  if (
    aggregateStatus === SCRAPER_JOB_STATUS.COMPLETED &&
    Object.keys(resultsBySource).length === 0 &&
    jobForDetailPolling?.jobId
  ) {
    const extractingJobsBySource =
      markJobsBySourceAsExtracting(jobsBySource);
    const detailPendingJobs = collectPendingJobsFromScraperJob(
      { jobsBySource: extractingJobsBySource },
      prevFormData,
    );

    return {
      nextFormData: mergeScraperJobStatusUpdate(prevFormData, {
        status: SCRAPER_JOB_STATUS.IN_PROGRESS,
        jobId: detailPendingJobs[0]?.jobId || jobForDetailPolling.jobId,
        orderId: prevFormData?.orderId,
        defaultSourceType,
        progressStage: SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT,
        jobsBySource: extractingJobsBySource,
      }),
      status: SCRAPER_JOB_STATUS.IN_PROGRESS,
      isTerminal: false,
      primaryPendingJob: detailPendingJobs[0] || null,
      pendingJobs: detailPendingJobs,
    };
  }

  if (aggregateStatus === SCRAPER_JOB_STATUS.FAILED) {
    const failedJob = Object.values(jobsBySource).find(
      (job) => mapApiScraperJobStatus(job?.status) === SCRAPER_JOB_STATUS.FAILED,
    );
    return {
      nextFormData: mergeScraperJobFailure(prevFormData, {
        jobId: failedJob?.jobId ?? primaryJobId,
        jobsBySource,
        canRetry: canRetryOnFailure,
      }),
      status: pendingJobs.length
        ? SCRAPER_JOB_STATUS.IN_PROGRESS
        : SCRAPER_JOB_STATUS.FAILED,
      isTerminal: pendingJobs.length === 0,
      primaryPendingJob: pendingJobs[0] || null,
      pendingJobs,
    };
  }

  const progressStage = extractScraperJobProgressStageFromPayload(
    (primaryPendingJob?.tabId && jobsBySource[primaryPendingJob.tabId]) ||
      jobs[0] ||
      {},
    {
      status: aggregateStatus,
      previousStage: prevFormData?.branding?.scraperJob?.progressStage,
    },
  );

  const nextFormData = mergeScraperJobStatusUpdate(prevFormData, {
    status: aggregateStatus,
    jobId: primaryJobId,
    orderId: prevFormData?.orderId,
    defaultSourceType,
    progressStage,
    jobsBySource,
  });

  return {
    nextFormData: attachPartialScraperResults(nextFormData, resultsBySource),
    status: aggregateStatus,
    isTerminal: false,
    primaryPendingJob,
    pendingJobs,
  };
}

export function handleScraperJobStatusResponse(prevFormData, response, options = {}) {
  const { canRetryOnFailure = false, restrictToJobId, restrictToTabId } = options;
  const jobs = normalizeScrapperJobsArray(response);
  if (jobs.length) {
    return handleScrapperJobsArrayResponse(prevFormData, response, options);
  }

  const payload = resolveScraperJobPayload(response);
  const status = mapApiScraperJobStatus(payload.status ?? payload.jobStatus);
  const jobId =
    restrictToJobId ||
    extractScraperJobIdFromResponse(response) ||
    payload.jobId ||
    prevFormData?.branding?.scraperJob?.jobId;
  const progressStage = extractScraperJobProgressStageFromPayload(payload, {
    status,
    previousStage: prevFormData?.branding?.scraperJob?.progressStage,
  });
  const defaultSourceType =
    normalizeDefaultSourceType(
      payload.defaultSourceType ||
        prevFormData?.branding?.scraperJob?.defaultSourceType ||
        getDefaultScraperTabId(prevFormData?.branding?.baseScraper || {}),
    );

  const tabId =
    restrictToTabId ||
    resolveTabIdFromScraperJob(payload) ||
    Object.entries(prevFormData?.branding?.scraperJob?.jobsBySource || {}).find(
      ([, job]) => String(job?.jobId ?? "") === String(jobId ?? ""),
    )?.[0] ||
    "";
  const jobsBySource = { ...(prevFormData?.branding?.scraperJob?.jobsBySource || {}) };
  if (tabId) {
    jobsBySource[tabId] = {
      scrapperType:
        payload.scrapperType ||
        jobsBySource[tabId]?.scrapperType ||
        mapTabIdToScrapperType(tabId),
      jobId: payload.jobId ?? jobId,
      status,
      progressStage,
      typeId:
        normalizeScraperTypeId(payload.typeId) ??
        normalizeScraperTypeId(jobsBySource[tabId]?.typeId) ??
        normalizeScraperTypeId(prevFormData?.branding?.baseScraper?.[tabId]?.typeId) ??
        SCRAPER_TYPE_ID_BY_TAB[tabId] ??
        null,
      result: payload.result ?? jobsBySource[tabId]?.result ?? {},
    };
  }

  const aggregateStatus = getAggregateStatusFromJobsBySource(jobsBySource);
  const extractedResults = extractScraperResultsBySource(response);
  const resultsBySource = {
    ...(prevFormData?.branding?.scraperJob?.resultsBySource || {}),
    ...extractedResults,
    ...buildResultsBySourceFromJobs(
      Object.entries(jobsBySource).map(([sourceId, job]) => ({
        scrapperType: job.scrapperType || mapTabIdToScrapperType(sourceId),
        jobId: job.jobId,
        status: job.status,
        result: job.result,
      })),
    ),
  };
  const pendingJobs = collectPendingJobsFromScraperJob(
    { jobsBySource },
    prevFormData,
  );

  if (aggregateStatus === SCRAPER_JOB_STATUS.COMPLETED) {
    if (Object.keys(resultsBySource).length === 0 && jobId) {
      const extractingJobsBySource =
        markJobsBySourceAsExtracting(jobsBySource);
      const detailPendingJobs = collectPendingJobsFromScraperJob(
        { jobsBySource: extractingJobsBySource },
        prevFormData,
      );
      const fallbackPendingJob = buildPendingJobTarget(
        {
          jobId,
          scrapperType: payload.scrapperType || mapTabIdToScrapperType(tabId),
          tabId: tabId || defaultSourceType,
          typeId: extractingJobsBySource[tabId]?.typeId,
        },
        extractingJobsBySource,
        prevFormData,
      );
      const nextPendingJobs =
        detailPendingJobs.length > 0
          ? detailPendingJobs
          : fallbackPendingJob?.jobId
            ? [fallbackPendingJob]
            : [];
      return {
        nextFormData: mergeScraperJobStatusUpdate(prevFormData, {
          status: SCRAPER_JOB_STATUS.IN_PROGRESS,
          jobId,
          orderId: prevFormData?.orderId,
          defaultSourceType,
          progressStage: SCRAPER_JOB_PROGRESS_STAGE.EXTRACTING_CONTENT,
          jobsBySource: extractingJobsBySource,
        }),
        status: SCRAPER_JOB_STATUS.IN_PROGRESS,
        isTerminal: false,
        primaryPendingJob: nextPendingJobs[0] || null,
        pendingJobs: nextPendingJobs,
      };
    }

    return {
      nextFormData: mergeScraperJobCompletion(prevFormData, {
        resultsBySource,
        defaultSourceType,
        jobId,
        jobsBySource,
        options,
      }),
      status: SCRAPER_JOB_STATUS.COMPLETED,
      isTerminal: true,
      primaryPendingJob: null,
      pendingJobs: [],
    };
  }

  if (aggregateStatus === SCRAPER_JOB_STATUS.FAILED) {
    return {
      nextFormData: mergeScraperJobFailure(prevFormData, {
        jobId,
        progressStage,
        jobsBySource,
        canRetry: canRetryOnFailure,
      }),
      status: pendingJobs.length
        ? SCRAPER_JOB_STATUS.IN_PROGRESS
        : SCRAPER_JOB_STATUS.FAILED,
      isTerminal: pendingJobs.length === 0,
      primaryPendingJob: pendingJobs[0] || null,
      pendingJobs,
    };
  }

  // One source finished while others are still running — keep polling.
  const nextFormData = mergeScraperJobStatusUpdate(prevFormData, {
    status: aggregateStatus,
    jobId: pendingJobs[0]?.jobId || jobId,
    orderId: prevFormData?.orderId,
    defaultSourceType,
    progressStage:
      (pendingJobs[0]?.tabId &&
        jobsBySource[pendingJobs[0].tabId]?.progressStage) ||
      progressStage,
    jobsBySource,
  });

  return {
    nextFormData: attachPartialScraperResults(nextFormData, resultsBySource),
    status: aggregateStatus,
    isTerminal: false,
    primaryPendingJob: pendingJobs[0] || null,
    pendingJobs,
  };
}

export function buildSectionSourcesMap(availableSources = [], defaultSource = "") {
  const resolvedDefault =
    defaultSource && availableSources.includes(defaultSource)
      ? defaultSource
      : availableSources[0] || "";
  if (!resolvedDefault) return {};

  return BRANDING_SECTION_IDS.reduce((acc, sectionId) => {
    acc[sectionId] = resolvedDefault;
    return acc;
  }, {});
}

export function applyScrapedSectionsFromSource({
  currentBranding = {},
  sourceCustomerBranding,
  sectionIds = BRANDING_SECTION_IDS,
  activeSource = "",
  options = {},
}) {
  if (!sourceCustomerBranding) {
    return buildBrandingPayload(currentBranding, options);
  }

  const mapped = mapApiCustomerBrandingToSections(
    sourceCustomerBranding,
    options.languageList || [],
  );
  const currentPayload = buildBrandingPayload(currentBranding, options);
  const nextSections = { ...currentPayload.sections };
  const normalizedActiveSource =
    mapTabIdToScrapperType(activeSource) ||
    String(activeSource ?? "").trim().toUpperCase();

  sectionIds.forEach((sectionId) => {
    const scraped = mapped.sections?.[sectionId];
    if (!scraped) return;
    const nextFields = {
      ...(nextSections[sectionId]?.fields || {}),
      ...(scraped.fields || {}),
    };
    nextSections[sectionId] = normalizeSectionFields(sectionId, {
      ...nextSections[sectionId],
      activeSource: normalizedActiveSource,
      fields: nextFields,
      notes: scraped.notes ?? nextSections[sectionId]?.notes ?? "",
      apiSectionId: scraped.apiSectionId ?? nextSections[sectionId]?.apiSectionId,
      attachments: scraped.attachments ?? nextSections[sectionId]?.attachments,
      alternatives:
        scraped.alternatives != null
          ? scraped.alternatives
          : nextSections[sectionId]?.alternatives,
      imageReference:
        scraped.imageReference !== undefined
          ? scraped.imageReference
          : nextSections[sectionId]?.imageReference,
      extractedPrimary: { ...(scraped.fields || {}) },
    });
  });

  return {
    ...currentPayload,
    sections: nextSections,
  };
}

export function isScraperJobActive(status) {
  return ACTIVE_SCRAPER_JOB_STATUSES.includes(status);
}

export function applyScrapedBrandingToFormData(prevFormData, customerBranding, options = {}) {
  const currentBranding = prevFormData?.branding || {};
  const hydrated = buildBrandingPayload(
    {
      ...currentBranding,
      customerBranding,
    },
    options,
  );

  return {
    ...prevFormData,
    branding: {
      ...currentBranding,
      customerBranding,
      sections: hydrated.sections,
      commentsBySection: hydrated.commentsBySection,
      guidelineNotes: hydrated.guidelineNotes,
      v2PendingAttachments: currentBranding.v2PendingAttachments || {},
      v2DeletedAttachmentIds: currentBranding.v2DeletedAttachmentIds || [],
    },
  };
}

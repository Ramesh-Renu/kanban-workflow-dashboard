/** Branding Guidelines v2 — attachments & customer branding */

import {
  BRANDING_API_TO_UI_SECTION,
  BRANDING_CUSTOMER_BRANDING_KEY,
  BRANDING_FRESH_SECTION_ID,
  BRANDING_NAV_SECTION_IDS,
  BRANDING_NOTES_SECTION_ID,
  BRANDING_SECTION_IDS,
  BRANDING_UI_TO_API_SECTION,
} from "./constants.js";

export function resolveBrandingSectionIdMap(rawBranding = {}) {
  const map =
    rawBranding?.sectionIds ??
    rawBranding?.brandingSectionIds ??
    rawBranding?.sectionIdMap;
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  return map;
}

export function extractApiSectionIdFromPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const id = data.section_id ?? data.sectionId ?? data.SectionId ?? data.sectionID;
  if (id == null || String(id).trim() === "") return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) ? numeric : id;
}

/**
 * section_id for save/attachments: use value from GET (stored on section), else 0 (fresh save).
 */
export function resolveApiSectionId(uiSectionId, sections = {}) {
  const stored = sections?.[uiSectionId]?.apiSectionId;
  if (stored != null && String(stored).trim() !== "") {
    const numeric = Number(stored);
    return Number.isFinite(numeric) ? numeric : stored;
  }
  return BRANDING_FRESH_SECTION_ID;
}

/** UI sections that support file attachments in the edit form */
export const BRANDING_SECTIONS_WITH_ATTACHMENTS = [
  "typography",
  "colorScheme",
  "buttons",
  "tabs",
  "tables",
  "inputFields",
  "checkbox",
  "radioButtons",
  "dropDown",
  "exportIcons",
];

/** Sections that render attachments inline on field rows (not in a footer block). */
export const BRANDING_SECTIONS_WITH_INLINE_ATTACHMENTS = ["exportIcons"];

export function brandingSectionUsesInlineAttachments(sectionId) {
  return BRANDING_SECTIONS_WITH_INLINE_ATTACHMENTS.includes(sectionId);
}

/** Maps UI section id to API section_id used for attachment list fetch */
export function getBrandingSectionApiId(uiSectionId, sections = {}) {
  return resolveApiSectionId(uiSectionId, sections);
}

/** Filters attachment list response to the active branding section */
export function filterAttachmentsForSection(files, uiSectionId, sections = {}) {
  if (!Array.isArray(files)) return [];
  const apiSectionId = getBrandingSectionApiId(uiSectionId, sections);
  const hasSectionTags = files.some((item) => {
    const s = item?.sectionId ?? item?.section_id ?? item?.SectionId ?? item?.sectionID;
    return s != null && String(s).trim() !== "";
  });
  if (!hasSectionTags) return files;
  return files.filter((item) => {
    const itemSection =
      item?.sectionId ?? item?.section_id ?? item?.SectionId ?? item?.sectionID;
    return (
      String(itemSection) === String(apiSectionId) ||
      String(itemSection) === String(uiSectionId)
    );
  });
}

/**
 * Resolves attachments for a section. When the list API was called with SectionId,
 * the response is already scoped — use trustServerScoped so items are not dropped
 * if local apiSectionId mapping is briefly out of sync.
 */
export function resolveAttachmentsForBrandingSection(
  rawFiles,
  uiSectionId,
  sections = {},
  { trustServerScoped = false } = {}
) {
  const raw = Array.isArray(rawFiles) ? rawFiles : [];
  if (!raw.length) return [];
  const filtered = filterAttachmentsForSection(raw, uiSectionId, sections);
  if (filtered.length > 0) return filtered;
  if (trustServerScoped) return raw;
  return [];
}

/**
 * Section ids for ticket read-only nav: field data, notes, feedback, or attachments.
 */
export function getBrandingReadOnlySectionIds(
  brandingInfo,
  previewSections = [],
  sectionAttachmentsBySection = {}
) {
  const ids = new Set(previewSections.map((s) => s.sectionId));
  const sections = brandingInfo?.sections || {};

  BRANDING_SECTION_IDS.forEach((sectionId) => {
    const feedback = brandingInfo?.commentsBySection?.[sectionId];
    if (Array.isArray(feedback) && feedback.length > 0) {
      ids.add(sectionId);
    }

    if ((sectionAttachmentsBySection[sectionId]?.length ?? 0) > 0) {
      ids.add(sectionId);
    }

    const meta = sections[sectionId];
    if (Array.isArray(meta?.attachments) && meta.attachments.length > 0) {
      ids.add(sectionId);
    }

    if (hasUsableApiSectionId(meta)) {
      ids.add(sectionId);
    }
  });

  // Notes nav only when centralized guideline notes exist (empty shell ≠ content).
  if (String(brandingInfo?.guidelineNotes ?? "").trim()) {
    ids.add(BRANDING_NOTES_SECTION_ID);
  }

  const ordered = BRANDING_SECTION_IDS.filter((id) => ids.has(id));
  if (ids.has(BRANDING_NOTES_SECTION_ID)) {
    ordered.push(BRANDING_NOTES_SECTION_ID);
  }
  return ordered;
}

function sectionNotesFromSection(sections, sectionId) {
  return String(sections?.[sectionId]?.notes ?? "").trim();
}

function readGuidelineNotesValue(source) {
  if (!source || typeof source !== "object") return "";
  const candidates = [
    source.guidelineNotes,
    source.GuidelineNotes,
    source.guideline_notes,
    source.Guideline_Notes,
  ];
  for (const value of candidates) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

/** Reads centralized notes from ticket branding (root or customerBranding). */
export function resolveGuidelineNotesFromRawBranding(rawBranding = {}) {
  const fromRoot = readGuidelineNotesValue(rawBranding);
  if (fromRoot) return fromRoot;

  const customerBranding = resolveCustomerBranding(rawBranding);
  if (!customerBranding) return "";

  if (Array.isArray(customerBranding)) {
    for (const entry of customerBranding) {
      const fromEntry = readGuidelineNotesValue(entry);
      if (fromEntry) return fromEntry;
    }
    return "";
  }

  return readGuidelineNotesValue(customerBranding);
}

/** Centralized branding guideline notes (single source of truth). */
export function getBrandingGuidelineNotes(branding = {}) {
  return String(branding.guidelineNotes ?? "").trim();
}

export function stripSectionNotesFromSections(sections = {}) {
  const out = { ...sections };
  BRANDING_SECTION_IDS.forEach((id) => {
    if (!out[id] || typeof out[id] !== "object") return;
    out[id] = { ...out[id], notes: "" };
  });
  return out;
}

/** @deprecated Use section.notes string; kept for migration from commentsBySection */
function sectionNotesFromComments(commentsBySection, sectionId) {
  const fromSection = sectionNotesFromSection(commentsBySection, sectionId);
  if (fromSection) return fromSection;
  const list = commentsBySection?.[sectionId];
  if (!Array.isArray(list) || list.length === 0) return "";
  return String(list[0]?.message ?? "").trim();
}

/** Reads v2 branding from ticket/API. */
export function resolveCustomerBranding(rawBranding = {}) {
  const data = rawBranding?.[BRANDING_CUSTOMER_BRANDING_KEY];
  return data == null ? null : data;
}

const CUSTOMER_BRANDING_META_KEYS = new Set([
  "section_id",
  "sectionId",
  "SectionId",
  "sectionID",
  "notes",
  "feedbackCount",
  "attachments",
]);

function customerBrandingSectionHasPayload(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== "object") return String(value).trim().length > 0;

  const keys = Object.keys(value).filter((k) => !CUSTOMER_BRANDING_META_KEYS.has(k));
  if (keys.length === 0) return false;

  return keys.some((key) => {
    const entry = value[key];
    if (entry == null) return false;
    if (typeof entry === "string") return entry.trim().length > 0;
    if (typeof entry === "number" || typeof entry === "boolean") {
      if (key === "configMethodType") return false;
      return true;
    }
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === "object") return customerBrandingSectionHasPayload(entry);
    return true;
  });
}

/** True when customerBranding contains at least one non-null section object (not an empty shell). */
export function customerBrandingHasSectionData(customerBranding) {
  if (customerBranding == null) return false;
  const flow = normalizeCustomerBrandingInput(customerBranding);
  return Object.keys(BRANDING_API_TO_UI_SECTION).some((apiKey) =>
    customerBrandingSectionHasPayload(flow[apiKey])
  );
}

/** @alias customerBrandingHasSectionData */
export function customerBrandingHasData(customerBranding) {
  return customerBrandingHasSectionData(customerBranding);
}

/** True when GET returned a real section_id (not 0 / missing — fresh save placeholder). */
export function hasUsableApiSectionId(section) {
  if (!section || typeof section !== "object") return false;
  const id = section.apiSectionId;
  if (id == null || String(id).trim() === "") return false;
  const numeric = Number(id);
  if (Number.isFinite(numeric) && numeric === BRANDING_FRESH_SECTION_ID) {
    return false;
  }
  return true;
}

/** Only call attachment list API when this section was persisted on the ticket. */
export function shouldFetchBrandingSectionAttachments(uiSectionId, sections = {}) {
  return hasUsableApiSectionId(sections?.[uiSectionId]);
}

function apiKeyFromSectionPayloadItem(item) {
  if (!item || typeof item !== "object") return null;

  const sectionKey = item.sectionKey ?? item.sectionType ?? item.sectionName;
  if (sectionKey != null && String(sectionKey).trim() !== "") {
    const key = String(sectionKey).trim();
    if (BRANDING_API_TO_UI_SECTION[key]) return key;
    if (BRANDING_UI_TO_API_SECTION[key]) return BRANDING_UI_TO_API_SECTION[key];
    if (BRANDING_SECTION_IDS.includes(key)) {
      return BRANDING_UI_TO_API_SECTION[key] || key;
    }
  }

  return (
    Object.keys(BRANDING_API_TO_UI_SECTION).find((k) => item[k] != null) || null
  );
}

export function normalizeCustomerBrandingInput(customerBranding) {
  if (!customerBranding) return {};
  if (Array.isArray(customerBranding)) {
    if (customerBranding.length === 0) return {};
    const first = customerBranding[0];
    if (first && typeof first === "object") {
      if (first.typography || first.colors || first.buttons || first.tabs) {
        return first;
      }
      const byKey = {};
      customerBranding.forEach((item) => {
        const apiKey = apiKeyFromSectionPayloadItem(item);
        if (apiKey) byKey[apiKey] = item;
      });
      return byKey;
    }
    return {};
  }
  if (typeof customerBranding === "object") return customerBranding;
  return {};
}

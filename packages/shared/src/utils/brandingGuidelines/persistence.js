/** Branding Guidelines v2 — persistence, legacy & validation */

import {
  BRANDING_API_TO_UI_SECTION,
  BRANDING_ATTACHMENT_FORM_KEYS,
  BRANDING_REQUIRED_FIELDS,
  BRANDING_SECTION_IDS,
  LEGACY_BRANDING_KEYS,
  mapBrandingUiSectionToApiKey,
} from "./constants.js";
import {
  BRANDING_SECTIONS_WITH_ATTACHMENTS,
  customerBrandingHasSectionData,
  resolveCustomerBranding,
  resolveGuidelineNotesFromRawBranding,
  stripSectionNotesFromSections,
} from "./attachments.js";
import { mapApiCustomerBrandingToSections, mapSectionsToApiPayload, colorFromArray } from "./api.js";
import {
  coerceIsCustomFont,
  mergeDefaultSections,
  normalizeColorSchemeFields,
  normalizeExportIconEntries,
  getCompleteExportIconEntries,
  getExportIconValidationErrors,
  normalizeSectionFields,
  normalizeTypographyFields,
  normalizeTypographyFontNames,
  buildTypographyFontMultipartEntries,
  TYPOGRAPHY_FONTS_MULTIPART_KEY,
  normalizeBrandingColorList,
  remapTypographyLanguagesToIds,
} from "./sections.js";
import { isCompleteHexColor } from "./inputUtils.js";

export function extractLegacyBrandingForUpdateTicket(branding = {}) {
  if (!branding || typeof branding !== "object") {
    return {
      primaryColor: "",
      secondaryColor: "",
      fontFamily: [],
      fontColor: "",
      fontSize: "",
      designLink: "",
      otherData: [],
      notes: "",
    };
  }
  const out = {};
  LEGACY_BRANDING_KEYS.forEach((key) => {
    if (branding[key] !== undefined) out[key] = branding[key];
  });
  if (out.otherData === undefined) out.otherData = [];
  if (out.fontFamily === undefined) out.fontFamily = [];
  return out;
}

/**
 * True when older flat branding fields have saved values (pre-v2 tickets).
 * Intentionally ignores designLink — it is still used on V2 tickets at the root.
 */
export function legacyFlatBrandingHasContent(branding = {}) {
  if (!branding || typeof branding !== "object") return false;

  const hasText = (value) => String(value ?? "").trim().length > 0;

  if (hasText(branding.primaryColor)) return true;
  if (hasText(branding.secondaryColor)) return true;
  if (hasText(branding.fontColor)) return true;
  if (hasText(branding.fontSize)) return true;
  if (hasText(branding.notes)) return true;
  if (Array.isArray(branding.fontFamily) && branding.fontFamily.length > 0) return true;
  if (Array.isArray(branding.otherData) && branding.otherData.length > 0) return true;

  return false;
}

export function brandingUsesV2Editor(branding = {}) {
  if (!branding || typeof branding !== "object") return false;
  if (resolveGuidelineNotesFromRawBranding(branding)) return true;
  if (customerBrandingHasSectionData(resolveCustomerBranding(branding))) return true;
  if (branding.v2PendingAttachments != null) return true;
  return !legacyFlatBrandingHasContent(branding);
}

/**
 * Legacy branding for update-ticket only. V2 edits are saved via update-branding-guidelines.
 * Omits branding payload when the active save is the Branding tab (type Branding).
 */
export function resolveBrandingForUpdateTicket({
  branding,
  baselineBranding,
  updateType,
} = {}) {
  if (updateType === "Branding") {
    return undefined;
  }
  const base = baselineBranding ?? branding;
  if (brandingUsesV2Editor(branding)) {
    return extractLegacyBrandingForUpdateTicket(base);
  }
  return extractLegacyBrandingForUpdateTicket(branding);
}

/** API `deleted_attachments` — comma-separated attachment ids (string, never an array). */
export function formatDeletedAttachmentsForApi(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .join(",");
  }
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).join(",");
  }
  const single = String(value).trim();
  return single;
}

/** Parses API/form `deleted_attachments` string (or legacy array) into id list for UI state. */
export function parseDeletedAttachmentsFromApi(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(",").map((id) => id.trim()).filter(Boolean);
  }
  const single = String(value).trim();
  return single ? [single] : [];
}

export function buildBrandingGuidelinesFormData({
  orderId,
  sections,
  languageList = [],
  fontFamilyList = [],
  pendingAttachments = {},
  pendingTypographyFontFiles = {},
  typographySectionAttachments = [],
  deletedAttachmentIds = [],
  deleted_attachments,
  deletedFontBlobNames = [],
  deleted_fonts,
  guidelineNotes = "",
  changedSectionIds = null,
  guidelineNotesChanged = false,
}) {
  const typographyFields = sections?.typography?.fields || {};
  const typographyFontEntries = buildTypographyFontMultipartEntries({
    typographyFields,
    pendingTypographyFontFiles,
    languageList,
  });

  const apiPayload = mapSectionsToApiPayload(sections, {
    languageList,
    fontFamilyList,
    guidelineNotes,
    deletedAttachmentIds,
    pendingTypographyFontFiles,
    typographySectionAttachments,
  });
  const fd = new FormData();
  fd.append("ticketId", String(orderId));

  const changedApiKeys = buildBrandingChangedSectionsApiKeys({
    changedSectionIds,
    guidelineNotesChanged,
  });
  fd.append("changedSections", JSON.stringify(changedApiKeys));

  Object.entries(apiPayload).forEach(([key, value]) => {
    if (key === "guidelineNotes") {
      fd.append(key, typeof value === "string" ? value : "");
      return;
    }
    fd.append(key, JSON.stringify(value));
  });

  const deletedAttachmentsStr = formatDeletedAttachmentsForApi(
    deleted_attachments ?? deletedAttachmentIds
  );
  fd.append("deleted_attachments", deletedAttachmentsStr);

  const deletedFontsStr = formatDeletedAttachmentsForApi(
    deleted_fonts ?? deletedFontBlobNames
  );
  fd.append("deleted_fonts", deletedFontsStr);

  Object.entries(BRANDING_ATTACHMENT_FORM_KEYS).forEach(([apiSectionKey, formKey]) => {
    const uiId = BRANDING_API_TO_UI_SECTION[apiSectionKey] || apiSectionKey;
    if (uiId === "exportIcons") {
      const entries = getCompleteExportIconEntries(sections?.exportIcons?.fields || {}, {
        deletedAttachmentIds,
      });
      entries.forEach((entry) => {
        if (entry.pendingFile instanceof File) {
          fd.append(formKey, entry.pendingFile);
        }
      });
      return;
    }
    const files =
      pendingAttachments[uiId] ||
      pendingAttachments[apiSectionKey] ||
      [];
    if (Array.isArray(files)) {
      files.forEach((file) => {
        if (file instanceof File) fd.append(formKey, file);
      });
    }
  });

  typographyFontEntries.forEach((entry) => {
    if (entry.file instanceof File) {
      fd.append(TYPOGRAPHY_FONTS_MULTIPART_KEY, entry.file);
    }
  });

  return fd;
}

function serializeSectionsForSnapshot(sections = {}) {
  const out = {};
  BRANDING_SECTION_IDS.forEach((id) => {
    const sec = sections[id];
    if (!sec || typeof sec !== "object") return;
    if (id === "exportIcons") {
      out[id] = {
        ...sec,
        fields: {
          exportIconEntries: serializeExportIconsForDirtyCompare(sec.fields || {}),
        },
      };
      return;
    }
    if (id === "colorScheme") {
      const fields = normalizeColorSchemeFields(sec.fields || {});
      out[id] = {
        ...sec,
        fields: {
          primaryColor: fields.primaryColor,
          secondaryColor: fields.secondaryColor,
        },
      };
      return;
    }
    out[id] = sec;
  });
  return out;
}

export function getBrandingV2Snapshot(brandingState = {}) {
  return JSON.stringify({
    sections: serializeSectionsForSnapshot(brandingState.sections || {}),
    commentsBySection: brandingState.commentsBySection || {},
    guidelineNotes: brandingState.guidelineNotes ?? "",
    pendingAttachments: brandingState.pendingAttachments || {},
    pendingTypographyFontFiles: serializePendingTypographyFontFilesForSnapshot(
      brandingState.pendingTypographyFontFiles || {}
    ),
    deletedAttachmentIds: brandingState.deletedAttachmentIds || [],
    deletedFontBlobNames: brandingState.deletedFontBlobNames || [],
    existingAttachments: brandingState.existingAttachments || {},
  });
}

export function isBrandingV2Dirty(current, baseline) {
  return getBrandingV2Snapshot(current) !== getBrandingV2Snapshot(baseline);
}

function serializePendingAttachmentsForSnapshot(pendingAttachments = {}) {
  const out = {};
  BRANDING_SECTION_IDS.forEach((id) => {
    const files = pendingAttachments[id] || [];
    out[id] = files
      .map((file) => (file instanceof File ? file.name : file?.name ?? null))
      .filter(Boolean);
  });
  return out;
}

function serializePendingTypographyFontFilesForSnapshot(pendingTypographyFontFiles = {}) {
  const out = {};
  Object.entries(pendingTypographyFontFiles || {}).forEach(([languageId, file]) => {
    if (file instanceof File) {
      out[languageId] = file.name;
    }
  });
  return out;
}

function normalizeIdListForCompare(ids = []) {
  return [...ids].map(String).filter(Boolean).sort();
}

function brandingIdListsEqual(a = [], b = []) {
  const left = normalizeIdListForCompare(a);
  const right = normalizeIdListForCompare(b);
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

function serializeBrandingSectionSlice(sectionId, sections = {}) {
  return serializeSectionsForSnapshot({ [sectionId]: sections[sectionId] })[sectionId] ?? null;
}

function serializeExportIconsForDirtyCompare(fields = {}) {
  const entries = normalizeExportIconEntries(fields || {});
  return entries.map((entry) => ({
    iconName: String(entry.iconName || "").trim(),
    pendingFileName: entry.pendingFile?.name ?? null,
  }));
}

function serializeBrandingSectionForDirtyCompare(sectionId, sections = {}) {
  const sec = sections[sectionId];
  if (!sec || typeof sec !== "object") {
    if (sectionId === "exportIcons") return serializeExportIconsForDirtyCompare({});
    return null;
  }
  if (sectionId === "exportIcons") {
    return serializeExportIconsForDirtyCompare(sec.fields || {});
  }
  return serializeBrandingSectionSlice(sectionId, sections);
}

function isBrandingUiSectionDataDirty(sectionId, current, baseline) {
  const currentSection = serializeBrandingSectionForDirtyCompare(sectionId, current.sections);
  const baselineSection = serializeBrandingSectionForDirtyCompare(sectionId, baseline.sections);
  if (JSON.stringify(currentSection) !== JSON.stringify(baselineSection)) return true;
  const currentPending =
    serializePendingAttachmentsForSnapshot(current.pendingAttachments || {})[sectionId] || [];
  const baselinePending =
    serializePendingAttachmentsForSnapshot(baseline.pendingAttachments || {})[sectionId] || [];
  if (JSON.stringify(currentPending) !== JSON.stringify(baselinePending)) return true;
  if (sectionId === "typography") {
    const currentFontFiles = serializePendingTypographyFontFilesForSnapshot(
      current.pendingTypographyFontFiles || {}
    );
    const baselineFontFiles = serializePendingTypographyFontFilesForSnapshot(
      baseline.pendingTypographyFontFiles || {}
    );
    if (JSON.stringify(currentFontFiles) !== JSON.stringify(baselineFontFiles)) return true;
  }
  return false;
}

function resolveSectionsForDeletedAttachments(
  deletedAttachmentIds = [],
  sectionAttachmentsBySection = {}
) {
  const deletedSet = new Set(deletedAttachmentIds.map(String));
  if (deletedSet.size === 0) return [];
  const sections = new Set();
  Object.entries(sectionAttachmentsBySection || {}).forEach(([sectionId, attachments]) => {
    if (!BRANDING_SECTION_IDS.includes(sectionId)) return;
    const hasDeleted = (attachments || []).some((attachment) => {
      const attachmentId = attachment?.attachmentId ?? attachment?.id ?? attachment?.attachment_id;
      return attachmentId != null && deletedSet.has(String(attachmentId));
    });
    if (hasDeleted) sections.add(sectionId);
  });
  if (sections.size === 0) {
    BRANDING_SECTIONS_WITH_ATTACHMENTS.forEach((sectionId) => sections.add(sectionId));
  }
  return [...sections];
}

/**
 * UI section ids whose guideline data, pending uploads, or attachment deletions changed.
 * Excludes feedback (`commentsBySection`).
 */
export function getBrandingV2ChangedSections(current, baseline, options = {}) {
  const changed = new Set();
  const { sectionAttachmentsBySection = {} } = options;
  BRANDING_SECTION_IDS.forEach((sectionId) => {
    if (isBrandingUiSectionDataDirty(sectionId, current, baseline)) {
      changed.add(sectionId);
    }
  });
  if (!brandingIdListsEqual(current.deletedAttachmentIds, baseline.deletedAttachmentIds)) {
    resolveSectionsForDeletedAttachments(
      current.deletedAttachmentIds,
      sectionAttachmentsBySection
    ).forEach((sectionId) => changed.add(sectionId));
  }
  if (!brandingIdListsEqual(current.deletedFontBlobNames, baseline.deletedFontBlobNames)) {
    changed.add("typography");
  }
  return [...changed];
}

export function isBrandingGuidelineNotesDirty(current, baseline) {
  return (current.guidelineNotes ?? "") !== (baseline.guidelineNotes ?? "");
}

/** True when section data, notes, attachments, or deletions changed (not feedback). */
export function isBrandingGuidelinesDirty(current, baseline, options = {}) {
  if (isBrandingGuidelineNotesDirty(current, baseline)) return true;
  return getBrandingV2ChangedSections(current, baseline, options).length > 0;
}

/** API `changedSections` payload keys for addupdatecustomerbranding. */
export function buildBrandingChangedSectionsApiKeys({
  changedSectionIds = null,
  guidelineNotesChanged = false,
} = {}) {
  const keys = (changedSectionIds ?? BRANDING_SECTION_IDS).map(mapBrandingUiSectionToApiKey);
  if (guidelineNotesChanged) keys.push("guidelineNotes");
  return [...new Set(keys.filter(Boolean))];
}

export function getBrandingGuidelinesSnapshot(brandingState = {}) {
  return JSON.stringify({
    sections: serializeSectionsForSnapshot(brandingState.sections || {}),
    guidelineNotes: brandingState.guidelineNotes ?? "",
    pendingAttachments: serializePendingAttachmentsForSnapshot(brandingState.pendingAttachments || {}),
    deletedAttachmentIds: brandingState.deletedAttachmentIds || [],
    deletedFontBlobNames: brandingState.deletedFontBlobNames || [],
  });
}

function resolveStoredApiSectionId(uiSectionId, sectionState) {
  const fromSection = sectionState?.apiSectionId;
  if (fromSection == null || String(fromSection).trim() === "") return undefined;
  return fromSection;
}

function hasFieldValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function brandingColorListHasValue(value) {
  if (Array.isArray(value)) {
    return value.some((c) => isCompleteHexColor(c));
  }
  return isCompleteHexColor(value);
}

/** True when a language has a staged or saved typography font file upload. */
function languageHasTypographyFontUpload(
  langId,
  typographyFields = {},
  pendingTypographyFontFiles = {},
  deletedFontBlobNames = []
) {
  const langKey = String(langId ?? "").trim();
  if (!langKey) return false;

  const pending =
    pendingTypographyFontFiles[langKey] ?? pendingTypographyFontFiles[langId];
  if (pending instanceof File) return true;

  const embedded =
    typographyFields?.fontFilesByLanguage?.[langKey] ??
    typographyFields?.fontFilesByLanguage?.[langId];
  if (!embedded || typeof embedded !== "object") return false;

  const blobName = String(embedded.blobName ?? embedded.blob_name ?? "").trim();
  const deletedSet = new Set((deletedFontBlobNames || []).map(String).filter(Boolean));
  if (blobName && deletedSet.has(blobName)) return false;

  const fileName = String(embedded.fileName ?? embedded.file_name ?? "").trim();
  return Boolean(blobName || fileName);
}

function legacyFontFamilyToTypography(fontFamily = []) {
  if (!Array.isArray(fontFamily) || fontFamily.length === 0) {
    return { languages: [], fontStylesByLanguage: {}, isCustomFontByLanguage: {} };
  }
  const languages = [];
  const fontStylesByLanguage = {};
  const isCustomFontByLanguage = {};

  fontFamily.forEach((entry, index) => {
    if (entry == null) return;
    if (typeof entry === "string") {
      const langId = `legacy-${index}`;
      languages.push(langId);
      fontStylesByLanguage[langId] = entry;
      return;
    }
    if (typeof entry === "object") {
      const langId =
        entry.languageId ??
        entry.language_id ??
        entry.langId ??
        `legacy-${index}`;
      const fontName = String(
        entry.fontFamily ?? entry.font_name ?? entry.name ?? entry.font_id ?? entry.fontId ?? ""
      ).trim();
      if (fontName) {
        const langKey = String(langId);
        languages.push(langKey);
        fontStylesByLanguage[langKey] = fontName;
        if (entry.isCustomFont !== undefined || entry.is_customfont !== undefined) {
          isCustomFontByLanguage[langKey] = coerceIsCustomFont(
            entry.isCustomFont ?? entry.is_customfont
          );
        }
      }
    }
  });

  return { languages, fontStylesByLanguage, isCustomFontByLanguage };
}

/**
 * Hydrates v2 section fields from legacy flat branding (older tickets).
 * Only fills fields that are still empty so customerBranding wins when present.
 */
export function applyLegacyFlatBrandingToSections(sections = {}, rawBranding = {}) {
  if (!rawBranding || typeof rawBranding !== "object") return sections;

  const next = { ...sections };
  const typo = normalizeTypographyFields({
    ...(next.typography?.fields || {}),
  });
  const colors = { ...(next.colorScheme?.fields || {}) };

  if (rawBranding.primaryColor && !brandingColorListHasValue(colors.primaryColor)) {
    colors.primaryColor = normalizeBrandingColorList(rawBranding.primaryColor);
  }
  if (rawBranding.secondaryColor && !brandingColorListHasValue(colors.secondaryColor)) {
    colors.secondaryColor = normalizeBrandingColorList(rawBranding.secondaryColor);
  }
  if (rawBranding.fontSize && !hasFieldValue(typo.bodyFontSize)) {
    typo.bodyFontSize = rawBranding.fontSize;
  }
  if (rawBranding.fontColor && !hasFieldValue(typo.headingColor)) {
    typo.headingColor = rawBranding.fontColor;
  }
  if (rawBranding.fontFamily?.length) {
    const fromLegacy = legacyFontFamilyToTypography(rawBranding.fontFamily);
    if (!typo.languages?.length && fromLegacy.languages.length) {
      typo.languages = fromLegacy.languages;
      typo.fontStylesByLanguage = {
        ...(typo.fontStylesByLanguage || {}),
        ...fromLegacy.fontStylesByLanguage,
      };
    }
  }

  next.typography = { ...next.typography, fields: typo };
  next.colorScheme = {
    ...next.colorScheme,
    fields: normalizeColorSchemeFields(colors),
  };
  return next;
}

/**
 * Derives legacy flat branding from v2 sections for update-ticket / Order View.
 * Preserves designLink, otherData, and notes from the existing branding object.
 */
export function mapSectionsToLegacyBranding(sections = {}, existingLegacy = {}) {
  const cs = sections.colorScheme?.fields || {};
  const typo = normalizeTypographyFields(sections.typography?.fields || {});
  const legacyFont = legacyFontFamilyToTypography(existingLegacy.fontFamily || []);

  let fontFamily = existingLegacy.fontFamily ?? [];
  if (typo.languages?.length) {
    fontFamily = typo.languages.map((langId) => ({
      languageId: langId,
      fontFamily: typo.fontStylesByLanguage?.[langId] ?? "",
    }));
  } else if (!fontFamily?.length && legacyFont.languages?.length) {
    fontFamily = legacyFont.languages.map((langId) => ({
      languageId: langId,
      fontFamily: legacyFont.fontStylesByLanguage?.[langId] ?? "",
    }));
  }

  return {
    primaryColor: colorFromArray(cs.primaryColor) || existingLegacy.primaryColor || "",
    secondaryColor:
      colorFromArray(cs.secondaryColor) || existingLegacy.secondaryColor || "",
    fontFamily,
    fontColor: typo.headingColor ?? existingLegacy.fontColor ?? "",
    fontSize: typo.bodyFontSize ?? typo.headingFontSize ?? existingLegacy.fontSize ?? "",
    designLink: existingLegacy.designLink ?? "",
    otherData: Array.isArray(existingLegacy.otherData) ? existingLegacy.otherData : [],
    notes: existingLegacy.notes ?? "",
  };
}

function finalizeBrandingPayload(sections, rawBranding = {}, options = {}) {
  const { languageList = [], fontFamilyList = [] } = options;
  let nextSections = applyLegacyFlatBrandingToSections(sections, rawBranding);

  if (languageList.length) {
    nextSections = remapTypographyLanguagesToIds(nextSections, languageList);
  }

  const typoFields = nextSections?.typography?.fields;
  if (typoFields && fontFamilyList.length) {
    nextSections = {
      ...nextSections,
      typography: {
        ...nextSections.typography,
        fields: normalizeTypographyFontNames(typoFields, fontFamilyList),
      },
    };
  }

  const guidelineNotes = resolveGuidelineNotesFromRawBranding(rawBranding);
  nextSections = stripSectionNotesFromSections(nextSections);

  return {
    sections: nextSections,
    commentsBySection: normalizeCommentsBySection(rawBranding.commentsBySection || {}),
    guidelineNotes,
  };
}

export function buildBrandingPayload(rawBranding = {}, options = {}) {
  const { languageList = [], fontFamilyList = [] } = options;
  const customerBranding = resolveCustomerBranding(rawBranding);

  if (customerBrandingHasSectionData(customerBranding)) {
    const fromFlow = mapApiCustomerBrandingToSections(customerBranding, languageList);
    const merged = mergeDefaultSections({
      ...fromFlow.sections,
      ...(rawBranding.sections || {}),
    });
    const sections = {};
    BRANDING_SECTION_IDS.forEach((id) => {
      sections[id] = normalizeSectionFields(id, {
        ...merged[id],
        fields: merged[id]?.fields,
        notes: merged[id]?.notes ?? "",
        attachments: merged[id]?.attachments ?? fromFlow.sections[id]?.attachments,
        apiSectionId:
          resolveStoredApiSectionId(id, merged[id]) ??
          resolveStoredApiSectionId(id, fromFlow.sections[id]),
      });
    });
    return finalizeBrandingPayload(sections, rawBranding, { languageList, fontFamilyList });
  }

  const merged = mergeDefaultSections(rawBranding.sections);
  const sections = {};
  BRANDING_SECTION_IDS.forEach((id) => {
    sections[id] = normalizeSectionFields(id, {
      ...merged[id],
      notes: merged[id]?.notes ?? "",
      apiSectionId: resolveStoredApiSectionId(id, merged[id]),
    });
  });

  return finalizeBrandingPayload(sections, rawBranding, { languageList, fontFamilyList });
}

export function getMissingRequiredFields(brandingPayload = {}) {
  const missing = [];
  const sections = brandingPayload?.sections || {};
  const pendingTypographyFontFiles = brandingPayload?.pendingTypographyFontFiles || {};
  const deletedFontBlobNames = brandingPayload?.deletedFontBlobNames || [];

  Object.entries(BRANDING_REQUIRED_FIELDS).forEach(([sectionId, fieldKeys]) => {
    const current =
      sectionId === "typography"
        ? normalizeTypographyFields(sections?.[sectionId]?.fields || {})
        : sectionId === "colorScheme"
          ? normalizeColorSchemeFields(sections?.[sectionId]?.fields || {})
          : sections?.[sectionId]?.fields || {};

    fieldKeys.forEach((key) => {
      if (key === "languages") {
        if (!current.languages?.length) {
          missing.push({ sectionId, key: "languages" });
        }
        return;
      }
      const value = current[key];
      if (value == null || String(value).trim() === "") {
        missing.push({ sectionId, key });
      }
    });

    // Font family is optional unless a font file upload exists for that language.
    if (sectionId === "typography") {
      current.languages.forEach((langId) => {
        if (
          !languageHasTypographyFontUpload(
            langId,
            current,
            pendingTypographyFontFiles,
            deletedFontBlobNames
          )
        ) {
          return;
        }
        const fontId = current.fontStylesByLanguage?.[langId];
        if (fontId == null || String(fontId).trim() === "") {
          missing.push({ sectionId, key: `langFont_${langId}` });
        }
      });
    }
  });

  missing.push(
    ...getExportIconValidationErrors(sections, {
      deletedAttachmentIds: brandingPayload.deletedAttachmentIds || [],
    })
  );

  return missing;
}

/**
 * commentsBySection: { [sectionId]: Array<{ id, author, authorType, message, createdAt }> }
 */
export function normalizeCommentsBySection(commentsBySection) {
  if (!commentsBySection || typeof commentsBySection !== "object") return {};

  return Object.fromEntries(
    Object.entries(commentsBySection).map(([id, list]) => [
      id,
      Array.isArray(list)
        ? list.map((row) => ({
          id: row.id ?? `${Date.now()}-${Math.random()}`,
          author: row.author ?? "",
          authorType: row.authorType ?? "internal",
          message: String(row.message ?? ""),
          createdAt: row.createdAt ?? "",
        }))
        : [],
    ])
  );
}

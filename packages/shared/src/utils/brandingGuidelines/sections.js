/** Branding Guidelines v2 — section logic & normalization */

import {
  BRANDING_SECTION_FIELDS,
  BRANDING_SECTION_IDS,
  BRANDING_TYPOGRAPHY_STATIC_FIELDS,
} from "./constants.js";
import {
  formatDimensionFieldValue,
  formatDimensionWithPx,
  formatSizeWithUnit,
  isCompleteHexColor,
  normalizeQuadDimensionValue,
  parseDimensionFieldValue,
  tokenizeDimensionShorthand,
} from "./inputUtils.js";
import { normalizeSectionAlternatives } from "./alternatives.js";

export function createExportIconEntry(iconName = "") {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `export-icon-${Date.now()}-${Math.random()}`,
    iconName: String(iconName ?? ""),
    pendingFile: null,
    existingAttachmentId: null,
  };
}

export const BRANDING_DEFAULT_PRIMARY_COLOR = "#2d6cdf";
export const BRANDING_DEFAULT_SECONDARY_COLOR = "#00a3ff";
/** Max swatches per primary or secondary color list in the color scheme section. */
export const BRANDING_MAX_COLOR_PICKERS = 20;

/**
 * Normalizes a branding color field; keeps only complete hex values.
 * Does not invent colors — empty input stays empty unless `defaultColor` is a valid hex.
 */
export function normalizeBrandingColorList(
  value,
  defaultColor = "",
  maxCount = BRANDING_MAX_COLOR_PICKERS
) {
  const cap = Math.max(1, Number(maxCount) || BRANDING_MAX_COLOR_PICKERS);
  let list = [];
  if (Array.isArray(value)) {
    list = value.map((c) => String(c ?? "").trim()).filter((c) => isCompleteHexColor(c));
  } else {
    const single = String(value ?? "").trim();
    if (isCompleteHexColor(single)) list = [single];
  }
  if (list.length === 0) {
    const fallback = String(defaultColor ?? "").trim();
    if (isCompleteHexColor(fallback)) list = [fallback];
  }
  return list.slice(0, cap);
}

/** True when another color may be appended (empty list = first color; else last must be valid hex). */
export function canAppendBrandingColorList(colors = [], maxCount = BRANDING_MAX_COLOR_PICKERS) {
  if (!Array.isArray(colors)) return false;
  const cap = Math.max(1, Number(maxCount) || BRANDING_MAX_COLOR_PICKERS);
  if (colors.length >= cap) return false;
  if (colors.length === 0) return true;
  const last = String(colors[colors.length - 1] ?? "").trim();
  return isCompleteHexColor(last);
}

export function normalizeColorSchemeFields(fields = {}) {
  return {
    ...fields,
    primaryColor: normalizeBrandingColorList(fields.primaryColor),
    secondaryColor: normalizeBrandingColorList(fields.secondaryColor),
  };
}

export function normalizeExportIconEntry(entry = {}) {
  return {
    id: entry?.id || createExportIconEntry().id,
    iconName: String(entry?.iconName ?? ""),
    pendingFile: entry?.pendingFile ?? null,
    existingAttachmentId: entry?.existingAttachmentId ?? null,
  };
}

export function normalizeExportIconEntries(fields = {}) {
  if (Array.isArray(fields.exportIconEntries) && fields.exportIconEntries.length > 0) {
    return fields.exportIconEntries.map((entry) => normalizeExportIconEntry(entry));
  }
  const legacyNames = [fields.iconName1, fields.iconName2].filter((n) =>
    String(n || "").trim()
  );
  if (legacyNames.length > 0) {
    return legacyNames.map((name) => createExportIconEntry(name));
  }
  return [createExportIconEntry()];
}

export function exportIconEntryHasFile(entry = {}, options = {}) {
  const { deletedAttachmentIds = [] } = options;
  if (entry?.pendingFile instanceof File) return true;
  const id = entry?.existingAttachmentId;
  if (id == null || String(id).trim() === "") return false;
  const deleted = new Set((deletedAttachmentIds || []).map(String));
  return !deleted.has(String(id));
}

export function isExportIconEntryEmpty(entry = {}, options = {}) {
  const name = String(entry?.iconName ?? "").trim();
  return !name && !exportIconEntryHasFile(entry, options);
}

export function isExportIconEntryComplete(entry = {}, options = {}) {
  const name = String(entry?.iconName ?? "").trim();
  return Boolean(name) && exportIconEntryHasFile(entry, options);
}

export function isExportIconEntryPartial(entry = {}, options = {}) {
  return !isExportIconEntryEmpty(entry, options) && !isExportIconEntryComplete(entry, options);
}

export function getCompleteExportIconEntries(fields = {}, options = {}) {
  return normalizeExportIconEntries(fields).filter((entry) =>
    isExportIconEntryComplete(entry, options)
  );
}

export function getExportIconValidationErrors(sections = {}, options = {}) {
  const validateOptions = {
    deletedAttachmentIds: options.deletedAttachmentIds || [],
  };
  const entries = normalizeExportIconEntries(sections?.exportIcons?.fields || {});
  const errors = [];

  entries.forEach((entry) => {
    if (!isExportIconEntryPartial(entry, validateOptions)) return;
    const hasName = Boolean(String(entry.iconName ?? "").trim());
    const hasFile = exportIconEntryHasFile(entry, validateOptions);
    if (hasName && !hasFile) {
      errors.push({ sectionId: "exportIcons", key: `${entry.id}.attachment` });
    }
    if (hasFile && !hasName) {
      errors.push({ sectionId: "exportIcons", key: `${entry.id}.iconName` });
    }
  });

  return errors;
}

export function parseApiBorderRadius(value) {
  if (value == null || value === "") return parseCornerQuad("");
  if (typeof value === "object" && !Array.isArray(value)) {
    if (
      value.borderRadiusTopLeft != null ||
      value.borderRadiusTopRight != null ||
      value.topLeft != null
    ) {
      return parseCornerQuad({
        topLeft: value.borderRadiusTopLeft ?? value.topLeft ?? "",
        topRight: value.borderRadiusTopRight ?? value.topRight ?? "",
        bottomRight: value.borderRadiusBottomRight ?? value.bottomRight ?? "",
        bottomLeft: value.borderRadiusBottomLeft ?? value.bottomLeft ?? "",
      });
    }
  }
  return parseCornerQuad(value);
}

export function parseApiBorderWidth(value) {
  if (value == null || value === "") return parseEdgeQuad("");
  if (typeof value === "object" && !Array.isArray(value)) {
    if (value.borderWidthTop != null || value.top != null) {
      return parseEdgeQuad({
        top: value.borderWidthTop ?? value.top ?? "",
        bottom: value.borderWidthBottom ?? value.bottom ?? "",
        left: value.borderWidthLeft ?? value.left ?? "",
        right: value.borderWidthRight ?? value.right ?? "",
      });
    }
  }
  return parseEdgeQuad(value);
}

export function cornerQuadToApiBorderRadius(quad) {
  const q = typeof quad === "object" && quad !== null ? quad : parseCornerQuad(quad);
  return {
    borderRadiusTopLeft: formatDimensionWithPx(q.topLeft),
    borderRadiusTopRight: formatDimensionWithPx(q.topRight),
    borderRadiusBottomLeft: formatDimensionWithPx(q.bottomLeft),
    borderRadiusBottomRight: formatDimensionWithPx(q.bottomRight),
  };
}

export function edgeQuadToApiBorderWidth(quad) {
  const q = typeof quad === "object" && quad !== null ? quad : parseEdgeQuad(quad);
  return {
    borderWidthTop: formatDimensionWithPx(q.top),
    borderWidthBottom: formatDimensionWithPx(q.bottom),
    borderWidthLeft: formatDimensionWithPx(q.left),
    borderWidthRight: formatDimensionWithPx(q.right),
  };
}

function getLanguageEntryId(entry) {
  if (!entry || typeof entry !== "object") return "";
  return String(entry.languageId ?? entry.language_id ?? entry.id ?? "").trim();
}

export function getLanguageEntryName(entry) {
  if (!entry || typeof entry !== "object") return "";
  return String(entry.languageName ?? entry.language_name ?? entry.name ?? entry.label ?? "").trim();
}

export function resolveLanguageLabel(langKey, languageList = []) {
  const raw = String(langKey ?? "").trim();
  if (!raw) return "";
  const list = Array.isArray(languageList) ? languageList : [];
  const byId = list.find((l) => getLanguageEntryId(l) === raw);
  if (byId) {
    return getLanguageEntryName(byId) || raw;
  }
  return raw;
}

/** Resolves form/master value (id or name) to font family name for API payloads. */
export function resolveFontFamilyName(value, fontFamilyList = []) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const list = Array.isArray(fontFamilyList) ? fontFamilyList : [];
  const byId = list.find((f) => String(f.font_id) === raw);
  if (byId) return String(byId.name ?? byId.fontName ?? raw).trim();
  const byName = list.find(
    (f) => String(f.name ?? f.fontName ?? "").toLowerCase() === raw.toLowerCase()
  );
  if (byName) return String(byName.name ?? byName.fontName ?? raw).trim();
  return raw;
}

export function coerceIsCustomFont(value) {
  if (value === true || value === false) return value;
  if (value == null || value === "") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return Boolean(value);
}

/** Reads `is_customfont` from a Font List API row. */
export function isCustomFontFromFontListEntry(fontEntry) {
  if (!fontEntry || typeof fontEntry !== "object") return false;
  return coerceIsCustomFont(fontEntry.is_customfont ?? fontEntry.isCustomFont);
}

/** Resolves whether a stored font value refers to a custom font in the master list. */
export function resolveFontFamilyIsCustomFont(value, fontFamilyList = []) {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  const list = Array.isArray(fontFamilyList) ? fontFamilyList : [];
  const byId = list.find((f) => String(f.font_id) === raw);
  if (byId) return isCustomFontFromFontListEntry(byId);
  const byName = list.find(
    (f) => String(f.name ?? f.fontName ?? "").toLowerCase() === raw.toLowerCase()
  );
  if (byName) return isCustomFontFromFontListEntry(byName);
  return false;
}

export function resolveTypographyIsCustomFont(storedFlag, fontFamilyValue, fontFamilyList = []) {
  if (storedFlag === true || storedFlag === false) return storedFlag;
  return resolveFontFamilyIsCustomFont(fontFamilyValue, fontFamilyList);
}

/** Ensures typography fields use font name strings (not numeric ids). */
export function normalizeTypographyFontNames(fields = {}, fontFamilyList = []) {
  const typo = normalizeTypographyFields(fields);
  const fontStylesByLanguage = {};
  Object.entries(typo.fontStylesByLanguage || {}).forEach(([langId, font]) => {
    fontStylesByLanguage[langId] = resolveFontFamilyName(font, fontFamilyList);
  });
  return normalizeTypographyFields({
    ...typo,
    fontStylesByLanguage,
  });
}

function normalizeLanguageLookupKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Base label before locale suffix, e.g. "Albanian (Albania)" → "albanian". */
function languageLookupBaseKey(value) {
  const norm = normalizeLanguageLookupKey(value);
  const paren = norm.indexOf("(");
  return (paren >= 0 ? norm.slice(0, paren) : norm).trim();
}

export function resolveLanguageKeyFromApi(languageValue, languageList = []) {
  const raw = String(languageValue ?? "").trim();
  if (!raw) return "";
  const list = Array.isArray(languageList) ? languageList : [];
  const rawNorm = normalizeLanguageLookupKey(raw);
  const rawBase = languageLookupBaseKey(raw);

  const byId = list.find((l) => getLanguageEntryId(l) === raw);
  if (byId) return getLanguageEntryId(byId);

  const byName = list.find((l) => {
    const name = normalizeLanguageLookupKey(getLanguageEntryName(l));
    return name === rawNorm;
  });
  if (byName) return getLanguageEntryId(byName);

  if (rawBase) {
    const byBase = list.find((l) => {
      const name = normalizeLanguageLookupKey(getLanguageEntryName(l));
      const base = languageLookupBaseKey(name);
      return base === rawBase || name.startsWith(`${rawBase} (`) || rawNorm.startsWith(`${base} (`);
    });
    if (byBase) return getLanguageEntryId(byBase);
  }

  return raw;
}

/** Resolves a form/API language key to a master language row (by id or display name). */
export function findBrandingLanguageByKey(langKey, languageList = []) {
  const raw = String(langKey ?? "").trim();
  if (!raw) return null;
  const list = Array.isArray(languageList) ? languageList : [];
  const resolvedId = resolveLanguageKeyFromApi(raw, list);
  return (
    list.find((l) => getLanguageEntryId(l) === String(resolvedId)) ||
    list.find(
      (l) =>
        normalizeLanguageLookupKey(getLanguageEntryName(l)) ===
        normalizeLanguageLookupKey(raw)
    ) ||
    null
  );
}

export function remapTypographyLanguagesToIds(sections = {}, languageList = []) {
  const typo = sections?.typography?.fields;
  if (!typo?.languages?.length || !languageList?.length) return sections;
  const newLangs = [];
  const newStyles = {};
  const newFontFiles = {};
  typo.languages.forEach((key) => {
    const id = resolveLanguageKeyFromApi(key, languageList);
    const useKey = id || key;
    if (!newLangs.includes(useKey)) newLangs.push(useKey);
    newStyles[useKey] = typo.fontStylesByLanguage?.[key] ?? typo.fontStylesByLanguage?.[useKey] ?? "";
    const fontFiles =
      typo.fontFilesByLanguage?.[key] ?? typo.fontFilesByLanguage?.[useKey];
    if (fontFiles && typeof fontFiles === "object") {
      newFontFiles[useKey] = fontFiles;
    }
  });
  return {
    ...sections,
    typography: {
      ...sections.typography,
      fields: {
        ...typo,
        languages: newLangs,
        fontStylesByLanguage: newStyles,
        fontFilesByLanguage: newFontFiles,
      },
    },
  };
}

/** Language ids from Order Details (`orderInfo.tools.language`). */
export function extractOrderLanguageIds(orderInfo = {}) {
  const langs = orderInfo?.tools?.language ?? orderInfo?.language;
  if (!Array.isArray(langs)) return [];
  return langs
    .map((entry) => {
      if (entry == null) return "";
      if (typeof entry === "object") {
        return String(entry.languageId ?? entry.language_id ?? entry.id ?? "").trim();
      }
      return String(entry).trim();
    })
    .filter(Boolean);
}

/**
 * Fills typography languages from Order Details only when typography has none saved.
 * When typography already has languages, those are kept as-is (Order Details is fallback only).
 * Preserves font styles for languages still selected; drops styles for removed languages.
 */
export function syncTypographyLanguagesFromOrder(
  typographyFields = {},
  orderLanguageIds = [],
  languageList = []
) {
  const typo = normalizeTypographyFields(typographyFields);
  // Prefer saved typography languages; fall back to Order Details only when empty.
  if (typo.languages?.length) {
    return typo;
  }

  const list = Array.isArray(languageList) ? languageList : [];
  const normalizedOrderIds = (orderLanguageIds || [])
    .map((id) => resolveLanguageKeyFromApi(id, list) || String(id))
    .filter(Boolean);
  const uniqueIds = [...new Set(normalizedOrderIds)];

  const fontStylesByLanguage = {};
  const fontFilesByLanguage = {};
  const fileReferenceParamByLanguage = {};
  uniqueIds.forEach((langId) => {
    const existingEntry = Object.entries(typo.fontStylesByLanguage || {}).find(
      ([key]) => resolveLanguageKeyFromApi(key, list) === langId
    );
    const existing =
      typo.fontStylesByLanguage?.[langId] ?? existingEntry?.[1] ?? "";
    fontStylesByLanguage[langId] = existing ?? "";
    const existingFontFilesEntry = Object.entries(typo.fontFilesByLanguage || {}).find(
      ([key]) => resolveLanguageKeyFromApi(key, list) === langId
    );
    const fontFiles =
      typo.fontFilesByLanguage?.[langId] ?? existingFontFilesEntry?.[1];
    if (fontFiles && typeof fontFiles === "object") {
      fontFilesByLanguage[langId] = fontFiles;
    }
    const existingRefEntry = Object.entries({
      ...(typo.attachmentParamByLanguage || {}),
      ...(typo.fileReferenceParamByLanguage || {}),
    }).find(([key]) => resolveLanguageKeyFromApi(key, list) === langId);
    const fileReferenceParam =
      typo.fileReferenceParamByLanguage?.[langId] ??
      typo.attachmentParamByLanguage?.[langId] ??
      existingRefEntry?.[1];
    if (fileReferenceParam != null && String(fileReferenceParam).trim() !== "") {
      fileReferenceParamByLanguage[langId] = String(fileReferenceParam).trim();
    }
  });

  return normalizeTypographyFields({
    ...typo,
    languages: uniqueIds,
    fontStylesByLanguage,
    fontFilesByLanguage,
    fileReferenceParamByLanguage,
  });
}

export function applyOrderLanguagesToBrandingSections(sections = {}, orderInfo = {}, languageList = []) {
  const orderLanguageIds = extractOrderLanguageIds(orderInfo);
  const typo = sections?.typography?.fields;
  if (!typo && !orderLanguageIds.length) return sections;

  const syncedTypo = syncTypographyLanguagesFromOrder(typo || {}, orderLanguageIds, languageList);
  return {
    ...sections,
    typography: {
      ...sections.typography,
      fields: syncedTypo,
    },
  };
}

export function mapExportIconsToApi(fields = {}, sectionApiId, options = {}) {
  const entries = getCompleteExportIconEntries(fields, options);
  return {
    section_id: sectionApiId,
    iconName: entries.map((entry) => String(entry.iconName).trim().toLowerCase()),
  };
}

export function hydrateExportIconEntriesWithAttachments(entries, attachments = []) {
  const list = Array.isArray(attachments) ? [...attachments] : [];
  const used = new Set();
  const result = entries.map((entry) => {
    if (entry.existingAttachmentId != null) {
      const byId = list.find((file) => {
        const id = file.id ?? file.attachmentId ?? file.attachment_id;
        return id != null && String(id) === String(entry.existingAttachmentId);
      });
      if (byId) {
        const id = byId.id ?? byId.attachmentId ?? byId.attachment_id;
        if (id != null) used.add(String(id));
        return { ...entry, existingAttachmentId: id };
      }
    }
    const nameKey = String(entry.iconName || "").trim().toLowerCase();
    const byName = list.find((file) => {
      const id = file.id ?? file.attachmentId ?? file.attachment_id;
      if (id != null && used.has(String(id))) return false;
      const label = String(
        file.iconName ?? file.fileName ?? file.name ?? file.file_name ?? ""
      ).toLowerCase();
      return nameKey && label.includes(nameKey);
    });
    if (byName) {
      const id = byName.id ?? byName.attachmentId ?? byName.attachment_id;
      if (id != null) used.add(String(id));
      return { ...entry, existingAttachmentId: id };
    }
    if (nameKey) {
      const nextUnused = list.find((file) => {
        const id = file.id ?? file.attachmentId ?? file.attachment_id;
        return id != null && !used.has(String(id));
      });
      if (nextUnused) {
        const id = nextUnused.id ?? nextUnused.attachmentId ?? nextUnused.attachment_id;
        if (id != null) used.add(String(id));
        return { ...entry, existingAttachmentId: id };
      }
    }
    return entry;
  });

  const unused = list.filter((file) => {
    const id = file.id ?? file.attachmentId ?? file.attachment_id;
    return id != null && !used.has(String(id));
  });
  let unusedIndex = 0;
  return result.map((entry) => {
    if (entry.existingAttachmentId != null || entry.pendingFile) return entry;
    const file = unused[unusedIndex];
    if (!file) return entry;
    const id = file.id ?? file.attachmentId ?? file.attachment_id;
    if (id == null) return entry;
    unusedIndex += 1;
    used.add(String(id));
    return { ...entry, existingAttachmentId: id };
  });
}

function normalizeLanguagesField(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value != null && String(value).trim() !== "") return [String(value)];
  return [];
}

/** Allowed typography font upload extensions. */
export const TYPOGRAPHY_FONT_FILE_EXTENSIONS = [
  ".zip",
  ".rar",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
];

/** FormData key for ASP.NET IFormFile typography font uploads (repeat per file, no index). */
export const TYPOGRAPHY_FONTS_MULTIPART_KEY = "fontFamilyAttachments";

function extractTypographyFontFileExtension(fileName) {
  const lower = String(fileName ?? "").trim().toLowerCase();
  const sorted = [...TYPOGRAPHY_FONT_FILE_EXTENSIONS].sort((a, b) => b.length - a.length);
  for (const ext of sorted) {
    if (lower.endsWith(ext)) return ext;
  }
  const dotIndex = lower.lastIndexOf(".");
  return dotIndex > 0 ? lower.slice(dotIndex) : "";
}

/** Sanitizes a font family name for use in uploaded file names. */
export function sanitizeTypographyFontFileName(fontName) {
  const sanitized = String(fontName ?? "font")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return sanitized || "font";
}

/** Renames a font file to `[languageId]_[fontName].[extension]`. */
export function renameTypographyFontFile(file, languageId, fontName = "") {
  if (!(file instanceof File)) return null;
  const langId = String(languageId ?? "").trim();
  const safeFont = sanitizeTypographyFontFileName(fontName);
  const extension = extractTypographyFontFileExtension(file.name);
  const nextName = `${langId}_${safeFont}${extension}`;
  return new File([file], nextName, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export function isTypographyFontFileAllowed(file) {
  if (!(file instanceof File)) return false;
  return Boolean(extractTypographyFontFileExtension(file.name));
}

export function validateTypographyFontFile(file, maxSizeMB = 50) {
  if (!(file instanceof File)) {
    return { isValid: false, reason: "Invalid file." };
  }
  if (file.size === 0) {
    return {
      isValid: false,
      reason: `File "${file.name}" is empty (0 bytes).`,
    };
  }
  if (!isTypographyFontFileAllowed(file)) {
    return {
      isValid: false,
      reason: `Invalid file type. Allowed: ${TYPOGRAPHY_FONT_FILE_EXTENSIONS.join(", ")}`,
    };
  }
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      reason: `File "${file.name}" exceeds the ${maxSizeMB}MB size limit.`,
    };
  }
  return { isValid: true, data: file };
}

/** @deprecated Legacy per-language form key — use sequential `font_attachment_N` instead. */
export function getTypographyFontAttachmentKey(languageId) {
  return `font_attachments_${String(languageId ?? "").trim()}`;
}

export function matchesLegacyTypographyFontAttachmentName(fileName, languageId) {
  const langId = String(languageId ?? "").trim();
  const normalized = String(fileName ?? "").trim();
  if (!normalized || !langId) return false;
  const legacyKeys = [
    `fontAttachments_${langId}`,
    `font_attachments_${langId}`,
    getTypographyFontAttachmentKey(langId),
  ];
  return legacyKeys.some(
    (key) => normalized === key || normalized.toLowerCase().startsWith(`${key.toLowerCase()}.`)
  );
}

export function matchesTypographyFontAttachmentName(fileName, languageId, fontName = "") {
  const langId = String(languageId ?? "").trim();
  const normalized = String(fileName ?? "").trim();
  if (!normalized || !langId) return false;

  const safeFont = sanitizeTypographyFontFileName(fontName);
  const extension = extractTypographyFontFileExtension(normalized);
  if (extension && safeFont) {
    const expectedBase = `${langId}_${safeFont}`.toLowerCase();
    if (normalized.toLowerCase() === `${expectedBase}${extension}`) return true;
  }

  if (normalized.toLowerCase().startsWith(`${langId}_`)) return true;

  return matchesLegacyTypographyFontAttachmentName(normalized, langId);
}

export function resolveTypographyFontAttachmentsForLanguage({
  languageId,
  typographyFields = {},
  sectionAttachments = [],
  deletedAttachmentIds = [],
  deletedFontBlobNames = [],
}) {
  const typoFields = normalizeTypographyFields(typographyFields);
  const langKey = String(languageId ?? "").trim();
  if (!langKey) return [];

  const deletedBlobSet = new Set((deletedFontBlobNames || []).map(String).filter(Boolean));
  const embedded = typoFields.fontFilesByLanguage?.[langKey];
  if (embedded && typeof embedded === "object") {
    const blobName = String(embedded.blobName ?? embedded.blob_name ?? "").trim();
    if (blobName && deletedBlobSet.has(blobName)) return [];
    const fileName = String(embedded.fileName ?? embedded.file_name ?? "").trim();
    if (!blobName && !fileName) return [];
    return [
      {
        ...embedded,
        blobName,
        fileName: fileName || blobName,
      },
    ];
  }

  const fontName = typoFields.fontStylesByLanguage?.[langKey] ?? "";
  const fileReferenceParam =
    typoFields.fileReferenceParamByLanguage?.[langKey] ??
    typoFields.attachmentParamByLanguage?.[langKey];
  const deletedSet = new Set((deletedAttachmentIds || []).map(String));
  const attachments = Array.isArray(sectionAttachments) ? sectionAttachments : [];

  return attachments.filter((file) => {
    const id = file.id ?? file.attachmentId ?? file.attachment_id;
    if (id != null && deletedSet.has(String(id))) return false;
    const blobName = String(file.blobName ?? file.blob_name ?? "").trim();
    if (blobName && deletedBlobSet.has(blobName)) return false;
    const name = file.fileName || file.name || file.file_name || "";
    return (
      matchesTypographyFontAttachmentName(name, langKey, fontName) ||
      (fileReferenceParam && String(name).trim() === String(fileReferenceParam).trim())
    );
  });
}

/**
 * Builds typography font files for save (languages-array order, pending uploads only).
 * Metadata is sent in the `typography` JSON `languages[]` entries (`language`, `fontFamily`, `fileName`).
 */
export function buildTypographyFontMultipartEntries({
  typographyFields = {},
  pendingTypographyFontFiles = {},
  languageList = [],
}) {
  const normalized = normalizeTypographyFields(typographyFields);
  const entries = [];

  normalized.languages.forEach((langId) => {
    const langKey = String(langId);
    const pending =
      pendingTypographyFontFiles[langKey] ?? pendingTypographyFontFiles[langId];
    if (!(pending instanceof File)) return;

    const fontFamily = String(normalized.fontStylesByLanguage[langKey] ?? "").trim();
    if (!fontFamily) return;

    entries.push({
      file: pending,
      metadata: {
        language: resolveLanguageLabel(langId, languageList),
        fontFamily,
        fileName: pending.name,
      },
    });
  });

  return entries;
}

export function normalizeTypographyFields(fields = {}) {
  const out = { ...fields };
  if (!out.fontStylesByLanguage || typeof out.fontStylesByLanguage !== "object") {
    out.fontStylesByLanguage = {};
  }
  if (!out.fontFilesByLanguage || typeof out.fontFilesByLanguage !== "object") {
    out.fontFilesByLanguage = {};
  }
  if (!out.fileReferenceParamByLanguage || typeof out.fileReferenceParamByLanguage !== "object") {
    out.fileReferenceParamByLanguage = {
      ...(out.attachmentParamByLanguage || {}),
      ...(out.fileReferenceParamByLanguage || {}),
    };
  }
  if (!Array.isArray(out.languages)) {
    if (out.language != null && String(out.language).trim() !== "") {
      const langId = String(out.language);
      out.languages = [langId];
      if (out.fontStyle && !out.fontStylesByLanguage[langId]) {
        out.fontStylesByLanguage[langId] = out.fontStyle;
      }
    } else {
      out.languages = [];
    }
  }
  out.languages = normalizeLanguagesField(out.languages);
  const prunedStyles = {};
  const prunedFontFiles = {};
  const prunedFileReferenceParams = {};
  out.languages.forEach((langId) => {
    prunedStyles[langId] = out.fontStylesByLanguage[langId] ?? "";
    const fontFiles = out.fontFilesByLanguage?.[langId];
    if (fontFiles && typeof fontFiles === "object") {
      const blobName = String(fontFiles.blobName ?? fontFiles.blob_name ?? "").trim();
      const fileName = String(fontFiles.fileName ?? fontFiles.file_name ?? "").trim();
      if (blobName || fileName) {
        prunedFontFiles[langId] = {
          blobName,
          blobUri: String(fontFiles.blobUri ?? fontFiles.blob_uri ?? "").trim(),
          createdDate: fontFiles.createdDate ?? fontFiles.created_date ?? "",
          fileName,
          fileType: String(fontFiles.fileType ?? fontFiles.file_type ?? "").trim(),
          fileUploadPath: String(
            fontFiles.fileUploadPath ?? fontFiles.file_upload_path ?? ""
          ).trim(),
        };
      }
    }
    const fileReferenceParam =
      out.fileReferenceParamByLanguage?.[langId] ?? out.attachmentParamByLanguage?.[langId];
    if (fileReferenceParam != null && String(fileReferenceParam).trim() !== "") {
      prunedFileReferenceParams[langId] = String(fileReferenceParam).trim();
    }
  });
  out.fontStylesByLanguage = prunedStyles;
  out.fontFilesByLanguage = prunedFontFiles;
  out.fileReferenceParamByLanguage = prunedFileReferenceParams;
  delete out.attachmentParamByLanguage;
  delete out.isCustomFontByLanguage;
  if (!Array.isArray(out.headingTextFormatting)) {
    out.headingTextFormatting = [];
  }
  delete out.bodyFontWeight;
  return out;
}

/**
 * Builds typography field defs: languages multi-select, then one font style per selected language.
 */
export function getTypographyFieldDefinitions(typographyFields = {}, languageListData = []) {
  const fields = normalizeTypographyFields(typographyFields);
  const selectedIds = fields.languages;
  const langOptions = Array.isArray(languageListData) ? languageListData : [];

  const perLanguageFontFields = selectedIds.map((langId) => {
    const lang = findBrandingLanguageByKey(langId, langOptions);
    const languageName = getLanguageEntryName(lang) || String(langId);
    return {
      key: `langFont_${langId}`,
      languageId: String(langId),
      languageName,
      labelKey: "branding_field_font_style_for_language",
      fallbackLabel: `${languageName} font family`,
      type: "languageFontFamilyInput",
      groupTitle: "",
      colSize: 6,
    };
  });

  const languagesField = BRANDING_TYPOGRAPHY_STATIC_FIELDS.filter((f) => f.key === "languages");
  const fieldsAfterFontStyles = BRANDING_TYPOGRAPHY_STATIC_FIELDS.filter(
    (f) => f.key !== "languages"
  );

  return [...languagesField, ...perLanguageFontFields, ...fieldsAfterFontStyles];
}

const emptyEdgeQuad = (layout) =>
  layout === "radius"
    ? { topLeft: "", topRight: "", bottomRight: "", bottomLeft: "" }
    : { top: "", bottom: "", left: "", right: "" };

const defaultFieldValue = (field) => {
  if (field.type === "edgeQuad") return emptyEdgeQuad(field.quadLayout);
  if (field.type === "textFormatting") return [];
  if (field.type === "languagesMultiSelect" || field.type === "languagesReadOnly") return [];
  return "";
};

const emptySectionMeta = () => ({
  notes: "",
  activeSource: "",
  alternatives: [],
  imageReference: null,
  extractedPrimary: null,
});

const emptySectionExtra = (sectionId) => {
  if (sectionId === "typography") {
    return {
      ...emptySectionMeta(),
      fields: {
        languages: [],
        fontStylesByLanguage: {},
        fontFilesByLanguage: {},
        fileReferenceParamByLanguage: {},
        headingFontSize: "",
        headingFontWeight: "",
        headingTextFormatting: [],
        headingColor: "",
        bodyFontSize: "",
        bodyColor: "",
      },
    };
  }
  if (sectionId === "exportIcons") {
    return {
      ...emptySectionMeta(),
      fields: {
        exportIconEntries: [createExportIconEntry()],
      },
    };
  }
  if (sectionId === "colorScheme") {
    return {
      ...emptySectionMeta(),
      fields: {
        primaryColor: [],
        secondaryColor: [],
      },
    };
  }
  return {
    ...emptySectionMeta(),
    fields: (BRANDING_SECTION_FIELDS[sectionId] || []).reduce((acc, field) => {
      acc[field.key] = defaultFieldValue(field);
      return acc;
    }, {}),
  };
};

/** Parse CSS-like spacing into edge object (width: top/right/bottom/left). */
export function parseEdgeQuad(value) {
  const empty = { top: "", bottom: "", left: "", right: "" };
  if (value == null || value === "") return { ...empty };
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      top: normalizeQuadDimensionValue(value.top ?? ""),
      bottom: normalizeQuadDimensionValue(value.bottom ?? ""),
      left: normalizeQuadDimensionValue(value.left ?? ""),
      right: normalizeQuadDimensionValue(value.right ?? ""),
    };
  }
  const parts = tokenizeDimensionShorthand(value);
  if (parts.length === 0) {
    const legacy = String(value).match(/\d+(?:\.\d*)?/g) || [];
    parts.push(...legacy.map((n) => formatDimensionFieldValue(n, "px")));
  }
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], bottom: parts[0], left: parts[1], right: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

export function formatEdgeQuad(quad = {}) {
  const { top, right, bottom, left } = quad;
  const values = [top, right, bottom, left].map((v) => String(v ?? "").trim());
  if (values.every((v) => !v)) return "";
  if (values[0] && values.every((v) => v === values[0])) return values[0];
  return values.filter(Boolean).join(" ") || values.join(" ").trim();
}

/** Parse border-radius into corner object. */
export function parseCornerQuad(value) {
  const empty = { topLeft: "", topRight: "", bottomRight: "", bottomLeft: "" };
  if (value == null || value === "") return { ...empty };
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      topLeft: normalizeQuadDimensionValue(value.topLeft ?? ""),
      topRight: normalizeQuadDimensionValue(value.topRight ?? ""),
      bottomRight: normalizeQuadDimensionValue(value.bottomRight ?? ""),
      bottomLeft: normalizeQuadDimensionValue(value.bottomLeft ?? ""),
    };
  }
  const parts = tokenizeDimensionShorthand(value);
  if (parts.length === 0) {
    const legacy = String(value).match(/\d+(?:\.\d*)?/g) || [];
    parts.push(...legacy.map((n) => formatDimensionFieldValue(n, "px")));
  }
  if (parts.length === 1) {
    return {
      topLeft: parts[0],
      topRight: parts[0],
      bottomRight: parts[0],
      bottomLeft: parts[0],
    };
  }
  if (parts.length === 2) {
    return {
      topLeft: parts[0],
      topRight: parts[1],
      bottomRight: parts[0],
      bottomLeft: parts[1],
    };
  }
  if (parts.length === 3) {
    return {
      topLeft: parts[0],
      topRight: parts[1],
      bottomRight: parts[2],
      bottomLeft: parts[1],
    };
  }
  return {
    topLeft: parts[0],
    topRight: parts[1],
    bottomRight: parts[2],
    bottomLeft: parts[3],
  };
}

export function formatCornerQuad(quad = {}) {
  const { topLeft, topRight, bottomRight, bottomLeft } = quad;
  const values = [topLeft, topRight, bottomRight, bottomLeft].map((v) =>
    String(v ?? "").trim()
  );
  if (values.every((v) => !v)) return "";
  if (values[0] && values.every((v) => v === values[0])) return values[0];
  return values.filter(Boolean).join(" ") || values.join(" ").trim();
}

const INTERACTIVE_SHARED_FIELD_CONFIG = {
  buttons: {
    widthKey: "buttonBorderWidth",
    radiusKey: "buttonBorderRadius",
    sizeKey: "buttonFontSize",
    activePrefix: "hover",
  },
  tabs: {
    radiusKey: "tabBorderRadius",
    sizeKey: "tabFontSize",
    activePrefix: "active",
    edgeWidthKeys: ["inactiveBorderWidth", "activeBorderWidth"],
  },
};

function formatCornerQuadFields(fields, keys = []) {
  keys.forEach((key) => {
    const raw = fields[key];
    if (raw != null && typeof raw === "object") {
      fields[key] = formatCornerQuad(raw);
    }
  });
}

function parseCornerQuadFields(fields, keys = []) {
  keys.forEach((key) => {
    fields[key] = parseCornerQuad(fields[key]);
  });
}

function syncTablesFieldsToApi(fields) {
  if (fields.tableBorderRadius != null && typeof fields.tableBorderRadius === "object") {
    fields.tableBorderRadius = formatCornerQuad(fields.tableBorderRadius);
  }
  const radius = String(fields.tableBorderRadius ?? "").trim();
  if (radius) {
    fields.headerBorderRadius = radius;
    fields.rowBorderRadius = radius;
  }
  formatEdgeQuadFields(fields, ["headerBorderWidth", "rowBorderWidth"]);
}

export function applyTablesFieldsFromApi(fields, data = {}) {
  if (data.borderRadius != null) {
    fields.tableBorderRadius = parseApiBorderRadius(data.borderRadius);
  } else {
    const radiusRaw = fields.headerBorderRadius || fields.rowBorderRadius || "";
    fields.tableBorderRadius = parseCornerQuad(radiusRaw);
  }
  if (data.header?.borderWidth != null) {
    fields.headerBorderWidth = parseApiBorderWidth(data.header.borderWidth);
  }
  if (data.body?.borderWidth != null) {
    fields.rowBorderWidth = parseApiBorderWidth(data.body.borderWidth);
  }
  parseEdgeQuadFields(fields, ["headerBorderWidth", "rowBorderWidth"]);
}

function syncInputFieldsToApi(fields) {
  formatEdgeQuadFields(fields, ["inputBorderWidth"]);
  formatCornerQuadFields(fields, ["inputBorderRadius"]);
}

function migrateInputFieldsLegacyKeys(fields = {}) {
  if (fields.inactiveBorderWidth != null && fields.inputBorderWidth == null) {
    fields.inputBorderWidth =
      typeof fields.inactiveBorderWidth === "object"
        ? { ...fields.inactiveBorderWidth }
        : parseEdgeQuad(fields.inactiveBorderWidth);
  }
  if (fields.inactiveBorderRadius != null && fields.inputBorderRadius == null) {
    fields.inputBorderRadius =
      typeof fields.inactiveBorderRadius === "object"
        ? { ...fields.inactiveBorderRadius }
        : parseCornerQuad(fields.inactiveBorderRadius);
  }
  delete fields.inactiveBorderWidth;
  delete fields.inactiveBorderRadius;
  return fields;
}

function mapToggleStateColorsToApi(fields, prefix) {
  return {
    backgroundColor: fields[`${prefix}BgColor`] ?? "",
    borderColor: fields[`${prefix}BorderColor`] ?? "",
  };
}

export function migrateCheckboxLegacyKeys(fields = {}) {
  if (fields.checkboxTickColor && !fields.checkboxActiveBgColor) {
    fields.checkboxActiveBgColor = fields.checkboxTickColor;
  }
  if (fields.checkboxBorderColor && !fields.checkboxNormalBorderColor) {
    fields.checkboxNormalBorderColor = fields.checkboxBorderColor;
  }
  delete fields.checkboxTickColor;
  delete fields.checkboxBorderColor;
  delete fields.checkboxBorderRadius;
  return fields;
}

export function migrateRadioLegacyKeys(fields = {}) {
  if (fields.radioFillColor && !fields.radioActiveBgColor) {
    fields.radioActiveBgColor = fields.radioFillColor;
  }
  if (fields.radioBorderColor && !fields.radioNormalBorderColor) {
    fields.radioNormalBorderColor = fields.radioBorderColor;
  }
  delete fields.radioFillColor;
  delete fields.radioBorderColor;
  delete fields.radioBorderRadius;
  return fields;
}

export function applyCheckboxFieldsFromApi(fields, data = {}) {
  const active = data.active && typeof data.active === "object" ? data.active : {};
  const normal =
    data.normal && typeof data.normal === "object"
      ? data.normal
      : data.inactive && typeof data.inactive === "object"
        ? data.inactive
        : {};
  fields.checkboxActiveBgColor =
    data.activeBackgroundColor ??
    active.backgroundColor ??
    data.activeColor ??
    fields.checkboxTickColor ??
    "";
  fields.checkboxActiveBorderColor =
    data.activeBorderColor ?? active.borderColor ?? "";
  fields.checkboxNormalBgColor =
    data.normalBackgroundColor ?? normal.backgroundColor ?? "";
  fields.checkboxNormalBorderColor =
    data.normalBorderColor ??
    normal.borderColor ??
    data.inactiveColor ??
    fields.checkboxBorderColor ??
    "";
  migrateCheckboxLegacyKeys(fields);
}

export function applyRadioFieldsFromApi(fields, data = {}) {
  const active = data.active && typeof data.active === "object" ? data.active : {};
  const normal =
    data.normal && typeof data.normal === "object"
      ? data.normal
      : data.inactive && typeof data.inactive === "object"
        ? data.inactive
        : {};
  fields.radioActiveBgColor =
    data.activeBackgroundColor ??
    active.backgroundColor ??
    data.activeColor ??
    fields.radioFillColor ??
    "";
  fields.radioActiveBorderColor = data.activeBorderColor ?? active.borderColor ?? "";
  fields.radioNormalBgColor =
    data.normalBackgroundColor ?? normal.backgroundColor ?? "";
  fields.radioNormalBorderColor =
    data.normalBorderColor ??
    normal.borderColor ??
    data.inactiveColor ??
    fields.radioBorderColor ??
    "";
  migrateRadioLegacyKeys(fields);
}

export function mapCheckboxSectionToApi(fields = {}, sectionApiId) {
  const merged = migrateCheckboxLegacyKeys({ ...fields });
  return {
    section_id: sectionApiId,
    activeBackgroundColor: merged.checkboxActiveBgColor ?? "",
    activeBorderColor: merged.checkboxActiveBorderColor ?? "",
    normalBackgroundColor: merged.checkboxNormalBgColor ?? "",
    normalBorderColor: merged.checkboxNormalBorderColor ?? "",
  };
}

export function mapRadioSectionToApi(fields = {}, sectionApiId) {
  const merged = migrateRadioLegacyKeys({ ...fields });
  return {
    section_id: sectionApiId,
    activeBackgroundColor: merged.radioActiveBgColor ?? "",
    activeBorderColor: merged.radioActiveBorderColor ?? "",
    normalBackgroundColor: merged.radioNormalBgColor ?? "",
    normalBorderColor: merged.radioNormalBorderColor ?? "",
  };
}

export function migrateDropDownLegacyKeys(fields = {}) {
  if (fields.dropdownBorderWidth != null && typeof fields.dropdownBorderWidth !== "object") {
    fields.dropdownBorderWidth = parseEdgeQuad(fields.dropdownBorderWidth);
  }
  if (fields.dropdownBorderRadius != null && typeof fields.dropdownBorderRadius !== "object") {
    fields.dropdownBorderRadius = parseCornerQuad(fields.dropdownBorderRadius);
  }
  return fields;
}

function syncDropDownToApi(fields) {
  formatEdgeQuadFields(fields, ["dropdownBorderWidth"]);
  formatCornerQuadFields(fields, ["dropdownBorderRadius"]);
}

export function applyDropDownFieldsFromApi(fields, data = {}) {
  const borderFromLegacy = String(data.border || "")
    .replace(/\s*solid\s*$/i, "")
    .trim();
  const widthRaw = data.borderWidth ?? borderFromLegacy ?? fields.dropdownBorderWidth;
  fields.dropdownBorderWidth = parseApiBorderWidth(widthRaw);
  fields.dropdownBorderColor = data.borderColor ?? fields.dropdownBorderColor ?? "";
  fields.dropdownBorderRadius = parseApiBorderRadius(
    data.borderRadius ?? fields.dropdownBorderRadius
  );
  fields.dropdownActiveBgColor =
    data.activeBackgroundColor ??
    data.activeColor ??
    data.backgroundColor ??
    fields.dropdownActiveBgColor ??
    "";
  migrateDropDownLegacyKeys(fields);
}

export function mapDropDownSectionToApi(fields = {}, sectionApiId) {
  const merged = migrateDropDownLegacyKeys({ ...fields });
  return {
    section_id: sectionApiId,
    borderColor: merged.dropdownBorderColor ?? "",
    activeBackgroundColor: merged.dropdownActiveBgColor ?? "",
    borderRadius: cornerQuadToApiBorderRadius(merged.dropdownBorderRadius),
    borderWidth: edgeQuadToApiBorderWidth(merged.dropdownBorderWidth),
  };
}

export function applyInputFieldsFromApi(fields, data = {}) {
  fields.inputBorderColor =
    data.borderColor ?? data.primaryColor ?? fields.inputBorderColor ?? fields.primaryColor ?? "";
  fields.primaryColor = fields.inputBorderColor;
  const widthRaw = data.borderWidth ?? fields.inputBorderWidth ?? fields.inactiveBorderWidth;
  const radiusRaw = data.borderRadius ?? fields.inputBorderRadius ?? fields.inactiveBorderRadius;
  fields.inputBorderWidth = parseApiBorderWidth(widthRaw);
  fields.inputBorderRadius = parseApiBorderRadius(radiusRaw);
  migrateInputFieldsLegacyKeys(fields);
}

export function mapInputFieldsSectionToApi(fields = {}, sectionApiId) {
  const merged = { ...fields };
  migrateInputFieldsLegacyKeys(merged);
  return {
    section_id: sectionApiId,
    borderColor: merged.primaryColor ?? merged.inputBorderColor ?? "",
    borderRadius: cornerQuadToApiBorderRadius(merged.inputBorderRadius),
    borderWidth: edgeQuadToApiBorderWidth(merged.inputBorderWidth),
  };
}

function formatEdgeQuadFields(fields, keys = []) {
  keys.forEach((key) => {
    const raw = fields[key];
    if (raw != null && typeof raw === "object") {
      fields[key] = formatEdgeQuad(raw);
    }
  });
}

function parseEdgeQuadFields(fields, keys = []) {
  keys.forEach((key) => {
    fields[key] = parseEdgeQuad(fields[key]);
  });
}

export function syncInteractiveSharedFieldsToStateBlocks(fields, sectionId) {
  const cfg = INTERACTIVE_SHARED_FIELD_CONFIG[sectionId];
  if (!cfg) return;
  const active = cfg.activePrefix;

  if (cfg.widthKey) {
    const width = formatEdgeQuad(fields[cfg.widthKey]);
    if (width) {
      fields.inactiveBorderWidth = width;
      fields[`${active}BorderWidth`] = width;
    }
  } else if (cfg.edgeWidthKeys) {
    formatEdgeQuadFields(fields, cfg.edgeWidthKeys);
  }

  const radius = formatCornerQuad(fields[cfg.radiusKey]);
  const size = String(fields[cfg.sizeKey] ?? "").trim();
  if (radius) {
    fields.inactiveBorderRadius = radius;
    fields[`${active}BorderRadius`] = radius;
  }
  if (size) {
    fields.inactiveFontSize = size;
    fields[`${active}FontSize`] = size;
  }
}

export function applyInteractiveSharedFieldsFromApi(fields, sectionId, data = {}) {
  const cfg = INTERACTIVE_SHARED_FIELD_CONFIG[sectionId];
  if (!cfg) return;
  const active = cfg.activePrefix;

  if (data.borderRadius != null) {
    fields[cfg.radiusKey] = parseApiBorderRadius(data.borderRadius);
  } else {
    fields[cfg.radiusKey] = parseCornerQuad(
      fields.inactiveBorderRadius || fields[`${active}BorderRadius`]
    );
  }

  if (data.borderWidth != null) {
    const parsed = parseApiBorderWidth(data.borderWidth);
    if (cfg.widthKey) {
      fields[cfg.widthKey] = parsed;
    } else if (cfg.edgeWidthKeys) {
      fields.inactiveBorderWidth = parsed;
      fields.activeBorderWidth = parsed;
      parseEdgeQuadFields(fields, cfg.edgeWidthKeys);
    }
  } else if (cfg.edgeWidthKeys) {
    if (fields.tabBorderWidth != null && fields.tabBorderWidth !== "") {
      const legacy = parseEdgeQuad(fields.tabBorderWidth);
      if (!fields.inactiveBorderWidth || typeof fields.inactiveBorderWidth === "string") {
        fields.inactiveBorderWidth = legacy;
      }
      if (!fields.activeBorderWidth || typeof fields.activeBorderWidth === "string") {
        fields.activeBorderWidth = legacy;
      }
    }
    parseEdgeQuadFields(fields, cfg.edgeWidthKeys);
    delete fields.tabBorderWidth;
  } else if (cfg.widthKey) {
    fields[cfg.widthKey] = parseEdgeQuad(
      fields.inactiveBorderWidth || fields[`${active}BorderWidth`]
    );
  }

  if (data.fontSize != null) {
    fields[cfg.sizeKey] = formatSizeWithUnit(data.fontSize, data.fontSizeUnit);
  } else {
    fields[cfg.sizeKey] = fields.inactiveFontSize || fields[`${active}FontSize`] || "";
  }

  if (data.fontWeight != null) {
    fields.inactiveFontWeight = data.fontWeight;
    fields[`${active}FontWeight`] = data.fontWeight;
  }
}

export const getDefaultSectionsPayload = () => ({
  typography: emptySectionExtra("typography"),
  colorScheme: emptySectionExtra("colorScheme"),
  buttons: emptySectionExtra("buttons"),
  tabs: emptySectionExtra("tabs"),
  tables: emptySectionExtra("tables"),
  inputFields: emptySectionExtra("inputFields"),
  checkbox: emptySectionExtra("checkbox"),
  radioButtons: emptySectionExtra("radioButtons"),
  dropDown: emptySectionExtra("dropDown"),
  exportIcons: emptySectionExtra("exportIcons"),
});

export function mergeDefaultSections(sections) {
  const defaults = getDefaultSectionsPayload();
  if (!sections || typeof sections !== "object") return defaults;

  const out = { ...defaults };
  BRANDING_SECTION_IDS.forEach((id) => {
    out[id] = {
      ...defaults[id],
      ...(typeof sections[id] === "object" && sections[id] !== null
        ? sections[id]
        : {}),
    };
  });
  return out;
}

export function normalizeSectionFields(sectionId, sectionData) {
  const base = emptySectionExtra(sectionId);
  const incomingFields =
    sectionData && typeof sectionData.fields === "object" ? sectionData.fields : {};
  let merged =
    sectionId === "typography"
      ? normalizeTypographyFields({ ...base.fields, ...incomingFields })
      : { ...base.fields, ...incomingFields };

  if (sectionId === "inputFields") {
    merged = migrateInputFieldsLegacyKeys(merged);
  }
  if (sectionId === "checkbox") {
    merged = migrateCheckboxLegacyKeys(merged);
  }
  if (sectionId === "radioButtons") {
    merged = migrateRadioLegacyKeys(merged);
  }
  if (sectionId === "dropDown") {
    merged = migrateDropDownLegacyKeys(merged);
  }
  if (sectionId === "exportIcons") {
    merged = {
      exportIconEntries: normalizeExportIconEntries(merged),
    };
  }
  if (sectionId === "colorScheme") {
    merged = normalizeColorSchemeFields(merged);
    delete merged.accentColor;
    delete merged.backgroundColor;
    delete merged.additionalColorEntries;
  }

  const apiSectionId =
    sectionData?.apiSectionId != null && String(sectionData.apiSectionId).trim() !== ""
      ? sectionData.apiSectionId
      : null;

  const notes =
    typeof sectionData?.notes === "string"
      ? sectionData.notes
      : typeof base.notes === "string"
        ? base.notes
        : "";
  const activeSource = String(
    sectionData?.activeSource ??
      sectionData?.active_source ??
      base.activeSource ??
      "",
  ).trim().toUpperCase();

  const alternatives = normalizeSectionAlternatives(
    sectionData?.alternatives !== undefined
      ? sectionData.alternatives
      : base.alternatives
  );

  const imageReferenceRaw =
    sectionData?.imageReference ?? sectionData?.image_reference ?? base.imageReference;
  const imageReference =
    imageReferenceRaw == null || String(imageReferenceRaw).trim() === ""
      ? null
      : String(imageReferenceRaw).trim();

  const extractedPrimary =
    sectionData?.extractedPrimary &&
    typeof sectionData.extractedPrimary === "object" &&
    !Array.isArray(sectionData.extractedPrimary)
      ? { ...sectionData.extractedPrimary }
      : base.extractedPrimary &&
          typeof base.extractedPrimary === "object" &&
          !Array.isArray(base.extractedPrimary)
        ? { ...base.extractedPrimary }
        : null;

  return {
    ...base,
    fields: merged,
    notes,
    activeSource,
    alternatives,
    imageReference,
    extractedPrimary,
    ...(apiSectionId != null ? { apiSectionId } : {}),
  };
}

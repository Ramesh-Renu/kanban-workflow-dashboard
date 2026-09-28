/** Branding Guidelines v2 — API formatting & mappers */

import {
  BRANDING_SECTION_IDS,
  BRANDING_UI_TO_API_SECTION,
} from "./constants.js";
import { extractApiSectionIdFromPayload, normalizeCustomerBrandingInput, resolveApiSectionId } from "./attachments.js";
import {
  applyCheckboxFieldsFromApi,
  applyDropDownFieldsFromApi,
  applyInputFieldsFromApi,
  applyInteractiveSharedFieldsFromApi,
  applyRadioFieldsFromApi,
  applyTablesFieldsFromApi,
  cornerQuadToApiBorderRadius,
  createExportIconEntry,
  edgeQuadToApiBorderWidth,
  mapCheckboxSectionToApi,
  mapDropDownSectionToApi,
  mapExportIconsToApi,
  mapInputFieldsSectionToApi,
  mapRadioSectionToApi,
  normalizeBrandingColorList,
  normalizeColorSchemeFields,
  normalizeExportIconEntries,
  normalizeSectionFields,
  normalizeTypographyFields,
  normalizeTypographyFontNames,
  resolveLanguageKeyFromApi,
  resolveLanguageLabel,
  syncInteractiveSharedFieldsToStateBlocks,
} from "./sections.js";
import {
  formatSizeWithUnit,
  isCompleteHexColor,
  normalizeFontWeightValue,
  parseFormattedFontSize,
  parseSizeWithUnit,
} from "./inputUtils.js";
import { resolveSectionImageReference } from "./alternatives.js";

/** Normalizes API `languages[].fontFiles` into form `fontFilesByLanguage` entries. */
export function normalizeTypographyFontFilesFromApi(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (!source || typeof source !== "object") return null;
  const blobName = String(source.blobName ?? source.blob_name ?? "").trim();
  const fileName = String(source.fileName ?? source.file_name ?? "").trim();
  if (!blobName && !fileName) return null;
  return {
    blobName,
    blobUri: String(source.blobUri ?? source.blob_uri ?? "").trim(),
    createdDate: source.createdDate ?? source.created_date ?? "",
    fileName,
    fileType: String(source.fileType ?? source.file_type ?? "").trim(),
    fileUploadPath: String(source.fileUploadPath ?? source.file_upload_path ?? "").trim(),
  };
}

function parseLooseFontSize(value) {
  const parsed = parseFormattedFontSize(value);
  return { fontSize: parsed.size, fontSizeUnit: parsed.unit };
}

function mapTextFormattingToApi(formats) {
  const list = Array.isArray(formats) ? formats : [];
  return {
    textTransform: list.includes("uppercase")
      ? "uppercase"
      : list.includes("lowercase")
        ? "lowercase"
        : list.includes("capitalize")
          ? "capitalize"
          : "none",
    fontWeight: list.includes("bold") ? "bold" : "none",
    fontStyle: list.includes("italic") ? "italic" : "normal",
    textDecoration: list.includes("underline") ? "underline" : "none",
  };
}

/** API may send null for nested blocks (inactive, active, header, body, heading). */
function coerceApiObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function mapTextFormattingFromApi(fmt) {
  const safe = coerceApiObject(fmt);
  const out = [];
  const transform = String(safe.textTransform || "").toLowerCase();
  if (transform === "uppercase") out.push("uppercase");
  else if (transform === "lowercase") out.push("lowercase");
  else if (transform === "capitalize") out.push("capitalize");
  if (String(safe.fontWeight) === "bold" || safe.fontWeight === 600) out.push("bold");
  if (String(safe.fontStyle).toLowerCase() === "italic") out.push("italic");
  if (String(safe.textDecoration).toLowerCase() === "underline") out.push("underline");
  return out;
}

function configMethodFromApi(type) {
  return Number(type) === 2 ? "code" : "standard";
}

function mapStateBlockFromApi(block, prefix) {
  const safe = coerceApiObject(block);
  const size = formatSizeWithUnit(safe.fontSize, safe.fontSizeUnit);
  return {
    [`${prefix}BgColor`]: safe.backgroundColor ?? "",
    [`${prefix}FontColor`]: safe.fontColor ?? "",
    [`${prefix}FontSize`]: size || safe.fontSize || "",
    [`${prefix}FontWeight`]: safe.fontWeight ?? "",
    [`${prefix}BorderColor`]: safe.borderColor ?? "",
    [`${prefix}BorderWidth`]: safe.borderWidth ?? "",
    [`${prefix}BorderRadius`]: safe.borderRadius ?? "",
  };
}

function colorToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((c) => String(c ?? "").trim())
      .filter((c) => c && isCompleteHexColor(c));
  }
  const s = String(value).trim();
  return s && isCompleteHexColor(s) ? [s] : [];
}

/** Merges API default + add-on/alternative color arrays into a single ordered UI list. */
function mergeColorSchemeListFromApi(primary, primaryAddOn) {
  const primaryList = colorsArrayFromApi(primary);
  const addOnList = colorsArrayFromApi(primaryAddOn);

  if (addOnList.length > 0) {
    const defaultColor = primaryList[0] ?? "";
    // Keep default first, then extras; drop duplicates of the default from add-ons.
    const rest = addOnList.filter(
      (hex) =>
        String(hex).trim().toLowerCase() !==
        String(defaultColor).trim().toLowerCase()
    );
    return normalizeBrandingColorList(
      [defaultColor, ...rest].filter(Boolean)
    );
  }

  return normalizeBrandingColorList(primaryList);
}

function resolveColorSchemeAddOnFromApi(data, which = "primary") {
  if (!data || typeof data !== "object") return [];
  if (which === "primary") {
    return data.primaryAddOn ?? data.alternatives?.primary ?? null;
  }
  return data.secondaryAddOn ?? data.alternatives?.secondary ?? null;
}

/** Default color list for API (index 0 only). */
function defaultColorsForApi(colorList) {
  const complete = colorToArray(colorList);
  return complete.length === 0 ? [] : [complete[0]];
}

/** Extra swatches (index 1+) for colors.alternatives.{primary|secondary}. */
function alternativeColorsForApi(colorList) {
  const complete = colorToArray(colorList);
  if (complete.length <= 1) return null;
  return complete.slice(1);
}

function buildColorSchemeAlternativesForApi(primaryList, secondaryList) {
  return {
    primary: alternativeColorsForApi(primaryList),
    secondary: alternativeColorsForApi(secondaryList),
  };
}

export function colorFromArray(arr) {
  if (!arr) return "";
  if (Array.isArray(arr)) return arr[0] ?? "";
  return String(arr);
}

/** Flattens API color arrays (primary, secondary) into hex strings. */
function colorsArrayFromApi(value) {
  if (value == null || value === "") return [];
  const arr = Array.isArray(value) ? value : [value];
  const out = [];
  arr.forEach((item) => {
    if (Array.isArray(item)) {
      item.forEach((c) => {
        const s = String(c ?? "").trim();
        if (s) out.push(s);
      });
    } else {
      const s = String(item ?? "").trim();
      if (s) out.push(s);
    }
  });
  return out;
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


function resolveTypographyFontWeightForApi(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  return normalizeFontWeightValue(value) || "";
}

function mapTypographyToApi(
  fields,
  sectionApiId,
  languageList = [],
  fontFamilyList = [],
  typographyFontOptions = {}
) {
  const normalized = normalizeTypographyFontNames(fields, fontFamilyList);
  const heading = parseSizeWithUnit(normalized.headingFontSize);
  const body = parseSizeWithUnit(normalized.bodyFontSize);
  const {
    pendingTypographyFontFiles = {},
  } = typographyFontOptions;

  const headingBlock = {
    fontSize: heading.fontSize,
    fontSizeUnit: heading.fontSizeUnit,
    fontColor: normalized.headingColor ?? "",
    fontWeight: resolveTypographyFontWeightForApi(normalized.headingFontWeight),
  };
  if (normalized.headingTextFormatting) {
    headingBlock.textFormatting = mapTextFormattingToApi(normalized.headingTextFormatting);
  }

  return {
    section_id: sectionApiId,
    languages: normalized.languages.map((langId) => {
      const langKey = String(langId);
      const pendingFile =
        pendingTypographyFontFiles[langKey] ?? pendingTypographyFontFiles[langId];
      const entry = {
        language: resolveLanguageLabel(langId, languageList),
        fontFamily: normalized.fontStylesByLanguage[langId] ?? "",
      };
      if (pendingFile instanceof File) {
        entry.fileName = pendingFile.name;
      }
      return entry;
    }),
    heading: headingBlock,
    body: {
      fontSize: body.fontSize,
      fontSizeUnit: body.fontSizeUnit,
      fontColor: normalized.bodyColor ?? "",
    },
  };
}

function mapTypographyFromApi(data = {}, languageList = []) {
  const heading = coerceApiObject(data?.heading);
  const body = coerceApiObject(data?.body);
  const languages = [];
  const fontStylesByLanguage = {};
  const fontFilesByLanguage = {};
  const fileReferenceParamByLanguage = {};

  if (Array.isArray(data.languages)) {
    data.languages.forEach((item) => {
      const langRaw = String(item.language ?? item.languageId ?? item.id ?? "").trim();
      if (!langRaw) return;
      const langId = resolveLanguageKeyFromApi(langRaw, languageList) || langRaw;
      languages.push(langId);
      fontStylesByLanguage[langId] = String(item.fontFamily ?? item.font_name ?? "").trim();
      const fontFiles = normalizeTypographyFontFilesFromApi(item.fontFiles ?? item.font_files);
      if (fontFiles) {
        fontFilesByLanguage[langId] = fontFiles;
      }
      const fileReferenceParam =
        item.fileReferenceParam ??
        item.file_reference_param ??
        item.attachmentParam ??
        item.attachment_param;
      if (fileReferenceParam != null && String(fileReferenceParam).trim() !== "") {
        fileReferenceParamByLanguage[langId] = String(fileReferenceParam).trim();
      }
    });
  } else if (data.language != null && String(data.language).trim() !== "") {
    const langId =
      resolveLanguageKeyFromApi(data.language, languageList) || String(data.language);
    languages.push(langId);
    fontStylesByLanguage[langId] = String(data.fontFamily ?? "").trim();
    const fontFiles = normalizeTypographyFontFilesFromApi(data.fontFiles ?? data.font_files);
    if (fontFiles) {
      fontFilesByLanguage[langId] = fontFiles;
    }
    const fileReferenceParam =
      data.fileReferenceParam ??
      data.file_reference_param ??
      data.attachmentParam ??
      data.attachment_param;
    if (fileReferenceParam != null && String(fileReferenceParam).trim() !== "") {
      fileReferenceParamByLanguage[langId] = String(fileReferenceParam).trim();
    }
  }

  return normalizeTypographyFields({
    languages,
    fontStylesByLanguage,
    fontFilesByLanguage,
    fileReferenceParamByLanguage,
    headingFontSize: formatSizeWithUnit(heading.fontSize, heading.fontSizeUnit),
    headingFontWeight: resolveTypographyFontWeightForApi(heading.fontWeight),
    headingTextFormatting: heading.textFormatting
      ? mapTextFormattingFromApi(heading.textFormatting)
      : [],
    headingColor: heading.fontColor ?? "",
    bodyFontSize: formatSizeWithUnit(body.fontSize, body.fontSizeUnit),
    bodyColor: body.fontColor ?? "",
  });
}

function mapColorStateBlockToApi(fields, prefix) {
  return {
    backgroundColor: fields[`${prefix}BgColor`] ?? fields.backgroundColor ?? "",
    fontColor:
      fields[`${prefix}FontColor`] ??
      fields[`${prefix}TextColor`] ??
      fields.fontColor ??
      "",
    borderColor: fields[`${prefix}BorderColor`] ?? fields.borderColor ?? "",
  };
}

function mapTableRegionToApi(fields, prefix, formattingKey) {
  const block = {
    backgroundColor: fields[`${prefix}BgColor`] ?? "",
    fontColor:
      fields[`${prefix}TextColor`] ?? fields[`${prefix}FontColor`] ?? "",
    borderColor: fields[`${prefix}BorderColor`] ?? "",
    ...prefix !== "header" && {
      borderWidth: edgeQuadToApiBorderWidth(fields[`${prefix}BorderWidth`]),
    }
  };
  if (formattingKey && fields[formattingKey]) {
    block.textFormatting = mapTextFormattingToApi(fields[formattingKey]);
  }
  return block;
}

function mapInteractiveSectionToApi(sectionId, fields, sectionApiId) {
  const formattingKey =
    sectionId === "buttons"
      ? "buttonTextFormatting"
      : sectionId === "tabs"
        ? "tabTextFormatting"
        : "headerTextFormatting";
  const sizeKey =
    sectionId === "buttons" ? "buttonFontSize" : sectionId === "tabs" ? "tabFontSize" : null;
  const radiusKey =
    sectionId === "buttons"
      ? "buttonBorderRadius"
      : sectionId === "tabs"
        ? "tabBorderRadius"
        : "tableBorderRadius";
  const widthKey = sectionId === "buttons" ? "buttonBorderWidth" : null;

  const payload = {
    section_id: sectionApiId,
  };

  if (sectionId === "tables") {
    payload.borderRadius = cornerQuadToApiBorderRadius(fields.tableBorderRadius);
    payload.header = mapTableRegionToApi(fields, "header", "headerTextFormatting");
    payload.body = mapTableRegionToApi(fields, "row", "rowTextFormatting");
    // Payload-only: mirror body borderWidth onto header (UI keeps them independent).
    if (payload.body?.borderWidth != null) {
      payload.header.borderWidth = payload.body.borderWidth;
    }
    payload.oddRowBackground = fields.oddRowBgColor ?? "";
    payload.evenRowBackground = fields.evenRowBgColor ?? "";
    return payload;
  }

  if (sectionId === "buttons" || sectionId === "tabs") {
    syncInteractiveSharedFieldsToStateBlocks(fields, sectionId);
    const activePrefix = sectionId === "buttons" ? "hover" : "active";
    payload.inactive = mapColorStateBlockToApi(fields, "inactive");
    payload.active = mapColorStateBlockToApi(fields, activePrefix);
    const rawSize =
      fields[sizeKey] ?? fields.inactiveFontSize ?? fields[`${activePrefix}FontSize`];
    const size = parseLooseFontSize(String(rawSize ?? "").trim());
    payload.fontSize = size.fontSize;
    payload.fontSizeUnit = size.fontSizeUnit;
    if (fields[formattingKey]) {
      payload.textFormatting = mapTextFormattingToApi(fields[formattingKey]);
    }
    payload.borderRadius = cornerQuadToApiBorderRadius(fields[radiusKey]);
    if (widthKey) {
      payload.borderWidth = edgeQuadToApiBorderWidth(fields[widthKey]);
    } else {
      payload.borderWidth = edgeQuadToApiBorderWidth(
        fields.activeBorderWidth ?? fields.inactiveBorderWidth
      );
    }
    return payload;
  }

  return payload;
}

function mapInteractiveSectionFromApi(sectionId, data = {}) {
  const fields = {
    configurationMethod: configMethodFromApi(data.configMethodType),
  };
  if (fields.configurationMethod === "code") {
    if (sectionId === "buttons") fields.buttonParametersCode = data.parametersCode ?? "";
    if (sectionId === "tabs") fields.tabParametersCode = data.parametersCode ?? "";
    if (sectionId === "tables") fields.tableParametersCode = data.parametersCode ?? "";
    return fields;
  }

  Object.assign(fields, mapStateBlockFromApi(data.inactive, "inactive"));

  if (sectionId === "buttons") {
    Object.assign(fields, {
      hoverBgColor: data.active?.backgroundColor ?? "",
      hoverFontColor: data.active?.fontColor ?? "",
      hoverBorderColor: data.active?.borderColor ?? "",
    });
    applyInteractiveSharedFieldsFromApi(fields, "buttons", data);
    if (data.textFormatting) {
      fields.buttonTextFormatting = mapTextFormattingFromApi(data.textFormatting);
    }
  } else if (sectionId === "tabs") {
    Object.assign(fields, mapStateBlockFromApi(data.active, "active"));
    applyInteractiveSharedFieldsFromApi(fields, "tabs", data);
    if (data.textFormatting) {
      fields.tabTextFormatting = mapTextFormattingFromApi(data.textFormatting);
    }
  } else if (sectionId === "tables") {
    Object.assign(
      fields,
      mapStateBlockFromApi(data.header, "header"),
      mapStateBlockFromApi(data.body, "row")
    );
    fields.headerTextColor = data.header?.fontColor ?? fields.headerTextColor ?? fields.headerFontColor ?? "";
    fields.rowTextColor = data.body?.fontColor ?? fields.rowTextColor ?? fields.rowFontColor ?? "";
    fields.oddRowBgColor = data.oddRowBackground ?? "";
    fields.evenRowBgColor = data.evenRowBackground ?? "";
    applyTablesFieldsFromApi(fields, data);
    if (data.header?.textFormatting) {
      fields.headerTextFormatting = mapTextFormattingFromApi(data.header.textFormatting);
    }
    if (data.body?.textFormatting) {
      fields.rowTextFormatting = mapTextFormattingFromApi(data.body.textFormatting);
    }
  }

  return fields;
}

function withActiveSource(payload, section = {}) {
  return {
    ...payload,
    activeSource: String(section?.activeSource ?? "").trim().toUpperCase(),
  };
}

/** Adds optional alternatives + imageReference when present on the section. */
function withSectionExtras(payload, section = {}) {
  const next = withActiveSource(payload, section);
  const alternatives = section?.alternatives;
  if (Array.isArray(alternatives) && alternatives.length > 0) {
    next.alternatives = alternatives;
  } else if (
    alternatives &&
    typeof alternatives === "object" &&
    !Array.isArray(alternatives)
  ) {
    next.alternatives = alternatives;
  }
  const imageReference = String(section?.imageReference ?? "").trim();
  if (imageReference) {
    next.imageReference = imageReference;
  }
  return next;
}

export function mapSectionsToApiPayload(sections = {}, options = {}) {
  const s = sections || {};
  const {
    languageList = [],
    fontFamilyList = [],
    pendingTypographyFontFiles = {},
    typographySectionAttachments = [],
    deletedAttachmentIds = [],
  } = options;
  const typographyFields = s.typography?.fields || {};
  const colorFields = normalizeColorSchemeFields(s.colorScheme?.fields || {});
  const colorsPayload = withSectionExtras(
    {
      section_id: resolveApiSectionId("colorScheme", s),
      primary: defaultColorsForApi(colorFields.primaryColor),
      secondary: defaultColorsForApi(colorFields.secondaryColor),
    },
    s.colorScheme,
  );
  // First swatch = default; remaining multi-select colors go in alternatives.
  colorsPayload.alternatives = buildColorSchemeAlternativesForApi(
    colorFields.primaryColor,
    colorFields.secondaryColor
  );

  return {
    typography: withSectionExtras(
      mapTypographyToApi(
        typographyFields,
        resolveApiSectionId("typography", s),
        languageList,
        fontFamilyList,
        {
          pendingTypographyFontFiles,
          typographySectionAttachments,
          deletedAttachmentIds,
        }
      ),
      s.typography,
    ),
    colors: colorsPayload,
    buttons: withSectionExtras(
      mapInteractiveSectionToApi(
        "buttons",
        s.buttons?.fields || {},
        resolveApiSectionId("buttons", s)
      ),
      s.buttons,
    ),
    tabs: withSectionExtras(
      mapInteractiveSectionToApi(
        "tabs",
        s.tabs?.fields || {},
        resolveApiSectionId("tabs", s)
      ),
      s.tabs,
    ),
    tables: withSectionExtras(
      mapInteractiveSectionToApi(
        "tables",
        s.tables?.fields || {},
        resolveApiSectionId("tables", s)
      ),
      s.tables,
    ),
    inputFields: withSectionExtras(
      mapInputFieldsSectionToApi(
        s.inputFields?.fields || {},
        resolveApiSectionId("inputFields", s)
      ),
      s.inputFields,
    ),
    checkbox: withSectionExtras(
      mapCheckboxSectionToApi(
        s.checkbox?.fields || {},
        resolveApiSectionId("checkbox", s)
      ),
      s.checkbox,
    ),
    radioButton: withSectionExtras(
      mapRadioSectionToApi(
        s.radioButtons?.fields || {},
        resolveApiSectionId("radioButtons", s)
      ),
      s.radioButtons,
    ),
    dropdown: withSectionExtras(
      mapDropDownSectionToApi(
        s.dropDown?.fields || {},
        resolveApiSectionId("dropDown", s)
      ),
      s.dropDown,
    ),
    exportIcons: withSectionExtras(
      mapExportIconsToApi(
        s.exportIcons?.fields || {},
        resolveApiSectionId("exportIcons", s),
        { deletedAttachmentIds: options.deletedAttachmentIds || [] }
      ),
      s.exportIcons,
    ),
    guidelineNotes: options.guidelineNotes ?? "",
  };
}

export function mapApiCustomerBrandingToSections(customerBranding, languageList = []) {
  const flow = normalizeCustomerBrandingInput(customerBranding);
  const sections = {};

  BRANDING_SECTION_IDS.forEach((uiId) => {
    const apiKey = BRANDING_UI_TO_API_SECTION[uiId];
    const data = flow[apiKey];
    let fields = {};
    let sectionNotes = "";

    if (uiId === "typography" && data) {
      fields = mapTypographyFromApi(data, languageList);
      sectionNotes = data.notes ?? "";
    } else if (uiId === "colorScheme" && data) {
      fields = normalizeColorSchemeFields({
        primaryColor: mergeColorSchemeListFromApi(
          data.primary,
          resolveColorSchemeAddOnFromApi(data, "primary")
        ),
        secondaryColor: mergeColorSchemeListFromApi(
          data.secondary,
          resolveColorSchemeAddOnFromApi(data, "secondary")
        ),
      });
      sectionNotes = data.notes ?? "";
    } else if (
      (uiId === "buttons" || uiId === "tabs" || uiId === "tables") &&
      data
    ) {
      fields = mapInteractiveSectionFromApi(uiId, data);
      sectionNotes = data.notes ?? "";
    } else if (uiId === "inputFields" && data) {
      fields = {};
      applyInputFieldsFromApi(fields, data);
      sectionNotes = data.notes ?? "";
    } else if (uiId === "checkbox" && data) {
      fields = {};
      applyCheckboxFieldsFromApi(fields, data);
      sectionNotes = data.notes ?? "";
    } else if (uiId === "radioButtons" && data) {
      fields = {};
      applyRadioFieldsFromApi(fields, data);
      sectionNotes = data.notes ?? "";
    } else if (uiId === "dropDown" && data) {
      fields = {};
      applyDropDownFieldsFromApi(fields, data);
      sectionNotes = data.notes ?? "";
    } else if (uiId === "exportIcons" && data) {
      const names = [];
      if (Array.isArray(data.iconName)) {
        data.iconName.forEach((n) => {
          if (n != null && String(n).trim()) names.push(String(n));
        });
      } else {
        const icons = Array.isArray(data)
          ? data
          : Array.isArray(data.icons)
            ? data.icons
            : Array.isArray(data.items)
              ? data.items
              : data?.iconName != null
                ? [data]
                : [];
        icons.forEach((item) => {
          if (typeof item === "string" && item.trim()) {
            names.push(item);
          } else if (Array.isArray(item?.iconName)) {
            item.iconName.forEach((n) => names.push(n));
          } else if (item?.iconName != null && String(item.iconName).trim()) {
            names.push(item.iconName);
          }
        });
      }
      fields = {
        exportIconEntries:
          names.length > 0
            ? names.map((name) => createExportIconEntry(name))
            : [createExportIconEntry()],
      };
      sectionNotes = data.notes ?? "";
    }

    const resolvedImageReference = resolveSectionImageReference(data);
    const base = normalizeSectionFields(uiId, {
      fields,
      notes: sectionNotes,
      activeSource: data?.activeSource ?? data?.active_source ?? "",
      alternatives: data?.alternatives,
      imageReference: resolvedImageReference || null,
    });
    const apiSectionId =
      uiId === "exportIcons" && Array.isArray(data)
        ? null
        : extractApiSectionIdFromPayload(data);
    if (apiSectionId != null) {
      base.apiSectionId = apiSectionId;
    }
    if (data?.attachments) {
      base.attachments = Array.isArray(data.attachments) ? data.attachments : [];
    }
    sections[uiId] = base;
  });

  return {
    sections,
    commentsBySection: {},
  };
}

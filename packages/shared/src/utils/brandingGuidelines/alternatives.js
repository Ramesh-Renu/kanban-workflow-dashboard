/** Branding Guidelines — scraper alternatives + imageReference helpers */

import { isCompleteHexColor } from "./inputUtils.js";

/** UI color field key → path inside an API-shaped alternative object. */
const COLOR_FIELD_API_PATHS = {
  inactiveBgColor: ["inactive", "backgroundColor"],
  inactiveFontColor: ["inactive", "fontColor"],
  inactiveBorderColor: ["inactive", "borderColor"],
  hoverBgColor: ["active", "backgroundColor"],
  hoverFontColor: ["active", "fontColor"],
  hoverBorderColor: ["active", "borderColor"],
  activeBgColor: ["active", "backgroundColor"],
  activeFontColor: ["active", "fontColor"],
  activeBorderColor: ["active", "borderColor"],
  headerBgColor: ["header", "backgroundColor"],
  headerFontColor: ["header", "fontColor"],
  headerTextColor: ["header", "fontColor"],
  headerBorderColor: ["header", "borderColor"],
  rowBgColor: ["body", "backgroundColor"],
  rowFontColor: ["body", "fontColor"],
  rowTextColor: ["body", "fontColor"],
  rowBorderColor: ["body", "borderColor"],
  oddRowBgColor: ["oddRowBackground"],
  evenRowBgColor: ["evenRowBackground"],
  // checkbox / radio / input / dropdown shared color keys (API often mirrors UI flat keys)
  checkedBgColor: ["checked", "backgroundColor"],
  checkedBorderColor: ["checked", "borderColor"],
  uncheckedBgColor: ["unchecked", "backgroundColor"],
  uncheckedBorderColor: ["unchecked", "borderColor"],
  focusBorderColor: ["focus", "borderColor"],
  labelFontColor: ["label", "fontColor"],
  placeholderFontColor: ["placeholder", "fontColor"],
  inputBgColor: ["backgroundColor"],
  inputBorderColor: ["borderColor"],
  inputFontColor: ["fontColor"],
};

function normalizeHex(value) {
  const s = String(value ?? "").trim();
  return s && isCompleteHexColor(s) ? s : "";
}

function readPath(obj, path = []) {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

function firstHexFromValue(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hex = normalizeHex(item);
      if (hex) return hex;
    }
    return "";
  }
  return normalizeHex(value);
}

function collectHexesFromValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeHex).filter(Boolean);
  }
  const single = normalizeHex(value);
  return single ? [single] : [];
}

function hexListHasValue(list, hex) {
  const target = normalizeHex(hex).toLowerCase();
  if (!target) return false;
  return collectHexesFromValue(list).some((item) => item.toLowerCase() === target);
}

/**
 * API may return alternatives as an array of candidate objects, or as a single
 * object (e.g. colors `{ primary, secondary }` / typography `{ heading, body }`).
 */
export function asAlternativesEntries(alternatives) {
  if (Array.isArray(alternatives)) {
    return alternatives.filter(
      (item) => item != null && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (alternatives != null && typeof alternatives === "object") {
    return [alternatives];
  }
  return [];
}

/**
 * Preserves API alternatives (array or object). Empty / invalid → [].
 */
export function normalizeSectionAlternatives(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter(
      (item) => item != null && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (typeof value === "object") {
    return value;
  }
  return [];
}

export function sectionHasAlternatives(alternatives) {
  if (Array.isArray(alternatives)) return alternatives.length > 0;
  return Boolean(alternatives && typeof alternatives === "object");
}

/**
 * Resolves a Figma scraper imageReference URL for a section.
 * Prefer section-level `imageReference`; for typography the API often only
 * sets refs on nested `heading` / `body` blocks.
 */
export function resolveSectionImageReference(sectionOrApiData) {
  if (!sectionOrApiData || typeof sectionOrApiData !== "object") return "";

  const direct = String(
    sectionOrApiData.imageReference ?? sectionOrApiData.image_reference ?? "",
  ).trim();
  if (direct) return direct;

  const headingRef = String(
    sectionOrApiData.heading?.imageReference ??
      sectionOrApiData.heading?.image_reference ??
      "",
  ).trim();
  if (headingRef) return headingRef;

  const bodyRef = String(
    sectionOrApiData.body?.imageReference ??
      sectionOrApiData.body?.image_reference ??
      "",
  ).trim();
  return bodyRef;
}

/**
 * Reads a color for a UI field key from one alternative (API-shaped or UI-shaped).
 */
export function readAlternativeColorForField(alternative, fieldKey) {
  if (!alternative || typeof alternative !== "object" || !fieldKey) return "";

  const path = COLOR_FIELD_API_PATHS[fieldKey];
  if (path) {
    const fromPath = firstHexFromValue(readPath(alternative, path));
    if (fromPath) return fromPath;
  }

  if (alternative.fields && typeof alternative.fields === "object") {
    const fromFields = firstHexFromValue(alternative.fields[fieldKey]);
    if (fromFields) return fromFields;
  }

  return firstHexFromValue(alternative[fieldKey]);
}

/**
 * Unique hex alternatives for a color field, optionally prepending the extracted primary.
 */
export function getColorAlternativesForField(section, fieldKey) {
  const alternatives = asAlternativesEntries(section?.alternatives);
  const out = [];
  const seen = new Set();

  const push = (hex) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };

  const extracted =
    section?.extractedPrimary && typeof section.extractedPrimary === "object"
      ? section.extractedPrimary
      : null;
  if (extracted) {
    const extractedColor = extracted[fieldKey];
    const currentColor = section?.fields?.[fieldKey];
    if (
      normalizeHex(extractedColor) &&
      !hexListHasValue(currentColor, extractedColor)
    ) {
      push(extractedColor);
    }
  }

  alternatives.forEach((alt) => {
    // Object-shaped color alternatives may nest under primary/secondary keys.
    if (fieldKey === "primaryColor" || fieldKey === "secondaryColor") {
      const which = fieldKey === "primaryColor" ? "primary" : "secondary";
      collectHexesFromValue(alt[which] ?? alt[fieldKey]).forEach(push);
    }
    push(readAlternativeColorForField(alt, fieldKey));
  });

  return out;
}

/**
 * Unique hex alternatives for color-scheme primary or secondary from section.alternatives.
 * which — "primary" | "secondary"
 */
export function getColorSchemeFieldAlternatives(section, which = "primary") {
  const alternatives = asAlternativesEntries(section?.alternatives);
  const out = [];
  const seen = new Set();
  const isPrimary = which === "primary";

  const push = (hex) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };

  const currentList = isPrimary
    ? section?.fields?.primaryColor
    : section?.fields?.secondaryColor;

  const extracted =
    section?.extractedPrimary && typeof section.extractedPrimary === "object"
      ? section.extractedPrimary
      : null;
  if (extracted) {
    const extractedList = isPrimary ? extracted.primaryColor : extracted.secondaryColor;
    const extractedHex = firstHexFromValue(extractedList);
    // Only surface extracted color when it is not already in the current list
    // (avoids showing an "Alternatives" row after mere reorder of the same swatches).
    if (extractedHex && !hexListHasValue(currentList, extractedHex)) {
      push(extractedHex);
    }
  }

  alternatives.forEach((alt) => {
    if (!alt || typeof alt !== "object") return;
    const fields = alt.fields && typeof alt.fields === "object" ? alt.fields : null;
    if (isPrimary) {
      collectHexesFromValue(
        fields?.primaryColor ?? alt.primary ?? alt.primaryColor
      ).forEach(push);
    } else {
      collectHexesFromValue(
        fields?.secondaryColor ?? alt.secondary ?? alt.secondaryColor
      ).forEach(push);
    }
  });

  // Don't list colors already chosen in the active primary/secondary list.
  return out.filter((hex) => !hexListHasValue(currentList, hex));
}

function collectFontFromLanguageEntry(item) {
  return String(item?.fontFamily ?? item?.font_name ?? item?.fontName ?? "").trim();
}

function languageMatches(itemLang, languageId, languageLabel) {
  const raw = String(itemLang ?? "").trim();
  if (!raw) return true;
  const langKey = String(languageId ?? "").trim();
  const langLabel = String(languageLabel ?? "").trim().toLowerCase();
  if (langKey && raw === langKey) return true;
  if (langLabel && raw.toLowerCase() === langLabel) return true;
  return false;
}

function collectFontsFromBlock(block, push) {
  if (!block || typeof block !== "object") return;
  const fonts = block.fontFamily ?? block.font_family ?? block.fontStyles;
  if (Array.isArray(fonts)) {
    fonts.forEach((font) => push(font));
    return;
  }
  push(fonts);
}

/**
 * Unique font-family strings from typography.alternatives for a language.
 * Supports array candidates and object-shaped API `{ heading, body }`.
 * languageId — UI language key; languageLabel — optional API language label to match.
 */
export function getTypographyFontAlternatives(section, languageId, languageLabel = "") {
  const alternatives = asAlternativesEntries(section?.alternatives);
  const out = [];
  const seen = new Set();
  const langKey = String(languageId ?? "").trim();
  const currentFont = String(
    section?.fields?.fontStylesByLanguage?.[langKey] ?? ""
  )
    .trim()
    .toLowerCase();

  const push = (font) => {
    const name = String(font ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    if (currentFont && key === currentFont) return;
    seen.add(key);
    out.push(name);
  };

  const extracted =
    section?.extractedPrimary && typeof section.extractedPrimary === "object"
      ? section.extractedPrimary
      : null;
  if (extracted?.fontStylesByLanguage && langKey) {
    const extractedFont = extracted.fontStylesByLanguage[langKey];
    if (
      String(extractedFont ?? "").trim() &&
      String(extractedFont ?? "").trim().toLowerCase() !== currentFont
    ) {
      push(extractedFont);
    }
  }

  alternatives.forEach((alt) => {
    if (!alt || typeof alt !== "object") return;

    const fields = alt.fields && typeof alt.fields === "object" ? alt.fields : null;
    const styleMap = fields?.fontStylesByLanguage || alt.fontStylesByLanguage;
    if (styleMap && typeof styleMap === "object" && langKey) {
      push(styleMap[langKey]);
    }

    if (Array.isArray(alt.languages)) {
      alt.languages.forEach((item) => {
        const itemLang = item?.language ?? item?.languageId ?? item?.id ?? "";
        if (!languageMatches(itemLang, languageId, languageLabel)) return;
        push(collectFontFromLanguageEntry(item));
      });
    }

    // Object-shaped scraper payload: heading / body fontFamily arrays
    collectFontsFromBlock(alt.heading ?? alt.Heading, push);
    collectFontsFromBlock(alt.body ?? alt.Body, push);
    collectFontsFromBlock(fields?.heading, push);
    collectFontsFromBlock(fields?.body, push);
  });

  return out;
}

/** Branding Guidelines v2 — input sanitizers & dimensions */

import {
  BRANDING_BORDER_RADIUS_LIMITS,
  BRANDING_BORDER_WIDTH_LIMITS,
  BRANDING_FONT_SIZE_LIMITS,
  BRANDING_FONT_SIZE_UNIT_PATTERN,
  BRANDING_FONT_WEIGHT_LIMITS,
  FONT_SIZE_MAX_DECIMAL_PLACES,
  VALID_FONT_WEIGHTS,
} from "./constants.js";

/** True when the unit supports decimal font-size values. */
export function fontSizeUnitAllowsDecimals(unit = "px") {
  const normalized = String(unit || "px").toLowerCase();
  return (
    normalized === "px" ||
    normalized === "%" ||
    normalized === "rem" ||
    normalized === "em"
  );
}

/** Restrict font-size typing: integers or decimals depending on the selected unit. */
export function sanitizeFontSizeTyping(raw, unit = "px") {
  const normalizedUnit = String(unit || "px").toLowerCase();
  let next = String(raw ?? "").replace(/[^\d.]/g, "");

  if (fontSizeUnitAllowsDecimals(normalizedUnit)) {
    const dotIndex = next.indexOf(".");
    if (dotIndex !== -1) {
      const intPart = next.slice(0, dotIndex + 1);
      const decPart = next
        .slice(dotIndex + 1)
        .replace(/\./g, "")
        .slice(0, FONT_SIZE_MAX_DECIMAL_PLACES);
      next = `${intPart}${decPart}`;
    }
    return next;
  }

  if (next.includes(".")) {
    next = next.split(".")[0];
  }
  return next.replace(/\D/g, "");
}

/** Restrict font-weight typing to digits only (max 3 chars). */
export function sanitizeFontWeightTyping(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 3);
}

/** Snap a font-weight value to the nearest valid 100-step weight in range. */
export function normalizeFontWeightValue(raw) {
  const digits = sanitizeFontWeightTyping(raw);
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return "";
  const snapped = Math.round(num / BRANDING_FONT_WEIGHT_LIMITS.step) * BRANDING_FONT_WEIGHT_LIMITS.step;
  const clamped = Math.min(
    BRANDING_FONT_WEIGHT_LIMITS.max,
    Math.max(BRANDING_FONT_WEIGHT_LIMITS.min, snapped)
  );
  return String(clamped);
}

export function isValidFontWeightValue(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return false;
  return VALID_FONT_WEIGHTS.includes(Number(value));
}

const HEX_COLOR_INPUT_REGEX = /^#[0-9A-Fa-f]{0,6}$/;
const COMPLETE_HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/** True when value is a complete 3- or 6-digit CSS hex color. */
export function isCompleteHexColor(value) {
  return COMPLETE_HEX_COLOR_REGEX.test(String(value ?? "").trim());
}

/** Strip unsafe markup for branding notes preview while keeping basic rich text and images. */
export function sanitizeBrandingNotesPreviewHtml(html) {
  let safe = String(html ?? "").trim();
  if (!safe) return "";
  safe = safe
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
  return safe;
}

/** True when sanitized notes HTML has no visible text or images. */
export function isBrandingNotesHtmlEmpty(html) {
  const safe = sanitizeBrandingNotesPreviewHtml(html);
  if (!safe) return true;
  if (/<img[^>]*>/i.test(safe)) return false;
  const plainText = safe
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return plainText.length === 0;
}

/** Restrict color text input to valid partial or complete hex values (# + up to 6 hex digits). */
export function sanitizeHexColorInput(value) {
  let colorVal = String(value ?? "");
  if (colorVal === "") return "";

  const trimmed = colorVal.trim();
  if (!trimmed.startsWith("#")) {
    if (/^[0-9A-Fa-f]{1,6}$/.test(trimmed)) {
      colorVal = `#${trimmed}`;
    } else {
      return null;
    }
  } else {
    colorVal = trimmed;
  }

  if (!HEX_COLOR_INPUT_REGEX.test(colorVal)) {
    return null;
  }
  return colorVal;
}

/** Clamp a numeric font-size string to configured min/max for the unit. */
export function clampFontSizeNumber(numStr, unit = "px", limits = BRANDING_FONT_SIZE_LIMITS) {
  if (numStr === "" || numStr == null) return "";
  const normalizedUnit = String(unit || "px").toLowerCase();
  const parsed = parseFloat(numStr);
  if (Number.isNaN(parsed)) return "";
  const clamped = Math.min(limits.max, Math.max(limits.min, parsed));
  const factor = 10 ** FONT_SIZE_MAX_DECIMAL_PLACES;
  return String(Math.round(clamped * factor) / factor);
}

/** Whether a font-size string is complete enough to clamp while typing. */
export function canClampFontSizeWhileTyping(numStr) {
  const s = String(numStr ?? "").trim();
  return Boolean(s) && !s.endsWith(".");
}

const edgeDimensionLimits = (layout) =>
  layout === "radius" ? BRANDING_BORDER_RADIUS_LIMITS : BRANDING_BORDER_WIDTH_LIMITS;

/** Strip non-digits and clamp an integer dimension to configured min/max. */
export function sanitizeIntegerDimensionInput(raw, limits = BRANDING_BORDER_WIDTH_LIMITS) {
  const digitsOnly = String(raw ?? "").replace(/\D/g, "");
  if (!digitsOnly) return "";
  const parsed = parseInt(digitsOnly, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(limits.max, Math.max(limits.min, parsed)));
}

/**
 * Restrict border width/radius input to integers only (px values; no units/decimals).
 * Clamps to min/max while typing.
 */
export function restrictEdgeDimensionTyping(raw, layout = "width") {
  return sanitizeIntegerDimensionInput(raw, edgeDimensionLimits(layout));
}

/** Finalize border width/radius on blur (same rules as typing). */
export function finalizeEdgeDimensionInput(raw, layout = "width") {
  return restrictEdgeDimensionTyping(raw, layout);
}

/** Append unit to a dimension value (e.g. "11" + px → "11 px"). */
export function formatDimensionFieldValue(size, unit = "px") {
  const num = String(size ?? "").trim();
  if (!num) return "";
  return formatSizeWithUnit(num, unit || "px");
}

/** Parse a stored dimension string into size + unit (default px). */
export function parseDimensionFieldValue(value, defaultUnit = "px") {
  const raw = String(value ?? "").trim();
  if (!raw) return { size: "", unit: defaultUnit };
  const parsed = parseFormattedFontSize(raw);
  return {
    size: parsed.size,
    unit: parsed.unit || defaultUnit,
  };
}

/** Normalize a dimension to "size unit" form for form state / API. */
export function normalizeQuadDimensionValue(value) {
  const { size, unit } = parseDimensionFieldValue(value);
  if (!size) return "";
  return formatDimensionFieldValue(size, unit);
}

/** Clamp dimension input using the same rules as font size for the given limits. */
export function clampBrandingDimension(
  numStr,
  unit = "px",
  limits = BRANDING_FONT_SIZE_LIMITS
) {
  return clampFontSizeNumber(numStr, unit, limits);
}

export function getEdgeDimensionLimits(layout = "width") {
  return edgeDimensionLimits(layout);
}

export function tokenizeDimensionShorthand(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const pattern = new RegExp(
    `(\\d+(?:\\.\\d*)?)\\s*(${BRANDING_FONT_SIZE_UNIT_PATTERN})?`,
    "gi"
  );
  const parts = [];
  let match = pattern.exec(raw);
  while (match) {
    const size = match[1];
    const unit = (match[2] || "px").toLowerCase();
    if (size) parts.push(formatDimensionFieldValue(size, unit));
    match = pattern.exec(raw);
  }
  return parts;
}

/** Strip a px suffix and return the bare integer string for form editing. */
export function stripDimensionPx(value) {
  const { size } = parseDimensionFieldValue(value);
  return size;
}

/** Format dimension for API (e.g. "11 px", "1.5 rem"). */
export function formatDimensionWithPx(value) {
  return normalizeQuadDimensionValue(value);
}

export function formatEdgeQuadForDisplay(quad = {}) {
  const { top, right, bottom, left } = quad;
  const values = [top, right, bottom, left].map((v) => formatDimensionWithPx(v) || "");
  if (values.every((v) => !v)) return "";
  if (values[0] && values.every((v) => v === values[0])) return values[0];
  return values.filter(Boolean).join(" ") || values.join(" ").trim();
}

export function formatCornerQuadForDisplay(quad = {}) {
  const { topLeft, topRight, bottomRight, bottomLeft } = quad;
  const values = [topLeft, topRight, bottomRight, bottomLeft].map(
    (v) => formatDimensionWithPx(v) || ""
  );
  if (values.every((v) => !v)) return "";
  if (values[0] && values.every((v) => v === values[0])) return values[0];
  return values.filter(Boolean).join(" ") || values.join(" ").trim();
}

/** Infer px for integers, rem when the value contains a decimal point. */
export function inferFontSizeUnit(numStr) {
  const s = String(numStr ?? "").trim();
  if (!s) return "px";
  return s.includes(".") ? "rem" : "px";
}

export function parseFormattedFontSize(value) {
  const raw = String(value ?? "").trim();
  const unitPattern = BRANDING_FONT_SIZE_UNIT_PATTERN;
  const match = raw.match(new RegExp(`^(\\d+(?:\\.\\d*)?)\\s*(${unitPattern})?$`, "i"));
  if (match) {
    return {
      size: match[1],
      unit: (match[2] || inferFontSizeUnit(match[1])).toLowerCase(),
    };
  }
  const leading = raw.match(/^(\d+(?:\.\d*)?)/);
  if (leading) {
    return { size: leading[1], unit: inferFontSizeUnit(leading[1]) };
  }
  return { size: "", unit: "px" };
}

/** Sanitize font-size typing for fields without a unit dropdown (auto px/rem). */
export function sanitizeAutoUnitFontSizeTyping(raw) {
  let sanitized = String(raw ?? "").replace(/[^\d.]/g, "");
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex !== -1) {
    sanitized = `${sanitized.slice(0, dotIndex + 1)}${sanitized
      .slice(dotIndex + 1)
      .replace(/\./g, "")
      .slice(0, FONT_SIZE_MAX_DECIMAL_PLACES)}`;
  }
  if (canClampFontSizeWhileTyping(sanitized)) {
    const unit = inferFontSizeUnit(sanitized);
    sanitized = clampFontSizeNumber(sanitizeFontSizeTyping(sanitized, unit), unit);
  }
  return sanitized;
}

export function parseSizeWithUnit(value) {
  const raw = String(value ?? "").trim();
  const unitPattern = BRANDING_FONT_SIZE_UNIT_PATTERN;
  const match = raw.match(new RegExp(`^(\\d+(?:\\.\\d*)?)\\s*(${unitPattern})?$`, "i"));
  return {
    fontSize: match?.[1] || "",
    fontSizeUnit: (match?.[2] || "px").toLowerCase(),
  };
}

export function formatSizeWithUnit(fontSize, fontSizeUnit = "px") {
  const num = String(fontSize ?? "").trim();
  if (!num) return "";
  const unit = String(fontSizeUnit || "px").toLowerCase();
  return `${num}${unit}`;
}

/** Finalize auto-unit font size on blur: clamp and append px or rem. */
export function finalizeAutoUnitFontSize(raw) {
  const { size } = parseFormattedFontSize(raw);
  if (!size) return "";
  const unit = inferFontSizeUnit(size);
  const sanitized = sanitizeFontSizeTyping(size, unit);
  if (!sanitized) return "";
  const clamped = clampFontSizeNumber(sanitized, unit);
  return formatSizeWithUnit(clamped, unit);
}

/** @deprecated Use restrictEdgeDimensionTyping / finalizeEdgeDimensionInput */
export function sanitizeEdgeDimensionInput(raw, layout = "width") {
  return finalizeEdgeDimensionInput(raw, layout);
}

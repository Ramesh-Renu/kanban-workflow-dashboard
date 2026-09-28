/** Branding Guidelines v2 — preview panel */

import {
  BRANDING_NOTES_SECTION_ID,
  BRANDING_SECTION_IDS,
  BRANDING_SECTION_I18N,
  BRANDING_SECTION_FIELDS,
} from "./constants.js";
import {
  findBrandingLanguageByKey,
  getLanguageEntryName,
  getTypographyFieldDefinitions,
  hydrateExportIconEntriesWithAttachments,
  isCustomFontFromFontListEntry,
  isExportIconEntryComplete,
  normalizeBrandingColorList,
  normalizeColorSchemeFields,
  normalizeExportIconEntries,
  parseCornerQuad,
  parseEdgeQuad,
  resolveTypographyIsCustomFont,
} from "./sections.js";
import {
  BRANDING_SECTIONS_WITH_ATTACHMENTS,
  filterAttachmentsForSection,
  getBrandingGuidelineNotes,
  hasUsableApiSectionId,
} from "./attachments.js";
import {
  finalizeAutoUnitFontSize,
  formatCornerQuadForDisplay,
  formatEdgeQuadForDisplay,
  isCompleteHexColor,
} from "./inputUtils.js";

/** True when color scheme has no saved colors (empty shell, not user-saved). */
function isPristineDefaultColorScheme(fields = {}) {
  const primary = normalizeBrandingColorList(fields.primaryColor);
  const secondary = normalizeBrandingColorList(fields.secondaryColor);
  return primary.length === 0 && secondary.length === 0;
}

function brandingFieldHasPreviewValue(field, fieldsMap = {}, options = {}) {
  const { meaningfulFieldsOnly = false } = options;
  if (meaningfulFieldsOnly && field.key === "configurationMethod") {
    return fieldsMap.configurationMethod === "code";
  }

  const raw = fieldsMap[field.key];
  if (field.type === "languagesMultiSelect" || field.type === "languagesReadOnly") {
    return Array.isArray(fieldsMap.languages) && fieldsMap.languages.length > 0;
  }
  if (field.type === "languageFontStyleSelect" || field.type === "languageFontFamilyInput") {
    return String(fieldsMap.fontStylesByLanguage?.[field.languageId] ?? "").trim().length > 0;
  }
  if (field.type === "edgeQuad") {
    const quad =
      raw != null && typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : field.quadLayout === "radius"
          ? parseCornerQuad(raw)
          : parseEdgeQuad(raw);
    return Object.values(quad).some((v) => String(v ?? "").trim().length > 0);
  }
  if (field.type === "textFormatting") {
    return Array.isArray(raw) && raw.length > 0;
  }
  if (field.type === "iconUpload") {
    return false;
  }
  return String(raw ?? "").trim().length > 0;
}

function attachmentDisplayName(file) {
  if (!file) return "";
  if (file instanceof File) return file.name || "";
  return String(file.fileName || file.name || file.file_name || "").trim();
}

function resolveExportIconFileName(entry, attachments = [], deletedAttachmentIds = []) {
  if (entry?.pendingFile) return attachmentDisplayName(entry.pendingFile);
  return attachmentDisplayName(
    resolveExportIconAttachment(entry, attachments, deletedAttachmentIds)
  );
}

function resolveExportIconAttachment(entry, attachments = [], deletedAttachmentIds = []) {
  const deletedSet = new Set((deletedAttachmentIds || []).map(String));
  if (entry?.existingAttachmentId != null) {
    const match = attachments.find((file) => {
      const id = file.id ?? file.attachmentId ?? file.attachment_id;
      return id != null && String(id) === String(entry.existingAttachmentId);
    });
    if (match && !deletedSet.has(String(entry.existingAttachmentId))) {
      return match;
    }
  }
  return null;
}

/**
 * Normalizes a field value for the branding guidelines preview panel.
 */
export function getBrandingFieldPreviewDisplay(field, fieldsMap = {}, context = {}) {
  const { fontFamilyListData = [], translate = (_k, fb) => fb } = context;
  const raw = fieldsMap[field.key];

  if (field.type === "color") {
    const value = String(raw ?? "").trim();
    return { type: "color", value: value || "—" };
  }

  if (field.type === "edgeQuad") {
    const quad =
      raw != null && typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : field.quadLayout === "radius"
          ? parseCornerQuad(raw)
          : parseEdgeQuad(raw);
    const formatted =
      field.quadLayout === "radius"
        ? formatCornerQuadForDisplay(quad)
        : formatEdgeQuadForDisplay(quad);
    return { type: "text", value: formatted || "—" };
  }

  if (field.type === "fontSizeAutoUnit") {
    const formatted = finalizeAutoUnitFontSize(raw) || String(raw ?? "").trim();
    return { type: "text", value: formatted || "—" };
  }

  if (field.type === "textFormatting") {
    const list = Array.isArray(raw) ? raw : [];
    return { type: "textFormatting", value: list };
  }

  if (field.type === "radioGroup") {
    const opt = (field.options || []).find((o) => o.value === raw);
    const labelKey = opt?.labelKey;
    return {
      type: "text",
      value: labelKey ? translate(labelKey, labelKey) : String(raw ?? "—"),
    };
  }

  const formatFontPreviewLabel = (fontValue, isCustom) => {
    const font = fontFamilyListData.find(
      (entry) =>
        String(entry.font_id) === String(fontValue) ||
        String(entry.name ?? "").toLowerCase() === String(fontValue ?? "").toLowerCase()
    );
    const label = font?.name ?? fontValue ?? "—";
    if (!label || label === "—") return "—";
    const custom =
      isCustom ??
      (font ? isCustomFontFromFontListEntry(font) : false);
    if (!custom) return label;
    return `${label} (${translate("branding_custom_font", "Custom")})`;
  };

  if (field.type === "languageFontStyleSelect" || field.type === "languageFontFamilyInput") {
    const fontName = fieldsMap.fontStylesByLanguage?.[field.languageId];
    if (field.type === "languageFontFamilyInput") {
      return {
        type: "text",
        value: String(fontName ?? "").trim() || "—",
      };
    }
    const isCustom = resolveTypographyIsCustomFont(
      fieldsMap.isCustomFontByLanguage?.[field.languageId],
      fontName,
      fontFamilyListData
    );
    return {
      type: "text",
      value: formatFontPreviewLabel(fontName, isCustom),
    };
  }

  if (field.type === "languagesMultiSelect" || field.type === "languagesReadOnly") {
    const names = (fieldsMap.languages || []).map((langId) => {
      const lang = findBrandingLanguageByKey(langId, context.languageListData || []);
      return getLanguageEntryName(lang) || langId;
    });
    return { type: "text", value: names.length ? names.join(", ") : "—" };
  }

  if (field.type === "sizeWithUnit") {
    return { type: "text", value: String(raw ?? "").trim() || "—" };
  }

  if (field.type === "fontWeightSelect" || field.type === "fontWeightNumeric") {
    return { type: "text", value: String(raw ?? "").trim() || "—" };
  }

  if (field.type === "textarea") {
    const text = String(raw ?? "").trim();
    return { type: "text", value: text || "—" };
  }

  return { type: "text", value: String(raw ?? "").trim() || "—" };
}

/**
 * Builds preview panel sections from branding form state (all sections with entered data).
 */
export function buildBrandingPreviewSections({
  brandingInfo,
  languageListData = [],
  fontFamilyListData = [],
  sectionAttachmentsBySection = {},
  pendingAttachments = {},
  deletedAttachmentIds = [],
  translate = (_key, fallback) => fallback,
  includeAttachments = true,
  includeSectionNotes = true,
  /** When true, "standard" configuration method alone does not count as section data (ticket view). */
  meaningfulFieldsOnly = false,
  /** When true, keep sections that have attachments even if includeAttachments is false (ticket view nav). */
  includeSectionWhenHasAttachments = false,
}) {
  const sections = brandingInfo?.sections || {};
  const out = [];
  const previewContext = {
    languageListData,
    fontFamilyListData,
    translate,
  };

  BRANDING_SECTION_IDS.forEach((sectionId) => {
    const fieldsMap = sections[sectionId]?.fields || {};

    if (sectionId === "colorScheme") {
      const fields = normalizeColorSchemeFields(fieldsMap);
      // Ticket view: empty orders hydrate default blues — don't treat those as saved data.
      if (
        meaningfulFieldsOnly &&
        isPristineDefaultColorScheme(fields) &&
        !hasUsableApiSectionId(sections[sectionId])
      ) {
        return;
      }
      const items = [];
      const pushColorGroup = (baseKey, labelKey, fallbackLabel, colors) => {
        const list = normalizeBrandingColorList(colors);
        list.forEach((color, index) => {
          if (!isCompleteHexColor(color)) return;
          let suffix = "";
          if (list.length > 1) {
            suffix =
              index === 0
                ? ` (${translate("branding_color_default", "Default")})`
                : ` ${index + 1}`;
          }
          items.push({
            key: `${baseKey}-${index}`,
            label: `${translate(labelKey, fallbackLabel)}${suffix}`,
            value: color,
            type: "color",
          });
        });
      };
      pushColorGroup(
        "primaryColor",
        "branding_field_primary_color",
        "Primary color",
        fields.primaryColor
      );
      pushColorGroup(
        "secondaryColor",
        "branding_field_secondary_color",
        "Secondary color",
        fields.secondaryColor
      );
      if (items.length === 0) return;

      const title = translate(
        BRANDING_SECTION_I18N[sectionId],
        BRANDING_SECTION_I18N[sectionId]
      );
      out.push({ sectionId, title, groups: [{ title: null, items }] });
      return;
    }

    if (sectionId === "exportIcons") {
      const exportAttachments = filterAttachmentsForSection(
        sectionAttachmentsBySection.exportIcons || [],
        "exportIcons",
        sections
      );
      const hydratedEntries = hydrateExportIconEntriesWithAttachments(
        normalizeExportIconEntries(fieldsMap),
        exportAttachments
      );
      const entryGroups = hydratedEntries
        .filter((entry) =>
          isExportIconEntryComplete(entry, { deletedAttachmentIds })
        )
        .map((entry) => {
          const iconName = String(entry.iconName || "").trim();
          const fileName = resolveExportIconFileName(
            entry,
            exportAttachments,
            deletedAttachmentIds
          );
          return {
            title: null,
            items: [
              {
                key: entry.id,
                type: "exportIconEntry",
                iconName,
                fileName,
                attachment: resolveExportIconAttachment(
                  entry,
                  exportAttachments,
                  deletedAttachmentIds
                ),
              },
            ],
          };
        });

      if (entryGroups.length === 0) return;

      const title = translate(
        BRANDING_SECTION_I18N[sectionId],
        BRANDING_SECTION_I18N[sectionId]
      );
      out.push({
        sectionId,
        title,
        groups: [...entryGroups],
      });
      return;
    }

    const defs =
      sectionId === "typography"
        ? getTypographyFieldDefinitions(fieldsMap, languageListData)
        : BRANDING_SECTION_FIELDS[sectionId] || [];
    const activeMethod = fieldsMap.configurationMethod || "standard";

    const fieldPreviewOptions = { meaningfulFieldsOnly };
    const validFields = defs.filter((d) => {
      const matchesCondition = d.condition ? d.condition === activeMethod : true;
      return (
        matchesCondition &&
        brandingFieldHasPreviewValue(d, fieldsMap, fieldPreviewOptions)
      );
    });

    const attachmentNames = BRANDING_SECTIONS_WITH_ATTACHMENTS.includes(sectionId)
      ? [
          ...filterAttachmentsForSection(
            sectionAttachmentsBySection[sectionId] || [],
            sectionId,
            sections
          )
            .filter((file) => {
              const id = file.id ?? file.attachmentId ?? file.attachment_id;
              const deletedSet = new Set((deletedAttachmentIds || []).map(String));
              return id == null || !deletedSet.has(String(id));
            })
            .map(attachmentDisplayName)
            .filter(Boolean),
          ...(pendingAttachments[sectionId] || [])
            .map(attachmentDisplayName)
            .filter(Boolean),
        ]
      : [];

    const hasSectionAttachments = attachmentNames.length > 0;
    const hasAttachmentsInPreview = includeAttachments && hasSectionAttachments;
    if (
      validFields.length === 0 &&
      !hasAttachmentsInPreview &&
      !(includeSectionWhenHasAttachments && hasSectionAttachments)
    ) {
      return;
    }

    const groupedItems = [];
    let currentGroup = { title: null, items: [] };

    validFields.forEach((d) => {
      const display = getBrandingFieldPreviewDisplay(d, fieldsMap, previewContext);
      const item = {
        key: d.key,
        label: d.fallbackLabel || translate(d.labelKey, d.labelKey),
        value: display.value,
        type: display.type,
      };
      if (d.groupTitle) {
        if (currentGroup.items.length > 0) groupedItems.push(currentGroup);
        currentGroup = {
          title: translate(d.groupTitle, d.groupTitle),
          items: [item],
        };
      } else {
        currentGroup.items.push(item);
      }
    });

    if (currentGroup.items.length > 0) groupedItems.push(currentGroup);

    if (includeAttachments && attachmentNames.length > 0) {
      groupedItems.push({
        title: translate("branding_preview_attachments", "Attachments"),
        items: attachmentNames.map((name, index) => ({
          key: `attachment-${index}`,
          label: translate("branding_preview_attached_file", "File"),
          value: name,
          type: "attachment",
        })),
      });
    }

    const title = translate(
      BRANDING_SECTION_I18N[sectionId],
      BRANDING_SECTION_I18N[sectionId]
    );
    out.push({
      sectionId,
      title,
      groups: groupedItems,
    });
  });

  const guidelineNotes = getBrandingGuidelineNotes(brandingInfo);
  if (includeSectionNotes && guidelineNotes) {
    out.push({
      sectionId: BRANDING_NOTES_SECTION_ID,
      title: translate(BRANDING_SECTION_I18N.notes, BRANDING_SECTION_I18N.notes),
      groups: [
        {
          title: null,
          items: [
            {
              key: "guideline-notes",
              label: translate("branding_field_notes", "Notes"),
              value: guidelineNotes,
              type: "html",
            },
          ],
        },
      ],
    });
  }

  return out;
}

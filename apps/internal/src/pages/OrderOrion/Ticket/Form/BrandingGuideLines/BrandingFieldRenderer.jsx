import { t } from "i18next";
import React, { useRef } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-dropdown-select";
import { SelectDropDown } from "@orion/shared";
import BrandingDeferredUpload from "./BrandingDeferredUpload";
import BrandingSizeWithUnitField from "./BrandingSizeWithUnitField";
import BrandingAutoUnitFontSizeField from "./BrandingAutoUnitFontSizeField";
import BrandingEdgeQuadField from "./BrandingEdgeQuadField";
import BrandingAlternativesRow from "./BrandingAlternativesRow";
import BrandingFontAlternativesPanel from "./BrandingFontAlternativesPanel";
import { trashFull, UploadDark } from "../../../../../assets/images";
import { isValidFileSelection } from "../../../../../utils/common";
import { validateTypographyFontFile, TYPOGRAPHY_FONT_FILE_EXTENSIONS } from "@orion/shared/src/utils/brandingGuidelinesConfig";
import appConstants from "../../../../../constant/common";
import {
  isCompleteHexColor,
  sanitizeHexColorInput,
  sanitizeFontWeightTyping,
  normalizeFontWeightValue,
  isValidFontWeightValue,
  findBrandingLanguageByKey,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";

const matchFontOptions = (options, storedValue) => {
  const raw = String(storedValue ?? "").trim();
  if (!raw) return [];
  return options.filter(
    (opt) =>
      String(opt.font_id) === raw ||
      String(opt.name ?? "").toLowerCase() === raw.toLowerCase()
  );
};

const fontNameFromOption = (option) => String(option?.name ?? "").trim();

const buildLanguageFontStylePatch = (typographyFields, languageId, fontName) => ({
  fontStylesByLanguage: {
    ...(typographyFields?.fontStylesByLanguage || {}),
    [languageId]: fontName,
  },
});

const BrandingTypographyFontField = ({
  field,
  label,
  fontValue,
  hasError,
  disabled,
  compactLayout,
  colBreakpoints,
  fieldColClass,
  renderGroupTitle,
  typographyFields,
  typographyFontPendingFiles,
  getExistingTypographyFontAttachments,
  onStageTypographyFontFile,
  onRemoveTypographyFontFile,
  onMarkTypographyFontAttachmentDeleted,
  activeSectionId,
  onFieldChange,
  showToast,
  fontAlternatives = [],
}) => {
  const fileInputRef = useRef(null);
  const pendingFile = typographyFontPendingFiles?.[field.languageId] ?? null;
  const existingAttachments = getExistingTypographyFontAttachments?.(field.languageId) || [];
  const existingFile = existingAttachments[0] ?? null;
  const fileLabel =
    pendingFile?.name ||
    existingFile?.fileName ||
    existingFile?.name ||
    existingFile?.file_name ||
    null;

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFontFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    const result = validateTypographyFontFile(selected[0], 50);
    if (!result.isValid) {
      showToast?.({ message: result.reason, variant: "danger", showTime: 5000 });
      return;
    }
    if (result.data) {
      onStageTypographyFontFile?.(field.languageId, result.data);
    }
  };

  const handleRemoveFontFile = () => {
    if (pendingFile) {
      onRemoveTypographyFontFile?.(field.languageId);
      return;
    }
    if (existingFile) {
      onMarkTypographyFontAttachmentDeleted?.(existingFile, field.languageId);
    }
  };

  return (
    <React.Fragment key={field.key}>
      {renderGroupTitle()}
      <Col {...colBreakpoints} className={fieldColClass}>
        <Form.Group>
          <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
          <div className="branding-typography-font-row d-flex align-items-stretch gap-2">
            <Form.Control
              type="text"
              className="fs-14 branding-input-fixed-height flex-grow-1"
              maxLength={50}
              value={fontValue}
              isInvalid={hasError}
              disabled={disabled}
              placeholder={t(
                "order_view.branding_font_family_text_placeholder",
                "Enter font family"
              )}
              onChange={(event) => {
                const newVal = event.target.value;
                if (newVal === String(fontValue ?? "").trim()) return;
                const patch = buildLanguageFontStylePatch(
                  typographyFields,
                  field.languageId,
                  newVal
                );
                onFieldChange(
                  activeSectionId,
                  "fontStylesByLanguage",
                  patch.fontStylesByLanguage
                );
              }}
            />
            <div className="branding-typography-font-row__upload flex-shrink-0">
              <button
                type="button"
                className="branding-typography-font-row__upload-btn"
                disabled={disabled}
                title={t("order_view.branding_upload_font_file", "Upload font file")}
                onClick={openFilePicker}
                aria-label={t("order_view.branding_upload_font_file", "Upload font file")}
              >
                <img src={UploadDark} alt="" width={18} height={18} aria-hidden />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={TYPOGRAPHY_FONT_FILE_EXTENSIONS.join(",")}
                className="d-none"
                disabled={disabled}
                onChange={handleFontFileChange}
              />
            </div>
          </div>  

          {/* FONT FILES */}
          {fileLabel ? (
            <div className="branding-typography-font-row__file d-flex align-items-center gap-2 mt-2">
              <span className="text-truncate fs-12 text-muted">{fileLabel}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="btn btn-link p-0 flex-shrink-0"
                  aria-label={t("order_view.branding_remove_file", "Remove file")}
                  onClick={handleRemoveFontFile}
                >
                  <img src={trashFull} alt="" width={16} height={16} />
                </button>
              ) : null}
            </div>
          ) : null}

          {/* ALTERNATIVE FONTS */}
          <BrandingFontAlternativesPanel
            alternatives={fontAlternatives}
            activeFont={fontValue}
            disabled={disabled}
            onSelect={(font) => {
              const patch = buildLanguageFontStylePatch(
                typographyFields,
                field.languageId,
                font
              );
              onFieldChange(
                activeSectionId,
                "fontStylesByLanguage",
                patch.fontStylesByLanguage
              );
            }}
          />
          {hasError && (
            <div className="invalid-feedback d-block">
              {t("order_view.branding_required_field_error", "Required")}
            </div>
          )}
        </Form.Group>
      </Col>
    </React.Fragment>
  );
};

/**
 * Pure rendering component — receives field metadata + callbacks via props.
 * Contains no local state; all change handling is delegated upward.
 */
const BrandingFieldRenderer = ({
  field,
  value,
  hasError,
  disabled,
  activeSectionId,
  onFieldChange,
  // master data (only needed for specific field types)
  fontFamilyList,
  addFontFamilyList,
  getFontFamilyList,
  languageList,
  showToast,
  exportIconsAttachments,
  exportIconsPendingFiles,
  onStageExportIconFiles,
  onRemoveExportIconPending,
  onMarkExportIconDeleted,
  typographyFields,
  typographyFontPendingFiles = {},
  getExistingTypographyFontAttachments,
  onStageTypographyFontFile,
  onRemoveTypographyFontFile,
  onMarkTypographyFontAttachmentDeleted,
  compactLayout = false,
  // Scraper alternatives — only passed for color / typography fields
  colorAlternatives = [],
  fontAlternatives = [],
}) => {
  const label = field.fallbackLabel
    ? field.fallbackLabel
    : t(`order_view.${field.labelKey}`, field.labelKey);

  const fieldColSize = field.colSize ?? (compactLayout ? 6 : 12);
  const fieldColClass = compactLayout
    ? `mb-3 d-flex flex-column branding-field-col${
        field.type === "sizeWithUnit" ? " branding-field-col--size-unit" : ""
      }${field.type === "edgeQuad" ? " branding-field-col--edge-quad" : ""}`
    : `mb-3 branding-field-col${
        field.type === "edgeQuad" ? " branding-field-col--edge-quad" : ""
      }${field.type === "sizeWithUnit" ? " branding-field-col--size-unit" : ""}`;
  const colBreakpoints = compactLayout
    ? { xs: 10, md: fieldColSize, lg: fieldColSize }
    : { xs: 12, lg: fieldColSize };

  const renderGroupTitle = () => {
    if (!field.groupTitle) return null;
    if (compactLayout) {
      return (
        <Col xs={12} className="mt-4 mb-2">
          <h6 className="documentsContainer--subHead fw-bold mb-0 border-bottom pb-2">
            {t(`order_view.${field.groupTitle}`, field.groupTitle)}
          </h6>
        </Col>
      );
    }
    return (
      <Col xs={12} className="mt-2 mb-2">
        <h6 className="documentsContainer--subHead fw-bold mb-0 border-bottom pb-2">
          {t(`order_view.${field.groupTitle}`, field.groupTitle)}
        </h6>
      </Col>
    );
  };

  const errorMsg = hasError && (
    <div className="text-danger fs-12 mt-1">
      {t("order_view.branding_required_field_error", "This field is required")}
    </div>
  );

  // ── Color ────────────────────────────────────────────────────────────────
  if (field.type === "color") {
    const colorValue = String(value ?? "").trim();
    const pickerValue = isCompleteHexColor(colorValue) ? colorValue : "#000000";

    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <div className="d-flex align-items-center gap-2">
              <Form.Control
                type="color"
                className="fs-14 branding-color-picker"
                value={pickerValue}
                isInvalid={hasError}
                disabled={disabled}
                onChange={(e) => onFieldChange(activeSectionId, field.key, e.target.value)}
              />
              <Form.Control
                type="text"
                className="fs-14 branding-input-fixed-height"
                value={colorValue}
                isInvalid={hasError}
                disabled={disabled}
                placeholder="#000000"
                onChange={(e) => {
                  const next = sanitizeHexColorInput(e.target.value);
                  if (next == null) return;
                  onFieldChange(activeSectionId, field.key, next);
                }}
              />
            </div>
            <BrandingAlternativesRow
              alternatives={colorAlternatives}
              activeColor={colorValue}
              disabled={disabled}
              onSelect={(color) => onFieldChange(activeSectionId, field.key, color)}
            />
            {errorMsg}
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Font Family Select ────────────────────────────────────────────────────
  if (field.type === "fontFamilySelect") {
    const options = fontFamilyList?.data || [];
    const selected = matchFontOptions(options, value);

    const customFontDropdown = ({ props, state, methods }) => {
      const searchText = state?.search?.trim();
      const regexp = new RegExp(searchText || "", "i");
      const filtered = (props.options || []).filter(
        (item) =>
          regexp.test(String(item[props.labelField] || "")) ||
          regexp.test(String(item[props.valueField] || ""))
      );
      const handleCreateFont = async () => {
        if (!searchText) return;
        methods.createNew(searchText);
        try {
          const res = await addFontFamilyList({ name: searchText, is_customfont: true });
          if (res?.data?.status) {
            const createdName =
              res?.data?.data?.name ?? res?.data?.name ?? searchText;
            showToast({ message: res?.data?.message || t("order_view.added_successfully", "Added successfully"), variant: "success" });
            onFieldChange(activeSectionId, field.key, createdName);
            getFontFamilyList({ force: true });
          } else {
            showToast({ message: res?.data?.message || t("order_view.something_went_wrong", "Something went wrong"), variant: "danger" });
          }
        } catch {
          showToast({ message: t("order_view.something_went_wrong", "Something went wrong"), variant: "danger" });
        }
      };
      return (
        <div className="dropdwonList-main">
          <div className="dropdwonLists single">
            {filtered.map((option) => (
              <p
                className={option.disabled ? "dropdwonLists-label disabled" : "dropdwonLists-label"}
                key={String(option[props.valueField])}
                onClick={() => methods.addItem(option)}
              >
                <label>{option[props.labelField]}</label>
              </p>
            ))}
            {searchText && filtered.length === 0 && (
              <>
                <p className="create-new-entry">
                  "{searchText}"
                  <button type="button" className="create-new-entrybtn" onClick={handleCreateFont}>
                    + Add
                  </button>
                </p>
                <p className="error-show">Not Found</p>
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <Select
              multi={false}
              options={options}
              labelField="name"
              valueField="font_id"
              values={selected}
              searchable
              disabled={disabled}
              placeholder={t("order_view.branding_font_family_placeholder", "Select font family")}
              className="multiple-select fontFamily bg-white"
              dropdownPosition="auto"
              create={true}
              dropdownRenderer={customFontDropdown}
              onChange={(vals) => {
                const option = vals?.[0];
                const newVal = fontNameFromOption(option);
                if (newVal !== String(value ?? "").trim()) {
                  onFieldChange(activeSectionId, field.key, newVal);
                }
              }}
            />
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Languages (read-only: saved typography, else Order Details fallback) ─
  if (field.type === "languagesReadOnly") {
    const options = languageList?.data || [];
    const selectedIds = Array.isArray(value) ? value.map(String) : [];
    const displayNames = selectedIds.map((langId) => {
      const lang = findBrandingLanguageByKey(langId, options);
      return lang?.languageName ?? lang?.name ?? langId;
    });

    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            {displayNames.length > 0 ? (
              <div className="branding-languages-readonly d-flex flex-wrap gap-2">
                {displayNames.map((name, index) => (
                  <span
                    key={`${selectedIds[index] ?? index}-${name}`}
                    className="branding-languages-readonly__chip badge rounded-pill bg-light text-dark border fw-normal fs-14"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted fs-14 mb-0 branding-languages-readonly__empty">
                {t(
                  "order_view.branding_languages_from_order_empty",
                  "No languages in typography or Order Details"
                )}
              </p>
            )}
            <p className="text-muted fs-12 mb-0 mt-1">
              {t(
                "order_view.branding_languages_from_order_hint",
                "Uses saved typography languages; Order Details is used only when none are saved"
              )}
            </p>
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Per-language font family (text + optional font file) ─────────────────
  if (field.type === "languageFontFamilyInput") {
    const fontMap =
      typographyFields?.fontStylesByLanguage &&
      typeof typographyFields.fontStylesByLanguage === "object"
        ? typographyFields.fontStylesByLanguage
        : {};
    const fontValue = fontMap[field.languageId] ?? "";

    return (
      <BrandingTypographyFontField
        field={field}
        label={label}
        fontValue={fontValue}
        hasError={hasError}
        disabled={disabled}
        compactLayout={compactLayout}
        colBreakpoints={colBreakpoints}
        fieldColClass={fieldColClass}
        renderGroupTitle={renderGroupTitle}
        typographyFields={typographyFields}
        typographyFontPendingFiles={typographyFontPendingFiles}
        getExistingTypographyFontAttachments={getExistingTypographyFontAttachments}
        onStageTypographyFontFile={onStageTypographyFontFile}
        onRemoveTypographyFontFile={onRemoveTypographyFontFile}
        onMarkTypographyFontAttachmentDeleted={onMarkTypographyFontAttachmentDeleted}
        activeSectionId={activeSectionId}
        onFieldChange={onFieldChange}
        showToast={showToast}
        fontAlternatives={fontAlternatives}
      />
    );
  }

  // ── Per-language font style (legacy select) ───────────────────────────────
  if (field.type === "languageFontStyleSelect") {
    const options = fontFamilyList?.data || [];
    const fontMap =
      typographyFields?.fontStylesByLanguage &&
      typeof typographyFields.fontStylesByLanguage === "object"
        ? typographyFields.fontStylesByLanguage
        : {};
    const fontValue = fontMap[field.languageId] ?? "";
    const selected = matchFontOptions(options, fontValue);

    const customFontDropdown = ({ props, state, methods }) => {
      const searchText = state?.search?.trim();
      const regexp = new RegExp(searchText || "", "i");
      const filtered = (props.options || []).filter(
        (item) =>
          regexp.test(String(item[props.labelField] || "")) ||
          regexp.test(String(item[props.valueField] || ""))
      );
      const handleCreateFont = async () => {
        if (!searchText) return;
        methods.createNew(searchText);
        try {
          const res = await addFontFamilyList({ name: searchText, is_customfont: true });
          if (res?.data?.status) {
            const createdName =
              res?.data?.data?.name ?? res?.data?.name ?? searchText;
            showToast({
              message: res?.data?.message || t("order_view.added_successfully", "Added successfully"),
              variant: "success",
            });
            const patch = buildLanguageFontStylePatch(
              typographyFields,
              field.languageId,
              createdName
            );
            onFieldChange(
              activeSectionId,
              "fontStylesByLanguage",
              patch.fontStylesByLanguage
            );
            getFontFamilyList({ force: true });
          } else {
            showToast({
              message: res?.data?.message || t("order_view.something_went_wrong", "Something went wrong"),
              variant: "danger",
            });
          }
        } catch {
          showToast({ message: t("order_view.something_went_wrong", "Something went wrong"), variant: "danger" });
        }
      };
      return (
        <div className="dropdwonList-main">
          <div className="dropdwonLists single">
            {filtered.map((option) => (
              <p
                className={option.disabled ? "dropdwonLists-label disabled" : "dropdwonLists-label"}
                key={String(option[props.valueField])}
                onClick={() => methods.addItem(option)}
              >
                <label>{option[props.labelField]}</label>
              </p>
            ))}
            {searchText && filtered.length === 0 && (
              <>
                <p className="create-new-entry">
                  "{searchText}"
                  <button type="button" className="create-new-entrybtn" onClick={handleCreateFont}>
                    + Add
                  </button>
                </p>
                <p className="error-show">Not Found</p>
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <Select
              multi={false}
              options={options}
              labelField="name"
              valueField="font_id"
              values={selected}
              searchable
              disabled={disabled}
              placeholder={t("order_view.branding_font_family_placeholder", "Select font family")}
              className="multiple-select fontFamily bg-white"
              dropdownPosition="auto"
              create={true}
              dropdownRenderer={customFontDropdown}
              onChange={(vals) => {
                const option = vals?.[0];
                const newVal = fontNameFromOption(option);
                if (newVal === String(fontValue ?? "").trim()) return;
                const patch = buildLanguageFontStylePatch(
                  typographyFields,
                  field.languageId,
                  newVal
                );
                onFieldChange(
                  activeSectionId,
                  "fontStylesByLanguage",
                  patch.fontStylesByLanguage
                );
              }}
            />
            {hasError && (
              <div className="invalid-feedback d-block">
                {t("order_view.branding_required_field_error", "Required")}
              </div>
            )}
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Font Size (auto px/rem) ─────────────────────────────────────────────
  if (field.type === "fontSizeAutoUnit") {
    return (
      <BrandingAutoUnitFontSizeField
        field={field}
        value={value}
        hasError={hasError}
        disabled={disabled}
        activeSectionId={activeSectionId}
        onFieldChange={onFieldChange}
        compactLayout={compactLayout}
        colBreakpoints={colBreakpoints}
        fieldColClass={fieldColClass}
        renderGroupTitle={renderGroupTitle}
        label={label}
      />
    );
  }

  // ── Size With Unit ────────────────────────────────────────────────────────
  if (field.type === "sizeWithUnit") {
    return (
      <BrandingSizeWithUnitField
        field={field}
        value={value}
        hasError={hasError}
        disabled={disabled}
        activeSectionId={activeSectionId}
        onFieldChange={onFieldChange}
        compactLayout={compactLayout}
        colBreakpoints={colBreakpoints}
        fieldColClass={fieldColClass}
        renderGroupTitle={renderGroupTitle}
        label={label}
      />
    );
  }

  // ── Font Weight (numeric) ───────────────────────────────────────────────
  if (field.type === "fontWeightNumeric" || field.type === "fontWeightSelect") {
    const weightValue = value == null ? "" : String(value);
    const showInvalidWeight =
      weightValue.trim().length > 0 && !isValidFontWeightValue(weightValue);

    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <Form.Control
              type="text"
              className="fs-14 branding-input-fixed-height"
              value={weightValue}
              inputMode="numeric"
              autoComplete="off"
              isInvalid={hasError || showInvalidWeight}
              disabled={disabled}
              placeholder={t(
                "order_view.branding_font_weight_placeholder",
                "100–900 (step 100)"
              )}
              onChange={(event) => {
                const next = sanitizeFontWeightTyping(event.target.value);
                onFieldChange(activeSectionId, field.key, next);
              }}
              onBlur={() => {
                const trimmed = weightValue.trim();
                if (!trimmed) {
                  if (weightValue !== "") {
                    onFieldChange(activeSectionId, field.key, "");
                  }
                  return;
                }
                const normalized = normalizeFontWeightValue(trimmed);
                if (normalized && normalized !== weightValue) {
                  onFieldChange(activeSectionId, field.key, normalized);
                }
              }}
              onKeyDown={(event) => {
                if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
                  event.preventDefault();
                }
              }}
            />
            {showInvalidWeight && (
              <div className="text-danger fs-12 mt-1">
                {t(
                  "order_view.branding_font_weight_invalid",
                  "Enter a font weight between 100 and 900 in steps of 100"
                )}
              </div>
            )}
            {errorMsg}
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Edge quad (border width / radius per side) ────────────────────────────
  if (field.type === "edgeQuad") {
    return (
      <BrandingEdgeQuadField
        field={field}
        value={value}
        hasError={hasError}
        disabled={disabled}
        activeSectionId={activeSectionId}
        onFieldChange={onFieldChange}
        compactLayout={compactLayout}
        colBreakpoints={colBreakpoints}
        fieldColClass={fieldColClass}
        renderGroupTitle={renderGroupTitle}
        label={label}
      />
    );
  }

  // ── Text Formatting ───────────────────────────────────────────────────────
  if (field.type === "textFormatting") {
    const currentFormats = Array.isArray(value) ? value : [];
    const toggleFormat = (format, isMutuallyExclusiveGroup = false, groupFormats = []) => {
      let nextFormats = [...currentFormats];
      if (isMutuallyExclusiveGroup) {
        nextFormats = nextFormats.filter((f) => !groupFormats.includes(f));
        if (!currentFormats.includes(format)) nextFormats.push(format);
      } else {
        nextFormats = nextFormats.includes(format)
          ? nextFormats.filter((f) => f !== format)
          : [...nextFormats, format];
      }
      onFieldChange(activeSectionId, field.key, nextFormats);
    };
    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              <div className="btn-group border bg-white rounded">
                <button type="button" className={`btn fw-bold ${currentFormats.includes("bold") ? "btn-primary text-white" : "btn-light"}`} onClick={() => toggleFormat("bold")}>B</button>
                <button type="button" className={`btn fst-italic ${currentFormats.includes("italic") ? "btn-primary text-white" : "btn-light"}`} onClick={() => toggleFormat("italic")}>I</button>
                <button type="button" className={`btn text-decoration-underline ${currentFormats.includes("underline") ? "btn-primary text-white" : "btn-light"}`} onClick={() => toggleFormat("underline")}>U</button>
              </div>
              <div className="btn-group border bg-white rounded">
                <button type="button" className={`btn ${currentFormats.includes("uppercase") ? "btn-primary text-white" : "btn-light"}`} onClick={() => toggleFormat("uppercase", true, ["uppercase", "lowercase", "capitalize"])}>AA</button>
                <button type="button" className={`btn ${currentFormats.includes("lowercase") ? "btn-primary text-white" : "btn-light"}`} onClick={() => toggleFormat("lowercase", true, ["uppercase", "lowercase", "capitalize"])}>aa</button>
                <button type="button" className={`btn ${currentFormats.includes("capitalize") ? "btn-primary text-white" : "btn-light"}`} onClick={() => toggleFormat("capitalize", true, ["uppercase", "lowercase", "capitalize"])}>Aa</button>
              </div>
            </div>
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Radio Group ───────────────────────────────────────────────────────────
  if (field.type === "radioGroup") {
    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <div>
              {field.options.map((opt, idx) => (
                <Form.Check
                  key={idx}
                  type="radio"
                  id={`radio-${field.key}-${idx}`}
                  label={t(`order_view.${opt.labelKey}`, opt.labelKey)}
                  name={field.key}
                  value={opt.value}
                  checked={value === opt.value || (!value && idx === 0 && opt.value === "standard")}
                  onChange={() => onFieldChange(activeSectionId, field.key, opt.value)}
                  disabled={disabled}
                  className="mb-2"
                />
              ))}
            </div>
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Textarea ──────────────────────────────────────────────────────────────
  if (field.type === "textarea") {
    return (
      <React.Fragment key={field.key}>
        {renderGroupTitle()}
        <Col {...colBreakpoints} className={fieldColClass}>
          <Form.Group>
            <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
            <Form.Control
              as="textarea"
              className="fs-14"
              rows={6}
              value={value}
              isInvalid={hasError}
              disabled={disabled}
              placeholder={field.placeholder ? t(`order_view.${field.placeholder}`, field.placeholder) : ""}
              onChange={(e) => onFieldChange(activeSectionId, field.key, e.target.value)}
            />
            {errorMsg}
          </Form.Group>
        </Col>
      </React.Fragment>
    );
  }

  // ── Icon Upload (deferred — one block for export icons section) ─────────
  if (field.type === "iconUpload") {
    if (field.iconIndex !== 1) return null;
    return (
      <React.Fragment key={field.key}>
        <Col lg={12} xs={12} className="mb-4">
          <BrandingDeferredUpload
            label={t("order_view.attachment", "Attachment")}
            existingAttachments={exportIconsAttachments}
            pendingFiles={exportIconsPendingFiles}
            onStageFiles={onStageExportIconFiles}
            onRemovePending={onRemoveExportIconPending}
            onMarkExistingDeleted={onMarkExportIconDeleted}
          />
        </Col>
      </React.Fragment>
    );
  }

  // ── Default: text / number ────────────────────────────────────────────────
  return (
    <React.Fragment key={field.key}>
      {renderGroupTitle()}
      <Col {...colBreakpoints} className={fieldColClass}>
        <Form.Group>
          <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
          <Form.Control
            type={field.type === "number" ? "number" : "text"}
            className="fs-14 branding-input-fixed-height"
            value={value}
            isInvalid={hasError}
            disabled={disabled}
            placeholder={field.placeholder ? t(`order_view.${field.placeholder}`, field.placeholder) : ""}
            onChange={(e) => onFieldChange(activeSectionId, field.key, e.target.value)}
          />
          {errorMsg}
        </Form.Group>
      </Col>
    </React.Fragment>
  );
};

export default BrandingFieldRenderer;

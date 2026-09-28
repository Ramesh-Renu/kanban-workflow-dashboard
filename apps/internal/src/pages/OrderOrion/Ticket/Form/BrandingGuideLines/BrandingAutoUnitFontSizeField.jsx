import { t } from "i18next";
import React from "react";
import { Col, Form } from "react-bootstrap";
import {
  parseFormattedFontSize,
  inferFontSizeUnit,
  sanitizeAutoUnitFontSizeTyping,
  finalizeAutoUnitFontSize,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";

/**
 * Font size field without a unit dropdown.
 * Integers → px; decimals → rem. Unit is appended on blur.
 */
const BrandingAutoUnitFontSizeField = ({
  field,
  value,
  hasError,
  disabled,
  activeSectionId,
  onFieldChange,
  compactLayout,
  colBreakpoints,
  fieldColClass,
  renderGroupTitle,
  label,
}) => {
  const { size: displaySize, unit: storedUnit } = parseFormattedFontSize(value);
  const inferredUnit = displaySize ? inferFontSizeUnit(displaySize) : storedUnit || "px";

  const errorMsg = hasError && (
    <div className="text-danger fs-12 mt-1">
      {t("order_view.branding_required_field_error", "This field is required")}
    </div>
  );

  return (
    <React.Fragment key={field.key}>
      {renderGroupTitle()}
      <Col {...colBreakpoints} className={fieldColClass}>
        <Form.Group>
          <Form.Label className={`label-header${compactLayout ? " fs-14" : ""}`}>{label}</Form.Label>
          <div
            className={`branding-auto-unit-input${displaySize ? " branding-auto-unit-input--has-value" : ""}`}
          >
            <Form.Control
              type="text"
              inputMode="decimal"
              className="fs-14 branding-auto-unit-input__field branding-input-fixed-height"
              value={displaySize}
              isInvalid={hasError}
              disabled={disabled}
              placeholder={
                field.placeholder
                  ? t(`order_view.${field.placeholder}`, field.placeholder)
                  : t("order_view.branding_font_size_placeholder", "Size")
              }
              onChange={(e) =>
                onFieldChange(
                  activeSectionId,
                  field.key,
                  sanitizeAutoUnitFontSizeTyping(e.target.value)
                )
              }
              onBlur={(e) =>
                onFieldChange(activeSectionId, field.key, finalizeAutoUnitFontSize(e.target.value))
              }
              aria-describedby={`${field.key}-unit-hint`}
            />
            {displaySize ? (
              <span className="branding-auto-unit-input__suffix" aria-hidden="true">
                {inferredUnit}
              </span>
            ) : null}
          </div>
          <div id={`${field.key}-unit-hint`} className="branding-auto-unit-hint fs-12 mt-1">
            {t(
              "order_view.branding_font_size_unit_hint",
              "Whole numbers use px; decimal values use rem"
            )}
          </div>
          {errorMsg}
        </Form.Group>
      </Col>
    </React.Fragment>
  );
};

export default BrandingAutoUnitFontSizeField;

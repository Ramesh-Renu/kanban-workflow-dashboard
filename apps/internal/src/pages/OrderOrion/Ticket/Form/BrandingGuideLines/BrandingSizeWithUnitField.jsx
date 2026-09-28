import { t } from "i18next";
import React from "react";
import { Col, Form } from "react-bootstrap";
import BrandingDimensionWithUnitInput from "./BrandingDimensionWithUnitInput";

/**
 * Single combined font-size field: numeric input with unit dropdown at the end.
 * Stored as "16 px" / "1.25 rem" and split on save via parseSizeWithUnit.
 */
const BrandingSizeWithUnitField = ({
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
          <BrandingDimensionWithUnitInput
            value={value ?? ""}
            onChange={(next) => onFieldChange(activeSectionId, field.key, next)}
            disabled={disabled}
            hasError={hasError}
            placeholder={t("order_view.branding_font_size_placeholder", "Size")}
            ariaLabel={label}
          />
          {errorMsg}
        </Form.Group>
      </Col>
    </React.Fragment>
  );
};

export default BrandingSizeWithUnitField;

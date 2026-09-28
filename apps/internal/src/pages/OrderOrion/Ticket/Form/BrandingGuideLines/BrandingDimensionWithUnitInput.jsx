import { t } from "i18next";
import React, { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { SelectDropDown } from "@orion/shared";
import {
  UNIT_OPTIONS,
  BRANDING_FONT_SIZE_LIMITS,
  parseDimensionFieldValue,
  formatDimensionFieldValue,
  sanitizeFontSizeTyping,
  clampBrandingDimension,
  canClampFontSizeWhileTyping,
  fontSizeUnitAllowsDecimals,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";

const DEFAULT_UNIT = "px";

/**
 * Reusable combined dimension input: numeric value + unit dropdown (default px).
 */
const BrandingDimensionWithUnitInput = ({
  value = "",
  onChange,
  disabled = false,
  hasError = false,
  placeholder,
  ariaLabel,
  limits = BRANDING_FONT_SIZE_LIMITS,
  className = "",
}) => {
  const { size: sizeValue, unit: storedUnit } = parseDimensionFieldValue(value, DEFAULT_UNIT);
  const [pendingUnit, setPendingUnit] = useState("");

  useEffect(() => {
    if (storedUnit) setPendingUnit("");
  }, [storedUnit]);

  const unitValue = storedUnit || pendingUnit || DEFAULT_UNIT;

  const persistValue = (nextNumber, nextUnit) => {
    const num = String(nextNumber ?? "").trim();
    if (!num) {
      onChange("");
      setPendingUnit("");
      return;
    }
    onChange(formatDimensionFieldValue(num, nextUnit || DEFAULT_UNIT));
    setPendingUnit("");
  };

  const handleSizeChange = (rawInput) => {
    let sanitized = sanitizeFontSizeTyping(rawInput, unitValue);
    if (canClampFontSizeWhileTyping(sanitized)) {
      sanitized = clampBrandingDimension(sanitized, unitValue, limits);
    }
    persistValue(sanitized, unitValue);
  };

  const handleSizeBlur = () => {
    if (!sizeValue) return;
    const sanitized = sanitizeFontSizeTyping(sizeValue, unitValue);
    const clamped = clampBrandingDimension(sanitized, unitValue, limits);
    persistValue(clamped, unitValue);
  };

  const handleUnitChange = (vals) => {
    const newUnit = vals?.[0]?.value;
    if (!newUnit || newUnit === unitValue) return;

    if (!sizeValue) {
      setPendingUnit(newUnit === DEFAULT_UNIT ? "" : newUnit);
      return;
    }

    const sanitized = sanitizeFontSizeTyping(sizeValue, newUnit);
    const clamped = clampBrandingDimension(sanitized, newUnit, limits);
    persistValue(clamped, newUnit);
  };

  const selectedUnitValues = UNIT_OPTIONS.filter((opt) => opt.value === unitValue);

  return (
    <div
      className={`branding-size-with-unit branding-size-with-unit--combined branding-dimension-with-unit${hasError ? " branding-size-with-unit--invalid" : ""}${disabled ? " branding-size-with-unit--disabled" : ""}${className ? ` ${className}` : ""}`}
    >
      <Form.Control
        type="text"
        inputMode={fontSizeUnitAllowsDecimals(unitValue) ? "decimal" : "numeric"}
        className="fs-14 branding-size-with-unit__input branding-input-fixed-height"
        value={sizeValue}
        isInvalid={hasError}
        disabled={disabled}
        onChange={(e) => handleSizeChange(e.target.value)}
        onBlur={handleSizeBlur}
        placeholder={
          placeholder ?? t("order_view.branding_dimension_placeholder", "Size")
        }
        aria-label={ariaLabel}
      />
      <div className="branding-size-with-unit__unit">
        <SelectDropDown
          multi={false}
          searchable={false}
          options={UNIT_OPTIONS}
          labelField="label"
          valueField="value"
          optionType="select"
          values={selectedUnitValues}
          onChange={handleUnitChange}
          className="branding-size-with-unit__unit-select small-dropdown multiple-select bg-white"
          disabled={disabled}
          dropdownPosition="bottom"
        />
      </div>
    </div>
  );
};

export default BrandingDimensionWithUnitInput;

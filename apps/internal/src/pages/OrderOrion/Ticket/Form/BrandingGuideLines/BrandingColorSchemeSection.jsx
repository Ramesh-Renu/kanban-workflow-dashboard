import { t } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import {
  BRANDING_DEFAULT_PRIMARY_COLOR,
  BRANDING_DEFAULT_SECONDARY_COLOR,
  BRANDING_MAX_COLOR_PICKERS,
  canAppendBrandingColorList,
  isCompleteHexColor,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import BrandingAlternativesRow from "./BrandingAlternativesRow";

const stopDragPropagation = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

const reorderColorList = (colors, fromIndex, toIndex) => {
  if (fromIndex === toIndex) return colors;
  const next = [...colors];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const countValidColors = (colors = []) =>
  colors.filter((color) => isCompleteHexColor(color)).length;

const ColorSchemeChip = ({
  label,
  index,
  color,
  defaultColor,
  disabled,
  hasError,
  canRemove,
  canDrag,
  isDragging,
  isDropTarget,
  onColorChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const chipRef = useRef(null);
  const normalizedHex = String(color ?? "").trim();
  const isChosen = isCompleteHexColor(normalizedHex);
  const isDefault = index === 0;

  const handlePick = (nextColor) => {
    if (nextColor) onColorChange?.(index, nextColor);
  };

  const handleChipDragStart = (e) => {
    if (
      e.target.closest(
        ".branding-multi-color-chip__picker, .branding-multi-color-chip__remove, input[type='color']"
      )
    ) {
      e.preventDefault();
      return;
    }

    if (chipRef.current) {
      e.dataTransfer.setDragImage(
        chipRef.current,
        chipRef.current.offsetWidth / 2,
        chipRef.current.offsetHeight / 2
      );
    }

    onDragStart?.(e);
  };

  return (
    <div
      ref={chipRef}
      className={[
        "branding-multi-color-chip",
        "branding-multi-color-chip--chosen",
        isDefault ? "branding-multi-color-chip--default" : "",
        canDrag ? "branding-multi-color-chip--draggable" : "",
        isDragging ? "branding-multi-color-chip--dragging" : "",
        isDropTarget ? "branding-multi-color-chip--drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={canDrag && !disabled}
      onDragStart={canDrag ? handleChipDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onDragOver={canDrag ? onDragOver : undefined}
      onDrop={canDrag ? onDrop : undefined}
    >
      <div className="branding-multi-color-chip__shell">
        {canRemove && (
          <button
            type="button"
            className="branding-multi-color-chip__remove btn btn-0 border-0 m-0 p-0"
            disabled={disabled}
            draggable={false}
            onDragStart={stopDragPropagation}
            aria-label={t("order_view.branding_remove_color_entry", "Remove")}
            onClick={() => onRemove?.(index)}
          >
            <span className="icon-failure-cross" aria-hidden>
              <span className="path1"></span>
              <span className="path2"></span>
            </span>
          </button>
        )}

        <div className="branding-multi-color-chip__swatch">
          <Form.Control
            type="color"
            className="fs-14 branding-color-picker branding-multi-color-chip__picker branding-multi-color-chip__picker--chosen"
            value={isChosen ? normalizedHex : defaultColor}
            isInvalid={hasError && index === 0}
            disabled={disabled}
            draggable={false}
            onDragStart={stopDragPropagation}
            aria-label={`${label} ${index + 1}`}
            onChange={(e) => handlePick(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

const MultiColorPickerGroup = ({
  label,
  colors = [],
  defaultColor,
  maxColors = BRANDING_MAX_COLOR_PICKERS,
  hasError,
  disabled,
  onColorChange,
  onAddColor,
  onRemoveColor,
  onReorderColors,
  alternatives = [],
  onSelectAlternative,
}) => {
  const addPickerRef = useRef(null);
  const addPendingRef = useRef(false);
  const stagedAddColorRef = useRef(null);
  const addPickerInteractedRef = useRef(false);
  const onAddColorRef = useRef(onAddColor);
  const defaultColorRef = useRef(defaultColor);
  const commitStagedAddColorRef = useRef(() => {});
  const resetAddPickerSessionRef = useRef(() => {});
  onAddColorRef.current = onAddColor;
  defaultColorRef.current = defaultColor;
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const atMax = colors.length >= maxColors;
  const canAdd = canAppendBrandingColorList(colors, maxColors) && !disabled;
  const validColorCount = countValidColors(colors);
  const canReorder = validColorCount > 1 && !disabled;

  const resetAddPickerSession = () => {
    addPendingRef.current = false;
    stagedAddColorRef.current = null;
    addPickerInteractedRef.current = false;
    if (addPickerRef.current) {
      addPickerRef.current.value = defaultColorRef.current;
    }
  };

  const commitStagedAddColor = () => {
    if (!addPendingRef.current) return;

    const stagedColor = stagedAddColorRef.current;
    const didInteract = addPickerInteractedRef.current;
    resetAddPickerSession();

    if (!didInteract || !isCompleteHexColor(stagedColor)) return;
    onAddColorRef.current?.(stagedColor);
  };

  resetAddPickerSessionRef.current = resetAddPickerSession;
  commitStagedAddColorRef.current = commitStagedAddColor;

  useEffect(() => {
    const input = addPickerRef.current;
    if (!input) return undefined;

    const stageAddColor = (event) => {
      if (!addPendingRef.current) return;
      addPickerInteractedRef.current = true;
      stagedAddColorRef.current = event.target.value;
    };

    const commitAddColor = () => {
      commitStagedAddColorRef.current();
    };

    const cancelAddOnEscape = (event) => {
      if (event.key !== "Escape" || !addPendingRef.current) return;
      resetAddPickerSessionRef.current();
      input.blur();
    };

    input.addEventListener("input", stageAddColor);
    input.addEventListener("change", commitAddColor);
    input.addEventListener("blur", commitAddColor);
    input.addEventListener("keydown", cancelAddOnEscape);

    return () => {
      input.removeEventListener("input", stageAddColor);
      input.removeEventListener("change", commitAddColor);
      input.removeEventListener("blur", commitAddColor);
      input.removeEventListener("keydown", cancelAddOnEscape);
    };
  }, []);

  const isValidColorAt = (index) => isCompleteHexColor(colors[index]);

  const handleDragStart = (index) => (e) => {
    if (!isValidColorAt(index)) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index) => (e) => {
    if (!canReorder || draggedIndex === null || draggedIndex === index) return;
    if (!isValidColorAt(index) || !isValidColorAt(draggedIndex)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  };

  const handleDrop = (index) => (e) => {
    e.preventDefault();
    if (
      draggedIndex === null ||
      draggedIndex === index ||
      !isValidColorAt(index) ||
      !isValidColorAt(draggedIndex)
    ) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }
    onReorderColors?.(reorderColorList(colors, draggedIndex, index));
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleAddClick = () => {
    if (!canAdd) return;
    addPendingRef.current = true;
    stagedAddColorRef.current = null;
    addPickerInteractedRef.current = false;
    addPickerRef.current?.click();
  };

  const addButtonTitle = atMax
    ? t("order_view.branding_add_color_max_reached", "Maximum colors reached")
    : colors.length === 0
      ? t("order_view.branding_add_color", "Add color")
      : !canAdd
        ? t(
            "order_view.branding_add_color_requires_valid",
            "Select a color in the current slot before adding another"
          )
        : t("order_view.branding_add_color", "Add color");

  return (
    <Form.Group className="branding-multi-color-group h-100 mb-0">
      <Form.Label className="label-header fs-14 mb-1">{label}</Form.Label>
      <div className="d-flex flex-row flex-wrap align-items-flex-start branding-multi-color-list">
        {colors.map((color, index) => {
          const isValid = isValidColorAt(index);
          return (
            <ColorSchemeChip
              // Keep key stable across color changes so the native color
              // picker is not remounted mid-drag (which breaks hue/SV dragging).
              key={`${label}-${index}`}
              label={label}
              index={index}
              color={color}
              defaultColor={defaultColor}
              disabled={disabled}
              hasError={hasError}
              canRemove={!disabled && colors.length > 0}
              canDrag={canReorder && isValid}
              isDragging={draggedIndex === index}
              isDropTarget={dropTargetIndex === index && isValid}
              onColorChange={onColorChange}
              onRemove={onRemoveColor}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
            />
          );
        })}
        <button
          type="button"
          className="branding-multi-color-add"
          disabled={!canAdd}
          title={addButtonTitle}
          aria-label={addButtonTitle}
          onClick={handleAddClick}
        >
          <span className="branding-multi-color-add__icon" aria-hidden>
            +
          </span>
          <span className="branding-multi-color-add__label">
            {t("order_view.branding_add_color_short", "Add")}
          </span>
        </button>
        <input
          ref={addPickerRef}
          type="color"
          className="branding-multi-color-chip__hidden-picker"
          tabIndex={-1}
          aria-hidden
          defaultValue={defaultColor}
        />
      </div>
      {validColorCount > 1 && (
        <p className="branding-multi-color-hint text-muted fs-12 mb-0 mt-2">
          {t(
            "order_view.branding_color_reorder_hint",
            "The first color is the default. Drag colors to reorder."
          )}
        </p>
      )}
      <BrandingAlternativesRow
        alternatives={alternatives}
        activeColor={colors[0]}
        disabled={disabled}
        onSelect={(hex) => onSelectAlternative?.(hex)}
      />
      {hasError && (
        <div className="text-danger fs-12 mt-1">
          {t("order_view.branding_required_field_error", "This field is required")}
        </div>
      )}
    </Form.Group>
  );
};

const BrandingColorSchemeSection = ({
  primaryColors = [],
  secondaryColors = [],
  primaryAlternatives = [],
  secondaryAlternatives = [],
  fieldErrors = {},
  disabled = false,
  onPrimaryColorChange,
  onAddPrimaryColor,
  onRemovePrimaryColor,
  onReorderPrimaryColors,
  onSecondaryColorChange,
  onAddSecondaryColor,
  onRemoveSecondaryColor,
  onReorderSecondaryColors,
  onSelectPrimaryAlternative,
  onSelectSecondaryAlternative,
}) => (
  <Col xs={12} className="branding-color-scheme-section p-0">
    <Row className="g-2 branding-color-scheme-section__grid">
      <Col xs={12} md={6} className="p-0">
        <MultiColorPickerGroup
          label={t("order_view.branding_field_primary_color", "Primary color")}
          colors={primaryColors}
          defaultColor={BRANDING_DEFAULT_PRIMARY_COLOR}
          maxColors={BRANDING_MAX_COLOR_PICKERS}
          hasError={Boolean(fieldErrors["colorScheme.primaryColor"])}
          disabled={disabled}
          onColorChange={onPrimaryColorChange}
          onAddColor={onAddPrimaryColor}
          onRemoveColor={onRemovePrimaryColor}
          onReorderColors={onReorderPrimaryColors}
          alternatives={primaryAlternatives}
          onSelectAlternative={onSelectPrimaryAlternative}
        />
      </Col>
      <Col xs={12} md={6} className="p-0">
        <MultiColorPickerGroup
          label={t("order_view.branding_field_secondary_color", "Secondary color")}
          colors={secondaryColors}
          defaultColor={BRANDING_DEFAULT_SECONDARY_COLOR}
          maxColors={BRANDING_MAX_COLOR_PICKERS}
          hasError={Boolean(fieldErrors["colorScheme.secondaryColor"])}
          disabled={disabled}
          onColorChange={onSecondaryColorChange}
          onAddColor={onAddSecondaryColor}
          onRemoveColor={onRemoveSecondaryColor}
          onReorderColors={onReorderSecondaryColors}
          alternatives={secondaryAlternatives}
          onSelectAlternative={onSelectSecondaryAlternative}
        />
      </Col>
    </Row>
  </Col>
);

export default BrandingColorSchemeSection;

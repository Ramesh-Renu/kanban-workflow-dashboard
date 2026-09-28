import { t } from "i18next";
import React from "react";
import { Col, Form, Row } from "react-bootstrap";
import {
  BRANDING_EDGE_QUAD_EDGES,
  parseEdgeQuad,
  parseCornerQuad,
  getEdgeDimensionLimits,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import BrandingDimensionWithUnitInput from "./BrandingDimensionWithUnitInput";

/**
 * Border width / radius quad: one combined value+unit field per edge (default px).
 */
const BrandingEdgeQuadField = ({
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
  const layout = field.quadLayout === "radius" ? "radius" : "width";
  const edges = BRANDING_EDGE_QUAD_EDGES[layout] || BRANDING_EDGE_QUAD_EDGES.width;
  const limits = getEdgeDimensionLimits(layout);

  const quadValue =
    typeof value === "object" && value != null && !Array.isArray(value)
      ? value
      : layout === "radius"
        ? parseCornerQuad(value)
        : parseEdgeQuad(value);

  const updateEdge = (edgeKey, edgeVal) => {
    onFieldChange(activeSectionId, field.key, { ...quadValue, [edgeKey]: edgeVal });
  };

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
          <Row className="g-2 branding-edge-quad branding-edge-quad--with-unit m-0">
            {edges.map((edge) => (
              <Col xs={6} md={3} key={edge.key} className="branding-edge-quad__cell">
                <Form.Label className="branding-edge-quad__edge-label mb-1">
                  {t(`order_view.${edge.labelKey}`, edge.labelKey)}
                </Form.Label>
                <BrandingDimensionWithUnitInput
                  value={quadValue[edge.key] ?? ""}
                  onChange={(next) => updateEdge(edge.key, next)}
                  disabled={disabled}
                  hasError={hasError}
                  limits={limits}
                  ariaLabel={`${label} ${t(`order_view.${edge.labelKey}`, edge.labelKey)}`}
                  className="branding-dimension-with-unit--compact"
                />
              </Col>
            ))}
          </Row>
          {errorMsg}
        </Form.Group>
      </Col>
    </React.Fragment>
  );
};

export default BrandingEdgeQuadField;

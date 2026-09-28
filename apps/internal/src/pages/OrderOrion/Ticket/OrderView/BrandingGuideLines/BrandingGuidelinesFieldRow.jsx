import React from "react";
import { Col, Row } from "react-bootstrap";

/**
 * Standard label / value row used across branding ticket view fields.
 */
const BrandingGuidelinesFieldRow = ({ label, children, className = "" }) => (
  <Row className={`d-flex flex-row flex-wrap labelValueContainer py-2 mx-0 ${className}`}>
    <Col lg={4} md={5} xs={12}>
      <p className="label_field mb-1">{label}</p>
    </Col>
    <Col lg={8} md={7} xs={12}>
      <div className="value_field mb-1 d-flex align-items-center gap-2 flex-wrap justify-content-start">
        {children}
      </div>
    </Col>
  </Row>
);

export default BrandingGuidelinesFieldRow;

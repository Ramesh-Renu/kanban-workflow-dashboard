import { Col, Row } from "react-bootstrap";

/**
 * Workspace Users–style page header (eu-header-bg title + subtitle + optional CTA).
 */
const KbPageHeader = ({ title, subtitle, actions = null }) => {
  return (
    <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg mb-3">
      <Col>
        <span className="settings-workspace-user-title">{title}</span>
        {subtitle ? (
          <p className="m-0 mt-2 settings-workspace-user-subtitle">{subtitle}</p>
        ) : null}
      </Col>
      {actions ? (
        <Col xs="auto" className="d-flex justify-content-end flex-wrap gap-2">
          {actions}
        </Col>
      ) : null}
    </Row>
  );
};

export default KbPageHeader;

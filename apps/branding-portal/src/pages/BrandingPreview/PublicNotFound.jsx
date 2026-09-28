import React from "react";
import { Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const PublicNotFound = () => {
  const navigate = useNavigate();

  return (
    <Container className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center py-5">
      <div className="mb-4">
        <h1 className="display-1 fw-bold text-danger">404</h1>
        <h2 className="fw-bold mb-3">Link Not Found or Invalid</h2>
        <p className="text-muted fs-5 mb-4">
          The link you followed may be incorrect, expired, or you may not have permission to view it.<br />
          Please verify the URL or contact your project manager.
        </p>
      </div>
    </Container>
  );
};

export default PublicNotFound;

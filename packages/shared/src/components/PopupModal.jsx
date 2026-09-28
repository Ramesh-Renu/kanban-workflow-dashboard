import React, { useId } from "react";
import { Modal, Button } from "react-bootstrap";
import "../styles/components/popupModal.scss";

const PopupModal = ({
  show,
  onClose,
  title = "",
  children,
  footerButtons,
  size = "md",
  backdrop = false,
  centered = true,
  header = false,
  headerActions = null,
  className,
  customClassName,
}) => {
  const titleId = useId();
  const dialogClassName = ["orion-shared-popup-modal", customClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      show={show}
      onHide={onClose}
      size={size}
      backdrop={backdrop ? true : "static"}
      centered={centered}
      dialogClassName={dialogClassName}
      aria-modal="true"
      aria-labelledby={header && title ? titleId : undefined}
    >
      {header && (
        <Modal.Header>
          <Modal.Title id={titleId}>{title}</Modal.Title>
          <div className="orion-shared-popup-modal__header-actions ms-auto">
            {headerActions}
            <button
              type="button"
              className="bg-white rounded-pill small btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>
        </Modal.Header>
      )}

      <Modal.Body className={className || ""}>{children}</Modal.Body>

      {footerButtons && (
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default PopupModal;

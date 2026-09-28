import React from "react";
import { Modal } from "react-bootstrap";

const NotificationDrawer = ({ show, onHide, children, ...props }) => {
  return (
    <Modal
      show={show}
      size="md"
      onHide={onHide}      
      backdrop={"static"}
      animation={true}
      backdropClassName={`custom-backdrop ${props?.dialogClassName}`}
      dialogClassName={`notification-drawer-modal ${props?.dialogClassName}`}
      contentClassName="notification-drawer-content"
    >
      <Modal.Header closeButton>
        <Modal.Title>Notifications</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
    </Modal>
  );
};

export default NotificationDrawer;

import React from "react";
import { Offcanvas } from "react-bootstrap";
import { classNames } from "@euroland/libs";
import CloseDrawerIcon from "./CloseDrawerIcon";

const SideDrawer = ({
  show,
  onHide,
  title,
  children,
  customWidth,
  className,
  headerClassName,
  showEdgeCloseButton = false,
  subTitle,
}) => {
  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement={"end"}
      className={classNames(
        "offcanvas-below-navbar",
        showEdgeCloseButton && "offcanvas-below-navbar--edge-close",
      )}
      style={{ width: customWidth || "28vw" }}
    >
      {showEdgeCloseButton && (
        <button
          type="button"
          className="side-drawer__edge-close"
          onClick={onHide}
          aria-label="Close drawer"
        >
          <CloseDrawerIcon color="#0C0E1E" bgColor="white" style={{ height: "250px" }} />
        </button>
      )}
      <Offcanvas.Header
        closeButton={!showEdgeCloseButton}
        className={classNames("sidebarHeader d-flex align-items-center", headerClassName)}
      >
        <h5 className="mt-3">{title}</h5>
        {subTitle && <h6 className="mt-3">{subTitle}</h6>}
      </Offcanvas.Header>
      <Offcanvas.Body className={className}>{children}</Offcanvas.Body>
    </Offcanvas>
  );
};

export default SideDrawer;

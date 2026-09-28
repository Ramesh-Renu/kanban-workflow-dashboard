import { useEffect } from "react";

const SIDENAV_SELECTOR = ".sidenav-content";
const CSS_VAR = "--dashboard-sidenav-width";
const BODY_CLASS = "order-tools-modal-open";
const DEFAULT_SIDENAV_WIDTH = 85;

let activeCount = 0;
let sharedObserver = null;
let sharedFrameId = 0;

const updateOffset = () => {
  const sideNav = document.querySelector(SIDENAV_SELECTOR);
  const width = sideNav?.getBoundingClientRect().width || DEFAULT_SIDENAV_WIDTH;
  document.documentElement.style.setProperty(CSS_VAR, `${width}px`);
};

const activateOverlay = () => {
  activeCount += 1;
  if (activeCount !== 1) return;

  document.body.classList.add(BODY_CLASS);
  updateOffset();

  sharedFrameId = requestAnimationFrame(() => {
    requestAnimationFrame(updateOffset);
  });

  const sideNav = document.querySelector(SIDENAV_SELECTOR);
  if (sideNav && typeof ResizeObserver !== "undefined") {
    sharedObserver = new ResizeObserver(updateOffset);
    sharedObserver.observe(sideNav);
  }
};

const deactivateOverlay = () => {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return;

  cancelAnimationFrame(sharedFrameId);
  sharedObserver?.disconnect();
  sharedObserver = null;
  document.body.classList.remove(BODY_CLASS);
  document.documentElement.style.removeProperty(CSS_VAR);
};

/** Keeps full-screen order/tools surfaces aligned to the right of the fixed sidenav. */
const useOrderToolsModalSidenavOffset = (isActive) => {
  useEffect(() => {
    if (!isActive) return undefined;

    activateOverlay();
    return () => {
      deactivateOverlay();
    };
  }, [isActive]);
};

export default useOrderToolsModalSidenavOffset;

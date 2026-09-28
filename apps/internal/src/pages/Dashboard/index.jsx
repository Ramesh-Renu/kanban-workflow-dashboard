import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

const resetDashboardScroll = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document.querySelector(".outlet-container")?.scrollTo?.({ top: 0, left: 0 });
  document.querySelector(".body-content")?.scrollTo?.({ top: 0, left: 0 });
  document.getElementById("orion-dashboard-main")?.scrollTo?.({ top: 0, left: 0 });
};

const Dashboard = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    resetDashboardScroll();
    const frameId = requestAnimationFrame(resetDashboardScroll);
    return () => cancelAnimationFrame(frameId);
  }, [pathname]);

  return (
    <main
      id="orion-dashboard-main"
      className="dashboard-page-outlet"
      aria-label="Dashboard"
    >
      <Outlet />
    </main>
  );
};

export default Dashboard;

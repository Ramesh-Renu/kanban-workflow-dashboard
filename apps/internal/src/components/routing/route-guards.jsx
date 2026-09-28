import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import useAuth from "hooks/useAuth";
import NotFound from "pages/NotFound/NotFound";
import AccessRequired from "pages/Unauthorized/AccessRequired";
import {
  getDashboardHomePath,
  DASHBOARD_ROUTES,
  ensureSingleBoardDashboardHome,
  safeParseLocalStorage,
} from "utils/dashboard";
import { canOpenHubApp } from "constant/applicationHubApps";

export const HomeRedirect = () => {
  const [{ data, loading }] = useAuth();

  if (loading || !data?.details) {
    return <Spinner />;
  }

  return <Navigate to="/home" replace />;
};

const HubAppAccessDenied = () => (
  <AccessRequired
    title="Access Denied"
    message="You don’t currently have permission to view this application."
    help="Kindly contact the Admin or Product team to get the required access."
  />
);

/**
 * Block internal hub apps when userInfo.appPermission (and isAvailable) deny access.
 * Missing permission → Access Denied screen.
 * Supports Outlet nesting or wrapping children (kanban splat routes).
 */
export const HubAppAccessGate = ({ appId, children }) => {
  const [{ data, loading }] = useAuth();

  if (loading || !data?.details) {
    return <Spinner />;
  }

  if (!canOpenHubApp(data.details, appId)) {
    return <HubAppAccessDenied />;
  }

  return children != null ? children : <Outlet />;
};

export const DashboardAccessGate = () => {
  const [{ data, loading }] = useAuth();
  const location = useLocation();

  if (loading || !data?.details) {
    return <Spinner />;
  }

  if (!canOpenHubApp(data.details, "tasks")) {
    return <HubAppAccessDenied />;
  }

  const isDashboardRoot =
    location.pathname === "/dashboard" || location.pathname === "/dashboard/";
  const isBoardsCollection =
    location.pathname === "/dashboard/workspace" ||
    location.pathname === "/dashboard/workspace/";
  const dashboardHome = getDashboardHomePath(data.details);
  const boardsHomeIntent = Boolean(
    safeParseLocalStorage("selectWorkspaceDashboard")?.myWorkspaceBoardsHome,
  );

  // Single-board shortcut: skip boards collection — unless breadcrumb/home
  // explicitly restored the My Workspace / member boards list.
  if (isBoardsCollection && !boardsHomeIntent) {
    const singleBoardHome = ensureSingleBoardDashboardHome(data.details);
    if (singleBoardHome) {
      return (
        <Navigate
          to={singleBoardHome}
          replace
          state={location.state}
        />
      );
    }
  }

  // USR (or Admin My Workspace) with only workflowType 60 or 61 lands on boards list.
  // Single-board access skips the boards collection and opens that board's task page.
  // Mixed 60+61 and Admin All Workspace may use /dashboard workspace list.
  // Do not bounce breadcrumb navigation to Workspaces (/dashboard) down to Board.
  if (
    isDashboardRoot &&
    dashboardHome !== DASHBOARD_ROUTES.home &&
    dashboardHome !== DASHBOARD_ROUTES.board
  ) {
    return (
      <Navigate
        to={dashboardHome}
        replace
        state={location.state}
      />
    );
  }

  // Board task page without a stored selection (e.g. sidenav) — seed the only board.
  if (
    (location.pathname === "/dashboard/workspace/board" ||
      location.pathname === "/dashboard/workspace/board/") &&
    safeParseLocalStorage("selectBoardDashboard")?.id == null
  ) {
    ensureSingleBoardDashboardHome(data.details);
  }

  return <Outlet />;
};

export const KnowledgeBaseAccessGate = () => {
  const [{ data, loading }] = useAuth();

  if (loading || !data?.details) {
    return <Spinner />;
  }

  // Hub appPermission + KB catalog access (via knowledge isAvailable)
  if (!canOpenHubApp(data.details, "knowledge")) {
    return <HubAppAccessDenied />;
  }

  return <Outlet />;
};

export const ProtectedNotFound = () => {
  const [{ data, loading }] = useAuth();
  const hasToken = Boolean(data?.accessToken);

  if (loading || (hasToken && !data?.details)) {
    return <Spinner />;
  }

  return <NotFound />;
};

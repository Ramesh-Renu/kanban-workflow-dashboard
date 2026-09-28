import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import useAuth from "./hooks/useAuth";
import "styles/vendor.scss";
import "@orion/shared/src/styles/icons/style.scss";
import "styles/index.scss";
import AccessRequired from "./pages/Unauthorized/AccessRequired";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { injectDependencies, useToast } from "@orion/shared";
import { InteractionStatus } from "@azure/msal-browser";
import {
  DashboardAccessGate,
  HomeRedirect,
  HubAppAccessGate,
  KnowledgeBaseAccessGate,
  ProtectedNotFound,
} from "components/routing/route-guards";

/** LAYOUTS */
const UserLayout = lazy(() => import("components/layout/user-layout.component"));

/** PAGES */
const Login = lazy(() => import("pages/Login/Login"));
const ApplicationHub = lazy(() => import("pages/ApplicationHub"));
const NewOrion = lazy(() => import("pages/ApplicationHub/NewOrion"));
const SupportCenter = lazy(()=> import ("pages/ApplicationHub/SupportCenter"));
const HomePage = lazy(() => import("pages/HomePage/index"));
const OrderOrionForm = lazy(() => import("pages/OrderOrion/Ticket/Form"));
const OrderView = lazy(() => import("pages/OrderOrion/Ticket/OrderView"));

/** ADMIN SETTING */
const SettingsHome = lazy(() => import("pages/Settings"));
const WorkSpaceUser = lazy(() => import("pages/Settings/Users/WorkSpaceUser"));
const WorkspaceAdmin = lazy(() => import("pages/Settings/Users/AdminUser"));
const InActiveUser = lazy(() => import("pages/Settings/Users/InActiveUser"));
const WorkSpaceManagement = lazy(() => import("./pages/Settings/Masters/Workspace"));
const WorkFlowManagement = lazy(() => import("./pages/Settings/Masters/WorkFlow"));
const NotFound = lazy(() => import("pages/NotFound/NotFound"));
const Dashboard = lazy(() => import("pages/Dashboard"));
const WorkspaceDashboard = lazy(() => import("pages/Dashboard/WorkspaceDashboard"));
const BoardDashboard = lazy(() => import("pages/Dashboard/BoardDashboard"));
const TaskDashboard = lazy(() => import("pages/Dashboard/TaskDashboard/TaskDashboard"));
const DashboardSettings = lazy(() => import("pages/Settings/Dashboard"));
const MasterData = lazy(() => import("pages/Settings/Masters/MasterData"));

/** KNOWLEDGE BASE */
const KnowledgeBaseLayout = lazy(() => import("pages/KnowledgeBase/KnowledgeBaseLayout"));
const KnowledgeBaseHome = lazy(() => import("pages/KnowledgeBase"));
const KnowledgeBaseDetails = lazy(() => import("pages/KnowledgeBase/KnowledgeBaseDetails"));
const KnowledgeBaseFolder = lazy(() => import("pages/KnowledgeBase/FolderDetails"));
const KnowledgeBaseIssue = lazy(() => import("pages/KnowledgeBase/issues/IssueDetails"));

const App = () => {
  const [{ data, loading }, { setAuth, logoutUser }] = useAuth();
  const { instance, accounts, inProgress } = useMsal();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    injectDependencies({ instance, setAuth, showToast, logoutUser });
  }, [instance, setAuth, showToast, logoutUser]);

  /** DISABLE/RESTRICT DEVELOPER OPTION - IF IT'S NOT 'DEV' ENVIRONMENT */
  useEffect(() => {
    if (!["production", "testing"].includes(process.env.REACT_APP_MODE)) return;

    const checkDevToolsShortcuts = (e) => {
      return (
        e.key === "F12" || // Blocks F12 key
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U")
      );
    };

    const handleKeyDown = (e) => {
      if (checkDevToolsShortcuts(e)) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    /** Attach the keydown & contextmenu event listener to block right-click & developer tool shortcuts */
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    /** Cleanup the event listeners when the component unmounts */
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  /** ----------------------- Workspace Availability ----------------------- */
  const hasWorkspaces =
    data?.details?.workspaceDTO?.length > 0 &&
    data?.details?.workspaceDTO[0]?.boardList?.length > 0;

  /** ----------------------- Redirect from /access-required if hasWorkspaces ----------------------- */
  // useEffect(() => {
  //   if (location.pathname === "/access-required" && hasWorkspaces) {
  //     navigate("/");
  //   }
  // }, [location.pathname, hasWorkspaces, navigate]);
  useEffect(() => {
    if (location.pathname === "/access-required") {
      navigate("/");
    }
  }, [hasWorkspaces]);

  /** ----------------------- Redirect to Login if not authenticated ----------------------- */
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return;

    if ((!isAuthenticated || accounts?.length === 0) && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, accounts, location.pathname, navigate]);

  if (loading && !isAuthenticated) {
    return <Spinner />; // app-wide loading only before auth; keep deep links mounted while user details load
  }

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* PUBLIC ROUTES — only when MSAL session is absent */}
        {(!isAuthenticated || accounts?.length === 0) && (
          <>
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Login />} />
          </>
        )}

        {/* PROTECTED ROUTES */}
        {/* Mount layout on MSAL auth only; user details load inside UserLayout.
            Requiring data?.details here breaks deep links (no route matches) until getUserInfo finishes. */}
        {isAuthenticated && accounts?.length > 0 && (
          <Route path="/" element={<UserLayout />}>
            <Route index element={<HomeRedirect />} />
          <Route path="home" element={<ApplicationHub />} />
          <Route path="new-orion" element={<NewOrion />} />
          <Route path="support-center" element={<SupportCenter/>}/>
            <Route path="dashboard/*" element={<DashboardAccessGate />}>
              <Route element={<Dashboard />}>
                <Route index element={<WorkspaceDashboard />} />
                <Route path="workspace">
                  <Route index element={<BoardDashboard />} />
                  <Route path="board" element={<TaskDashboard />} />
                </Route>
              </Route>
              {/* Ticket details opened from the dashboard: keeps the URL under
                  /dashboard so the Dashboard side-nav item stays highlighted. */}
              <Route
                path="board/details/:boardId/:orderId"
                element={
                  <HomePage
                    hasUserData={data?.details}
                    loading={loading}
                    hasWorkspaces={hasWorkspaces}
                  />
                }
              >
                <Route index element={<OrderView />} />
              </Route>
            </Route>
            {/* HOME PAGE — /orders for IOD (workspace id 1), /task for other workspaces */}
            {["orders/*", "task/*"].map((kanbanPath) => (
              <Route
                key={kanbanPath}
                path={kanbanPath}
                element={
                  <HubAppAccessGate appId="tasks">
                    <HomePage
                      hasUserData={data?.details}
                      loading={loading}
                      hasWorkspaces={hasWorkspaces}
                    />
                  </HubAppAccessGate>
                }
              >
                <Route path="details/:boardId/:orderId" element={<OrderView />} />
                <Route path="update/:id" element={<OrderOrionForm />} />
              </Route>
            ))}

            {/* KNOWLEDGE BASE — admins always; USR only with assigned permissions */}
            <Route path="knowledge-base" element={<KnowledgeBaseAccessGate />}>
              <Route element={<KnowledgeBaseLayout />}>
                <Route index element={<KnowledgeBaseHome />} />
                <Route path=":kbId" element={<KnowledgeBaseDetails />} />
                <Route path=":kbId/folder/:folderId" element={<KnowledgeBaseFolder />} />
                <Route
                  path=":kbId/folder/:folderId/issue/:issueId"
                  element={<KnowledgeBaseIssue />}
                />
              </Route>
            </Route>

            {/* ADMIN / SUPERADMIN ROUTES */}
            {(data?.details?.isSuperAdmin || data?.details?.user_type_code === "ADM") && (
              <>
                <Route path="users" element={<SettingsHome />}>
                  <Route index path="general" element={<WorkSpaceUser />} />
                  <Route path="admin" element={<WorkspaceAdmin />} />
                  <Route path="inActive" element={<InActiveUser />} />
                </Route>

                {(data?.details?.isSuperAdmin || data?.details?.user_type_code === "ADM") && (
                  <Route path="settings" element={<SettingsHome />}>
                    <Route index path="workspace" element={<WorkSpaceManagement />} />
                    <Route path="workflow" element={<WorkFlowManagement />} />
                    <Route index path="formulas" element={<DashboardSettings />} />
                    <Route index path="masterdata" element={<MasterData />} />
                  </Route>
                )}
              </>
            )}

            {/* ALWAYS ACCESSIBLE */}
            <Route path="access-required" element={<AccessRequired />} />
            <Route path="*" element={<ProtectedNotFound />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
};

export default App;

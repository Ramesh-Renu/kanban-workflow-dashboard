import React, { memo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ADMIN_DASHBOARD_SCOPE,
  DASHBOARD_ROUTES,
  ensureSingleBoardDashboardHome,
  getAdminDashboardScope,
  getAdminMyWorkspaceHomePath,
  hasAdminMyWorkspaceRoles,
  setAdminDashboardScope,
} from "utils/dashboard";

const SCOPE_OPTIONS = [
  { value: ADMIN_DASHBOARD_SCOPE.MINE, label: "My Workspace" },
  { value: ADMIN_DASHBOARD_SCOPE.ALL, label: "All Workspace" },
];

const AdminWorkspaceScopeToggle = ({ authDetails }) => {
  const navigate = useNavigate();
  const [scope, setScope] = useState(() => getAdminDashboardScope());
  const visible = hasAdminMyWorkspaceRoles(authDetails);

  const handleScopeChange = useCallback(
    (nextScope) => {
      if (nextScope === scope) return;
      setAdminDashboardScope(nextScope);
      setScope(nextScope);

      if (nextScope === ADMIN_DASHBOARD_SCOPE.ALL) {
        localStorage.removeItem("selectWorkspaceDashboard");
        localStorage.removeItem("selectBoardDashboard");
        navigate(DASHBOARD_ROUTES.home, {
          state: { adminDashboardScope: ADMIN_DASHBOARD_SCOPE.ALL },
        });
        return;
      }

      localStorage.removeItem("selectBoardDashboard");
      const singleBoardHome = ensureSingleBoardDashboardHome(authDetails);
      const homePath = singleBoardHome || getAdminMyWorkspaceHomePath(authDetails);
      if (homePath === DASHBOARD_ROUTES.workspace) {
        const dtoIds = (authDetails?.workspaceDTO || [])
          .map((workspace) => Number(workspace?.work_space_id))
          .filter((id) => Number.isFinite(id));
        const soleIodWorkspace =
          dtoIds.length > 0 && dtoIds.every((id) => id === 1) ? 1 : null;
        localStorage.setItem(
          "selectWorkspaceDashboard",
          JSON.stringify({
            type: "workspace",
            ...(soleIodWorkspace != null ? { id: soleIodWorkspace } : {}),
            name: "My Workspace",
            myWorkspaceBoardsHome: true,
          }),
        );
      } else if (homePath !== DASHBOARD_ROUTES.board) {
        localStorage.removeItem("selectWorkspaceDashboard");
      }
      navigate(homePath, {
        state: { adminDashboardScope: ADMIN_DASHBOARD_SCOPE.MINE },
      });
    },
    [authDetails, navigate, scope],
  );

  if (!visible) return null;

  return (
    <div
      className="dashboard-page__workspace-scope workspace-page"
      role="group"
      aria-label="Workspace scope"
    >
      {SCOPE_OPTIONS.map((option) => {
        const isActive = scope === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`dashboard-page__workspace-scope-btn${
              isActive ? " is-active" : ""
            }`}
            aria-pressed={isActive}
            onClick={() => handleScopeChange(option.value)}
          >
            {option.label}
            {/* {isActive ? (
              <span className="dashboard-page__workspace-scope-arrow" aria-hidden="true" />
            ) : null} */}
          </button>
        );
      })}
    </div>
  );
};

export default memo(AdminWorkspaceScopeToggle);

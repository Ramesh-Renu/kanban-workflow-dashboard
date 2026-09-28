import { Fragment, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Row } from "react-bootstrap";
import WorkSpaceSwitcher from "./WorkSpaceSwitcher";
import OrderOrion from "../OrderOrion";
import AccessRequired from "../Unauthorized/AccessRequired";
import KanbanHome from "../KanbanHome";
import useAuth from "../../hooks/useAuth";
import NotFound from "../NotFound/NotFound";
import Unauthorized from "../Unauthorized/Unauthorized";
import { setExpiresOn, setActiveWorkSpace } from "@orion/shared";
import {
  getKanbanBasePath,
  isKanbanPathname,
  replaceKanbanBaseInPath,
} from "../../utils/kanbanRoutes";

const HomePage = ({ hasUserData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isKanban, setisKanban] = useState(false);
  const [boardData, setBoardData] = useState([]);
  const [scoreBoardData, setScoreBoardData] = useState([]);
  const [filtersShow, setFiltersShow] = useState(false);
  const [activeCodes, setactiveCodes] = useState(null);
  const [permissionChange, setPermissionChange] = useState([]);
  const hideForDetailsPage =
    location.pathname === "/orders" || location.pathname === "/task";
  const [{ data: auth }, { setAuth, logoutUser }] = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);
  const [unauthorizedError, setUnauthorizedError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [errorInfo, setErrorInfo] = useState({});
  const { userRoleResponseDetail } = auth?.details || {};
  const rolesArray = Array.isArray(userRoleResponseDetail)
    ? userRoleResponseDetail.filter(Boolean) // remove null/undefined
    : [];
  const allBoards = rolesArray.flatMap((ws) =>
    Array.isArray(ws?.boards) ? ws.boards : [],
  );
  const [callGetTaskAPi, setCallGetTaskAPi] = useState(false);

  const userRole = allBoards.find((board) => board?.boardCode === "SA");

  // Keep URL base (/orders vs /task) aligned with active workspace
  useEffect(() => {
    if (!isKanbanPathname(location.pathname)) return;
    const expectedBase = getKanbanBasePath();
    const nextPath = replaceKanbanBaseInPath(location.pathname, expectedBase);
    if (nextPath !== location.pathname) {
      navigate(`${nextPath}${location.search}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [location.pathname, location.search, navigate]);

  const unAuthorizedUserRequestFailed = () => {
    // Run logout in background, independent of the rest
    (async () => {
      try {
        await logoutUser(); // handles async logout safely
      } catch (err) {
        console.error("Background logout failed:", err);
      }
    })();
    setAuth("");
    setExpiresOn("");
    setActiveWorkSpace("");
    navigate("/", { replace: true });
  };

  const getBoardData = async (data, val, type) => {
    if (!auth.details || !auth?.details?.regId) return;
    if (data?.length > 0) {
      setBoardData(data);
      setactiveCodes(val);
      setisKanban(data?.some((board) => board?.code === "SA") ? false : true);
      setCallGetTaskAPi(false);
    }
  };
  const handleGetTaskName = (val) => {
    setactiveCodes(val?.code);
    setCallGetTaskAPi(false);
  };

  useEffect(() => {
    if (location?.state?.boardId) {
      setactiveCodes(null);
      setCallGetTaskAPi(false);
    }
  }, [location?.state?.boardId]);

  // Function to handle errors
  const handleError = (errorType, message, errorCode) => {
    // You can handle error messages and error codes here
    if (errorType === "unauthorized") {
      // Handle Unauthorized Error (e.g., redirect to login)
      setUnauthorizedError(true);
      setErrorInfo({ code: errorCode, message: message });
    } else if (errorType === "server") {
      // Handle Server Error (e.g., show a generic message)
      setServerError(true);
      setErrorInfo({
        code: errorCode,
        message: `${message} (Error Code: ${errorCode})`,
      });
    }
  };
  const handlePermissionChange = (e) => {
    setPermissionChange(e);
    setCallGetTaskAPi(false);
  };

  const callGetTaskData = async (isCreatedTask = false) => {
    // You can add any additional logic here if needed
    // setCallGetTaskAPi((prev) => prev + 1);
    setCallGetTaskAPi(true);
  };
  const resetRefreshKey = () => {
    setCallGetTaskAPi(false);
  };

  return (
    <Fragment>
      {hideForDetailsPage &&
        !serverError &&
        !unauthorizedError &&
        hasUserData?.workspaceDTO !== null &&
        hasUserData?.workspaceDTO?.length > 0 && (
          <header
            className="workspaceContainer"
            aria-label="Workspace switcher and filters"
          >
            {hasUserData && (
              <WorkSpaceSwitcher
                userData={hasUserData}
                isKanban={isKanban}
                showFilter={hideForDetailsPage && isKanban}
                getShowFilter={setFiltersShow}
                filtersShow={filtersShow}
                getTaskName={handleGetTaskName}
                getBoard={getBoardData}
                showDrawer={showDrawer}
                setShowDrawer={(e) => setShowDrawer(e)}
                userRole={userRole}
                handlePermissionChange={handlePermissionChange}
                scoreBoardData={scoreBoardData}
                callGetApi={callGetTaskData}
              />
            )}
          </header>
        )}
      {!serverError && !unauthorizedError && (
        <Row
          className="d-flex m-0 p-0 d-flex gap-2"
          role="main"
          aria-label="Orders workspace content"
        >
          {hideForDetailsPage &&
          hasUserData?.workspaceDTO !== null &&
          hasUserData?.workspaceDTO?.length > 0 &&
          boardData?.some((board) => board?.code === "SA") ? (
            <OrderOrion
              showDrawer={showDrawer}
              setShowDrawer={(e) => setShowDrawer(e)}
              getScoreBoardData={setScoreBoardData}
              getHandlePermissionChange={permissionChange}
              boardData={boardData}
            />
          ) : hideForDetailsPage &&
            hasUserData?.workspaceDTO !== null &&
            hasUserData?.workspaceDTO?.length > 0 &&
            boardData &&
            activeCodes ? (
            <KanbanHome
              filtersShow={filtersShow}
              activeTaskCodes={activeCodes}
              board={boardData}
              setFiltersShow={setFiltersShow}
              handleChanedTask={handleGetTaskName}
              onError={handleError}
              refreshKey={callGetTaskAPi}
              resetRefreshKey={resetRefreshKey}
            />
          ) : null}
          {(hasUserData?.workspaceDTO === null ||
            hasUserData?.workspaceDTO.length === 0) && <AccessRequired />}
          {/* Nested children like /orders/details/:id will render here */}
          <Outlet />
        </Row>
      )}

      {/* Handle server/unauthorized errors */}
      {serverError && errorInfo?.code && <NotFound code={errorInfo?.code} />}
      {unauthorizedError && errorInfo?.code && (
        <Unauthorized unAuthorizedUser={unAuthorizedUserRequestFailed} />
      )}
    </Fragment>
  );
};

export default HomePage;

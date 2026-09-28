import {
  useEffect,
  useRef,
  useState,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import packageJson from "./../../../../package.json";
import { orionLogo, appLogo } from "../../../assets/images";
import {
  loginRequestB2C,
  loginRequestORG,
  msalInstanceB2C,
  msalInstanceORG,
} from "authConfig";
import { acquireTokenWithFallback } from "../../../utils/common";
import { performAppLogout } from "../../../utils/authLogout";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import * as menu from "../../../assets/images";
import useAuth from "../../../hooks/useAuth";
// import packageJson from "./../../../../package.json";
import { useGlobalMaster } from "@orion/shared";
import LogoAvatarShowLetter from "../../../components/common/LogoAvatarShowLetter";
import usePhotoSync from "../../../hooks/usePhotoSync";
import {
  setExpiresOn,
  getExpiresOn,
  getAuthType,
  setAuthType,
  setDeepLinkURL,
  getDeepLinkURL,
} from "@orion/shared";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";
import { useNotification } from "../../../hooks/useNotification";
import { Badge, Button, Card, ListGroup, Dropdown } from "react-bootstrap";
import Notification from "pages/Notification/Notification";
import NotificationDrawer from "../../../components/common/NotificationDrawer";
import { EditPrimaryIcon } from "../../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import OrionAIPill from "../../../pages/Dashboard/utils/OrionAIPill";
import { getKanbanBasePath, isKanbanPathname } from "../../../utils/kanbanRoutes";
import { canOpenHubApp } from "constant/applicationHubApps";
import { getDashboardHomePath, isDashboardAdmin } from "utils/dashboard";
import { getApplicationHubNavLinks } from "constant/applicationHubApps";
import { openHubApp } from "utils/hubOpenApps";

const isKnowledgeBaseAppPath = (pathname = "") => pathname.includes("/knowledge-base");

const isTaskManagementAppPath = (pathname = "") =>
  pathname.includes("/dashboard") || isKanbanPathname(pathname);

const isApplicationHubPath = (pathname = "") => pathname === "/home" || pathname === "/";

const APP_SHELL = {
  TASKS: "tasks",
  KNOWLEDGE: "knowledge",
};

const KNOWLEDGE_BASE_LINKS = [
  { clicked: false, to: "/knowledge-base", label: "Knowledge Base" },
];

const WORKSPACE_LINKS = [
  { to: "/users/general", label: "Workspace User" },
  { to: "/users/admin", label: "Admin User" },
  { to: "/users/inactive", label: "Inactive User" },
];

const NOTIFICATION_LINKS = [{ clicked: true, label: "Notifications" }];

const SETTINGS_LINKS = [
  { clicked: false, to: "/settings/workspace", label: "Workspace" },
  { to: "/settings/workflow", label: "WorkFlow" },
  { to: "/settings/formulas", label: "Formulas" },
  { to: "/settings/masterdata", label: "Master Data" },
];

const HELP_LINKS = [{ clicked: false, to: "/support-center", label: "Help Centre" }];
const SideNav = ({ onChange }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [collaps, setCollaps] = useState(false);
  const { roleList, getRoleList } = useGlobalMaster();
  const [{ data: auth }, { setAuth, logoutUser }] = useAuth();
  const { accounts } = useMsal();
  const popupRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showCollapsInfo, setCollapsShowInfo] = useState(false);
  const { photoSync, photoSyncLoading } = usePhotoSync();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [hoverPopup, setHoverPopup] = useState({
    visible: false,
    top: 0,
    left: 0,
    links: [],
  });
  const hoverPopupHideTimerRef = useRef(null);
  const location = useLocation();

  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved) || {};
  const { activeWorkSpace = [], activeBoard = [] } = parsed;
  const kanbanBasePath = getKanbanBasePath(activeWorkSpace?.[0]?.work_space_id);
  const KANBAN_LINKS = [{ clicked: false, to: kanbanBasePath, label: "Workspaces" }];
  const dashboardHomePath = getDashboardHomePath(auth?.details);
  const DASHBOARD_LINKS = [{ clicked: false, to: dashboardHomePath, label: "Dashboard" }];
  const homeAppLinks = useMemo(
    () => getApplicationHubNavLinks(auth?.details),
    [auth?.details],
  );

  const selectAppLinks = useMemo(() => {
    const links = [
      { id: "home", label: "Orion Home", short: "OH", to: "/home", isExternal: false },
      {
        id: "tasks",
        label: "Task Management",
        short: "TM",
        to: dashboardHomePath,
        isExternal: false,
        appId: "tasks",
      },
      {
        id: "workspace",
        label: "Workspace",
        short: "WS",
        to: kanbanBasePath,
        isExternal: false,
      },
    ];

    homeAppLinks.forEach((link) => {
      if (!link?.appId || link.appId === "tasks") return;
      const shortMap = {
        knowledge: "KB",
        kimai: "KM",
        lms: "LMS",
        infozo: "IZ",
        opifex: "OP",
        autoiat: "AI",
      };
      links.push({
        id: link.appId,
        label: link.label,
        short: shortMap[link.appId] || link.label.slice(0, 2).toUpperCase(),
        to: link.to,
        isExternal: Boolean(link.isExternal),
        appId: link.appId,
      });
    });

    return links;
  }, [dashboardHomePath, kanbanBasePath, homeAppLinks]);

  const activeSelectApp = useMemo(() => {
    const { pathname } = location;
    if (isApplicationHubPath(pathname)) {
      return selectAppLinks.find((l) => l.id === "home") || selectAppLinks[0];
    }
    if (isKnowledgeBaseAppPath(pathname)) {
      return selectAppLinks.find((l) => l.id === "knowledge") || selectAppLinks[0];
    }
    if (isKanbanPathname(pathname)) {
      return selectAppLinks.find((l) => l.id === "workspace") || selectAppLinks[0];
    }
    if (isTaskManagementAppPath(pathname)) {
      return selectAppLinks.find((l) => l.id === "tasks") || selectAppLinks[0];
    }
    return selectAppLinks.find((l) => l.id === "tasks") || selectAppLinks[0];
  }, [location.pathname, selectAppLinks]);
  const [appShell, setAppShell] = useState(() => {
    if (isTaskManagementAppPath(location.pathname)) return APP_SHELL.TASKS;
    if (isKnowledgeBaseAppPath(location.pathname)) return APP_SHELL.KNOWLEDGE;
    return null;
  });

  useEffect(() => {
    const { pathname } = location;
    if (isTaskManagementAppPath(pathname)) {
      setAppShell(APP_SHELL.TASKS);
      return;
    }
    if (isKnowledgeBaseAppPath(pathname)) {
      setAppShell(APP_SHELL.KNOWLEDGE);
      return;
    }
    // Hub home clears the app shell; Users/Settings/Notifications keep it open.
    if (isApplicationHubPath(pathname)) {
      setAppShell(null);
    }
  }, [location.pathname]);

  const isTaskManagementApp =
    appShell === APP_SHELL.TASKS || isTaskManagementAppPath(location.pathname);
  const isKnowledgeBaseApp =
    appShell === APP_SHELL.KNOWLEDGE || isKnowledgeBaseAppPath(location.pathname);
  const isHubAdmin = isDashboardAdmin(auth?.details);
  const { pageNotification, getPageNotificationData } = useNotification();
  const [hasUnread, setHasUnread] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const logoutTimerRef = useRef(null);
  const popupContainerRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showMobileNavBar, setShowMobileNavBar] = useState(false);

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!roleList?.loading && !roleList?.error && roleList?.data?.length === 0) {
      getRoleList();
    }
  }, []);

  useEffect(() => {
    /** Notification */
    if (auth?.details !== null) {
      getPageNotificationData();
    }
  }, [auth?.details]);

  useEffect(() => {
    if (Array.isArray(pageNotification)) {
      const anyUnread = pageNotification?.filter(
        (notification) => !notification.is_read,
      ).length;
      setHasUnread(anyUnread);
    }
  }, [pageNotification]);

  /** INITIAL CALL */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        ((popupRef.current && !popupRef.current.contains(event.target)) ||
          popupRef.current == null) &&
        popupContainerRef.current &&
        !popupContainerRef.current.contains(event.target)
      ) {
        setShowInfo(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  /** HANDLE SHOW/HIDE MENU ITEM BASED ON USER CLICK */
  const handleMenuItem = (e) => {
    const showPopup = showInfo ? !showInfo : true;
    if (e.type === "click" || e.key === "Enter") {
      setShowInfo(showPopup);
    }
  };
  /** CLEARS TOKEN & LOGOUT USER */
  const userLogout = useCallback(() => {
    performAppLogout({
      logoutUser,
      setAuth,
      navigate,
      onBeforeLogout: () => setShowInfo(false),
    });
  }, [logoutUser, navigate, setAuth]);

  /** REFRESH TOKEN LOGIC */
  const refreshToken = () => {
    const isB2C = getAuthType() === "B2C";
    const activeInstance = isB2C ? msalInstanceB2C : msalInstanceORG;
    const activeLoginRequest = isB2C ? loginRequestB2C : loginRequestORG;

    acquireTokenWithFallback(activeInstance, accounts[0], activeLoginRequest, true)
      .then(({ accessToken, idTokenClaims }) => {
        setAuth(accessToken);
        setExpiresOn(idTokenClaims.exp);
        clearTimeout(logoutTimerRef.current);
        setShowSessionModal(false);
      })
      .catch((error) => {
        console.error("Token refresh failed", error);
        userLogout();
      });
  };

  const handleStorageChange = useCallback(
    (event) => {
      if (event.key === "expiresOn") {
        const newExpiresOn = Number(event.newValue);
        const now = Math.floor(Date.now() / 1000);

        if (newExpiresOn > now) {
          clearTimeout(logoutTimerRef.current);
          setShowSessionModal(false);
        }
      }

      if (event.key === "logout" && event.newValue === "true") {
        userLogout();
      }
    },
    [userLogout],
  );

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiresOn = getExpiresOn();
      // localStorage.setItem("lastActive", Date.now());
      localStorage.setItem("lastActive", Math.floor(Date.now() / 1000));
      if (expiresOn) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeRemaining = expiresOn - currentTime;

        if (timeRemaining < 300 && !showSessionModal) {
          // Show popup only once when 5 min left
          setShowSessionModal(true);

          // Start countdown for forced logout after 60 seconds
          logoutTimerRef.current = setTimeout(() => {
            console.warn("User inactive, logging out...");
            userLogout();
          }, 300000); // 5 minute
        }
      } else {
        userLogout();
      }
    }, 60000); // Check every 1 minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const expiresOn = getExpiresOn();
      const lastActive = Number(localStorage.getItem("lastActive"));
      const currentTime = Math.floor(Date.now() / 1000);
      const oneDay = 24 * 60 * 60;

      // First login – if lastActive doesn't exist, initialize it
      if (!lastActive) {
        localStorage.setItem("lastActive", currentTime);
        return;
      }

      // Token missing → logout
      if (!expiresOn) {
        userLogout();
        return;
      }

      // Token expired → logout
      if (expiresOn < currentTime) {
        userLogout();
        return;
      }

      // Inactive more than 1 day → logout
      if (currentTime - lastActive > oneDay) {
        userLogout();
        return;
      }
      localStorage.setItem("lastActive", currentTime);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!auth?.details) return;
    const getSavedState = () => {
      try {
        return JSON.parse(localStorage.getItem("workspaceState"));
      } catch {
        return null;
      }
    };
    const setDefaultTabs = (workflowType) => {
      // Workflow 60: Main Task toggle removed — always Sub Task.
      const tabs =
        Number(workflowType) === 60
          ? [{ id: 2, code: "SubTask", name: "Sub Task", isActive: true }]
          : [{ id: 1, code: "Task", name: "Task", isActive: true }];

      localStorage.setItem("isActiveTab", JSON.stringify({ tabs }));
    };
    const workspaceState = getSavedState();

    const savedTabs = localStorage.getItem("isActiveTab");

    // ✅ Create default tabs if missing, or migrate legacy MainTask → SubTask
    if (workspaceState?.activeWorkSpace?.length) {
      const workflowType = workspaceState.activeWorkSpace[0]?.workflowType;
      if (!savedTabs) {
        setDefaultTabs(workflowType);
      } else if (Number(workflowType) === 60) {
        try {
          const parsedTabs = JSON.parse(savedTabs);
          const usesMainTask = parsedTabs?.tabs?.some((t) => t.code === "MainTask");
          if (usesMainTask) setDefaultTabs(workflowType);
        } catch {
          setDefaultTabs(workflowType);
        }
      }
    }

    // ✅ Handle deep link
    const redirectURL = getDeepLinkURL();
    if (redirectURL) {
      setDeepLinkURL();
      navigate(redirectURL);
      return;
    }

    const workspaces = auth.details.workspaceDTO || [];

    // ✅ First time setup
    if (!workspaceState && workspaces.length > 0) {
      const firstWorkspace = workspaces[0];
      const firstBoard = firstWorkspace?.boardList?.[0];

      const newState = {
        activeWorkSpace: [firstWorkspace],
        activeBoard: firstBoard ? [firstBoard] : [],
      };

      localStorage.setItem("workspaceState", JSON.stringify(newState));
      setDefaultTabs(firstWorkspace.workflowType);
      return;
    }

    // ✅ Validate active board exists
    if (workspaceState && workspaces.length > 0) {
      const activeBoardCode = workspaceState?.activeBoard?.[0]?.code;
      const activeWorkSpaceId = workspaceState?.activeWorkSpace?.[0]?.work_space_id;

      const updateActiveWorkSpace = workspaces.find(
        (ws) => ws.work_space_id === activeWorkSpaceId,
      );
      const updataActiveBoard = updateActiveWorkSpace?.boardList?.find(
        (b) => b.code === activeBoardCode,
      );

      if (updateActiveWorkSpace && updataActiveBoard) {
        localStorage.setItem(
          "workspaceState",
          JSON.stringify({
            activeWorkSpace: [updateActiveWorkSpace],
            activeBoard: [updataActiveBoard],
          }),
        );
      } else if (!updataActiveBoard && !updateActiveWorkSpace) {
        const firstWorkspace = workspaces[0];
        const firstBoard = firstWorkspace?.boardList?.[0];

        localStorage.setItem(
          "workspaceState",
          JSON.stringify({
            activeWorkSpace: [firstWorkspace],
            activeBoard: firstBoard ? [firstBoard] : [],
          }),
        );

        setDefaultTabs(firstWorkspace.workflowType);
        return;
      }
    }

    // ✅ No workspace access
    if (workspaces.length === 0) {
      localStorage.setItem(
        "workspaceState",
        JSON.stringify({
          activeWorkSpace: [],
          activeBoard: [],
        }),
      );
      const onHub = location.pathname === "/home" || location.pathname === "/";
      if (!onHub) {
        navigate("/access-required");
      }
    }
  }, [auth?.details, location.pathname, navigate]);

  // const handleMouseEnter = () => {
  //   if (!collaps) {
  //     setCollaps(true);
  //     onChange(true);
  //   }
  // };

  // const handleMouseLeave = () => {
  //   if (collaps) {
  //     setCollaps(false);
  //     onChange(false);
  //   }
  // };

  useLayoutEffect(() => {
    const bodyContent = document.querySelector(".customKanabnLoader");
    if (!bodyContent) return;

    bodyContent.style.transition = "width 0.38s cubic-bezier(0.4, 0, 0.2, 1)";
    bodyContent.style.width = `calc(100% - ${collaps ? 256 : 70}px)`;
    bodyContent.style.height = "calc(100vh - 160px)";
  }, [collaps]);

  const expandCollaps = (e) => {
    let showTitle = collaps ? !collaps : true;

    if (windowWidth <= 600) {
      setShowMobileNavBar(showTitle);
    } else if (windowWidth > 600) {
      setShowMobileNavBar(false);
    }
    setCollaps(showTitle);
    // Keep secondary UI in sync with width animation (not 1s lag)
    setTimeout(() => {
      setCollapsShowInfo(showTitle);
    }, 380);
    onChange(showTitle);
  };

  const toggleDropdown = useCallback(
    (show, key) => {
      setActiveDropdown(key);
      setShowDropdownMenu((prev) => (activeDropdown === key ? !show : true));
    },
    [activeDropdown],
  );

  const handleLogout = () => {
    userLogout();
    setShowSessionModal(false);
    clearTimeout(logoutTimerRef.current);
  };

  const handleMouseEnter = (e, links) => {
    if (windowWidth <= 600 && links.length === 1) {
      setShowMobileNavBar(false);
      setCollaps(false);
    }
    if (collaps) return; // only when collapsed (icon rail)
    if (hoverPopupHideTimerRef.current) {
      clearTimeout(hoverPopupHideTimerRef.current);
      hoverPopupHideTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPopup({
      visible: true,
      top: rect.top,
      left: rect.right + 8,
      links,
    });
  };

  const handleMouseLeave = () => {
    if (hoverPopupHideTimerRef.current) {
      clearTimeout(hoverPopupHideTimerRef.current);
    }
    hoverPopupHideTimerRef.current = setTimeout(() => {
      setHoverPopup((prev) => ({ ...prev, visible: false }));
      hoverPopupHideTimerRef.current = null;
    }, 120);
  };

  const keepHoverPopupOpen = () => {
    if (hoverPopupHideTimerRef.current) {
      clearTimeout(hoverPopupHideTimerRef.current);
      hoverPopupHideTimerRef.current = null;
    }
    setHoverPopup((prev) => ({ ...prev, visible: true }));
  };

  const handleSelectApp = useCallback(
    (app) => {
      setShowAppSwitcher(false);
      if (!app?.to) return;
      if (app.isExternal) {
        if (app.appId) openHubApp(app.appId, app.to);
        else window.open(app.to, "_blank", "noopener,noreferrer");
        return;
      }
      navigate(app.to);
    },
    [navigate],
  );

  useEffect(() => {
    if (!showAppSwitcher) return undefined;
    const handleOutside = (event) => {
      if (!event.target.closest(".sidenav-select")) {
        setShowAppSwitcher(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [showAppSwitcher]);

  const userRole = useMemo(() => {
    if (!roleList?.data || !auth?.details) return null;
    return roleList.data.find((r) => r.status_id === auth.details.user_type);
  }, [roleList?.data, auth?.details?.user_type]);

  const canManageUsers = isHubAdmin || userRole?.code === "ADM";
  const canManageSettings =
    auth?.details?.isSuperAdmin === true || userRole?.code === "ADM";
  const roleLabel =
    roleList?.data?.find((userType) => userType.status_id === auth?.details?.user_type)
      ?.name || "Guest";

  return (
    <>
      {((!showMobileNavBar && windowWidth > 600) ||
        (showMobileNavBar && windowWidth <= 600)) && (
        <Fragment>
          <div className={`sidenav-content ${collaps ? "expanded" : ""}`}>
            {auth?.details !== null && (
              <Fragment>
                <div className="sidenav-content__headings">
                  <div className={`sidenav-content__logo ${collaps ? "collaps" : ""}`}>
                    <button
                      type="button"
                      className="sidenav-content__logo-btn"
                      onClick={() => navigate("/home")}
                      title="Go to home"
                      aria-label="Go to home"
                    >
                      <img
                        src={collaps ? appLogo : orionLogo}
                        alt="orion-logo"
                        className={!collaps ? "orionLogo" : ""}
                      />
                    </button>
                  </div>

                  {/* Select — app switcher */}
                  <div className={`sidenav-select ${collaps ? "expanded" : "collapsed"}`}>
                    <p className="sidenav-section-label">Select</p>
                    <button
                      type="button"
                      className={`sidenav-select__trigger ${showAppSwitcher ? "is-open" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAppSwitcher((prev) => !prev);
                      }}
                      title={activeSelectApp?.label || "Select app"}
                      aria-expanded={showAppSwitcher}
                    >
                      <span className="sidenav-select__trigger-label">
                        {collaps
                          ? activeSelectApp?.label || "Task Management"
                          : activeSelectApp?.short || "TM"}
                      </span>
                      <img
                        src={
                          showAppSwitcher ? menu.sideMenuUpArrow : menu.sideMenuDownAarrow
                        }
                        alt=""
                        aria-hidden="true"
                        className="sidenav-select__caret"
                      />
                    </button>
                    {showAppSwitcher && (
                      <div className="sidenav-select__menu" role="listbox">
                        {selectAppLinks.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            role="option"
                            aria-selected={activeSelectApp?.id === app.id}
                            className={`sidenav-select__option ${
                              activeSelectApp?.id === app.id ? "is-active" : ""
                            }`}
                            onClick={() => handleSelectApp(app)}
                          >
                            {app.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      !collaps
                        ? "sidenav-content__headings-lists collaps"
                        : "sidenav-content__headings-lists"
                    }
                  >
                    <p className="sidenav-section-label">General</p>
                    {/* Task Management app: Dashboard + Workspaces */}
                    {isTaskManagementApp && (
                      <h5
                        className={`sidenav-content__headings-lists--title ${
                          !showDrawer && location.pathname.includes("/dashboard")
                            ? "active"
                            : ""
                        }`}
                        title="Dashboard"
                        onMouseEnter={(e) => handleMouseEnter(e, DASHBOARD_LINKS)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <NavLink
                          to={dashboardHomePath}
                          className={`link-tag sidenav-has-active-dot ${
                            !showDrawer && location.pathname.includes("/dashboard")
                              ? "active"
                              : ""
                          }`}
                        >
                          <img
                            src={
                              !showDrawer && location.pathname.includes("/dashboard")
                                ? menu.Home
                                : menu.inactiveHome
                            }
                            width={"20px"}
                            alt="Dashboard"
                          />
                          <span className="sidenav-link-label">Dashboard</span>
                          <span className="sidenav-active-dot" aria-hidden="true" />
                        </NavLink>
                      </h5>
                    )}
                    {isTaskManagementApp && (
                      <h5
                        className={`sidenav-content__headings-lists--title ${
                          !showDrawer && isKanbanPathname(location.pathname)
                            ? "active"
                            : ""
                        }`}
                        title="Workspaces"
                        onMouseEnter={(e) => handleMouseEnter(e, KANBAN_LINKS)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <NavLink
                          to={kanbanBasePath}
                          className={`link-tag sidenav-has-active-dot ${
                            !showDrawer && isKanbanPathname(location.pathname)
                              ? "active"
                              : ""
                          }`}
                        >
                          <img
                            src={
                              !showDrawer && isKanbanPathname(location.pathname)
                                ? menu.Kanban
                                : menu.inactiveKanban
                            }
                            alt="Workspaces"
                          />
                          <span className="sidenav-link-label">Workspaces</span>
                          <span className="sidenav-active-dot" aria-hidden="true" />
                        </NavLink>
                      </h5>
                    )}
                    {/* Knowledge Base app: Knowledge Base only */}
                    {isKnowledgeBaseApp && canOpenHubApp(auth?.details, "knowledge") && (
                      <h5
                        className={`sidenav-content__headings-lists--title ${
                          !showDrawer && location.pathname.includes("/knowledge-base")
                            ? "active"
                            : ""
                        }`}
                        title="Knowledge Base"
                        onMouseEnter={(e) => handleMouseEnter(e, KNOWLEDGE_BASE_LINKS)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <NavLink
                          to="/knowledge-base"
                          className={`link-tag sidenav-has-active-dot ${
                            !showDrawer && location.pathname.includes("/knowledge-base")
                              ? "active"
                              : ""
                          }`}
                        >
                          <img
                            src={
                              !showDrawer && location.pathname.includes("/knowledge-base")
                                ? menu.KnowledgeBase
                                : menu.inactiveKnowledgeBase
                            }
                            alt="Knowledge Base"
                          />
                          <span className="sidenav-link-label">Knowledge Base</span>
                          <span className="sidenav-active-dot" aria-hidden="true" />
                        </NavLink>
                      </h5>
                    )}
                    {auth?.details !== null && canManageUsers && (
                      <>
                        {/* USERS */}
                        <h5
                          onMouseEnter={(e) => handleMouseEnter(e, WORKSPACE_LINKS)}
                          onMouseLeave={handleMouseLeave}
                          className={`sidenav-content__headings-lists--title ${
                            !showDrawer && location.pathname.includes("/users")
                              ? "active"
                              : ""
                          }
                        `}
                          title="Users"
                        >
                          <div
                            className={`link-tag ${
                              !showDrawer && location.pathname.includes("/users")
                                ? "active"
                                : ""
                            }`}
                            onClick={() => {
                              if (windowWidth <= 600) {
                                setShowMobileNavBar(true);
                                setCollaps(true);
                                onChange(true);
                                toggleDropdown(showDropdownMenu, "users");
                              } else {
                                setCollaps(true);
                                onChange(true);
                                toggleDropdown(showDropdownMenu, "users");
                                setHoverPopup((prev) => ({
                                  ...prev,
                                  visible: false,
                                }));
                              }
                            }}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (windowWidth <= 600) {
                                  setShowMobileNavBar(true);
                                  setCollaps(true);
                                  onChange(true);
                                  toggleDropdown(showDropdownMenu, "users");
                                } else {
                                  setCollaps(true);
                                  onChange(true);
                                  toggleDropdown(showDropdownMenu, "users");
                                  setHoverPopup((prev) => ({
                                    ...prev,
                                    visible: false,
                                  }));
                                }
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <div
                              className={`navigate-icon-wrapper ${
                                !showDrawer && location.pathname.includes("/users")
                                  ? "active"
                                  : ""
                              }`}
                            >
                              {" "}
                              <img
                                src={
                                  !showDrawer && location.pathname.includes("/users")
                                    ? menu.Users
                                    : menu.inactiveUsers
                                }
                                alt="Users"
                              />
                            </div>
                            <div
                              className={`navigate-icon-text sidenav-link-label ${
                                !showDrawer && location.pathname.includes("/users")
                                  ? "active"
                                  : ""
                              }`}
                            >
                              User Management
                              <img
                                className={`arrow-icon-up ${
                                  !showDrawer && location.pathname.includes("/users")
                                    ? "active"
                                    : "inActive"
                                }`}
                                src={
                                  showDropdownMenu && activeDropdown === "users"
                                    ? menu.sideMenuUpArrow
                                    : menu.sideMenuDownAarrow
                                }
                                alt="side Menu Aarrow"
                              />
                            </div>
                          </div>
                          {collaps && showDropdownMenu && activeDropdown === "users" && (
                            <div className="menu-dropdown">
                              <NavLink
                                to="/users/general"
                                className={"dropdown-link"}
                                onClick={() => toggleDropdown(false, "users")}
                              >
                                {" "}
                                Workspace User{" "}
                              </NavLink>
                              <NavLink
                                to="/users/admin"
                                className={"dropdown-link"}
                                onClick={() => toggleDropdown(false, "users")}
                              >
                                {" "}
                                Admin User{" "}
                              </NavLink>
                              <NavLink
                                to="/users/inactive"
                                className={"dropdown-link"}
                                onClick={() => toggleDropdown(false, "users")}
                              >
                                {" "}
                                Inactive User{" "}
                              </NavLink>
                            </div>
                          )}
                        </h5>

                        {/* MASTER */}
                        {/* {auth?.details?.isSuperAdmin === true && (
                            <>
                              <h5
                                onMouseEnter={(e) =>
                                  handleMouseEnter(e, MASTER_LINKS)
                                }
                                onMouseLeave={handleMouseLeave}
                                className={`sidenav-content__headings-lists--title ${
                                  !showDrawer &&
                                  location.pathname.includes("/master")
                                    ? "active"
                                    : ""
                                }`}
                                title="Master"
                              >
                                <div
                                  className={`link-tag ${
                                    !showDrawer &&
                                    location.pathname.includes("/master")
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    if (windowWidth <= 600) {
                                      setShowMobileNavBar(true);
                                      setCollaps(true);
                                      onChange(true);
                                      toggleDropdown(showDropdownMenu, "users");
                                    } else {
                                      setCollaps(true);
                                      onChange(true);
                                      toggleDropdown(
                                        showDropdownMenu,
                                        "master",
                                      );
                                      setHoverPopup((prev) => ({
                                        ...prev,
                                        visible: false,
                                      }));
                                    }
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <div
                                    className={`navigate-icon-wrapper ${
                                      !showDrawer &&
                                      location.pathname.includes("/master")
                                        ? "active"
                                        : ""
                                    }`}
                                  >
                                    <img
                                      src={
                                        !showDrawer &&
                                        location.pathname.includes("/master")
                                          ? menu.MasterDB
                                          : menu.inactiveMasterDB
                                      }
                                      alt="Master"
                                    />{" "}
                                  </div>

                                  {collaps && (
                                    <div
                                      className={`navigate-icon-text ${
                                        !showDrawer &&
                                        location.pathname.includes("/master")
                                          ? "active"
                                          : ""
                                      }`}
                                    >
                                      Master
                                      <img
                                        className={`arrow-icon-up ${
                                          !showDrawer &&
                                          location.pathname.includes("/master")
                                            ? "active"
                                            : "inActive"
                                        }`}
                                        src={
                                          showDropdownMenu &&
                                          activeDropdown === "master"
                                            ? menu.sideMenuUpArrow
                                            : menu.sideMenuDownAarrow
                                        }
                                        alt="side Menu Aarrow"
                                      />
                                    </div>
                                  )}
                                </div>
                                {collaps &&
                                  showDropdownMenu &&
                                  activeDropdown === "master" && (
                                    <div className="menu-dropdown">
                                      <NavLink
                                        to="/master/workspace"
                                        className={"dropdown-link"}
                                        onClick={() =>
                                          toggleDropdown(false, "master")
                                        }
                                      >
                                        {" "}
                                        Workspace{" "}
                                      </NavLink>
                                      <NavLink
                                        to="/master/workflow"
                                        className={"dropdown-link"}
                                        onClick={() =>
                                          toggleDropdown(false, "master")
                                        }
                                      >
                                        {" "}
                                        WorkFlow{" "}
                                      </NavLink>
                                    </div>
                                  )}
                              </h5>
                            </>
                          )} */}
                      </>
                    )}
                    {/* Notification */}
                    {auth?.details?.workspaceDTO?.length > 0 && (
                      <h5
                        onMouseEnter={(e) => handleMouseEnter(e, NOTIFICATION_LINKS)}
                        onMouseLeave={handleMouseLeave}
                        className={`sidenav-content__headings-lists--title ${
                          showDrawer ? "active" : ""
                        }`}
                        title="Notification"
                        onClick={() => {
                          if (windowWidth <= 600) {
                            setShowDrawer(true);
                            setShowMobileNavBar(false);
                            setCollaps(false);
                          } else {
                            setShowDrawer(true);
                          }
                        }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (windowWidth <= 600) {
                              setShowDrawer(true);
                              setShowMobileNavBar(false);
                              setCollaps(false);
                            } else {
                              setShowDrawer(true);
                            }
                          }
                        }}
                      >
                        <div
                          className={`link-tag sidenav-has-active-dot ${
                            showDrawer ? "active" : ""
                          }`}
                        >
                          <div className="navigate-icon-icon-wrapper m-0 p-0">
                            <img
                              src={
                                showDrawer ? menu.Notification : menu.inactiveNotification
                              }
                              alt="Notification"
                              className="notification-icon"
                            />
                            {/* Show badge if there are unread notifications */}
                            {!collaps && hasUnread > 0 && (
                              <span className="notification-badge" />
                            )}
                          </div>
                          <div
                            className={`navigate-icon-text sidenav-link-label ${
                              showDrawer ? "text-color-white" : ""
                            }`}
                          >
                            Notification
                            {hasUnread > 0 && <Badge bg="danger">{hasUnread}</Badge>}
                          </div>
                          <span className="sidenav-active-dot" aria-hidden="true" />
                        </div>
                        {/* </NavLink> */}
                      </h5>
                    )}
                    {hoverPopup.visible &&
                      createPortal(
                        <div
                          className="hover-popup hover-popup--fixed"
                          style={{
                            position: "fixed",
                            top: hoverPopup.top,
                            left: hoverPopup.left,
                            zIndex: 1300,
                          }}
                          onMouseEnter={keepHoverPopupOpen}
                          onMouseLeave={handleMouseLeave}
                        >
                          {hoverPopup.links.map((link, i) =>
                            link.isExternal ? (
                              <button
                                key={link.to || i}
                                type="button"
                                className="hover-link"
                                onClick={() => {
                                  if (link.appId) openHubApp(link.appId, link.to);
                                  else
                                    window.open(link.to, "_blank", "noopener,noreferrer");
                                  setHoverPopup((prev) => ({
                                    ...prev,
                                    visible: false,
                                  }));
                                }}
                              >
                                {link.label}
                              </button>
                            ) : (
                              <NavLink
                                key={link.to || i}
                                to={link.clicked ? undefined : link.to}
                                onClick={() => {
                                  if (link.clicked) {
                                    setShowDrawer(true);
                                  }
                                  setHoverPopup((prev) => ({
                                    ...prev,
                                    visible: false,
                                  }));
                                }}
                                className={({ isActive }) =>
                                  `hover-link ${isActive ? "active" : ""}`
                                }
                              >
                                {link.label}
                              </NavLink>
                            ),
                          )}
                        </div>,
                        document.body,
                      )}
                  </div>
                </div>
                {!showDrawer && (
                  <div
                    className={`${windowWidth <= 600 ? "mobileView-expand__arrow" : "expand__arrow"} ${collaps ? "expanded" : ""}`}
                    onClick={expandCollaps}
                  >
                    {/* <span className={`icon-chevron-thin-right ${collaps && "rotate"} `} /> */}
                    <img
                      src={collaps ? menu.chevronLeft : menu.chevronRight}
                      alt="arrow-icon"
                      // width={"30px"}
                      // height={"30px"}
                    />
                  </div>
                )}
                <div className={!collaps ? "others__options collaps" : "others__options"}>
                  <p className="sidenav-section-label">Profile</p>

                  {canManageSettings && (
                    <h5
                      className={`sidenav-content__headings-lists--title sidenav-profile-link ${
                        !showDrawer && location.pathname.includes("/settings")
                          ? "active"
                          : ""
                      }`}
                      title="Settings"
                      onMouseEnter={(e) => handleMouseEnter(e, SETTINGS_LINKS)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div
                        className={`link-tag ${
                          !showDrawer && location.pathname.includes("/settings")
                            ? "active"
                            : ""
                        }`}
                        onClick={() => {
                          if (windowWidth <= 600) {
                            setShowMobileNavBar(true);
                            setCollaps(true);
                            onChange(true);
                            toggleDropdown(showDropdownMenu, "settings");
                          } else {
                            setCollaps(true);
                            onChange(true);
                            toggleDropdown(showDropdownMenu, "settings");
                            setHoverPopup((prev) => ({
                              ...prev,
                              visible: false,
                            }));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="navigate-icon-wrapper">
                          <img
                            src={
                              !showDrawer && location.pathname.includes("/settings")
                                ? menu.Settings
                                : menu.inactiveSettings
                            }
                            alt="Settings"
                            width={"20px"}
                          />
                        </div>
                        <div className="navigate-icon-text sidenav-link-label">
                          Settings
                          <img
                            className={`arrow-icon-up ${
                              !showDrawer && location.pathname.includes("/settings")
                                ? "active"
                                : "inActive"
                            }`}
                            src={
                              showDropdownMenu && activeDropdown === "settings"
                                ? menu.sideMenuUpArrow
                                : menu.sideMenuDownAarrow
                            }
                            alt=""
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      {collaps && showDropdownMenu && activeDropdown === "settings" && (
                        <div className="menu-dropdown">
                          <NavLink
                            to="/settings/workspace"
                            className={"dropdown-link"}
                            onClick={() => toggleDropdown(false, "settings")}
                          >
                            Workspace
                          </NavLink>
                          <NavLink
                            to="/settings/workflow"
                            className={"dropdown-link"}
                            onClick={() => toggleDropdown(false, "settings")}
                          >
                            WorkFlow
                          </NavLink>
                          <NavLink
                            to="/settings/formulas"
                            className={"dropdown-link"}
                            onClick={() => toggleDropdown(false, "settings")}
                          >
                            Formulas
                          </NavLink>
                          <NavLink
                            to="/settings/masterdata"
                            className={"dropdown-link"}
                            onClick={() => toggleDropdown(false, "settings")}
                          >
                            Master Data
                          </NavLink>
                        </div>
                      )}
                    </h5>
                  )}

                  <h5
                    className={`sidenav-content__headings-lists--title sidenav-profile-link ${
                      location.pathname.includes("/support-center") ? "active" : ""
                    }`}
                    title="Help Centre"
                    onMouseEnter={(e) => handleMouseEnter(e, HELP_LINKS)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <NavLink
                      to="/support-center"
                      className={`link-tag sidenav-has-active-dot ${
                        location.pathname.includes("/support-center") ? "active" : ""
                      }`}
                    >
                      <img
                        src={
                          location.pathname.includes("/support-center")
                            ? menu.helpCenter
                            : menu.inactiveHelpCenter
                        }
                        alt="Help Centre"
                        width={"20px"}
                      />
                      <span className="sidenav-link-label">Help Centre</span>
                      <span className="sidenav-active-dot" aria-hidden="true" />
                    </NavLink>
                  </h5>

                  <div className="header-user-info" ref={popupRef}>
                    <div className="user-info" onClick={handleMenuItem}>
                      {auth?.details?.displayName && (
                        <LogoAvatarShowLetter
                          genaralData={auth.details}
                          isCustomBg={true}
                          profilePhotoName={"photo"}
                          profileName={"displayName"}
                          outerClassName={"user-info__profile-pic"}
                          innerClassName={"user-icon-photo"}
                        ></LogoAvatarShowLetter>
                      )}
                      {collaps && (
                        <div
                          className={`user-info__details sidenav-profile-meta ${
                            auth.details?.displayName ? auth.details?.displayName : "none"
                          }`}
                        >
                          <p
                            className="user-info__details-name"
                            title={auth.details?.displayName || "User Name"}
                          >
                            {auth.details?.displayName || "User Name"}
                          </p>
                          <p className="user-info__details-role" title={roleLabel}>
                            {roleLabel}
                          </p>
                        </div>
                      )}
                    </div>
                    {collaps && (
                      <button
                        className="user-info__more sidenav-profile-meta"
                        title="More Option"
                        onClick={handleMenuItem}
                        aria-hidden={!collaps}
                        tabIndex={collaps ? 0 : -1}
                      >
                        <img
                          src={EditPrimaryIcon}
                          className={"editIcon"}
                          alt="editPenIcon"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {showInfo && (
                  <>
                    <Card className="user-info__popup" ref={popupContainerRef}>
                      <div className="user-info__popup-profile">
                        {auth?.details?.displayName && (
                          <LogoAvatarShowLetter
                            genaralData={auth.details}
                            isCustomBg={true}
                            profilePhotoName={"photo"}
                            profileName={"displayName"}
                            outerClassName={"user-info__popup-profile-pic"}
                            innerClassName={"user-icon-photo"}
                          ></LogoAvatarShowLetter>
                        )}
                        <div className="user-info__popup__details">
                          <p
                            className="user-info__popup__details-name"
                            title={auth.details?.displayName || "User Name"}
                          >
                            {auth.details?.displayName || "User Name"}
                          </p>
                          <p
                            className="user-info__popup__details-role"
                            title={
                              roleList?.data?.filter(
                                (userType) =>
                                  userType.status_id === auth?.details?.user_type,
                              )[0]?.name || "Guest"
                            }
                          >
                            {roleList?.data?.filter(
                              (userType) =>
                                userType.status_id === auth?.details?.user_type,
                            )[0]?.name || "Guest"}
                          </p>
                        </div>
                      </div>
                      <div variant="flush" className="user-info__popup-menu">
                        <button
                          className="bg-transparent d-flex align-items-center border-0 gap-3 user-info__popup-menu-item"
                          onClick={photoSync}
                        >
                          <span
                            className={`icon-sync ${photoSyncLoading ? "loading" : ""}`}
                          />
                          Photo Sync
                        </button>
                      </div>
                      <div className="user-info__popup__bottom">
                        <Button
                          variant="info"
                          className="user-info__popup-logout"
                          onClick={userLogout}
                        >
                          Logout
                        </Button>
                      </div>
                    </Card>
                  </>
                )}
              </Fragment>
            )}
          </div>
        </Fragment>
      )}

      <NotificationDrawer
        show={showDrawer}
        onHide={() => setShowDrawer(false)}
        dialogClassName={`${collaps ? "sideNavExpanded" : "sideNavCollapsed"}`}
      >
        <Notification closeModal={() => setShowDrawer(false)} />
      </NotificationDrawer>
      {/* {location.pathname.includes("/dashboard") && <OrionAIPill />} */}
      {/* SESSION EXPIRING CONFIRMATION - POPUP */}
      <PopupModal show={showSessionModal} customClassName={"commonForm"}>
        <div className="text-black">
          <h5>{t(`common.session_expiring_soon`)}</h5>
          <p>{t(`common.session_expiring_content`)}</p>

          <div className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
            <button className="btn w-auto cancel_btn px-3" onClick={handleLogout}>
              {t(`common.logout`)}
            </button>
            <button
              className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
              onClick={() => refreshToken()}
            >
              {t(`common.continue_session`)}
            </button>
          </div>
        </div>
      </PopupModal>
    </>
  );
};

export default memo(SideNav);

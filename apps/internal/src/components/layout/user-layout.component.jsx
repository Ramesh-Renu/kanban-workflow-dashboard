import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Fragment, useState, useEffect, useRef } from "react";
import SideNav from "./sidenav/sidenav.component";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { getAuthType, setDeepLinkURL, setExpiresOn } from "@orion/shared";
import useAuth from "../../hooks/useAuth";
import serverErrorIcon from "../../assets/images/icons8-server-error-66.png";
import {
  loginRequestB2C,
  loginRequestORG,
  msalInstanceB2C,
  msalInstanceORG,
} from "authConfig";
import { useSocket } from "store/context/SocketProvider";
import NotificationsRealTime from "pages/Notification/NotificationRealTime";
import ConnectionError from "pages/Unauthorized/ConnectionError";
import { API_ERROR_TYPES } from "@orion/shared";
import { performAppLogout } from "../../utils/authLogout";

const UserLayout = () => {
  const [collapseNav, setCollapseNav] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [notificationId, setNotificationId] = useState(null);

  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, lastMessage } = useSocket();
  const [
    { data, userDetailsError, userDetailsErrorType, userDetailsErrorTitle },
    { setAuth, getUserInfoData, logoutUser },
  ] = useAuth();
  const userInfoFetchStartedRef = useRef(false);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.event === "push_notification") {
      setNotificationId(lastMessage.payload.notificationId);
      setLiveNotifications([JSON.parse(lastMessage.payload.messageJson)]);
    }
  }, [lastMessage]);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated && accounts.length > 0) {
        try {
          const activeInstance =
            getAuthType() === "B2C" ? msalInstanceB2C : msalInstanceORG;
          const activeLoginRequest =
            getAuthType() === "B2C" ? loginRequestB2C : loginRequestORG;

          const response = await activeInstance.acquireTokenSilent({
            ...activeLoginRequest,
            account: accounts[0],
          });

          setAuth(response.accessToken);
          setExpiresOn(response.idTokenClaims.exp);
        } catch (error) {
          console.error("Silent token acquisition failed", error);
        } finally {
          setTokenReady(true);
        }
      } else {
        setTokenReady(true);
      }
    };

    initAuth();
  }, [isAuthenticated, accounts, setAuth]);

  useEffect(() => {
    if (!tokenReady || data?.loading || data?.details || userDetailsError) return;
    if (userInfoFetchStartedRef.current) return;

    userInfoFetchStartedRef.current = true;
    getUserInfoData();
  }, [tokenReady, data?.loading, data?.details, userDetailsError, getUserInfoData]);

  useEffect(() => {
    if (!isAuthenticated) {
      const sessionExpired = localStorage.getItem("sessionExpired");

      if (!sessionExpired) {
        setDeepLinkURL(location.pathname + location.search);
      } else {
        localStorage.removeItem("sessionExpired");
      }
    }
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!socket) return;

    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "KEEP_ALIVE",
            lastActive: Date.now(),
          }),
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [socket]);

  const handleCollapseNav = (status) => setCollapseNav(status);

  const isApplicationHubHome =
    location.pathname === "/home" || location.pathname === "/";

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!tokenReady) return <div>Loading session...</div>;

  if (userDetailsError) {
    return (
      <ConnectionError
        title={userDetailsErrorTitle || "Cannot reach the application server"}
        message={userDetailsError}
        errorType={userDetailsErrorType || API_ERROR_TYPES.CORS}
        onRetry={() => {
          userInfoFetchStartedRef.current = true;
          getUserInfoData();
        }}
        onBackToLogin={() =>
          performAppLogout({
            logoutUser,
            setAuth,
            navigate,
          })
        }
      />
    );
  }

  return (
    <Fragment>
      <div
        className={`layout-container${
          isApplicationHubHome ? " no-sidebar" : collapseNav ? " left-sidebar" : ""
        }`}
      >
        {!isApplicationHubHome && <SideNav onChange={handleCollapseNav} />}
        <div className="body-content" role="presentation">
          {(data && data?.error != undefined && data?.error !== null && (
            <h3 className="server-error">
              <img src={serverErrorIcon} alt="serverErrorIcon" /> {data?.error}
            </h3>
          )) || (
            <main>
              <div
                className={`outlet-container ${
                  isApplicationHubHome
                    ? "application-hub-layout"
                    : location.pathname.includes("/dashboard") &&
                        !location.pathname.includes("/details")
                      ? "dashboard-layout"
                      : ""
                }`}
                role="main"
              >
                <Outlet />
                <NotificationsRealTime
                  liveNotifications={liveNotifications}
                  notificationId={notificationId}
                />
              </div>
            </main>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default UserLayout;

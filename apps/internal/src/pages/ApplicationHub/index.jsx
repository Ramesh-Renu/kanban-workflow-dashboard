import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate, Outlet } from "react-router-dom";
import useAuth from "hooks/useAuth";
import { APPLICATION_HUB_APPS, canOpenHubApp } from "constant/applicationHubApps";
import infozoIcon from "assets/images/loginpage/InfozoLogo.png";
import {
  openHubApp,
  startHubOpenAppsWatcher,
  subscribeHubOpenApps,
} from "utils/hubOpenApps";
import OrionLogo from "../Login/components/OrionLogo";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import { EditPrimaryIcon, WavingHand } from "assets/images";
import usePhotoSync from "hooks/usePhotoSync";
import { useGlobalMaster } from "@orion/shared";
import { Button, Card } from "react-bootstrap";
import { performAppLogout } from "utils/authLogout";
import NewOrion from "./NewOrion";
import SupportCenter from "./SupportCenter";

const APP_ICONS = {
  tasks: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.25 3.84961H23.75C25.0698 3.84961 26.1504 4.93023 26.1504 6.25V23.75C26.1504 25.0698 25.0698 26.1504 23.75 26.1504H6.25C4.93023 26.1504 3.84961 25.0698 3.84961 23.75V6.25C3.84961 4.93023 4.93023 3.84961 6.25 3.84961ZM6.15039 23.8496H13.8496V6.15039H6.15039V23.8496ZM16.1504 23.8496H23.8496V14.9004H16.1504V23.8496ZM16.1504 12.5996H23.8496V6.15039H16.1504V12.5996Z"
        fill="white"
        stroke="white"
        strokeWidth="0.2"
      />
    </svg>
  ),
  knowledge: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.25 5.625C6.25 4.7962 6.57924 4.00134 7.16529 3.41529C7.75134 2.82924 8.5462 2.5 9.375 2.5H25V25H9.375C8.64392 24.9853 7.93082 25.2274 7.35982 25.6841C6.78882 26.1409 6.3961 26.7835 6.25 27.5V5.625Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20H21.25"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  kimai: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 7.5V15L20.625 18.375"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 26.25C21.2132 26.25 26.25 21.2132 26.25 15C26.25 8.7868 21.2132 3.75 15 3.75C8.7868 3.75 3.75 8.7868 3.75 15C3.75 21.2132 8.7868 26.25 15 26.25Z"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  ),
  lms: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.5 18.7481V23.7481C22.5 24.4356 21.9375 24.9981 21.25 24.9981H6.25C5.5625 24.9981 5 24.4356 5 23.7481V8.74809C5 8.06059 5.5625 7.49809 6.25 7.49809H10.025C10.7125 7.49809 11.275 6.93559 11.275 6.24809C11.275 5.56059 10.7125 4.99809 10.025 4.99809H5C3.625 4.99809 2.5 6.12309 2.5 7.49809V24.9981C2.5 26.3731 3.625 27.4981 5 27.4981H22.5C23.875 27.4981 25 26.3731 25 24.9981V18.7481C25 18.0606 24.4375 17.4981 23.75 17.4981C23.0625 17.4981 22.5 18.0606 22.5 18.7481ZM19.375 22.4981H8.15C7.625 22.4981 7.3375 21.8981 7.6625 21.4856L9.8375 18.6981C10.0875 18.3856 10.5625 18.3731 10.8125 18.6856L12.7625 21.0356L15.7 17.2606C15.95 16.9356 16.45 16.9356 16.6875 17.2731L19.875 21.5106C20.1875 21.9106 19.8875 22.4981 19.375 22.4981ZM24.125 11.1106C24.725 10.1481 25.0625 9.02309 24.9875 7.78559C24.825 5.09809 22.6875 2.82309 20.025 2.53559C16.625 2.16059 13.75 4.79809 13.75 8.12309C13.75 11.2356 16.2625 13.7481 19.3625 13.7481C20.4625 13.7481 21.4875 13.4231 22.35 12.8731L25.3625 15.8856C25.85 16.3731 26.65 16.3731 27.1375 15.8856C27.625 15.3981 27.625 14.5981 27.1375 14.1106L24.125 11.1106ZM19.375 11.2481C17.65 11.2481 16.25 9.84809 16.25 8.12309C16.25 6.39809 17.65 4.99809 19.375 4.99809C21.1 4.99809 22.5 6.39809 22.5 8.12309C22.5 9.84809 21.1 11.2481 19.375 11.2481Z"
        fill="white"
      />
    </svg>
  ),
  infozo: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.5 18.7481V23.7481C22.5 24.4356 21.9375 24.9981 21.25 24.9981H6.25C5.5625 24.9981 5 24.4356 5 23.7481V8.74809C5 8.06059 5.5625 7.49809 6.25 7.49809H10.025C10.7125 7.49809 11.275 6.93559 11.275 6.24809C11.275 5.56059 10.7125 4.99809 10.025 4.99809H5C3.625 4.99809 2.5 6.12309 2.5 7.49809V24.9981C2.5 26.3731 3.625 27.4981 5 27.4981H22.5C23.875 27.4981 25 26.3731 25 24.9981V18.7481C25 18.0606 24.4375 17.4981 23.75 17.4981C23.0625 17.4981 22.5 18.0606 22.5 18.7481ZM19.375 22.4981H8.15C7.625 22.4981 7.3375 21.8981 7.6625 21.4856L9.8375 18.6981C10.0875 18.3856 10.5625 18.3731 10.8125 18.6856L12.7625 21.0356L15.7 17.2606C15.95 16.9356 16.45 16.9356 16.6875 17.2731L19.875 21.5106C20.1875 21.9106 19.8875 22.4981 19.375 22.4981ZM24.125 11.1106C24.725 10.1481 25.0625 9.02309 24.9875 7.78559C24.825 5.09809 22.6875 2.82309 20.025 2.53559C16.625 2.16059 13.75 4.79809 13.75 8.12309C13.75 11.2356 16.2625 13.7481 19.3625 13.7481C20.4625 13.7481 21.4875 13.4231 22.35 12.8731L25.3625 15.8856C25.85 16.3731 26.65 16.3731 27.1375 15.8856C27.625 15.3981 27.625 14.5981 27.1375 14.1106L24.125 11.1106ZM19.375 11.2481C17.65 11.2481 16.25 9.84809 16.25 8.12309C16.25 6.39809 17.65 4.99809 19.375 4.99809C21.1 4.99809 22.5 6.39809 22.5 8.12309C22.5 9.84809 21.1 11.2481 19.375 11.2481Z"
        fill="white"
      />
    </svg>
  ),
  autoiat: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.625 5.625C7 7.75 5 11 5 15C5 19 7 22.25 10.625 24.375M19.375 5.625C23 7.75 25 11 25 15C25 19 23 22.25 19.375 24.375"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 9.375C13.5 8.125 16.5 8.125 18.75 9.375M11.25 20.625C13.5 21.875 16.5 21.875 18.75 20.625"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  opifex: (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.625 5.625C7 7.75 5 11 5 15C5 19 7 22.25 10.625 24.375M19.375 5.625C23 7.75 25 11 25 15C25 19 23 22.25 19.375 24.375"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 9.375C13.5 8.125 16.5 8.125 18.75 9.375M11.25 20.625C13.5 21.875 16.5 21.875 18.75 20.625"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};
``;

function firstNameFromDisplayName(displayName) {
  if (!displayName || typeof displayName !== "string") return "there";
  return displayName.trim().split(/\s+/)[0] || "there";
}

function HubCardIcon({ accent, children }) {
  return (
    <span className={`application-hub__card-icon application-hub__card-icon--${accent}`}>
      {children}
    </span>
  );
}

export default function ApplicationHub() {
  const [{ data: auth }, { setAuth, logoutUser }] = useAuth();
  const details = auth?.details;
  const firstName = firstNameFromDisplayName(details?.displayName);
  const { roleList, getRoleList } = useGlobalMaster();
  const [openAppIds, setOpenAppIds] = useState(() => new Set());
  const popupTriggerRef = useRef(null);
  const popupContainerRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState("application-hub");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeHubOpenApps(setOpenAppIds);
    const stopWatcher = startHubOpenAppsWatcher(1000);
    return () => {
      unsubscribe();
      stopWatcher();
    };
  }, []);

  const userLogout = useCallback(() => {
    performAppLogout({
      logoutUser,
      setAuth,
      navigate,
      onBeforeLogout: () => setShowPopup(false),
    });
  }, [logoutUser, navigate, setAuth]);

  const cards = useMemo(
    () =>
      APPLICATION_HUB_APPS.filter((app) => canOpenHubApp(details, app)).map((app) => {
        const available = app.isAvailable(details);
        const to = available ? app.getTo(details) : null;
        const isAlreadyOpen = Boolean(app.isExternal && to && openAppIds.has(app.id));
        return {
          ...app,
          available,
          to,
          icon: APP_ICONS[app.id],
          isAlreadyOpen,
        };
      }),
    [details, openAppIds],
  );

  const roleName = useMemo(() => {
    if (details?.jobTitle) return details.jobTitle;
    if (!roleList?.data?.length || details?.user_type == null) return "User";
    return (
      roleList.data.find((role) => role.status_id === details.user_type)?.name || "User"
    );
  }, [roleList?.data, details?.user_type, details?.jobTitle]);
  
  return (
    <>
      {currentPage === "application-hub" && (
        <section className="application-hub">
          <header className="application-hub__header">
            <div className="application-hub__brand">
              <OrionLogo />
              <span className="application-hub__brand-text">Orion Hub</span>
            </div>
            <h1 className="application-hub__title">
              Good to see you, {firstName}! &#160;
              <img
                src={WavingHand}
                alt=""
                className="application-hub__hand"
                aria-hidden="true"
              />
            </h1>
            <p className="application-hub__subtitle">
              Choose an application to continue. You can return to this hub anytime to
              switch between tools — no need to sign out.
            </p>
          </header>
          <div className="application-hub__applications">
            {cards.length > 0 && details !==null && details !==undefined ? (
              <div className="application-hub__grid">
                {cards.map((card) => {
                  const cardClassName = `application-hub__card application-hub__card--${card.accent}${
                    !card.available ? " is-disabled" : ""
                  }${card.isAlreadyOpen ? " is-already-open" : ""}`;
                  console.log('available',card);
                  
                  const statusLabel = !card.to
                    ? "Coming soon"
                    : card.isAlreadyOpen
                      ? "Already open"
                      : "Open";
                  const cardBody = (
                    <>
                      <div className="application-hub__card-body" title={card.title}>
                        <div className="application-hub__card-icon">
                          <HubCardIcon accent={card.accent}>{card.icon}</HubCardIcon>
                        </div>
                        <div className="application-hub__card-content">
                          <h2 className="application-hub__card-title" title={card.title}>
                            {card.title}
                          </h2>
                          <p className="application-hub__card-copy">{card.description}</p>
                        </div>
                      </div>
                      <span
                        className={`application-hub__open ${card.isAlreadyOpen ? "purple" : statusLabel === "Open" ? "green" : card.accent}`}
                      >
                        {statusLabel}
                        {card.available && !card.isAlreadyOpen ? (
                          <span aria-hidden="true">→</span>
                        ) : null}
                      </span>
                    </>
                  );

                  return (
                    <div key={card.id} className="application-hub__item">
                      {card.available && card.to ? (
                        card.isExternal ? (
                          <a
                            type="button"
                            className={cardClassName}
                            aria-disabled={card.isAlreadyOpen}
                            onClick={() => {
                              // if (card.isAlreadyOpen) return;
                              openHubApp(card.id, card.to);
                            }}
                          >
                            {cardBody}
                          </a>
                        ) : (
                          <Link to={card.to} className={cardClassName}>
                            {cardBody}
                          </Link>
                        )
                      ) : (
                        <article className={cardClassName}>{cardBody}</article>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="application-hub__empty" role="status">
                <p className="application-hub__empty-message">
                  You currently don't have permission to access any apps. Please contact
                  your administrator.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
      {/* ================= CONTENT ================= */}

      {currentPage === "new-orion" && (
        <NewOrion onBack={() => setCurrentPage("application-hub")} />
      )}
      {currentPage === "support-center" && (
        <SupportCenter onBack={() => setCurrentPage("application-hub")} />
      )}

      {/* ================= FOOTER ================= */}
      <footer className="application-hub__footer">
        <div className="application-hub__footer-body">
          <div className="application-hub__user" ref={popupTriggerRef}>
            {details?.displayName && (
              <LogoAvatarShowLetter
                genaralData={details}
                isCustomBg={true}
                profilePhotoName="photo"
                profileName="displayName"
                outerClassName="application-hub__user-avatar"
                innerClassName="application-hub__user-avatar-inner"
              />
            )}
            <div className="application-hub__user-meta">
              <p className="application-hub__user-name" title={details?.displayName}>
                {details?.displayName || "User"}
              </p>
              <p className="application-hub__user-role" title={roleName}>
                {roleName}
              </p>
            </div>
            <button
              type="button"
              className="application-hub__user-more"
              title="More options"
              aria-expanded={showPopup}
              onClick={() => setShowPopup((open) => !open)}
            >
              {/* <img src={EditPrimaryIcon} className="editIcon" alt="" /> */}
              ...
            </button>
            {showPopup && (
              <>
                <div className="user-info__overlay" onClick={() => setShowPopup(false)} />
                <Card
                  className="user-info__popup application-hub__user-popup"
                  ref={popupContainerRef}
                >
                  <div className="user-info__popup__bottom">
                    <button
                      type="button"
                      className="user-info__popup-cancel"
                      onClick={() => setShowPopup(false)}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="user-info__popup-logout"
                      onClick={userLogout}
                    >
                      <svg
                        className="logout-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: "18px", height: "18px", marginRight: "9px" }}
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </Card>
              </>
            )}
          </div>
          <div className="application-hub__help">
            <span className="application-hub__help-label">Need help?</span>
            <span className="application-hub__help-links">
              <Link
                className="support-link"
                onClick={() => setCurrentPage("support-center")}
              >
                Support Center
              </Link>
              <span className="application-hub__line" style={{ color: "#cac7c76b" }}>
                |
              </span>
              <Link
                className="whats-new-link"
                onClick={() => setCurrentPage("new-orion")}
              >
                What&apos;s New
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

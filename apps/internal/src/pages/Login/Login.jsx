import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useAuthSession from "../../hooks/useAuthSession";
import {
  setAuthType,
  getDeepLinkURL,
  setDeepLinkURL,
  setActiveWorkSpace,
  ensureAccessToken,
  getApiErrorMessage,
  hasSession,
} from "@orion/shared";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import { useTranslation } from "react-i18next";
import appConstants from "../../constant/common";
import Unauthorized from "pages/Unauthorized/Unauthorized";
import ConnectionError from "pages/Unauthorized/ConnectionError";
import { API_ERROR_TYPES, getLoginConnectionErrorMeta } from "@orion/shared";
import { useToast } from "@orion/shared";
import { performAppLogout } from "../../utils/authLogout";
import { halfGlobal, eurolandLogo } from "../../assets/images/loginpage";
import LoginDashboardSlide from "./components/LoginDashboardSlide";
import LoginCarouselAnimatedSlide from "./components/LoginCarouselAnimatedSlide";
import LoginWorkspaceSlide from "./components/LoginWorkspaceSlide";
import LoginKnowledgeSlide from "./components/LoginKnowledgeSlide";
import LoginTaskSlide from "./components/LoginTaskSlide";
import OrionLogo from "./components/OrionLogo";
const CAROUSEL_SLIDES = [
  { type: "workspace" },
  { type: "dashboard" },
  { type: "knowledge" },
  { type: "tasks" },
];
const CAROUSEL_SLIDE_COUNT = CAROUSEL_SLIDES.length;
const CAROUSEL_INTERVAL_MS = 5000;
const KNOWLEDGE_SLIDE_INTERVAL_MS = 7000;

const getCarouselSlideDurationMs = (slide) =>
  slide?.type === "knowledge" ? KNOWLEDGE_SLIDE_INTERVAL_MS : CAROUSEL_INTERVAL_MS;
/** Set true when workspace box styling is done and animations should run again. */
const WORKSPACE_SLIDE_ANIMATIONS_ENABLED = true;
const DASHBOARD_SLIDE_ANIMATIONS_ENABLED = true;
const KNOWLEDGE_SLIDE_ANIMATIONS_ENABLED = true;
const TASK_SLIDE_ANIMATIONS_ENABLED = true;

export default function Login() {
  const { showToast } = useToast();
  const [{ data }, { getAuth, setAuth, getUserInfoData, logoutUser }] = useAuth();
  const { isAuthenticated } = useAuthSession();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTokenSuccess, setIsTokenSuccess] = useState();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeForm, setActiveForm] = useState("login");
  const [activateSignUpSuccess, setActivateSignUpSuccess] = useState(false);
  const [isRequestFailed, setIsRequestFailed] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    agencyName: "",
    country: [],
    phone: "",
  });
  const [mandatoryField, setMandatoryField] = useState({
    firstName: true,
    lastName: false,
    email: true,
    agencyName: true,
    country: true,
    phone: true,
  });
  const [errorMsg, setErrorMsg] = useState({
    firstName: false,
    lastName: false,
    email: false,
    invalidEmail: false,
    agencyName: false,
    country: false,
    phone: false,
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  /** Username/password sign-in against the Python API. */
  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const configError = getLoginConnectionErrorMeta();
    if (configError) {
      setConnectionError(configError);
      return;
    }

    const username = credentials.username.trim();
    if (!username || !credentials.password) {
      setLoginError(t("login.credentials_required"));
      return;
    }

    setLoginError("");
    setIsSubmitting(true);
    try {
      await getAuth({ username, password: credentials.password });
      setAuthType("LOCAL");
      setCredentials((prev) => ({ ...prev, password: "" }));
      setIsTokenSuccess(true);
    } catch (error) {
      const connError = getLoginConnectionErrorMeta(error);
      if (connError) {
        setConnectionError(connError);
      } else {
        setLoginError(getApiErrorMessage(error) || t("login.invalid_credentials"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const advanceCarousel = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDE_COUNT);
  }, []);

  const holdCarousel = useCallback(() => {
    setIsCarouselPaused(true);
  }, []);

  const releaseCarousel = useCallback(() => {
    setIsCarouselPaused(false);
    advanceCarousel();
  }, [advanceCarousel]);

  useEffect(() => {
    if (isCarouselPaused) return undefined;

    const durationMs = getCarouselSlideDurationMs(CAROUSEL_SLIDES[activeSlide]);
    const timeoutId = window.setTimeout(advanceCarousel, durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [isCarouselPaused, advanceCarousel, activeSlide]);

  /** Restore an existing session (stored refresh token) without asking for the password again. */
  useEffect(() => {
    let isMounted = true;

    if (!hasSession()) {
      setIsCheckingSession(false);
      return undefined;
    }

    ensureAccessToken()
      .then(({ accessToken }) => {
        if (!isMounted) return;
        setAuth(accessToken);
        setIsTokenSuccess(true);
      })
      .catch((error) => {
        console.error("Existing session restore failed", error);
        const loginError = getLoginConnectionErrorMeta(error);
        if (loginError && isMounted) {
          setConnectionError(loginError);
        }
      })
      .finally(() => {
        if (isMounted) setIsCheckingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const configError = getLoginConnectionErrorMeta();
    if (configError) {
      setConnectionError(configError);
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    if (isTokenSuccess && data?.accessToken) {
      getUserInfoData()
        .then((res) => {
          if (res.type === "userInfo/rejected") {
            setConnectionError(res.error);
            setIsRequestFailed(true);
          }
        })
        .catch((error) => {
          console.error("error", error);
          setConnectionError(error);
          setIsRequestFailed(true);
        });
    }
  }, [isTokenSuccess]);

  useEffect(() => {
    if (data?.accessToken) {
      if (!data?.details) return;
      const { is_active } = data.details;
      let redirectURL = getDeepLinkURL();
      if (redirectURL) {
        setDeepLinkURL();
        navigate(redirectURL);
        return;
      } else if (is_active) {
        navigate("/home");
      } else {
        unAuthorizedUser();
      }
    }
  }, [data]);

  const unAuthorizedUserRequestFailed = () => {
    setIsRequestFailed(false);
    performAppLogout({
      logoutUser,
      setAuth,
      navigate,
    });
  };

  const unAuthorizedUser = () => {
    (async () => {
      try {
        await logoutUser();
      } catch (err) {
        console.error("Background logout failed:", err);
      }
    })();

    showToast({
      message: t("login.inactive_user"),
      variant: "danger",
    });
    setAuth("");
    setActiveWorkSpace("");
  };

  useEffect(() => {
    validateForm();
  }, [formData, mandatoryField, isSubmitted]);

  const validateForm = () => {
    const isFirstNameValid = mandatoryField.firstName
      ? formData.firstName.trim() !== ""
      : true;
    const isLastNameValid = mandatoryField.lastName
      ? formData.lastName.trim() !== ""
      : true;
    const isEmailValid = mandatoryField.email
      ? formData.email.trim() !== "" &&
        new RegExp(appConstants.VALIDATION_PATTERNS.email).test(formData.email)
      : true;
    const isAgencyNameValid = mandatoryField.agencyName
      ? formData.agencyName.trim() !== ""
      : true;
    const isCountryValid = mandatoryField.country ? formData.country.length > 0 : true;
    const isPhoneValid = mandatoryField.phone ? formData.phone.trim() !== "" : true;

    setIsFormValid(
      isFirstNameValid &&
        isLastNameValid &&
        isEmailValid &&
        isAgencyNameValid &&
        isCountryValid &&
        isPhoneValid,
    );
    if (isSubmitted) {
      setErrorMsg({
        firstName: !isFirstNameValid,
        lastName: !isLastNameValid,
        email: !isEmailValid,
        invalidEmail: !new RegExp(appConstants.VALIDATION_PATTERNS.email).test(
          formData.email.trim(),
        ),
        agencyName: !isAgencyNameValid,
        country: !isCountryValid,
        phone: !isPhoneValid,
      });
    }

    return isFormValid;
  };

  const inputRef = useRef(null);
  useEffect(() => {
    if (activeForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeForm]);

  const showPreLoginConnectionError = Boolean(connectionError && !isAuthenticated);

  return (
    <>
      {showPreLoginConnectionError && (
        <ConnectionError
          title={connectionError.title}
          message={connectionError.message}
          errorType={connectionError.type || API_ERROR_TYPES.NETWORK}
          onRetry={() => window.location.reload()}
        />
      )}
      {isCheckingSession && !isAuthenticated && !showPreLoginConnectionError && <Spinner />}
      {!isCheckingSession && !isAuthenticated && !showPreLoginConnectionError && (
        <div className="login-page">
          <section className="login-page__carousel-panel">
            <div className="login-page__carousel-header">
              <div className="login-page__orion-brand">
                {/* <img src={orionLogo} alt="" aria-hidden="true" /> */}
                <OrionLogo />
                <span className="login-page__orion-brand-text">Orion hub.</span>
              </div>
              <h2 className="login-page__carousel-title">{t("login.every_workspace")}</h2>
              <p className="login-page__carousel-description">
                {t("login.carousel_description")}
              </p>
            </div>
            <div
              className="login-page__carousel"
              onMouseEnter={holdCarousel}
              onMouseLeave={releaseCarousel}
            >
              {CAROUSEL_SLIDES.map((slide, index) => {
                if (slide.type === "dashboard") {
                  return (
                    <LoginDashboardSlide
                      key="login-carousel-slide-dashboard"
                      isActive={index === activeSlide}
                      isPaused={isCarouselPaused}
                      animationsEnabled={DASHBOARD_SLIDE_ANIMATIONS_ENABLED}
                    />
                  );
                }

                if (slide.type === "workspace") {
                  return (
                    <LoginWorkspaceSlide
                      key="login-carousel-slide-workspace"
                      isActive={index === activeSlide}
                      isPaused={isCarouselPaused}
                      animationsEnabled={WORKSPACE_SLIDE_ANIMATIONS_ENABLED}
                    />
                  );
                }

                if (slide.type === "knowledge") {
                  return (
                    <LoginKnowledgeSlide
                      key="login-carousel-slide-knowledge"
                      isActive={index === activeSlide}
                      isPaused={isCarouselPaused}
                      animationsEnabled={KNOWLEDGE_SLIDE_ANIMATIONS_ENABLED}
                    />
                  );
                }

                if (slide.type === "tasks") {
                  return (
                    <LoginTaskSlide
                      key="login-carousel-slide-tasks"
                      isActive={index === activeSlide}
                      isPaused={isCarouselPaused}
                      animationsEnabled={TASK_SLIDE_ANIMATIONS_ENABLED}
                    />
                  );
                }

                return (
                  <LoginCarouselAnimatedSlide
                    key={`login-carousel-slide-${slide.variant}`}
                    imageSrc={slide.src}
                    variant={slide.variant}
                    isActive={index === activeSlide}
                    isPaused={isCarouselPaused}
                  />
                );
              })}
            </div>
            <div
              className="login-page__carousel-progress"
              role="tablist"
              aria-label="Login carousel slides"
              style={{
                "--indicator-cycle-ms": `${getCarouselSlideDurationMs(
                  CAROUSEL_SLIDES[activeSlide],
                )}ms`,
              }}
            >
              {Array.from({ length: CAROUSEL_SLIDE_COUNT }).map((_, index) => (
                <button
                  type="button"
                  key={`login-carousel-segment-${index}`}
                  className={`login-page__carousel-progress-segment${
                    index === activeSlide ? " is-active" : ""
                  }`}
                  aria-label={`Show slide ${index + 1}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                  onClick={() => setActiveSlide(index)}
                >
                  {index === activeSlide && (
                    <span
                      className="login-page__carousel-progress-fill"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
            <p className="login-page__powered-by">Powered By <strong>Euroland IR India</strong></p>
          </section>
          <section className="login-page__form-panel">
            <div className="login-page__globe-wrap" aria-hidden="true">
              <img src={halfGlobal} alt="" className="login-page__globe" />
            </div>
            <div className="login-page__form-inner">
              <div className="login-page__euroland-mark" aria-hidden="true">
                <img src={eurolandLogo} alt="" aria-hidden="true" />
              </div>

              {!activateSignUpSuccess && (
                <>
                  <h1 className="login-page__title">{t("login.title")}</h1>
                  <p className="login-page__subtitle">{t("login.subtitle")}</p>
                </>
              )}

              {activeForm === "login" && (
                <form className="login-page__form" onSubmit={handlePasswordLogin} noValidate>
                  <label className="login-page__label" htmlFor="login-username">
                    {t("login.username")}
                  </label>
                  <input
                    id="login-username"
                    ref={inputRef}
                    className="login-page__input"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, username: e.target.value }))
                    }
                    disabled={isSubmitting}
                    required
                  />
                  <label className="login-page__label" htmlFor="login-password">
                    {t("login.password")}
                  </label>
                  <input
                    id="login-password"
                    className="login-page__input"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, password: e.target.value }))
                    }
                    disabled={isSubmitting}
                    required
                  />
                  {loginError && (
                    <p className="login-page__error" role="alert">
                      {loginError}
                    </p>
                  )}
                  <button type="submit" className="login-page__ms-btn" disabled={isSubmitting}>
                    <span>
                      {isSubmitting ? `${t("login.inprogress")}...` : t("login.sign_in")}
                    </span>
                  </button>
                </form>
              )}

              <footer className="login-page__form-footer">
                <a href="/privacy-policy">{t("login.privacy_policy")}</a>
                &#160;and&#160;
                <span>{t("login.copyright")}</span>
              </footer>
            </div>
          </section>
        </div>
      )}
      {isAuthenticated && !isRequestFailed && <Spinner />}
      {isAuthenticated && isRequestFailed && connectionError && (
        <ConnectionError
          title={connectionError.title}
          message={connectionError.message}
          errorType={connectionError.type || API_ERROR_TYPES.CORS}
          onRetry={() => {
            setIsRequestFailed(false);
            setConnectionError(null);
            getUserInfoData().then((res) => {
              if (res.type === "userInfo/rejected") {
                setConnectionError(res.error);
                setIsRequestFailed(true);
              }
            });
          }}
          onBackToLogin={unAuthorizedUserRequestFailed}
        />
      )}
      {isAuthenticated && isRequestFailed && !connectionError && (
        <Unauthorized unAuthorizedUser={unAuthorizedUserRequestFailed} />
      )}
    </>
  );
}

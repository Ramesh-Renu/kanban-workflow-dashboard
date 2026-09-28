import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
  useIsAuthenticated,
} from "@azure/msal-react";
import { InteractionRequiredAuthError, InteractionStatus } from "@azure/msal-browser";
import {
  loginRequestB2C,
  loginRequestORG,
  msalInstanceB2C,
  msalInstanceORG,
} from "authConfig";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  setExpiresOn,
  setAuthType,
  getAuthType,
  getDeepLinkURL,
  setDeepLinkURL,
  setActiveWorkSpace,
} from "@orion/shared";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import { useTranslation } from "react-i18next";
import appConstants from "../../constant/common";
import Unauthorized from "pages/Unauthorized/Unauthorized";
import ConnectionError from "pages/Unauthorized/ConnectionError";
import { API_ERROR_TYPES, getLoginConnectionErrorMeta } from "@orion/shared";
import { useToast } from "@orion/shared";
import { acquireTokenWithFallback } from "../../utils/common";
import { performAppLogout } from "../../utils/authLogout";
import {
  halfGlobal,
  msLogo,
  orionLogo,
  slide3,
  eurolandLogo,
  slide4,
} from "../../assets/images/loginpage";
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
  const { instance, inProgress, accounts } = useMsal();
  const [{ data }, { setAuth, getUserInfoData, logoutUser }] = useAuth();
  const [isTokenSuccess, setIsTokenSuccess] = useState();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeForm, setActiveForm] = useState("login");
  const [activateSignUpSuccess, setActivateSignUpSuccess] = useState(false);
  const [euButtonHide, setEuButtonHide] = useState(false);
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

  const applyTokenResponse = useCallback(
    (response) => {
      if (!response?.accessToken) {
        setIsTokenSuccess(false);
        return;
      }
      setAuth(response.accessToken);
      setExpiresOn(response.idTokenClaims.exp);
      setIsTokenSuccess(true);
    },
    [setAuth],
  );

  /** AD Login — reuse cached MSAL session when available */
  const handleOrgLogin = async () => {
    const loginError = getLoginConnectionErrorMeta();
    if (loginError) {
      setConnectionError(loginError);
      return;
    }

    setAuthType("ORG");

    const cachedAccounts = instance.getAllAccounts();
    if (cachedAccounts.length > 0) {
      instance.setActiveAccount(cachedAccounts[0]);
      try {
        const response = await instance.acquireTokenSilent({
          ...loginRequestORG,
          account: cachedAccounts[0],
        });
        applyTokenResponse(response);
        return;
      } catch (error) {
        if (!(error instanceof InteractionRequiredAuthError)) {
          console.error("Silent AD login failed", error);
          const loginError = getLoginConnectionErrorMeta(error);
          if (loginError) {
            setConnectionError(loginError);
          }
          return;
        }
      }
    }

    instance.loginRedirect(loginRequestORG).catch((e) => {
      console.error("ORG redirect login failed", e);
      const loginError = getLoginConnectionErrorMeta(e);
      if (loginError) {
        setConnectionError(loginError);
      }
    });
  };

  /** Legacy handler kept for B2C flows if re-enabled */
  const handleLogin = (actionType, loginType) => {
    const activeInstance = loginType != 1 ? msalInstanceB2C : msalInstanceORG;
    if (actionType === "popup") {
      activeInstance.loginPopup(loginRequestORG).catch((e) => {
        console.error("Login popup failed", e);
      });
    } else if (actionType === "redirect") {
      if (loginType !== 1) {
        setAuthType("B2C");
        activeInstance.loginRedirect(loginRequestB2C).catch((e) => {
          console.error("B2C redirect login failed", e);
          const loginError = getLoginConnectionErrorMeta(e);
          if (loginError) {
            setConnectionError(loginError);
          }
        });
        setEuButtonHide(true);
      } else {
        handleOrgLogin();
      }
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

  /** Used to get - Access Token using account scope */
  const isAuthenticated = useIsAuthenticated();
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return undefined;

    let isMounted = true;

    const attemptExistingSession = async () => {
      const cachedAccounts = instance.getAllAccounts();
      if (cachedAccounts.length === 0) {
        if (isMounted) setIsCheckingSession(false);
        return;
      }

      if (!getAuthType()) {
        setAuthType("ORG");
      }

      instance.setActiveAccount(cachedAccounts[0]);

      if (data?.accessToken && data?.details) {
        if (isMounted) setIsCheckingSession(false);
        return;
      }

      const activeLoginRequest =
        getAuthType() === "B2C" ? loginRequestB2C : loginRequestORG;

      try {
        const response = await instance.acquireTokenSilent({
          ...activeLoginRequest,
          account: cachedAccounts[0],
        });
        if (isMounted) {
          applyTokenResponse(response);
        }
      } catch (error) {
        if (!(error instanceof InteractionRequiredAuthError)) {
          console.error("Existing session restore failed", error);
          const loginError = getLoginConnectionErrorMeta(error);
          if (loginError && isMounted) {
            setConnectionError(loginError);
          }
        }
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    attemptExistingSession();

    return () => {
      isMounted = false;
    };
  }, [inProgress, instance, data?.accessToken, data?.details, applyTokenResponse]);

  useEffect(() => {
    if (!isAuthenticated || toastShownRef.current || !accounts[0] || data?.accessToken) {
      return;
    }

    toastShownRef.current = true;
    instance.setActiveAccount(accounts[0]);

    const activeInstance = getAuthType() === "B2C" ? msalInstanceB2C : msalInstanceORG;
    const activeLoginRequest =
      getAuthType() === "B2C" ? loginRequestB2C : loginRequestORG;

    acquireTokenWithFallback(activeInstance, accounts[0], activeLoginRequest)
      .then((response) => {
        applyTokenResponse(response);
      })
      .catch((error) => {
        console.error("Token refresh failed", error);
        const loginError = getLoginConnectionErrorMeta(error);
        if (loginError) {
          setConnectionError(loginError);
          return;
        }
        unAuthorizedUserRequestFailed();
      });
  }, [isAuthenticated, accounts, instance, applyTokenResponse, data?.accessToken]);

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
    setExpiresOn("");
    setActiveWorkSpace("");
    instance.logoutPopup({
      postLogoutRedirectUri: "/",
    });
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
                <>
                  <AuthenticatedTemplate>
                    <button type="button" className="login-page__ms-btn" disabled>
                      <span>{t("common.loading")}...</span>
                    </button>
                  </AuthenticatedTemplate>
                  <UnauthenticatedTemplate>
                    {!euButtonHide && (
                      <button
                        type="button"
                        className="login-page__ms-btn"
                        onClick={handleOrgLogin}
                        disabled={inProgress === "login"}
                      >
                        <img src={msLogo} alt="" aria-hidden="true" />
                        <span>
                          {inProgress === "login"
                            ? `${t("login.inprogress")}...`
                            : t("login.sign_in_microsoft")}
                        </span>
                      </button>
                    )}
                  </UnauthenticatedTemplate>
                </>
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

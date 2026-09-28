import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "react-bootstrap";

import useAuth from "hooks/useAuth";
import usePhotoSync from "hooks/usePhotoSync";
import { useGlobalMaster } from "@orion/shared";
import { performAppLogout } from "utils/authLogout";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";

import "../../styles/pages/SupportCenter.scss";

const faqData = [
  {
    id: 1,
    question: "What is Orion and how does it help my business?",
    answer:
      "Orion is an all-in-one business platform that brings together Task Management, Knowledge Base, Kimai, LMS, Infozo and Opifex in a single application. It helps you streamline your workflows, improve productivity, and manage your business more efficiently.",
  },
  {
    id: 2,
    question: "How do I manage my tasks in Orion?",
    answer:
      "You can manage your tasks directly through the Task Management dashboard, where you can assign duties, set deadlines, and track milestones.",
  },
  {
    id: 3,
    question: "Where can I find the Knowledge Base?",
    answer:
      "The Knowledge Base is accessible via the side navigation panel under documentation or resource tools.",
  },
  {
    id: 4,
    question: "How do I track time with Kimai?",
    answer:
      "Open the integrated Kimai extension or tracker panel to start, pause, and log your project hours instantly.",
  },
  {
    id: 5,
    question: "How do I access the LMS courses?",
    answer:
      "Navigate to the learning module sector from your main dashboard hub to see all assigned courses.",
  },
  {
    id: 6,
    question: "How do I generate reports in Infozo?",
    answer:
      "Go to Infozo analytics tab, select your metrics filter, and click the export report generation button.",
  },
  {
    id: 7,
    question: "How do I automate workflows with Opifex?",
    answer:
      "Use the Opifex automation workflow builder to map out custom trigger actions across your connected tools.",
  },
];

export default function SupportCenter({ onBack }) {
  const navigate = useNavigate();
  const [{ data: auth }, { setAuth, logoutUser }] = useAuth();
  const { roleList, getRoleList } = useGlobalMaster();

  usePhotoSync();

  const [showPopup, setShowPopup] = useState(false);
  const [openFaqId, setOpenFaqId] = useState(1);

  const details = auth?.details;

  // ========================================================================
  // Load Roles
  // ========================================================================

  useEffect(() => {
    if (!roleList?.loading && !roleList?.error && roleList?.data?.length === 0) {
      getRoleList();
    }
  }, [roleList?.loading, roleList?.error, roleList?.data?.length, getRoleList]);

  // ========================================================================
  // User Role
  // ========================================================================

  const roleName = useMemo(() => {
    if (details?.jobTitle) {
      return details.jobTitle;
    }

    if (!roleList?.data?.length || details?.user_type == null) {
      return "User";
    }

    return (
      roleList.data.find((role) => role.status_id === details.user_type)?.name || "User"
    );
  }, [roleList?.data, details?.user_type, details?.jobTitle]);

  // ========================================================================
  // Logout
  // ========================================================================

  const userLogout = useCallback(() => {
    performAppLogout({
      logoutUser,
      setAuth,
      navigate,
      onBeforeLogout: () => setShowPopup(false),
    });
  }, [logoutUser, navigate, setAuth]);

  useEffect(() => {
    if (!showPopup) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const clickedUserButton = target.closest(".application-hub__user-more");

      const clickedPopup = target.closest(".user-info__popup");

      if (!clickedUserButton && !clickedPopup) {
        setShowPopup(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showPopup]);

  // ========================================================================
  // Escape Key
  // ========================================================================

  useEffect(() => {
    if (!showPopup) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowPopup(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showPopup]);

  // ========================================================================
  // FAQ Toggle
  // ========================================================================

  const toggleFaq = useCallback((id) => {
    setOpenFaqId((currentId) => (currentId === id ? null : id));
  }, []);

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="orion-page faq-layout-wrapper">
      {/* ================================================================== */}
      {/* MAIN CONTENT                                                       */}
      {/* ================================================================== */}
      {/* ================= HEADER ACTION ================= */}
      <Link onClick={() => onBack()} to="/home" className="back-link">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m14 16-4-4 4-4" />
        </svg>
        <span>Back to Hub</span>
      </Link>{" "}
      <main className="orion-content">
        <div className="orion-content__inner">
          {/* ================= HEADING ================= */}

          <header className="faq-header">
            <h1>Frequently asked questions</h1>

            <p className="faq-subtitle">
              Find quick answers to common questions about Orion and its integrated tools.
            </p>
          </header>

          {/* ================= FAQ SECTION ================= */}

          <div className="faq-grid-container">
            {/* ================= CONTACT CARD ================= */}

            <Card className="faq-contact-card">
              <div className="faq-contact-icon-circle">
                <span className="question-mark-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="35"
                    height="35"
                    fill="currentColor"
                    class="bi bi-question-circle"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94" />
                  </svg>
                </span>
              </div>

              <h3>Still have a questions?</h3>

              <p>
                Can't find the answer to your question? Send us an email and we'll get
                back to you as soon as possible!
              </p>

              <button type="button" className="btn-contact-support">
                <span className="mail-icon" aria-hidden="true">
                  ✉
                </span>

                <span>Contact Support</span>
              </button>

              <div className="decorative-bubble" aria-hidden="true" />
            </Card>

            {/* ================= FAQ ACCORDION ================= */}

            <div className="faq-accordion-list">
              {faqData.map((item) => {
                const isOpen = openFaqId === item.id;
                const panelId = `faq-panel-${item.id}`;
                const buttonId = `faq-button-${item.id}`;

                return (
                  <div
                    key={item.id}
                    className={`faq-accordion-item ${isOpen ? "is-active" : ""}`}
                  >
                    <button
                      id={buttonId}
                      type="button"
                      className="faq-accordion-header"
                      onClick={() => toggleFaq(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                    >
                      <span>{item.question}</span>

                      <span
                        className={`arrow-icon ${isOpen ? "up" : "down"}`}
                        aria-hidden="true"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#082B45"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {isOpen ? (
                            <path d="m18 15-6-6-6 6" />
                          ) : (
                            <path d="m6 9 6 6 6-6" />
                          )}
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        id={panelId}
                        className="faq-accordion-body"
                        role="region"
                        aria-labelledby={buttonId}
                      >
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

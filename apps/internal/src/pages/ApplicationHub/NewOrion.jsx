import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "react-bootstrap";

import useAuth from "hooks/useAuth";
import usePhotoSync from "hooks/usePhotoSync";
import { useGlobalMaster } from "@orion/shared";
import { performAppLogout } from "utils/authLogout";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";

import "../../styles/pages/NewOrion.scss";

const paragraphs = [
  `New Orion is the next generation of our internal workspace, rebuilt from the ground up to bring every tool your team relies on into one place. With a single sign-in you land on the Application Hub, where Task Management, the Knowledge Base, Kimai time tracking and other internal apps are just one click away. No more juggling tabs, bookmarks and separate logins — Orion knows who you are and shows you the applications your role gives you access to.`,

  `At the heart of New Orion is a redesigned Kanban dashboard that makes it easier to see, plan and deliver work. Tickets move through clear workflow stages, from requirement gathering to delivery, and each ticket shows its tools and subtasks, owners, due dates and priority at a glance. You can assign teammates, comment and @mention colleagues, attach files, create subtasks and log time directly from a card, so the full history of every piece of work stays in one place instead of being scattered across emails and chats.`,

  `New Orion is also built to grow with us. Its modular architecture lets new applications join the hub without disrupting the ones you already use, while a refreshed, faster interface keeps everyday work simple and consistent across every screen. We will keep adding features based on your feedback, so explore the new dashboard, try the Application Hub and tell us what would help you work better.`,
];

const HIGHLIGHT_TEXT = "Welcome to the new way of working with Orion.";

export default function NewOrion({ onBack }) {
  const navigate = useNavigate();
  const [{ data: auth }, { setAuth, logoutUser }] = useAuth();
  const { roleList, getRoleList } = useGlobalMaster();
  usePhotoSync();
  const [showPopup, setShowPopup] = useState(false);
  const details = auth?.details;

  useEffect(() => {
    if (!roleList?.loading && !roleList?.error && roleList?.data?.length === 0) {
      getRoleList();
    }
  }, [roleList?.loading, roleList?.error, roleList?.data?.length, getRoleList]);

  /*
   * Resolve the user's role.
   */
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

  /*
   * Logout.
   */
  const userLogout = useCallback(() => {
    performAppLogout({
      logoutUser,
      setAuth,
      navigate,
      onBeforeLogout: () => setShowPopup(false),
    });
  }, [logoutUser, navigate, setAuth]);

  /*
   * Close popup when clicking outside the user section.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".application-hub__user")) {
        setShowPopup(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="orion-page">
      {/* ================= CONTENT ================= */}

      <Link onClick={() => onBack()} to="/home" className="back-link">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-circle-chevron-left"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m14 16-4-4 4-4" />
        </svg>
        <span>Back to Hub</span>
      </Link>
      <main className="orion-content">
        <div className="orion-content__inner">
          <h1>What is New Orion ?</h1>

          <section className="description">
            {paragraphs.map((text, index) => (
              <p key={index}>
                {text}

                {index === paragraphs.length - 1 && (
                  <>
                    {" "}
                    <span className="highlight-text">{HIGHLIGHT_TEXT}</span>
                  </>
                )}
              </p>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

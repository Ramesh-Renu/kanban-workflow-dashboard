import React, { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { orionLogo } from "../../assets/images";
import notificationSoundUrl from "../../assets/audio/mixkit-software-interface-back-2575.wav";
import { useNotification } from "../../hooks/useNotification";
import { updateNotification } from "../../services";
import { getKanbanDetailsPath } from "../../utils/kanbanRoutes";

/* -------------------- Utils -------------------- */
const isNotificationSupported = () => {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof Notification.permission === "string"
  );
};

const NotificationsRealTime = ({ liveNotifications = [], notificationId }) => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotify, setShowNotify] = useState(false);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("");
  const [hovered, setHovered] = useState(false);
  const { getPageNotificationData } = useNotification();

  // When live notifications come in from socket
  useEffect(() => {
    if (liveNotifications.length > 0) {
      setNotifications(liveNotifications);
      getPageNotificationData();
      setShowNotify(true);
    }
  }, [liveNotifications]);

  // --- Permission Banner ---
  useEffect(() => {
    // if (Notification.permission === "default") {
    //   Notification.requestPermission();
    // }
    if (!isNotificationSupported()) return;

    if (Notification.permission === "denied") {
      if (!document.getElementById("notification-modal")) {
        const banner = document.createElement("div");
        banner.id = "notification-modal";
        banner.style.position = "fixed";
        banner.style.top = "10px";
        // banner.style.left = "0";
        banner.style.right = "15px";
        banner.style.backgroundColor = "var(--color-white)";
        banner.style.borderBottom = "1px solid #ccc";
        banner.style.zIndex = "1000";
        banner.style.padding = "8px 16px";
        banner.style.display = "flex";
        banner.style.justifyContent = "space-between";
        banner.style.alignItems = "center";
        banner.style.borderRadius = "8px";
        banner.style.fontSize = "var(--font-size-sm)";
        banner.style.boxShadow = "0px 0px 6px rgba(0, 0, 0, 0.06)";

        // Message
        const message = document.createElement("span");
        message.innerText =
          "🔕 Notifications are blocked. Enable them in browser settings.";

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×"; // Unicode multiplication sign
        closeBtn.style.fontSize = "var(--font-size-xl)";
        closeBtn.style.border = "none";
        closeBtn.style.background = "transparent";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.marginLeft = "16px";

        // Close functionality
        closeBtn.onclick = () => {
          banner.remove();
        };

        banner.appendChild(message);
        banner.appendChild(closeBtn);
        document.body.prepend(banner);
      }
    }
  }, []);

  // --- Auto-cycle notifications (with animations) ---
  useEffect(() => {
    if (showNotify && notifications.length > 0) {
      const audio = new Audio(notificationSoundUrl);
      audio.play().catch((err) => console.error("Audio playback failed:", err));
      const timeoutDuration = notifications.length > 1 ? 7000 : 10000;
      if (currentNotificationIndex < notifications.length) {
        setAnimationClass("notification-enter");
      }
      const timer = setTimeout(() => {
        if (currentNotificationIndex < notifications.length - 1) {
          setAnimationClass("notification-exit");
          setTimeout(() => {
            setCurrentNotificationIndex((prev) => prev + 1);
            setAnimationClass("notification-enter");
          }, 500);
        } else {
          setNotifications([]);
          setShowNotify(false);
        }
      }, timeoutDuration);
      return () => clearTimeout(timer);
    }
  }, [showNotify, currentNotificationIndex, notifications]);

  // --- Redirection ---
  const handleRedirection = async (info) => {
    // if (info.type === "agency signup request") {
    //   const response = await updateNotification({
    //     ticket_id: info.ticket_id,
    //     tool_ticket_id: info.tool_ticket_id,
    //     update_team_id: info.update_team_id,
    //     type: info.type,
    //     notify_id: info.notify_id,
    //     status: 1,
    //     work_space_id: info?.workspace_id,
    //   });
    //   if (response?.status) {
    //     navigate("/teams/agencyNewRequests");
    //     setShowNotify(false);
    //   }
    //   return;
    // }

    // if (info.type === "Announcements") {
    //   if (info.workspace_id !== auth.activeWorkSpace) {
    //     setActiveWorkSpace(Number(info.workspace_id));
    //   }
    //   if (info?.status === 0) {
    //     await updateNotification({ ...info, status: 1 });
    //   }
    //   navigate("/calendar", {
    //     state: {
    //       board_id: info.board_id,
    //       board_name: info.board_name,
    //       event_id: info.event_id,
    //       label_name: info.label_name,
    //       notify_id: info.notify_id,
    //       ticket_id: info.ticket_id,
    //       tool_id: info.tool_id,
    //       tool_ticket_id: info.tool_ticket_id,
    //       workspace_id: info.workspace_id,
    //     },
    //   });
    //   setShowNotify(false);
    //   return;
    // }

    if (info?.tool_id || info?.ticket_id) {
      await updateNotification({
        notification_id: notificationId,
        is_read: true,
      });

      const workspaceId = info?.workspace_id ?? info?.work_space_id;
      const detailsBase = getKanbanDetailsPath(
        info.board_id,
        info.ticket_id,
        workspaceId,
      );

      if (info?.tool_id !== 0) {
        navigate(
          `${detailsBase}?${info?.workspace_type === 60 ? "toolId" : "taskId"}=${info?.workspace_type === 60 ? info?.tool_id : info?.tool_ticket_id}`,
          {
            state: {
              toolId:
                info?.workspace_type === 60
                  ? info?.tool_id
                  : info?.tool_ticket_id,
              boardId: info.board_id,
            },
          },
        );
        setShowNotify(false);
        return;
      }
      if (info?.notify_type === "tool_assignee") {
        // Added since we dont know the exact toolid on assign process
        navigate(`${detailsBase}?activetab=subinfo`, {
          state: {
            toolId:
              info?.workspace_type === 60
                ? info?.tool_id
                : info?.tool_ticket_id,
            boardId: info.board_id,
          },
        });
      } else {
        navigate(detailsBase, {
          state: { toolId: info?.tool_id, boardId: info.board_id },
        });
      }
      setShowNotify(false);
    }
  };

  const closePopup = () => setShowNotify(false);

  // --- UI ---
  return (
    <Fragment>
      {showNotify && notifications.length > 0 && !document.hidden && (
        <div
          className={`pushNotifications-container ${animationClass}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <h1 className="pushNotifications-container--header">
            <span>
              <img
                className="orion-logo-icon"
                src={orionLogo}
                alt="Orion Logo"
              />{" "}
              &#160; Orion &#160;&#183;&#160;
              {/* <span className="time-update">
                {notifications[currentNotificationIndex]?.time_ago}
              </span> */}
            </span>{" "}
            <span
              className="icon-close-icon-white closed-round-icon"
              title="Close"
              onClick={closePopup}
            />
          </h1>

          <div
            className={`notification_container ${notifications[currentNotificationIndex]?.status
              ? "read"
              : "unread"
              }`}
            id={notificationId}
            onClick={() =>
              handleRedirection(notifications[currentNotificationIndex])
            }
          >
            <div className={`notification_container_image`}>
              {/* Display the appropriate icon based on notification type */}
              {[
                "subtask_assignee",
                "subtask_re_assigned",
                "ticket_assignee",
                "ticket_re_assigned",
                "tool_assignee",
                "re_assigned_tool",
                "mentions",
                "participant_added",
              ].includes(notifications[currentNotificationIndex]?.type) && (
                  <span className={"icon-card-assign"} title="Card Assign" />
                )}
              {[
                "moved_the_ticket",
                "moved the ticket",
                "due_date_set",
              ].includes(notifications[currentNotificationIndex]?.type) && (
                  <span className={"icon-card-icon"} title="Card Moved" />
                )}
              {["new_date_announced", "Announcements"].includes(
                notifications[currentNotificationIndex]?.type,
              ) && (
                  <span
                    className={"icon-calendar-blue"}
                    title="new date announced"
                  />
                )}
              {["release_date_arrived"].includes(
                notifications[currentNotificationIndex]?.type,
              ) && (
                  <span
                    className={"icon-calendar-blue-slash"}
                    title="release date arrived"
                  />
                )}
              {["release_in_day"].includes(
                notifications[currentNotificationIndex]?.type,
              ) && (
                  <span
                    className={"icon-calendar-blue-slash"}
                    title="release in day"
                  />
                )}
              {["upselling_tools"].includes(
                notifications[currentNotificationIndex]?.type,
              ) && <span className={"icon-upsell"} title="upselling tools" />}

              {["agency signup request"].includes(
                notifications[currentNotificationIndex]?.type,
              ) && (
                  <span className={"icon-user-request"} title="signup request" />
                )}
            </div>

            <div className="notification_container_details">
              <div className="notification_container_details-top--row">
                <h5 className="notification_container_details-header">
                  {notifications[currentNotificationIndex]?.header}
                </h5>
              </div>
              <div
                className="notification_container_details_html"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    notifications[currentNotificationIndex]?.notify_message,
                  ),
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default NotificationsRealTime;

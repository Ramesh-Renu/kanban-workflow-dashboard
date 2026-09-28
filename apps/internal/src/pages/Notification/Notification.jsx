import React, { Fragment, useEffect, useState } from "react";
import { useToast } from "@orion/shared";
import { readDeleteAllNotification, updateNotification } from "../../services";
import NotificationData from "./NotificationData";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../hooks/useNotification";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import useAuth from "../../hooks/useAuth";
import { readALLGreenk, trashFull } from "../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { getKanbanDetailsPath } from "../../utils/kanbanRoutes";

const Notification = ({ closeModal }) => {
  /** VARIABLES & DECLARATION */
  const { showToast } = useToast();
  const [{ data: auth }] = useAuth();
  const navigate = useNavigate();
  const { pageNotification, getPageNotificationData } = useNotification();
  const [activeTab, setActiveTab] = useState("all");
  const [tasksData, setTasksData] = useState([]);
  const [mentionsData, setMentionsData] = useState([]);
  const [getvHeaight, setGetvHeaight] = useState();
  const [loading, setLoading] = useState(true);
  const [showRemoveFieldMsg, setShowRemoveFieldMsg] = useState(false);

  const fetchAndSetNotifications = async () => {
    try {
      setLoading(true); // Set loading to true before starting the API call
      getPageNotificationData();
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false); // Set loading to false after the API call completes
    }
  };

  useEffect(() => {
    fetchAndSetNotifications();
  }, []);

  const categorizeNotifications = (notifications) => {
    const tasks = [];
    const mentions = [];
    const requests = [];
    const announcements = [];

    notifications.forEach((notification) => {
      if (
        [
          "ticket_assignee",
          "subtask_assignee",
          "ticket_re_assigned",
          "tool_assignee",
          "re_assigned_tool",
          "task_assignee",
          "task_ticket",
        ].includes(notification.notify_type)
      ) {
        tasks.push(notification);
      } else if (["mentions", "tagged_comments"].includes(notification.notify_type)) {
        mentions.push(notification);
      } else if (
        [
          "Announcements",
          "new_date_announced",
          "release_date_arrived",
          "release_in_day",
          "upselling_tools",
        ].includes(notification.notify_type)
      ) {
        announcements.push(notification);
      } else if (
        [
          "agency signup request",
          "signup request",
          "signup_request",
          "agency_signup_request",
        ].includes(notification.type)
      ) {
        requests.push(notification);
      }
    });

    return { tasks, mentions, requests, announcements };
  };

  useEffect(() => {
    if (pageNotification?.length > 0) {
      const { tasks, mentions } = categorizeNotifications(pageNotification);
      setTasksData(tasks);
      setMentionsData(mentions);
    }
  }, [pageNotification]);

  const handleChangeTab = (e) => {
    setActiveTab(e);
  };

  const handleChangedStatus = async (status, info) => {
    try {
      const response = await updateNotification({
        notification_id: info.notification_id,
        is_read: status.is_read,
      });

      if (response?.status) {
        showToast({ message: response?.data?.message, variant: "success" });
        await fetchAndSetNotifications();
      } else {
        showToast({ message: response?.data?.message, variant: "danger" });
      }
    } catch (error) {
      console.error("Error updating notification:", error);
      showToast({
        message: error.message || "Error updating notification",
        variant: "danger",
      });
    }
  };

  const updateNotificationStatus = async (info, status = true) => {
    try {
      const response = await updateNotification({
        notification_id: info.notification_id,
        is_read: status,
      });
      if (response?.status) {
        showToast({ message: response?.data?.message, variant: "success" });
        await fetchAndSetNotifications();
      } else {
        showToast({ message: response?.data?.message, variant: "danger" });
      }
    } catch (error) {
      console.error("Error updating notification:", error);
      return null;
    }
  };

  const handleRedirection = async (info) => {
    const workspaceId = info?.workspace_id ?? info?.work_space_id;
    const detailsBase = getKanbanDetailsPath(
      info.board_id,
      info.ticket_id,
      workspaceId,
    );

    if ((info?.tool_id || info?.ticket_id) && info?.is_read === false) {
      // const response = await updateNotificationStatus(info);

      (async () => {
        try {
          await updateNotificationStatus(info);
        } catch (err) {
          console.error("Background update of notification status failed:", err);
        }
      })();

      // if (response?.status) {
      closeModal();
      let path = detailsBase;
      if (info.notify_type === "tool_assignee") {
        path = `${detailsBase}?activetab=subinfo`;
      } else if (info?.tool_id && info?.tool_id !== 0) {
        path =
          info?.workspace_type === 60
            ? `${detailsBase}?toolId=${info.tool_id}`
            : `${detailsBase}?taskId=${info.tool_ticket_id}`;
      }
      // const path =
      //   info?.tool_id && info?.tool_id !== 0
      //     ? `/orders/details/${info.board_id}/${info.ticket_id}?toolId=${info.tool_id}`
      //     : `/orders/details/${info.board_id}/${info.ticket_id}`;

      navigate(path, {
        state: {
          toolId: info?.workspace_type === 60 ? info?.tool_id : info?.tool_ticket_id,
          boardId: info?.board_id,
          labelCode: info?.label_name,
        },
      });
      // }
    } else {
      closeModal();

      let path = detailsBase;
      if (info.notify_type === "tool_assignee") {
        path = `${detailsBase}?activetab=subinfo`;
      } else if (info?.tool_id && info?.tool_id !== 0) {
        path =
          info?.workspace_type === 60
            ? `${detailsBase}?toolId=${info.tool_id}`
            : `${detailsBase}?taskId=${info.tool_ticket_id}`;
      }

      // const path =
      //   info?.tool_id && info?.tool_id !== 0
      //     ? `/orders/details/${info.board_id}/${info.ticket_id}?toolId=${info.tool_id}`
      //     : `/orders/details/${info.board_id}/${info.ticket_id}`;
      navigate(path, {
        state: {
          toolId: info?.workspace_type === 60 ? info?.tool_id : info?.tool_ticket_id,
          boardId: info?.board_id,
          labelCode: info?.label_name,
        },
      });
    }
  };

  const setGetvHeaightHandle = (e) => {
    setGetvHeaight();
  };

  const gotoScrollTop = () => {
    const element = document.getElementById("notifyPage01");
    if (element) {
      element.scrollTop = 0;
    }
  };
  let tabDataMap = {
    all: pageNotification || [],
    tasks: tasksData,
    mentions: mentionsData,
  };
  const readDeleteAllApiCall = async (paramData) => {
    try {
      const response = await readDeleteAllNotification(paramData);
      if (response?.status) {
        setShowRemoveFieldMsg(false);
        await fetchAndSetNotifications();
        if (paramData.type === "deleteall") {
          setTasksData([]);
          setMentionsData([]);
        }
        showToast({ message: response?.data?.message, variant: "success" });
      } else {
        showToast({ message: response?.data?.message, variant: "danger" });
      }
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };
  const handleChangeReadAll = () => {
    readDeleteAllApiCall({
      reg_id: auth?.details.regId,
      type: "readall",
    });
  };
  const deleteNotification = () => {
    readDeleteAllApiCall({
      reg_id: auth?.details.regId,
      type: "deleteall",
    });
  };

  const cancelDeleteNotification = () => {
    setShowRemoveFieldMsg(false);
  };

  const handleChangeDeleteAll = () => {
    setShowRemoveFieldMsg(true);
  };

  return (
    <Fragment>
      <div className="notification__page">
        <div className="notification__page__tab">
          <div className="notification__page__tab-detail">
            <div className="tabs-list">
              {["all", "tasks", "mentions"]
                .filter(Boolean) // Filter out falsy values (e.g., null, undefined, "")
                .map((tab) => (
                  <button
                    key={tab}
                    className={`tasks ${activeTab === tab ? "active" : ""}`}
                    onClick={() => handleChangeTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() +
                      (tab.slice(1) === "ll" ? "ll Notifications" : tab.slice(1))}
                    {tabDataMap[tab]?.filter((v) => !v.is_read).length !== 0 && (
                      <span className="unread-count">
                        {tabDataMap[tab]?.filter((v) => !v.is_read).length}
                      </span>
                    )}
                  </button>
                ))}
            </div>
            {pageNotification?.length > 0 && (
              <div className="notification__page__container-card--header">
                <div className="read-delete-all">
                  <button
                    className="read-all"
                    onClick={handleChangeReadAll}
                    title="Read All"
                  >
                    <img src={readALLGreenk} alt="Read All" />
                  </button>
                  <button
                    className="delete-all"
                    onClick={handleChangeDeleteAll}
                    title="Delete All"
                  >
                    <img src={trashFull} alt="Delete All" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          className={`notification__page__container ${getvHeaight ? "vheaight" : ""
            } ${loading ? "page-loading" : ""}`}
          id="notifyPage01"
        >
          {loading ? (
            <Spinner />
          ) : (
            tabDataMap[activeTab] && (
              <NotificationData
                val={tabDataMap[activeTab] || []}
                pageHeaight={setGetvHeaightHandle}
                changedStatus={handleChangedStatus}
                goToRelevantPage={handleRedirection}
                gotoScrollPage={gotoScrollTop}
              />
            )
          )}
        </div>
      </div>
      {showRemoveFieldMsg && (
        <PopupModal
          show={showRemoveFieldMsg}
          onClose={cancelDeleteNotification}
          className={"popupModal bg-white rounded-4"}
          width={"40vh"}
        >
          <div>
            <h5 className="text-center">Do you want to Delete all Notifications?</h5>
            <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
              <button
                className="btn btn-0 modalDelete_btn px-3"
                onClick={deleteNotification}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    deleteNotification();
                  }
                }}
              >
                Yes
              </button>
              <button
                className="btn btn-0 modalCancel_btn px-3"
                onClick={cancelDeleteNotification}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    cancelDeleteNotification();
                  }
                }}
              >
                No
              </button>
            </div>
          </div>
        </PopupModal>
      )}
    </Fragment>
  );
};

export default Notification;

import React, { Fragment, useEffect, useState, useRef, useMemo } from "react";
import {
  noNotificationData,
} from "../../assets/images";
import DOMPurify from 'dompurify';
import LogoAvatarShowLetter from "../../components/common/LogoAvatarShowLetter";

const NotificationData = ({
  val,
  pageHeaight,
  changedStatus,
  goToRelevantPage,
  gotoScrollPage,
}) => {
  /** VARIABLES & DECLARATION */
  const [displayedNotifications, setDisplayedNotifications] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const loadMoreRef = useRef(null);
  const readStatusList = [
    { name: "Mark as read", is_read: true },
    { name: "Mark as unread", is_read: false },
  ];
  useEffect(() => {
    setCurrentBatch(0);
    setDisplayedNotifications([]); // Clear notifications to reload correctly
  }, [val]);

  // Filter unique notifications
  const uniqueNotifications = useMemo(() => {
    return val?.filter(
      (item, index, self) =>
        index ===
        self?.findIndex((t) => t?.notification_id === item?.notification_id)
    );
  }, [val]);

  useEffect(() => {
    setDisplayedNotifications(
      uniqueNotifications.slice(0, (currentBatch + 1) * 10)
    );
  }, [uniqueNotifications, currentBatch]);

  // Load notifications batch-wise
  useEffect(() => {
    const loadNotifications = () => {
      const nextBatch = uniqueNotifications?.slice(
        currentBatch * 10,
        (currentBatch + 1) * 10
      );

      // Ensure no duplicates are added
      setDisplayedNotifications((prev) => {
        const merged = [...prev, ...nextBatch];
        const uniqueMerged = Array.from(
          new Set(merged.map((item) => item?.notification_id))
        ).map((id) => merged?.find((item) => item?.notification_id === id));
        return uniqueMerged;
      });
    };

    if (uniqueNotifications.length > 0) {
      loadNotifications();
    }
  }, [currentBatch, uniqueNotifications]);

  // IntersectionObserver to trigger loading more notifications
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentBatch((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer?.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer?.unobserve(currentRef);
      }
    };
  }, []);

  // Notify parent component if there are no notifications
  useEffect(() => {
    pageHeaight(val.length === 0);
  }, [val.length, pageHeaight]);

  // Group notifications into categories
  const filteredNotificationsByCategory = useMemo(() => {
    const grouped = {
      Today: [],
      Yesterday: [],
      Older: [],
    };
    displayedNotifications.forEach((value) => {
      const timeAgoTrimmed = value?.time_ago?.trim();

      if (
        ["just now", "1 minute ago", "1 minutes ago", "1 hour ago"]?.includes(
          timeAgoTrimmed
        ) ||
        timeAgoTrimmed?.match(/^\d+ (minutes|hours) ago$/)
      ) {
        grouped?.Today?.push(value);
      } else if (timeAgoTrimmed === "1 day ago") {
        grouped?.Yesterday?.push(value);
      } else {
        grouped?.Older?.push(value);
      }
    });

    return grouped;
  }, [displayedNotifications]);

  // Handle status change
  const handleChangedStatus = (event, info) => {
    changedStatus(event, info);

    // Update the displayedNotifications state to reflect the change
    setDisplayedNotifications((prev) =>
      prev.map((notification) =>
        notification?.notification_id === info?.notification_id
          ? { ...notification, is_read: event?.target?.value } // Update the status
          : notification
      )
    );
    // Scroll to the updated notification card
    const element = document.getElementById(info.notification_id); // Assuming `notification_id` is the ID
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleRedirection = (e, info) => {
    if (e.type === "click" || e.key === "Enter") {
      goToRelevantPage(info);
    }
  };
  const gotoTopPage = () => {
    gotoScrollPage(true);
  };

  return (
    <>
      <div className="main-content">
        {["Today", "Yesterday", "Older"].map((category) => {
          const notifications =
            filteredNotificationsByCategory?.[category] || [];
          if (notifications.length === 0) return null; // Skip empty categories

          return (
            <Fragment key={category}>
              <h3 className="divider-header">{category}</h3>
              {val &&
                notifications?.map((value, index) => {
                  return (
                    <div
                      className={`notification__page__container-card ${value.is_read ? "read" : "unread"
                        }`}
                      key={value.notification_id}
                      id={value.notification_id}
                    // title={'Notification Number '+(index+1)}
                    >
                      <div className="notification__page__container-card_image">
                        <LogoAvatarShowLetter
                          genaralData={value}
                          isCustomBg={true}
                          profilePhotoName="photo_url"
                          profileName="moved_from_name"
                          innerClassName="avatars__img"
                          outerClassName={`avatar-item ${!value.is_read && "active"}`}
                        />
                        {/* {[
                          "subtask_assignee",
                          "subtask_re_assigned",
                          "ticket_assignee",
                          "ticket_re_assigned",
                          "tool_assignee",
                          "re_assigned_tool",
                          "mentions",
                          "participant_added",
                        ].includes(value?.notify_type) && (
                          <span className={"icon-card-assign"} title="Card Assign" />
                        )}
                        {[
                          "moved_the_ticket",
                          "moved the ticket",
                          "due_date_set",
                        ].includes(value?.notify_type) && (
                          <span className={"icon-card-icon"} title="Card Moved" />
                        )}
                        {["new_date_announced", "Announcements"].includes(value?.notify_type) && (
                          <span className={"icon-calendar-blue"} title="new date announced" />
                        )}
                        {["release_date_arrived"].includes(value?.notify_type) && (
                          <span className={"icon-calendar-blue-slash"} title="release date arrived"
                          />
                        )}
                        {["release_in_day"].includes(value?.notify_type) && (
                          <span className={"icon-calendar-blue-slash"} title="release in day" />
                        )}
                        {["upselling_tools"].includes(value?.notify_type) && (
                          <span className={"icon-upsell"} title="upselling tools" />
                        )}

                        {["agency signup request"].includes(value?.notify_type) && (
                          <span className={"icon-user-request"} title="signup request" />
                        )} */}
                      </div>
                      <div
                        className="notification__page__container-card_details"
                        onClick={(e) => {
                          if (!e.target.closest(".showToolTip")) {
                            handleRedirection(e, value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (!e.target.closest(".showToolTip")) {
                            handleRedirection(e, value);
                          }
                        }}
                        tabIndex={0}
                      >
                        <div className="notification__page__container-card_details-top--row">
                          <h5 className={`notification__page__container-card_details-header ${!value.is_read && "active"}`}>
                            {value?.header ||
                              (value?.notify_type === "moved_the_ticket" ||
                                value?.notify_type === "moved the ticket"
                                ? "Card Moved"
                                : value?.notify_type === "mentions"
                                  ? "You've been Tagged"
                                  : [
                                    "ticket_assignee",
                                    "tool_assignee",
                                    "re_assigned_tool",
                                    "subtask_assignee",
                                  ].includes(value?.notify_type)
                                    ? "Card Assigned"
                                    : value?.notify_type === "agency signup request"
                                      ? "Signup Request"
                                      : "")}
                            {value?.board_name && (
                              <span
                                className={`board-name ${value?.board_name === "Periodic Updates"
                                  ? "periodic-updates"
                                  : ""
                                  }`}
                              >
                                {value?.board_name}
                              </span>
                            )}
                          </h5>
                          <p className={`notification__page__container-card_details_updatedOn ${!value.is_read && "active"}`}>
                            {value.time_ago}
                          </p>
                        </div>
                        <div className="notification__page__container-card_details--row">
                          <div
                            className="notification__page__container-card_details_html"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(value?.notify_message, { ALLOWED_ATTR: ['href', 'target', 'src', 'style'] }),
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </Fragment>
          );
        })}

        {val?.length === 0 && (
          <div className="nodata-found">
            <img src={noNotificationData} alt="No Notification Data" />
            <h4 className="nodata-found-head">You Have No New Notification</h4>
          </div>
        )}

        {/* Render "End" button if there are notifications */}
        {/* {val?.length >= 6 && val?.length === displayedNotifications?.length && (
          <div className="ticket_info_container_activity_more">
            <button onClick={gotoTopPage}>
              End &#160;&#160;&#160;&#160;-&#160;&#160;&#160;&#160;{" "}
              {"Go to Top"}
            </button>
          </div>
        )} */}

        {/* "Load more" trigger for infinite scroll */}
        <div ref={loadMoreRef} style={{ height: "1px" }}></div>
      </div>
    </>
  );
};

export default NotificationData;

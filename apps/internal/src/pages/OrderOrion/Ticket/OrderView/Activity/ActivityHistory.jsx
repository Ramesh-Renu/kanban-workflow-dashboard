import React, { useState, useEffect, useRef } from "react";
import { ActivityContent } from "./ActivityContent";
import appConstants from "../../../../../constant/common";
import RichTextEditor from "../../../../../components/common/RichTextEditor/Editor";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import useAuth from "../../../../../hooks/useAuth";
import LogoAvatarShowLetter from "../../../../../components/common/LogoAvatarShowLetter";
import {
  isOnlyWhitespaceHtml,
  isCharacterLimitExceeded,
  getLimitedHtmlWithNewlineContent,
} from "../../../../../utils/common";
import { useTranslation } from "react-i18next";
import { CloseHtmlIcon } from "../../../../../components/common/PureCSSIcons/IconsList";
import { Col, Row } from "react-bootstrap";

const ActivityHistory = ({
  data,
  activityType,
  handleAddUpdateComment,
  handleArchiveComment,
  handleChangeActivityType,
  handleShowMoreActivity,
  isLastActivity,
  refresRichTextEditor,
  ...props
}) => {
  /** VARIABLES & DECLARATION */
  const inputRef = useRef();
  const activityListRef = useRef(null);
  const scrollSnapshotRef = useRef(null);

  const [focusedFlag, setFocusedFlag] = useState(false);
  const [commentsData, setCommentsData] = useState("");
  const [filteredActivityData, setFilteredActivityData] = useState();
  const [commentAttachment, setCommentAttachment] = useState([]);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [{ data: auth }] = useAuth();
  const [getDefault, setGetDefault] = useState(false);
  const [finanYear, setFinanYear] = useState("");
  const [showData, setshowData] = useState(
    props?.ticketData?.financial_years ? props?.ticketData?.financial_years[0] : "",
  );
  const { t } = useTranslation();
  const [enteredCharacter, setEnteredCharacter] = useState(null);
  const [balanceCharacter, setBalanceCharacter] = useState(null);

  useEffect(() => {
    setFilteredActivityData(data);
  }, [data]);

  useEffect(() => {
    scrollSnapshotRef.current = null;
  }, [activityType?.type]);

  const activityItems = data ?? filteredActivityData ?? [];
  const hasActivities = activityItems.length > 0;
  const isLoadingMore = props?.isFetchingAPIData && hasActivities;
  const isInitialActivityLoad = props?.isFetchingAPIData && !hasActivities;

  useEffect(() => {
    if (props?.isFetchingAPIData || !scrollSnapshotRef.current) return;

    const snapshot = scrollSnapshotRef.current;
    scrollSnapshotRef.current = null;

    const applyScrollSnapshot = () => {
      const scrollRoot = document.scrollingElement || document.documentElement;
      if (scrollRoot && snapshot) {
        scrollRoot.scrollTop = snapshot.scrollTop;
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(applyScrollSnapshot);
    });
  }, [props?.isFetchingAPIData, activityItems.length, activityType?.type]);

  const handleShowMoreClick = (e) => {
    const scrollRoot = document.scrollingElement || document.documentElement;
    scrollSnapshotRef.current = {
      scrollTop: scrollRoot.scrollTop,
    };
    handleShowMoreActivity(e);
  };

  /** HANDLE COMMENT VALUE CHANGE */
  const handleValueChange = (e) => {
    const result = isCharacterLimitExceeded(e, appConstants.charCountLimit.comments);
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants.charCountLimit.comments,
    );
    setCommentsData(limitedText);
    if (result?.characterCount > 0) {
      setFocusedFlag(true);
    }
  };

  /** TRIGGER API CALL TO SUBMIT COMMENT INFO */
  const handleAddComment = (e) => {
    const checkWhiteSpace = isOnlyWhitespaceHtml(commentsData);
    if (!checkWhiteSpace && commentsData?.length > 0) {
      handleAddUpdateComment({
        type: "add",
        content: commentsData,
        attachment: commentAttachment,
        mentions: Array.from(
          new Set(
            mentionedUsers?.filter(
              (item, index) => mentionedUsers.indexOf(item) === index,
            ),
          ),
        ),
        added_by: auth.details.regId,
        order_id: props.ticketData.orderId,
        deleted_attachments: [],
        pageType: "comment",
        comment_id: 0,
        boardId: props?.activeBoard[0]?.boardID,
        work_space_id: props?.activeWorkSpace[0]?.work_space_id,
      });
      setCommentsData("");
      setMentionedUsers([]);
      setCommentAttachment([]);
      setFocusedFlag(false);
    }
  };

  /** USED TO HANDLE INPUT FOCUS */
  const handleFocus = (e) => {
    setFocusedFlag(true);
  };

  /** CANCEL EDIT */
  const handleCancel = () => {
    setCommentsData("");
    setMentionedUsers([]);
    setCommentAttachment([]);
    setFocusedFlag(false);
  };

  /** USED TO HANDLE UPDATE COMMENT DATAS */
  const handleUpdateComment = (e) => {
    handleAddUpdateComment({
      ...e,
      type: "update",
      order_id: props.ticketData.orderId,
      pageType: "comment",
    });
  };

  // Update the filtered data whenever the filter changes
  const handleFilterActivity = (type) => {
    // setFilterActivity(type);
    if (type === 0) {
      setFilteredActivityData(data);
    } else {
      setFilteredActivityData(data.filter((c) => c.type_id === type));
    }
  };

  const handleAttachmentUpdate = (res) => {
    setCommentAttachment((prevFiles) => [...prevFiles, ...res]);
  };
  const handleDeletedAttachment = (res) => {
    const updatedAttachedFiles = commentAttachment?.filter(
      (file) => file.name !== res.name,
    );
    setCommentAttachment(updatedAttachedFiles?.length > 0 ? updatedAttachedFiles : []);
  };

  const handleMentionedUsers = (e) => {
    setMentionedUsers(e);
  };

  useEffect(() => {
    setMentionedUsers([]);
  }, [!focusedFlag]);

  const handleChangeActivityView = () => {
    const setActive = getDefault ? !getDefault : true;
    setGetDefault(setActive);
    setFinanYear(!getDefault ? showData : "");
    handleChangeActivityType({
      type: activityType.type,
      year: !getDefault ? showData : "",
    });
  };

  const handleOnShow = (e) => {
    setshowData(e);
    const escapedYear = `#\\32 ${e.slice(1)}`;
    const childElement = inputRef?.current.querySelector(escapedYear);
    const setApiTrigger = childElement
      ?.querySelector(".collapseCard__heading")
      ?.classList?.contains("active");
    if (!setApiTrigger) {
      handleChangeActivityType({ type: activityType.type, year: e });
    }
    setFinanYear(e);
  };

  return (
    <Row
      key="activityHistory"
      className="bg-white rounded shadow-sm d-flex flex-row justify-content-between align-items-center w-100 flex-wrap mt-3 mx-auto pt-4 ticket_info_container_activity"
    >
      <div
        className={`d-flex gap-2 align-items-center justify-content-between ticket_info_container_activity_filter ${
          props?.stickyClassName ? "customStickyFilter" : ""
        }`}
      >
        <div className="d-flex gap-2">
          <button
            className={`${activityType?.type === 0 && `active`}`}
            onClick={() => handleChangeActivityType({ type: 0, year: finanYear })}
            key={1}
          >
            All
          </button>
          <button
            className={`${activityType?.type === 1 && `active`}`}
            onClick={() => handleChangeActivityType({ type: 1, year: finanYear })}
            key={2}
          >
            Comments
          </button>
          <button
            className={`${activityType?.type === 2 && `active`}`}
            onClick={() => handleChangeActivityType({ type: 2, year: finanYear })}
            key={3}
          >
            Activities
          </button>
          {props?.infoTabLabel && (
            <button
              className={`${activityType?.type === 3 && `active`}`}
              onClick={() => handleChangeActivityType({ type: 3, year: finanYear })}
              key={4}
            >
              {props.infoTabLabel}
            </button>
          )}
        </div>
      </div>

      {[0, 1].includes(activityType.type) && (
        <div className={props?.stickyClassName ? props?.stickyClassName : ""}>
          <Col className="w-100 p-0 d-flex flex-row justify-content-start align-items-start gap-2 position-relative ticket_info_container_activity_comments">
            {auth?.details && (
              <LogoAvatarShowLetter
                genaralData={auth?.details}
                profileName={"displayName"}
                outerClassName={
                  "d-flex align-items-center align-middle rounded-circle display-icon"
                }
                innerClassName={
                  "d-flex align-items-center justify-content-center text-center rounded-circle color-white user-icon"
                }
                index={"us01"}
              ></LogoAvatarShowLetter>
            )}

            <RichTextEditor
              toolbarId={props.type + (data?.comment_id ? `-${data.comment_id}` : "")}
              className={`${focusedFlag && `focused`}`}
              placeholder="Ask a question or post a update..."
              value={commentsData}
              attachmentValue={commentAttachment}
              handleValueChange={handleValueChange}
              onFocus={handleFocus}
              handleAttachmentUpdate={handleAttachmentUpdate}
              handleDeletedAttachment={handleDeletedAttachment}
              handleMentionedUsers={handleMentionedUsers}
              taggableMembers={props.taggableMembers}
              ticketParticipants={props?.ticketParticipants}
              isVisible={focusedFlag}
              enableMention={true}
            />
            {focusedFlag && (
              <div className="d-flex justify-content-between align-items-end position-absolute h-100 gap-0 m-0 ticket_info_container_activity_comments_actionBtn">
                <CloseHtmlIcon tabIndex={0} onClick={handleCancel} />
                <button
                  className={`submit-btn`}
                  disabled={
                    commentsData?.length == 0 && commentAttachment?.length == 0
                      ? true
                      : false
                  }
                  onClick={handleAddComment}
                >
                  Comment
                </button>
              </div>
            )}
          </Col>
          {focusedFlag && (
            <>
              {(enteredCharacter === null || enteredCharacter?.length === 0) && (
                <p className="error-msg">
                  {t("ticket.form_field.error.maximum_of") +
                    appConstants?.charCountLimit?.comments +
                    t("ticket.form_field.error.characters_is_allowed")}
                </p>
              )}
              {(enteredCharacter !== null || enteredCharacter?.length > 0) && (
                <p className="error-msg">
                  <b>
                    {enteredCharacter > Number(appConstants?.charCountLimit?.comments)
                      ? Number(appConstants?.charCountLimit?.comments)
                      : enteredCharacter}
                    /{appConstants?.charCountLimit?.comments}
                  </b>{" "}
                  {t("ticket.characters_used")}, <b>{balanceCharacter}</b>{" "}
                  {t("ticket.remaining")}
                </p>
              )}
            </>
          )}
        </div>
      )}
      {activityType?.type === 3 && props?.infoTabContent ? (
        <Col className="d-flex flex-column ticket_info_container_activity_contents w-100">
          {props.infoTabContent}
        </Col>
      ) : (
        !getDefault && (
        <Col
          className={`d-flex flex-column ticket_info_container_activity_contents ${
            activityType?.type === 0 ? "allactivity" : "comments"
          }`}
          ref={(node) => {
            inputRef.current = node;
            activityListRef.current = node;
          }}
        >
          {hasActivities &&
            !getDefault &&
            activityItems.map((d, i) => (
              <ActivityContent
                key={`${d?.comment_id}${
                  d?.activity_id !== null && `-${d?.activity_id}`
                } `}
                data={d}
                index={i + "fa"}
                saveComment={handleUpdateComment}
                archiveComment={(e) => handleArchiveComment(e)}
                taggableMembers={props.taggableMembers}
                ticketParticipants={props.ticketParticipants}
                activityType={activityType}
                workspaceId={props?.workspaceId}
                className={activityItems.length - 1 === i ? "editPopUpShow" : null}
                type={props.type}
              />
            ))}
          {!hasActivities &&
            props?.setShowSpinner === false &&
            !props?.isFetchingAPIData && (
              <p className="no-activity-comments">
                There are no {activityType?.type === 0 && "Activity/Comments"}{" "}
                {activityType?.type === 1 && "Comments"}{" "}
                {activityType?.type === 2 && "Activities"} in this{" "}
                {/* <span className="type-name">
                  "{props.type == "parentTicket" ? "Ticket" : "Tool"}"
                </span> */}
                <span className="type-name">{props?.workFlowType}</span>.
              </p>
            )}
          {isInitialActivityLoad && <Spinner style={{ height: "200px" }} />}
          {isLoadingMore && (
            <div className="ticket_info_container_activity_load-more">
              <Spinner style={{ height: "80px" }} />
            </div>
          )}
        </Col>
        )
      )}

      {activityType?.type !== 3 &&
        props?.hasMoreActivityPages &&
        !getDefault &&
        props?.setShowSpinner === false &&
        !isInitialActivityLoad && (
          <div className="ticket_info_container_activity_more">
            <button onClick={handleShowMoreClick} disabled={isLoadingMore} type="button">
              {isLoadingMore ? "Loading..." : "Show more"}
              <span className="icon-chevron-thin-down"></span>
            </button>
          </div>
        )}
    </Row>
  );
};
export default ActivityHistory;

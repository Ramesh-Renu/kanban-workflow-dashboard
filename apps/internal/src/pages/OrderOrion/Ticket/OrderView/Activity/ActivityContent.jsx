import React, { useState, Fragment, useEffect, useRef } from "react";
import useAuth from "../../../../../hooks/useAuth";
import RichTextEditor from "../../../../../components/common/RichTextEditor/Editor";
import {
  getFileTypeClassName,
  isOnlyWhitespaceHtml,
  isCharacterLimitExceeded,
  getLimitedHtmlWithNewlineContent,
} from "../../../../../utils/common";
import { downloadAttachment } from "../../../../../services";
import ShowMoreLessElement from "../../../../../components/common/ShowMoreLessElement";
import { editHorizontalIcon } from "../../../../../assets/images";
import LogoAvatarShowLetter from "../../../../../components/common/LogoAvatarShowLetter";
import { useTranslation } from "react-i18next";
import { CloseHtmlIcon } from "../../../../../components/common/PureCSSIcons/IconsList";
import appConstants from "../../../../../constant/common";
import { Col } from "react-bootstrap";
import PopupModal from "@orion/shared/src/components/PopupModal";
import AttachmentPreview from "../../../../../components/common/AttachmentPreview/AttachmentPreview";
import CommentContentWithInlineImages from "./CommentContentWithInlineImages";
import { downloadInlineImage } from "./commentInlineImageUtils";

export const ActivityContent = ({
  data,
  index,
  saveComment,
  archiveComment,
  taggableMembers,
  ticketParticipants,
  activityType,
  workspaceId,
  className,
  type,
}) => {
  /** VARIABLE DECLARATIONS */
  const [editDeleteComment, setEditDeleteComment] = useState(false);
  const [editCommentData, setEditCommentData] = useState(data.content);
  const [showEditComment, setShowEditComment] = useState(false);
  const [archivePopup, setArchivePopup] = useState(false);
  const [{ data: auth }] = useAuth();
  const [commentAttachment, setCommentAttachment] = useState(
    data?.attached_files?.length > 0 ? data?.attached_files : [],
  );
  const [deletedAttachment, setDeletedAttachment] = useState([]);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const { t } = useTranslation();
  const [enteredCharacter, setEnteredCharacter] = useState(null);
  const [balanceCharacter, setBalanceCharacter] = useState(null);
  const [addStyle, setAddStyle] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  let editCommentStyle = { top: "inherit", bottom: 0 + "px" };
  /** USED TO HIDE COMMENT EDIT/DELETE POPUP WHEN USER CLICKS OUTSIDE THE CONTAINER */
  const popref = useRef();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popref.current && !popref.current.contains(event.target)) {
        // Click occurred outside the header container, so close the editDeleteComment
        setEditDeleteComment(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const result = isCharacterLimitExceeded(
      data.content,
      appConstants.charCountLimit.comments,
    );
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
  }, []);

  useEffect(() => {
    if (data?.attached_files?.length > 0) {
      setCommentAttachment((prevData) => {
        // Map through the attached_files array to create a new array with modified keys
        const updatedFiles = data?.attached_files.map((file) => ({
          attachment_id: file.attachement_id,
          file_type: file.file_type,
          name: file.file_name,
          file_upload_path: file.file_upload_path,
        }));

        // Update the state with the new array
        return updatedFiles;
      });
    }
  }, [data]);

  /** HANDLE COMMENT VALUE CHANGE */
  const handleValueChange = (e) => {
    const result = isCharacterLimitExceeded(e, appConstants.charCountLimit.comments);
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants.charCountLimit.comments,
    );
    setEditCommentData(limitedText);
  };

  /** CANCEL EDIT */
  const handleCancel = () => {
    setEditCommentData(data.content);
    if (data?.attached_files) {
      setCommentAttachment((prevData) => {
        // Map through the attached_files array to create a new array with modified keys
        const updatedFiles = data?.attached_files.map((file) => ({
          attachment_id: file.attachement_id,
          file_type: file.file_type,
          name: file.file_name,
          file_upload_path: file.file_upload_path,
        }));

        // Update the state with the new array
        return updatedFiles;
      });
    } else {
      setCommentAttachment([]);
    }
    setDeletedAttachment([]);
    setMentionedUsers([]);
    setShowEditComment(false);
  };

  /** HANDLE UPDATE COMMENT SUBMISSION */
  const handleSubmit = () => {
    const checkWhiteSpace = isOnlyWhitespaceHtml(editCommentData);

    if (!checkWhiteSpace && editCommentData !== null) {
      saveComment({
        ...data,
        content: editCommentData,
        attachment: commentAttachment,
        deleted_attachments: deletedAttachment,
        mentions: mentionedUsers,
      });
      setShowEditComment(false);
    }
  };

  /** EDIT COMMENT */
  const editComment = () => {
    setShowEditComment(true);
    setCommentAttachment(() => {
      // Map through the attached_files array to create a new array with modified keys
      const updatedFiles = data?.attached_files.map((file) => ({
        attachment_id: file.attachement_id,
        file_type: file.file_type,
        name: file.file_name,
        file_upload_path: file.file_upload_path,
      }));

      // Update the state with the new array
      return updatedFiles;
    });
  };

  /** TO SHOW ARCHIVE CONFITMATION POPUP */
  const archiveConfirmation = () => {
    setArchivePopup(true);
  };

  /** CLOSE ARCHIVE POPUP */
  const closeModal = (close) => {
    setArchivePopup(false);
  };

  /** ARCHIVE SUBMIT & TRIGGER API CALL */
  const handleDeleteComment = () => {
    archiveComment(data);
    setArchivePopup(false);
  };

  const handleAttachmentUpdate = (res) => {
    if (res.length == 0) {
      setCommentAttachment([]);
    } else if (res && res.length > 0) {
      // Set the CommentAttachment state with the updated value
      setCommentAttachment(res);
      // setCommentAttachment((prevData)=> res ? [...prevData, res] : []);
    } else if (res && res?.name) {
      setCommentAttachment((prevData) => [...prevData, res]);
    }
    // res.map((val)=>{
    //     setEditCommentData((prevData) => `${prevData}<a>${val.name}</a>`);
    // })
  };

  const handleDeletedAttachment = (res) => {
    setDeletedAttachment((prevData) => [...prevData, res.attachment_id]);
  };

  const attachmentScopeType = type === "toolOrder" ? "tool" : "ticket";

  const handleDownloadAttachment = (file) => {
    if (file?.previewSrc) {
      downloadInlineImage(file.previewSrc, file.file_name || "image.png");
      return;
    }
    downloadAttachment({
      ...file,
      type: attachmentScopeType,
    });
  };

  const handleViewAttachment = (file) => {
    setPreviewFile(file);
  };

  const handleViewInlineImage = (part) => {
    setPreviewFile({
      file_name: part.fileName || "image.png",
      file_type: "image/png",
      previewSrc: part.src,
    });
  };

  const handleDownloadInlineImage = (part) => {
    downloadInlineImage(part.src, part.fileName || "image.png");
  };

  const handleMentionedUsers = (e) => {
    // const value = e.target.value;
    setMentionedUsers(e);
  };

  const showEditDelete = (value) => {
    if (value !== null) {
      const gettingElement = document.querySelector(`.commentInfo-details.${className}`);
      if (gettingElement) {
        const elementHeight = gettingElement.offsetHeight;
        if (elementHeight < 120) {
          setAddStyle(true);
        } else {
          setAddStyle(false);
        }
      }
    }
    setEditDeleteComment(true);
  };

  if (data.type_id == 1) {
    return (
      <>
        {!showEditComment && (
          <div className={`commentInfo`} id={index}>
            <>
              <div className="commentInfo-d-flex">
                <div className="commentInfo-user">
                  {data?.updated_by && data?.updated_by[0] && (
                    <LogoAvatarShowLetter
                      genaralData={data?.updated_by[0]}
                      profileName={"display_name"}
                      outerClassName={"commentInfo-user-icon"}
                      innerClassName={"user-icon"}
                      index={"us01"}
                    ></LogoAvatarShowLetter>
                  )}
                  <p className="commentInfo-details-user">
                    {data?.updated_by && data?.updated_by[0]?.display_name}{" "}
                    <span>
                      &#160;&#x2022;&#160; {data?.updated_on && data?.updated_on}
                    </span>{" "}
                    {data?.is_edited && <span>&#x2022;&#160; {t("common.edited")}</span>}
                  </p>
                </div>
                <div className={`commentInfo-details ${className ? className : ""}`}>
                  <div className="commentInfo-details-comments-box">
                    <ShowMoreLessElement
                      initialDivHeight={"120"}
                      gettingElements={
                        <>
                          <CommentContentWithInlineImages
                            html={data?.content}
                            onViewImage={handleViewInlineImage}
                            onDownloadImage={handleDownloadInlineImage}
                          />
                          {(auth?.details?.isSuperAdmin ||
                            (data?.updated_by &&
                              data?.updated_by[0]?.reg_id === auth?.details?.regId)) && (
                            <div className="commentInfo-edit" ref={popref}>
                              <button
                                className="commentInfo-btn"
                                title="Edit Comment"
                                onClick={() =>
                                  showEditDelete(className ? className : null)
                                }
                              >
                                <img
                                  src={editHorizontalIcon}
                                  className={"editIcon"}
                                  alt="editPenIcon"
                                />
                              </button>
                              {/* EDIT / DELETE OPTION */}
                              {editDeleteComment && (
                                <div className="editComment">
                                  <div
                                    className="editComment__popup"
                                    style={addStyle ? editCommentStyle : null}
                                  >
                                    {data?.updated_by[0]?.reg_id ===
                                      auth?.details?.regId && (
                                      <button
                                        className="editComment__popup--gotoEdit"
                                        onClick={editComment}
                                      >
                                        {t("common.edit")}
                                      </button>
                                    )}
                                    <button
                                      className="editComment__popup--archive"
                                      onClick={archiveConfirmation}
                                    >
                                      {t("common.delete")}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      }
                      customClass={""}
                      buttonAlign={"right"}
                      noShowMore={false}
                    ></ShowMoreLessElement>
                  </div>
                  {data?.attached_files?.length > 0 && (
                    <div className="commentInfo-details-attachments">
                      {data?.attached_files?.map((d, i) => {
                        return (
                          <div
                            className="commentInfo-details-attachments-info"
                            key={d?.attachement_id || `${d?.file_name}-${i}`}
                          >
                            <div className="commentInfo-details-attachments-info__meta">
                              <span className={getFileTypeClassName(d?.file_type)}></span>
                              <span
                                className="commentInfo-details-attachments-info__name"
                                title={d?.file_name}
                              >
                                {d?.file_name}
                              </span>
                            </div>
                            <div className="commentInfo-details-attachments-info__actions">
                              <button
                                type="button"
                                className="commentInfo-details-attachments-info__action"
                                title="View"
                                aria-label="View"
                                onClick={() => handleViewAttachment(d)}
                              >
                                <span className="icon-open-eye" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="commentInfo-details-attachments-info__action"
                                title="Download"
                                aria-label="Download"
                                onClick={() => handleDownloadAttachment(d)}
                              >
                                <span className="icon-download_file" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          </div>
        )}
        {previewFile && (
          <AttachmentPreview
            show={Boolean(previewFile)}
            file={previewFile}
            attachmentType={attachmentScopeType}
            onClose={() => setPreviewFile(null)}
            onDownload={handleDownloadAttachment}
          />
        )}
        {/* EDIT COMMENT SECTION */}
        {showEditComment && (
          <>
            <Col className="d-flex flex-row justify-content-start align-items-start gap-2 position-relative ticket_info_container_activity_comments editComment-container">
              {data?.updated_by[0] && (
                <LogoAvatarShowLetter
                  genaralData={data?.updated_by[0]}
                  profileName={"display_name"}
                  outerClassName={"commentInfo-user-icon"}
                  innerClassName={"user-icon"}
                  index={"us02"}
                ></LogoAvatarShowLetter>
              )}
              {/* <textarea className='editComment-container_input' placeholder="write a comment..." value={editCommentData} onChange={handleValueChange} ></textarea>             */}
              <RichTextEditor
                toolbarId={data?.comment_id}
                placeholder="write a comment..."
                value={editCommentData}
                attachmentValue={commentAttachment}
                handleValueChange={handleValueChange}
                handleAttachmentUpdate={(e) => handleAttachmentUpdate(e)}
                handleDeletedAttachment={handleDeletedAttachment}
                handleMentionedUsers={handleMentionedUsers}
                taggableMembers={taggableMembers}
                ticketParticipants={ticketParticipants}
                isVisible={showEditComment}
                enableMention={true}
              />
              <div className="d-flex justify-content-between align-items-end position-absolute h-100 gap-0 m-0 ticket_info_container_activity_comments_actionBtn">
                {/* <span
                  className="icon-close"
                  tabIndex={0}
                  onClick={handleCancel}
                ></span> */}
                <CloseHtmlIcon tabIndex={0} onClick={handleCancel} />
                <button
                  className={`submit-btn`}
                  disabled={editCommentData?.length == 0 ? true : false}
                  onClick={handleSubmit}
                >
                  {t("common.update")}
                </button>
              </div>
            </Col>

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
                  {enteredCharacter > appConstants?.charCountLimit?.comments
                    ? appConstants?.charCountLimit?.comments
                    : enteredCharacter}
                  /{appConstants?.charCountLimit?.comments}
                </b>{" "}
                {t("ticket.characters_used")}, <b>{balanceCharacter}</b>{" "}
                {t("ticket.remaining")}
              </p>
            )}
          </>
        )}

        {/* ARCHIVE POPUP CONFIRMATION */}
        {archivePopup && (
          <PopupModal
            show={archivePopup}
            onClose={closeModal}
            className={"popupModal bg-white rounded-4"}
            children={
              <div>
                <h5 className="text-center">
                  {" "}
                  {t("ticket.delete_comment_confirmation")}
                </h5>
                <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
                  <button
                    className="btn btn-0 modalCancel_btn px-3"
                    onClick={closeModal}
                    tabIndex={1}
                    onKeyDown={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-0 modalDelete_btn px-3"
                    onClick={handleDeleteComment}
                    tabIndex={1}
                    onKeyDown={handleDeleteComment}
                  >
                    Delete
                  </button>
                </div>
              </div>
            }
          />
        )}
      </>
    );
  } else {
    return (
      <div className={`${activityType.type === 2 ? "activity" : ""}`}>
        <div className="historyInfo">
          {activityType.type === 2 && (
            <>
              {/* <img src={verticalLine} alt="verticalLine" className="vertical-line" /> */}
              <span className="timeLineCircle">&#160;</span>
            </>
          )}
          {data?.history_type == "assignee" ||
          data?.history_type == "tool_assignee" ||
          data?.history_type == "subtask_assignee" ? (
            <>
              <span className="historyInfo-user">
                {data?.updated_by[0].display_name}{" "}
              </span>
              <span className="historyInfo-data">
                {data?.content}{" "}
                {data?.users[0]?.reg_id !== data?.updated_by[0]?.reg_id && (
                  <>
                    to{" "}
                    <span className="historyInfo-data-assign">
                      {data?.users[0]?.display_name}
                    </span>
                  </>
                )}{" "}
                {data?.remarks && `with remarks "${data?.remarks}"`}{" "}
              </span>
              <span className="historyInfo-data-updatedOn">{data?.updated_on}</span>
            </>
          ) : data?.history_type == "ticket_move" &&
            data?.additional_content?.length > 0 ? (
            <>
              <span className="historyInfo-user">
                {data?.updated_by && data?.updated_by[0]?.display_name}{" "}
              </span>
              <span className="historyInfo-data">
                {data?.content}{" "}
                <span className="historyInfo-data-ticketmovement">
                  {data?.additional_content?.[0][0]}
                </span>{" "}
                <>to</>{" "}
                <span className="historyInfo-data-ticketmovement">
                  {data?.additional_content?.[0][1]}
                </span>{" "}
                {data?.remarks && `with remarks "${data?.remarks}"`}{" "}
              </span>
              <span className="historyInfo-data-updatedOn">{data?.updated_on}</span>
            </>
          ) : data?.history_type == "auto_assignee" ? (
            <>
              <span className="historyInfo-data">
                {data?.content}{" "}
                <span className="historyInfo-data-assign">
                  {data?.users[0]?.display_name}
                </span>
              </span>
              <span className="historyInfo-data-updatedOn">{data?.updated_on}</span>
            </>
          ) : (
            <>
              <span className="historyInfo-user">
                {data?.updated_by && data?.updated_by[0]?.display_name}{" "}
              </span>
              <span className="historyInfo-data">
                {data?.content} {data?.remarks && `with remarks "${data?.remarks}"`}{" "}
              </span>
              <span className="historyInfo-data-updatedOn">{data?.updated_on}</span>
            </>
          )}
        </div>
      </div>
    );
  }
};

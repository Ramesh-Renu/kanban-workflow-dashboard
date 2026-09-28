import React, { useEffect, useRef, useState } from "react";
import "react-quill/dist/quill.snow.css";
import QuillToolbar from "./EditorToolbar";
// import { useDispatch } from "react-redux";
import appConstants from "../../../constant/common";
import { showToast } from "store/slice/toast";
import { useTranslation } from "react-i18next";

const FileUploadWithoutEditor = ({
  toolbarId,
  handleValueChange,
  handleAttachmentUpdate,
  handleDeletedAttachment,
  ...props
}) => {
  const inputRef = useRef(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  // const dispatch = useDispatch();
  const { t } = useTranslation();
  const handleFileUpload = () => {
    inputRef.current.value = null; // Clear the file input
    inputRef.current.click();
  };

  const handleSelectFiles = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((data, key) => {
        const fileSizeInMB = data.size / (1024 * 1024); // Convert bytes to megabytes
        if (fileSizeInMB <= appConstants.maxFileSize) {
          // File size is less than or equal to 250MB, proceed with the upload
          handleAttachmentUpdate(data);
        } else {
          // dispatch(
            showToast({
              message:
                "File size exceeds the limit (250MB). Please choose a smaller file.",
              variant: "danger",
            })
          // );
        }
      });
    }
  };

  useEffect(() => {
    setAttachedFiles(props?.attachmentValue);
  }, [props?.attachmentValue]);

  // Function to handle attachment deletion
  const handleDeleteAttachment = (attachment) => {
    // setAttachedFiles(prevAttachments => prevAttachments.filter(file => file.name !== attachment.name));
    const updatedAttachedFiles = attachedFiles?.filter((file) => {
      if (attachment?.name) {
        return file.name !== attachment?.name;
      } else {
        return true;
      }
    });
    setAttachedFiles(
      updatedAttachedFiles?.length > 0 ? updatedAttachedFiles : []
    );
    handleAttachmentUpdate(
      updatedAttachedFiles?.length > 0 ? updatedAttachedFiles : []
    );
    handleDeletedAttachment(attachment);
  };

  return (
    <div
      className={`${
        attachedFiles?.length > 0 ? `attachmentOnly` : `attachmentOnly`
      } ${props.customClass}`}
    >
      <h4 className="heading">
        {props.headingText ? props.headingText : t("ticket.form_field.label.attachments")}
        <QuillToolbar
          toolbarId={toolbarId}
          headTitle={props.headTitle}
          handleFileUpload={handleFileUpload}
          isVisible={true}
          isCustomIcon={props?.isCustomIcon}
          customIconFile={props?.customIconFile}
        />
      </h4>
      <input
        hidden
        ref={inputRef}
        type="file"
        multiple={true}
        onChange={handleSelectFiles}
      />
      {attachedFiles && (
        <div className={`comment-attachment ${props.customClass}`}>
          {attachedFiles?.length > 0 &&
            attachedFiles.map((attachment, index) => (
              <span key={index} className="comment-attachment-data">
                <span className="name">{attachment?.name}</span>
                <span
                  className="icon-failure-cross"
                  onClick={() => handleDeleteAttachment(attachment)}
                >
                  <span className="path1"></span>
                  <span className="path2"></span>
                </span>
              </span>
            ))}
          {attachedFiles?.length === 0 && (
            <div className="file-info">{t("ticket.no_attachments")}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploadWithoutEditor;

import React, { useRef } from "react";
import { Form } from "react-bootstrap";
import { t } from "i18next";
import { useToast } from "@orion/shared";
import { trashFull, UploadDark } from "../../../../../assets/images";
import { isValidFileSelection } from "../../../../../utils/common";
import appConstants from "../../../../../constant/common";

const getAttachmentListKey = (file, index) => {
  const id = file.id ?? file.attachmentId ?? file.attachment_id;
  if (id != null && String(id).trim() !== "") return String(id);
  const name = file.fileName ?? file.name ?? file.file_name ?? "file";
  return `${name}-${index}`;
};

/**
 * Stages files for branding-guidelines save (no immediate upload API).
 */
const BrandingDeferredUpload = ({
  heading,
  label,
  existingAttachments = [],
  pendingFiles = [],
  onStageFiles,
  onRemovePending,
  onMarkExistingDeleted,
  isAccessUpload = true,
  isAccessDelete = true,
  compact = false,
  loading = false,
  accept,
  single = false,
  className = "",
}) => {
  const fieldLabel =
    label ??
    heading ??
    t("order_view.attachment", "Attachment");
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const result = isValidFileSelection(
      selected,
      appConstants?.restrictedFileTypes,
      500
    );
    if (!result.isValid) {
      showToast({ message: result.reason, variant: "danger", showTime: 5000 });
    } else if (result.data?.length) {
      onStageFiles?.(result.data);
    }
    e.target.value = "";
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className={`branding-attachment-upload${compact ? " branding-attachment-upload--compact" : " mt-3"}${className ? ` ${className}` : ""}`}>
      {loading && (
        <p className="branding-attachment-upload__loading text-muted fs-14 mb-2">
          {t("order_view.branding_attachments_loading", "Loading attachments...")}
        </p>
      )}

      {isAccessUpload && (
        <Form.Group className="mb-0">
          <Form.Label className={`branding-attachment-upload__label${compact ? " fs-14" : ""}`}>
            {fieldLabel}
          </Form.Label>
          <div
            className="branding-attachment-upload__zone"
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilePicker();
              }
            }}
          >
            <span className="branding-attachment-upload__text">
              {t("order_view.branding_upload_here", "Upload Here")}
            </span>
            <img
              src={UploadDark}
              alt=""
              width={20}
              height={20}
              className="branding-attachment-upload__icon"
              aria-hidden
            />
            <span className="visually-hidden">
              {t(
                "order_view.branding_deferred_upload_hint",
                "Files upload when you save the ticket"
              )}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple={!single}
              accept={accept}
              className="d-none"
              onChange={handleFileChange}
            />
          </div>
        </Form.Group>
      )}

      {/* {existingAttachments.length > 0 && (
        <ul className="branding-attachment-upload__file-list list-unstyled mb-0 mt-2">
          {existingAttachments.map((file, index) => (
            <li
              key={getAttachmentListKey(file, index)}
              className="branding-attachment-upload__file-item"
            >
              <span className="text-truncate">
                {file.fileName || file.name || file.file_name}
              </span>
              {isAccessDelete && (
                <button
                  type="button"
                  className="btn btn-link p-0 flex-shrink-0"
                  aria-label={t("order_view.branding_remove_file", "Remove file")}
                  onClick={() =>
                    onMarkExistingDeleted?.(file.id ?? file.attachmentId ?? file.attachment_id)
                  }
                >
                  <img src={trashFull} alt="" width={18} height={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingFiles.length > 0 && (
        <ul className="branding-attachment-upload__file-list list-unstyled mb-0 mt-2">
          {pendingFiles.map((file, index) => (
            <li
              key={getAttachmentListKey(file, index)}
              className="branding-attachment-upload__file-item"
            >
              <span className="text-truncate">{file.name}</span>
              <button
                type="button"
                className="btn btn-link p-0 flex-shrink-0"
                aria-label={t("order_view.branding_remove_file", "Remove file")}
                onClick={() => onRemovePending?.(index)}
              >
                <img src={trashFull} alt="" width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )} */}
      {([...existingAttachments, ...pendingFiles].length > 0) && (
  <ul className="branding-attachment-upload__file-list list-unstyled mb-0 mt-2">
    {[
      ...existingAttachments.map((file) => ({ 
        id: file.id ?? file.attachmentId ?? file.attachment_id,
        displayName: file.fileName || file.name || file.file_name, 
        isExisting: true 
      })),
      ...pendingFiles.map((file, idx) => ({ 
        displayName: file.name, 
        isPending: true, 
        pendingIndex: idx 
      }))
    ].map((file, index) => {
      const isDeleteAllowed = file.isPending || (file.isExisting && isAccessDelete);
      
      return (
        <li
          key={getAttachmentListKey(file, index)}
          className="branding-attachment-upload__file-item"
        >
          <span className="text-truncate">
            {file.displayName}
          </span>
          {isDeleteAllowed && (
            <button
              type="button"
              className="btn btn-link p-0 flex-shrink-0"
              aria-label={t("order_view.branding_remove_file", "Remove file")}
              onClick={() =>
                file.isExisting
                  ? onMarkExistingDeleted?.(file.id)
                  : onRemovePending?.(file.pendingIndex)
              }
            >
              <img src={trashFull} alt="" width={18} height={18} />
            </button>
          )}
        </li>
      );
    })}
  </ul>
)}
    </div>
  );
};

export default BrandingDeferredUpload;

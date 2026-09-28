import { t } from "i18next";
import React, { useRef } from "react";
import { Button, Col, Form } from "react-bootstrap";
import { useToast } from "@orion/shared";
import { trashFull, UploadDark } from "../../../../../assets/images";
import { isValidFileSelection } from "../../../../../utils/common";
import appConstants from "../../../../../constant/common";

const BrandingExportIconsSection = ({
  entries = [],
  getExistingAttachmentForEntry,
  onIconNameChange,
  onStageFile,
  onRemovePending,
  onMarkExistingDeleted,
  onAddEntry,
  onRemoveEntry,
  fieldErrors = {},
  attachmentsLoading = false,
  disabled = false,
}) => {
  const fileInputRef = useRef(null);
  const uploadTargetEntryIdRef = useRef(null);
  const { showToast } = useToast();

  const openFilePicker = (entryId) => {
    uploadTargetEntryIdRef.current = entryId;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const entryId = uploadTargetEntryIdRef.current;
    e.target.value = "";
    if (!selected.length || !entryId) return;

    const result = isValidFileSelection(
      [selected[0]],
      appConstants?.restrictedFileTypes,
      50
    );
    if (!result.isValid) {
      showToast({ message: result.reason, variant: "danger", showTime: 5000 });
      return;
    }
    if (result.data?.[0]) {
      onStageFile?.(entryId, result.data[0]);
    }
  };

  const getFileLabel = (entry, existing) => {
    if (entry.pendingFile?.name) return entry.pendingFile.name;
    const file = existing?.[0];
    if (!file) return null;
    return file.fileName || file.name || file.file_name || null;
  };

  const handleRemoveFile = (entry, existing) => {
    if (entry.pendingFile) {
      onRemovePending?.(entry.id);
      return;
    }
    const file = existing?.[0];
    if (file) {
      onMarkExistingDeleted?.(file.id ?? file.attachmentId ?? file.attachment_id);
    }
  };

  return (
    <Col xs={12} className="branding-export-icons-section p-0">
      {attachmentsLoading && (
        <p className="text-muted fs-14 mb-2">
          {t("order_view.branding_attachments_loading", "Loading attachments...")}
        </p>
      )}

      <div className="d-flex flex-column gap-2">
        {entries.map((entry) => {
          const existing = getExistingAttachmentForEntry(entry);
          const fileLabel = getFileLabel(entry, existing);
          const hasFile = Boolean(fileLabel);
          const nameError = Boolean(fieldErrors[`exportIcons.${entry.id}.iconName`]);
          const attachmentError = Boolean(fieldErrors[`exportIcons.${entry.id}.attachment`]);

          return (
            <div key={entry.id} className="branding-export-icon-entry-card branding-export-icon-entry-card--edit">
              {onRemoveEntry && entries.length > 1 && (
                <div className="branding-export-icon-entry-card__actions">
                  <button
                    type="button"
                    className="btn btn-link text-danger px-0 fs-12 py-0"
                    disabled={disabled}
                    onClick={() => onRemoveEntry(entry.id)}
                  >
                    {t("order_view.branding_remove_icon_entry", "Remove")}
                  </button>
                </div>
              )}

              <div className="branding-export-icon-entry-card__grid">
                <div className="branding-export-icon-entry-card__field">
                  <Form.Label className="branding-export-icon-entry-card__label mb-1">
                    {t("order_view.branding_field_icon_name", "Icon Name")}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    className="fs-14 branding-input-fixed-height"
                    value={entry.iconName ?? ""}
                    maxLength={50}
                    disabled={disabled}
                    autoComplete="off"
                    isInvalid={nameError}
                    placeholder={t(
                      "order_view.branding_field_icon_name_placeholder",
                      "Enter icon name (e.g. PDF Icon)"
                    )}
                    onChange={(e) => onIconNameChange?.(entry.id, e.target.value)}
                  />
                  {nameError && (
                    <div className="text-danger fs-12 mt-1">
                      {t(
                        "order_view.branding_export_icon_name_required",
                        "Icon name is required when an attachment is present."
                      )}
                    </div>
                  )}
                </div>

                <div className="branding-export-icon-entry-card__field">
                  <Form.Label className="branding-export-icon-entry-card__label mb-1">
                    {t("order_view.attachment", "Attachment")}
                  </Form.Label>
                  <div className="branding-export-icon-entry-card__attachment-row">
                    {hasFile ? (
                      <div className="branding-export-icon-entry-card__file d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                        <span className="fs-14 text-truncate">{fileLabel}</span>
                        {!disabled && (
                          <button
                            type="button"
                            className="btn btn-link p-0 flex-shrink-0"
                            aria-label={t("order_view.branding_remove_file", "Remove file")}
                            onClick={() => handleRemoveFile(entry, existing)}
                          >
                            <img src={trashFull} alt="" width={18} height={18} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`branding-export-icon-entry-card__file branding-export-icon-entry-card__file--empty flex-grow-1${
                          attachmentError ? " border border-danger rounded px-2" : ""
                        }`}
                      >
                        —
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      className="branding-export-icon-upload-btn flex-shrink-0 d-flex align-items-center justify-content-center"
                      disabled={disabled}
                      aria-label={t("order_view.branding_upload", "Upload")}
                      onClick={() => openFilePicker(entry.id)}
                    >
                      <img
                        src={UploadDark}
                        alt=""
                        width={20}
                        height={20}
                        className="branding-export-icon-upload-btn__icon"
                      />
                    </Button>
                  </div>
                  {attachmentError && (
                    <div className="text-danger fs-12 mt-1">
                      {t(
                        "order_view.branding_export_icon_attachment_required",
                        "An attachment is required when an icon name is present."
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="d-none"
        onChange={handleFileChange}
      />

      <button
        type="button"
        className="add-field mt-2 btn btn-0 border-0 text-start"
        disabled={disabled}
        onClick={() => onAddEntry?.()}
      >
        + {t("order_view.branding_add_additional_icon", "Add additional icon")}
      </button>
    </Col>
  );
};

export default BrandingExportIconsSection;

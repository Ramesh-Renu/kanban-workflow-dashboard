import React, { useRef } from "react";
import { t } from "i18next";
import { useToast } from "@orion/shared";
import { downloadedAttachmentFile } from "services";
import { getFileTypeClassName } from "../../../../../utils/common";

/**
 * Single downloadable attachment row (icon + file name) for branding ticket view.
 */
const BrandingGuidelinesAttachmentFile = ({ file, className = "" }) => {
  const { showToast } = useToast();
  const isDownloadingRef = useRef(false);

  if (!file) return null;

  const downloadAttachment = async () => {
    if (isDownloadingRef.current) return;
    const attachmentId = file.attachment_id ?? file.attachmentId ?? file.id;
    if (attachmentId == null) return;

    isDownloadingRef.current = true;
    try {
      const res = await downloadedAttachmentFile({
        id: attachmentId,
        sectionId: file.section_id,
        ...file,
      });
      if (res?.status) {
        showToast({
          message: res.message || t("order_view.download_success", "Download started"),
          variant: "success",
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || t("order_view.download_failed", "Download failed"),
        variant: "danger",
      });
    } finally {
      isDownloadingRef.current = false;
    }
  };

  return (
    <div
      className={`d-flex flex-row align-items-center gap-2 min-w-0 branding-guidelines-attachment-file ${className}`}
    >
      <span className={getFileTypeClassName(file?.file_type)} aria-hidden="true" />
      <p
        className={`m-0 p-0 text-decoration-underline text-truncate branding-guidelines-attachment-file__name${
          isDownloadingRef?.current ? " isDownLoading" : ""
        }`}
        onClick={downloadAttachment}
        title={file?.file_name}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            downloadAttachment();
          }
        }}
      >
        {file?.file_name}
      </p>
    </div>
  );
};

export default BrandingGuidelinesAttachmentFile;

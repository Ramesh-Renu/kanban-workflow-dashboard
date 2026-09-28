import React from "react";
import { t } from "i18next";
import { Row } from "react-bootstrap";
import BrandingGuidelinesAttachmentFile from "./BrandingGuidelinesAttachmentFile";

/**
 * Read-only attachment list with download — matches AttachmentUpload ticket view styling.
 */
const BrandingGuidelinesAttachmentList = ({
  files = [],
  heading,
  className = "",
  showHeading = true,
}) => {
  if (!files?.length) return null;

  return (
    <div className={`attachment-container branding-guidelines-attachments p-0 ${className}`}>
      {showHeading ? (
        <h2 className="attachmentHeading size-s py-2 mb-1">
          {heading ?? t("order_view.attachment", "Attachment")}
        </h2>
      ) : null}
      <div className="px-0 pb-2">
        <Row className="mt-3 px-2 pb-2">
          {files.map((file, index) => (
            <BrandingGuidelinesAttachmentFile
              key={`${file.attachment_id ?? file.id ?? file.file_name ?? "attachment"}-${index}`}
              file={file}
              className="gap-4"
            />
          ))}
        </Row>
      </div>
    </div>
  );
};

export default BrandingGuidelinesAttachmentList;

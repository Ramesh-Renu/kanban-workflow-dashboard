import React from "react";
import { t } from "i18next";

const getFileExtension = (fileName = "") => {
  const parts = String(fileName).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

/**
 * Read-only attachment list for the public branding portal (file names from API metadata).
 */
const BrandingPublicAttachmentList = ({ files = [], className = "" }) => {
  if (!files.length) return null;

  return (
    <div className={`branding-public-attachments ${className}`.trim()}>
      <p className="branding-public-attachments__label fw-semibold fs-14 mb-2">
        {t("order_view.branding_preview_attachments", "Attachments")}
      </p>
      <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
        {files.map((file, index) => {
          const fileName = String(
            file?.file_name ?? file?.fileName ?? file?.name ?? ""
          ).trim();
          if (!fileName) return null;
          const extension = getFileExtension(fileName);

          return (
            <li
              key={file?.id ?? file?.attachmentId ?? `${fileName}-${index}`}
              className="branding-public-attachments__item d-flex align-items-center gap-2 rounded px-3 py-2"
            >
              <span
                className={`branding-public-attachments__icon branding-public-attachments__icon--${extension || "file"}`}
                aria-hidden
              />
              <span className="text-break fs-14">{fileName}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BrandingPublicAttachmentList;

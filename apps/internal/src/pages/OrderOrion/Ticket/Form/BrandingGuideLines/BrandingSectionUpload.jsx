import { t } from "i18next";
import React from "react";
import BrandingDeferredUpload from "./BrandingDeferredUpload";
import { BRANDING_SECTIONS_WITH_ATTACHMENTS } from "@orion/shared/src/utils/brandingGuidelinesConfig";

const BrandingSectionUpload = ({
  activeSectionId,
  existingAttachments = [],
  pendingFiles = [],
  onStageFiles,
  onRemovePending,
  onMarkExistingDeleted,
  compact = false,
  loading = false,
}) => {
  if (!BRANDING_SECTIONS_WITH_ATTACHMENTS.includes(activeSectionId)) return null;

  return (
    <BrandingDeferredUpload
      label={t("order_view.attachment", "Attachment")}
      existingAttachments={existingAttachments}
      pendingFiles={pendingFiles}
      onStageFiles={onStageFiles}
      onRemovePending={onRemovePending}
      onMarkExistingDeleted={onMarkExistingDeleted}
      compact={compact}
      loading={loading}
    />
  );
};

export default BrandingSectionUpload;

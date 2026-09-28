import React from "react";
import { t } from "i18next";
import { brandingSectionUsesInlineAttachments } from "@orion/shared/src/utils/brandingGuidelinesConfig";
import BrandingPreviewPanel from "@orion/shared/src/components/BrandingPreviewPanel";
import BrandingPublicAttachmentList from "./BrandingPublicAttachmentList";

const BrandingPublicSectionEmpty = ({ sectionTitle }) => (
  <div className="branding-public-section-empty text-center py-5" role="status">
    <p className="fw-semibold mb-2">
      {t("order_view.branding_section_empty_title", "Nothing to display")}
    </p>
    <p className="text-muted mb-0 mx-auto branding-public-section-empty__description">
      {sectionTitle
        ? t("order_view.branding_section_empty_description_named", {
            section: sectionTitle,
            defaultValue:
              "No field values, notes, or attachments were saved for {{section}} on this order.",
          })
        : t(
            "order_view.branding_section_empty_description",
            "No field values, notes, or attachments were saved for this section on this order."
          )}
    </p>
  </div>
);

/**
 * Renders the active branding section for the public preview portal.
 */
const BrandingPublicSectionContent = ({
  activeSectionId,
  activeSectionTitle,
  activePreview,
  previewSections,
  sectionAttachments = [],
}) => {
  const hasPreviewFields = Boolean(
    activePreview?.groups?.some((group) => (group.items?.length ?? 0) > 0)
  );

  const inlineAttachments = brandingSectionUsesInlineAttachments(activeSectionId);
  const hasFooterAttachments = !inlineAttachments && sectionAttachments.length > 0;
  const showSectionEmpty = !hasPreviewFields && !hasFooterAttachments;

  if (showSectionEmpty) {
    return <BrandingPublicSectionEmpty sectionTitle={activeSectionTitle} />;
  }

  return (
    <>
      {hasPreviewFields ? (
        <BrandingPreviewPanel
          previewSections={previewSections.filter((section) => section.sectionId === activeSectionId)}
          standalone
        />
      ) : null}

      {hasFooterAttachments ? (
        <BrandingPublicAttachmentList files={sectionAttachments} className="mt-3" />
      ) : null}
    </>
  );
};

export default BrandingPublicSectionContent;

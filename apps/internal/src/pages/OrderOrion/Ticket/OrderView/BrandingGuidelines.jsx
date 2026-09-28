import React, { useCallback, useEffect, useState } from "react";
import { t } from "i18next";
import DOMPurify from "dompurify";
import { useGlobalMaster, useToast } from "@orion/shared";
import { getUploadAttachmentFile } from "services";
import { useGlobalContext } from "store/context/GlobalProvider";
import BrandingGuidelinesReadOnlyView from "./BrandingGuideLines/BrandingGuidelinesReadOnlyView";
import { brandingUsesV2Editor } from "@orion/shared/src/utils/brandingGuidelinesConfig";
import BrandingGuidelinesLegacyView from "./BrandingGuideLines/BrandingGuidelinesLegacyView";
import BrandingGuidelinesAttachmentList from "./BrandingGuideLines/BrandingGuidelinesAttachmentList";
import { useBrandingGuidelinesView } from "./BrandingGuideLines/useBrandingGuidelinesView";

const BrandingGuidelines = ({ companyData }) => {
  const { showToast } = useToast();
  const { fontFamilyList, languageList } = useGlobalMaster();
  const { dispatch } = useGlobalContext();

  const [legacyAttachments, setLegacyAttachments] = useState([]);

  const rawBranding = companyData?.branding || {};
  const usesV2 = brandingUsesV2Editor(rawBranding);
  const orderId = companyData?.orderId;

  const view = useBrandingGuidelinesView({ companyData, languageList, fontFamilyList });

  useEffect(() => {
    if (usesV2 || !orderId) return;

    let cancelled = false;
    getUploadAttachmentFile({
      module: "branding_guidelines",
      referenceId: orderId,
    })
      .then((response) => {
        if (cancelled || !response?.status) return;
        const files = Array.isArray(response.data) ? response.data : [];
        setLegacyAttachments(files);
        dispatch({ type: "SET_BRANDING_GUIDELINES_DATA", payload: files });
        dispatch({ type: "SET_BRANDING_ATTACHMENT_ORDERID", payload: orderId });
      })
      .catch((error) => {
        if (!cancelled) {
          showToast({
            message: error?.message || "Failed to fetch attachments.",
            variant: "danger",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [usesV2, orderId, dispatch, showToast]);

  const renderAttachments = useCallback(
    (files) => <BrandingGuidelinesAttachmentList files={files} className="mt-3" />,
    []
  );

  if (usesV2) {
    if (!view.viewSectionIds.length) {
      return (
        <div className="brandingGuideLines brandingGuideLines--v2 px-0 pb-3">
          <div className="branding-guidelines-view branding-guidelines-view--empty text-center py-5">
            <p className="text-muted fs-14 mb-0">
              {t(
                "order_view.branding_view_empty",
                "No branding guidelines have been saved for this order yet."
              )}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="brandingGuideLines brandingGuideLines--v2 px-0 pb-3">
        <BrandingGuidelinesReadOnlyView
          view={view}
          designLink={rawBranding?.designLink || ""}
          ticketLegacyNotesHtml={
            rawBranding?.notes
              ? DOMPurify.sanitize(rawBranding.notes, {
                  ALLOWED_ATTR: ["href", "target", "src"],
                })
              : null
          }
          renderAttachments={renderAttachments}
        />
      </div>
    );
  }

  return (
    <div className="brandingGuideLines brandingGuideLines--legacy px-2 pb-3">
      <BrandingGuidelinesLegacyView
        companyData={companyData}
        fontFamilyList={fontFamilyList}
      />
      {legacyAttachments.length > 0 && (
        <BrandingGuidelinesAttachmentList files={legacyAttachments} className="mt-3 px-2" />
      )}
    </div>
  );
};

export default BrandingGuidelines;

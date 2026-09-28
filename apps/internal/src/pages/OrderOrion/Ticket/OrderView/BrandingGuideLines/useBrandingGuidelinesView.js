import { useEffect, useMemo, useState } from "react";
import { t } from "i18next";
import {
  buildBrandingPayload,
  buildBrandingPreviewSections,
  brandingUsesV2Editor,
  getBrandingReadOnlySectionIds,
  applyOrderLanguagesToBrandingSections,
  customerBrandingHasSectionData,
  resolveCustomerBranding,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import { useBrandingViewAttachments } from "./useBrandingViewAttachments";

const lastActiveSectionByOrderId = new Map();

/**
 * Composes branding payload, section attachments, and preview data for ticket view.
 */
export function useBrandingGuidelinesView({ companyData, languageList, fontFamilyList }) {
  const orderId = companyData?.orderId;
  const rawBranding = companyData?.branding || {};
  const usesV2 = brandingUsesV2Editor(rawBranding);

  const [activeSectionId, setActiveSectionId] = useState(null);

  const brandingBuildOptions = useMemo(
    () => ({
      languageList: languageList?.data || [],
      fontFamilyList: fontFamilyList?.data || [],
    }),
    [languageList?.data, fontFamilyList?.data]
  );

  const brandingInfo = useMemo(() => {
    const payload = buildBrandingPayload(rawBranding, brandingBuildOptions);
    // Do not invent Typography from Order Details when no branding guidelines are saved.
    // Order-language fallback applies only when customerBranding has real section data.
    const hasSavedBranding = customerBrandingHasSectionData(
      resolveCustomerBranding(rawBranding)
    );
    return {
      ...payload,
      sections: hasSavedBranding
        ? applyOrderLanguagesToBrandingSections(
            payload.sections || {},
            companyData?.orderInfo,
            brandingBuildOptions.languageList
          )
        : payload.sections || {},
    };
  }, [rawBranding, brandingBuildOptions, companyData?.orderInfo]);

  const attachmentsRefetchKey = useMemo(
    () => JSON.stringify(rawBranding?.sections ?? {}),
    [rawBranding]
  );

  const { sectionAttachmentsBySection, attachmentsLoading } = useBrandingViewAttachments({
    orderId,
    activeSectionId,
    sections: brandingInfo?.sections || {},
    enabled: usesV2,
    refetchKey: attachmentsRefetchKey,
  });

  const previewSections = useMemo(
    () =>
      buildBrandingPreviewSections({
        brandingInfo,
        languageListData: languageList?.data || [],
        fontFamilyListData: fontFamilyList?.data || [],
        sectionAttachmentsBySection,
        pendingAttachments: {},
        deletedAttachmentIds: [],
        translate: (key, fallback) => t(`order_view.${key}`, fallback),
        includeAttachments: false,
        includeSectionNotes: true,
        meaningfulFieldsOnly: true,
        includeSectionWhenHasAttachments: false,
      }),
    [brandingInfo, languageList?.data, fontFamilyList?.data, sectionAttachmentsBySection]
  );

  const viewSectionIds = useMemo(
    () => getBrandingReadOnlySectionIds(brandingInfo, previewSections, sectionAttachmentsBySection),
    [brandingInfo, previewSections, sectionAttachmentsBySection]
  );

  const viewSectionIdsKey = viewSectionIds.join("|");

  useEffect(() => {
    if (!usesV2 || !viewSectionIds.length) {
      setActiveSectionId(null);
      return;
    }
    setActiveSectionId((current) => {
      if (current && viewSectionIds.includes(current)) return current;
      const rememberedSection = orderId ? lastActiveSectionByOrderId.get(orderId) : null;
      if (rememberedSection && viewSectionIds.includes(rememberedSection)) {
        return rememberedSection;
      }
      return viewSectionIds[0];
    });
  }, [usesV2, orderId, viewSectionIdsKey]);

  const selectSection = (nextSectionId) => {
    setActiveSectionId(nextSectionId);
    if (orderId && nextSectionId) {
      lastActiveSectionByOrderId.set(orderId, nextSectionId);
    }
  };

  const activePreview = useMemo(
    () => previewSections.find((section) => section.sectionId === activeSectionId) ?? null,
    [previewSections, activeSectionId]
  );

  return {
    usesV2,
    orderId,
    rawBranding,
    brandingInfo,
    activeSectionId,
    selectSection,
    activePreview,
    viewSectionIds,
    sectionAttachmentsBySection,
    attachmentsLoading,
  };
}

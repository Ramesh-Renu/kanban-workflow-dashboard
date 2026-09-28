import { useEffect, useMemo, useState } from "react";
import { t } from "i18next";
import {
  BRANDING_NOTES_SECTION_ID,
  BRANDING_SECTION_IDS,
  applyOrderLanguagesToBrandingSections,
  buildBrandingPayload,
  buildBrandingPreviewSections,
  customerBrandingHasSectionData,
  getBrandingReadOnlySectionIds,
  resolveCustomerBranding,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";

const buildInlineSectionAttachmentsMap = (sections = {}) => {
  const out = {};
  BRANDING_SECTION_IDS.forEach((sectionId) => {
    const files = sections[sectionId]?.attachments;
    if (Array.isArray(files) && files.length > 0) {
      out[sectionId] = files;
    }
  });
  return out;
};

const extractBrandingBuildOptions = (payload) => {
  const data = payload ?? {};
  const normalizeArray = (value) => (Array.isArray(value) ? value : []);
  const firstNonEmptyArray = (...values) =>
    values.find((value) => Array.isArray(value) && value.length > 0) || [];

  const languageList = firstNonEmptyArray(
    normalizeArray(data.languageList),
    normalizeArray(data.languages),
    normalizeArray(data.customerLanguageList)
  );
  const fontFamilyList = firstNonEmptyArray(
    normalizeArray(data.fontFamilyList),
    normalizeArray(data.fontList),
    normalizeArray(data.fontFamilies)
  );

  return {
    languageList,
    fontFamilyList,
  };
};

const extractBrandingMetadata = (payload) => {
  const data = payload ?? {};
  return {
    orderId: String(data.orderId ?? data.order_id ?? data.ticketId ?? "").trim(),
    companyName: String(
      data.companyName ?? data.company_name ?? data.customerName ?? ""
    ).trim(),
    designLink: String(data.designLink ?? data.design_link ?? "").trim(),
  };
};

/**
 * Composes branding payload, preview sections, and nav ids for the public portal.
 */
export function useBrandingPublicView(rawApiData) {
  const brandingBuildOptions = useMemo(
    () => extractBrandingBuildOptions(rawApiData),
    [rawApiData]
  );

  const metadata = useMemo(() => extractBrandingMetadata(rawApiData), [rawApiData]);

  const brandingInfo = useMemo(() => {
    if (!rawApiData) return null;
    const payload = buildBrandingPayload(rawApiData, brandingBuildOptions);
    // Skip Order Details language seeding when no branding guidelines are saved.
    const hasSavedBranding = customerBrandingHasSectionData(
      resolveCustomerBranding(rawApiData)
    );
    return {
      ...payload,
      sections: hasSavedBranding
        ? applyOrderLanguagesToBrandingSections(
            payload.sections || {},
            rawApiData.orderInfo,
            brandingBuildOptions.languageList
          )
        : payload.sections || {},
    };
  }, [rawApiData, brandingBuildOptions]);

  const sectionAttachmentsBySection = useMemo(
    () => buildInlineSectionAttachmentsMap(brandingInfo?.sections || {}),
    [brandingInfo?.sections]
  );

  const previewSections = useMemo(() => {
    if (!brandingInfo) return [];
    return buildBrandingPreviewSections({
      brandingInfo,
      languageListData: brandingBuildOptions.languageList,
      fontFamilyListData: brandingBuildOptions.fontFamilyList,
      sectionAttachmentsBySection,
      pendingAttachments: {},
      deletedAttachmentIds: [],
      translate: (key, fallback) => t(`order_view.${key}`, fallback),
      includeAttachments: true,
      includeSectionNotes: false,
      meaningfulFieldsOnly: true,
      includeSectionWhenHasAttachments: true,
    });
  }, [brandingInfo, brandingBuildOptions, sectionAttachmentsBySection]);

  const viewSectionIds = useMemo(() => {
    if (!brandingInfo) return [];
    return getBrandingReadOnlySectionIds(
      brandingInfo,
      previewSections,
      sectionAttachmentsBySection
    ).filter((sectionId) => sectionId !== BRANDING_NOTES_SECTION_ID);
  }, [brandingInfo, previewSections, sectionAttachmentsBySection]);

  const viewSectionIdsKey = viewSectionIds.join("|");
  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    if (!viewSectionIds.length) {
      setActiveSectionId(null);
      return;
    }
    setActiveSectionId((current) => {
      if (current && viewSectionIds.includes(current)) return current;
      return viewSectionIds[0];
    });
  }, [viewSectionIdsKey]);

  const activePreview = useMemo(
    () => previewSections.find((section) => section.sectionId === activeSectionId) ?? null,
    [previewSections, activeSectionId]
  );

  return {
    brandingInfo,
    brandingBuildOptions,
    metadata,
    previewSections,
    viewSectionIds,
    activeSectionId,
    setActiveSectionId,
    activePreview,
    sectionAttachmentsBySection,
  };
}

export { extractBrandingBuildOptions, extractBrandingMetadata };

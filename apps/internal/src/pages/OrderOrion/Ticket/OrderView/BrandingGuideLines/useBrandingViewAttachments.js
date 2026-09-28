import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@orion/shared";
import { getUploadAttachmentFile } from "services";
import {
  getBrandingSectionApiId,
  resolveAttachmentsForBrandingSection,
  shouldFetchBrandingSectionAttachments,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";

const attachmentFetchKey = (orderId, sectionId) => `${orderId}:${sectionId}`;

/**
 * Loads branding attachments for the active read-only view section.
 * Refetches when the active section, order, or branding sections metadata changes.
 */
export function useBrandingViewAttachments({
  orderId,
  activeSectionId,
  sections = {},
  enabled,
  refetchKey = "",
}) {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const sectionsRef = useRef(sections);
  const attachmentsRef = useRef({});
  const inFlightKeyRef = useRef(null);

  showToastRef.current = showToast;
  sectionsRef.current = sections;

  const [sectionAttachmentsBySection, setSectionAttachmentsBySection] = useState({});
  const [loadingSectionId, setLoadingSectionId] = useState(null);

  attachmentsRef.current = sectionAttachmentsBySection;

  useEffect(() => {
    inFlightKeyRef.current = null;
    setSectionAttachmentsBySection({});
    setLoadingSectionId(null);
  }, [orderId]);

  const loadSectionAttachments = useCallback(async (sectionId) => {
    if (!enabled || !orderId || !sectionId) return;

    const currentSections = sectionsRef.current;
    if (!shouldFetchBrandingSectionAttachments(sectionId, currentSections)) {
      setSectionAttachmentsBySection((prev) => ({ ...prev, [sectionId]: [] }));
      return;
    }

    const fetchKey = attachmentFetchKey(orderId, sectionId);
    const cached = attachmentsRef.current[sectionId];
    if (
      inFlightKeyRef.current === fetchKey &&
      Array.isArray(cached) &&
      cached.length > 0
    ) {
      return;
    }

    inFlightKeyRef.current = fetchKey;
    setLoadingSectionId(sectionId);

    try {
      const response = await getUploadAttachmentFile({
        module: "branding_guidelines",
        referenceId: orderId,
        sectionId: getBrandingSectionApiId(sectionId, currentSections),
      });
      if (!response?.status) return;

      const files = resolveAttachmentsForBrandingSection(
        response.data,
        sectionId,
        currentSections,
        { trustServerScoped: true }
      );
      setSectionAttachmentsBySection((prev) => ({ ...prev, [sectionId]: files }));
    } catch (error) {
      showToastRef.current({
        message: error?.message || "Failed to fetch attachments.",
        variant: "danger",
      });
    } finally {
      if (inFlightKeyRef.current === fetchKey) {
        inFlightKeyRef.current = null;
      }
      setLoadingSectionId((current) => (current === sectionId ? null : current));
    }
  }, [enabled, orderId]);

  useEffect(() => {
    inFlightKeyRef.current = null;
    loadSectionAttachments(activeSectionId);
    return () => {
      inFlightKeyRef.current = null;
    };
  }, [activeSectionId, loadSectionAttachments, refetchKey]);

  return {
    sectionAttachmentsBySection,
    attachmentsLoading: loadingSectionId === activeSectionId,
  };
}

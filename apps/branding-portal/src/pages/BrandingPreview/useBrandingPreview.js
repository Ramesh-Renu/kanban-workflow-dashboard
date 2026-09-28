import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "i18next";
import {
  BRANDING_NOTES_SECTION_ID,
  BRANDING_SECTION_I18N,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import {
  getBrandingGuideline,
  getBrandingGuidelineNotes,
  updateBrandingGuidelineNotes,
} from "../../services";
import { useBrandingPublicView } from "./useBrandingPublicView";

const useBrandingPreview = ({ token, navigate, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [rawApiData, setRawApiData] = useState(null);
  const [sectionFeedbackModalOpen, setSectionFeedbackModalOpen] = useState(false);
  const [sectionFeedbackDraft, setSectionFeedbackDraft] = useState("");
  const [publicName, setPublicName] = useState(
    () => localStorage.getItem("branding_public_name") || ""
  );
  const [isNameSet, setIsNameSet] = useState(
    () => localStorage.getItem("branding_is_name_set") === "true"
  );

  const fetchedSectionsRef = useRef({});
  const inFlightSectionsRef = useRef({});

  const view = useBrandingPublicView(rawApiData);
  const {
    brandingInfo,
    metadata,
    previewSections,
    viewSectionIds,
    activeSectionId,
    setActiveSectionId,
    activePreview,
    sectionAttachmentsBySection,
  } = view;

  useEffect(() => {
    localStorage.setItem("branding_public_name", publicName);
  }, [publicName]);

  useEffect(() => {
    localStorage.setItem("branding_is_name_set", String(isNameSet));
  }, [isNameSet]);

  const fetchBrandingData = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getBrandingGuideline({ token });
      if (response?.status) {
        setRawApiData(response.data || {});
      } else {
        navigate("/invalid-link", { replace: true });
      }
    } catch (err) {
      console.error("Failed to fetch branding data", err);
      navigate("/invalid-link", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  const mergeSectionNotes = useCallback((sectionId, notes) => {
    setRawApiData((prev) => {
      if (!prev) return prev;
      const existing = prev.commentsBySection || {};
      return {
        ...prev,
        commentsBySection: {
          ...existing,
          [sectionId]: notes,
        },
      };
    });
  }, []);

  const fetchSectionFeedback = useCallback(
    async (sectionId) => {
      if (sectionId === BRANDING_NOTES_SECTION_ID) return;

      try {
        const response = await getBrandingGuidelineNotes({ token, sectionId });
        if (response?.status) {
          mergeSectionNotes(sectionId, response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch section feedback", err);
      }
    },
    [token, mergeSectionNotes]
  );

  const addNote = useCallback(async () => {
    const message = sectionFeedbackDraft.trim();
    if (!message) return;

    if (!isNameSet || !publicName.trim()) {
      showToast({
        message: t(
          "order_view.branding_public_name_required",
          "Please set your name before posting feedback."
        ),
        variant: "warning",
      });
      return;
    }

    const entry = {
      author: publicName.trim(),
      authorType: "public",
      message,
      sectionId: activeSectionId,
      token,
    };

    try {
      const response = await updateBrandingGuidelineNotes(entry);
      if (!response?.status) {
        showToast({
          message: response?.message || "Something went wrong.",
          variant: "danger",
        });
        return;
      }

      const savedNote = response.data;
      const localEntry = savedNote?.id
        ? savedNote
        : {
            id: Date.now().toString(),
            ...entry,
            createdAt: new Date().toISOString(),
          };

      mergeSectionNotes(activeSectionId, [
        localEntry,
        ...(brandingInfo?.commentsBySection?.[activeSectionId] || []),
      ]);
      setSectionFeedbackDraft("");
    } catch (error) {
      console.error("Error updating branding guideline notes:", error);
      showToast({
        message: "Failed to update branding guideline notes",
        variant: "danger",
      });
    }
  }, [
    activeSectionId,
    brandingInfo?.commentsBySection,
    isNameSet,
    mergeSectionNotes,
    publicName,
    sectionFeedbackDraft,
    showToast,
    token,
  ]);

  const editNote = useCallback(
    async (noteId, newMessage) => {
      try {
        const response = await updateBrandingGuidelineNotes({
          noteId,
          message: newMessage,
          token,
        });

        if (!response?.status) {
          showToast({
            message: response?.message || "Something went wrong.",
            variant: "danger",
          });
          return;
        }

        const currentNotes = brandingInfo?.commentsBySection?.[activeSectionId] || [];
        mergeSectionNotes(
          activeSectionId,
          currentNotes.map((note) =>
            note.id === noteId
              ? { ...note, message: newMessage, updatedAt: new Date().toISOString() }
              : note
          )
        );
      } catch (err) {
        console.error("Failed to edit public comment", err);
        showToast({
          message: "Failed to edit public comment",
          variant: "danger",
        });
      }
    },
    [activeSectionId, brandingInfo?.commentsBySection, mergeSectionNotes, showToast, token]
  );

  useEffect(() => {
    if (token) fetchBrandingData();
  }, [token, fetchBrandingData]);

  useEffect(() => {
    fetchedSectionsRef.current = {};
    inFlightSectionsRef.current = {};
  }, [token]);

  useEffect(() => {
    if (!token || !brandingInfo || !activeSectionId) return;
    if (activeSectionId === BRANDING_NOTES_SECTION_ID) return;
    if (fetchedSectionsRef.current[activeSectionId]) return;
    if (inFlightSectionsRef.current[activeSectionId]) return;

    inFlightSectionsRef.current[activeSectionId] = true;
    Promise.resolve(fetchSectionFeedback(activeSectionId)).finally(() => {
      inFlightSectionsRef.current[activeSectionId] = false;
      fetchedSectionsRef.current[activeSectionId] = true;
    });
  }, [token, brandingInfo, activeSectionId, fetchSectionFeedback]);

  const sectionFeedbackList = brandingInfo?.commentsBySection?.[activeSectionId] || [];
  const activeSectionTitle = t(
    `order_view.${BRANDING_SECTION_I18N[activeSectionId]}`,
    BRANDING_SECTION_I18N[activeSectionId]
  );

  const sectionCommentCounts = useMemo(() => {
    const bySection = brandingInfo?.commentsBySection || {};
    return Object.fromEntries(
      viewSectionIds.map((id) => [id, Array.isArray(bySection[id]) ? bySection[id].length : 0])
    );
  }, [brandingInfo, viewSectionIds]);

  return {
    loading,
    activeSectionId,
    setActiveSectionId,
    sectionFeedbackModalOpen,
    setSectionFeedbackModalOpen,
    sectionFeedbackDraft,
    setSectionFeedbackDraft,
    publicName,
    setPublicName,
    isNameSet,
    setIsNameSet,
    sectionFeedbackList,
    activeSectionTitle,
    previewSections,
    activePreview,
    viewSectionIds,
    sectionCommentCounts,
    sectionAttachmentsBySection,
    metadata,
    addNote,
    editNote,
  };
};

export default useBrandingPreview;

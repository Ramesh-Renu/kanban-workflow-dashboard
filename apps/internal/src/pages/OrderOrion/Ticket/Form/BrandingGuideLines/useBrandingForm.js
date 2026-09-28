import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "i18next";
import { useGlobalMaster } from "@orion/shared";
import { useToast } from "@orion/shared";
import { getUploadAttachmentFile } from "../../../../../services";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  BRANDING_SECTION_FIELDS,
  BRANDING_SECTION_IDS,
  BRANDING_SECTION_I18N,
  BRANDING_SECTIONS_WITH_ATTACHMENTS,
  BRANDING_NOTES_SECTION_ID,
  getTypographyFieldDefinitions,
  normalizeTypographyFields,
  buildBrandingPayload,
  buildBrandingGuidelinesFormData,
  getBrandingV2Snapshot,
  getMissingRequiredFields,
  isBrandingV2Dirty,
  isBrandingGuidelinesDirty,
  isBrandingGuidelineNotesDirty,
  getBrandingV2ChangedSections,
  getBrandingSectionApiId,
  filterAttachmentsForSection,
  resolveAttachmentsForBrandingSection,
  createExportIconEntry,
  normalizeExportIconEntries,
  normalizeColorSchemeFields,
  normalizeBrandingColorList,
  canAppendBrandingColorList,
  isCompleteHexColor,
  BRANDING_MAX_COLOR_PICKERS,
  hydrateExportIconEntriesWithAttachments,
  buildBrandingPreviewSections,
  remapTypographyLanguagesToIds,
  normalizeTypographyFontNames,
  shouldFetchBrandingSectionAttachments,
  extractOrderLanguageIds,
  syncTypographyLanguagesFromOrder,
  applyOrderLanguagesToBrandingSections,
  findBrandingLanguageByKey,
  resolveTypographyFontAttachmentsForLanguage,
  getColorAlternativesForField,
  getColorSchemeFieldAlternatives,
  getTypographyFontAlternatives,
  getLanguageEntryName,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import {
  applyScrapedSectionsFromSource,
  mapScrapperTypeToTabId,
} from "@orion/shared/src/utils/brandingGuidelines/baseScraper";

const emptyPendingAttachments = () =>
  BRANDING_SECTION_IDS.reduce((acc, id) => {
    acc[id] = [];
    return acc;
  }, {});

const newFeedbackId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const useBrandingForm = ({ formData, setFormData, validationCheck, setErrorExist }) => {
  const { fontFamilyList, getFontFamilyList, addFontFamilyList, languageList, getLanguageList } =
    useGlobalMaster();
  const { showToast } = useToast();
  const { dispatch } = useGlobalContext();

  const [activeSectionId, setActiveSectionId] = useState("typography");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const brandingBuildOptions = useMemo(
    () => ({
      languageList: languageList?.data || [],
      fontFamilyList: fontFamilyList?.data || [],
    }),
    [languageList?.data, fontFamilyList?.data]
  );
  const brandingBuildOptionsRef = useRef(brandingBuildOptions);
  brandingBuildOptionsRef.current = brandingBuildOptions;

  const hydrateBrandingFromTicket = useCallback(
    (branding) => buildBrandingPayload(branding || {}, brandingBuildOptionsRef.current),
    []
  );

  const [brandingInfo, setBrandingInfo] = useState(() =>
    buildBrandingPayload(formData?.branding || {})
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingSectionAttachments, setPendingSectionAttachments] = useState(emptyPendingAttachments);
  const [pendingTypographyFontFiles, setPendingTypographyFontFiles] = useState({});
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);
  const [deletedFontBlobNames, setDeletedFontBlobNames] = useState([]);
  const [sectionAttachmentsBySection, setSectionAttachmentsBySection] = useState({});
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const baselineSnapshotRef = useRef(null);
  const attachmentFetchInFlightRef = useRef(null);
  const isPushingToParentRef = useRef(false);
  const orderIdRef = useRef(formData?.orderId);
  const prevOrderIdForSyncRef = useRef(formData?.orderId);
  const showToastRef = useRef(showToast);
  const dispatchRef = useRef(dispatch);
  const setFormDataRef = useRef(setFormData);
  const pendingRef = useRef(pendingSectionAttachments);
  const pendingTypographyFontFilesRef = useRef(pendingTypographyFontFiles);
  const deletedRef = useRef(deletedAttachmentIds);
  const deletedFontBlobNamesRef = useRef(deletedFontBlobNames);
  const brandingInfoRef = useRef(brandingInfo);

  setFormDataRef.current = setFormData;
  pendingRef.current = pendingSectionAttachments;
  pendingTypographyFontFilesRef.current = pendingTypographyFontFiles;
  deletedRef.current = deletedAttachmentIds;
  deletedFontBlobNamesRef.current = deletedFontBlobNames;
  brandingInfoRef.current = brandingInfo;
  showToastRef.current = showToast;
  dispatchRef.current = dispatch;

  const captureBaseline = useCallback((info, pending, deleted, pendingFontFiles = {}, deletedFonts = []) => {
    baselineSnapshotRef.current = getBrandingV2Snapshot({
      sections: info?.sections,
      commentsBySection: info?.commentsBySection,
      guidelineNotes: info?.guidelineNotes ?? "",
      pendingAttachments: pending ?? emptyPendingAttachments(),
      pendingTypographyFontFiles: pendingFontFiles,
      deletedAttachmentIds: deleted ?? [],
      deletedFontBlobNames: deletedFonts ?? [],
    });
  }, []);

  const pushBrandingToParent = useCallback((nextBranding, pending, deleted, pendingFontFiles, deletedFonts) => {
    const setter = setFormDataRef.current;
    if (!setter) return;
    isPushingToParentRef.current = true;
    setter((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        sections: nextBranding.sections,
        commentsBySection: nextBranding.commentsBySection,
        guidelineNotes: nextBranding.guidelineNotes ?? "",
        v2PendingAttachments: pending ?? pendingRef.current,
        v2PendingTypographyFontFiles: pendingFontFiles ?? pendingTypographyFontFilesRef.current,
        v2DeletedAttachmentIds: deleted ?? deletedRef.current,
        v2DeletedFontBlobNames: deletedFonts ?? deletedFontBlobNamesRef.current,
        scraperJob: prev.branding?.scraperJob
          ? { ...prev.branding.scraperJob, manualIntervention: true }
          : prev.branding?.scraperJob,
      },
    }));
    queueMicrotask(() => {
      isPushingToParentRef.current = false;
    });
  }, []);

  // Sync from parent only when ticket data is refreshed externally (not from our own push)
  useEffect(() => {
    if (isPushingToParentRef.current) return;

    if (formData?.orderId !== prevOrderIdForSyncRef.current) {
      prevOrderIdForSyncRef.current = formData?.orderId;
      orderIdRef.current = formData?.orderId;
      baselineSnapshotRef.current = null;
      attachmentFetchInFlightRef.current = null;
      const normalized = hydrateBrandingFromTicket(formData?.branding);
      setBrandingInfo(normalized);
      setPendingSectionAttachments(emptyPendingAttachments());
      setPendingTypographyFontFiles({});
      setDeletedAttachmentIds([]);
      setDeletedFontBlobNames([]);
      setSectionAttachmentsBySection({});
      captureBaseline(normalized, emptyPendingAttachments(), [], {}, []);
      return;
    }

    const normalized = hydrateBrandingFromTicket(formData?.branding);
    setBrandingInfo((prev) => {
      const prevSnap = getBrandingV2Snapshot({
        sections: prev.sections,
        commentsBySection: prev.commentsBySection,
        guidelineNotes: prev.guidelineNotes ?? "",
        pendingAttachments: {},
        deletedAttachmentIds: [],
        deletedFontBlobNames: [],
      });
      const nextSnap = getBrandingV2Snapshot({
        sections: normalized.sections,
        commentsBySection: normalized.commentsBySection,
        guidelineNotes: normalized.guidelineNotes ?? "",
        pendingAttachments: {},
        deletedAttachmentIds: [],
        deletedFontBlobNames: [],
      });
      if (prevSnap === nextSnap) return prev;
      return normalized;
    });

    if (!baselineSnapshotRef.current) {
      captureBaseline(normalized, emptyPendingAttachments(), [], {}, []);
    }
  }, [formData?.branding, formData?.orderId, captureBaseline, hydrateBrandingFromTicket]);

  const getAttachmentFetchKey = (orderId, sectionId) => `${orderId}:${sectionId}`;

  // ── Fetch attachments for active section (same API as Documents / legacy branding view) ──
  const fetchSectionAttachments = useCallback(async (sectionId) => {
    const orderId = orderIdRef.current;
    if (!orderId) return;
    if (!BRANDING_SECTIONS_WITH_ATTACHMENTS.includes(sectionId)) return;

    const sections = brandingInfoRef.current?.sections || {};
    if (!shouldFetchBrandingSectionAttachments(sectionId, sections)) {
      setSectionAttachmentsBySection((prev) => ({
        ...prev,
        [sectionId]: [],
      }));
      return;
    }

    const fetchKey = getAttachmentFetchKey(orderId, sectionId);
    if (attachmentFetchInFlightRef.current === fetchKey) return;

    attachmentFetchInFlightRef.current = fetchKey;
    setAttachmentsLoading(true);

    try {
      const response = await getUploadAttachmentFile({
        module: "branding_guidelines",
        referenceId: orderId,
        sectionId: getBrandingSectionApiId(sectionId, sections),
      });
      if (response?.status) {
        const filtered = resolveAttachmentsForBrandingSection(
          response.data,
          sectionId,
          sections,
          { trustServerScoped: true }
        );
        setSectionAttachmentsBySection((prev) => ({
          ...prev,
          [sectionId]: filtered,
        }));
        dispatchRef.current({ type: "SET_BRANDING_GUIDELINES_DATA", payload: response.data });
        dispatchRef.current({
          type: "SET_BRANDING_ATTACHMENT_ORDERID",
          payload: orderId,
        });
      }
    } catch (error) {
      showToastRef.current({
        message: error?.message || "Failed to fetch attachments.",
        variant: "danger",
      });
    } finally {
      if (attachmentFetchInFlightRef.current === fetchKey) {
        attachmentFetchInFlightRef.current = null;
      }
      setAttachmentsLoading(false);
    }
  }, []);

  const attachmentSectionsRefetchKey = useMemo(
    () =>
      JSON.stringify(
        BRANDING_SECTION_IDS.map((id) => brandingInfo?.sections?.[id]?.apiSectionId ?? null)
      ),
    [brandingInfo?.sections]
  );

  useEffect(() => {
    if (!formData?.orderId) return;
    orderIdRef.current = formData.orderId;
    attachmentFetchInFlightRef.current = null;
    fetchSectionAttachments(activeSectionId);
    return () => {
      attachmentFetchInFlightRef.current = null;
    };
  }, [activeSectionId, formData?.orderId, attachmentSectionsRefetchKey, fetchSectionAttachments]);

  // Pair fetched export-icon attachments with entries (by id, name, or order)
  useEffect(() => {
    const attachments = sectionAttachmentsBySection.exportIcons;
    if (!Array.isArray(attachments)) return;

    setBrandingInfo((prev) => {
      const section = prev.sections?.exportIcons;
      if (!section) return prev;
      const entries = normalizeExportIconEntries(section.fields || {});
      const hydrated = hydrateExportIconEntriesWithAttachments(entries, attachments);
      const prevIds = entries.map((e) => e.existingAttachmentId).join("|");
      const nextIds = hydrated.map((e) => e.existingAttachmentId).join("|");
      if (prevIds === nextIds) return prev;

      const updated = {
        ...prev,
        sections: {
          ...prev.sections,
          exportIcons: {
            ...section,
            fields: { ...section.fields, exportIconEntries: hydrated },
          },
        },
      };
      queueMicrotask(() => pushBrandingToParent(updated));
      return updated;
    });
  }, [sectionAttachmentsBySection.exportIcons, pushBrandingToParent]);

  // ── Master list fetches ──────────────────────────────────────────────────
  useEffect(() => {
    if (!fontFamilyList?.loading && fontFamilyList?.data?.length === 0) getFontFamilyList();
  }, [fontFamilyList?.loading, fontFamilyList?.data?.length, getFontFamilyList]);

  useEffect(() => {
    if (!languageList?.loading && languageList?.data?.length === 0) getLanguageList();
  }, [languageList?.loading, languageList?.data?.length, getLanguageList]);

  // ── Field change ─────────────────────────────────────────────────────────
  const handleFieldChange = (sectionId, fieldKey, value, extraFields) => {
    if (sectionId === "typography" && fieldKey === "languages") {
      return;
    }

    const prevFields = brandingInfo.sections[sectionId]?.fields || {};
    let nextFields = { ...prevFields, [fieldKey]: value };

    if (sectionId === "colorScheme" && (fieldKey === "primaryColor" || fieldKey === "secondaryColor")) {
      nextFields = {
        ...prevFields,
        [fieldKey]: normalizeBrandingColorList(value),
      };
    } else if (sectionId === "typography") {
      const patch =
        extraFields && typeof extraFields === "object" ? extraFields : {};
      if (fieldKey === "fontStylesByLanguage") {
        nextFields = normalizeTypographyFields({
          ...prevFields,
          fontStylesByLanguage: value,
          ...patch,
        });

        const clearedLanguageIds = Object.keys({
          ...(prevFields.fontStylesByLanguage || {}),
          ...(value || {}),
        }).filter((langKey) => {
          const nextFontName = String(value?.[langKey] ?? "").trim();
          return !nextFontName && pendingTypographyFontFilesRef.current[langKey] instanceof File;
        });
        if (clearedLanguageIds.length > 0) {
          const nextPendingFontFiles = { ...pendingTypographyFontFilesRef.current };
          clearedLanguageIds.forEach((langKey) => {
            delete nextPendingFontFiles[langKey];
          });
          setPendingTypographyFontFiles(nextPendingFontFiles);
          pendingTypographyFontFilesRef.current = nextPendingFontFiles;
        }
      } else {
        nextFields = normalizeTypographyFields({
          ...prevFields,
          [fieldKey]: value,
          ...patch,
        });
      }
    }

    const updated = {
      ...brandingInfo,
      sections: {
        ...brandingInfo.sections,
        [sectionId]: {
          ...brandingInfo.sections[sectionId],
          fields: nextFields,
        },
      },
    };
    setBrandingInfo(updated);
    pushBrandingToParent(
      updated,
      pendingRef.current,
      deletedRef.current,
      pendingTypographyFontFilesRef.current
    );
  };

  const applyBrandingUpdate = useCallback(
    (updater) => {
      const updated = updater(brandingInfoRef.current);
      setBrandingInfo(updated);
      pushBrandingToParent(updated);
      return updated;
    },
    [pushBrandingToParent]
  );

  const handleGuidelineNotesChange = useCallback(
    (notes) => {
      applyBrandingUpdate((info) => ({
        ...info,
        guidelineNotes: notes,
      }));
    },
    [applyBrandingUpdate]
  );

  const getCurrentAuthorName = useCallback(
    () => t("order_view.branding_note_author_you", "You"),
    []
  );

  const addSectionFeedback = useCallback(() => {
    const message = feedbackDraft.trim();
    if (!message) {
      showToastRef.current({
        message: t(
          "order_view.branding_section_feedback_empty",
          "Enter feedback before adding."
        ),
        variant: "warning",
      });
      return;
    }
    const entry = {
      id: newFeedbackId(),
      author: getCurrentAuthorName(),
      authorType: "internal",
      message,
      createdAt: new Date().toISOString(),
    };
    applyBrandingUpdate((info) => ({
      ...info,
      commentsBySection: {
        ...info.commentsBySection,
        [activeSectionId]: [entry, ...(info.commentsBySection?.[activeSectionId] || [])],
      },
    }));
    setFeedbackDraft("");
  }, [activeSectionId, feedbackDraft, applyBrandingUpdate, getCurrentAuthorName]);

  const editSectionFeedback = useCallback(
    (noteId, newMessage) => {
      const message = newMessage.trim();
      if (!message) return;
      applyBrandingUpdate((info) => {
        const list = info.commentsBySection?.[activeSectionId] || [];
        return {
          ...info,
          commentsBySection: {
            ...info.commentsBySection,
            [activeSectionId]: list.map((note) =>
              note.id === noteId
                ? { ...note, message, updatedAt: new Date().toISOString() }
                : note
            ),
          },
        };
      });
    },
    [activeSectionId, applyBrandingUpdate]
  );

  // ── Deferred attachments ─────────────────────────────────────────────────
  const getExistingAttachmentsForSection = useCallback(
    (sectionId) => {
      const list =
        sectionAttachmentsBySection[sectionId] ??
        brandingInfo?.sections?.[sectionId]?.attachments ??
        [];
      const deletedSet = new Set(deletedAttachmentIds.map(String));
      return list.filter((file) => {
        const id = file.id ?? file.attachmentId ?? file.attachment_id;
        return id == null || !deletedSet.has(String(id));
      });
    },
    [sectionAttachmentsBySection, brandingInfo?.sections, deletedAttachmentIds]
  );

  const stageSectionFiles = useCallback(
    (sectionId, files) => {
      if (!files?.length) return;
      const next = {
        ...pendingRef.current,
        [sectionId]: [...(pendingRef.current[sectionId] || []), ...files],
      };
      setPendingSectionAttachments(next);
      pushBrandingToParent(brandingInfoRef.current, next, deletedRef.current);
    },
    [pushBrandingToParent]
  );

  const removePendingFile = useCallback(
    (sectionId, index) => {
      const next = {
        ...pendingRef.current,
        [sectionId]: (pendingRef.current[sectionId] || []).filter((_, i) => i !== index),
      };
      setPendingSectionAttachments(next);
      pushBrandingToParent(brandingInfoRef.current, next, deletedRef.current);
    },
    [pushBrandingToParent]
  );

  const markAttachmentDeleted = useCallback(
    (attachmentId) => {
      if (attachmentId == null) return;
      const next = deletedRef.current.includes(String(attachmentId))
        ? deletedRef.current
        : [...deletedRef.current, String(attachmentId)];
      setDeletedAttachmentIds(next);
      pushBrandingToParent(
        brandingInfoRef.current,
        pendingRef.current,
        next,
        pendingTypographyFontFilesRef.current
      );
    },
    [pushBrandingToParent]
  );

  const getExistingTypographyFontAttachments = useCallback(
    (languageId) => {
      const typoFields = brandingInfoRef.current?.sections?.typography?.fields || {};
      return resolveTypographyFontAttachmentsForLanguage({
        languageId,
        typographyFields: typoFields,
        sectionAttachments: getExistingAttachmentsForSection("typography"),
        deletedAttachmentIds: deletedRef.current || [],
        deletedFontBlobNames: deletedFontBlobNamesRef.current || [],
      });
    },
    [getExistingAttachmentsForSection, deletedFontBlobNames]
  );

  const trackDeletedFontBlobName = useCallback((blobName) => {
    const name = String(blobName ?? "").trim();
    if (!name) return deletedFontBlobNamesRef.current;
    if (deletedFontBlobNamesRef.current.includes(name)) {
      return deletedFontBlobNamesRef.current;
    }
    const next = [...deletedFontBlobNamesRef.current, name];
    setDeletedFontBlobNames(next);
    deletedFontBlobNamesRef.current = next;
    return next;
  }, []);

  const clearTypographyFontFileForLanguage = useCallback((languageId, nextDeletedFonts) => {
    const langKey = String(languageId);
    const typoSection = brandingInfoRef.current?.sections?.typography || {};
    const typoFields = typoSection.fields || {};
    const nextFontFiles = { ...(typoFields.fontFilesByLanguage || {}) };
    delete nextFontFiles[langKey];
    const updated = {
      ...brandingInfoRef.current,
      sections: {
        ...brandingInfoRef.current.sections,
        typography: {
          ...typoSection,
          fields: {
            ...typoFields,
            fontFilesByLanguage: nextFontFiles,
          },
        },
      },
    };
    setBrandingInfo(updated);
    brandingInfoRef.current = updated;
    pushBrandingToParent(
      updated,
      pendingRef.current,
      deletedRef.current,
      pendingTypographyFontFilesRef.current,
      nextDeletedFonts ?? deletedFontBlobNamesRef.current
    );
    return updated;
  }, [pushBrandingToParent]);

  const stageTypographyFontFile = useCallback(
    (languageId, file) => {
      if (!file) return;

      const typoSection = brandingInfoRef.current?.sections?.typography || {};
      const typoFields = typoSection.fields || {};
      const langKey = String(languageId);

      const existing = getExistingTypographyFontAttachments(languageId);
      let nextDeletedFonts = deletedFontBlobNamesRef.current;
      existing.forEach((attachment) => {
        const blobName = String(attachment.blobName ?? attachment.blob_name ?? "").trim();
        if (blobName) {
          nextDeletedFonts = trackDeletedFontBlobName(blobName);
        }
        const attachmentId = attachment.id ?? attachment.attachmentId ?? attachment.attachment_id;
        if (attachmentId != null) {
          markAttachmentDeleted(attachmentId);
        }
      });

      const nextFontFiles = { ...(typoFields.fontFilesByLanguage || {}) };
      delete nextFontFiles[langKey];

      const next = {
        ...pendingTypographyFontFilesRef.current,
        [langKey]: file,
      };
      setPendingTypographyFontFiles(next);

      const updated = {
        ...brandingInfoRef.current,
        sections: {
          ...brandingInfoRef.current.sections,
          typography: {
            ...typoSection,
            fields: {
              ...typoFields,
              fontFilesByLanguage: nextFontFiles,
            },
          },
        },
      };
      setBrandingInfo(updated);
      brandingInfoRef.current = updated;
      pushBrandingToParent(
        updated,
        pendingRef.current,
        deletedRef.current,
        next,
        nextDeletedFonts
      );
    },
    [
      getExistingTypographyFontAttachments,
      markAttachmentDeleted,
      pushBrandingToParent,
      trackDeletedFontBlobName,
    ]
  );

  const removeTypographyFontFile = useCallback(
    (languageId) => {
      const langKey = String(languageId);
      const next = { ...pendingTypographyFontFilesRef.current };
      delete next[langKey];
      setPendingTypographyFontFiles(next);

      pushBrandingToParent(
        brandingInfoRef.current,
        pendingRef.current,
        deletedRef.current,
        next,
        deletedFontBlobNamesRef.current
      );
    },
    [pushBrandingToParent]
  );

  const markTypographyFontAttachmentDeleted = useCallback(
    (attachmentOrId, languageId) => {
      if (attachmentOrId == null) return;

      const attachment =
        typeof attachmentOrId === "object"
          ? attachmentOrId
          : { id: attachmentOrId, attachmentId: attachmentOrId };

      const blobName = String(attachment.blobName ?? attachment.blob_name ?? "").trim();
      let nextDeletedFonts = deletedFontBlobNamesRef.current;
      if (blobName) {
        nextDeletedFonts = trackDeletedFontBlobName(blobName);
      }

      const attachmentId = attachment.id ?? attachment.attachmentId ?? attachment.attachment_id;
      if (attachmentId != null && !blobName) {
        markAttachmentDeleted(attachmentId);
      }

      if (languageId != null) {
        clearTypographyFontFileForLanguage(languageId, nextDeletedFonts);
        return;
      }

      pushBrandingToParent(
        brandingInfoRef.current,
        pendingRef.current,
        deletedRef.current,
        pendingTypographyFontFilesRef.current,
        nextDeletedFonts
      );
    },
    [
      clearTypographyFontFileForLanguage,
      markAttachmentDeleted,
      pushBrandingToParent,
      trackDeletedFontBlobName,
    ]
  );

  const updateExportIconEntries = useCallback(
    (nextEntries) => {
      const section = brandingInfoRef.current.sections?.exportIcons || {};
      const { iconName1: _iconName1, iconName2: _iconName2, ...restFields } = section.fields || {};
      const updated = {
        ...brandingInfoRef.current,
        sections: {
          ...brandingInfoRef.current.sections,
          exportIcons: {
            ...section,
            fields: { ...restFields, exportIconEntries: nextEntries },
          },
        },
      };
      setBrandingInfo(updated);
      pushBrandingToParent(updated);
    },
    [pushBrandingToParent]
  );

  const getExistingAttachmentForExportIconEntry = useCallback(
    (entry) => {
      const stored = normalizeExportIconEntries(
        brandingInfoRef.current.sections?.exportIcons?.fields || {}
      ).find((e) => e.id === entry?.id);
      const attachmentId = stored?.existingAttachmentId;
      if (attachmentId == null) return [];
      const deleted = new Set((deletedAttachmentIds || []).map(String));
      if (deleted.has(String(attachmentId))) return [];
      const all = getExistingAttachmentsForSection("exportIcons");
      const file = all.find((file) => {
        const id = file.id ?? file.attachmentId ?? file.attachment_id;
        return id != null && String(id) === String(attachmentId);
      });
      return file ? [file] : [];
    },
    [getExistingAttachmentsForSection, deletedAttachmentIds]
  );

  const addExportIconEntry = useCallback(() => {
    const entries = normalizeExportIconEntries(
      brandingInfoRef.current.sections?.exportIcons?.fields || {}
    );
    updateExportIconEntries([...entries, createExportIconEntry()]);
  }, [updateExportIconEntries]);

  const removeExportIconEntry = useCallback(
    (entryId) => {
      const entries = normalizeExportIconEntries(
        brandingInfoRef.current.sections?.exportIcons?.fields || {}
      );
      if (entries.length <= 1) return;
      const entry = entries.find((e) => e.id === entryId);
      if (entry?.existingAttachmentId != null) {
        markAttachmentDeleted(entry.existingAttachmentId);
      }
      updateExportIconEntries(entries.filter((e) => e.id !== entryId));
    },
    [updateExportIconEntries, markAttachmentDeleted]
  );

  const updateExportIconName = useCallback(
    (entryId, iconName) => {
      const entries = normalizeExportIconEntries(
        brandingInfoRef.current.sections?.exportIcons?.fields || {}
      );
      updateExportIconEntries(
        entries.map((e) => (e.id === entryId ? { ...e, iconName } : e))
      );
    },
    [updateExportIconEntries]
  );

  const markExportIconAttachmentDeleted = useCallback(
    (attachmentId) => {
      if (attachmentId == null) return;
      markAttachmentDeleted(attachmentId);
      const entries = normalizeExportIconEntries(
        brandingInfoRef.current.sections?.exportIcons?.fields || {}
      );
      updateExportIconEntries(
        entries.map((e) =>
          e.existingAttachmentId != null &&
          String(e.existingAttachmentId) === String(attachmentId)
            ? { ...e, existingAttachmentId: null, pendingFile: null }
            : e
        )
      );
    },
    [markAttachmentDeleted, updateExportIconEntries]
  );

  const stageExportIconFile = useCallback(
    (entryId, file) => {
      const entries = normalizeExportIconEntries(
        brandingInfoRef.current.sections?.exportIcons?.fields || {}
      );
      updateExportIconEntries(
        entries.map((e) => {
          if (e.id !== entryId) return e;
          if (!file) {
            if (e.existingAttachmentId != null) {
              markAttachmentDeleted(e.existingAttachmentId);
            }
            return {
              ...e,
              pendingFile: null,
              existingAttachmentId: null,
            };
          }
          if (e.existingAttachmentId != null) {
            markAttachmentDeleted(e.existingAttachmentId);
          }
          return {
            ...e,
            pendingFile: file,
            existingAttachmentId: null,
          };
        })
      );
    },
    [updateExportIconEntries, markAttachmentDeleted]
  );

  const updateColorSchemeList = useCallback(
    (fieldKey, colors) => {
      applyBrandingUpdate((info) => {
        const section = info.sections?.colorScheme || {};
        return {
          ...info,
          sections: {
            ...info.sections,
            colorScheme: {
              ...section,
              fields: normalizeColorSchemeFields({
                ...section.fields,
                [fieldKey]: normalizeBrandingColorList(colors),
              }),
            },
          },
        };
      });
    },
    [applyBrandingUpdate]
  );

  const updatePrimaryColorAt = useCallback(
    (index, color) => {
      const fields = normalizeColorSchemeFields(
        brandingInfoRef.current.sections?.colorScheme?.fields || {}
      );
      const list = [...fields.primaryColor];
      list[index] = color;
      updateColorSchemeList("primaryColor", list);
    },
    [updateColorSchemeList]
  );

  const addPrimaryColor = useCallback(
    (color) => {
      const fields = normalizeColorSchemeFields(
        brandingInfoRef.current.sections?.colorScheme?.fields || {}
      );
      if (!canAppendBrandingColorList(fields.primaryColor)) return;
      if (!isCompleteHexColor(color)) return;
      updateColorSchemeList("primaryColor", [...fields.primaryColor, color]);
    },
    [updateColorSchemeList]
  );

  const removePrimaryColorAt = useCallback(
    (index) => {
      const fields = normalizeColorSchemeFields(
        brandingInfoRef.current.sections?.colorScheme?.fields || {}
      );
      updateColorSchemeList(
        "primaryColor",
        fields.primaryColor.filter((_, i) => i !== index)
      );
    },
    [updateColorSchemeList]
  );

  const updateSecondaryColorAt = useCallback(
    (index, color) => {
      const fields = normalizeColorSchemeFields(
        brandingInfoRef.current.sections?.colorScheme?.fields || {}
      );
      const list = [...fields.secondaryColor];
      list[index] = color;
      updateColorSchemeList("secondaryColor", list);
    },
    [updateColorSchemeList]
  );

  const addSecondaryColor = useCallback(
    (color) => {
      const fields = normalizeColorSchemeFields(
        brandingInfoRef.current.sections?.colorScheme?.fields || {}
      );
      if (!canAppendBrandingColorList(fields.secondaryColor)) return;
      if (!isCompleteHexColor(color)) return;
      updateColorSchemeList("secondaryColor", [...fields.secondaryColor, color]);
    },
    [updateColorSchemeList]
  );

  const removeSecondaryColorAt = useCallback(
    (index) => {
      const fields = normalizeColorSchemeFields(
        brandingInfoRef.current.sections?.colorScheme?.fields || {}
      );
      updateColorSchemeList(
        "secondaryColor",
        fields.secondaryColor.filter((_, i) => i !== index)
      );
    },
    [updateColorSchemeList]
  );

  const reorderPrimaryColors = useCallback(
    (colors) => {
      const validColors = colors.filter((c) => isCompleteHexColor(c));
      if (validColors.length < 2) return;
      updateColorSchemeList("primaryColor", validColors);
    },
    [updateColorSchemeList]
  );

  const reorderSecondaryColors = useCallback(
    (colors) => {
      const validColors = colors.filter((c) => isCompleteHexColor(c));
      if (validColors.length < 2) return;
      updateColorSchemeList("secondaryColor", validColors);
    },
    [updateColorSchemeList]
  );

  /** Apply a scraper color alternative to chip index 0 for primary or secondary. */
  const selectColorSchemeFieldAlternative = useCallback(
    (fieldKey, hex) => {
      if (!isCompleteHexColor(hex)) return;
      if (fieldKey !== "primaryColor" && fieldKey !== "secondaryColor") return;
      applyBrandingUpdate((info) => {
        const section = info.sections?.colorScheme || {};
        const fields = normalizeColorSchemeFields(section.fields || {});
        const list = [...(fields[fieldKey] || [])];
        list[0] = hex;
        return {
          ...info,
          sections: {
            ...info.sections,
            colorScheme: {
              ...section,
              fields: normalizeColorSchemeFields({
                ...fields,
                [fieldKey]: list,
              }),
            },
          },
        };
      });
    },
    [applyBrandingUpdate]
  );

  const selectPrimaryColorAlternative = useCallback(
    (hex) => selectColorSchemeFieldAlternative("primaryColor", hex),
    [selectColorSchemeFieldAlternative]
  );

  const selectSecondaryColorAlternative = useCallback(
    (hex) => selectColorSchemeFieldAlternative("secondaryColor", hex),
    [selectColorSchemeFieldAlternative]
  );

  const removeExportIconPendingFile = useCallback(
    (entryId) => {
      stageExportIconFile(entryId, null);
    },
    [stageExportIconFile]
  );

  const getBrandingGuidelinesState = useCallback(
    () => ({
      sections: brandingInfo.sections,
      guidelineNotes: brandingInfo.guidelineNotes ?? "",
      pendingAttachments: pendingSectionAttachments,
      pendingTypographyFontFiles,
      deletedAttachmentIds,
      deletedFontBlobNames,
    }),
    [
      brandingInfo.sections,
      brandingInfo.guidelineNotes,
      pendingSectionAttachments,
      pendingTypographyFontFiles,
      deletedAttachmentIds,
      deletedFontBlobNames,
    ]
  );

  const getBrandingGuidelinesBaseline = useCallback(() => {
    if (!baselineSnapshotRef.current) return {};
    const baseline = JSON.parse(baselineSnapshotRef.current);
    return {
      sections: baseline.sections,
      guidelineNotes: baseline.guidelineNotes ?? "",
      pendingAttachments: baseline.pendingAttachments || emptyPendingAttachments(),
      pendingTypographyFontFiles: baseline.pendingTypographyFontFiles || {},
      deletedAttachmentIds: baseline.deletedAttachmentIds || [],
      deletedFontBlobNames: baseline.deletedFontBlobNames || [],
    };
  }, []);

  const buildBrandingSaveFormData = useCallback(() => {
    if (!formData?.orderId) return null;
    
    const current = getBrandingGuidelinesState();
    const baseline = getBrandingGuidelinesBaseline();
    const changedSectionIds = getBrandingV2ChangedSections(current, baseline, {
      sectionAttachmentsBySection,
    });
    const guidelineNotesChanged = isBrandingGuidelineNotesDirty(current, baseline);
    if (!isBrandingGuidelinesDirty(current, baseline, { sectionAttachmentsBySection })) {
      return null;
    }

    return buildBrandingGuidelinesFormData({
      orderId: formData.orderId,
      sections: brandingInfo.sections,
      languageList: languageList?.data || [],
      fontFamilyList: fontFamilyList?.data || [],
      pendingAttachments: pendingSectionAttachments,
      pendingTypographyFontFiles,
      typographySectionAttachments: sectionAttachmentsBySection.typography || [],
      deletedAttachmentIds,
      deletedFontBlobNames,
      guidelineNotes: brandingInfo.guidelineNotes ?? "",
      changedSectionIds,
      guidelineNotesChanged,
    });
  }, [
    formData?.orderId,
    brandingInfo.sections,
    brandingInfo.guidelineNotes,
    languageList?.data,
    fontFamilyList?.data,
    pendingSectionAttachments,
    pendingTypographyFontFiles,
    deletedAttachmentIds,
    deletedFontBlobNames,
    sectionAttachmentsBySection,
    getBrandingGuidelinesState,
    getBrandingGuidelinesBaseline,
  ]);

  const checkBrandingV2Dirty = useCallback(() => {
    const current = {
      sections: brandingInfo.sections,
      commentsBySection: brandingInfo.commentsBySection,
      guidelineNotes: brandingInfo.guidelineNotes ?? "",
      pendingAttachments: pendingSectionAttachments,
      pendingTypographyFontFiles,
      deletedAttachmentIds,
      deletedFontBlobNames,
    };
    const baseline = baselineSnapshotRef.current
      ? JSON.parse(baselineSnapshotRef.current)
      : {};
    return isBrandingV2Dirty(current, baseline);
  }, [
    brandingInfo,
    pendingSectionAttachments,
    pendingTypographyFontFiles,
    deletedAttachmentIds,
    deletedFontBlobNames,
  ]);

  const checkBrandingGuidelinesDirty = useCallback(() => {
    const current = getBrandingGuidelinesState();
    const baseline = getBrandingGuidelinesBaseline();
    return isBrandingGuidelinesDirty(current, baseline, { sectionAttachmentsBySection });
  }, [
    getBrandingGuidelinesState,
    getBrandingGuidelinesBaseline,
    sectionAttachmentsBySection,
  ]);

  const resetBrandingBaseline = useCallback(() => {
    setPendingSectionAttachments(emptyPendingAttachments());
    setPendingTypographyFontFiles({});
    setDeletedAttachmentIds([]);
    setDeletedFontBlobNames([]);
    captureBaseline(brandingInfo, emptyPendingAttachments(), [], {}, []);
    setSectionAttachmentsBySection({});
    fetchSectionAttachments(activeSectionId);
  }, [brandingInfo, captureBaseline, fetchSectionAttachments, activeSectionId]);

  // ── Validation ───────────────────────────────────────────────────────────
  const validateBrandingForm = useCallback(() => {
    const missing = getMissingRequiredFields({
      ...brandingInfoRef.current,
      deletedAttachmentIds: deletedRef.current,
      pendingTypographyFontFiles: pendingTypographyFontFilesRef.current,
      deletedFontBlobNames: deletedFontBlobNamesRef.current,
    });
    const errorMap = missing.reduce((acc, item) => {
      acc[`${item.sectionId}.${item.key}`] = true;
      return acc;
    }, {});
    setFieldErrors(errorMap);
    setErrorExist?.(missing.length > 0);
    if (missing.some((item) => item.sectionId === "exportIcons")) {
      setActiveSectionId("exportIcons");
    }
    return missing.length === 0;
  }, [setErrorExist]);

  useEffect(() => {
    if (!validationCheck) return;
    validateBrandingForm();
  }, [
    validationCheck,
    brandingInfo,
    deletedAttachmentIds,
    pendingTypographyFontFiles,
    deletedFontBlobNames,
    validateBrandingForm,
  ]);

  const activeSection = brandingInfo?.sections?.[activeSectionId] || null;
  const activeSectionFields = activeSection?.fields || {};
  const primaryColorAlternatives = useMemo(() => {
    if (activeSectionId !== "colorScheme") return [];
    return getColorSchemeFieldAlternatives(activeSection, "primary");
  }, [activeSectionId, activeSection]);
  const secondaryColorAlternatives = useMemo(() => {
    if (activeSectionId !== "colorScheme") return [];
    return getColorSchemeFieldAlternatives(activeSection, "secondary");
  }, [activeSectionId, activeSection]);
  const getFieldColorAlternatives = useCallback(
    (fieldKey) => getColorAlternativesForField(activeSection, fieldKey),
    [activeSection]
  );
  const getLanguageFontAlternatives = useCallback(
    (languageId) => {
      const lang = findBrandingLanguageByKey(languageId, languageList?.data || []);
      const label = getLanguageEntryName(lang) || "";
      return getTypographyFontAlternatives(activeSection, languageId, label);
    },
    [activeSection, languageList?.data]
  );
  const exportIconEntries = useMemo(
    () =>
      activeSectionId === "exportIcons"
        ? normalizeExportIconEntries(activeSectionFields)
        : [],
    [activeSectionId, activeSectionFields]
  );
  const colorSchemeFields = useMemo(
    () =>
      activeSectionId === "colorScheme"
        ? normalizeColorSchemeFields(activeSectionFields)
        : null,
    [activeSectionId, activeSectionFields]
  );
  const configMethod = activeSectionFields.configurationMethod || "standard";
  const sectionFieldDefinitions = useMemo(() => {
    if (activeSectionId === BRANDING_NOTES_SECTION_ID) {
      return [];
    }
    if (activeSectionId === "exportIcons" || activeSectionId === "colorScheme") {
      return [];
    }
    if (activeSectionId === "typography") {
      return getTypographyFieldDefinitions(
        activeSectionFields,
        languageList?.data || []
      );
    }
    const rawFieldDefs = BRANDING_SECTION_FIELDS[activeSectionId] || [];
    return rawFieldDefs.filter((field) =>
      field.condition ? field.condition === configMethod : true
    );
  }, [
    activeSectionId,
    activeSectionFields,
    activeSectionFields.languages,
    activeSectionFields.fontStylesByLanguage,
    languageList?.data,
    configMethod,
  ]);
  const sectionTitle = t(
    `order_view.${BRANDING_SECTION_I18N[activeSectionId]}`,
    BRANDING_SECTION_I18N[activeSectionId]
  );
  const guidelineNotes = brandingInfo?.guidelineNotes ?? "";
  const sectionFeedbackList = brandingInfo?.commentsBySection?.[activeSectionId] || [];

  const orderLanguageIds = useMemo(
    () => extractOrderLanguageIds(formData?.orderInfo),
    [formData?.orderInfo?.tools?.language]
  );

  const syncTypographyFromOrderLanguages = useCallback((info, nextOrderLanguageIds) => {
    const typo = info?.sections?.typography?.fields;
    const synced = syncTypographyLanguagesFromOrder(
      typo || {},
      nextOrderLanguageIds,
      brandingBuildOptionsRef.current.languageList
    );
    const prevLangs = JSON.stringify(typo?.languages ?? []);
    const nextLangs = JSON.stringify(synced.languages ?? []);
    const prevStyles = JSON.stringify(typo?.fontStylesByLanguage ?? {});
    const nextStyles = JSON.stringify(synced.fontStylesByLanguage ?? {});
    const prevFontFiles = JSON.stringify(typo?.fontFilesByLanguage ?? {});
    const nextFontFiles = JSON.stringify(synced.fontFilesByLanguage ?? {});
    if (
      prevLangs === nextLangs &&
      prevStyles === nextStyles &&
      prevFontFiles === nextFontFiles
    ) {
      return info;
    }

    return {
      ...info,
      sections: {
        ...info.sections,
        typography: {
          ...info.sections.typography,
          fields: synced,
        },
      },
    };
  }, []);

  useEffect(() => {
    setBrandingInfo((prev) => {
      const updated = syncTypographyFromOrderLanguages(prev, orderLanguageIds);
      if (updated === prev) return prev;
      pushBrandingToParent(updated);
      return updated;
    });

    setPendingTypographyFontFiles((prev) => {
      // Keep pending fonts aligned to active typography languages (saved), not Order Details.
      const typoLangs =
        brandingInfoRef.current?.sections?.typography?.fields?.languages;
      const activeSource =
        Array.isArray(typoLangs) && typoLangs.length > 0
          ? typoLangs
          : orderLanguageIds;
      const activeLanguageIds = new Set(activeSource.map(String));
      const next = Object.fromEntries(
        Object.entries(prev).filter(([languageId]) => activeLanguageIds.has(String(languageId)))
      );
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      pushBrandingToParent(
        brandingInfoRef.current,
        pendingRef.current,
        deletedRef.current,
        next,
        deletedFontBlobNamesRef.current
      );
      return next;
    });
  }, [orderLanguageIds, syncTypographyFromOrderLanguages, pushBrandingToParent]);

  useEffect(() => {
    if (!brandingBuildOptions.languageList.length) return;
    setBrandingInfo((prev) => {
      const nextSections = remapTypographyLanguagesToIds(
        prev.sections,
        brandingBuildOptions.languageList
      );
      const prevLangs = prev.sections?.typography?.fields?.languages;
      const nextLangs = nextSections?.typography?.fields?.languages;
      if (JSON.stringify(prevLangs) === JSON.stringify(nextLangs)) return prev;
      const updated = { ...prev, sections: nextSections };
      pushBrandingToParent(updated);
      return updated;
    });
  }, [brandingBuildOptions.languageList, pushBrandingToParent]);

  useEffect(() => {
    if (!fontFamilyList?.data?.length) return;
    setBrandingInfo((prev) => {
      const typo = prev.sections?.typography?.fields;
      if (!typo) return prev;
      const nextFields = normalizeTypographyFontNames(typo, fontFamilyList.data);
      if (JSON.stringify(nextFields) === JSON.stringify(typo)) return prev;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          typography: { ...prev.sections.typography, fields: nextFields },
        },
      };
    });
  }, [fontFamilyList?.data]);

  const previewSections = useMemo(
    () =>
      buildBrandingPreviewSections({
        brandingInfo,
        languageListData: languageList?.data || [],
        fontFamilyListData: fontFamilyList?.data || [],
        sectionAttachmentsBySection,
        pendingAttachments: pendingSectionAttachments,
        deletedAttachmentIds,
        translate: (key, fallback) => t(`order_view.${key}`, fallback),
        includeAttachments: false,
        includeSectionNotes: true,
      }),
    [
      brandingInfo,
      languageList?.data,
      fontFamilyList?.data,
      sectionAttachmentsBySection,
      pendingSectionAttachments,
      deletedAttachmentIds,
    ]
  );

  const scraperJob = formData?.branding?.scraperJob;
  const availableScraperSources = scraperJob?.availableSources || [];
  // Keep completed sources selectable while a sibling is still extracting.
  const showSectionSourceTabs = availableScraperSources.length > 0;
  const persistedSectionSources = useMemo(
    () =>
      BRANDING_SECTION_IDS.reduce((sources, sectionId) => {
        const sourceId = mapScrapperTypeToTabId(
          brandingInfo?.sections?.[sectionId]?.activeSource,
        );
        if (sourceId) {
          sources[sectionId] = sourceId;
        }
        return sources;
      }, {}),
    [brandingInfo?.sections],
  );
  const sectionSources = useMemo(
    () => ({
      ...persistedSectionSources,
      ...(scraperJob?.sectionSources || {}),
    }),
    [persistedSectionSources, scraperJob?.sectionSources],
  );

  const buildScrapedSectionFromSource = useCallback(
    (sectionId, sourceId) => {
      const sourceBranding = scraperJob?.resultsBySource?.[sourceId];
      if (!sourceBranding) return null;

      const hydrated = applyScrapedSectionsFromSource({
        currentBranding: {
          ...(formData?.branding || {}),
          sections: brandingInfoRef.current?.sections,
          commentsBySection: brandingInfoRef.current?.commentsBySection,
          guidelineNotes: brandingInfoRef.current?.guidelineNotes ?? "",
        },
        sourceCustomerBranding: sourceBranding,
        sectionIds: [sectionId],
        activeSource: sourceId,
        options: brandingBuildOptionsRef.current,
      });

      return hydrated;
    },
    [formData?.branding, scraperJob?.resultsBySource],
  );

  const shouldConfirmSectionSourceChange = useCallback(
    (sectionId, sourceId) => {
      if (sectionSources[sectionId] !== sourceId) return true;

      const hydrated = buildScrapedSectionFromSource(sectionId, sourceId);
      if (!hydrated) return false;

      return (
        JSON.stringify(hydrated.sections?.[sectionId]) !==
        JSON.stringify(brandingInfoRef.current?.sections?.[sectionId])
      );
    },
    [buildScrapedSectionFromSource, sectionSources],
  );

  const handleSectionSourceChange = useCallback(
    (sectionId, sourceId) => {
      const hydrated = buildScrapedSectionFromSource(sectionId, sourceId);
      if (!hydrated) return;

      const updated = {
        ...brandingInfoRef.current,
        sections: hydrated.sections,
      };
      setBrandingInfo(updated);
      pushBrandingToParent(updated);

      setFormData?.((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          sections: hydrated.sections,
          scraperJob: {
            ...prev.branding?.scraperJob,
            sectionSources: {
              ...(prev.branding?.scraperJob?.sectionSources || {}),
              [sectionId]: sourceId,
            },
          },
        },
      }));
    },
    [buildScrapedSectionFromSource, pushBrandingToParent, setFormData],
  );

  const handleSectionSourceReset = useCallback(
    (sectionId) => {
      const currentSection = brandingInfoRef.current?.sections?.[sectionId];
      if (!currentSection) return;

      const updated = {
        ...brandingInfoRef.current,
        sections: {
          ...brandingInfoRef.current.sections,
          [sectionId]: {
            ...currentSection,
            activeSource: "",
          },
        },
      };
      setBrandingInfo(updated);
      pushBrandingToParent(updated);

      setFormData?.((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          sections: updated.sections,
          scraperJob: {
            ...prev.branding?.scraperJob,
            sectionSources: {
              ...(prev.branding?.scraperJob?.sectionSources || {}),
              [sectionId]: "",
            },
          },
        },
      }));
    },
    [pushBrandingToParent, setFormData],
  );

  return {
    activeSectionId,
    setActiveSectionId,
    previewOpen,
    setPreviewOpen,
    feedbackModalOpen,
    setFeedbackModalOpen,
    feedbackDraft,
    setFeedbackDraft,
    guidelineNotes,
    handleGuidelineNotesChange,
    sectionFeedbackList,
    addSectionFeedback,
    editSectionFeedback,
    getCurrentAuthorName,
    fieldErrors,
    activeSectionFields,
    sectionFieldDefinitions,
    sectionTitle,
    previewSections,
    handleFieldChange,
    fontFamilyList,
    addFontFamilyList,
    getFontFamilyList,
    languageList,
    pendingSectionAttachments,
    pendingTypographyFontFiles,
    getExistingAttachmentsForSection,
    getExistingTypographyFontAttachments,
    stageSectionFiles,
    stageTypographyFontFile,
    removeTypographyFontFile,
    markTypographyFontAttachmentDeleted,
    removePendingFile,
    markAttachmentDeleted,
    attachmentsLoading,
    fetchSectionAttachments,
    exportIconEntries,
    getExistingAttachmentForExportIconEntry,
    addExportIconEntry,
    removeExportIconEntry,
    updateExportIconName,
    stageExportIconFile,
    removeExportIconPendingFile,
    markExportIconAttachmentDeleted,
    colorSchemeFields,
    primaryColorAlternatives,
    secondaryColorAlternatives,
    selectPrimaryColorAlternative,
    selectSecondaryColorAlternative,
    getFieldColorAlternatives,
    getLanguageFontAlternatives,
    updatePrimaryColorAt,
    addPrimaryColor,
    removePrimaryColorAt,
    reorderPrimaryColors,
    updateSecondaryColorAt,
    addSecondaryColor,
    removeSecondaryColorAt,
    reorderSecondaryColors,
    buildBrandingSaveFormData,
    isBrandingV2Dirty: checkBrandingV2Dirty,
    isBrandingGuidelinesDirty: checkBrandingGuidelinesDirty,
    resetBrandingBaseline,
    validateBrandingForm,
    brandingSections: brandingInfo?.sections,
    scraperJob,
    showSectionSourceTabs,
    availableScraperSources,
    sectionSources,
    shouldConfirmSectionSourceChange,
    handleSectionSourceChange,
    handleSectionSourceReset,
  };
};

export default useBrandingForm;

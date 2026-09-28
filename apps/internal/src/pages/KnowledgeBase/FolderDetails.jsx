import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { t } from "i18next";
import { useNavigate, useParams } from "react-router-dom";
import { classNames } from "@euroland/libs";
import { createColumnHelper } from "@tanstack/react-table";
import { useToast } from "@orion/shared";
import { pencilSimpleLine, trashFull } from "assets/images";
import DeleteConfirmModal from "components/common/DeleteConfirmModal";
import AttachmentPreview from "components/common/AttachmentPreview/AttachmentPreview";
import useKnowledgeBase from "hooks/useKnowledgeBase";
import { fetchKbAttachmentBlob } from "services";
import AccessRequired from "pages/Unauthorized/AccessRequired";
import CreateFolderModal from "./components/CreateFolderModal";
import AddAttachmentModal from "./components/AddAttachmentModal";
import AddLinkModal from "./components/AddLinkModal";
import KbBreadcrumb from "./components/KbBreadcrumb";
import KbFolderNameCell from "./components/KbFolderNameCell";
import KbIdentityHeader, {
  KbAddAttachmentButton,
  KbAddLinkButton,
  KbCreateFolderButton,
  KbCreateIssueButton,
} from "./components/KbIdentityHeader";
import KbNotFoundState from "./components/KbNotFoundState";
import KbTableShell from "./components/KbTableShell";
import KbTypeIcon from "./components/KbTypeIcon";
import { useKbSearch } from "./components/KbSearchContext";
import KbSearchResultsPanel from "./components/KbSearchResultsPanel";
import {
  IssueFormModal,
  buildIssueDetailPath,
  isHelpdeskIssueResolutionFolder,
  isHelpdeskToolFolder,
  toIssueTableRow,
} from "./issues";
import {
  buildKbBreadcrumbItems,
  folderHasChildren,
  formatDisplayDate,
  getNestedFolderItems,
  isKbManualContent,
} from "./utils";
import { renderKbUserCell } from "./components/KbUserCell";
// import KbSearchDock from "./components/KbSearchDock";

const columnHelper = createColumnHelper();

const FolderDetails = () => {
  const { kbId, folderId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSearchActive, pendingAttachmentPreview, clearPendingAttachmentPreview } =
    useKbSearch();
  const [
    {
      allRows,
      findById,
      loading: catalogLoading,
      loaded: catalogLoaded,
      canAccessKb,
      getCanManage,
      isFoldersLoading,
      isFolderItemsLoading,
      isFolderItemsLoadingMore,
      hasMoreFolderItems,
      getFolderById,
      getFolderPath,
      getMergedItems,
      getItemCount,
      getIssues,
      isIssuesLoading,
      isIssuesLoadingMore,
      hasMoreIssues,
    },
    {
      loadKbFolders,
      loadFolderItems,
      loadMoreFolderItems,
      loadFolderIssues,
      loadMoreFolderIssues,
      createFolder,
      updateFolder,
      deleteFolderCascade,
      addAttachments,
      deleteAttachment,
      addLink,
      updateLink,
      deleteLink,
      createIssue,
      updateIssue,
    },
  ] = useKnowledgeBase({ applyPermissions: true });

  const canManage = getCanManage(kbId);
  const knowledgeBase = findById(kbId);
  const accessDenied = catalogLoaded && !canAccessKb(kbId);

  const [expandedIds, setExpandedIds] = useState({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderParentId, setFolderParentId] = useState(folderId);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [foldersLookupDone, setFoldersLookupDone] = useState(false);

  useEffect(() => {
    // Soft load for deep-links; no-op when KnowledgeBaseDetails already filled cache.
    if (!kbId || !catalogLoaded || !knowledgeBase || !canAccessKb(kbId)) {
      setFoldersLookupDone(false);
      return undefined;
    }
    let cancelled = false;
    setFoldersLookupDone(false);
    loadKbFolders(kbId)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFoldersLookupDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [kbId, knowledgeBase, catalogLoaded, canAccessKb, loadKbFolders]);

  useEffect(() => {
    if (!pendingAttachmentPreview || isSearchActive) return;
    const previewFolderId = pendingAttachmentPreview.folderId;
    if (
      previewFolderId != null &&
      String(previewFolderId) !== String(folderId)
    ) {
      return;
    }
    setPreviewAttachment(pendingAttachmentPreview);
    clearPendingAttachmentPreview();
  }, [
    clearPendingAttachmentPreview,
    folderId,
    isSearchActive,
    pendingAttachmentPreview,
  ]);

  useEffect(() => {
    setFolderParentId(folderId);
  }, [folderId]);

  const folder = useMemo(
    () => getFolderById(folderId),
    [getFolderById, folderId],
  );

  const folderPath = useMemo(
    () => getFolderPath(folderId),
    [folderId, getFolderPath],
  );

  const resolvedParentFolder = useMemo(() => {
    if (folder?.parentId) return getFolderById(folder.parentId);
    if (folderPath.length >= 2) return folderPath[folderPath.length - 2];
    return null;
  }, [folder?.parentId, folderPath, getFolderById]);

  const showIssueManagement = isHelpdeskToolFolder({
    kb: knowledgeBase,
    folder,
    folderPath,
    parentFolder: resolvedParentFolder,
  });
  const isIrFolder = isHelpdeskIssueResolutionFolder({
    kb: knowledgeBase,
    folder,
  });

  // Normal folders + IR itself: getKbFolderItems.
  // IR tool subfolders: getKbIssues only (skip getKbFolderItems).
  useEffect(() => {
    if (
      !folderId ||
      !catalogLoaded ||
      !knowledgeBase ||
      !canAccessKb(kbId) ||
      showIssueManagement
    ) {
      return;
    }
    loadFolderItems(folderId, { force: true }).catch(() => {});
  }, [
    folderId,
    kbId,
    knowledgeBase,
    catalogLoaded,
    canAccessKb,
    loadFolderItems,
    showIssueManagement,
  ]);

  useEffect(() => {
    if (showIssueManagement && folderId && canAccessKb(kbId)) {
      loadFolderIssues(folderId, { force: true }).catch(() => {});
    }
  }, [folderId, kbId, canAccessKb, loadFolderIssues, showIssueManagement]);

  const issueRows = useMemo(() => {
    if (!showIssueManagement) return [];
    return getIssues(folderId).map(toIssueTableRow);
  }, [folderId, getIssues, showIssueManagement]);

  const filteredItems = useMemo(() => {
    const folderItems = getMergedItems(folderId).filter((item) => {
      if (showIssueManagement) return false;
      if (isIrFolder && item.kind !== "Folder") return false;
      return true;
    });
    const issues = showIssueManagement ? issueRows : [];
    return [...folderItems, ...issues];
  }, [
    folderId,
    getMergedItems,
    isIrFolder,
    issueRows,
    showIssueManagement,
  ]);

  const tableRows = useMemo(() => {
    const rows = [];
    filteredItems.forEach((item) => {
      rows.push({
        ...item,
        rowKind: "item",
        depth: 0,
      });
      if (
        !isIrFolder &&
        item.kind === "Folder" &&
        expandedIds[item.id]
      ) {
        const nestedChildren = getNestedFolderItems(item, getMergedItems);
        nestedChildren.forEach((child) => {
          rows.push({
            ...child,
            id: `nested-${child.kind}-${child.id}`,
            rowKind: "nested",
            depth: 1,
            parentId: item.ref?.id || item.id,
          });
        });
      }
    });
    return rows;
  }, [
    expandedIds,
    filteredItems,
    getMergedItems,
    isIrFolder,
  ]);

  const toggleExpand = useCallback(
    (id) => {
      setExpandedIds((prev) => {
        const opening = !prev[id];
        return {
          ...prev,
          [id]: opening,
        };
      });
    },
    [],
  );

  const handleScrollEnd = useCallback(() => {
    if (
      !showIssueManagement &&
      hasMoreFolderItems(folderId) &&
      !isFolderItemsLoadingMore(folderId)
    ) {
      loadMoreFolderItems(folderId).catch(() => {
        showToast({
          message: t("knowledge_base.save_failed"),
          variant: "danger",
        });
      });
    }

    if (
      showIssueManagement &&
      hasMoreIssues(folderId) &&
      !isIssuesLoadingMore(folderId)
    ) {
      loadMoreFolderIssues(folderId).catch(() => {
        showToast({
          message: t("knowledge_base.save_failed"),
          variant: "danger",
        });
      });
    }
  }, [
    folderId,
    hasMoreFolderItems,
    hasMoreIssues,
    isFolderItemsLoadingMore,
    isIssuesLoadingMore,
    loadMoreFolderItems,
    loadMoreFolderIssues,
    showIssueManagement,
    showToast,
  ]);

  const listHasMore = useMemo(() => {
    if (showIssueManagement) return hasMoreIssues(folderId);
    return hasMoreFolderItems(folderId);
  }, [folderId, hasMoreFolderItems, hasMoreIssues, showIssueManagement]);

  const fetchKbPreviewBlob = useCallback((attachment) => {
    const id = attachment?.id;
    if (!id) {
      return Promise.reject(new Error("Attachment id required"));
    }
    const name =
      attachment.fileName || attachment.documentName || attachment.file_name || "preview";
    return fetchKbAttachmentBlob({
      id,
      fileName: name,
      file_name: name,
    });
  }, []);

  const handleSaveFolder = async ({ name, description, folder: editFolder }) => {
    try {
      if (editFolder?.id) {
        await updateFolder({
          id: editFolder.id,
          name,
          description,
          kbId,
          parentFolderId: editFolder.parentId ?? null,
        });
        showToast({
          message: t("knowledge_base.folder_updated"),
          variant: "success",
        });
        return;
      }
      if (isIrFolder) {
        showToast({
          message: t("knowledge_base.ir_folder_create_restricted"),
          variant: "warning",
        });
        return;
      }
      await createFolder({
        kbId,
        parentId: folderParentId || folderId,
        name,
        description,
      });
      showToast({
        message: t("knowledge_base.folder_created"),
        variant: "success",
      });
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
        variant: "danger",
      });
      throw err;
    }
  };

  const handleSaveAttachment = async ({ documentName, description, files }) => {
    try {
      await addAttachments({
        folderId,
        documentName,
        description,
        files,
        kbId,
      });
      showToast({
        message: t("knowledge_base.attachment_added"),
        variant: "success",
      });
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
        variant: "danger",
      });
      throw err;
    }
  };

  const handleSaveLink = async ({ name, url, description, link }) => {
    try {
      if (link?.id) {
        await updateLink({
          id: link.id,
          name,
          url,
          description,
          folderId,
          kbId,
        });
        showToast({
          message: t("knowledge_base.link_updated"),
          variant: "success",
        });
        return;
      }
      await addLink({ folderId, name, url, description, kbId });
      showToast({
        message: t("knowledge_base.link_added"),
        variant: "success",
      });
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
        variant: "danger",
      });
      throw err;
    }
  };

  const handleSaveIssue = async (values) => {
    try {
      const { toolFolderId: targetFolderId, ...issueValues } = values;
      if (editingIssue?.id) {
        await updateIssue({
          id: editingIssue.id,
          kbId,
          knowledgeBaseId: kbId,
          folderId: editingIssue.folderId || folderId,
          ...issueValues,
        });
        showToast({
          message: t("knowledge_base.issue_updated"),
          variant: "success",
        });
        return;
      }
      await createIssue({
        ...issueValues,
        kbId,
        knowledgeBaseId: kbId,
        folderId: targetFolderId || folderId,
        parentFolderId: folder?.parentId || folderId,
      });
      showToast({
        message: t("knowledge_base.issue_created"),
        variant: "success",
      });
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
        variant: "danger",
      });
      throw err;
    }
  };

  const openIssueEditor = useCallback((issue) => {
    if (!issue) return;
    setEditingIssue(issue);
    setShowIssueModal(true);
  }, []);

  const openIssue = useCallback(
    (row) => {
      const issueId = row?.ref?.id;
      if (!issueId) return;
      const issueFolderId = row.ref?.folderId || row.parentId || folderId;
      navigate(buildIssueDetailPath(kbId, issueFolderId, issueId));
    },
    [folderId, kbId, navigate],
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "Folder") {
        await deleteFolderCascade(deleteTarget.ref.id, kbId, folderId);
        showToast({
          message: t("knowledge_base.folder_deleted"),
          variant: "success",
        });
      } else if (deleteTarget.kind === "Attachment") {
        await deleteAttachment(deleteTarget.ref.id, folderId, kbId);
        showToast({
          message: t("knowledge_base.attachment_deleted"),
          variant: "success",
        });
      } else if (deleteTarget.kind === "Link") {
        await deleteLink(deleteTarget.ref.id, folderId, kbId);
        showToast({
          message: t("knowledge_base.link_deleted"),
          variant: "success",
        });
      }
      setDeleteTarget(null);
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
        variant: "danger",
      });
    }
  };

  const columns = useMemo(
    () =>
      showIssueManagement
        ? [
            columnHelper.accessor("name", {
              header: () => (
                <span className="order_orion_header">
                  {t("knowledge_base.issue_title")}
                </span>
              ),
              cell: (info) => (
                <button
                  type="button"
                  className="btn btn-0 p-0 border-0 text-start knowledge-base-hub__issue-title-link"
                  onClick={() => openIssue(info.row.original)}
                >
                  {info.getValue()}
                </button>
              ),
            }),
            columnHelper.accessor("issueType", {
              header: () => (
                <span className="order_orion_header">
                  {t("knowledge_base.issue_type")}
                </span>
              ),
              cell: (info) => info.getValue() || "—",
            }),
            columnHelper.accessor("issueSubtype", {
              header: () => (
                <span className="order_orion_header">
                  {t("knowledge_base.issue_subtype")}
                </span>
              ),
              cell: (info) => info.getValue() || "—",
            }),
            columnHelper.accessor("tagsLabel", {
              header: () => (
                <span className="order_orion_header">
                  {t("knowledge_base.tags")}
                </span>
              ),
              cell: (info) => info.getValue() || "—",
            }),
            columnHelper.accessor("by", {
              header: () => (
                <span className="order_orion_header">
                  {t("knowledge_base.created_by")}
                </span>
              ),
              cell: (info) => renderKbUserCell(info.getValue()),
            }),
            columnHelper.accessor("date", {
              header: () => (
                <span className="order_orion_header">
                  {t("knowledge_base.date")}
                </span>
              ),
              cell: (info) => formatDisplayDate(info.getValue()),
            }),
            columnHelper.accessor("action", {
              header: () => (
                <span className="order_orion_header serial_no">
                  {t("order_orion_v2.action")}
                </span>
              ),
              cell: (info) => {
                const row = info.row.original;
                return (
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
                      title={t("knowledge_base.view")}
                      aria-label={t("knowledge_base.view")}
                      onClick={() => openIssue(row)}
                    >
                      <span className="icon-open-eye" aria-hidden="true" />
                    </button>
                    {canManage && isKbManualContent(row) ? (
                      <button
                        type="button"
                        className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
                        title={t("common.edit")}
                        aria-label={t("common.edit")}
                        onClick={() => openIssueEditor(row.ref)}
                      >
                        <img src={pencilSimpleLine} alt="" />
                      </button>
                    ) : null}
                  </div>
                );
              },
              canSort: false,
            }),
          ]
        : [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("settings.master_data.kb_col_sno")}
          </span>
        ),
        cell: (info) => {
          if (info.row.original.rowKind === "nested") return "";
          const idx = filteredItems.findIndex(
            (item) =>
              item.kind === info.row.original.kind &&
              String(item.id) === String(info.row.original.id),
          );
          return idx >= 0 ? idx + 1 : "";
        },
        canSort: false,
      }),
      columnHelper.accessor("name", {
        header: () => (
          <span className="order_orion_header">{t("knowledge_base.name")}</span>
        ),
        cell: (info) => {
          const row = info.row.original;
          const isNested = row.rowKind === "nested";
          const typeIcon = (
            <KbTypeIcon kind={row.kind} fileType={row.ref?.fileType} />
          );
          const nameCellClass = classNames(
            "knowledge-base-hub__name-cell",
            isNested && "knowledge-base-hub__child-name",
          );

          if (row.kind === "Folder") {
            const realId = row.ref?.id || row.id;
            return (
              <KbFolderNameCell
                name={row.name}
                hasChildren={
                  !isIrFolder &&
                  folderHasChildren(row, {
                    getItemCount,
                    getMergedItems,
                  })
                }
                expanded={Boolean(expandedIds[realId])}
                onToggleExpand={() => toggleExpand(realId)}
                onOpen={() =>
                  navigate(`/knowledge-base/${kbId}/folder/${realId}`)
                }
                typeIcon={typeIcon}
                nameCellClass={nameCellClass}
              />
            );
          }
          if (row.kind === "Issue") {
            return (
              <button
                type="button"
                className={classNames(
                  "btn btn-0 p-0 border-0 text-start",
                  nameCellClass,
                )}
                onClick={() => openIssue(row)}
              >
                {typeIcon}
                <span>{row.name}</span>
              </button>
            );
          }
          if (row.kind === "Link") {
            return (
              <a
                href={row.url || row.ref?.url}
                target="_blank"
                rel="noreferrer"
                className={classNames("text-decoration-none", nameCellClass)}
              >
                {typeIcon}
                <span>{row.name}</span>
              </a>
            );
          }
          return (
            <button
              type="button"
              className={classNames(
                "btn btn-0 p-0 border-0 text-start",
                nameCellClass,
              )}
              onClick={() => setPreviewAttachment(row.ref)}
            >
              {typeIcon}
              <span>{row.name}</span>
            </button>
          );
        },
      }),
      columnHelper.accessor("description", {
        header: () => (
          <span className="order_orion_header">
            {t("knowledge_base.description")}
          </span>
        ),
        cell: (info) => {
          const row = info.row.original;
          if (row.kind === "Link") {
            return (
              <div>
                {row.description ? (
                  <div className="text-secondary small">{row.description}</div>
                ) : null}
                <a
                  href={row.url || row.ref?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="small text-decoration-none text-break"
                >
                  {row.url || row.ref?.url}
                </a>
              </div>
            );
          }
          return info.getValue() || "—";
        },
      }),
      columnHelper.accessor("by", {
        header: () => (
          <span className="order_orion_header">
            {t("knowledge_base.created_uploaded_by")}
          </span>
        ),
        cell: (info) => renderKbUserCell(info.row.original.by),
      }),
      columnHelper.accessor("date", {
        header: () => (
          <span className="order_orion_header">{t("knowledge_base.date")}</span>
        ),
        cell: (info) => formatDisplayDate(info.getValue()),
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("order_orion_v2.action")}
          </span>
        ),
        cell: (info) => {
          const row = info.row.original;
          const actions = [];
          if (row.kind === "Issue") {
            actions.push(
              <button
                key="view"
                type="button"
                className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
                title={t("knowledge_base.view")}
                onClick={() => openIssue(row)}
              >
                <span className="icon-open-eye" aria-hidden="true" />
              </button>,
            );
            if (canManage && !isIrFolder && isKbManualContent(row)) {
              actions.push(
                <button
                  key="edit"
                  type="button"
                  className="btn btn-0 p-1 border-0"
                  title={t("common.edit")}
                  onClick={() => openIssueEditor(row.ref)}
                >
                  <img src={pencilSimpleLine} alt="" />
                </button>,
              );
            }
          } else if (row.kind === "Folder") {
            actions.push(
              <button
                key="open"
                type="button"
                className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
                title={t("knowledge_base.open")}
                onClick={() =>
                  navigate(
                    `/knowledge-base/${kbId}/folder/${row.ref?.id || row.id}`,
                  )
                }
              >
                <span className="icon-redirect" aria-hidden="true" />
              </button>,
            );
            if (canManage && !isIrFolder && isKbManualContent(row)) {
              actions.push(
                <button
                  key="edit"
                  type="button"
                  className="btn btn-0 p-1 border-0"
                  title={t("common.edit")}
                  onClick={() => {
                    setEditingFolder(row.ref);
                    setFolderParentId(folderId);
                    setShowFolderModal(true);
                  }}
                >
                  <img src={pencilSimpleLine} alt="" />
                </button>,
                <button
                  key="delete"
                  type="button"
                  className="btn btn-0 p-1 border-0"
                  title={t("common.delete")}
                  onClick={() =>
                    setDeleteTarget({
                      kind: "Folder",
                      ref: row.ref,
                      name: row.name,
                    })
                  }
                >
                  <img src={trashFull} alt="" />
                </button>,
              );
            }
          } else if (row.kind === "Attachment") {
            actions.push(
              <button
                key="view"
                type="button"
                className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
                title={t("knowledge_base.view")}
                onClick={() => setPreviewAttachment(row.ref)}
              >
                <span className="icon-open-eye" aria-hidden="true" />
              </button>,
            );
            if (canManage && isKbManualContent(row)) {
              actions.push(
                <button
                  key="delete"
                  type="button"
                  className="btn btn-0 p-1 border-0"
                  title={t("common.delete")}
                  onClick={() =>
                    setDeleteTarget({
                      kind: "Attachment",
                      ref: row.ref,
                      name: row.name,
                    })
                  }
                >
                  <img src={trashFull} alt="" />
                </button>,
              );
            }
          } else if (row.kind === "Link") {
            actions.push(
              <a
                key="open"
                href={row.url || row.ref?.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon text-decoration-none"
                title={t("knowledge_base.open")}
              >
                <span className="icon-redirect" aria-hidden="true" />
              </a>,
            );
            if (canManage && isKbManualContent(row)) {
              actions.push(
                <button
                  key="edit"
                  type="button"
                  className="btn btn-0 p-1 border-0"
                  title={t("common.edit")}
                  onClick={() => {
                    setEditingLink(row.ref);
                    setShowLinkModal(true);
                  }}
                >
                  <img src={pencilSimpleLine} alt="" />
                </button>,
                <button
                  key="delete"
                  type="button"
                  className="btn btn-0 p-1 border-0"
                  title={t("common.delete")}
                  onClick={() =>
                    setDeleteTarget({
                      kind: "Link",
                      ref: row.ref,
                      name: row.name,
                    })
                  }
                >
                  <img src={trashFull} alt="" />
                </button>,
              );
            }
          }
          return (
            <div className="d-flex justify-content-center align-items-center gap-2">
              {actions}
            </div>
          );
        },
        canSort: false,
      }),
    ],
    [
      canManage,
      expandedIds,
      filteredItems,
      folderId,
      getItemCount,
      getMergedItems,
      isIrFolder,
      kbId,
      navigate,
      openIssueEditor,
      openIssue,
      showIssueManagement,
      toggleExpand,
    ],
  );

  const folderBreadcrumbItems = useMemo(
    () =>
      buildKbBreadcrumbItems({
        kbCount: allRows.length,
        knowledgeBase,
        folderPath,
        kbId,
        hubLabel: t("knowledge_base.title"),
      }),
    [allRows.length, folderPath, kbId, knowledgeBase],
  );

  if (accessDenied) {
    return (
      <AccessRequired
        title={t("knowledge_base.access_denied_title")}
        message={t("knowledge_base.access_denied_message")}
        help={t("knowledge_base.access_denied_help")}
      />
    );
  }

  if (catalogLoading || !catalogLoaded) {
    return (
      <div className="knowledge-base-hub__empty text-muted py-5 text-center">
        {t("common.loading")}
      </div>
    );
  }

  if (!knowledgeBase) {
    return <KbNotFoundState />;
  }

  if (!folder && (isFoldersLoading(kbId) || !foldersLookupDone)) {
    return (
      <div className="knowledge-base-hub__empty text-muted py-5 text-center">
        {t("common.loading")}
      </div>
    );
  }

  if (!folder) {
    return <KbNotFoundState />;
  }

return (
  <Fragment>
    <KbBreadcrumb items={folderBreadcrumbItems} />

    {/* <KbSearchDock /> */}

    <KbIdentityHeader
      kind="Folder"
      title={folder?.name}
      description={folder?.description}
      onEdit={
        canManage &&
        !isIrFolder &&
        !showIssueManagement &&
        isKbManualContent(folder)
          ? () => {
              setEditingFolder(folder);
              setShowFolderModal(true);
            }
          : undefined
      }
      actions={
        canManage && showIssueManagement ? (
          <KbCreateIssueButton
            onClick={() => {
              setEditingIssue(null);
              setShowIssueModal(true);
            }}
          />
        ) : canManage && !isIrFolder ? (
          <>
            <KbCreateFolderButton
              onClick={() => {
                setEditingFolder(null);
                setFolderParentId(folderId);
                setShowFolderModal(true);
              }}
            />
            <KbAddAttachmentButton
              onClick={() => setShowAttachmentModal(true)}
            />
            <KbAddLinkButton
              onClick={() => {
                setEditingLink(null);
                setShowLinkModal(true);
              }}
            />
          </>
        ) : null
      }
    />

    {isSearchActive ? (
      <KbSearchResultsPanel />
    ) : (
      <KbTableShell
        columns={columns}
        columnData={tableRows}
        loading={
          isFolderItemsLoading(folderId) ||
          (showIssueManagement && isIssuesLoading(folderId))
        }
        onScrollEnd={handleScrollEnd}
        noDataContent={t("common.no_records")}
        loadingMore={
          isFolderItemsLoadingMore(folderId) ||
          (showIssueManagement && isIssuesLoadingMore(folderId))
        }
        hasMore={listHasMore}
      />
    )}

      {!showIssueManagement && !isIrFolder ? (
        <CreateFolderModal
          show={showFolderModal}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(null);
          }}
          folder={editingFolder}
          onSave={handleSaveFolder}
        />
      ) : null}

      {!isIrFolder && !showIssueManagement ? (
        <>
          <AddAttachmentModal
            show={showAttachmentModal}
            onClose={() => setShowAttachmentModal(false)}
            onSave={handleSaveAttachment}
          />

          <AddLinkModal
            show={showLinkModal}
            onClose={() => {
              setShowLinkModal(false);
              setEditingLink(null);
            }}
            link={editingLink}
            onSave={handleSaveLink}
          />
        </>
      ) : null}

      {showIssueManagement ? (
        <IssueFormModal
          show={showIssueModal}
          onClose={() => {
            setShowIssueModal(false);
            setEditingIssue(null);
          }}
          onSave={handleSaveIssue}
          issue={editingIssue}
          defaultToolFolderId={folderId}
        />
      ) : null}

      {previewAttachment ? (
        <AttachmentPreview
          show
          file={{
            ...previewAttachment,
            file_name:
              previewAttachment.fileName ||
              previewAttachment.file_name ||
              previewAttachment.documentName,
            file_type:
              previewAttachment.fileType || previewAttachment.file_type || "",
          }}
          fetchBlob={fetchKbPreviewBlob}
          onClose={() => setPreviewAttachment(null)}
        />
      ) : null}

      <DeleteConfirmModal
        show={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        confirmDelete={handleDeleteConfirm}
        message={
          <>
            {t("knowledge_base.delete_item_prefix")}{" "}
            <b>{deleteTarget?.name}</b>
            {t("knowledge_base.delete_item_suffix")}
          </>
        }
      />
    </Fragment>
  );
};

export default FolderDetails;

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { t } from "i18next";
import { useNavigate, useParams } from "react-router-dom";
import { createColumnHelper } from "@tanstack/react-table";
import { useToast } from "@orion/shared";
import { pencilSimpleLine, trashFull } from "assets/images";
import DeleteConfirmModal from "components/common/DeleteConfirmModal";
import useKnowledgeBase from "hooks/useKnowledgeBase";
import AccessRequired from "pages/Unauthorized/AccessRequired";
import CreateFolderModal from "./components/CreateFolderModal";
import KbBreadcrumb from "./components/KbBreadcrumb";
import KbFolderNameCell from "./components/KbFolderNameCell";
import KbIdentityHeader, {
  KbCreateFolderButton,
} from "./components/KbIdentityHeader";
import KbNotFoundState from "./components/KbNotFoundState";
import KbTableShell from "./components/KbTableShell";
import KbTypeIcon from "./components/KbTypeIcon";
import { useKbSearch } from "./components/KbSearchContext";
// import KbSearchDock from "./components/KbSearchDock";
import KbSearchResultsPanel from "./components/KbSearchResultsPanel";
import {
  buildKbBreadcrumbItems,
  folderHasChildren,
  formatDisplayDate,
  getNestedFolderItems,
  isKbManualContent,
} from "./utils";
import { renderKbUserCell } from "./components/KbUserCell";

const columnHelper = createColumnHelper();

const KnowledgeBaseDetails = () => {
  const { kbId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSearchActive } = useKbSearch();
  const [
    {
      allRows,
      findById,
      loading: catalogLoading,
      loaded: catalogLoaded,
      canAccessKb,
      getCanManage,
      isFoldersLoading,
      isFoldersLoadingMore,
      hasMoreFolders,
      getRootFolders,
      getMergedItems,
      getItemCount,
    },
    {
      loadKbFolders,
      loadMoreKbFolders,
      createFolder,
      updateFolder,
      deleteFolderCascade,
    },
  ] = useKnowledgeBase({ applyPermissions: true });

  const canManage = getCanManage(kbId);
  const knowledgeBase = findById(kbId);
  const accessDenied = catalogLoaded && !canAccessKb(kbId);

  const [expandedIds, setExpandedIds] = useState({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  useEffect(() => {
    if (kbId && canAccessKb(kbId)) {
      loadKbFolders(kbId).catch(() => {});
    }
  }, [kbId, canAccessKb, loadKbFolders]);

  const rootFolders = useMemo(
    () => getRootFolders(kbId),
    [getRootFolders, kbId],
  );

  const tableRows = useMemo(() => {
    const rows = [];
    rootFolders.forEach((folder) => {
      rows.push({ ...folder, rowKind: "folder", depth: 0 });
      if (expandedIds[folder.id]) {
        getNestedFolderItems(folder, getMergedItems).forEach((item) => {
          rows.push({
            id: `child-${item.kind}-${item.id}`,
            rowKind: "child",
            kind: item.kind,
            name: item.name,
            description:
              item.kind === "Link"
                ? item.url || item.description
                : item.description,
            createdBy: item.by,
            createdDate: item.date,
            depth: 1,
            parentFolderId: folder.id,
            ref: item.ref,
          });
        });
      }
    });
    return rows;
  }, [expandedIds, getMergedItems, rootFolders]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (!hasMoreFolders(kbId) || isFoldersLoadingMore(kbId)) return;
    loadMoreKbFolders(kbId).catch(() => {
      showToast({
        message: t("knowledge_base.save_failed"),
        variant: "danger",
      });
    });
  }, [
    hasMoreFolders,
    isFoldersLoadingMore,
    kbId,
    loadMoreKbFolders,
    showToast,
  ]);

  const openCreate = () => {
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const openEdit = (folder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const openDelete = (folder) => {
    setSelectedFolder(folder);
    setShowDeleteModal(true);
  };

  const handleSaveFolder = async ({ name, description, folder }) => {
    try {
      if (folder?.id) {
        await updateFolder({ id: folder.id, name, description, kbId });
        showToast({
          message: t("knowledge_base.folder_updated"),
          variant: "success",
        });
        return;
      }
      await createFolder({ kbId, parentId: null, name, description });
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

  const handleDeleteConfirm = async () => {
    if (!selectedFolder?.id) return;
    try {
      await deleteFolderCascade(selectedFolder.id, kbId);
      showToast({
        message: t("knowledge_base.folder_deleted"),
        variant: "success",
      });
      setShowDeleteModal(false);
      setSelectedFolder(null);
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
        variant: "danger",
      });
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("settings.master_data.kb_col_sno")}
          </span>
        ),
        cell: (info) => {
          if (info.row.original.rowKind === "child") return "";
          const folderIndex = rootFolders.findIndex(
            (f) => String(f.id) === String(info.row.original.id),
          );
          return folderIndex >= 0 ? folderIndex + 1 : "";
        },
        canSort: false,
      }),
      columnHelper.accessor("name", {
        header: () => (
          <span className="order_orion_header">
            {t("knowledge_base.folder_name")}
          </span>
        ),
        cell: (info) => {
          const row = info.row.original;
          if (row.rowKind === "child") {
            return (
              <span className="knowledge-base-hub__child-name knowledge-base-hub__name-cell">
                <KbTypeIcon kind={row.kind} fileType={row.ref?.fileType} />
                <span>{row.name}</span>
              </span>
            );
          }
          return (
            <KbFolderNameCell
              name={row.name}
              hasChildren={folderHasChildren(row, {
                getItemCount,
                getMergedItems,
              })}
              expanded={Boolean(expandedIds[row.id])}
              onToggleExpand={() => toggleExpand(row.id)}
              onOpen={() => navigate(`/knowledge-base/${kbId}/folder/${row.id}`)}
              typeIcon={<KbTypeIcon kind="Folder" />}
            />
          );
        },
      }),
      columnHelper.accessor("description", {
        header: () => (
          <span className="order_orion_header">
            {t("knowledge_base.description")}
          </span>
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("createdBy", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdBy")}</span>
        ),
        cell: (info) => renderKbUserCell(info.row.original.createdBy),
      }),
      columnHelper.accessor("createdDate", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdDate")}</span>
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
          if (row.rowKind === "child") return "—";
          return (
            <div className="d-flex justify-content-center align-items-center gap-2">
              <button
                type="button"
                className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
                title={t("knowledge_base.open")}
                onClick={() =>
                  navigate(`/knowledge-base/${kbId}/folder/${row.id}`)
                }
              >
                <span className="icon-redirect" aria-hidden="true" />
              </button>
              {canManage && isKbManualContent(row) && (
                <>
                  <button
                    type="button"
                    className="btn btn-0 p-1 border-0"
                    title={t("common.edit")}
                    onClick={() => openEdit(row)}
                  >
                    <img src={pencilSimpleLine} alt="" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-0 p-1 border-0"
                    title={t("common.delete")}
                    onClick={() => openDelete(row)}
                  >
                    <img src={trashFull} alt="" />
                  </button>
                </>
              )}
            </div>
          );
        },
        canSort: false,
      }),
    ],
    [
      canManage,
      expandedIds,
      getItemCount,
      getMergedItems,
      kbId,
      navigate,
      rootFolders,
      toggleExpand,
    ],
  );

  const kbBreadcrumbItems = useMemo(
    () =>
      buildKbBreadcrumbItems({
        kbCount: allRows.length,
        knowledgeBase,
        folderPath: [],
        kbId,
        hubLabel: t("knowledge_base.title"),
      }),
    [allRows.length, kbId, knowledgeBase],
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

  if (!knowledgeBase && !catalogLoading) {
    return (
      <KbNotFoundState />
    );
  }

 return (
  <Fragment>
    {!isSearchActive ? (
      <>
        <KbBreadcrumb items={kbBreadcrumbItems} />

        {/* <KbSearchDock /> */}

        <KbIdentityHeader
          kind="KnowledgeBase"
          title={knowledgeBase?.name}
          description={knowledgeBase?.description}
          actions={
            canManage ? (
              <KbCreateFolderButton onClick={openCreate} />
            ) : null
          }
        />
      </>
    ) : null}

    {isSearchActive ? (
      <KbSearchResultsPanel />
    ) : (
      <KbTableShell
        columns={columns}
        columnData={tableRows}
        loading={catalogLoading || isFoldersLoading(kbId)}
        onScrollEnd={handleScrollEnd}
        noDataContent={t("common.no_records")}
        loadingMore={isFoldersLoadingMore(kbId)}
        hasMore={hasMoreFolders(kbId)}
      />
    )}

    <CreateFolderModal
      show={showFolderModal}
      onClose={() => {
        setShowFolderModal(false);
        setEditingFolder(null);
      }}
      folder={editingFolder}
      onSave={handleSaveFolder}
    />

    <DeleteConfirmModal
      show={showDeleteModal}
      onClose={() => {
        setShowDeleteModal(false);
        setSelectedFolder(null);
      }}
      confirmDelete={handleDeleteConfirm}
      message={
        <>
          {t("knowledge_base.delete_folder_prefix")}{" "}
          <b>{selectedFolder?.name}</b>
          {t("knowledge_base.delete_folder_suffix")}
        </>
      }
    />
  </Fragment>
);
};

export default KnowledgeBaseDetails;

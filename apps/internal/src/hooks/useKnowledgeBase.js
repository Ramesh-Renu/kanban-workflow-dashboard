import { useCallback, useEffect, useMemo, useRef } from "react";
import { useGlobalMaster } from "@orion/shared";
import useAuth from "hooks/useAuth";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  addKbAttachments,
  addUpdateKbFolder,
  addUpdateKbIssue,
  addUpdateKbLink,
  deleteKbAttachment,
  deleteKbFolder,
  deleteKbLink,
  downloadKbAttachment,
  getKbFolderItems,
  getKbFolders,
  getKbIssue,
  getKbIssues,
} from "services";
import {
  KB_PAGE_SIZE,
  asArray,
  assertKbSuccess,
  filterKnowledgeBasesByPermission,
  getKbCanEdit,
  getKbPermissionEntries,
  getKbResponseData,
  hasKbAccess,
  isKnowledgeBaseAdmin,
  keyedFlag,
  mergeKbMasterDetails,
  normalizeAttachment,
  normalizeFolder,
  normalizeFolderItemsPayload,
  normalizeIssue,
  normalizeKnowledgeBase,
  normalizeLink,
  normalizeRecentItem,
  runKbWrite,
  stampFolderItemParentIds,
  toPageMeta,
} from "pages/KnowledgeBase/utils";
import {
  ISSUE_SOURCE,
  buildIssueWritePayload,
  findIssueResolutionFolder,
  isIssueResolutionFolder,
} from "pages/KnowledgeBase/issues/helpdesk";

const findFolderMetaInState = (state, folderId) => {
  const id = String(folderId);
  if (!id || !state) return null;
  for (const list of Object.values(state.foldersByKb || {})) {
    const found = (list || []).find((folder) => String(folder.id) === id);
    if (found) return found;
  }
  for (const entry of Object.values(state.itemsByFolder || {})) {
    const found = (entry?.items || []).find(
      (item) => item.kind === "Folder" && String(item.id) === id,
    );
    if (found) return found.ref || found;
  }
  return null;
};

const findParentFolderIdInItems = (itemsByFolder, folderId) => {
  const id = String(folderId);
  if (!id) return null;
  for (const [parentKey, entry] of Object.entries(itemsByFolder || {})) {
    const hasChild = (entry?.items || []).some(
      (item) => item.kind === "Folder" && String(item.id) === id,
    );
    if (hasChild) return parentKey;
  }
  return null;
};

const useKnowledgeBase = ({ applyPermissions = false } = {}) => {
  const [{ data: auth }] = useAuth();
  const { knowledgeBaseState, dispatch } = useGlobalContext();
  const { knowledgeBaseList, getKnowledgeBaseList } = useGlobalMaster();
  const stateRef = useRef(knowledgeBaseState);
  stateRef.current = knowledgeBaseState;

  const isKbAdmin = isKnowledgeBaseAdmin(auth?.details);
  const catalogFromPermissions = applyPermissions && !isKbAdmin;

  useEffect(() => {
    if (!knowledgeBaseList?.loading && !knowledgeBaseList?.loaded) {
      getKnowledgeBaseList()?.catch?.(() => {});
    }
  }, [getKnowledgeBaseList, knowledgeBaseList]);

  const masterRows = useMemo(
    () => asArray(knowledgeBaseList?.data).map(normalizeKnowledgeBase),
    [knowledgeBaseList?.data],
  );

  const allRows = useMemo(() => {
    if (catalogFromPermissions) {
      return mergeKbMasterDetails(
        getKbPermissionEntries(auth?.details),
        masterRows,
      );
    }
    return masterRows;
  }, [auth?.details, catalogFromPermissions, masterRows]);

  const rows = useMemo(() => {
    if (catalogFromPermissions) return allRows;
    return applyPermissions
      ? filterKnowledgeBasesByPermission(allRows, auth?.details)
      : allRows;
  }, [allRows, applyPermissions, auth?.details, catalogFromPermissions]);

  const findById = useCallback(
    (kbId) => rows.find((kb) => String(kb.id) === String(kbId)) || null,
    [rows],
  );

  const getCanManage = useCallback(
    (kbId) => getKbCanEdit(auth?.details, kbId),
    [auth?.details],
  );

  const canAccessKb = useCallback(
    (kbId) => hasKbAccess(auth?.details, kbId),
    [auth?.details],
  );

  const loadKbFolders = useCallback(
    async (kbId, { force = false } = {}) => {
      const key = String(kbId);
      if (!key) return [];
      const prev = stateRef.current;
      if (!force && (prev.foldersLoading[key] || prev.foldersByKb[key]?.length)) {
        return [];
      }
      dispatch({ type: "KB_FOLDERS_LOADING", payload: { key } });
      try {
        const response = await getKbFolders({
          knowledgeBaseId: kbId,
          page: 1,
          pageSize: KB_PAGE_SIZE,
        });
        assertKbSuccess(response, "Failed to load folders");
        const folders = asArray(response?.data).map(normalizeFolder);
        dispatch({
          type: "KB_FOLDERS_SUCCESS",
          payload: {
            key,
            folders,
            meta: toPageMeta(response, 1, folders.length),
          },
        });
        return folders;
      } catch (error) {
        dispatch({ type: "KB_FOLDERS_ERROR", payload: { key } });
        throw error;
      }
    },
    [dispatch],
  );

  const loadMoreKbFolders = useCallback(
    async (kbId) => {
      const key = String(kbId);
      if (!key) return [];
      const prev = stateRef.current;
      const meta = prev.foldersMetaByKb[key] || {};
      if (
        !meta.hasMore ||
        prev.foldersLoading[key] ||
        prev.foldersLoadingMore[key]
      ) {
        return [];
      }
      const nextPage = (meta.page || 1) + 1;
      dispatch({ type: "KB_FOLDERS_LOADING", payload: { key, more: true } });
      try {
        const response = await getKbFolders({
          knowledgeBaseId: kbId,
          page: nextPage,
          pageSize: KB_PAGE_SIZE,
        });
        assertKbSuccess(response, "Failed to load more folders");
        const pageFolders = asArray(response?.data).map(normalizeFolder);
        dispatch({
          type: "KB_FOLDERS_SUCCESS",
          payload: {
            key,
            folders: pageFolders,
            meta: toPageMeta(response, nextPage, pageFolders.length),
            append: true,
          },
        });
        return pageFolders;
      } catch (error) {
        dispatch({
          type: "KB_FOLDERS_ERROR",
          payload: { key, more: true },
        });
        throw error;
      }
    },
    [dispatch],
  );

  const loadFolderItems = useCallback(
    async (folderId, { force = false } = {}) => {
      const key = String(folderId);
      if (!key) return { items: [], itemCount: 0 };
      const prev = stateRef.current;
      if (
        !force &&
        (prev.itemsLoading[key] ||
          (prev.itemsByFolder[key]?.items &&
            prev.itemsMetaByFolder[key]?.page >= 1))
      ) {
        return { items: [], itemCount: 0 };
      }
      dispatch({ type: "KB_ITEMS_LOADING", payload: { key } });
      try {
        const response = await getKbFolderItems({
          folderId,
          page: 1,
          pageSize: KB_PAGE_SIZE,
        });
        assertKbSuccess(response, "Failed to load folder items");
        const payload = response?.data ?? response;
        const pageSource = payload?.items ? payload : payload?.data || payload;
        const normalized = normalizeFolderItemsPayload(payload);
        const items = stampFolderItemParentIds(normalized.items, folderId);
        const folderSeeds = items
          .filter((item) => item.kind === "Folder" && item.ref?.id != null)
          .map((item) => item.ref);
        dispatch({
          type: "KB_ITEMS_SUCCESS",
          payload: {
            key,
            items,
            itemCount: normalized.itemCount,
            meta: toPageMeta(
              pageSource,
              1,
              pageSource?.total ?? normalized.itemCount,
            ),
          },
        });
        if (folderSeeds.length) {
          const kbKey =
            folderSeeds.find((folder) => folder.kbId)?.kbId ||
            findFolderMetaInState(stateRef.current, folderId)?.kbId ||
            "";
          if (kbKey) {
            dispatch({
              type: "KB_FOLDER_SEED",
              payload: { key: String(kbKey), folders: folderSeeds },
            });
          }
        }
        return {
          items,
          itemCount: normalized.itemCount,
        };
      } catch (error) {
        dispatch({ type: "KB_ITEMS_ERROR", payload: { key } });
        throw error;
      }
    },
    [dispatch],
  );

  const loadMoreFolderItems = useCallback(
    async (folderId) => {
      const key = String(folderId);
      if (!key) return [];
      const prev = stateRef.current;
      const meta = prev.itemsMetaByFolder[key] || {};
      if (
        !meta.hasMore ||
        prev.itemsLoading[key] ||
        prev.itemsLoadingMore[key]
      ) {
        return [];
      }
      const nextPage = (meta.page || 1) + 1;
      dispatch({ type: "KB_ITEMS_LOADING", payload: { key, more: true } });
      try {
        const response = await getKbFolderItems({
          folderId,
          page: nextPage,
          pageSize: KB_PAGE_SIZE,
        });
        assertKbSuccess(response, "Failed to load more items");
        const payload = response?.data ?? response;
        const pageSource = payload?.items ? payload : payload?.data || payload;
        const pageItems = stampFolderItemParentIds(
          (pageSource?.items || [])
            .map(normalizeRecentItem)
            .filter(Boolean),
          folderId,
        );
        dispatch({
          type: "KB_ITEMS_SUCCESS",
          payload: {
            key,
            items: pageItems,
            itemCount: pageSource?.total ?? pageItems.length,
            meta: toPageMeta(
              pageSource,
              nextPage,
              pageSource?.total ?? pageItems.length,
            ),
            append: true,
          },
        });
        const folderSeeds = pageItems
          .filter((item) => item.kind === "Folder" && item.ref?.id != null)
          .map((item) => item.ref);
        if (folderSeeds.length) {
          const kbKey =
            folderSeeds.find((folder) => folder.kbId)?.kbId ||
            findFolderMetaInState(stateRef.current, folderId)?.kbId ||
            "";
          if (kbKey) {
            dispatch({
              type: "KB_FOLDER_SEED",
              payload: { key: String(kbKey), folders: folderSeeds },
            });
          }
        }
        return pageItems;
      } catch (error) {
        dispatch({ type: "KB_ITEMS_ERROR", payload: { key, more: true } });
        throw error;
      }
    },
    [dispatch],
  );

  const findFolderMeta = useCallback(
    (folderId) => findFolderMetaInState(knowledgeBaseState, folderId),
    [knowledgeBaseState.foldersByKb, knowledgeBaseState.itemsByFolder],
  );

  const getRootFolders = useCallback(
    (kbId) =>
      (knowledgeBaseState.foldersByKb[String(kbId)] || []).filter(
        (folder) => !folder.parentId,
      ),
    [knowledgeBaseState.foldersByKb],
  );

  const getIssueResolutionFolder = useCallback(
    (kbId) => {
      const key = String(kbId || "");
      if (!key) return null;
      const fromRoots = findIssueResolutionFolder(
        knowledgeBaseState.foldersByKb[key] || [],
      );
      if (fromRoots) return fromRoots;
      for (const entry of Object.values(knowledgeBaseState.itemsByFolder || {})) {
        const found = (entry?.items || []).find(
          (item) =>
            item.kind === "Folder" &&
            isIssueResolutionFolder(item.ref || item),
        );
        if (found) return found.ref || found;
      }
      return null;
    },
    [knowledgeBaseState.foldersByKb, knowledgeBaseState.itemsByFolder],
  );

  const getFolderById = useCallback(
    (folderId) => findFolderMeta(folderId),
    [findFolderMeta],
  );

  const getMergedItems = useCallback(
    (folderId) => {
      const cached = knowledgeBaseState.itemsByFolder[String(folderId)];
      if (cached?.items) return cached.items;
      return findFolderMeta(folderId)?.recentItems || [];
    },
    [findFolderMeta, knowledgeBaseState.itemsByFolder],
  );

  const getItemCount = useCallback(
    (folderId) => {
      const cached = knowledgeBaseState.itemsByFolder[String(folderId)];
      if (cached && cached.itemCount != null) return cached.itemCount;
      const folder = findFolderMeta(folderId);
      return folder?.itemCount ?? folder?.recentItems?.length ?? 0;
    },
    [findFolderMeta, knowledgeBaseState.itemsByFolder],
  );

  const getFolderPath = useCallback(
    (folderId) => {
      if (!folderId) return [];
      const chain = [];
      const seen = new Set();
      let currentId = String(folderId);
      const itemsByFolder = knowledgeBaseState.itemsByFolder;
      while (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        const folder = findFolderMeta(currentId);
        if (!folder) break;
        chain.unshift(folder);
        let parentId =
          folder.parentId != null && folder.parentId !== ""
            ? String(folder.parentId)
            : null;
        if (!parentId) {
          parentId = findParentFolderIdInItems(itemsByFolder, currentId);
        }
        currentId = parentId;
      }
      return chain;
    },
    [findFolderMeta, knowledgeBaseState.itemsByFolder],
  );

  const loadFolderIssues = useCallback(
    async (folderId, { force = false } = {}) => {
      const key = String(folderId);
      if (!key) return [];
      const prev = stateRef.current;
      if (
        !force &&
        (prev.issuesLoading?.[key] ||
          (prev.issuesByFolder?.[key] &&
            prev.issuesMetaByFolder?.[key]?.page >= 1))
      ) {
        return prev.issuesByFolder?.[key] || [];
      }
      dispatch({ type: "KB_ISSUES_LOADING", payload: { key } });
      try {
        const response = await getKbIssues({
          folderId,
          page: 1,
          pageSize: KB_PAGE_SIZE,
        });
        assertKbSuccess(response, "Failed to load issues");
        const issues = asArray(response?.data).map(normalizeIssue);
        dispatch({
          type: "KB_ISSUES_SUCCESS",
          payload: {
            key,
            issues,
            meta: toPageMeta(response, 1, issues.length),
          },
        });
        return issues;
      } catch (error) {
        dispatch({ type: "KB_ISSUES_ERROR", payload: { key } });
        throw error;
      }
    },
    [dispatch],
  );

  const loadMoreFolderIssues = useCallback(
    async (folderId) => {
      const key = String(folderId);
      if (!key) return [];
      const prev = stateRef.current;
      const meta = prev.issuesMetaByFolder?.[key] || {};
      if (
        !meta.hasMore ||
        prev.issuesLoading?.[key] ||
        prev.issuesLoadingMore?.[key]
      ) {
        return [];
      }
      const nextPage = (meta.page || 1) + 1;
      dispatch({ type: "KB_ISSUES_LOADING", payload: { key, more: true } });
      try {
        const response = await getKbIssues({
          folderId,
          page: nextPage,
          pageSize: KB_PAGE_SIZE,
        });
        assertKbSuccess(response, "Failed to load more issues");
        const pageIssues = asArray(response?.data).map(normalizeIssue);
        dispatch({
          type: "KB_ISSUES_SUCCESS",
          payload: {
            key,
            issues: pageIssues,
            meta: toPageMeta(response, nextPage, pageIssues.length),
            append: true,
          },
        });
        return pageIssues;
      } catch (error) {
        dispatch({
          type: "KB_ISSUES_ERROR",
          payload: { key, more: true },
        });
        throw error;
      }
    },
    [dispatch],
  );

  const loadIssue = useCallback(
    async (issueId, { force = false } = {}) => {
      const key = String(issueId);
      if (!key) return null;
      const prev = stateRef.current;
      if (!force && prev.issueById?.[key] && !prev.issueDetailLoading?.[key]) {
        return prev.issueById[key];
      }
      dispatch({ type: "KB_ISSUE_DETAIL_LOADING", payload: { key } });
      try {
        const response = await getKbIssue({ id: issueId });
        assertKbSuccess(response, "Failed to load issue");
        const payload = getKbResponseData(response);
        const issue = payload ? normalizeIssue(payload) : null;
        dispatch({
          type: "KB_ISSUE_DETAIL_SUCCESS",
          payload: { key, issue },
        });
        return issue;
      } catch (error) {
        dispatch({ type: "KB_ISSUE_DETAIL_ERROR", payload: { key } });
        throw error;
      }
    },
    [dispatch],
  );

  /** Upsert lightweight folder meta (e.g. from search path) so deep links resolve. */
  const seedKbFolders = useCallback(
    (kbId, folders = []) => {
      const key = String(kbId || "");
      const list = (Array.isArray(folders) ? folders : [])
        .map((folder) => normalizeFolder(folder))
        .filter((folder) => folder?.id != null);
      if (!key || !list.length) return;
      dispatch({
        type: "KB_FOLDER_SEED",
        payload: { key, folders: list },
      });
    },
    [dispatch],
  );

  const refreshAfterWrite = useCallback(
    async ({ kbId, folderId, refreshIssues = false }) => {
      if (kbId) await loadKbFolders(kbId, { force: true });
      if (folderId) await loadFolderItems(folderId, { force: true });
      if (refreshIssues && folderId) {
        await loadFolderIssues(folderId, { force: true });
      }
    },
    [loadFolderItems, loadFolderIssues, loadKbFolders],
  );

  const createFolder = useCallback(
    async ({ kbId, parentId = null, name, description = "" }) =>
      runKbWrite({
        request: () =>
          addUpdateKbFolder({
            knowledgeBaseId: kbId,
            parentId: parentId || null,
            name,
            description,
          }),
        failMessage: "Failed to create folder",
        refresh: () =>
          refreshAfterWrite({ kbId, folderId: parentId || null }),
        mapResult: (response) =>
          response?.data
            ? normalizeFolder({
                ...response.data,
                kbId: response.data.kbId ?? kbId,
                parentId: response.data.parentId ?? parentId ?? null,
              })
            : null,
      }),
    [refreshAfterWrite],
  );

  const updateFolder = useCallback(
    async ({ id, name, description = "", kbId, parentFolderId }) => {
      const folder = getFolderById(id);
      return runKbWrite({
        request: () => addUpdateKbFolder({ id, name, description }),
        failMessage: "Failed to update folder",
        refresh: () =>
          refreshAfterWrite({
            kbId: kbId || folder?.kbId,
            folderId: parentFolderId || folder?.parentId || null,
          }),
        mapResult: (response) =>
          response?.data ? normalizeFolder(response.data) : null,
      });
    },
    [getFolderById, refreshAfterWrite],
  );

  const deleteFolderCascade = useCallback(
    async (folderId, kbId, parentFolderId) => {
      const folder = getFolderById(folderId);
      return runKbWrite({
        request: () => deleteKbFolder({ id: folderId }),
        failMessage: "Failed to delete folder",
        refresh: async () => {
          dispatch({
            type: "KB_ITEMS_REMOVE",
            payload: { key: folderId },
          });
          await refreshAfterWrite({
            kbId: kbId || folder?.kbId,
            folderId: parentFolderId || folder?.parentId || null,
          });
        },
      });
    },
    [dispatch, getFolderById, refreshAfterWrite],
  );

  const addAttachments = useCallback(
    async ({ folderId, documentName, description = "", files = [], kbId }) =>
      runKbWrite({
        request: () => {
          const formData = new FormData();
          const knowledgeBaseId = kbId || getFolderById(folderId)?.kbId || "";
          formData.append("folderId", String(folderId));
          formData.append("KnowledgeBaseId", String(knowledgeBaseId));
          formData.append("documentName", documentName || "");
          formData.append("description", description || "");
          (files || []).forEach((file) => formData.append("files", file));
          return addKbAttachments(formData);
        },
        failMessage: "Failed to upload attachments",
        refresh: () => refreshAfterWrite({ kbId, folderId }),
        mapResult: (response) =>
          asArray(response?.data).map(normalizeAttachment),
      }),
    [getFolderById, refreshAfterWrite],
  );

  const deleteAttachment = useCallback(
    async (id, folderId, kbId) =>
      runKbWrite({
        request: () => deleteKbAttachment({ id }),
        failMessage: "Failed to delete attachment",
        refresh: () => refreshAfterWrite({ kbId, folderId }),
        mapResult: () => undefined,
      }),
    [refreshAfterWrite],
  );

  const downloadAttachment = useCallback(async (attachment) => {
    if (!attachment?.id) {
      throw new Error("Attachment id required");
    }
    await downloadKbAttachment({
      id: attachment.id,
      fileName: attachment.fileName || attachment.documentName || "download",
      file_name: attachment.fileName || attachment.documentName || "download",
    });
  }, []);

  const addLink = useCallback(
    async ({ folderId, name, url, description = "", kbId }) =>
      runKbWrite({
        request: () =>
          addUpdateKbLink({ folderId, name, url, description }),
        failMessage: "Failed to create link",
        refresh: () => refreshAfterWrite({ kbId, folderId }),
        mapResult: (response) =>
          response?.data ? normalizeLink(response.data) : null,
      }),
    [refreshAfterWrite],
  );

  const updateLink = useCallback(
    async ({ id, name, url, description = "", folderId, kbId }) =>
      runKbWrite({
        request: () => addUpdateKbLink({ id, name, url, description }),
        failMessage: "Failed to update link",
        refresh: () => refreshAfterWrite({ kbId, folderId }),
        mapResult: (response) =>
          response?.data ? normalizeLink(response.data) : null,
      }),
    [refreshAfterWrite],
  );

  const deleteLink = useCallback(
    async (id, folderId, kbId) =>
      runKbWrite({
        request: () => deleteKbLink({ id }),
        failMessage: "Failed to delete link",
        refresh: () => refreshAfterWrite({ kbId, folderId }),
        mapResult: () => undefined,
      }),
    [refreshAfterWrite],
  );

  const createIssue = useCallback(
    async (payload) =>
      runKbWrite({
        request: () => {
          const body = buildIssueWritePayload(payload);
          return addUpdateKbIssue(body);
        },
        failMessage: "Failed to create issue",
        refresh: () =>
          refreshAfterWrite({
            kbId: payload.knowledgeBaseId || payload.kbId,
            folderId: payload.folderId,
            refreshIssues: true,
          }),
        mapResult: (response) => {
          const payload = getKbResponseData(response);
          return payload ? normalizeIssue(payload) : null;
        },
      }),
    [refreshAfterWrite],
  );

  const updateIssue = useCallback(
    async (payload) => {
      const existing =
        stateRef.current.issueById?.[String(payload.id)] ||
        (stateRef.current.issuesByFolder?.[String(payload.folderId)] || []).find(
          (issue) => String(issue.id) === String(payload.id),
        );
      const isFreshdesk = existing?.sourceType === ISSUE_SOURCE.FRESHDESK;
      const body = buildIssueWritePayload(payload, { freshdesk: isFreshdesk });

      return runKbWrite({
        request: () => addUpdateKbIssue(body),
        failMessage: "Failed to update issue",
        refresh: async () => {
          await refreshAfterWrite({
            kbId: payload.knowledgeBaseId || payload.kbId,
            folderId: payload.folderId,
            refreshIssues: true,
          });
          if (payload.id) await loadIssue(payload.id, { force: true });
        },
        mapResult: (response) => {
          const payload = getKbResponseData(response);
          return payload ? normalizeIssue(payload) : null;
        },
      });
    },
    [loadIssue, refreshAfterWrite],
  );

  const getIssues = useCallback(
    (folderId) => knowledgeBaseState.issuesByFolder?.[String(folderId)] || [],
    [knowledgeBaseState.issuesByFolder],
  );

  const getIssueById = useCallback(
    (issueId) => knowledgeBaseState.issueById?.[String(issueId)] || null,
    [knowledgeBaseState.issueById],
  );

  return [
    {
      allRows,
      rows,
      findById,
      loading: Boolean(knowledgeBaseList?.loading),
      loaded: Boolean(knowledgeBaseList?.loaded),
      error: knowledgeBaseList?.error || null,
      canAccessKb,
      getCanManage,
      getRootFolders,
      getFolderById,
      getFolderPath,
      getIssueResolutionFolder,
      getMergedItems,
      getItemCount,
      isFoldersLoading: (kbId) =>
        keyedFlag(knowledgeBaseState.foldersLoading, kbId),
      isFoldersLoadingMore: (kbId) =>
        keyedFlag(knowledgeBaseState.foldersLoadingMore, kbId),
      hasMoreFolders: (kbId) =>
        Boolean(knowledgeBaseState.foldersMetaByKb[String(kbId)]?.hasMore),
      isFolderItemsLoading: (folderId) =>
        keyedFlag(knowledgeBaseState.itemsLoading, folderId),
      isFolderItemsLoadingMore: (folderId) =>
        keyedFlag(knowledgeBaseState.itemsLoadingMore, folderId),
      hasMoreFolderItems: (folderId) =>
        Boolean(
          knowledgeBaseState.itemsMetaByFolder[String(folderId)]?.hasMore,
        ),
      getIssues,
      getIssueById,
      isIssuesLoading: (folderId) =>
        keyedFlag(knowledgeBaseState.issuesLoading, folderId),
      isIssuesLoadingMore: (folderId) =>
        keyedFlag(knowledgeBaseState.issuesLoadingMore, folderId),
      hasMoreIssues: (folderId) =>
        Boolean(
          knowledgeBaseState.issuesMetaByFolder?.[String(folderId)]?.hasMore,
        ),
      isIssueDetailLoading: (issueId) =>
        keyedFlag(knowledgeBaseState.issueDetailLoading, issueId),
    },
    {
      getKnowledgeBaseList,
      loadKbFolders,
      loadMoreKbFolders,
      loadFolderItems,
      loadMoreFolderItems,
      loadFolderIssues,
      loadMoreFolderIssues,
      loadIssue,
      seedKbFolders,
      createFolder,
      updateFolder,
      deleteFolderCascade,
      addAttachments,
      deleteAttachment,
      downloadAttachment,
      addLink,
      updateLink,
      deleteLink,
      createIssue,
      updateIssue,
    },
  ];
};

export default useKnowledgeBase;

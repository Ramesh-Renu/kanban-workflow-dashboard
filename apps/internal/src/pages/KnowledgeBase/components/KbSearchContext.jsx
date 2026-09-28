import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import useKbSearchQuery from "hooks/useKbSearchQuery";
import useKnowledgeBase from "hooks/useKnowledgeBase";
import { buildIssueDetailPath, findIssueResolutionFolder } from "../issues/helpdesk";
import { buildFolderSeedsFromSearchResult, normalizeFolder } from "../utils";

const KbSearchContext = createContext(null);

/** v2 key — drops noisy partial queries saved by the old auto-track effect. */
const RECENT_SEARCHES_KEY = "kb-recent-searches-v2";
const MAX_RECENT_SEARCHES = 6;

export const KB_SEARCH_SORT = {
  RELEVANCE: "relevance",
  UPDATED: "updated",
  CREATED: "created",
  NAME_ASC: "nameAsc",
  NAME_DESC: "nameDesc",
};

/** UI type value → API `type` query value (empty = all). */
export const mapUiTypeToApiType = (typeFilter) => {
  switch (typeFilter) {
    case "Issue":
    case "Link":
    case "Folder":
    case "Attachment":
      return typeFilter;
    default:
      return "";
  }
};

const resolveDefaultScope = (kbId, folderId) => {
  if (folderId) return "folder";
  if (kbId) return "kb";
  return "all";
};

const buildResultPath = (result) => {
  if (!result?.kbId) return null;
  if (result.type === "KnowledgeBase") {
    return `/knowledge-base/${result.kbId}`;
  }
  if (result.type === "Issue" && result.folderId) {
    return buildIssueDetailPath(result.kbId, result.folderId, result.id);
  }
  if (result.type === "Folder") {
    return `/knowledge-base/${result.kbId}/folder/${result.id}`;
  }
  if (result.folderId) {
    return `/knowledge-base/${result.kbId}/folder/${result.folderId}`;
  }
  return `/knowledge-base/${result.kbId}`;
};

const readRecentSearches = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim())
      : [];
  } catch {
    return [];
  }
};

const writeRecentSearches = (items) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
};

const settle = (promise) =>
  Promise.resolve(promise).catch(() => undefined);

export const KbSearchProvider = ({ children }) => {
  const navigate = useNavigate();
  const { kbId, folderId } = useParams();
  const [
    { rows: accessibleKnowledgeBases, getIssueResolutionFolder, getFolderById },
    { loadKbFolders, loadFolderItems, loadIssue, seedKbFolders },
  ] = useKnowledgeBase({
    applyPermissions: true,
  });

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(() =>
    resolveDefaultScope(kbId, folderId),
  );
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState(KB_SEARCH_SORT.RELEVANCE);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [pendingAttachmentPreview, setPendingAttachmentPreview] =
    useState(null);

  useEffect(() => {
    setScope(resolveDefaultScope(kbId, folderId));
  }, [kbId, folderId]);

  const apiType = useMemo(
    () => mapUiTypeToApiType(typeFilter),
    [typeFilter],
  );

  const accessibleIds = useMemo(
    () =>
      (Array.isArray(accessibleKnowledgeBases)
        ? accessibleKnowledgeBases
        : []
      )
        .map((row) => row?.id)
        .filter((id) => id != null && String(id).trim() !== "")
        .map((id) => String(id)),
    [accessibleKnowledgeBases],
  );

  const knowledgeBaseIds = useMemo(() => {
    if (scope === "kb" || scope === "folder") {
      if (kbId == null || String(kbId).trim() === "") return "";
      return String(kbId);
    }
    return accessibleIds.join(",");
  }, [accessibleIds, kbId, scope]);

  const searchFolderId = scope === "folder" ? folderId : undefined;

  const {
    results,
    loading,
    loadingMore,
    slow,
    error,
    searchedQuery,
    hasMore,
    total,
    minQueryLength,
    searchNow,
    loadMore,
    reset,
  } = useKbSearchQuery({
    query,
    knowledgeBaseIds,
    folderId: searchFolderId,
    type: apiType,
    sort,
    enabled: true,
  });

  const isSearchActive = String(query || "").trim().length >= minQueryLength;

  const rememberSearch = useCallback(
    (raw) => {
      const trimmed = String(raw || "").trim();
      if (trimmed.length < minQueryLength) return;
      setRecentSearches((prev) => {
        const next = [
          trimmed,
          ...prev.filter(
            (item) => item.toLowerCase() !== trimmed.toLowerCase(),
          ),
        ].slice(0, MAX_RECENT_SEARCHES);
        writeRecentSearches(next);
        return next;
      });
    },
    [minQueryLength],
  );

  const resetFilters = useCallback(() => {
    setTypeFilter("all");
    setSort(KB_SEARCH_SORT.RELEVANCE);
    setScope(resolveDefaultScope(kbId, folderId));
  }, [folderId, kbId]);

  const clearSearch = useCallback(() => {
    setQuery("");
    resetFilters();
    reset();
  }, [reset, resetFilters]);

  const clearPendingAttachmentPreview = useCallback(() => {
    setPendingAttachmentPreview(null);
  }, []);

  const exitToKnowledgeBaseHome = useCallback(() => {
    setQuery("");
    setTypeFilter("all");
    setSort(KB_SEARCH_SORT.RELEVANCE);
    setScope("all");
    reset();
    navigate("/knowledge-base");
  }, [navigate, reset]);

  const commitSearch = useCallback(
    (raw) => {
      const trimmed = String(raw !== undefined ? raw : query).trim();
      setQuery(trimmed);
      rememberSearch(trimmed);
      return searchNow(trimmed);
    },
    [query, rememberSearch, searchNow],
  );

  const applyRecentSearch = useCallback(
    (value) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return;
      setQuery(trimmed);
      rememberSearch(trimmed);
      searchNow(trimmed);
    },
    [rememberSearch, searchNow],
  );

  const seedFolderFromResult = useCallback(
    (result, targetFolderId) => {
      const seeds = buildFolderSeedsFromSearchResult(result, targetFolderId);
      if (seeds.length) seedKbFolders(result.kbId, seeds);
    },
    [seedKbFolders],
  );

  /** Ensure Helpdesk IR→tool parent chain exists before navigating to an issue. */
  const hydrateHelpdeskIssueFolder = useCallback(
    async (result) => {
      const kbId = result?.kbId;
      const toolFolderId = result?.folderId;
      if (kbId == null || toolFolderId == null) return;

      let irFolder = getIssueResolutionFolder(kbId);
      if (!irFolder) {
        const path = Array.isArray(result.path) ? result.path : [];
        irFolder = findIssueResolutionFolder(
          path.map((segment) => ({
            id: segment?.id,
            name: segment?.name || segment?.title || "",
          })),
        );
      }

      if (!irFolder?.id) return;

      await settle(loadFolderItems(irFolder.id));

      const toolMeta = getFolderById(toolFolderId);
      const pathSeg = (Array.isArray(result.path) ? result.path : []).find(
        (segment) => String(segment?.id) === String(toolFolderId),
      );
      const toolName =
        toolMeta?.name || pathSeg?.name || pathSeg?.title || "";

      seedKbFolders(kbId, [
        normalizeFolder({
          id: irFolder.id,
          name: irFolder.name || "Issues & Resolutions",
          kbId,
          knowledgeBaseId: kbId,
          parentId: irFolder.parentId ?? null,
        }),
        normalizeFolder({
          id: toolFolderId,
          name: toolName,
          kbId,
          knowledgeBaseId: kbId,
          parentId: irFolder.id,
        }),
      ]);
    },
    [getFolderById, getIssueResolutionFolder, loadFolderItems, seedKbFolders],
  );

  const openResult = useCallback(
    async (result) => {
      if (!result) return;
      rememberSearch(query);

      if (result.type === "Link") {
        if (result.url) {
          window.open(result.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      const targetKbId = result.kbId;
      if (targetKbId == null || String(targetKbId).trim() === "") return;

      if (result.type === "Issue" && !result.folderId) return;

      const go = (path) => {
        if (!path) return;
        clearSearch();
        navigate(path);
      };

      if (result.type === "KnowledgeBase") {
        await settle(loadKbFolders(targetKbId));
        go(`/knowledge-base/${targetKbId}`);
        return;
      }

      if (result.type === "Folder") {
        await settle(loadKbFolders(targetKbId));
        await settle(loadFolderItems(result.id, { force: true }));
        seedFolderFromResult(result, result.id);
        go(`/knowledge-base/${targetKbId}/folder/${result.id}`);
        return;
      }

      if (result.type === "Issue") {
        await Promise.all([
          settle(loadKbFolders(targetKbId)),
          settle(loadIssue(result.id, { force: true })),
        ]);
        seedFolderFromResult(result, result.folderId);
        await hydrateHelpdeskIssueFolder(result);
        go(buildIssueDetailPath(targetKbId, result.folderId, result.id));
        return;
      }

      if (result.folderId) {
        await settle(loadKbFolders(targetKbId));
        await settle(loadFolderItems(result.folderId, { force: true }));
        seedFolderFromResult(result, result.folderId);
        if (result.type === "Attachment") {
          setPendingAttachmentPreview({
            id: result.id,
            folderId: result.folderId,
            fileName: result.title || "",
            documentName: result.title || "",
            fileType: result.fileType || "",
            file_name: result.title || "",
            file_type: result.fileType || "",
          });
        }
        go(`/knowledge-base/${targetKbId}/folder/${result.folderId}`);
        return;
      }

      await settle(loadKbFolders(targetKbId));
      go(`/knowledge-base/${targetKbId}`);
    },
    [
      clearSearch,
      hydrateHelpdeskIssueFolder,
      loadFolderItems,
      loadIssue,
      loadKbFolders,
      navigate,
      query,
      rememberSearch,
      seedFolderFromResult,
    ],
  );

  const value = useMemo(
    () => ({
      query,
      setQuery,
      scope,
      setScope,
      typeFilter,
      setTypeFilter,
      sort,
      setSort,
      recentSearches,
      applyRecentSearch,
      results,
      loading,
      loadingMore,
      slow,
      error,
      searchedQuery,
      hasMore,
      total,
      minQueryLength,
      searchNow,
      loadMore,
      commitSearch,
      clearSearch,
      resetFilters,
      exitToKnowledgeBaseHome,
      reset,
      isSearchActive,
      openResult,
      pendingAttachmentPreview,
      clearPendingAttachmentPreview,
      kbId,
      folderId,
      knowledgeBaseIds,
    }),
    [
      query,
      scope,
      typeFilter,
      sort,
      recentSearches,
      applyRecentSearch,
      results,
      loading,
      loadingMore,
      slow,
      error,
      searchedQuery,
      hasMore,
      total,
      minQueryLength,
      searchNow,
      loadMore,
      commitSearch,
      clearSearch,
      resetFilters,
      exitToKnowledgeBaseHome,
      reset,
      isSearchActive,
      openResult,
      pendingAttachmentPreview,
      clearPendingAttachmentPreview,
      kbId,
      folderId,
      knowledgeBaseIds,
    ],
  );

  return (
    <KbSearchContext.Provider value={value}>{children}</KbSearchContext.Provider>
  );
};

export const useKbSearch = () => {
  const context = useContext(KbSearchContext);
  if (!context) {
    throw new Error("useKbSearch must be used within KbSearchProvider");
  }
  return context;
};

export default KbSearchContext;

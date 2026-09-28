import { useCallback, useEffect, useRef, useState } from "react";
import { searchKb } from "services";
import {
  KB_PAGE_SIZE,
  getKbResponseData,
  toKbUser,
} from "pages/KnowledgeBase/utils";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

const SCORE_LABELS = new Set(["high", "medium", "low"]);

const normalizeScoreLabel = (value) => {
  const label = String(value || "")
    .trim()
    .toLowerCase();
  return SCORE_LABELS.has(label) ? label : undefined;
};

const normalizePath = (path) => {
  if (!Array.isArray(path)) return [];
  return path
    .map((segment) => {
      if (!segment) return null;
      if (typeof segment === "string") return { id: segment, name: segment };
      const id = segment.id ?? segment.folderId ?? segment.kbId;
      const name = segment.name || segment.title || String(id ?? "");
      if (id == null && !name) return null;
      return { id, name };
    })
    .filter(Boolean);
};

const firstUserFromField = (value) => {
  if (Array.isArray(value)) return value[0] || null;
  if (value && typeof value === "object") return value;
  return null;
};

const pickResultUser = (item, keys) => {
  for (const key of keys) {
    const value = item[key];
    const fromField = firstUserFromField(value);
    if (fromField) {
      const user = toKbUser(fromField);
      if (user) return user;
    }
    if (typeof value === "string") {
      const user = toKbUser(value);
      if (user) return user;
    }
  }
  return null;
};

const pickResultDate = (item, keys) => {
  for (const key of keys) {
    if (item[key] != null && item[key] !== "") return item[key];
  }
  return "";
};

const unwrapSearchPayload = (payload) => {
  if (payload == null) return [];

  // Mock helpers return `{ results: [...] }` directly.
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;

  const data = getKbResponseData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const resolveSearchHasMore = (payload, pageCount, pageSize) => {
  const candidates = [payload, payload?.data, payload?.data?.data].filter(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );
  const meta = candidates.find((value) => value.hasMore != null);
  if (meta?.hasMore != null) return Boolean(meta.hasMore);
  return pageCount >= pageSize;
};

const resolveSearchTotal = (payload, pageCount, append, previousTotal) => {
  const candidates = [payload, payload?.data, payload?.data?.data].filter(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );
  const meta = candidates.find((value) => value.total != null);
  if (meta?.total != null) {
    const parsed = Number(meta.total);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  if (append && previousTotal != null) return previousTotal;
  return pageCount;
};

export const normalizeKbSearchResults = (payload) => {
  const list = unwrapSearchPayload(payload);

  return list
    .map((item, index) => {
      if (!item) return null;
      const id = item.id ?? item.itemId ?? item.issueId ?? `result-${index}`;
      const type = item.type || item.kind || "Attachment";
      const title =
        item.title || item.name || item.issueTitle || String(id);
      const createdBy =
        pickResultUser(item, [
          "createdBy",
          "created_by",
          "uploadedBy",
          "uploaded_by",
          "owner",
          "createdByName",
        ]) || null;
      const updatedBy =
        pickResultUser(item, ["updatedBy", "updated_by", "modifiedBy"]) ||
        null;
      const createdDate = pickResultDate(item, [
        "createdDate",
        "created_Date",
        "created_date",
        "uploadedDate",
        "uploaded_date",
      ]);
      const updatedDate = pickResultDate(item, [
        "updatedDate",
        "updated_Date",
        "updated_date",
        "modifiedDate",
        "modified_date",
      ]);
      return {
        id: String(id),
        type,
        title,
        snippet: item.snippet || item.description || item.summary || "",
        path: normalizePath(item.path || item.breadcrumb),
        kbId: item.kbId ?? item.knowledgeBaseId,
        folderId: item.folderId ?? item.parentFolderId,
        url: item.url || item.linkUrl || "",
        fileType: item.fileType || item.mimeType || "",
        createdBy,
        updatedBy,
        createdDate,
        updatedDate,
        scoreLabel: normalizeScoreLabel(
          item.scoreLabel || item.relevance || item.matchLevel,
        ),
      };
    })
    .filter(Boolean);
};

/**
 * Debounced KB search with pageOffset/pageSize pagination.
 * Stale responses are ignored via a request generation counter
 * (plgBaseAPI does not expose AbortSignal).
 *
 * Named useKbSearchQuery to avoid clashing with useKbSearch from KbSearchContext.
 */
const useKbSearchQuery = ({
  query,
  knowledgeBaseIds = "",
  folderId,
  type = "",
  sort,
  enabled = true,
  pageSize = KB_PAGE_SIZE,
} = {}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const requestIdRef = useRef(0);
  const slowTimerRef = useRef(null);
  const pageOffsetRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const totalRef = useRef(0);

  pageOffsetRef.current = pageOffset;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;
  totalRef.current = total;

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setSlow(false);
  }, []);

  const typeKey = String(type || "").trim();
  const idsCsv = String(knowledgeBaseIds || "").trim();

  const clearResults = useCallback(() => {
    setResults([]);
    setPageOffset(0);
    setHasMore(false);
    setTotal(0);
    setSearchedQuery("");
    setError(null);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  const runSearch = useCallback(
    async (rawQuery, { pageOffset: nextOffset = 0, append = false } = {}) => {
      const trimmed = String(rawQuery || "").trim();
      if (
        !enabled ||
        trimmed.length < MIN_QUERY_LENGTH ||
        !idsCsv
      ) {
        requestIdRef.current += 1;
        clearSlowTimer();
        clearResults();
        return;
      }

      if (append && (loadingMoreRef.current || !hasMoreRef.current)) {
        return;
      }

      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLoadingMore(false);
      }
      setError(null);
      clearSlowTimer();
      slowTimerRef.current = setTimeout(() => {
        if (requestIdRef.current === requestId) setSlow(true);
      }, 1500);

      const params = {
        query: trimmed,
        knowledgeBaseIds: idsCsv,
        pageOffset: nextOffset,
        pageSize,
      };
      if (folderId) params.folderId = folderId;
      if (typeKey) params.type = typeKey;
      if (sort && sort !== "relevance") params.sort = sort;

      try {
        const payload = await searchKb(params);
        if (requestIdRef.current !== requestId) return;

        const pageResults = normalizeKbSearchResults(payload);
        const nextHasMore = resolveSearchHasMore(
          payload,
          pageResults.length,
          pageSize,
        );
        const nextTotal = resolveSearchTotal(
          payload,
          pageResults.length,
          append,
          totalRef.current,
        );

        setResults((prev) =>
          append ? [...prev, ...pageResults] : pageResults,
        );
        setPageOffset(nextOffset);
        setHasMore(nextHasMore);
        setTotal(nextTotal);
        setSearchedQuery(trimmed);
        setError(null);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        if (!append) {
          setResults([]);
          setHasMore(false);
          setTotal(0);
          setPageOffset(0);
        }
        setSearchedQuery(trimmed);
        setError(err);
      } finally {
        if (requestIdRef.current === requestId) {
          clearSlowTimer();
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [
      clearResults,
      clearSlowTimer,
      enabled,
      folderId,
      idsCsv,
      pageSize,
      sort,
      typeKey,
    ],
  );

  useEffect(() => {
    const trimmed = String(query || "").trim();
    if (!enabled || trimmed.length < MIN_QUERY_LENGTH || !idsCsv) {
      requestIdRef.current += 1;
      clearSlowTimer();
      clearResults();
      return undefined;
    }

    const timer = setTimeout(() => {
      runSearch(trimmed, { pageOffset: 0, append: false });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [clearResults, clearSlowTimer, enabled, idsCsv, query, runSearch]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      clearSlowTimer();
    },
    [clearSlowTimer],
  );

  const searchNow = useCallback(
    (overrideQuery) => {
      const value =
        overrideQuery !== undefined ? overrideQuery : query;
      return runSearch(value, { pageOffset: 0, append: false });
    },
    [query, runSearch],
  );

  const loadMore = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    const trimmed = String(searchedQuery || query || "").trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    return runSearch(trimmed, {
      pageOffset: pageOffsetRef.current + 1,
      append: true,
    });
  }, [query, runSearch, searchedQuery]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    clearSlowTimer();
    clearResults();
  }, [clearResults, clearSlowTimer]);

  return {
    results,
    loading,
    loadingMore,
    slow,
    error,
    searchedQuery,
    pageOffset,
    hasMore,
    total,
    minQueryLength: MIN_QUERY_LENGTH,
    searchNow,
    loadMore,
    reset,
  };
};

export default useKbSearchQuery;

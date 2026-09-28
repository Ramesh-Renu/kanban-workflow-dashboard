import { useCallback, useMemo } from "react";
import { t } from "i18next";
import { useKbSearch, KB_SEARCH_SORT } from "./KbSearchContext";
import KbBreadcrumb from "./KbBreadcrumb";
import KbSearchFilterMenu from "./KbSearchFilterMenu";
import KbSearchResultsTable from "./KbSearchResultsTable";

/**
 * Replaces browse chrome + table when a search query is active.
 */
const KbSearchResultsPanel = () => {
  const {
    query,
    scope,
    setScope,
    typeFilter,
    setTypeFilter,
    sort,
    setSort,
    results,
    loading,
    loadingMore,
    hasMore,
    total,
    loadMore,
    error,
    searchedQuery,
    commitSearch,
    clearSearch,
    exitToKnowledgeBaseHome,
    openResult,
    kbId,
    folderId,
  } = useKbSearch();

  const locationOptions = useMemo(() => {
    const options = [
      {
        value: "all",
        label: t("knowledge_base.search_location_all"),
      },
    ];
    if (kbId) {
      options.push({
        value: "kb",
        label: t("knowledge_base.search_location_kb"),
      });
    }
    if (folderId) {
      options.push({
        value: "folder",
        label: t("knowledge_base.search_location_folder"),
      });
    }
    return options;
  }, [folderId, kbId]);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: t("knowledge_base.search_type_all") },
      { value: "Attachment", label: t("knowledge_base.attachments") },
      { value: "Issue", label: t("knowledge_base.issues") },
      { value: "Link", label: t("knowledge_base.links") },
      { value: "Folder", label: t("knowledge_base.folders") },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      {
        value: KB_SEARCH_SORT.RELEVANCE,
        label: t("knowledge_base.search_sort_relevance"),
      },
      {
        value: KB_SEARCH_SORT.UPDATED,
        label: t("knowledge_base.search_sort_updated"),
      },
      {
        value: KB_SEARCH_SORT.CREATED,
        label: t("knowledge_base.search_sort_created"),
      },
      {
        value: KB_SEARCH_SORT.NAME_ASC,
        label: t("knowledge_base.search_sort_name_asc"),
      },
      {
        value: KB_SEARCH_SORT.NAME_DESC,
        label: t("knowledge_base.search_sort_name_desc"),
      },
    ],
    [],
  );

  const locationLabel =
    locationOptions.find((option) => option.value === scope)?.label ||
    t("knowledge_base.search_location_all");
  const typeLabel =
    typeOptions.find((option) => option.value === typeFilter)?.label ||
    t("knowledge_base.search_type_all");
  const sortLabel =
    sortOptions.find((option) => option.value === sort)?.label ||
    t("knowledge_base.search_sort_relevance");

  const breadcrumbItems = useMemo(
    () => [
      {
        label: t("knowledge_base.title"),
        onClick: exitToKnowledgeBaseHome,
      },
      {
        label: t("knowledge_base.search_recent_context"),
      },
    ],
    [exitToKnowledgeBaseHome],
  );

  const handleScrollEnd = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    loadMore?.();
  }, [hasMore, loadMore, loading, loadingMore]);

  const activeQuery = searchedQuery || query;
  const loadedCount = results.length;
  const resultCount = total > 0 ? total : loadedCount;
  const showEmpty =
    !loading && !error && searchedQuery && loadedCount === 0;

  const summaryText = loading && !loadedCount
    ? t("knowledge_base.search_searching")
    : t("knowledge_base.search_results_for", {
          count: resultCount,
          query: activeQuery || "",
        });

  return (
    <div className="knowledge-base-hub__search-panel">
      <KbBreadcrumb items={breadcrumbItems} />

      <div className="knowledge-base-hub__search-toolbar">
        <div className="knowledge-base-hub__search-filter-bar">
          <div className="knowledge-base-hub__search-filter-pills">
            <KbSearchFilterMenu
              label={locationLabel}
              ariaLabel={t("knowledge_base.search_location_label")}
              options={locationOptions}
              value={scope}
              onChange={setScope}
            />
            <KbSearchFilterMenu
              label={typeLabel}
              ariaLabel={t("knowledge_base.search_type_label")}
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
            />
            <KbSearchFilterMenu
              label={`${t("knowledge_base.search_sort_label")}: ${sortLabel}`}
              ariaLabel={t("knowledge_base.search_sort_label")}
              options={sortOptions}
              value={sort}
              onChange={setSort}
            />
          </div>
          <button
            type="button"
            className="btn btn-0 p-0 border-0 knowledge-base-hub__search-clear-link"
            onClick={clearSearch}
          >
            {t("knowledge_base.search_clear_all_filters")}
          </button>
        </div>

        <div className="knowledge-base-hub__search-toolbar-meta">
          <p className="knowledge-base-hub__search-summary">
            {summaryText}
          </p>
        </div>
      </div>

      {error && !loading ? (
        <div className="knowledge-base-hub__search-error">
          <p>{t("knowledge_base.search_error")}</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => commitSearch(query)}
          >
            {t("knowledge_base.search_retry")}
          </button>
        </div>
      ) : (
        <KbSearchResultsTable
          results={results}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onScrollEnd={handleScrollEnd}
          onOpen={openResult}
          noDataContent={
            showEmpty
              ? t("knowledge_base.search_empty")
              : t("common.no_records")
          }
        />
      )}
    </div>
  );
};

export default KbSearchResultsPanel;

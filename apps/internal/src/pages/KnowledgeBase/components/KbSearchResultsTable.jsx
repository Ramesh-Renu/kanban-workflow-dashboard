import { useMemo } from "react";
import { t } from "i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { classNames } from "@euroland/libs";
import { formatDisplayDate, toKbUser } from "../utils";
import KbTableShell from "./KbTableShell";
import KbTypeIcon from "./KbTypeIcon";
import { renderKbUserCell } from "./KbUserCell";

const columnHelper = createColumnHelper();

const formatPathLabel = (path) => {
  if (!Array.isArray(path) || !path.length) return "";
  return path
    .map((segment) => segment?.name)
    .filter(Boolean)
    .join(" / ");
};

const renderNameWithPath = ({ row, typeIcon, onOpen }) => {
  const pathBadge = row.pathLabel ? (
    <span
      className="knowledge-base-hub__path-badge"
      title={row.pathLabel}
    >
      {row.pathLabel}
    </span>
  ) : null;

  const nameBlock = (
    <span className="knowledge-base-hub__name-stack">
      <span className="knowledge-base-hub__name-text">{row.name}</span>
      {pathBadge}
    </span>
  );

  if (row.kind === "Link" && row.url) {
    return (
      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className={classNames(
          "text-decoration-none",
          "knowledge-base-hub__name-cell",
        )}
        onClick={(event) => {
          event.preventDefault();
          onOpen?.(row.result);
        }}
      >
        {typeIcon}
        {nameBlock}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classNames(
        "btn btn-0 p-0 border-0 text-start",
        "knowledge-base-hub__name-cell",
      )}
      onClick={() => onOpen?.(row.result)}
    >
      {typeIcon}
      {nameBlock}
    </button>
  );
};

export const toKbSearchTableRows = (results = []) =>
  (Array.isArray(results) ? results : []).map((result, index) => ({
    s_no: index + 1,
    id: result.id,
    kind: result.type || "Attachment",
    name: result.title || "",
    description: result.snippet || "",
    pathLabel: formatPathLabel(result.path),
    by: toKbUser(result.updatedBy || result.createdBy),
    date: result.updatedDate || result.createdDate || "",
    url: result.url || "",
    fileType: result.fileType || "",
    result,
  }));

/**
 * File-explorer table for KB search hits — same shell as folder browse.
 */
const KbSearchResultsTable = ({
  results = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onScrollEnd,
  onOpen,
  noDataContent,
  tableHeight,
}) => {
  const columnData = useMemo(() => toKbSearchTableRows(results), [results]);

  const columns = useMemo(
    () => [
      // columnHelper.accessor("s_no", {
      //   header: () => (
      //     <span className="order_orion_header serial_no">
      //       {t("settings.master_data.kb_col_sno")}
      //     </span>
      //   ),
      //   cell: (info) => info.getValue(),
      //   canSort: false,
      // }),
      columnHelper.accessor("name", {
        header: () => (
          <span className="order_orion_header">{t("knowledge_base.name")}</span>
        ),
        cell: (info) => {
          const row = info.row.original;
          const typeIcon = (
            <KbTypeIcon kind={row.kind} fileType={row.fileType} />
          );
          return renderNameWithPath({ row, typeIcon, onOpen });
        },
      }),
      columnHelper.accessor("description", {
        header: () => (
          <span className="order_orion_header">
            {t("knowledge_base.description")}
          </span>
        ),
        cell: (info) => {
          const description = info.getValue();
          if (!description) return "—";
          return <span className="small text-break">{description}</span>;
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
      // columnHelper.accessor("action", {
      //   header: () => (
      //     <span className="order_orion_header serial_no">
      //       {t("order_orion_v2.action")}
      //     </span>
      //   ),
      //   cell: (info) => {
      //     const row = info.row.original;
      //     const isLink = row.kind === "Link" && row.url;
      //     return (
      //       <button
      //         type="button"
      //         className="btn btn-0 p-1 border-0 knowledge-base-hub__action-icon"
      //         title={
      //           isLink ? t("knowledge_base.open") : t("knowledge_base.view")
      //         }
      //         onClick={() => onOpen?.(row.result)}
      //       >
      //         <span
      //           className={isLink ? "icon-redirect" : "icon-open-eye"}
      //           aria-hidden="true"
      //         />
      //       </button>
      //     );
      //   },
      //   canSort: false,
      // }),
    ],
    [onOpen],
  );

  return (
    <div
      className="knowledge-base-hub__search-results"
      aria-label={t("knowledge_base.search_results_label")}
      aria-busy={loading || loadingMore || undefined}
    >
      <KbTableShell
        columns={columns}
        columnData={columnData}
        loading={loading && columnData.length === 0}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onScrollEnd={onScrollEnd}
        tableHeight={tableHeight}
        noDataContent={noDataContent ?? t("common.no_records")}
      />
    </div>
  );
};

export default KbSearchResultsTable;

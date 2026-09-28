import { classNames } from "@euroland/libs";
import React, { useEffect, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as icon from "../../assets/images/index";
import DashboardTableSkeleton from "../../pages/Dashboard/utils/DashboardTableSkeleton";

export default function Table({
  columns,
  columnData,
  onSortingChange,
  sorting,
  setSorting,
  className,
  getDatas,
  setFilter,
  globalFilter,
  errorMessage,
  paramToRedirect,
  tdActionFn,
  enableRowSelection,
  rowSelection,
  setRowSelection,
  isPreview,
  tableName,
  noDataContent,
  tableHeight,
  loading,
  skeletonRowCount = 8,
  onScrollEnd,
  bgColor,
  footer,
  onRowClick,
  renderExpandedRow,
  getRowProps,
  overscan = 8,
  estimateRowSize = 50,
  measureRows = false,
  enableVirtualization = true,
}) {
  const sortingAllowed = tableName !== "Order_list";
  const shouldMeasureRows =
    measureRows || typeof renderExpandedRow === "function";
  const table = useReactTable({
    data: columnData || [],
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortingAllowed ? getSortedRowModel() : undefined,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableRowSelection ? enableRowSelection : false,
  });

  const setData = (e) => {
    getDatas(e);
  };

  /** USED TO TRIGGER SORTING OF TABLES */
  const toggleSorting = (columnId) => {
    if (typeof onSortingChange !== "function") return;
    const updatedSorting = sorting.map((sort) => {
      if (sort.id === columnId) {
        return {
          ...sort,
          desc: !sort.desc, // toggle the sort order
        };
      } else {
        return {
          ...sort,
          desc: false, // reset other columns to ascending
        };
      }
    });
    onSortingChange(columnId, updatedSorting);
  };

  /** HANDLE CLICK EVENT  */
  const handleClickEvent = (id, value) => {
    const columnKey = String(id || "")
      .replace(/^\d+_/, "")
      .replace(/^\d+/, "");
    if (columnKey !== "edit") {
      setData(value);
    }
  };

  /** VIRTUAL TABLE */
  const { rows } = table.getRowModel();
  const parentRef = useRef();
  const hasCalledOnScrollEnd = useRef(false);
  const useVirtualRows = enableVirtualization && rows.length > 0;

  const virtualizer = useVirtualizer({
    count: useVirtualRows ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: React.useCallback(() => estimateRowSize, [estimateRowSize]),
    overscan,
    enabled: useVirtualRows,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el || !onScrollEnd || rows.length === 0) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const reachedBottom = scrollTop + clientHeight >= scrollHeight - 10;

      if (reachedBottom && !hasCalledOnScrollEnd.current) {
        hasCalledOnScrollEnd.current = true;
        onScrollEnd();
      }

      if (!reachedBottom && hasCalledOnScrollEnd.current) {
        hasCalledOnScrollEnd.current = false;
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [rows.length, onScrollEnd]);

  const showTableSkeleton = Boolean(loading) && rows.length === 0;
  const virtualRows = useVirtualRows ? virtualizer.getVirtualItems() : [];
  const totalSize = useVirtualRows ? virtualizer.getTotalSize() : 0;
  const paddingTop =
    useVirtualRows && virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom =
    useVirtualRows && virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
  const colSpan = columns.length || 1;
  const rowsToRender = useVirtualRows
    ? virtualRows.map((virtualRow) => ({
        row: rows[virtualRow.index],
        virtualRow,
        index: virtualRow.index,
      }))
    : rows.map((row, index) => ({ row, virtualRow: null, index }));

  const renderBodyRow = ({ row, virtualRow, index }) => {
    if (!row) return null;
    const isSelected =
      Boolean(enableRowSelection) &&
      rowSelection?.includes(row?.original?.instrument_id);
    const expandedContent =
      typeof renderExpandedRow === "function"
        ? renderExpandedRow(row.original, row)
        : null;
    const cellClassName = (cell) => String(cell.column?.id || cell.id || "");
    const extraRowProps =
      typeof getRowProps === "function"
        ? getRowProps(row.original, row, index) || {}
        : {};
    const {
      className: extraRowClassName,
      style: extraRowStyle,
      ...restExtraRowProps
    } = extraRowProps;
    const isInactive = row.original?.isActive === false;

    return (
      <tr
        data-index={index}
        ref={
          useVirtualRows && shouldMeasureRows
            ? (node) => virtualizer.measureElement(node)
            : undefined
        }
        key={row.id}
        tabIndex={0}
        role={typeof onRowClick === "function" ? "button" : undefined}
        onClick={() => {
          if (typeof onRowClick === "function") {
            onRowClick(row.original, row);
            return;
          }
          if (!isPreview && enableRowSelection) {
            setRowSelection(row);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (typeof onRowClick === "function") {
              onRowClick(row.original, row);
              return;
            }
            if (!isPreview && enableRowSelection) {
              setRowSelection(row);
            }
          }
        }}
        className={[
          isSelected ? "selected-row" : "",
          typeof onRowClick === "function" ? "is-row-clickable" : "",
          expandedContent ? "is-expanded" : "",
          extraRowClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...(isInactive
            ? { backgroundColor: "#F7F9FB", opacity: 0.7 }
            : null),
          cursor: typeof onRowClick === "function" ? "pointer" : undefined,
          ...extraRowStyle,
        }}
        {...restExtraRowProps}
      >
        {tdActionFn === false &&
          row.getVisibleCells().map((cell) => (
            <td
              key={cell.id}
              id={cell.row.original[paramToRedirect]}
              className={cellClassName(cell)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}

        {(tdActionFn === true || tdActionFn === undefined) &&
          row.getVisibleCells().map((cell) => (
            <td
              key={cell.id}
              onClick={() => {
                if (row.original.is_active) {
                  handleClickEvent(cell.id, cell.row.original[paramToRedirect]);
                }
              }}
              id={cell.row.original[paramToRedirect]}
              className={cellClassName(cell)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        {expandedContent ? (
          <td
            className="table-expanded-cell"
            colSpan={row.getVisibleCells().length || columns.length}
            onClick={(e) => e.stopPropagation()}
          >
            {expandedContent}
          </td>
        ) : null}
      </tr>
    );
  };

  return (
    <div className={classNames("main-table", className)}>
      <div
        className={`table-container position-relative`}
        ref={parentRef}
        style={{
          // "auto" must not be inlined — it overrides stylesheet max-height and
          // makes the scroll parent grow with content (virtualizer flicker).
          maxHeight:
            tableHeight && tableHeight !== "auto" ? tableHeight : undefined,
          // Only block interaction during initial empty load — not while paging/refreshing.
          pointerEvents: showTableSkeleton ? "none" : "auto",
          background: bgColor || "transparent",
        }}
        id={className.replaceAll(" ", "_").toLowerCase()}
      >
        {showTableSkeleton ? (
          <DashboardTableSkeleton
            columnCount={columns.length || 6}
            rowCount={skeletonRowCount}
            height={tableHeight || undefined}
            minHeight={tableHeight ? undefined : 220}
            overlay
            ariaLabel="Loading table data"
          />
        ) : null}
        <table role="table">
          <thead>
            {table?.getHeaderGroups()?.map((headerGroup, i) => (
              <tr key={headerGroup.id + i}>
                {headerGroup?.headers?.map((header, ind) => (
                  <th
                    key={header?.id + ind}
                    colSpan={header?.colSpan}
                    className={`${header?.column?.id || header?.id || ""}`}
                    scope="col"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        header?.column?.getCanSort() &&
                        header.column?.columnDef.canSort
                      ) {
                        e.preventDefault();
                        toggleSorting(header?.id);
                      }
                    }}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                    style={{ minWidth: columnData?.length > 0 ? "" : "50px" }}
                  >
                    {header?.isPlaceholder ? null : (
                      <div
                        className={
                          header?.column.getCanSort()
                            ? "cursor-pointer select-none position-relative"
                            : ""
                        }
                        onClick={() => {
                          if (
                            header.column.getCanSort() &&
                            header.column?.columnDef.canSort
                          ) {
                            toggleSorting(header.id);
                          }
                        }}
                      >
                        <div className="position-relative d-inline">
                          {flexRender(
                            header?.column?.columnDef.header,
                            header?.getContext(),
                          )}
                          {header?.column?.getIsSorted() === "asc" &&
                            columnData?.length > 0 && (
                              <>
                                &#160;&#160;
                                <img src={icon.sortingIconAsc} alt={"sortingIconAsc"} />
                              </>
                            )}
                          {header?.column?.getIsSorted() === "desc" &&
                            columnData?.length > 0 && (
                              <>
                                &#160;&#160;
                                <img src={icon.sortingIconDesc} alt={"sortingIconDesc"} />
                              </>
                            )}
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="error-msg text-center">
                  {errorMessage || noDataContent || "No Data Found"}
                </td>
              </tr>
            )}
            {useVirtualRows && paddingTop > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={colSpan}
                  style={{ height: paddingTop, padding: 0, border: 0 }}
                />
              </tr>
            ) : null}
            {rowsToRender.map((item) => renderBodyRow(item))}
            {useVirtualRows && paddingBottom > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={colSpan}
                  style={{ height: paddingBottom, padding: 0, border: 0 }}
                />
              </tr>
            ) : null}
          </tbody>
          {footer ? <tfoot>{footer}</tfoot> : null}
        </table>
      </div>
    </div>
  );
}

import React, { memo, useMemo } from "react";

const DEFAULT_COLUMN_WIDTHS = ["42%", "78%", "64%", "56%", "72%", "48%", "68%", "52%"];
const DEFAULT_ROW_CELL_WIDTHS = [
  ["38%", "84%", "58%", "66%", "74%", "44%"],
  ["46%", "72%", "62%", "54%", "68%", "50%"],
  ["34%", "80%", "70%", "48%", "76%", "42%"],
  ["50%", "68%", "56%", "72%", "60%", "46%"],
  ["40%", "76%", "64%", "58%", "70%", "52%"],
  ["44%", "74%", "60%", "66%", "64%", "48%"],
  ["36%", "82%", "54%", "50%", "78%", "40%"],
  ["48%", "70%", "68%", "62%", "58%", "54%"],
];

const buildColumnWidths = (columnCount, columnWidths = []) => {
  const widths = [...columnWidths];
  while (widths.length < columnCount) {
    widths.push(DEFAULT_COLUMN_WIDTHS[widths.length % DEFAULT_COLUMN_WIDTHS.length]);
  }
  return widths.slice(0, columnCount);
};

const DashboardTableSkeleton = ({
  columnCount = 6,
  rowCount = 8,
  columnWidths = [],
  height,
  minHeight = 220,
  showHeader = true,
  compact = false,
  overlay = false,
  className = "",
  ariaLabel = "Loading table",
}) => {
  const widths = useMemo(
    () => buildColumnWidths(columnCount, columnWidths),
    [columnCount, columnWidths],
  );

  const rows = useMemo(
    () =>
      Array.from({ length: rowCount }, (_, rowIndex) => {
        const pattern = DEFAULT_ROW_CELL_WIDTHS[rowIndex % DEFAULT_ROW_CELL_WIDTHS.length];
        return Array.from({ length: columnCount }, (_, columnIndex) => {
          return pattern[columnIndex % pattern.length] ?? widths[columnIndex];
        });
      }),
    [columnCount, rowCount, widths],
  );

  return (
    <div
      className={`dashboard-table-skeleton-wrap${
        overlay ? " dashboard-table-skeleton-wrap--overlay" : ""
      }${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      style={height ? { height } : { minHeight }}
    >
      <div
        className={`dashboard-table-skeleton${
          compact ? " dashboard-table-skeleton--compact" : ""
        }`}
        style={{ "--dashboard-table-columns": columnCount }}
      >
        {showHeader ? (
          <div className="dashboard-table-skeleton__header" aria-hidden>
            <div className="dashboard-table-skeleton__row dashboard-table-skeleton__row--header">
              {widths.map((width, index) => (
                <div key={`header-${index}`} className="dashboard-table-skeleton__cell">
                  <span
                    className="dashboard-table-skeleton__shimmer"
                    style={{ width }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="dashboard-table-skeleton__body" aria-hidden>
          {rows.map((rowWidths, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="dashboard-table-skeleton__row dashboard-table-skeleton__row--body"
            >
              {rowWidths.map((width, columnIndex) => (
                <div
                  key={`cell-${rowIndex}-${columnIndex}`}
                  className="dashboard-table-skeleton__cell"
                >
                  <span
                    className="dashboard-table-skeleton__shimmer"
                    style={{ width }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(DashboardTableSkeleton);

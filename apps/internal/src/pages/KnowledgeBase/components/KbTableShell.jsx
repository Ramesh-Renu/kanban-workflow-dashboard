import { Row } from "react-bootstrap";
import { t } from "i18next";
import { classNames } from "@euroland/libs";
import Table from "components/common/Table";

const KbTableShell = ({
  columns,
  columnData,
  loading,
  onScrollEnd,
  noDataContent,
  loadingMore = false,
  hasMore,
  // Omit height so CSS `max-height: calc(100vh - …)` applies. Passing "auto"
  // as an inline style overrides that and breaks virtualized scrolling.
  tableHeight,
  enableVirtualization = true,
  estimateRowSize = 72,
  measureRows = true,
}) => {
  const rowCount = Array.isArray(columnData) ? columnData.length : 0;
  const showEndOfList =
    !loading && !loadingMore && rowCount > 0 && hasMore === false;

  return (
    <Row className="w-100 m-0 p-0 d-flex flex-row align-items-center justify-content-between mt-3 userListTable_Section">
      <div className="userListTable_Section p-0">
        <div className="tableSection">
          <Table
            columns={columns}
            columnData={columnData}
            className={classNames(
              "products__body-table dashboard_table knowledge-base-table",
            )}
            tableName={"Order_list"}
            bgColor={"#FFF"}
            tableHeight={tableHeight}
            loading={loading}
            onScrollEnd={hasMore === true ? onScrollEnd : undefined}
            noDataContent={noDataContent}
            enableVirtualization={enableVirtualization}
            estimateRowSize={estimateRowSize}
            measureRows={measureRows}
          />
          {loadingMore ? (
            <div
              className="knowledge-base-hub__table-status text-muted text-center py-2 small"
              role="status"
              aria-live="polite"
            >
              {t("common.loading")}
            </div>
          ) : null}
        </div>
      </div>
    </Row>
  );
};

export default KbTableShell;

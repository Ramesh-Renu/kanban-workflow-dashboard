import { useMemo } from "react";
import Table from "components/common/Table";
import { classNames } from "@euroland/libs";
import { safeParseLocalStorage } from "utils/dashboard";

const resolveStageDurationRows = (response) => {
  if (!response) return [];
  if (Array.isArray(response?.stageDurations)) return response.stageDurations;
  if (Array.isArray(response?.data?.stageDurations)) return response.data.stageDurations;
  return [];
};

const formatCount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : "---";
};

const DURATION_COLORS = {
  red: "var(--color-red)",
  yellow: "var(--color-yellow)",
  green: "var(--color-dark-green)",
};

const parseFormattedDurationToMinutes = (value) => {
  if (value == null || value === "---") return null;

  const text = String(value).trim().toLowerCase();
  if (!text) return null;

  const dayMatch = text.match(/(\d+)\s*d/);
  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);

  if (!dayMatch && !hourMatch && !minuteMatch) return null;

  let totalMinutes = 0;
  if (dayMatch) totalMinutes += Number(dayMatch[1]) * 24 * 60;
  if (hourMatch) totalMinutes += Number(hourMatch[1]) * 60;
  if (minuteMatch) totalMinutes += Number(minuteMatch[1]);

  return totalMinutes;
};

const resolveDurationMinutes = (formattedValue, secondsFallback) => {
  let totalMinutes = parseFormattedDurationToMinutes(formattedValue);

  if (totalMinutes == null) {
    const seconds = Number(secondsFallback);
    if (Number.isFinite(seconds) && seconds > 0) {
      totalMinutes = seconds / 60;
    }
  }

  return totalMinutes;
};

const getTierColor = (value, highThreshold, lowThreshold) => {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (value >= highThreshold) return DURATION_COLORS.red;
  if (value > lowThreshold) return DURATION_COLORS.yellow;
  return DURATION_COLORS.green;
};

const getRowAverageTimeColor = (formattedValue, secondsFallback) => {
  const totalMinutes = resolveDurationMinutes(formattedValue, secondsFallback);
  if (totalMinutes == null) return undefined;

  return getTierColor(totalMinutes / 60, 8, 5);
};

const getFooterAverageTimeColor = (formattedValue, secondsFallback) => {
  const totalMinutes = resolveDurationMinutes(formattedValue, secondsFallback);
  if (totalMinutes == null) return undefined;

  return getTierColor(totalMinutes / (24 * 60), 8, 5);
};

const AverageTimePerStage = ({ boardStageHistoryResponse, boardStageHistoryLoading }) => {
  const stageRows = useMemo(
    () => resolveStageDurationRows(boardStageHistoryResponse),
    [boardStageHistoryResponse],
  );

  const boardStageHistoryData = useMemo(
    () => boardStageHistoryResponse?.boardSummary ?? null,
    [boardStageHistoryResponse],
  );

  const boardLabel =
    boardStageHistoryData?.boardName ||
    safeParseLocalStorage("selectBoardDashboard")?.name ||
    "Board";

  const columns = useMemo(
    () => [
      {
        accessorKey: "stageOrder",
        header: "Stage Order",
        cell: ({ getValue }) => getValue(),
        canSort: false,
      },
      {
        accessorKey: "stageName",
        header: "Stage Name",
        cell: ({ getValue }) => getValue(),
        canSort: false,
      },
      {
        accessorKey: "cardsEntered",
        header: "Cards Entered",
        cell: ({ row }) => <span>{formatCount(row.original.cardsEntered)}</span>,
        canSort: false,
      },
      {
        accessorKey: "cardsExited",
        header: "Cards Exited",
        cell: ({ row }) => <span>{formatCount(row.original.cardsExited)}</span>,
        canSort: false,
      },
      {
        accessorKey: "averageTimeSeconds",
        header: "Average Time",
        cell: ({ row }) => {
          const formattedValue = row.original.averageTimeFormatted;
          const color = getRowAverageTimeColor(
            formattedValue,
            row.original.averageTimeSeconds,
          );

          return <span style={color ? { color } : undefined}>{formattedValue}</span>;
        },
        canSort: false,
      },
      {
        accessorKey: "medianTimeSeconds",
        header: "Min Time",
        cell: ({ row }) => <span>{row.original.medianTimeFormatted}</span>,
        canSort: false,
      },
      {
        accessorKey: "maxTimeSeconds",
        header: "Max Time",
        cell: ({ row }) => <span>{row.original.maxTimeFormatted}</span>,
        canSort: false,
      },
      {
        accessorKey: "totalTimeSeconds",
        header: "Total Time",
        cell: ({ row }) => <span>{row.original.totalTimeFormatted}</span>,
        canSort: false,
      },
    ],
    [],
  );

  const tableFooter = useMemo(() => {
    if (!boardStageHistoryData || stageRows.length === 0) return null;

    const totalAverageTime = boardStageHistoryData.totalAverageTimeFormatted ?? "---";
    const totalTime = boardStageHistoryData.totalTimeFormatted ?? "---";
    const averageColor = getFooterAverageTimeColor(
      totalAverageTime,
      boardStageHistoryData.totalAverageTimeSeconds,
    );

    return (
      <tr className="average-time-per-stage__footer-row">
        <td colSpan={4} className="average-time-per-stage__footer-label">
          <strong>{boardLabel}</strong> - Total Average Time&#160;&#160;
          <span className="average-time-per-stage__footer-label-all-included-stages">
            (All Included Stages)
          </span>
        </td>
        <td className="average-time-per-stage__footer-average">
          <span style={averageColor ? { color: averageColor } : undefined}>
            {totalAverageTime}
          </span>
        </td>
        <td className="average-time-per-stage__footer-empty" />
        <td className="average-time-per-stage__footer-empty" />
        <td className="average-time-per-stage__footer-total">
          <span className="average-time-per-stage__footer-total-label">Total Time</span>
          <strong>{totalTime}</strong>
        </td>
      </tr>
    );
  }, [boardStageHistoryData, boardLabel, stageRows.length]);

  return (
    <div className="average-time-per-stage">
      <Table
        columns={columns}
        columnData={stageRows}
        className={classNames("products__body-table dashboard_table-task-dashboard")}
        tableName="Average_time_per_stage"
        loading={boardStageHistoryLoading}
        noDataText="No stage duration data available for the selected criteria."
        footer={tableFooter}
      />
    </div>
  );
};

export default AverageTimePerStage;

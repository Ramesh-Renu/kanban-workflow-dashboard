import * as XLSX from "xlsx";
import dayjs from "dayjs";

const displayValue = (value, empty = "---") =>
  value === null || value === undefined || value === "" ? empty : value;

const formatProgress = (value) =>
  value === null || value === undefined || value === "" ? "---" : `${value}%`;

const formatDate = (value) =>
  value ? dayjs(value).format("D-MMM-YY") : "---";

const getToolsFromMainTask = (mainTask) =>
  (mainTask?.subtask || []).flatMap(
    (group) => group?.tools || group?.toolList || [],
  );

/**
 * Build and download hierarchical Main/Sub grid Excel from export API JSON.
 * Layout matches Board/Task overview export mock:
 * main header + row, then indented tool header + rows under each order/task.
 */
export const downloadMainSubGridExcel = (
  exportGrid,
  fileName = `board-task-export-${Date.now()}.xlsx`,
  { isOrderWorkspace = true } = {},
) => {
  const exportList = exportGrid?.exportList || [];
  if (!exportList.length) {
    throw new Error("No records available to export");
  }

  const mainHeaders = [
    "S.No",
    isOrderWorkspace ? "Order Name" : "Task Name",
    "Created Date",
    isOrderWorkspace ? "Order Type" : "Task Type",
    "Region",
    "Country",
    "Market",
    "Labels",
    "Progress",
    "Total Time",
    "Tool Count",
    isOrderWorkspace ? "Order Status" : "Task Status",
  ];

  const subHeaders = [
    "S.no",
    "Tool Name",
    "Assignee",
    "Due Date",
    "Progress",
    "Total Time",
    "Workspace",
    "Board",
    "Stage",
    "Status",
  ];

  const rows = [];

  exportList.forEach((entry) => {
    const main = entry?.mainTask || entry;
    if (!main) return;

    rows.push(mainHeaders);
    rows.push([
      displayValue(main.sno, ""),
      displayValue(main.orderName || main.taskName),
      formatDate(main.createdDate),
      displayValue(main.orderType || main.taskType),
      displayValue(main.region),
      displayValue(main.country),
      displayValue(main.market),
      displayValue(main.labels),
      formatProgress(main.progress),
      displayValue(main.toolOverallTime),
      displayValue(main.toolCount),
      displayValue(main.orderStatus || main.taskStatus),
    ]);

    const tools = getToolsFromMainTask(main);
    if (tools.length) {
      // Nested tool table starts under Created Date (column C)
      rows.push(["", "", ...subHeaders]);
      tools.forEach((tool, index) => {
        rows.push([
          "",
          "",
          displayValue(tool.sno, index + 1),
          displayValue(tool.toolName),
          displayValue(tool.assignee, "N/A"),
          formatDate(tool.dueDate),
          formatProgress(tool.progress),
          displayValue(tool.toolOverallTime),
          displayValue(tool.workspace),
          displayValue(tool.board),
          displayValue(
            typeof tool.stage === "string" ? tool.stage.trim() : tool.stage,
          ),
          displayValue(tool.toolStatus || tool.status),
        ]);
      });
    }

    rows.push([]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Board Task Export");
  const downloadName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, downloadName);
  return true;
};

export default downloadMainSubGridExcel;

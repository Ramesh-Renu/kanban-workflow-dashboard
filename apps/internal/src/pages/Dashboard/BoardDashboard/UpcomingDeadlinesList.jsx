import React, { useEffect, useMemo, useState, memo } from "react";
import { clockIcon, closeIcon } from "assets/images";
import { hexToRgba, safeParseLocalStorage, DASHBOARD_ROUTES, isIodDashboardWorkspace } from "utils/dashboard";
import dayjs from "dayjs";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import Table from "components/common/Table";
import { classNames } from "@euroland/libs";
import { createColumnHelper } from "@tanstack/react-table";
import { getDueDateColor } from "utils/common";
import { useNavigate } from "react-router-dom";

const columnHelper = createColumnHelper();

const SidebarItem = ({ item, active, onClick }) => {
  const handleClick = () => {
    onClick();
  };
  return (
    <div
      onClick={handleClick}
      className={`upcoming-deadlines-list__left-panel__sidebar-item ${
        active
          ? "upcoming-deadlines-list__left-panel__sidebar-item-active"
          : "upcoming-deadlines-list__left-panel__sidebar-item-inactive"
      }`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleClick();
        }
      }}
    >
      {item.taskName}
    </div>
  );
};

const StatusBadge = ({ status, dashboardFormulaData, isDueDateInPast }) => {
  const healthyColor = dashboardFormulaData?.find(
    (item) => item.label === "Healthy",
  )?.color;

  const atRiskColor = dashboardFormulaData?.find(
    (item) => item.label === "At Risk",
  )?.color;

  if (status === 7 && isDueDateInPast) {
    return (
      <span
        className="upcoming-deadlines-list__right-panel__header-content-status-badge-completed"
        style={{
          border: `1px solid ${hexToRgba(healthyColor, 0.7)}`,
          backgroundColor: `${hexToRgba(healthyColor, 0.04)}`,
          color: `${hexToRgba(healthyColor, 1)}`,
        }}
      >
        Completed
      </span>
    );
  }

  if ((status === 5 || status === 6) && isDueDateInPast) {
    return (
      <span
        className="upcoming-deadlines-list__right-panel__header-content-status-badge-at-risk"
        style={{
          border: `1px solid ${hexToRgba(atRiskColor, 0.5)}`,
          backgroundColor: `${hexToRgba(atRiskColor, 0.05)}`,
          color: `${hexToRgba(atRiskColor, 1)}`,
        }}
      >
        At Risk
      </span>
    );
  }
  return null;
};

const isDueWithinCurrentMonth = (ticketDueDate) =>
  Boolean(
    ticketDueDate &&
    dayjs(ticketDueDate).isValid() &&
    dayjs(ticketDueDate).isSame(dayjs(), "month"),
  );

/** Tool with the earliest valid due date (for header summary). */
const getLeastDueDateTool = (listOfTools) => {
  if (!listOfTools?.length) return null;
  let best = null;
  let bestMs = Infinity;
  for (const tool of listOfTools) {
    if (!tool?.dueDate) continue;
    const d = dayjs(tool.dueDate);
    if (!d.isValid()) continue;
    const ms = d.valueOf();
    if (ms < bestMs) {
      bestMs = ms;
      best = tool;
    }
  }
  return best;
};

const UpcomingDeadlinesList = ({
  onClose,
  deadline,
  dashboardFormulaData,
  data,
  selectWorkspaceDashboard,
  boardType,
  orderToolsPageSize,
  orderToolsPageOffset,
}) => {
  const [selectedCompany, setSelectedCompany] = useState(deadline || null);
  const navigate = useNavigate();
  const leastDueTool = useMemo(
    () => getLeastDueDateTool(selectedCompany?.listOfTools),
    [selectedCompany],
  );

  /** When parent passes a deadline (e.g. from board row), select matching company in the list. */
  useEffect(() => {
    const name = deadline?.taskName ?? deadline?.ticketName;
    if (!name && deadline?.orderId == null) return;
    const match = data.find(
      (row) => (name && row.taskName === name) || row.orderId === deadline?.orderId,
    );
    if (match) setSelectedCompany(match);
  }, [deadline, data]);

  /** Due date is strictly before today (already passed / overdue day). */
  const isDueDateInPast = (ticketDueDate) =>
    Boolean(
      ticketDueDate &&
      dayjs(ticketDueDate).isValid() &&
      dayjs(ticketDueDate).startOf("day").isBefore(dayjs().startOf("day")),
    );

  /** Whole calendar days from due date to today (positive = days since due / overdue; 0 if due today; negative if due is future). */
  const getDaysPassedSinceDueDate = (ticketDueDate) => {
    if (!ticketDueDate || !dayjs(ticketDueDate).isValid()) return 0;
    return dayjs().startOf("day").diff(dayjs(ticketDueDate).startOf("day"), "day");
  };

  const viewSubTaskInfo = (row, boardId) => {
    const path = `${DASHBOARD_ROUTES.details(boardId, selectedCompany?.orderId)}?${Number(selectWorkspaceDashboard) === 1 ? "toolId" : "taskId"}=${
      Number(selectWorkspaceDashboard) === 1 ? row?.toolId : row?.toolTicketId
    }`;
    navigate(path, {
      state: {
        from: "dashboard",
        boardType,
        workSpaceId: selectWorkspaceDashboard,
        ticketId: Number(selectedCompany?.ticketId ?? selectedCompany?.orderId),
        pageSize: orderToolsPageSize,
        pageOffset: orderToolsPageOffset,
      },
    });
  };

  const toolColumns = [
    columnHelper.accessor("s_no", {
      header: () => <span>S.No</span>,
      cell: (info) => {
        const visibleRowIndex = info.table
          .getRowModel()
          .rows.findIndex((row) => row.id === info.row.id);
        return (
          <div className="text-start">
            {visibleRowIndex > -1 ? visibleRowIndex + 1 : "---"}
          </div>
        );
      },
    }),
    columnHelper.accessor("toolName", {
      header: () => (
        <span>
          {Number(selectWorkspaceDashboard) === 1 ? "Tools" : "Task"}
        </span>
      ),
      cell: (info) => {
        const row = info.row.original;
        const boardId = info.row.original.activeStages?.[0]?.boardId;
        return (
          <button
            className={`py-3 d-flex align-items-center gap-2 btn btn-0`}
            title={info?.getValue()}
            onClick={() => viewSubTaskInfo(row, boardId)}
            onKeyDown={(e) => e.key === "Enter" && viewSubTaskInfo(row, boardId)}
            type="button"
          >
            {info.getValue()}
          </button>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("board", {
      header: () => <span>Board Name</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div
                key={index}
                title={item?.boardName}
                className={`py-1 tools_info_board_stage`}
              >
                <div className="px-1 rounded py-1 w-100">{item?.boardName}</div>
              </div>
            );
          })
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("activeStages", {
      header: () => <span>Stage Name</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div key={index} className="py-1 tools_info_board_stage d-flex">
                <div
                  className="px-2 rounded py-1 stage_Badge"
                  style={{
                    color: item?.stage?.colorCode,
                    border: `1px solid ${item?.stage?.colorCode}`,
                    backgroundColor: `${item?.stage?.colorCode}10`,
                    textAlign: "center",
                  }}
                  title={item?.stage.name}
                >
                  {item?.stage.name}
                </div>
              </div>
            );
          })
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("currentAssignee", {
      header: () => <span>Assignee</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div key={index}>
                {item?.assignee?.length > 0 ? (
                  item?.assignee.map((assignee, idx) => (
                    <div
                      key={idx}
                      className="py-1 tools_info_board_stage d-flex avatars" /*onClick={(e) => { setSelectedTool(info.row.original); setAssigneeDialogOpen(!assigneeDialogOpen); }}*/
                    >
                      <LogoAvatarShowLetter
                        genaralData={assignee}
                        profileName={"displayName"}
                        outerClassName={"avatars__item stage_Badge"}
                        innerClassName={"avatars__img"}
                      ></LogoAvatarShowLetter>
                    </div>
                  ))
                ) : (
                  <div
                    className="py-1 tools_info_board_stage d-flex avatars" /*onClick={(e) => { setSelectedTool(info.row.original); setAssigneeDialogOpen(!assigneeDialogOpen); }}*/
                  >
                    <span className="circle-badge stage_Badge">N/A</span>
                  </div>
                )}
              </div>
            );
          })
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("dueDate", {
      header: () => <span>Due Date</span>,
      cell: (info) => {
        const tool = info.row.original;
        return (
          <div
            style={{
              color: `${
                isDueDateInPast(tool.dueDate) &&
                tool?.activeStages?.some((stage) => stage?.isStageCompleted === false)
                  ? "red"
                  : "var(--color-black)"
              }`,
            }}
          >
            {" "}
            {info.getValue() ? dayjs(info.getValue()).format("MMM DD, YYYY") : "---"}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("dueDay", {
      header: () => (
        <span className="subtask-table__row-item-due text-center">Overdue Days</span>
      ),
      cell: (info) => {
        const tool = info.row.original;
        return (
          <span className="subtask-table__row-item-due text-center">
            {Math.max(0, getDaysPassedSinceDueDate(tool.dueDate)) === 1
              ? "1 Day"
              : `${Math.max(0, getDaysPassedSinceDueDate(tool.dueDate))} Days`}
          </span>
        );
      },
      canSort: false,
    }),
    // columnHelper.accessor("workspaceId", {
    //   header: () => <span>Workspace</span>,
    //   cell: (info) => {
    //     const row = info.row.original.activeStages;
    //     return (
    //       row?.length > 0 &&
    //       row.map((item, index) => {
    //         return (
    //           <div
    //             key={index}
    //             title={item?.workspaceName}
    //             // className={`py-1 tools_info_board_stage ${row?.length > 1 && index !== row?.length-1 ? "border-bottom ":""}`}
    //             className={`py-1 tools_info_board_stage`}
    //           >
    //             <div className="px-1 rounded py-1 w-100">{item?.workspaceName}</div>
    //           </div>
    //         );
    //       })
    //     );
    //   },
    //   canSort: false,
    // }),
  ];

  return (
    <div className="upcoming-deadlines-list__container">
      {/* LEFT PANEL */}
      <button
        className="upcoming-deadlines-list__right-panel__header-close"
        onClick={onClose}
      >
        <img
          src={closeIcon}
          alt="close icon"
          className="upcoming-deadlines-list__right-panel__header-close-icon"
        />
      </button>
      <div className="upcoming-deadlines-list__left-panel">
        <h2 className="upcoming-deadlines-list__left-panel__header-title">
          Overdue{" "}
          {isIodDashboardWorkspace()
            ? "Companies"
            : "Task"}
          <span className="upcoming-deadlines-list__left-panel__header-title-count">
            {data?.length}
          </span>
        </h2>

        {/* <p className="upcoming-deadlines-list__left-panel__header-subtitle">
          <img src={formIcon} alt="calendar blank icon" width={16} height={16} />
          &#160;
          {data?.length} Company's
        </p> */}

        <div className="upcoming-deadlines-list__left-panel__sidebar-container">
          {data?.map((item, i) => (
            <SidebarItem
              key={i}
              item={item}
              active={
                data?.length > 1 && selectedCompany?.orderId === item.orderId
                  ? true
                  : false
              }
              onClick={() => setSelectedCompany(item)}
            />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="upcoming-deadlines-list__right-panel">
        {/* HEADER */}
        <div className="upcoming-deadlines-list__right-panel__header">
          <div className="upcoming-deadlines-list__right-panel__header-content">
            <div className="upcoming-deadlines-list__right-panel__header-content-date-container">
              <p
                style={{
                  background: `${isDueDateInPast(leastDueTool?.dueDate) && leastDueTool?.toolStatusId !== 7 ? hexToRgba("#FFF1F2", 1) : leastDueTool?.dueDate && isDueWithinCurrentMonth(leastDueTool?.dueDate) ? hexToRgba("#D6E3FF", 1) : hexToRgba("#E2E8F0", 0.5)}`,
                  color: `${isDueDateInPast(leastDueTool?.dueDate) && leastDueTool?.toolStatusId !== 7 ? hexToRgba("#8D0001", 1) : leastDueTool?.dueDate && leastDueTool?.toolStatusId !== 7 && isDueWithinCurrentMonth(leastDueTool?.dueDate) ? hexToRgba("#004384", 1) : hexToRgba("#475569", 0.6)}`,
                  borderRadius: "var(--radius-md)",
                  padding: "4px 8px",
                  width: "56px",
                  height: "50px",
                }}
                className="upcoming-deadlines-list__right-panel__header-content-date-box"
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "500",
                    lineHeight: "12px",
                    verticalAlign: "middle",
                  }}
                  className="upcoming-deadlines-list__right-panel__header-content-date-box-day"
                >
                  {leastDueTool?.dueDate
                    ? dayjs(leastDueTool?.dueDate).format("MMM")
                    : "—"}
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    lineHeight: "20px",
                    verticalAlign: "middle",
                  }}
                  className="upcoming-deadlines-list__right-panel__header-content-date-box-month"
                >
                  {leastDueTool?.dueDate ? dayjs(leastDueTool.dueDate).format("DD") : "—"}
                </span>
              </p>
            </div>

            <div className="upcoming-deadlines-list__right-panel__header-content-name-container">
              <h3 className="upcoming-deadlines-list__right-panel__header-content-name">
                {selectedCompany?.taskName}
              </h3>

              <div className="upcoming-deadlines-list__right-panel__header-content-details">
                <span>
                  <img src={clockIcon} alt="clock icon" />{" "}
                  {/* {selectedCompany.totalToolCount > 0
                    ? `${selectedCompany.totalToolCount}`
                    : "0"}
                  / */}
                  {selectedCompany.overdueToolCount > 0
                    ? `${selectedCompany.overdueToolCount}`
                    : "0"}
                  &#160;Over Due&#160;
                </span>
                {/* <span>
                  <img src={formIcon} alt="check approved verified icon" />{" "}
                  {selectedCompany.totalToolCount > 0
                    ? `${selectedCompany.totalToolCount}`
                    : "0"}
                  &#160;Total{" "}
                  {isIodDashboardWorkspace()
                    ? "Tools"
                    : "Task"}
                  &#160;
                </span>
                <span>
                  <img src={checkApprovedVerified} alt="check approved verified icon" />{" "}
                  {selectedCompany.completedToolCount > 0
                    ? `${selectedCompany.completedToolCount}`
                    : "0"}
                  &#160;Completed&#160;
                </span> */}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="sub_task_list_table__modal-dialog">
          <div className="sub_task_list_table__modal-body">
            <div className="sub_task_list_table">
              <Table
                columns={toolColumns}
                columnData={
                  data?.filter((item) => item.orderId === selectedCompany?.orderId)[0]
                    ?.listOfTools || []
                }
                className={classNames("sub_task_list_table_table")}
                tableName={"SubInfoTable"}
                loading={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(UpcomingDeadlinesList);

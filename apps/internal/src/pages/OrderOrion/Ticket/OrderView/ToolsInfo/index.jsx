import Table from "../../../../../components/common/Table";
import React, { useEffect, useRef, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { classNames } from "@euroland/libs";
import dayjs from "dayjs";
import {
  pencilSimpleLine,
  trashFull,
  chevronLeftDuoColor,
  dueDateInfo,
  kebabMenu,
} from "../../../../../assets/images/index";
import { useParams } from "react-router-dom";
import { Col, Row, Spinner } from "react-bootstrap";
import ToolsInfoDetails from "./ToolsInfoDetails/index";
import LogoAvatarShowLetter from "../../../../../components/common/LogoAvatarShowLetter";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useGlobalMaster } from "@orion/shared";
import { SelectDropDown } from "@orion/shared";
import { deleteOrderedTool, updateToolPosition } from "../../../../../services";
import { useToast } from "@orion/shared";
import useAuth from "../../../../../hooks/useAuth";
import { getDueDateColor, renderTaskListPriority } from "../../../../../utils/common";
import CreateTaskModal from "../../../../../components/common/CreateTaskModal";
import { useGlobalContext } from "store/context/GlobalProvider";
import { matchFreeFlowLabels, toLabelIdSet } from "utils/subToolLabels";
import useClickAway from "../../../../../hooks/useClickAway";
import ToolsMoreDetailsPanel, {
  renderToolsStageBadge,
  CalendarMiniIcon,
} from "./ToolsMoreDetailsPanel";

const stripHtmlText = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

const getRelativeDueLabel = (date) => {
  if (!date) return "";
  const days = dayjs(date).startOf("day").diff(dayjs().startOf("day"), "day");
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day ago";
  return `${Math.abs(days)} days ago`;
};

const getPersonRole = (person) =>
  person?.teamName || person?.roleName || person?.role || person?.designation || "";

const getPersonName = (person) =>
  person?.displayName || person?.name || person?.fullName || person?.givenName || "";

const assignToolPositions = (rows) =>
  rows.map((row, index) => ({ ...row, position: index + 1 }));

const TOOL_DND_SCROLL_EDGE_PX = 56;
const TOOL_DND_SCROLL_SPEED = 14;

const ToolsInfo = ({
  companyData,
  refreshTicket,
  activeWorkSpace,
  showMainComment,
  preserveScroll,
  onToolDetailViewChange,
  backToListTick = 0,
}) => {
  const { dispatch } = useGlobalContext();
  const navId = useParams();
  const savedWorkspace = localStorage.getItem("workspaceState");
  const parsedWorkspace = savedWorkspace ? JSON.parse(savedWorkspace) : {};
  const currentBoardId = Number(
    navId?.boardId || parsedWorkspace?.activeBoard?.[0]?.boardID,
  );
  // Order workflow (60): show all tools; other workflows: only current board
  const showAllBoardTools = Number(companyData?.workFlowType) === 60;
  const isProcessWorkflow = companyData?.workFlowType === 60;

  const matchesCurrentBoard = (stage) =>
    currentBoardId && Number(stage?.boardId) === currentBoardId;

  const getCurrentBoardStage = (row) => {
    const stages = row?.activeStages || [];
    if (!currentBoardId) return stages[0] || null;
    return stages.find(matchesCurrentBoard) || stages[0] || null;
  };

  const getOtherBoardStages = (row) => {
    const stages = row?.activeStages || [];
    if (!stages.length) return [];
    if (!currentBoardId) {
      const current = getCurrentBoardStage(row);
      if (!current) return stages;
      return stages.filter((stage) => stage !== current);
    }
    // More details / Other Boards: never include the active board
    return stages.filter((stage) => Number(stage?.boardId) !== currentBoardId);
  };

  const columnHelper = createColumnHelper();
  const [{ data }] = useAuth();
  const userInfo = data.details;
  const [toolsInfoData, setToolsInfoData] = useState([]);
  const [selectedTools, setSelectedTools] = useState();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletedTool, setDeletedTool] = useState();
  const {
    deleteToolReasonList,
    deleteTaskReasonList,
    getDeleteToolReasonList,
    getDeleteTaskReasonList,
    taskPriority,
    getTaskPriority,
    freeFlowLabelList,
    getFreeFlowLabelList,
  } = useGlobalMaster();
  const [toolDeleteValues, setToolDeleteValues] = useState({
    type: "",
    description: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const [isValidOnboard, setValidOnboard] = useState(false);
  const [viewDeletedTool, setViewDeletedTool] = useState(false);
  const [showUpdateSubTask, setShowUpdateSubTask] = useState(false);
  const [gettingSubTaskData, setGettingSubTaskData] = useState(null);
  const [refreshToolTicketComment, setRefreshToolTicketComment] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [openKebabRowId, setOpenKebabRowId] = useState(null);
  const [isUpdatingToolPosition, setIsUpdatingToolPosition] = useState(false);
  const kebabMenuRef = useRef(null);
  const dragToolIndexRef = useRef(null);
  const dragOverToolIndexRef = useRef(null);
  const toolsInfoDataRef = useRef(toolsInfoData);
  const isToolDraggingRef = useRef(false);
  const lastDragClientYRef = useRef(0);
  const toolDragScrollRafRef = useRef(null);
  const isSavingToolPositionRef = useRef(false);
  const ticketIdRef = useRef(null);

  useClickAway([kebabMenuRef], () => setOpenKebabRowId(null));

  const getToolRowId = (row) => (isProcessWorkflow ? row?.toolId : row?.ticketToolId);

  useEffect(() => {
    toolsInfoDataRef.current = toolsInfoData;
  }, [toolsInfoData]);

  useEffect(() => {
    ticketIdRef.current = Number(navId?.orderId || companyData?.orderId) || null;
  }, [navId?.orderId, companyData?.orderId]);

  const buildToolPositionPayload = (rows) => {
    const ticketId = ticketIdRef.current;
    if (!ticketId) return [];
    return rows
      .filter((row) => row?.ticketToolId != null && row?.isActive !== false)
      .map((row) => ({
        ticketId: Number(ticketId),
        toolTicketId: Number(row.ticketToolId),
        position: Number(row.position),
      }));
  };

  const persistToolPositions = async (orderedRows, previousRows) => {
    const payload = buildToolPositionPayload(orderedRows);
    if (!payload.length) return;

    isSavingToolPositionRef.current = true;
    setIsUpdatingToolPosition(true);
    try {
      const response = await updateToolPosition(payload);
      if (response?.data?.status) {
        showToast({
          variant: "success",
          message: response?.data?.message || "Tool position updated successfully.",
        });
        if (typeof refreshTicket === "function") {
          refreshTicket();
        }
      } else {
        setToolsInfoData(previousRows);
        showToast({
          variant: "danger",
          message: response?.data?.message || "Failed to update tool position.",
        });
      }
    } catch (err) {
      setToolsInfoData(previousRows);
      showToast({
        variant: "danger",
        message: err?.message || "Failed to update tool position.",
      });
    } finally {
      isSavingToolPositionRef.current = false;
      setIsUpdatingToolPosition(false);
    }
  };

  const getToolsTableScrollContainer = () =>
    document.querySelector(".tools_info_main-table .table-container");

  const stopToolDragAutoScroll = () => {
    isToolDraggingRef.current = false;
    if (toolDragScrollRafRef.current) {
      cancelAnimationFrame(toolDragScrollRafRef.current);
      toolDragScrollRafRef.current = null;
    }
  };

  const startToolDragAutoScroll = () => {
    if (toolDragScrollRafRef.current) return;

    const tick = () => {
      if (!isToolDraggingRef.current) {
        toolDragScrollRafRef.current = null;
        return;
      }

      const container = getToolsTableScrollContainer();
      if (container) {
        const rect = container.getBoundingClientRect();
        const clientY = lastDragClientYRef.current;
        let direction = 0;

        if (clientY < rect.top + TOOL_DND_SCROLL_EDGE_PX) direction = -1;
        else if (clientY > rect.bottom - TOOL_DND_SCROLL_EDGE_PX) direction = 1;

        if (direction !== 0) {
          container.scrollTop += direction * TOOL_DND_SCROLL_SPEED;
        }
      }

      toolDragScrollRafRef.current = requestAnimationFrame(tick);
    };

    toolDragScrollRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const handleWindowDragOver = (e) => {
      if (!isToolDraggingRef.current) return;
      lastDragClientYRef.current = e.clientY;
    };

    window.addEventListener("dragover", handleWindowDragOver);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      stopToolDragAutoScroll();
    };
  }, []);

  useEffect(() => {
    const filtered = [...(companyData?.toolInfo || [])].filter((row) => {
      if (showAllBoardTools || !currentBoardId) return true;
      const stages = row?.activeStages || [];
      if (row?.isActive === false && stages.length === 0) return true;
      return stages.some(matchesCurrentBoard);
    });

    setToolsInfoData((prev) => {
      const prevPositionById = new Map(
        prev.map((row) => [String(getToolRowId(row)), Number(row.position)]),
      );
      const active = [];
      const inactive = [];

      filtered.forEach((row, apiIndex) => {
        if (row?.isActive === false) inactive.push({ row, apiIndex });
        else active.push({ row, apiIndex });
      });

      active.sort((a, b) => {
        const aId = String(isProcessWorkflow ? a.row.toolId : a.row.ticketToolId);
        const bId = String(isProcessWorkflow ? b.row.toolId : b.row.ticketToolId);
        const aPos = prevPositionById.has(aId)
          ? prevPositionById.get(aId)
          : a.row.position != null
            ? Number(a.row.position)
            : a.apiIndex + 10000;
        const bPos = prevPositionById.has(bId)
          ? prevPositionById.get(bId)
          : b.row.position != null
            ? Number(b.row.position)
            : b.apiIndex + 10000;
        return aPos - bPos;
      });

      return assignToolPositions([
        ...active.map(({ row }) => row),
        ...inactive.map(({ row }) => row),
      ]);
    });
  }, [companyData?.toolInfo, showAllBoardTools, currentBoardId, isProcessWorkflow]);

  const clearToolDragClasses = () => {
    document
      .querySelectorAll(
        ".tools_info_main-table tr.is-dragging, .tools_info_main-table tr.is-drag-over",
      )
      .forEach((node) => {
        node.classList.remove("is-dragging", "is-drag-over");
      });
  };

  const handleToolDragStart = (e, index) => {
    const row = toolsInfoDataRef.current[index];
    if (row?.isActive === false) {
      e.preventDefault();
      return;
    }
    // text/plain required for reliable cross-browser first drag
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.setData("dragIndex", String(index));
    e.dataTransfer.effectAllowed = "move";
    dragToolIndexRef.current = index;
    dragOverToolIndexRef.current = null;
    lastDragClientYRef.current = e.clientY;
    isToolDraggingRef.current = true;
    startToolDragAutoScroll();
    const rowEl = e.currentTarget.closest("tr");
    if (rowEl) rowEl.classList.add("is-dragging");
  };

  const handleToolDragOver = (e, index) => {
    const row = toolsInfoDataRef.current[index];
    if (row?.isActive === false) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    lastDragClientYRef.current = e.clientY;
    if (dragOverToolIndexRef.current === index) return;
    dragOverToolIndexRef.current = index;
    document
      .querySelectorAll(".tools_info_main-table tr.is-drag-over")
      .forEach((node) => node.classList.remove("is-drag-over"));
    if (e.currentTarget?.classList) e.currentTarget.classList.add("is-drag-over");
  };

  const handleToolDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const raw =
      e.dataTransfer.getData("dragIndex") || e.dataTransfer.getData("text/plain");
    const dragIndex = Number.parseInt(raw, 10);
    clearToolDragClasses();
    stopToolDragAutoScroll();
    dragToolIndexRef.current = null;
    dragOverToolIndexRef.current = null;
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;
    if (isSavingToolPositionRef.current) return;

    const previousRows = toolsInfoDataRef.current;
    const activeCount = previousRows.filter((row) => row?.isActive !== false).length;
    if (
      dragIndex < 0 ||
      dropIndex < 0 ||
      dragIndex >= activeCount ||
      dropIndex >= activeCount
    ) {
      return;
    }

    const next = [...previousRows];
    const [dragged] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, dragged);
    const orderedRows = assignToolPositions(next);
    setToolsInfoData(orderedRows);
    toolsInfoDataRef.current = orderedRows;
    void persistToolPositions(orderedRows, previousRows);
  };

  const handleToolDragEnd = () => {
    clearToolDragClasses();
    stopToolDragAutoScroll();
    dragToolIndexRef.current = null;
    dragOverToolIndexRef.current = null;
  };

  const getToolRowDragProps = (row, _tableRow, index) => {
    if (row?.isActive === false) return {};
    return {
      onDragOver: (e) => handleToolDragOver(e, index),
      onDrop: (e) => handleToolDrop(e, index),
      onDragEnd: handleToolDragEnd,
      className: "tools-info-row--draggable",
    };
  };

  const renderToolDragHandle = (row, index) => {
    if (row?.isActive === false) return null;
    return (
      <span
        className="tools-info-drag-handle icon-drag-drop"
        draggable={!isUpdatingToolPosition}
        title="Drag to reorder"
        aria-label="Drag to reorder"
        aria-disabled={isUpdatingToolPosition}
        onDragStart={(e) => {
          if (isUpdatingToolPosition) {
            e.preventDefault();
            return;
          }
          handleToolDragStart(e, index);
        }}
        onDragEnd={handleToolDragEnd}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  const reorderColumn = columnHelper.display({
    id: "reorder",
    header: () => <span className="visually-hidden">Reorder</span>,
    cell: (info) => renderToolDragHandle(info.row.original, info.row.index),
    canSort: false,
  });

  useEffect(() => {
    if (taskPriority?.data?.length === 0 || !taskPriority) {
      getTaskPriority();
    }
    if (freeFlowLabelList?.data?.length === 0 || !freeFlowLabelList) {
      getFreeFlowLabelList();
    }
  }, []);

  const priority = taskPriority?.data?.map((item) => ({
    name: (
      <>
        <span
          style={{
            backgroundColor: item.colour_code,
            padding: "4px 8px",
            borderRadius: "4px",
            height: "18px",
            width: "19px",
            display: "inline-block",
          }}
        >
          &#160;
        </span>
        &#160; {item.name}
      </>
    ),
    status_id: item.status_id,
    colorCode: item.colour_code,
  }));

  const freeFlowLabel = freeFlowLabelList?.data?.map((item) => ({
    name: (
      <>
        <span
          style={{
            backgroundColor: item.colour_code,
            padding: "4px 8px",
            borderRadius: "4px",
            height: "18px",
            width: "19px",
            display: "inline-block",
          }}
        >
          &#160;
        </span>
        {item.name}
      </>
    ),
    status_id: item.status_id,
    colorCode: item.colour_code,
  }));

  useEffect(() => {
    if (activeWorkSpace) {
      const matchedWorkspace = userInfo?.userRoleResponseDetail?.find(
        (item) => item?.workSpaceId === activeWorkSpace[0]?.work_space_id,
      );
      const isAdmin = userInfo?.isSuperAdmin || userInfo?.user_type_code === "ADM";
      if (isAdmin || companyData?.workFlowType !== 60) {
        setValidOnboard(true);
      } else if (matchedWorkspace) {
        const boards = matchedWorkspace?.boards?.find((item) => item.boardCode === "OB");
        if (
          boards?.roleName === "Manager" ||
          boards?.roleName === "Lead" ||
          userInfo?.isSuperAdmin ||
          userInfo?.user_type_code === "ADM"
        ) {
          setValidOnboard(true);
        } else {
          setValidOnboard(false);
        }
      } else {
        setValidOnboard(false);
      }
    }
  }, [activeWorkSpace]);

  const nameField = isProcessWorkflow ? "toolName" : "subTaskName";

  const getUpdatedPriorityLabels = (row) =>
    taskPriority?.data?.map((label) => ({
      ...label,
      isSelected: toLabelIdSet(row?.priorityId).has(String(label.status_id)),
    })) || [];

  const getSelectedFreeFlowLabels = (row) =>
    matchFreeFlowLabels(freeFlowLabelList?.data, row?.freeFlowLabelId);

  const renderStageBadge = renderToolsStageBadge;

  const renderAssignee = (stage) => {
    if (stage?.assignee?.length > 0) {
      return (
        <div className="tools-info-assignee-list">
          {stage.assignee.map((assignee, idx) => (
            <div key={assignee?.regId || idx} className="tools-info-assignee">
              <div className="avatars">
                <LogoAvatarShowLetter
                  genaralData={assignee}
                  profileName={"displayName"}
                  outerClassName={"avatars__item"}
                  innerClassName={"avatars__img"}
                />
              </div>
              <div className="tools-info-assignee__meta">
                <p className="tools-info-assignee__name" title={getPersonName(assignee)}>
                  {getPersonName(assignee) || "---"}
                </p>
                {getPersonRole(assignee) ? (
                  <p className="tools-info-assignee__role">{getPersonRole(assignee)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="tools-info-assignee">
        <span className="circle-badge stage_Badge_na">N/A</span>
      </div>
    );
  };

  const renderExpandedToolRow = (row) => {
    if (expandedRowId !== getToolRowId(row) || row?.isActive === false) {
      return null;
    }

    const otherStages = getOtherBoardStages(row);
    const selectedLabels = getSelectedFreeFlowLabels(row);

    return (
      <ToolsMoreDetailsPanel
        createdDate={row?.createdDate}
        isProcessWorkflow={isProcessWorkflow}
        row={row}
        selectedLabels={selectedLabels}
        freeFlowLabelList={freeFlowLabelList}
        otherStages={otherStages}
        actions={
          isValidOnboard ? (
            <div className="tools-info-expanded__actions">
              {!isProcessWorkflow && (
                <button
                  type="button"
                  className="tools-info-expanded__action-btn tools-info-expanded__action-btn--edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateSubTask(row);
                  }}
                >
                  <img src={pencilSimpleLine} alt="Edit Task" />
                </button>
              )}
              <button
                type="button"
                className="tools-info-expanded__action-btn tools-info-expanded__action-btn--delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConfirmTool(row);
                }}
              >
                <img src={trashFull} alt="Remove Task" />
              </button>
            </div>
          ) : null
        }
      />
    );
  };

  const renderIodStageBadge = (stage) => {
    if (!stage?.stage?.name) return <span className="text-muted fs-12">---</span>;
    return (
      <div
        className="tools-info-iod-stage"
        style={{
          color: stage?.stage?.colorCode,
          border: `1px solid ${stage?.stage?.colorCode}`,
          backgroundColor: `${stage?.stage?.colorCode}10`,
        }}
        title={stage?.stage?.name}
      >
        {stage.stage.name}
      </div>
    );
  };

  const renderIodAssignees = (stages) => {
    const stageList = stages || [];
    if (!stageList.length) {
      return (
        <span className="circle-badge">
          <span>N/A</span>
        </span>
      );
    }
    return (
      <div className="tools-info-iod-assignees">
        {stageList.map((stage, stageIdx) => {
          const assignees = stage?.assignee?.length ? stage.assignee : [null];
          return assignees.map((assignee, idx) =>
            assignee ? (
              <div
                key={`${stage?.boardId || stageIdx}-${assignee?.regId || idx}`}
                className="tools-info-iod-assignees__item"
              >
                <div className="avatars">
                  <LogoAvatarShowLetter
                    genaralData={assignee}
                    profileName="displayName"
                    outerClassName="avatars__item"
                    innerClassName="avatars__img"
                  />
                </div>
                <p
                  className="tools-info-iod-assignees__name"
                  title={getPersonName(assignee)}
                >
                  {getPersonName(assignee) || "---"}
                </p>
              </div>
            ) : (
              <div
                key={`${stage?.boardId || stageIdx}-empty`}
                className="tools-info-iod-assignees__item"
              >
                <span className="circle-badge">
                  <span>N/A</span>
                </span>
              </div>
            ),
          );
        })}
      </div>
    );
  };

  const processToolColumns = [
    reorderColumn,
    columnHelper.accessor("toolName", {
      header: () => <span>Tool Name</span>,
      cell: (info) => {
        const row = info.row.original;
        return (
          <div
            className={`py-2 ${row?.isActive === false ? "text-decoration-line-through" : ""}`}
            title={info?.getValue()}
            onClick={() => getToolDetails(row)}
          >
            {info.getValue()}
            {row?.isActive === false && <span className="icon-info"></span>}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("activeStages", {
      header: () => <span>Stage</span>,
      cell: (info) => {
        const stages = info.row.original?.activeStages || [];
        return (
          <div className="activeStages-list-container">
            {stages.length > 0 ? (
              stages.map((stage) => (
                <div
                  key={stage?.boardId || stage?.boardName}
                  className="py-1 tools_info_board_stage d-flex"
                >
                  {renderIodStageBadge(stage)}
                </div>
              ))
            ) : (
              <span className="text-muted fs-12">---</span>
            )}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("currentAssignee", {
      header: () => <span>Current Assignee</span>,
      cell: (info) => renderIodAssignees(info.row.original?.activeStages),
      canSort: false,
    }),
    columnHelper.accessor("dueDate", {
      header: () => <span>Due Date</span>,
      cell: (info) => {
        const row = info.row.original;
        if (!row?.isActive) {
          return <div className="mt-1 py-1 d-flex">{row.deletedReason}</div>;
        }
        const activeStages = row.activeStages || [];
        const isLastStage =
          activeStages.length > 0
            ? activeStages.every(
                (d) => d.isFinalStage,
              )
            : false;            
        return (
          <div
            className="dueDateColor"
            style={{ color: getDueDateColor(info.getValue(), isLastStage) }}
          >
            {info.getValue() ? dayjs(info.getValue()).format("MMM DD, YYYY") : "---"}
            {row?.dueDateHistory?.length > 0 && (
              <img src={dueDateInfo} className="dueDateInfo" alt="" tabIndex={0} />
            )}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("board", {
      header: () => <span>Board</span>,
      cell: (info) => {
        const stages = info.row.original?.activeStages || [];
        return (
          <div className="activeStages-list-container">
            {stages.length > 0 ? (
              stages.map((stage) => (
                <div
                  key={stage?.boardId || stage?.boardName}
                  className="py-1 tools_info_board_stage"
                  title={stage?.boardName}
                >
                  <span className="tools_info_board_stage_name">
                    {stage?.boardName || "---"}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-muted fs-12">---</span>
            )}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("Action", {
      header: () => <span>Action</span>,
      cell: (info) => {
        const row = info.row.original;
        if (row.isActive === false) {
          return (
            <div className="text-danger text-start text-decoration-none">Deleted</div>
          );
        }
        return (
          <div className="tools-info-action-cell tools-info-action-cell--iod">
            {isValidOnboard ? (
              <button
                type="button"
                className="btn btn-0 p-0 border-0 tools-info-iod-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConfirmTool(row);
                }}
              >
                <img src={trashFull} alt="Remove Tool" />
              </button>
            ) : null}
          </div>
        );
      },
      canSort: false,
    }),
  ];

  const toolColumns = [
    reorderColumn,
    columnHelper.accessor(nameField, {
      header: () => (
        <span>{companyData.workFlowType === 60 ? "Tool Name" : "Task Name"}</span>
      ),
      cell: (info) => {
        const row = info.row.original;
        const description = stripHtmlText(row?.toolNotes || row?.description || row?.notes);
        return (
          <div
            className={`py-2 tools-info-task-name ${
              row?.isActive === false ? "text-decoration-line-through" : ""
            }`}
            title={info?.getValue()}
            onClick={() => getToolDetails(row)}
          >
            <div className="tools-info-task-name__text">
              <p className="tools-info-task-name__title">{info.getValue()}</p>
              {description ? (
                <p className="tools-info-task-name__desc" title={description}>
                  {description}
                </p>
              ) : null}
            </div>
            {row?.isActive === false && <span className="icon-info"></span>}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("activeStages", {
      header: () => <span>Stage</span>,
      cell: (info) => {
        const currentStage = getCurrentBoardStage(info.row.original);
        return (
          <div className="activeStages-list-container">
            <div className="py-1 tools_info_board_stage d-flex">
              {renderStageBadge(currentStage)}
            </div>
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("currentAssignee", {
      header: () => <span>Assignee</span>,
      cell: (info) => {
        const currentStage = getCurrentBoardStage(info.row.original);
        return renderAssignee(currentStage);
      },
      canSort: false,
    }),
    columnHelper.accessor("dueDate", {
      header: () => <span>Due Date</span>,
      cell: (info) => {
        const row = info.row.original;
        if (row?.isActive) {
          const activeStages = info.row.original.activeStages;
          const isLastStage =
            activeStages.length > 0
              ? activeStages.every(
                  (d) => d.isFinalStage,
                )
              : false;
          const dueColor = getDueDateColor(info.getValue(), isLastStage);
          
          return (
            <div className="tools-info-due" style={{ color: dueColor }}>
              <CalendarMiniIcon color={dueColor || "#d72323"} size={16} />
              <div className="tools-info-due__text">
                <p className="tools-info-due__date">
                  {info.getValue() ? dayjs(info.getValue()).format("MMM DD, YYYY") : "---"}
                  {row?.dueDateHistory?.length > 0 && (
                    <img src={dueDateInfo} className="dueDateInfo" alt="" tabIndex={0} />
                  )}
                </p>
                {info.getValue() ? (
                  <p className="tools-info-due__relative" style={{ color: dueColor }}>{getRelativeDueLabel(info.getValue())}</p>
                ) : null}
              </div>
            </div>
          );
        }
        return <div className="mt-1 py-1 d-flex">{row.deletedReason}</div>;
      },
      canSort: false,
    }),
    columnHelper.accessor("priorityId", {
      header: () => <span>Priority</span>,
      cell: (info) => {
        const row = info.row.original;
        return (
          renderTaskListPriority(row, getUpdatedPriorityLabels(row)) || (
            <span className="text-muted fs-12">---</span>
          )
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("Action", {
      header: () => <span>Action</span>,
      cell: (info) => {
        const row = info.row.original;
        if (row.isActive === false) {
          return (
            <div className="text-danger text-start text-decoration-none">Deleted</div>
          );
        }
        const rowId = getToolRowId(row);
        const isExpanded = expandedRowId === rowId;
        const isKebabOpen = openKebabRowId === rowId;
        return (
          <div className="tools-info-action-cell">
            <button
              type="button"
              className="tools-info-more-btn"
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                setOpenKebabRowId(null);
                setExpandedRowId((prev) => (prev === rowId ? null : rowId));
              }}
            >
              {isExpanded ? "Less" : "More"}
            </button>
            {isValidOnboard && (
              <div
                className="tools-info-kebab"
                ref={isKebabOpen ? kebabMenuRef : null}
              >
                <button
                  type="button"
                  className="tools-info-kebab__btn"
                  aria-label="More actions"
                  aria-expanded={isKebabOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenKebabRowId((prev) => (prev === rowId ? null : rowId));
                  }}
                >
                  <img src={kebabMenu} alt="" />
                </button>
                {isKebabOpen && (
                  <div className="tools-info-kebab__menu" role="menu">
                    {!isProcessWorkflow && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKebabRowId(null);
                          updateSubTask(row);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenKebabRowId(null);
                        deleteConfirmTool(row);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
      canSort: false,
    }),
  ];

  useEffect(() => {
    if (
      !deleteToolReasonList?.loading &&
      deleteToolReasonList?.data?.length === 0 &&
      companyData?.workFlowType === 60
    ) {
      getDeleteToolReasonList();
    }

    if (
      !deleteTaskReasonList?.loading &&
      deleteTaskReasonList?.data?.length === 0 &&
      companyData?.workFlowType !== 60
    ) {
      getDeleteTaskReasonList();
    }
  }, []);

  const resetActivityTabToComments = () => {
    dispatch({ type: "CLEAR_ACTIVE_COMMENTS_TAB" });
  };

  const getToolDetails = async (data) => {
    setSelectedTools(data);
    if (data?.isActive === false) {
      setViewDeletedTool(true);
    } else {
      if (data) {
        resetActivityTabToComments();
      }
      await preserveScroll(async () => {
        await refreshTicket();
      });

      const currentPath = window.location.href;

      // const baseUrl = currentPath.split("?toolId=")[0]; // remove old toolId if exists
      // const newPath = data
      //   ? `${baseUrl}?toolId=${data.toolId}`
      //   : currentPath.split("?toolId=")[0];
      // window.history.replaceState(null, "", newPath);

      // Remove "activetab" parameter if present
      const [baseUrl, queryString] = currentPath.split("?");
      if (queryString) {
        const params = new URLSearchParams(queryString);
        params.delete("activetab");
        params.delete(companyData?.workFlowType === 60 ? "toolId" : "taskId");
        const cleanedQuery = params.toString();
        const cleanUrl = cleanedQuery ? `${baseUrl}?${cleanedQuery}` : baseUrl;

        // Build new path with the latest toolId
        const newPath =
          companyData?.workFlowType === 60
            ? data
              ? `${cleanUrl}?toolId=${data.toolId}`
              : cleanUrl
            : data
              ? `${cleanUrl}?taskId=${data.ticketToolId}`
              : cleanUrl;
        window.history.replaceState(null, "", newPath);
      } else {
        // no query params, just add the new toolId
        const newPath =
          companyData?.workFlowType === 60
            ? data
              ? `${baseUrl}?toolId=${data.toolId}`
              : baseUrl
            : data
              ? `${baseUrl}?taskId=${data.ticketToolId}`
              : baseUrl;
        window.history.replaceState(null, "", newPath);
      }
      setRefreshToolTicketComment(true);
    }
    showMainComment(true);
  };

  useEffect(() => {
    onToolDetailViewChange?.(Boolean(selectedTools));
  }, [selectedTools, onToolDetailViewChange]);

  useEffect(() => {
    return () => onToolDetailViewChange?.(false);
  }, [onToolDetailViewChange]);

  useEffect(() => {
    if (!backToListTick) return;
    getToolDetails(null);
  }, [backToListTick]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolId =
      companyData?.workFlowType === 60 ? params.get("toolId") : params.get("taskId");
    if (toolId) {
      const selectedTool =
        companyData?.workFlowType === 60
          ? toolsInfoData?.filter((item) => String(item.toolId) === String(toolId))
          : toolsInfoData?.filter((item) => String(item.ticketToolId) === String(toolId));
      if (selectedTool.length > 0) {
        setSelectedTools(selectedTool[0]);
      } else {
        setSelectedTools();
      }
      setRefreshToolTicketComment(true);
    }
  }, [window.location.search]);

  const deleteConfirmTool = (data) => {
    setDeletedTool(data);
    setDeleteModal(true);
  };

  const updateSubTask = (value) => {
    const firstStage = value?.activeStages?.[0];
    const payload = {
      orderId: companyData?.orderId,
      taskName: companyData?.companyInfo?.taskName,
      priorityId: companyData?.companyInfo?.priorityId,
      subTaskUpdateMeta: {
        boardId: firstStage?.boardId,
        labelId: firstStage?.stage?.labelId ?? firstStage?.labelId,
        isTaskWorkFlow: companyData?.workFlowType !== 60,
      },
      toolList: [
        {
          listOfTools: [
            {
              toolName: value?.subTaskName,
              toolTicketId: value?.ticketToolId,
              toolBoardLogId: value?.toolBoardLogId ?? firstStage?.toolBoardLogId ?? null,
              dueDate: value?.dueDate ? dayjs(value?.dueDate).format("YYYY-MM-DD") : null,
              priorityId: value?.priorityId,
              freeFlowLabelId: value?.freeFlowLabelId,
              assignee: null,
            },
          ],
        },
      ],
    };
    setGettingSubTaskData(payload);
    setShowUpdateSubTask(true);
  };

  const cancelToolDelete = () => {
    setDeleteModal(false);
    setDeletedTool(null);
    setToolDeleteValues({
      type: "",
      description: "",
    });
  };

  const handleDeleteTool = async () => {
    if (!toolDeleteValues.type) return;

    try {
      setIsDeleting(true);
      const response = await deleteOrderedTool({
        tool_ticket_id: [deletedTool?.ticketToolId], //ticketToolID
        delete_reason_id: toolDeleteValues?.type?.[0]?.status_id,
        description: toolDeleteValues?.description || "",
      });
      if (response?.data?.status) {
        showToast({ variant: "success", message: response?.data?.message });
        cancelToolDelete();
        refreshTicket();
      } else {
        showToast({ variant: "danger", message: response?.data?.message });
      }
    } catch (err) {
      showToast({ variant: "danger", message: err?.message });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!selectedTools) return;

    const updatedTool =
      companyData?.workFlowType === 60
        ? companyData?.toolInfo?.find(
            (item) => String(item.toolId) === String(selectedTools.toolId),
          )
        : companyData?.toolInfo?.find(
            (item) => String(item.ticketToolId) === String(selectedTools.ticketToolId),
          );

    if (updatedTool) {
      setSelectedTools(updatedTool); // update to fresh latest data
    }
  }, [companyData]);

  return (
    <Row className="tools_info_main-container">
      <p className="tools_count_header">
        {isProcessWorkflow ? "Tool" : "Task"} Count: {toolsInfoData.length}
      </p>

      <Col lg={selectedTools ? 9 : 12} md={selectedTools ? 12 : 12}>
        {selectedTools && !viewDeletedTool && refreshToolTicketComment && companyData ? (
          <div>
            <div
              className="mobile-tool-back-btn mb-2"
              onClick={() => getToolDetails(null)}
            >
              <div
                className="d-flex align-items-center gap-1"
                style={{ cursor: "pointer", color: "var(--color-primary)" }}
              >
                <img src={chevronLeftDuoColor} alt="Back" style={{ width: "24px" }} />
                <span style={{ fontWeight: 500 }}>Back</span>
              </div>
            </div>
            {/* <div
              className={`tools_info_header ${!selectedTools && "activeTool"}`}
              onClick={() => getToolDetails()}
            >
              <button className="m-0 progress-Overview">
                {selectedTools && "activeTool" && (
                  <img
                    className="progress-overview-chevronLeftDuo"
                    src={chevronLeftDuoColor}
                    alt="chevronLeftDuo"
                  />
                )}
                Back to List{" "}
              </button>
            </div> */}
            <ToolsInfoDetails
              key={
                companyData?.workFlowType === 60
                  ? selectedTools?.toolId
                  : selectedTools?.ticketToolId
              }
              toolData={selectedTools}
              companyData={companyData}
              refreshToolTicketComment={refreshToolTicketComment}
              refreshTicket={refreshTicket}
              preserveScroll={preserveScroll}
            />
          </div>
        ) : (
          <div
            className={classNames(
              "tools_info_table_wrap",
              isUpdatingToolPosition && "is-updating-position",
            )}
          >
            <Table
              columns={isProcessWorkflow ? processToolColumns : toolColumns}
              columnData={toolsInfoData}
              className={classNames(
                "tools_info_main-table",
                isProcessWorkflow && "tools_info_iod-table",
              )}
              tableName={"SubInfoTable"}
              tableHeight="calc(100vh - 200px)"
              renderExpandedRow={isProcessWorkflow ? undefined : renderExpandedToolRow}
              getRowProps={getToolRowDragProps}
            />
            {isUpdatingToolPosition ? (
              <div
                className="tools_info_position_loader"
                role="status"
                aria-live="polite"
                aria-label="Updating tool positions"
              >
                <Spinner animation="border" size="sm" />
                <span>Updating positions…</span>
              </div>
            ) : null}
          </div>
        )}
      </Col>
      {selectedTools && (
        <Col lg={3}>
          <div className="toolsInfo_Right_sidePanel px-2">
            <div className="tools_list_container">
              {toolsInfoData?.length > 0 &&
                toolsInfoData.map((item, index) => {
                  return (
                    item.isActive !== false && (
                      <button
                        key={index}
                        className={`tools_info_toolName_button ${
                          selectedTools?.ticketToolId === item?.ticketToolId
                            ? "activeTool"
                            : ""
                        }`}
                        onClick={() => getToolDetails(item)}
                      >
                        {companyData?.workFlowType === 60
                          ? item?.toolName
                          : item?.subTaskName}
                      </button>
                    )
                  );
                })}
            </div>
          </div>
        </Col>
      )}

      <PopupModal
        show={deleteModal}
        onClose={() => setDeleteModal(false)}
        header={true}
        title={
          companyData?.workFlowType === 60
            ? deletedTool?.toolName
            : deletedTool?.subTaskName
        }
        className={"addAttachmentModal"}
        key="deleteModal"
      >
        <div className="formContainer">
          <div>
            <label>
              Reason <span className="text-danger">*</span>
            </label>
            <SelectDropDown
              id="reason"
              multi={false}
              searchable={false}
              options={
                (companyData?.workFlowType === 60
                  ? deleteToolReasonList?.data
                  : deleteTaskReasonList?.data) || []
              }
              labelField="name"
              valueField="status_id"
              values={toolDeleteValues.type || []}
              onChange={(e) => setToolDeleteValues({ ...toolDeleteValues, type: e })}
              placeholder="Reason"
              className="multiple-select mt-2"
              dropdownPosition="auto"
            />
          </div>
          <div className="mt-3 descriptionContainer">
            <label>
              Description{" "}
              {toolDeleteValues.type?.[0]?.name === "Others" && (
                <span className="text-danger"> *</span>
              )}
            </label>
            <textarea
              className="mt-2"
              placeholder="Additional details..."
              value={toolDeleteValues.description}
              onChange={(e) =>
                setToolDeleteValues({
                  ...toolDeleteValues,
                  description: e.target.value,
                })
              }
              maxLength={1500}
            ></textarea>
          </div>
          <div className="d-flex flex-row align-items-center justify-content-end gap-3 footerContainer mt-4">
            <button className="btn btn-0 " onClick={() => cancelToolDelete()}>
              Cancel
            </button>
            <button
              className="btn btn-0 submitBtn px-4 "
              disabled={
                isDeleting ||
                !toolDeleteValues.type?.length ||
                (toolDeleteValues.type?.[0]?.name === "Others" &&
                  !toolDeleteValues.description?.trim())
              }
              onClick={() => handleDeleteTool()}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </PopupModal>

      <PopupModal
        show={viewDeletedTool}
        onClose={() => {
          setSelectedTools();
          setViewDeletedTool(false);
        }}
        header
        title={` Deleted ${companyData?.workFlowType === 60 ? "Tool" : "Task"} Info`}
        className={"DeletedInfoModal"}
      >
        <div className=" d-flex flex-wrap deletedContainer rounded p-2">
          <div className="avatars">
            {selectedTools?.deletedBy && (
              <LogoAvatarShowLetter
                genaralData={selectedTools?.deletedBy}
                profileName={"name"}
                outerClassName={"avatars__item"}
                innerClassName={"avatars__img"}
              ></LogoAvatarShowLetter>
            )}
          </div>
          <div>
            <div className="mx-2 userText">{selectedTools?.deletedBy?.name}</div>
            <div className="mx-2 userText text-secondary">
              {selectedTools?.deletedBy?.email}
            </div>
          </div>
        </div>
        <div className="deleteReasonContainer rounded mt-3 p-2 ">
          <p className="mb-0 reasonText">{selectedTools?.deletedReason}</p>
          <p className="descText mt-2 mb-1">
            {" "}
            {selectedTools?.deletedDescription || "---"}{" "}
          </p>
        </div>
      </PopupModal>

      {/* 
      <PopupModal
        show={assigneeDialogOpen}
        onClose={() => setAssigneeDialogOpen(false)}
        header={true}
        title={selectedTool?.toolName +" Assignee"}
        customClassName={"assignee-container commonForm"}
      >
        <div className="movetoCard">
          <AssignMember
            userList={[]}
            assignedUser={[]}
            onChange={null}
            cancel={() => {
              
            }}
            apliLoading={false}
          />
        </div>
      </PopupModal> */}
      {companyData?.workFlowType !== 60 && showUpdateSubTask && gettingSubTaskData && (
        <CreateTaskModal
          createNewTask={true}
          isNewTask={false}
          cancelLinkModal={() => setShowUpdateSubTask(false)}
          selectedBoard={null}
          priority={priority}
          freeFlowLabelList={freeFlowLabel}
          callGetApi={refreshTicket}
          isSubTaskCreateable={true}
          isSubTaskUpdate={true}
          ticketData={gettingSubTaskData}
        ></CreateTaskModal>
      )}
    </Row>
  );
};

export default ToolsInfo;

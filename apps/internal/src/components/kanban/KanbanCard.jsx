import React, { Fragment, useEffect, useRef, useState } from "react";
import { Collapse } from "react-bootstrap";
import {
  getDueDateColor,
  renderLabels,
  renderOrderType,
  updateStoreFlowSelected,
  updateStoreToolDuedateField,
  updateStoreToolSelected,
  updateStoreAllFlowToolSelected,
  renderTaskPriority,
} from "../../utils/common";
import { useGlobalMaster } from "@orion/shared";
import {
  assignCalendarIcon,
  timerEmpty,
  pluseIconWhite,
  trashFull,
} from "../../assets/images";
import dayjs from "dayjs";
import { useNavigate, useLocation } from "react-router-dom";
import { useGlobalContext } from "store/context/GlobalProvider";
import { deleteTaskList, updateSubtaskTool } from "../../services";
import { useToast } from "@orion/shared";
import appConstants from "../../constant/common";
import CreateTaskModal from "../common/CreateTaskModal";
import DeleteConfirmModal from "../common/DeleteConfirmModal";
import ToolListView from "./ToolsContainer/ToolListView";
import TasklListView from "./ToolsContainer/TasklListView";
import SubToolLabels from "./SubToolLabels";
import { getKanbanDetailsPath, isOrdersWorkspace, readActiveKanbanFiltersFromStorage } from "../../utils/kanbanRoutes";
import { getDashboardTicketDetailsNav } from "../../utils/dashboard";

const ONBOARDING_BOARD_ID = 108;

const KanbanCard = ({
  stages,
  card,
  onDragStartCard,
  isSubTask,
  isMainTask,
  borderColor,
  stage,
  boardData,
  reloadTask,
  isDraggable,
  isFullView,
  isTask,
  onMoveSelectedNext,
  onDragStartTool,
  callTaskGetApi,
}) => {
  /** VARIABLE DECLARATION */
  const [open, setOpen] = useState(false);
  const { suggestedMembersList, orderType, labelList, taskPriority, freeFlowLabelList } = useGlobalMaster();
  const { taskDetails, dispatch } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation();
  const popupRef = useRef(null); // NEW ref for portal popup
  const containerRef = useRef(null);
  const [position, setPosition] = useState(null); // initially null
  const maxPosition = Math.max(...stages.map((s) => s.position));
  const [openAssignee, setOpenAssignee] = useState(false);
  // Check if the current stage is the last one
  const isLastStage = stage?.position === maxPosition;
  const AssigneeList = suggestedMembersList.data;
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [getToolTicketId, setToolTicketId] = useState(null);
  const [getTicketId, setTicketId] = useState(null);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const [toolBoxheight, setToolBoxheight] = useState(250); // initial height
  const [toolBoxMaxHeight, setToolBoxMaxHeight] = useState(400); // fallback
  const toolBoxMinHeight = 200;
  const getReloadFilters = () => readActiveKanbanFiltersFromStorage();
  const [selectAllFlowTools, setSelectAllFlowTools] = useState(false);
  const [createNewTask, setCreateNewTask] = useState(false);
  const [showCreateNewTask, setShowCreateNewTask] = useState(false);
  const [showDeleteTicketModal, setShowDeleteTicketModal] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
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
            backgroundColor: item.back_ground_colour || item.colour_code,
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
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;

      // Calculate height difference based on initial Y
      const diff = e.clientY - startY.current;
      const newHeight = Math.min(
        Math.max(startHeight.current + diff, toolBoxMinHeight),
        toolBoxMaxHeight,
      );

      setToolBoxheight(newHeight);
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [toolBoxMinHeight, toolBoxMaxHeight]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.scrollHeight;
        if (height > 0) {
          setToolBoxMaxHeight(height + 30);
        }
      }
    };
    const timeout = setTimeout(updateHeight, 0);
    // getSelectedTool(card.toolList);
    return () => clearTimeout(timeout);
  }, [card.toolList]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!anchorEl || !popupRef.current) return;

      const clickedOutside =
        !anchorEl.contains(event.target) && !popupRef.current.contains(event.target);

      if (clickedOutside) {
        setOpenAssignee(false);
        setAnchorEl(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorEl]);

  useEffect(() => {
    if (openAssignee && anchorEl) {
      calculatePosition();
      window.addEventListener("resize", calculatePosition);
    }
    return () => window.removeEventListener("resize", calculatePosition);
  }, [openAssignee, anchorEl]);

  function scrollCardToCenter(event) {
    event.stopPropagation();
    // Find the clicked kanban card
    const card = event.target.closest(".kanbanCard");
    if (!card) return;

    // Find the parent kanban column
    const column = card.closest(".kanban-card-container");
    if (!column) return;

    // Calculate vertical scroll offset to center the card
    const scrollOffset = card.offsetTop - column.clientHeight / 2 + card.clientHeight / 2;

    // Smooth scroll to the target position
    column.scrollTo({
      top: scrollOffset + 50,
      behavior: "smooth",
    });
  }

  const calculatePosition = () => {
    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const popupWidth = 180;
    const popupHeight = 190;

    let left = rect.left + rect.width + window.scrollX;
    if (left + popupWidth > window.innerWidth) {
      left = rect.left - popupWidth + window.scrollX;
    }

    let top = rect.top + rect.height + window.scrollY;
    if (top + popupHeight > window.scrollY + window.innerHeight - 100) {
      top = rect.top - popupHeight + window.scrollY;
    }
    setPosition({ top, left });
  };

  const selectToolChange = (flow, toolid) => {
    const newTaskDetails = updateStoreToolSelected(
      taskDetails,
      stage,
      card,
      flow,
      toolid,
    );
    setSelectAllFlowTools(false);
    dispatch({
      type: "SET_SUB_TASK_LIST",
      payload: newTaskDetails.subTaskList,
    });
  };

  const ensureToolSelected = (flow, tool) => {
    if (tool?.selected) return;
    selectToolChange(flow, tool);
  };

  const selectFlowChange = (flowid) => {
    const newTaskDetails = updateStoreFlowSelected(taskDetails, stage, card, flowid);
    setSelectAllFlowTools(false);
    dispatch({
      type: "SET_SUB_TASK_LIST",
      payload: newTaskDetails.subTaskList,
    });
  };

  const handleChangeAssignee = (toolTicketId, event) => {
    setAnchorEl(event.currentTarget); // The clicked element
    setOpenAssignee(!openAssignee);
    setToolTicketId(toolTicketId);
  };

  const updateTool = async (type, data, flowTool, toolSelected) => {
    setSelectedUser(data !== null ? [data] : data === null ? [] : data);
    const updatedTools = [
      {
        toolTicketId: toolSelected.toolTicketId,
        toolBoardLogId: toolSelected.toolBoardLogId,
        assignee: data?.regId || null,
        dueDate: toolSelected.dueDate || null,
      },
    ];

    const updateParam = {
      ticketId: card?.orderId,
      boardId: boardData[0]?.boardID,
      labelId: stage?.labelId,
      isAssignee: true,
      isDueDate: false,
      ...(isTask && { isTaskWorkFlow: true }),
      toolDetail: updatedTools,
    };
    const newTaskDetails = updateStoreToolDuedateField(
      taskDetails,
      stage,
      card,
      flowTool,
      updatedTools,
      "assignee",
      [
        {
          name: data?.displayName,
          photo: data?.photo,
          regId: data?.regId,
        },
      ],
    );

    setApiLoading(true);
    try {
      const response = await updateSubtaskTool(updateParam);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
        });
        setOpenAssignee(false);
        setTimeout(() => {
          const parsed = getReloadFilters();
          reloadTask(
            {
              ...parsed,
              pageOffSet: 0,
              pageSize:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(stage?.labelId)
                  ? parsed.pageSize * (parsed.pageOffSet + 1)
                  : 10,
              stageScroll:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(stage?.labelId)
                  ? parsed.stageScroll
                  : null,
            },
            false,
            null,
            "update",
          );
        }, 3000);
        setApiLoading(false);
        dispatch({
          type: "SET_SUB_TASK_LIST",
          payload: newTaskDetails.subTaskList,
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || String(error),
        variant: "danger",
      });
      setApiLoading(false);
    }
  };

  const startResizing = (e) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = toolBoxheight;
    document.body.style.cursor = "ns-resize";
  };

  const handleSelectAllFlowTools = (ticketId) => {
    const newTaskDetails = updateStoreAllFlowToolSelected(taskDetails, stage, card);
    setSelectAllFlowTools(!selectAllFlowTools);
    setTicketId(ticketId);
    dispatch({
      type: "SET_SUB_TASK_LIST",
      payload: newTaskDetails.subTaskList,
    });
  };

  /** HANDLE ORDER VIEW FUNCTION */
  const handleOrderView = (orderId, orderData, stage, isEditable) => {
    if (!orderId) return;

    const boardId = boardData[0]?.boardID;
    // Dashboard List "external link" uses /dashboard/board/details + dashboard crumbs.
    // Match that when Kanban is embedded on the dashboard.
    if (location.pathname.includes("/dashboard")) {
      const { path, state } = getDashboardTicketDetailsNav(boardId, orderId, {
        state: { orderData, isEditable, stage },
      });
      navigate(path, { state });
      return;
    }

    navigate(getKanbanDetailsPath(boardId, orderId), {
      state: {
        orderData,
        isEditable,
        stage,
        selectedFilters: getReloadFilters(),
      },
    });
  };

  const handleShowNewSubTask = () => {
    setCreateNewTask(!createNewTask);
  };

  const handleShowCreateNewTask = () => {
    const canAddSubTask =
      isTask &&
      Number(card?.toolList?.length) <= Number(appConstants.createSubTaskCountLimit);
    setShowCreateNewTask(canAddSubTask);
  };

  const fetchGetCreatedTaskAPI = async () => {
    const parsed = getReloadFilters();
    reloadTask(
      {
        ...parsed,
        pageOffSet: 0,
        pageSize:
          parsed.stageScroll !== null && parsed.stageScroll?.includes(stage?.labelId)
            ? parsed.pageSize * (parsed.pageOffSet + 1)
            : 10,
        stageScroll:
          parsed.stageScroll !== null && parsed.stageScroll?.includes(stage?.labelId)
            ? parsed.stageScroll
            : null,
      },
      false,
      null,
      "update",
    );
  };

  const boardId = Number(
    boardData?.[0]?.boardID ?? boardData?.[0]?.boardId ?? card?.boardId,
  );
  const boardCode = boardData?.[0]?.code ?? boardData?.[0]?.boardCode ?? card?.boardCode;
  const isOnboardingBoard =
    boardId === ONBOARDING_BOARD_ID || boardCode === "OB";
  const canDeleteOnboardTicket =
    (isOrdersWorkspace() ||
      (typeof window !== "undefined" &&
        window.location.pathname.startsWith("/orders"))) &&
    isOnboardingBoard &&
    !isTask;

  const handleDeleteOnboardTicket = async () => {
    if (!card?.orderId || isDeletingTicket) return;
    setIsDeletingTicket(true);
    try {
      const response = await deleteTaskList({
        ticket_id: card.orderId,
        tool_ticket_id: null,
      });
      if (response?.status || response?.data?.status) {
        showToast({
          message: response?.data?.message || "Delete task completed successfully",
          variant: "success",
        });
        setShowDeleteTicketModal(false);
        setTimeout(() => {
          const parsed = getReloadFilters();
          reloadTask(
            {
              ...parsed,
              pageOffSet: 0,
              pageSize:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(stage?.labelId)
                  ? parsed.pageSize * (parsed.pageOffSet + 1)
                  : 10,
              stageScroll:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(stage?.labelId)
                  ? parsed.stageScroll
                  : null,
            },
            false,
            null,
            "update",
          );
        }, 500);
      } else {
        showToast({
          message: response?.data?.message || "Failed to delete task",
          variant: "danger",
        });
      }
    } catch (error) {
      showToast({
        message: error?.response?.data?.message || error?.message || "Failed to delete task",
        variant: "danger",
      });
    } finally {
      setIsDeletingTicket(false);
    }
  };

  return (
    <div
      className="kanbanCard "
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStartCard(e, card, stage, e.currentTarget)}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove("is-dragging");
      }}
      style={
        isFullView === 1
          ? {
              minWidth: "350px",
              maxWidth: "450px",
              minHeight: "170px",
              flex: 1,
              alignSelf: "flex-start",
            }
          : {}
      }
      id={card?.orderId}
      onMouseEnter={handleShowCreateNewTask}
      onMouseLeave={() => setShowCreateNewTask(false)}
    >
      <div className="d-flex flex-row justify-content-between align-items-center ticket-card-header gap-2">
        <div className="d-flex flex-row gap-2 mb-1 align-items-start ticket-top-label-wrap">
          {isTask && (
            <div className="d-flex flex-row align-items-center gap-2 ticket-top-label-row">
              {renderTaskPriority(card, taskPriority.data)}
              {!isOrdersWorkspace() && (
                <SubToolLabels card={card} labelList={freeFlowLabelList?.data} />
              )}
            </div>
          )}

          {(isMainTask || isSubTask) &&
            renderOrderType(card?.orderType, orderType?.data, true, true)}
        </div>
        <div className="d-flex align-items-center gap-3 mb-1 ticket-card-header-meta">
          {card?.ticketOrderId && (
            <div className="boardIDText">{"#" + card?.ticketOrderId}</div>
          )}
          {/* {canDeleteOnboardTicket && (
            <button
              type="button"
              className="btn btn-0 p-0 m-0 onboard-ticket-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteTicketModal(true);
              }}
              title="Delete task"
              aria-label="Delete task"
              disabled={isDeletingTicket}
            >
              <img src={trashFull} alt="Delete task" width={16} height={16} />
            </button>
          )} */}
        </div>
      </div>
      <div
        className="d-flex align-items-center gap-2 pb-1 mt-1 cursor-pointe flex-wrap"
        onClick={() => handleOrderView(card.orderId, card, stage)}
      >
        <div className="d-flex flex-row align-items-center">
          {/* <div className="companyLogo">
            <img src={KanbanCompanyLogo} alt="KanbanCompanyLogo" />
          </div> */}
          <h6
            className="mb-0 companyNameText"
            title={isTask ? card.taskName : card.companyName}
          >
            {isTask ? card.taskName : card.companyName}
          </h6>
        </div>
        {isSubTask && card?.orderLabels?.length > 0 && <div className="w-100"> {renderLabels(card, labelList)}</div>}
      </div>

      {(isMainTask || isSubTask) && (
        <div className="d-flex justify-content-between mb-1 align-items-center">
          <div className=" d-flex flex-row align-items-center gap-1 dateRow mt-1">
            <img src={assignCalendarIcon} alt="assignCalendarIcon" />
            Ordered:{" "}
            <span>
              {card.orderDate ? dayjs(card?.orderDate).format(" DD MMM YYYY") : "---"}
            </span>
          </div>
        </div>
      )}
      {!isTask && (
        <ToolListView
          ui={{
            isMainTask,
            isSubTask,
            borderColor,
            open,
            setOpen,
            toolBoxheight,
            isLastStage,
            isDraggable,
          }}
          cardData={{
            card,
            boardData,
            stage,
          }}
          selection={{
            selectAllFlowTools,
            getTicketId,
            selectedUser,
            AssigneeList,
          }}
          handlers={{
            scrollCardToCenter,
            setSelectAllFlowTools,
            selectFlowChange,
            selectToolChange,
            ensureToolSelected,
            handleChangeAssignee,
            handleSelectAllFlowTools,
            setSelectedUser,
            setOpenAssignee,
            setApiLoading,
            updateTool,
            reloadTask,
            onDragStartTool,
          }}
          refs={{
            containerRef,
            popupRef,
          }}
          assignee={{
            openAssignee,
            getToolTicketId,
            position,
            apiLoading,
          }}
          resize={{
            startResizing,
          }}
        />
      )}
      {isTask && (
        <TasklListView
          ui={{
            isTask,
            isMainTask,
            borderColor,
            open,
            setOpen,
            toolBoxheight,
            isLastStage,
            taskPriority,
            isDraggable,
            freeFlowLabelList,
          }}
          cardData={{
            card,
            boardData,
            stage,
          }}
          selection={{
            selectAllFlowTools,
            getTicketId,
            selectedUser,
            AssigneeList,
          }}
          handlers={{
            scrollCardToCenter,
            setSelectAllFlowTools,
            selectFlowChange,
            selectToolChange,
            ensureToolSelected,
            handleChangeAssignee,
            handleSelectAllFlowTools,
            setSelectedUser,
            setOpenAssignee,
            setApiLoading,
            updateTool,
            reloadTask,
            onDragStartTool,
          }}
          refs={{
            containerRef,
            popupRef,
          }}
          assignee={{
            openAssignee,
            getToolTicketId,
            position,
            apiLoading,
          }}
          resize={{
            startResizing,
          }}
        />
      )}
      {isTask && open && (
        <>
          <button
            className="addSubTask"
            onClick={handleShowNewSubTask}
            disabled={
              card.toolList[0]?.listOfTools?.length >=
              appConstants.createSubTaskCountLimit
            }
          >
            Add Sub Task <img src={pluseIconWhite} alt="Add Sub Task" width="13" />
          </button>{" "}
          {card.toolList[0]?.listOfTools?.length >=
            appConstants.createSubTaskCountLimit && (
            <p className="error-msg">
              Sub Task create limit exceeded&#160;
              <b>({appConstants.createSubTaskCountLimit})</b>.
            </p>
          )}
        </>
      )}
      {isTask && (
        <Fragment>
          <div className="d-flex justify-content-between mt-1">
            <div className=" d-flex flex-row align-items-center gap-1 taskdateRow mt-1">
              <img src={timerEmpty} alt="timerEmpty" /> Last updated{" "}
              {card?.lastUpdatedDate?.length > 0 ? card.lastUpdatedDate : "---"}
            </div>
          </div>
        </Fragment>
      )}
      {isTask && card.toolList?.length > 0 && createNewTask && (
        <CreateTaskModal
          createNewTask={createNewTask}
          isNewTask={false}
          cancelLinkModal={() => setCreateNewTask(false)}
          selectedBoard={boardData}
          priority={priority}
          callGetApi={fetchGetCreatedTaskAPI}
          isSubTaskCreateable={true}
          ticketData={card}
          labelId={stage}
          freeFlowLabelList={freeFlowLabel}
        ></CreateTaskModal>
      )}
      {canDeleteOnboardTicket && (
        <DeleteConfirmModal
          show={showDeleteTicketModal}
          message={
            isDeletingTicket
              ? "Deleting..."
              : `Are you sure you want to delete "${card?.companyName || card?.taskName || "this task"}"?`
          }
          onClose={() => {
            if (!isDeletingTicket) setShowDeleteTicketModal(false);
          }}
          confirmDelete={handleDeleteOnboardTicket}
        />
      )}
    </div>
  );
};

export default KanbanCard;

import { useGlobalMaster } from "@orion/shared";
import {
  AssignUsers,
  CopyIcon,
  kebabMenu,
  TimerIcon,
  clockDark,
  trashFullBlack,
  trashFull,
  pencilSimpleLine,
  calendarBlank,
} from "../../../assets/images";
import { useToast } from "@orion/shared";
import { createPortal } from "react-dom";
import React, { useRef, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { subTaskMoveTool, updateSubtaskTool } from "../../../services";
import dayjs from "dayjs";
import PopupModal from "@orion/shared/src/components/PopupModal";
import DueDateCalendar from "../../common/DueDateCalendar";
import { useGlobalContext } from "store/context/GlobalProvider";
import { useNavigate, useLocation } from "react-router-dom";

import {
  updateStoreAllFlowToolDuedateField,
  updateStoreToolDuedateField,
} from "../../../utils/common";
import TaskDeletePopup from "./TaskDeletePopup";
import MoveToMenu from "./MoveToMenu";
import { useToolFlowData } from "./useToolFlowData";
import buildUpdatedTools from "./buildUpdatedTools";
import ToolAssignMember from "./ToolAssignMember";
import TaskMovetoMenu from "./TaskMovetoMenu";
import {
  getKanbanDetailsPath,
  readActiveKanbanFiltersFromStorage,
} from "../../../utils/kanbanRoutes";
import { getDashboardTicketDetailsNav } from "../../../utils/dashboard";
import CreateTaskModal from "../../common/CreateTaskModal";
import CreateTimeLogModal from "../../common/CreateTimeLogModal";
import ConnectKimaiModal from "../../common/ConnectKimaiModal";
import { hasKimaiCredentials } from "@orion/shared/src/utils/kimaiCredentials";
import { canOpenHubApp } from "constant/applicationHubApps";

const toIdArray = (value) => {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.filter((id) => id != null && id !== "");
  return [value];
};

const KebabMenu = ({
  isAllFlowSelected = false,
  isSelected = true,
  defaultToolAssignee = [],
  isAssigneeSelected = false,
  isGrouped,
  getData = [],
  reloadTask,
  labelData,
  boardData,
  toolSelected = {},
  ticketData,
  isTask,
}) => {
  /** VARIABLE DECLARATIONS */
  const { showToast } = useToast();
  const menuRef = useRef(null);
  const { taskDetails, dispatch, authState } = useGlobalContext();
  const userDetails = authState?.activeUser?.data?.details;
  const userName = userDetails?.userName;
  // Same app-permission gate as the Kimai tile on the Application Hub - only
  // show Time Log to users who are actually permitted to access Kimai.
  const canAccessKimai = canOpenHubApp(userDetails, "kimai");
  const toggleRef = useRef(null);
  const popupRef = useRef(null); // NEW ref for portal popup
  const [showDate, setShowDate] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [showConnectKimai, setShowConnectKimai] = useState(false);
  const [position, setPosition] = useState(null); // initially null
  const [isCopied, setCopied] = useState(false);
  const [openGroups, setOpenGroups] = useState({}); // track opened groups
  const [showAssignee, setShowAssignee] = useState(false);
  const [showAssigneePopup, setShowAssigneePopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const {
    suggestedMembersList,
    workFlowList,
    getWorkFlowList,
    deleteTaskReasonList,
    getDeleteTaskReasonList,
    taskPriority,
    freeFlowLabelList,
  } = useGlobalMaster();
  const AssigneeList = suggestedMembersList.data;
  const [selectedUser, setSelectedUser] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingActionId, setLoadingActionId] = useState(null);
  const getReloadFilters = () => readActiveKanbanFiltersFromStorage();
  const savedWorkSpaceState = localStorage.getItem("workspaceState");
  const parsedWorkSpaceState = JSON.parse(savedWorkSpaceState);
  const [selectedId, setSelectedId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [showEditSubTask, setShowEditSubTask] = useState(false);
  const [editSubTaskData, setEditSubTaskData] = useState(null);
  const { moveToData, getToolFlowData } = useToolFlowData({
    isTask,
    getData,
    workFlowList,
    getWorkFlowList,
    boardData,
    labelData,
  });
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  console.log("isTask", isTask);
  useEffect(() => {
    setSelectedUser(defaultToolAssignee);
  }, [defaultToolAssignee]);

  useEffect(() => {
    if (
      deleteTaskReasonList?.data === undefined ||
      deleteTaskReasonList?.data?.length === 0
    ) {
      getDeleteTaskReasonList();
    }
  }, []);

  useEffect(() => {
    setShowAssigneePopup(isAssigneeSelected);
  }, [isAssigneeSelected]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // if click is NOT on the button or popup
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        // setShow(false);
        setShowAssignee(false); // toggle only assignee
        setShowPopup(false);
        setShowAssigneePopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Recalculate position when show changes or on scroll/resize
  useEffect(() => {
    if (showPopup || showAssignee || showAssigneePopup) {
      calculatePosition(); // initial position
      // window.addEventListener("scroll", calculatePosition); // remove capture=true
      window.addEventListener("resize", calculatePosition);
    }
    return () => {
      // window.removeEventListener("scroll", calculatePosition);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [showPopup, showAssignee, showAssigneePopup]);

  // Calculate menu position
  const calculatePosition = () => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const popupWidth = 180;
    const popupHeight = 190; // adjust according to your popup content
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // default: open to right
    let left = rect.left + window.scrollX + rect.width;
    if (left + popupWidth > screenWidth) {
      left = screenWidth - popupWidth - 128; // flip to left
    }

    // default: open below
    let top = rect.top + window.scrollY + 25;

    // if popup would overflow bottom, flip above
    if (top + popupHeight > window.scrollY + screenHeight) {
      top = rect.top + window.scrollY - popupHeight + 20; // above the button
    }
    setPosition({ top, left });
  };

  const showPopupContent = () => {
    setShowPopup(!showPopup);
    getToolFlowData();
  };

  const viewToolInfo = () => {
    const toolTicketId = isGrouped
      ? isTask
        ? getData?.listOfTools[0]?.toolTicketId
        : getData?.listOfTools[0]?.toolId
      : isTask
        ? toolSelected?.toolTicketId
        : toolSelected?.toolId;
    const boardId = boardData[0]?.boardID;
    const query = toolTicketId ? `?${isTask ? "taskId" : "toolId"}=${toolTicketId}` : "";

    if (location.pathname.includes("/dashboard")) {
      const { path, state } = getDashboardTicketDetailsNav(boardId, ticketData.orderId, {
        query,
      });
      navigate(path, { state });
      return;
    }

    let path = getKanbanDetailsPath(boardId, ticketData.orderId);
    if (query) path += query;
    navigate(path);
  };

  const getSelectedSubTask = () => {
    if (isGrouped) {
      return getData?.listOfTools?.[0] || null;
    }
    return toolSelected || null;
  };

  const openEditSubTask = () => {
    const selectedTool = getSelectedSubTask();
    if (!selectedTool?.toolTicketId) return;

    const payload = {
      orderId: ticketData?.orderId,
      taskName: ticketData?.taskName,
      priorityId: toIdArray(ticketData?.priorityId),
      subTaskUpdateMeta: {
        boardId: boardData?.[0]?.boardID ?? boardData?.[0]?.boardId,
        labelId: labelData?.labelId,
        isTaskWorkFlow: true,
      },
      toolList: [
        {
          listOfTools: [
            {
              toolName: selectedTool?.toolName,
              toolTicketId: selectedTool?.toolTicketId,
              toolBoardLogId: selectedTool?.toolBoardLogId ?? null,
              dueDate: selectedTool?.dueDate
                ? dayjs(selectedTool.dueDate).format("YYYY-MM-DD")
                : null,
              priorityId: toIdArray(selectedTool?.priorityId),
              freeFlowLabelId: toIdArray(selectedTool?.freeFlowLabelId),
              assignee: null,
            },
          ],
        },
      ],
    };

    setEditSubTaskData(payload);
    setShowEditSubTask(true);
    setShowPopup(false);
  };

  const priorityOptions =
    taskPriority?.data?.map((item) => ({
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
    })) || [];

  const freeFlowLabelOptions =
    freeFlowLabelList?.data?.map((item) => ({
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
    })) || [];

  const refreshAfterSubTaskEdit = () => {
    const parsed = getReloadFilters();
    reloadTask?.(
      {
        ...parsed,
        pageOffSet: 0,
        pageSize:
          parsed?.stageScroll !== null &&
          parsed?.stageScroll?.includes(labelData?.labelId)
            ? parsed.pageSize * (parsed.pageOffSet + 1)
            : 10,
        stageScroll:
          parsed?.stageScroll !== null &&
          parsed?.stageScroll?.includes(labelData?.labelId)
            ? parsed.stageScroll
            : null,
      },
      false,
      null,
      "update",
    );
  };

  const copyLink = async () => {
    const toolTicketId = isGrouped
      ? isTask
        ? getData?.listOfTools[0]?.toolTicketId
        : getData?.listOfTools[0]?.toolId
      : isTask
        ? toolSelected?.toolTicketId
        : toolSelected?.toolId;
    const origin = window.location.origin;
    const boardId = boardData[0]?.boardID;
    const query = toolTicketId ? `?${isTask ? "taskId" : "toolId"}=${toolTicketId}` : "";
    const detailsPath = location.pathname.includes("/dashboard")
      ? getDashboardTicketDetailsNav(boardId, ticketData.orderId, { query }).path
      : `${getKanbanDetailsPath(boardId, ticketData.orderId)}${query}`;
    let copyText = `${origin}${detailsPath}`;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setShowPopup(false);
      showToast({
        message: isTask ? "Task Link Copied!" : "Tool Link Copied!",
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const updateTool = async (type, data, flowTool, toolSelected) => {
    setSelectedUser(
      type === "assignee" && data !== null
        ? [data]
        : type === "assignee" && data === null
          ? []
          : data,
    );
    // let updatedTools = null;
    const formattedDueDate =
      type === "dueDate" && data !== null
        ? dayjs(data.date).format("YYYY-MM-DDTHH:mm:ss")
        : null;
    // if (isGrouped) {
    //   updatedTools = getData?.listOfTools?.map((item) => ({
    //     toolTicketId: item.toolTicketId,
    //     toolBoardLogId: item.toolBoardLogId,
    //     assignee: type === "assignee" ? data?.regId : null,
    //     dueDate: type === "dueDate" ? formattedDueDate : item.dueDate || null,
    //   }));
    //   updatedTools = updatedTools?.flat();
    // } else if (isAllFlowSelected) {
    //   updatedTools = ticketData?.toolList.map((flow) =>
    //     flow.listOfTools?.map((item) => ({
    //       toolTicketId: item.toolTicketId,
    //       toolBoardLogId: item.toolBoardLogId,
    //       assignee: type === "assignee" ? data?.regId : null,
    //       dueDate: type === "dueDate" ? formattedDueDate : item.dueDate || null,
    //     })),
    //   );
    //   updatedTools = updatedTools?.flat();
    // } else {
    //   updatedTools = [
    //     {
    //       toolTicketId: toolSelected.toolTicketId,
    //       toolBoardLogId: toolSelected.toolBoardLogId,
    //       assignee: type === "assignee" ? data?.regId : null,
    //       dueDate:
    //         type === "dueDate"
    //           ? formattedDueDate
    //           : toolSelected.dueDate || null,
    //     },
    //   ];
    // }
    const updatedTools = buildUpdatedTools({
      isGrouped,
      isAllFlowSelected,
      getData,
      ticketData,
      toolSelected,
      type,
      data,
      formattedDueDate,
    });

    const updateParam = {
      ticketId: ticketData?.orderId,
      boardId: boardData[0]?.boardID,
      labelId: labelData?.labelId,
      isAssignee: type === "assignee",
      isDueDate: type === "dueDate",
      ...(isTask && { isTaskWorkFlow: true }),
      toolDetail: updatedTools,
    };

    const newTaskDetails = isAllFlowSelected
      ? updateStoreAllFlowToolDuedateField(
          taskDetails,
          labelData,
          ticketData,
          type, // "assignee" | "dueDate"
          type === "assignee"
            ? [
                {
                  name: data?.displayName,
                  photo: data?.photo,
                  regId: data?.regId,
                },
              ]
            : type === "dueDate" && data !== null
              ? data.date
              : data,
        )
      : updateStoreToolDuedateField(
          taskDetails,
          labelData,
          ticketData,
          getData,
          updatedTools,
          type,
          type === "assignee"
            ? [
                {
                  name: data?.displayName,
                  photo: data?.photo,
                  regId: data?.regId,
                },
              ]
            : type === "dueDate" && data !== null
              ? data.date
              : data,
        );

    setApiLoading(true);
    try {
      const response = await updateSubtaskTool(updateParam);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
        });
        toggleRef.current?.click();
        setShowPopup(false);
        setShowAssignee(false);
        setSelectedUser(
          type === "assignee" && data !== null
            ? [data]
            : type === "assignee" && data === null
              ? []
              : data,
        );
        setShowDate(false);
        setTimeout(() => {
          const parsed = getReloadFilters();
          reloadTask(
            {
              ...parsed,
              pageOffSet: 0,
              pageSize:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(labelData?.labelId)
                  ? parsed.pageSize * (parsed.pageOffSet + 1)
                  : 10,
              stageScroll:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(labelData?.labelId)
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

  const moveToTicket = async (data) => {
    if (!data) return;
    setLoadingActionId(isTask ? data.board_id : data.action_id);
    const toolAssignee = isAllFlowSelected
      ? toolSelected.every(
          (tool) => Array.isArray(tool.assignee) && tool.assignee.length > 0,
        )
      : toolSelected?.assignee.length > 0;

    if (isTask && !toolAssignee) {
      showToast({
        message: `Assign someone to the selected "Sub Task" before moving!`,
        variant: "danger",
      });
      setLoadingActionId(null);
      return;
    }
    setApiLoading(true);
    try {
      const toolIds = isGrouped
        ? getData?.listOfTools?.map((item) => item.toolTicketId)
        : [toolSelected.toolTicketId];
      const flowId = getData?.flowId;
      const currentBoardId = boardData[0]?.boardID;
      const TargetBoardId = isTask
        ? data?.board_id
        : data?.targets.find((item) => item.board_id === currentBoardId);
      const updatedParam = isTask
        ? {
            boardId: currentBoardId,
            toolTicketId: toolIds,
            flowId: null,
            isMoved: false,
            actionId: null,
            isTaskWorkFlow: true,
            flowDetail: {
              source: {
                board_id: currentBoardId,
                board_name: boardData[0]?.name,
                label_id: labelData?.labelId,
                label_name: labelData?.name,
                workspace_id: parsedWorkSpaceState?.activeWorkSpace[0]?.work_space_id,
                workspace_name: parsedWorkSpaceState?.activeWorkSpace[0]?.name,
              },
              targets: {
                board_id: data?.board_id,
                board_name: data?.board_name,
                label_id: data?.label_id,
                label_name: data?.label_name,
                unassigned: data.unassigned,
                emailnotify: true,
                workspace_id: data?.workspace_id,
                workspace_name: data?.workspace_name,
              },
            },
          }
        : {
            boardId: currentBoardId,
            toolTicketId: toolIds,
            flowId: flowId,
            isMoved: TargetBoardId ? false : true,
            actionId: data?.action_id,
            isTaskWorkFlow: false,
            flowDetail: null,
          };

      const response = await subTaskMoveTool(updatedParam);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
        });
        toggleRef.current?.click();
        setApiLoading(false);
        setShowPopup(false);
        setShowTaskPopup(false);
        setLoadingActionId(null);
        const parsed = getReloadFilters();
        reloadTask(
          {
            ...parsed,
            pageOffSet: 0,
            pageSize:
              parsed.stageScroll !== null &&
              parsed.stageScroll?.includes(labelData?.labelId)
                ? parsed.pageSize * (parsed.pageOffSet + 1)
                : 10,
            stageScroll:
              parsed.stageScroll !== null &&
              parsed.stageScroll?.includes(labelData?.labelId)
                ? parsed.stageScroll
                : null,
          },
          false,
          null,
          "update",
        );
      } else {
        showToast({
          message: response?.data?.message,
          variant: "danger",
        });
        setLoadingActionId(null);
        setApiLoading(false);
      }
    } catch (error) {
      setLoadingActionId(null);
      showToast({
        message: error?.message || String(error),
        variant: "danger",
      });
    }
  };

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id], // toggle
    }));
  };

  const getFirstDueDate = (flows) => {
    for (const flow of flows) {
      for (const tool of flow?.listOfTools || []) {
        if (tool?.dueDate) {
          return tool?.dueDate;
        }
      }
    }
    return null;
  };

  return (
    <div className="kebab-container" ref={menuRef}>
      {isSelected && !isAssigneeSelected && (
        <button className="kebab-btn" onClick={showPopupContent}>
          <img src={kebabMenu} alt="EditPrimaryIcon" />
        </button>
      )}
      {showPopup &&
        !isAssigneeSelected &&
        createPortal(
          <div
            className="kebabDropDown shadow"
            style={{ position: "absolute", width: "175px", ...position }}
            ref={popupRef}
          >
            {(isTask || (!isTask && !isAllFlowSelected)) && (
              <>
                <Dropdown
                  drop="end"
                  align="up"
                  onToggle={(isOpen) => {
                    if (isOpen) {
                      getToolFlowData();
                      if (isTask) {
                        setShowTaskPopup(true);
                      }
                    }
                  }}
                >
                  <Dropdown.Toggle
                    className="menu-item border-0 bg-white border-0 d-flex justify-content-between menu-item-btn"
                    id="dropdown-dropright"
                    disabled={
                      (isGrouped
                        ? getData?.listOfTools?.some(
                            (tool) => tool?.assignee?.length === 0,
                          )
                        : toolSelected?.assignee?.length === 0) || false
                    }
                    // onClick={(e) => {
                    //   e.preventDefault();
                    //   getToolFlowData();
                    // }}
                  >
                    <span className="move-to-aarow">&#x2192; &#160;&#160;Move to</span>
                  </Dropdown.Toggle>

                  {!isTask && (
                    <Dropdown.Menu
                      className="menu-item border-0 p-2 mx-4 shadow mb-5 border bg-white menu-item-btn"
                      style={{ minWidth: "350px" }}
                    >
                      <MoveToMenu
                        moveToData={moveToData}
                        openGroups={openGroups}
                        toggleGroup={toggleGroup}
                        loadingActionId={loadingActionId}
                        moveToTicket={moveToTicket}
                      />
                    </Dropdown.Menu>
                  )}
                  {moveToData?.length === 0 && isTask && showTaskPopup && (
                    <Dropdown.Menu
                      className="menu-item border-0 p-2 mx-4 shadow mb-5 border bg-white menu-item-btn"
                      style={{ minWidth: "350px" }}
                    >
                      <div className="movetoCard">No Board Stages</div>
                    </Dropdown.Menu>
                  )}
                </Dropdown>
                {!isAllFlowSelected && (
                  <div className="menu-item">
                    <button
                      onClick={() => viewToolInfo()}
                      className="border-0 bg-white menu-item-btn d-flex justify-content-between"
                    >
                      <div className="icon-open-eye"></div>&#160; View{" "}
                      {isTask ? "Task" : "Tool"}
                    </button>
                  </div>
                )}
                {isTask && !isAllFlowSelected && (
                  <div className="menu-item">
                    <button
                      onClick={openEditSubTask}
                      className="border-0 bg-white menu-item-btn d-flex justify-content-between align-items-center gap-2"
                    >
                      <img src={pencilSimpleLine} alt="" width={16} />
                      Edit
                    </button>
                  </div>
                )}
              </>
            )}

            <Dropdown drop="end" align="up">
              <Dropdown.Toggle
                ref={toggleRef}
                className="menu-item border-0 bg-white menu-item-btn assign-member-btn"
                id="dropdown-dropright"
              >
                <div className="d-flex gap-2 p-0">
                  <img src={AssignUsers} alt="AssignUsers" /> Assign Member &#160;
                </div>
              </Dropdown.Toggle>
              <Dropdown.Menu
                className="border-0 p-3 mx-4 shadow mb-5 border bg-white"
                style={{ minWidth: "350px" }}
              >
                <ToolAssignMember
                  apiLoading={apiLoading}
                  flowData={getData}
                  toolSelected={toolSelected}
                  assigneeList={AssigneeList}
                  selectedUser={selectedUser}
                  updateTool={updateTool}
                  setApiLoading={setApiLoading}
                  setOpenAssignee={() => toggleRef.current?.click()}
                />
              </Dropdown.Menu>
            </Dropdown>
            {!isAllFlowSelected && (
              <div className="menu-item">
                <button
                  className="btn btn-0 d-flex gap-2 p-0 border-0 menu-item-btn"
                  onClick={() => copyLink()}
                >
                  <img src={CopyIcon} alt="AssignUsers" width={19} />
                  {isCopied ? (
                    <span className="text-success font-weight-bold">Link Copied!</span>
                  ) : (
                    "Copy link"
                  )}
                </button>
              </div>
            )}
            {(boardData[0]?.code === "OB" || isTask) && (
              <div className="menu-item">
                <div className="picker-date mt-1 position-relative">
                  <button
                    className="btn btn-0 d-flex gap-2 p-0 border-0 menu-item-btn"
                    onClick={() => setShowDate(!showDate)}
                  >
                    <img src={calendarBlank} alt="TimerIcon" width={18} />
                    &#160;Due date
                  </button>
                </div>
              </div>
            )}
            {canAccessKimai && (
              <div className="menu-item">
                <div className="picker-date mt-1 position-relative">
                  <button
                    className="btn btn-0 d-flex gap-2 p-0 border-0 menu-item-btn"
                    onClick={() =>
                      hasKimaiCredentials(userName)
                        ? setShowTimeLog(true)
                        : setShowConnectKimai(true)
                    }
                  >
                    <img src={TimerIcon} alt="Time Log" width={16} />
                    &#160;Time Log
                  </button>
                </div>
              </div>
            )}
            {isTask && (
              <div className="menu-item">
                <div className="picker-date mt-1 position-relative">
                  <button
                    className="btn btn-0 d-flex gap-2 p-0 border-0 menu-item-btn"
                    onClick={() => setDeleteModal(!deleteModal)}
                  >
                    <img src={trashFull} alt="Task" width={"17px"} />
                    &#160;Delete Task
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}

      <PopupModal
        show={showDate}
        onClose={() => setShowDate(!showDate)}
        header={true}
        title={"Select Due Date"}
        customClassName={"dueDateCalender"}
        children={
          <div className="d-flex flex-row justify-content-center p-0 m-0">
            <DueDateCalendar
              defaultDate={
                isGrouped
                  ? getFirstDueDate([getData])
                  : isAllFlowSelected
                    ? getFirstDueDate(ticketData.toolList)
                    : toolSelected?.dueDate
              }
              onSelect={(date) => {
                const formattedDate = dayjs(date).format("YYYY-MM-DD HH:mm:ss");
                updateTool("dueDate", date, getData, toolSelected);
              }}
              onReset={() => {
                updateTool("dueDate", null, getData, toolSelected);
              }}
              oncancel={() => {
                setShowDate(!showDate);
                setApiLoading(false);
              }}
              apiLoading={apiLoading}
            />
          </div>
        }
      />
      <CreateTimeLogModal
        show={showTimeLog}
        onClose={() => setShowTimeLog(false)}
        ticketData={ticketData}
        toolSelected={isGrouped ? getData?.listOfTools : [toolSelected]}
        onNeedReconnect={() => {
          setShowTimeLog(false);
          setShowConnectKimai(true);
        }}
        isTask={isTask}
      />
      <ConnectKimaiModal
        show={showConnectKimai}
        onClose={() => setShowConnectKimai(false)}
        userName={userName}
        onConnected={() => {
          setShowConnectKimai(false);
          setShowTimeLog(true);
        }}
      />
      {/* DELETE TASK POPUP */}
      <TaskDeletePopup
        ticketData={ticketData}
        toolSelected={toolSelected}
        deleteModal={deleteModal}
        title={isAllFlowSelected ? "All Task" : `${toolSelected?.toolName}`}
        setDeleteModal={setDeleteModal}
        setSelectedId={setSelectedId}
        reloadTask={reloadTask}
        labelData={labelData}
      ></TaskDeletePopup>
      {isTask && showTaskPopup && moveToData?.length > 0 && (
        <TaskMovetoMenu
          moveToData={moveToData}
          moveToTicket={moveToTicket}
          showPopup={showTaskPopup}
          closePopup={setShowTaskPopup}
          apiLoading={apiLoading}
        ></TaskMovetoMenu>
      )}
      {isTask && showEditSubTask && editSubTaskData && (
        <CreateTaskModal
          createNewTask={true}
          isNewTask={false}
          cancelLinkModal={() => {
            setShowEditSubTask(false);
            setEditSubTaskData(null);
          }}
          selectedBoard={boardData}
          priority={priorityOptions}
          freeFlowLabelList={freeFlowLabelOptions}
          callGetApi={refreshAfterSubTaskEdit}
          isSubTaskCreateable={true}
          isSubTaskUpdate={true}
          ticketData={editSubTaskData}
          labelId={labelData}
        />
      )}
    </div>
  );
};
export default KebabMenu;

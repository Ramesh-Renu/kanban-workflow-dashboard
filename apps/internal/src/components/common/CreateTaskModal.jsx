import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import dayjs from "dayjs";
import { createTask, updateSubtaskTool } from "../../services";
import { toChecklistApiItems } from "utils/checkList";
import { useToast, useGlobalMaster } from "@orion/shared";
import ToolTipPopup from "./ToolTipPopup";
import { pluseIconWhite, UserAddPrimary } from "../../assets/images";
import appConstants from "../../constant/common";
import DateTimeCalendar from "./DateTimeCalendar";
import trashIcon from "../../assets/images/trash_full.svg";
import { Row } from "react-bootstrap";
import LogoAvatarShowLetter from "./LogoAvatarShowLetter";
import ToolAssignMember from "../kanban/KebabMenu/ToolAssignMember";
import DueDateCalendar from "./DueDateCalendar";
import SelectDropDown from "@orion/shared/src/components/SelectDropDown";

const toIdArray = (value) => {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (item != null && typeof item === "object" ? item.status_id : item))
      .filter((id) => id != null && id !== "");
  }
  if (typeof value === "object") {
    return value.status_id != null ? [value.status_id] : [];
  }
  return [value];
};

const getFirstPriorityOption = (priority = [], id) => {
  const matchId = toIdArray(id)[0];
  if (matchId != null) {
    const matched = priority.find((p) => p.status_id === matchId);
    if (matched) return [matched];
  }
  return [];
};

const getPlainLabelText = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node).trim();
  if (Array.isArray(node)) {
    return node.map(getPlainLabelText).filter(Boolean).join(" ").trim();
  }
  if (node?.props?.children != null) {
    return getPlainLabelText(node.props.children);
  }
  return "";
};

const normalizeFreeFlowLabelItem = (item) => {
  if (!item || item.status_id == null) return null;

  return {
    status_id: item.status_id,
    name: typeof item.name === "string" ? item.name : getPlainLabelText(item.name),
    colorCode:
      item.colorCode || item.colour_code || item.back_ground_colour || item.color || null,
  };
};

const normalizeFreeFlowLabelSelection = (selection = []) =>
  (Array.isArray(selection) ? selection : [selection])
    .map(normalizeFreeFlowLabelItem)
    .filter(Boolean);

/** Resolve free-flow label ids whether stored as ids or option objects. */
const resolveFreeFlowLabelIds = (value = []) => {
  const list = Array.isArray(value) ? value : value != null ? [value] : [];
  return list
    .map((item) =>
      item != null && typeof item === "object" ? item.status_id : item,
    )
    .filter((id) => id != null && id !== "");
};

const mapFreeFlowLabelsFromIds = (value, labelList = []) => {
  const ids = new Set(resolveFreeFlowLabelIds(value));
  if (ids.size === 0) return [];
  return normalizeFreeFlowLabelSelection(
    (labelList || []).filter((p) => ids.has(p.status_id)),
  );
};

const freeFlowLabelIdsKey = (value = []) =>
  resolveFreeFlowLabelIds(value)
    .map(String)
    .sort()
    .join(",");

const compareFreeFlowLabelValues = (a = [], b = []) => {
  if (a === b) return true;
  return freeFlowLabelIdsKey(a) === freeFlowLabelIdsKey(b);
};

const CreateTaskModal = ({
  createNewTask,
  cancelLinkModal,
  isNewTask,
  selectedBoard,
  priority,
  freeFlowLabelList,
  callGetApi,
  isSubTaskCreateable = false,
  isSubTaskUpdate = false,
  ticketData,
  labelId,
}) => {
  const { showToast } = useToast();
  const howitswork = [
    "Add a task title to describe the work clearly",
    "Set the task priority to indicate urgency",
    "Track the task through different stages (To Do, In Progress, Done)",
    "Update or complete the task anytime from your board",
  ];

  /* -------------------- STATES -------------------- */
  const [apiLoading, setApiLoading] = useState(false);
  const { suggestedMembersList } = useGlobalMaster();
  const popupRef = useRef(null); // NEW ref for portal popup
  const AssigneeList = suggestedMembersList.data;
  const [taskValues, setTaskValues] = useState({
    taskName: "",
    orderId: 0,
    priorityId: [],
  });

  const [subTaskValues, setSubTaskValues] = useState({
    toolName: "",
    priorityId: [],
    dueDate: "",
    dueDateChangeReason: null,
    toolTicketId: "",
    freeFlowLabelId: [],
    assignee: [],
  });

  const [createSubTaskList, setCreateSubTaskList] = useState([
    {
      toolName: "",
      priorityId: [],
      freeFlowLabelId: [],
      dueDate: "",
      dueDateChangeReason: null,
      toolTicketId: "",
      assignee: [],
      freeFlowLabelId: [],
    },
  ]);
  const [showDate, setShowDate] = useState(false);
  const [prevSubTaskList, setPrevSubTaskList] = useState([]);
  const [editSubtaskId, setEditSubtaskId] = useState(null);
  const [hasChanged, setHasChanged] = useState(false);
  const [enteredCharacter, setEnteredCharacter] = useState(false);
  const [enteredCharacterMin, setEnteredCharacterMin] = useState(false);
  const [enteredSubTaskCharacter, setEnteredSubTaskCharacter] = useState(false);
  const [enteredSubTaskCharacterMin, setEnteredSubTaskCharacterMin] = useState(false);
  const [enteredSubTaskCount, setEnteredSubTaskCount] = useState(false);
  const [openAssignee, setOpenAssignee] = useState(false);
  const [openLabelMenuId, setOpenLabelMenuId] = useState(null);
  const [getToolTicketId, setToolTicketId] = useState(null);
  const [selectedUser, setSelectedUser] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [editSubtaskDueDate, setEditSubtaskDueDate] = useState(null);
  const freeFlowLabelOptions = useMemo(
    () => normalizeFreeFlowLabelSelection(freeFlowLabelList),
    [freeFlowLabelList],
  );

  useEffect(() => {
    if (ticketData && isSubTaskCreateable) {
      setTaskValues({
        taskName: ticketData.taskName || "",
        priorityId: getFirstPriorityOption(priority, ticketData.priorityId),
        orderId: ticketData.orderId || 0,
      });
    }
    if (isSubTaskUpdate) {
      const ticketDataSubTask = ticketData?.toolList[0]?.listOfTools.map((tool) => ({
        toolName: tool?.toolName,
        priorityId: getFirstPriorityOption(priority, tool.priorityId),
        freeFlowLabelId: mapFreeFlowLabelsFromIds(
          tool.freeFlowLabelId,
          freeFlowLabelList,
        ),
        dueDate: tool?.dueDate || "",
        dueDateChangeReason: tool?.dueDateChangeReason ?? null,
        toolTicketId: tool.toolTicketId ?? "",
        toolBoardLogId: tool.toolBoardLogId ?? null,
        checkList: tool.checkList || [],
      }));
      setCreateSubTaskList(ticketDataSubTask);
    } else {
      setCreateSubTaskList([
        {
          toolName: "",
          priorityId: [],
          freeFlowLabelId: [],
          dueDate: "",
          dueDateChangeReason: null,
          toolTicketId: "",
          checkList: [],
        },
      ]);
    }
  }, [createNewTask]);

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

  /* -------------------- HANDLERS -------------------- */
  const handleTaskValues = (name, value) => {
    if (name === "taskName") {
      const limitedText = value.slice(0, appConstants.createSubTaskNameCharMaxLimit);

      setEnteredCharacter(value.length > appConstants.createSubTaskNameCharMaxLimit);

      setEnteredCharacterMin(
        value.length !== 0 && value.length < appConstants.createSubTaskNameCharMinLimit,
      );

      setTaskValues((prev) => ({
        ...prev,
        [name]: limitedText,
      }));
    } else {
      setEnteredCharacter(false);
      setTaskValues((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  const addSubTaskData = () => {
    if (createSubTaskList.length >= appConstants.createSubTaskCountLimit) {
      setEnteredSubTaskCount(true);
      return;
    }
    if (createSubTaskList.length >= appConstants.createSubTaskCountLimit) {
      setEnteredSubTaskCount(true);
      return;
    } else {
      setEnteredSubTaskCount(false);
    }

    setHasChanged(false);
    setCreateSubTaskList((prev) => [
      ...prev,
      {
        ...subTaskValues,
        toolTicketId: prev.toolTicketId || "new_" + Date.now().toString(),
      },
    ]);
    setPrevSubTaskList((prev) => [
      ...prev,
      {
        ...subTaskValues,
        toolTicketId: prev.toolTicketId || "new_" + Date.now().toString(),
      },
    ]);
    setSubTaskValues({
      toolName: "",
      priorityId: [],
      freeFlowLabelId: [],
      dueDate: "",
      dueDateChangeReason: null,
      toolTicketId: "",
      assignee: [],
    });
    setEditSubtaskId(null);
  };

  const generateNewId = () =>
    "new_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

  const matchesToolTicketId = (a, b) => a != null && b != null && String(a) === String(b);

  const updateSubtaskDueDateApi = async (toolTicketId, data) => {
    const task =
      createSubTaskList.find((t) => matchesToolTicketId(t.toolTicketId, toolTicketId)) ||
      (matchesToolTicketId(editSubtaskDueDate?.toolTicketId, toolTicketId)
        ? editSubtaskDueDate
        : null);
    if (!task) return;

    const meta = ticketData?.subTaskUpdateMeta ?? {};
    const formattedDueDate =
      data?.date != null ? dayjs(data.date).format("YYYY-MM-DDTHH:mm:ss") : null;

    const updateParam = {
      ticketId: ticketData?.orderId,
      boardId: meta.boardId ?? selectedBoard?.[0]?.boardID,
      labelId: meta.labelId ?? labelId?.labelId,
      isAssignee: false,
      isDueDate: true,
      ...(meta.isTaskWorkFlow !== false && { isTaskWorkFlow: true }),
      toolDetail: [
        {
          toolTicketId: task.toolTicketId,
          toolBoardLogId: task.toolBoardLogId ?? null,
          assignee: null,
          dueDate: formattedDueDate,
          dueDateChangeReason: data?.description !== undefined ? data.description : null,
        },
      ],
    };

    if (
      !updateParam.ticketId ||
      updateParam.boardId == null ||
      updateParam.labelId == null
    ) {
      showToast({
        message: "Missing board or stage info for due date update",
        variant: "danger",
      });
      return;
    }

    setApiLoading(true);
    try {
      const response = await updateSubtaskTool(updateParam);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message || "Due date updated successfully",
          variant: "success",
        });
        callGetApi?.();
        setShowDate(false);
      } else {
        showToast({
          message: response?.data?.message || "Failed to update due date",
          variant: "danger",
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to update due date",
        variant: "danger",
      });
    } finally {
      setApiLoading(false);
    }
  };

  const handleDueDateChange = async (data) => {
    const toolTicketId = editSubtaskDueDate?.toolTicketId;
    if (toolTicketId == null || toolTicketId === "") return;

    if (!data?.date) {
      editSubTaskData("dueDate", "", toolTicketId, { closeDatePicker: false });
      if (isSubTaskUpdate) {
        await updateSubtaskDueDateApi(toolTicketId, null);
      } else {
        setShowDate(false);
      }
      return;
    }

    editSubTaskData("dueDate", data, toolTicketId, { closeDatePicker: false });
    if (isSubTaskUpdate) {
      await updateSubtaskDueDateApi(toolTicketId, data);
    } else {
      setShowDate(false);
    }
  };

  const editSubTaskData = (name, value, getsubtaskid, options = {}) => {
    const subtaskid = name === "assignee" ? getsubtaskid.toolTicketId : getsubtaskid;
    if (options.closeDatePicker !== false && name === "dueDate") {
      setShowDate(false);
    }
    const hasSubtaskId =
      subtaskid !== null &&
      subtaskid !== undefined &&
      subtaskid !== "" &&
      !(typeof subtaskid === "number" && Number.isNaN(subtaskid));

    setToolTicketId(subtaskid);

    let finalValue = value;

    // ✅ handle title input safely
    if (name === "toolName") {
      const limitedText = value.slice(0, appConstants.createSubTaskNameCharMaxLimit);

      setEnteredSubTaskCharacter(
        value.length > appConstants.createSubTaskNameCharMaxLimit,
      );

      setEnteredSubTaskCharacterMin(
        value.length !== 0 && value.length < appConstants.createSubTaskNameCharMinLimit,
      );

      finalValue = limitedText;
    } else {
      setEnteredSubTaskCharacter(false);
    }

    if (name === "freeFlowLabelId") {
      finalValue = normalizeFreeFlowLabelSelection(value);
    }

    // ✅ due date clear
    if (name === "dueDate" && !value) {
      finalValue = "";
    }

    // ✅ due date object handling
    let extraFields = {};

    if (name === "dueDate" && value && typeof value === "object") {
      finalValue = value.date || "";
      extraFields.dueDateChangeReason = value.description ?? "";
    }

    const applyFieldUpdate = (task) => {
      if (name === "assignee") {
        return { ...task, assignee: finalValue ? [finalValue] : [] };
      }
      if (name === "dueDate") {
        return { ...task, dueDate: finalValue, ...extraFields };
      }
      return { ...task, [name]: finalValue };
    };

    setCreateSubTaskList((prev) => {
      let updated = false;

      // 1️⃣ update matching row
      const list = prev.map((task) => {
        if (hasSubtaskId && matchesToolTicketId(task.toolTicketId, subtaskid)) {
          updated = true;
          return applyFieldUpdate(task);
        }
        return task;
      });

      if (updated) return list;

      // 2️⃣ update draft row
      const emptyIndex = list.findIndex(
        (t) => t.toolTicketId == null || t.toolTicketId === "",
      );

      if (emptyIndex !== -1) {
        const copy = [...list];

        copy[emptyIndex] = applyFieldUpdate({
          ...copy[emptyIndex],
          toolTicketId: copy[emptyIndex].toolTicketId || generateNewId(),
        });

        return copy;
      }

      // 3️⃣ create new row
      return [
        ...list,
        applyFieldUpdate({
          toolTicketId: generateNewId(),
          toolName: "",
          priorityId: [],
          freeFlowLabelId: [],
          dueDate: "",
          dueDateChangeReason: null,
          assignee: [],
          checkList: [],
        }),
      ];
    });

    setOpenAssignee(false);
  };

  /* --------------------Create API CALL -------------------- */
  const fetchCreatTaskAPI = async (paraData) => {
    setApiLoading(true);

    try {
      const response = await createTask(paraData);
      if (response?.data?.status !== false && response) {
        showToast({
          message: response?.data?.message || "Task created successfully",
          variant: "success",
        });
        setApiLoading(false);
        callGetApi();
        setTaskValues({ taskName: "", priorityId: [] });
        setSubTaskValues({
          toolName: "",
          priorityId: [],
          freeFlowLabelId: [],
          dueDate: "",
          dueDateChangeReason: null,
        });
        setCreateSubTaskList([]);
        setEnteredSubTaskCount(false);
        cancelLinkModal();
      } else {
        showToast({
          message: response?.data?.message || "Failed to create task",
          variant: "danger",
        });
        setApiLoading(false);
      }
    } catch (error) {
      console.error("Create Task Failed:", error.response?.data || error.message);
      showToast({
        message:
          error?.response?.data?.message || error?.message || "Failed to update task",
        variant: "danger",
      });
    } finally {
      setApiLoading(false); // ✅ always stop loader
    }
  };
  const normalizeSpaces = (str = "") => str.replace(/\s+/g, " ").trim();

  /* -------------------- API -------------------- */
  const handleCreateNewTask = async (type) => {
    const parentPriorityId =
      taskValues.priorityId?.[0]?.status_id ?? toIdArray(ticketData?.priorityId)[0] ?? null;
      const payload = {
        taskId: taskValues.orderId || ticketData?.orderId || 0,
        title: normalizeSpaces(taskValues.taskName),
        labelId: isSubTaskUpdate ? null : labelId?.labelId || null,
        priorityId: parentPriorityId,
        boardId: isSubTaskUpdate ? 0 : selectedBoard[0].boardID,
        createdTitle: ticketData?.createdTitle || "Created by",
      subTask: createSubTaskList
        .filter((task) => normalizeSpaces(task.toolName) !== "")
        .map((task) => {
          const rawId = task?.toolTicketId;
          const isNew = typeof rawId === "string" && String(rawId).includes("new_");
          const parsedDue = task?.dueDate ? dayjs(task.dueDate) : null;
          return {
            title: normalizeSpaces(task.toolName),
            subTaskId: isNew ? 0 : Number(rawId) || 0,
            dueDate:
              type !== "dueDate" && parsedDue?.isValid()
                ? parsedDue.format("YYYY-MM-DD")
                : null,
            dueDateChangeReason: task?.dueDateChangeReason || null,
            priorityId:
              task.priorityId?.[0]?.status_id ?? toIdArray(task.priorityId)[0] ?? null,
            freeFlowLabelId: resolveFreeFlowLabelIds(task.freeFlowLabelId),
            assignee: isSubTaskUpdate
              ? null
              : task?.assignee?.length > 0
                ? task?.assignee?.[0]?.regId
                : null,
            checkList: toChecklistApiItems(task?.checkList || []),
          };
        }),
    };
    fetchCreatTaskAPI(payload);
  };

  /* -------------------- RESET -------------------- */
  const handleClose = () => {
    setTaskValues({ taskName: "", priorityId: [] });
    setSubTaskValues({
      toolName: "",
      priorityId: [],
      freeFlowLabelId: [],
      dueDate: "",
      toolTicketId: "",
      assignee: [],
    });
    setCreateSubTaskList([]);
    setEnteredSubTaskCount(false);
    cancelLinkModal();
    setHasChanged(false);
    setEnteredCharacter(false);
    setEnteredSubTaskCharacter(false);
    setEnteredCharacterMin(false);
    setEnteredSubTaskCharacterMin(false);
    setOpenAssignee(false);
  };
  const isSubTaskListChanged = (prevList = [], currentList = []) => {
    if (prevList.length !== currentList.length) return true;
    return prevList.some((prevTask) => {
      const currentTask = currentList.find((task) =>
        matchesToolTicketId(task.toolTicketId, prevTask.toolTicketId),
      );

      if (!currentTask) return true;

      // normalize priority / free-flow label (objects or nested ids)
      const prevPriorityId = prevTask.priorityId?.[0]?.status_id ?? null;
      const currPriorityId = currentTask.priorityId?.[0]?.status_id ?? null;
      const prevFreeFlowLabelId = freeFlowLabelIdsKey(prevTask.freeFlowLabelId);
      const currFreeFlowLabelId = freeFlowLabelIdsKey(currentTask.freeFlowLabelId);

      return (
        prevTask.toolName !== currentTask.toolName ||
        prevTask.dueDate !== currentTask.dueDate ||
        prevPriorityId !== currPriorityId ||
        prevFreeFlowLabelId !== currFreeFlowLabelId
      );
    });
  };
  /** HANDLE EDIT OR DELETE VALUE */
  const handleEditDeleteValue = (subtaskid) => {
    const updatedSubTasks = createSubTaskList.filter(
      (item) => item.toolTicketId !== subtaskid,
    );
    setCreateSubTaskList(
      updatedSubTasks.length === 0
        ? [
            {
              toolName: "",
              priorityId: [],
              freeFlowLabelId: [],
              dueDate: "",
              dueDateChangeReason: null,
              assignee: [],
              toolTicketId: generateNewId(),
              checkList: [],
            },
          ]
        : updatedSubTasks,
    );
    setEnteredSubTaskCount(false);
  };

  const handleChangeAssignee = (toolTicketId, event) => {
    setOpenAssignee(!openAssignee);
    setToolTicketId(toolTicketId);
  };

  /* -------------------- UI -------------------- */
  return (
    <Fragment>
      <PopupModal
        show={createNewTask}
        onClose={() => handleClose()}
        header={true}
        title={isSubTaskCreateable ? ticketData?.taskName : "Create New Task"}
        className={"addAttachmentModal createNewTaskModal"}
        key="createNewTask"
        customClassName={"createNewTask"}
      >
        <div className="formContainer">
          {!isSubTaskCreateable && (
            <Row>
              <div className="nameContainer col-8">
                <label className="heading">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder={"Please enter the title"}
                  className="nameInput mt-2"
                  value={taskValues.taskName || ""}
                  onChange={(e) => {
                    handleTaskValues("taskName", e.target.value);
                  }}
                />
                {enteredCharacter && (
                  <p className="error-msg">
                    Character limit exceeded{" "}
                    <b>{appConstants.createSubTaskNameCharMaxLimit}</b>.
                  </p>
                )}{" "}
                {enteredCharacterMin && (
                  <p className="error-msg">
                    Please enter min Character{" "}
                    <b>{appConstants.createSubTaskNameCharMinLimit}</b>.
                  </p>
                )}
              </div>
              <div className="nameContainer col-4 createSubTaskData">
                <label className="heading">Pick a Priority</label>
                <ToolTipPopup
                  toolTipDatas={priority}
                  labelField="name"
                  valueField="status_id"
                  customWidth={"100%"}
                  canEdit={true}
                  swithFilter={false}
                  arrow={false}
                  getSeletedVal={(e) => handleTaskValues("priorityId", [e])}
                  customIcon={
                    <PriorityCustomInput
                      placeholderText={taskValues?.priorityId}
                      iconShow={true}
                      type="Priority"
                    />
                  }
                />
              </div>
            </Row>
          )}
          <div className="subtask-container">
            {!isSubTaskCreateable && <h4>Create Sub Task</h4>}
            {createSubTaskList.length > 0 &&
              createSubTaskList.map((subTask, index) => {
                const isRowMenuOpen =
                  openLabelMenuId === subTask.toolTicketId ||
                  (openAssignee && getToolTicketId === subTask.toolTicketId);
                // Earlier rows must stack above later ones so open menus aren't covered
                const rowStackOrder = isRowMenuOpen
                  ? 1000
                  : createSubTaskList.length - index;

                return (
                  <div
                    className={`editlist`}
                    key={index}
                    style={{ zIndex: rowStackOrder }}
                  >
                    <div className={`subtask-create`} key={index}>
                      <div className={`subNameContainer`}>
                        <input
                          type="text"
                          placeholder={"Please enter the title"}
                          className="nameInput mt-2"
                          value={subTask?.toolName || ""}
                          onChange={(e) => {
                            editSubTaskData(
                              "toolName",
                              e.target.value,
                              subTask.toolTicketId,
                            );
                          }}
                        />
                        {enteredSubTaskCharacter &&
                          getToolTicketId === subTask.toolTicketId && (
                            <p className="error-msg">
                              Character limit exceeded{" "}
                              <b>{appConstants.createSubTaskNameCharMaxLimit}</b>.
                            </p>
                          )}
                        {enteredSubTaskCharacterMin &&
                          getToolTicketId === subTask.toolTicketId && (
                            <p className="error-msg">
                              Please enter min Character{" "}
                              <b>{appConstants.createSubTaskNameCharMinLimit}</b>.
                            </p>
                          )}
                      </div>
                      <div
                        className={`nameContainer displaySubTaskData ${createSubTaskList.length === 1 && index + 1 === 1 ? "single-child" : ""}`}
                      >
                        <ToolTipPopup
                          toolTipDatas={priority}
                          labelField="name"
                          valueField="status_id"
                          customWidth={"100%"}
                          canEdit={true}
                          swithFilter={false}
                          arrow={false}
                          getSeletedVal={(e) =>
                            editSubTaskData("priorityId", [e], subTask.toolTicketId)
                          }
                          customIcon={
                            <PriorityCustomInput
                              placeholderText={subTask?.priorityId}
                              type="Priority"
                            />
                          }
                        />
                      </div>
                      <div
                        className={`nameContainer displaySubTaskData ${createSubTaskList.length === 1 && index + 1 === 1 ? "single-child" : ""}`}
                      >
                        <SelectDropDown
                          multi={true}
                          options={freeFlowLabelOptions}
                          labelField="name"
                          valueField="status_id"
                          values={normalizeFreeFlowLabelSelection(subTask?.freeFlowLabelId)}
                          searchable={false}
                          customSearch={true}
                          onChange={(selected) =>
                            editSubTaskData("freeFlowLabelId", selected, subTask.toolTicketId)
                          }
                          onDropdownOpen={() => setOpenLabelMenuId(subTask.toolTicketId)}
                          onDropdownClose={() =>
                            setOpenLabelMenuId((id) =>
                              id === subTask.toolTicketId ? null : id,
                            )
                          }
                          compareValuesFunc={compareFreeFlowLabelValues}
                          colorField="colorCode"
                          placeholder="Select Labels"
                          className="filter-select-dropDown free-flow-label-select multiple-select"
                          disabled={apiLoading}
                          optionType="checkbox"
                          dropdownPosition="auto"
                          closeOnSelect={false}
                        />
                      </div>
                      <div className={`nameContainer`}>
                        <div className="picker-date mt-0 position-relative">
                          <input
                            type="text"
                            placeholder={"Select Due Date"}
                            className="nameInput mt-2"
                            value={subTask?.dueDate || ""}
                            readOnly
                            onClick={() => {
                              setEditSubtaskDueDate(subTask);
                              setShowDate(!showDate);
                            }}
                          />

                          <span
                            className="icon-ss-calendar"
                            onClick={() => {
                              setEditSubtaskDueDate(subTask);
                              setShowDate(!showDate);
                            }}
                            style={{ cursor: "pointer" }}
                          ></span>
                        </div>
                      </div>

                      <div className={`nameContainer`}>
                        {subTask?.assignee?.length > 0 && (
                          <div
                            className="avatars mt-2 form-control"
                            title={subTask?.assignee[0]?.name || "User Name"}
                            onClick={(event) => {
                              handleChangeAssignee(subTask?.toolTicketId, event);
                              setSelectedUser(subTask?.assignee);
                            }}
                          >
                            <LogoAvatarShowLetter
                              genaralData={subTask?.assignee[0]}
                              profileName={"displayName"}
                              outerClassName={"avatars__item"}
                              innerClassName={"avatars__img"}
                              showTitle={subTask?.assignee[0]?.name}
                            ></LogoAvatarShowLetter>
                          </div>
                        )}
                        {(subTask?.assignee === undefined ||
                          subTask?.assignee?.length === 0) &&
                          !isSubTaskUpdate && (
                            <div className="kebab-notassignee-btn mt-2">
                              <button
                                className="kebab-assignee-btn form-control"
                                onClick={(event) => {
                                  handleChangeAssignee(subTask?.toolTicketId, event);
                                  setSelectedUser([]);
                                }}
                                disabled={
                                  subTask?.toolName?.length <
                                    appConstants.createSubTaskNameCharMinLimit ||
                                  subTask?.toolName?.length >=
                                    appConstants.createSubTaskNameCharMaxLimit
                                }
                              >
                                <img src={UserAddPrimary} alt="UserAddPrimary" />
                              </button>
                            </div>
                          )}
                        {openAssignee && getToolTicketId === subTask?.toolTicketId && (
                          <div ref={popupRef}>
                            <ToolAssignMember
                              apiLoading={apiLoading}
                              flowData={subTask}
                              toolSelected={subTask}
                              assigneeList={AssigneeList}
                              selectedUser={selectedUser}
                              updateTool={editSubTaskData}
                              setApiLoading={setApiLoading}
                              setOpenAssignee={setOpenAssignee}
                            />
                          </div>
                        )}
                      </div>
                      {(index !== createSubTaskList.length - 1 ||
                        (subTask?.toolName?.length > 0 &&
                          index === createSubTaskList.length - 1)) &&
                        !isSubTaskUpdate && (
                          <div className="nameContainer removeSubTask mt-2" tabIndex={0}>
                            <button
                              className="btn btn-0 p-0 m-0 w-100 border-0 text-danger d-flex justify-content-between"
                              disabled={
                                subTask?.toolName?.length <
                                  appConstants.createSubTaskNameCharMinLimit ||
                                subTask?.toolName?.length >=
                                  appConstants.createSubTaskNameCharMaxLimit
                              }
                              onClick={(e) => handleEditDeleteValue(subTask.toolTicketId)}
                            >
                              <img src={trashIcon} alt="Remove Task" />
                            </button>
                          </div>
                        )}
                      {index === createSubTaskList.length - 1 && !isSubTaskUpdate && (
                        <div className="nameContainer addSubTask" tabIndex={0}>
                          <button
                            className="btn btn-0 createSubTaskSubmitBtn w-100 "
                            onClick={() => addSubTaskData()}
                            disabled={
                              subTask?.toolName?.length <
                                appConstants.createSubTaskNameCharMinLimit ||
                              subTask?.toolName?.length >=
                                appConstants.createSubTaskNameCharMaxLimit
                            }
                          >
                            + Add Sub Task
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {enteredSubTaskCount && (
              <p className="error-msg">
                Sub Task create limit exceeded
                <b>({appConstants.createSubTaskCountLimit})</b>.
              </p>
            )}
          </div>
        </div>
        <div className="d-flex flex-row align-items-center justify-content-center gap-3 footerContainer w-100">
          <button
            className="btn btn-0 createTaskSubmitBtn w-100 d-flex align-items-center justify-content-center"
            onClick={() => handleCreateNewTask("update")}
            disabled={
              (isSubTaskUpdate
                ? !isSubTaskListChanged(
                    ticketData?.toolList[0]?.listOfTools?.map((tool) => ({
                      toolName: tool.toolName,
                      priorityId: getFirstPriorityOption(priority, tool.priorityId),
                      freeFlowLabelId: mapFreeFlowLabelsFromIds(
                        tool.freeFlowLabelId,
                        freeFlowLabelList,
                      ),
                      dueDate: tool.dueDate || "",
                      toolTicketId: tool.toolTicketId || 0,
                    })),
                    createSubTaskList,
                  )
                : taskValues.taskName === "") ||
              (!isSubTaskUpdate && createSubTaskList[0].toolName?.length < 5)
            }
          >
            {apiLoading
              ? isSubTaskUpdate
                ? "Updating Sub Task..."
                : isSubTaskCreateable
                  ? "Creating Sub Task..."
                  : "Creating Task..."
              : isSubTaskUpdate
                ? "Update Sub Task"
                : isSubTaskCreateable
                  ? "Create Sub Task"
                  : "Create Task"}
          </button>
        </div>
      </PopupModal>
      <PopupModal
        show={showDate}
        onClose={() => setShowDate(false)}
        header={true}
        title={"Select Due Date"}
        customClassName={"dueDateCalender"}
        children={
          <div className="d-flex flex-row justify-content-center p-0 m-0">
            <DueDateCalendar
              defaultDate={isNewTask ? null : editSubtaskDueDate?.dueDate}
              onSelect={handleDueDateChange}
              onReset={() => handleDueDateChange(null)}
              oncancel={() => {
                setShowDate(false);
                setApiLoading(false);
              }}
              apiLoading={apiLoading}
            />
          </div>
        }
      />
    </Fragment>
  );
};

export default CreateTaskModal;

export const PriorityCustomInput = ({ placeholderText, iconShow, type }) => {
  const selected = Array.isArray(placeholderText) ? placeholderText[0] : placeholderText;
  const hasSelection =
    (Array.isArray(placeholderText) && placeholderText.length > 0) ||
    Boolean(placeholderText?.name || placeholderText?.status_id);

  const swatchColor =
    selected?.colorCode ||
    selected?.colour_code ||
    selected?.back_ground_colour ||
    selected?.color ||
    null;

  const labelText =
    typeof selected?.name === "string"
      ? selected.name
      : getPlainLabelText(selected?.name);

  return (
    <Fragment>
      {hasSelection && labelText ? (
        <span className="priority-custom-input-text priority-custom-input-text--value">
          {swatchColor ? (
            <span
              className="priority-custom-input-text__swatch"
              style={{ backgroundColor: swatchColor }}
            >
              &#160;
            </span>
          ) : null}
          <span className="priority-custom-input-text__label" title={labelText}>
            {labelText}
          </span>
        </span>
      ) : (
        <span className="priority-custom-input-text priority-custom-input-text--placeholder">
          <span className="priority-custom-input-text__swatch">&#160;</span>
          <span className="priority-custom-input-text__label"> Select {type}</span>
        </span>
      )}
      {iconShow ? <span className={`icon-chevron-thin-down`}></span> : ""}
    </Fragment>
  );
};

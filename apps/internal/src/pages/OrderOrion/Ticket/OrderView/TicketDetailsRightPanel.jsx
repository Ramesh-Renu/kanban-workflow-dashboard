import React, { Fragment, useEffect, useRef, useState } from "react";
import { Row } from "react-bootstrap";
import AssigneeCard from "../../../../components/common/AssigneeCard";
import {
  TimerIcon,
  unChecked,
  UserRounded,
  checkedIcon,
  radioChecked,
  radioUnChecked,
  pencilSimpleLine,
} from "../../../../assets/images";
import variables from "@orion/shared/src/styles/variables-style.json";
import { useGlobalMaster } from "@orion/shared";
import {
  createProcessOrder,
  createTask,
  getTicketDetails,
  updateOrderDescription,
  updateTicketDetails,
} from "../../../../services";
import { useToast } from "@orion/shared";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import appConstants from "../../../../constant/common";
import {
  getLimitedHtmlWithNewlineContent,
  isCharacterLimitExceeded,
  renderOrderType,
} from "../../../../utils/common";
import { sanitizeHTMLContent } from "../../../../utils/htmlSanitizer";
import PopupModal from "@orion/shared/src/components/PopupModal";
import RichTextEditor from "../../../../components/common/RichTextEditor/Editor";
import { t } from "i18next";
import { useGlobalContext } from "store/context/GlobalProvider";
import CheckList from "../../../../components/common/Dynamic/CheckList";
import useClickAway from "../../../../hooks/useClickAway";

dayjs.extend(utc);

const TicketDetailsRightPanel = ({
  companyData,
  showSidebar,
  showHide,
  boardList,
  userRole,
  onCompanyDataUpdate,
  enableProcess,
}) => {
  const {
    labelList,
    suggestedMembersList,
    getSuggestedMembersList,
    orderType,
    orderStatus,
    taskPriority,
    getTaskPriority,
  } = useGlobalMaster();
  const { showToast } = useToast();
  const { dispatch } = useGlobalContext();

  //label Handle states
  const [showLabel, setShowLabel] = useState(false);
  const [labelValues, setLabelValues] = useState([]);
  const [localLabelValues, setLocalLabelValues] = useState([]);
  const [getRightPanelData, setGetRightPanelData] = useState({});
  const [labelValueRender, setLabelValueRender] = useState([]);
  const [descriptionModal, setDescriptionModal] = useState(false);
  const [descriptionData, setDescriptionData] = useState("");
  const [updateDescription, setUpdateDescription] = useState(false);
  const [enteredCharacter, setEnteredCharacter] = useState(0);
  const [balanceCharacter, setBalanceCharacter] = useState(null);
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};
  const activeBoardCode = activeBoard?.[0]?.code;
  const boardCodes = ["OB", "SA"];
  const [apiLoading, setApiLoading] = useState(false);
  const [descApiLoading, setDescApiLoading] = useState(false);
  const [showEditTaskName, setShowEditTaskName] = useState(false);
  const [editTaskName, setEditTaskName] = useState("");
  const [taskNameError, setTaskNameError] = useState("");
  const [showEditCreatedTitle, setShowEditCreatedTitle] = useState(false);
  const [editCreatedTitle, setEditCreatedTitle] = useState("");
  const [createdTitleSaving, setCreatedTitleSaving] = useState(false);
  const createdTitleEditRef = useRef(null);
  const isNonIodTask =
    companyData?.workFlowType != null && companyData.workFlowType !== 60;
  const [checkList, setCheckList] =
    useState([
      {
        fieldName: "Check list1",
        fieldValue: "",
        id: 1,
        disabled: false,
        checked: false,
      },
      {
        fieldName: "Check list 2",
        fieldValue: "",
        id: 2,
        disabled: false,
        checked: false,
      },
      {
        fieldName: "Check List 3",
        fieldValue: "",
        id: 3,
        disabled: false,
        checked: false,
      },
    ]) || [];

  useEffect(() => {
    const boardIDsFromCodes = boardList?.data
      ?.filter((board) => boardCodes?.includes(board.code))
      ?.map((board) => board.boardID);

    const combined = Array.from(
      new Set([...(boardIDsFromCodes || []), ...(companyData?.ticketFlowBoards || [])]),
    );
    if (
      !suggestedMembersList?.loading &&
      boardList?.data //&&
      // result?.length > 0
    ) {
      getSuggestedMembersList(combined?.toString() || 0);
    }
    if (taskPriority?.data?.length === 0 || !taskPriority) {
      getTaskPriority();
    }
  }, [boardList]);

  useEffect(() => {
    const { ticketLabels = [] } = companyData?.orderManagementPanel || [];
    setGetRightPanelData(companyData);
    const updatedLabels =
      companyData?.workFlowType === 60
        ? labelList?.data.length > 0 &&
          labelList?.data?.map((label) => ({
            ...label,
            isSelected: ticketLabels?.includes(label.status_id),
          }))
        : taskPriority?.data?.length > 0 &&
          taskPriority?.data?.map((label) => ({
            ...label,
            isSelected: companyData?.companyInfo?.priorityId?.includes(label.status_id),
          }));
    setLabelValues(updatedLabels);
    setLocalLabelValues(updatedLabels);
    setDescriptionData(companyData?.description || "");
  }, [companyData, labelList, taskPriority]);

  const handleAssignee = (value, key) => {
    const ticketAsignee = {
      ticketAsignee: value?.regId ? [value?.regId] : [],
      type: [key],
    };
    updateTicket({ ticketAsignee, userInfo: value });
  };

  /* --------------------Update Priority API CALL -------------------- */
  const fetchUpdatePriorityaskAPI = async (paraData) => {
    setApiLoading(true);
    try {
      const response = await createTask({
        ...paraData,
        createdTitle:
          paraData.createdTitle ||
          getRightPanelData?.createdTitle ||
          companyData?.createdTitle ||
          "Created by",
      });
      if (response?.data?.status !== false && response) {
        showToast({
          message: response?.data?.message || "Task updated successfully",
          variant: "success",
        });
        const ticketResponse = await getTicketDetails({
          ticketId: getRightPanelData.orderId || companyData?.orderId,
          boardID: activeBoard?.[0]?.boardID,
        });
        if (ticketResponse?.status && ticketResponse.data) {
          dispatch({ type: "SET_TICKET_DETAILS", payload: ticketResponse.data });
          const refreshed = ticketResponse.data?.orderTicketDetails;
          if (refreshed && typeof refreshed === "object" && !Array.isArray(refreshed)) {
            onCompanyDataUpdate?.(refreshed);
          } else if (paraData?.title) {
            onCompanyDataUpdate?.({
              ...companyData,
              companyInfo: {
                ...companyData?.companyInfo,
                taskName: paraData.title,
              },
            });
          }
        } else if (paraData?.title) {
          onCompanyDataUpdate?.({
            ...companyData,
            companyInfo: {
              ...companyData?.companyInfo,
              taskName: paraData.title,
            },
          });
        }
        return true;
      }
      showToast({
        message: response?.data?.message || "Failed to update task",
        variant: "danger",
      });
      return false;
    } catch (error) {
      console.error("Create Task Failed:", error.response?.data || error.message);
      showToast({
        message: error?.response?.data?.message || "Failed to update task",
        variant: "danger",
      });
      return false;
    } finally {
      setApiLoading(false);
    }
  };

  const normalizeSpaces = (str = "") => str.replace(/\s+/g, " ").trim();

  const openEditTaskName = () => {
    setEditTaskName(companyData?.companyInfo?.taskName || "");
    setTaskNameError("");
    setShowEditTaskName(true);
  };

  const closeEditTaskName = () => {
    setShowEditTaskName(false);
    setEditTaskName("");
    setTaskNameError("");
  };

  const handleTaskNameChange = (value) => {
    setEditTaskName(value);
    const trimmed = normalizeSpaces(value);
    if (!trimmed) {
      setTaskNameError("Please enter the title");
    } else if (trimmed.length < appConstants.createSubTaskNameCharMinLimit) {
      setTaskNameError(
        `Please enter min Character ${appConstants.createSubTaskNameCharMinLimit}.`,
      );
    } else if (value.length > appConstants.createSubTaskNameCharMaxLimit) {
      setTaskNameError(
        `Character limit exceeded ${appConstants.createSubTaskNameCharMaxLimit}.`,
      );
    } else {
      setTaskNameError("");
    }
  };

  const saveTaskName = async () => {
    const title = normalizeSpaces(editTaskName);
    if (
      !title ||
      title.length < appConstants.createSubTaskNameCharMinLimit ||
      editTaskName.length > appConstants.createSubTaskNameCharMaxLimit
    ) {
      handleTaskNameChange(editTaskName);
      return;
    }
    if (title === normalizeSpaces(companyData?.companyInfo?.taskName || "")) {
      closeEditTaskName();
      return;
    }

    const priorityId =
      companyData?.companyInfo?.priorityId?.[0] ??
      labelValues?.find((item) => item.isSelected)?.status_id ??
      null;

    // taskId 0 = create, >0 = update
    const success = await fetchUpdatePriorityaskAPI({
      taskId: companyData?.orderId || 0,
      title,
      priorityId,
      boardId: 0,
      labelId: null,
      subTask: [],
    });
    if (success) closeEditTaskName();
  };

  const openEditCreatedTitle = (currentTitle) => {
    setEditCreatedTitle(currentTitle || "Created by");
    setShowEditCreatedTitle(true);
  };

  const closeEditCreatedTitle = () => {
    setShowEditCreatedTitle(false);
    setEditCreatedTitle("");
  };

  useClickAway([createdTitleEditRef], () => {
    if (showEditCreatedTitle && !createdTitleSaving) {
      closeEditCreatedTitle();
    }
  });

  const saveCreatedTitle = async () => {
    const title = normalizeSpaces(editCreatedTitle);
    const currentTitle = normalizeSpaces(
      getRightPanelData?.createdTitle || "Created by",
    );
    if (!title || title === currentTitle || createdTitleSaving) {
      if (!title) return;
      closeEditCreatedTitle();
      return;
    }

    setCreatedTitleSaving(true);
    try {
      const priorityId =
        companyData?.companyInfo?.priorityId?.[0] ??
        labelValues?.find((item) => item.isSelected)?.status_id ??
        null;
      const response = await createTask({
        taskId: companyData?.orderId || 0,
        title: companyData?.companyInfo?.taskName || "",
        priorityId,
        boardId: 0,
        labelId: null,
        createdTitle: title,
        subTask: [],
      });
      if (response?.data?.status !== false && response) {
        showToast({
          message: response?.data?.message || "Label updated successfully",
          variant: "success",
        });
        const setData = {
          ...getRightPanelData,
          createdTitle: title,
        };
        setGetRightPanelData(setData);
        onCompanyDataUpdate?.(setData);
        const ticketResponse = await getTicketDetails({
          ticketId: getRightPanelData.orderId || companyData?.orderId,
          boardID: activeBoard?.[0]?.boardID,
        });
        if (ticketResponse?.status && ticketResponse.data) {
          dispatch({ type: "SET_TICKET_DETAILS", payload: ticketResponse.data });
          const refreshed = ticketResponse.data?.orderTicketDetails;
          if (refreshed && typeof refreshed === "object" && !Array.isArray(refreshed)) {
            onCompanyDataUpdate?.(refreshed);
          }
        }
        closeEditCreatedTitle();
      } else {
        showToast({
          message: response?.data?.message || "Failed to update label",
          variant: "danger",
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to update label",
        variant: "danger",
      });
    } finally {
      setCreatedTitleSaving(false);
    }
  };

  // update through api
  const updateTicket = async (value) => {
    let object = {
      ...getRightPanelData,
      type: "Order_Management_Panel",
      orderManagementPanel: { ticketAsignee: [], type: [], ticketLabels: [] },
    };
    object = {
      ...object,
      orderManagementPanel: {
        ...object.orderManagementPanel,
        ...(value.type?.includes("label")
          ? { ticketLabels: value.ticketLabels, type: ["label"] }
          : { ...value.ticketAsignee }),
      },
    };

    try {
      const updatedAssignees = (() => {
        const currentAssignees =
          getRightPanelData?.orderManagementPanel?.ticketAssignee || [];
        let matchFound = false;

        const mapped = currentAssignees.map((assignee) => {
          const hasMatch = assignee?.type?.some((t) =>
            value?.ticketAsignee?.type?.includes(t),
          );
          if (hasMatch) {
            matchFound = true;
            return {
              ...assignee,
              assigneeTo: [value?.userInfo] || [],
            };
          }
          return assignee;
        });

        // If no match, add a new one
        if (!matchFound) {
          mapped.push({
            type: value?.ticketAsignee?.type || [],
            assigneeTo: [value?.userInfo] || [],
          });
        }
        return mapped;
      })();

      const response = await updateTicketDetails(object);

      if (response?.status) {
        showToast({
          message: response?.data.message || "Ticket updated successfully",
          variant: "success",
        });
        const setData = {
          ...getRightPanelData,
          orderManagementPanel: {
            ...getRightPanelData.orderManagementPanel,
            ...(value.type?.includes("label")
              ? { ticketLabels: value.ticketLabels }
              : { ticketAssignee: updatedAssignees }),
          },
        };
        setGetRightPanelData(setData);
        onCompanyDataUpdate(setData);
        getTicketDetails({
          ticketId: getRightPanelData.orderId,
          boardID: activeBoard?.[0]?.boardID,
        });
      } else {
        showToast({
          message: response?.data.message || "Failed to update ticket",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("error", error);
    }
  };

  useEffect(() => {
    if ((labelList?.data?.length > 0, suggestedMembersList?.data?.length > 0)) {
      const labelValueRender = [
        ...(companyData?.workFlowType === 61
          ? [
              {
                header: getRightPanelData?.createdTitle || "Created by",
                key: "TASK",
                type: "AssigneeCard",
                value:
                  getRightPanelData?.orderManagementPanel?.ticketAssignee?.find((item) =>
                    item?.type?.includes("TASK"),
                  )?.assigneeTo || [],
                teamMember: [],
                iconPlacement: 6,
                assigneeAddChange: activeBoardCode === "TASK",
                icon: <img src={UserRounded} alt="logo" />,
              },
            ]
          : []),
        ...(companyData?.workFlowType === 60
          ? [
              {
                header: "Sales",
                key: "SA",
                type: "AssigneeCard",
                value:
                  getRightPanelData?.orderManagementPanel?.ticketAssignee?.find((item) =>
                    item?.type?.includes("SA"),
                  )?.assigneeTo || [],
                teamMember:
                  suggestedMembersList?.data?.filter(
                    (item) => item?.boardCode === "SA",
                  ) || [],
                iconPlacement: 6,
                assigneeAddChange: activeBoardCode === "SA",
                icon: <img src={UserRounded} alt="logo" />,
              },
            ]
          : []),

        ...(companyData?.workFlowType === 60
          ? [
              {
                header: "OB Order Manager",
                key: "OB",
                type: "AssigneeCard",
                value:
                  getRightPanelData?.orderManagementPanel?.ticketAssignee?.find((item) =>
                    item?.type?.includes("OB"),
                  )?.assigneeTo || [],
                teamMember:
                  suggestedMembersList?.data?.filter(
                    (item) => item?.boardCode === "OB",
                  ) || [],
                iconPlacement: 6,
                assigneeAddChange:
                  (companyData?.isProcessOrder && activeBoardCode === "OB") ||
                  (!companyData?.isProcessOrder && activeBoardCode === "SA"),
                icon: <img src={UserRounded} alt="logo" />,
              },
            ]
          : []),

        ...(companyData?.workFlowType === 60
          ? [
              {
                header: "Order ID",
                value: getRightPanelData?.ticketOrderId || "",
                iconPlacement: 17.2,
                key: "ticketOrderId",
              },
            ]
          : []),

        {
          header: companyData?.workFlowType === 60 ? "Order Date" : "Created Date",
          iconPlacement: 2.3,
          key: companyData?.workFlowType === 60 ? "orderDate" : "createdDate",
          value:
            (getRightPanelData?.createdDate &&
              dayjs.utc(getRightPanelData?.createdDate).local().format("MMM DD, YYYY")) ||
            "",
        },

        {
          header: "Labels",
          value:
            companyData?.workFlowType === 60
              ? labelList?.data?.map((label) => ({
                  ...label,
                  isSelected:
                    getRightPanelData?.orderManagementPanel?.ticketLabels?.includes(
                      label.status_id,
                    ) || false,
                })) || []
              : taskPriority?.data?.map((label) => ({
                  ...label,
                  isSelected:
                    companyData?.companyInfo?.priorityId?.includes(label.status_id) ||
                    false,
                })) || [],
          key: "ticketLabels",
          type: "dropdown",
          iconPlacement: 4.8,
          changeLabel:
            companyData?.workFlowType === 60
              ? appConstants?.canChangeLabel?.includes(activeBoardCode)
              : true,
        },

        ...(companyData?.companyInfo?.toolCenterLink
          ? [
              {
                header: "Tool Center",
                value: companyData?.companyInfo?.toolCenterLink || "",
                key: "toolCenter",
              },
            ]
          : []),
      ];

      setLabelValueRender(labelValueRender);
    }
  }, [getRightPanelData, labelList, suggestedMembersList]);

  const LabelContainer = () => {
    const toggleCheckbox = (index) => {
      setLocalLabelValues((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isSelected: !item.isSelected } : item,
        ),
      );
    };
    const taskToggleCheckbox = (index) => {
      setLocalLabelValues((prev) =>
        prev.map((item, i) => ({
          ...item,
          isSelected: i === index,
        })),
      );
    };

    const handleSave = () => {
      setShowLabel(false);
      const ticketLabels = {
        ticketLabels: localLabelValues
          .filter((item) => item.isSelected)
          .map((item) => item.status_id),
        type: ["label"],
      };
      // Optionally send to parent
      setLabelValues(localLabelValues); // Save the selected state
      if (companyData.workFlowType === 60) {
        updateTicket(ticketLabels);
      } else {
        const priorityValues = {
          taskId: companyData?.orderId,
          title: companyData?.companyInfo?.taskName,
          priorityId: localLabelValues
            .filter((item) => item.isSelected)
            .map((item) => item.status_id)[0],
          boardId: 0,
          labelId: null,
          subTask: [],
        };
        fetchUpdatePriorityaskAPI(priorityValues);
      }
    };

    const areLabelValuesEqual = (a, b) =>
      a?.length === b?.length &&
      a?.every(
        (item, i) =>
          item.status_id === b[i]?.status_id && item.isSelected === b[i]?.isSelected,
      );
    return (
      <div className="px-2 mt-2 rounded">
        {localLabelValues.map((row, i) => {
          if (row.name === "IPO") return null;
          return (
            <div
              className="d-flex flex-row align-items-center gap-2 py-2 w-auto"
              key={`label-${row.status_id}-${i}`}
              onClick={() =>
                companyData?.workFlowType === 60
                  ? toggleCheckbox(i)
                  : taskToggleCheckbox(i)
              }
              style={{
                cursor: "pointer",
                /*opacity:0.5 this can be use for future disable the checkbox*/
              }}
            >
              <div>
                {row.isSelected ? (
                  <img
                    src={companyData?.workFlowType === 60 ? checkedIcon : radioChecked}
                    alt="checked"
                    height={"15px"}
                  />
                ) : (
                  <img
                    src={companyData?.workFlowType === 60 ? unChecked : radioUnChecked}
                    alt="unchecked"
                    height={"15px"}
                  />
                )}
              </div>
              <div className="colorBox" style={{ backgroundColor: row?.colour_code }} />
              <div className="fs-14">{row?.name}</div>
            </div>
          );
        })}
        <div className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
          <button
            className="btn w-auto cancel-btn px-3"
            onClick={(e) => setShowLabel(!e)}
          >
            {" "}
            {t("common.cancel")}
          </button>
          <button
            className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
            onClick={(e) => handleSave(e)}
            onKeyDown={(e) => e.key === "Enter" && handleSave}
            tabIndex={0}
            disabled={areLabelValuesEqual(localLabelValues, labelValues)}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    );
  };

  //reset Label Selected without saving
  useEffect(() => {
    setLocalLabelValues(labelValues);
  }, [showLabel]);

  const ticketDescription = (e) => {
    if (!updateDescription) return;
    const result = isCharacterLimitExceeded(
      e,
      appConstants?.charCountLimit?.brandingNotes,
    );
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants?.charCountLimit?.brandingNotes,
    );
    setDescriptionData(limitedText);
  };

  useEffect(() => {
    setDescriptionData(companyData?.description || "");
    setUpdateDescription(false);
  }, [companyData?.description]);

  const UpdateDescription = () => {
    setDescApiLoading(true);
    try {
      const sanitizedDescription = descriptionData
        .replace(/<p><br><\/p>|<p><\/p>/g, "")
        .trim();

      // If the description is empty after sanitization, you can still proceed with an empty value
      const finalDescription = sanitizedDescription === "" ? "" : descriptionData;
      const paramData = {
        orderId: companyData.orderId,
        description: finalDescription,
      };
      const response = updateOrderDescription(paramData);
      response.then((res) => {
        if (res?.status) {
          showToast({
            message: res.data,
            variant: "success",
          });
          const response = getTicketDetails({
            ticketId: companyData.orderId,
            boardID: activeBoard?.[0]?.boardID,
          });
          response.then((res) => {
            if (res?.status) {
              dispatch({ type: "SET_TICKET_DETAILS", payload: res.data });
            }
            setDescApiLoading(false);
          });
          setUpdateDescription(false);
          setDescriptionModal(false);
        }
      });
    } catch (error) {
      // Handle errors
      showToast({
        message: error,
        variant: "danger",
      });
      setDescApiLoading(false);
    }
  };

  /** PROCESS ORDER */
  const handleProceedOrder = async () => {
    try {
      setApiLoading(true);
      const response = await createProcessOrder(companyData?.orderId);
      if (response?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
        });

        getTicketDetails({
          ticketId: getRightPanelData.orderId,
          boardID: activeBoard?.[0]?.boardID,
        });
        onCompanyDataUpdate({ ...companyData, isProcessOrder: true });
      }
    } catch (error) {
      // Handle errors
      showToast({
        message: error,
        variant: "danger",
      });
    } finally {
      setApiLoading(false);
    }
  };
  const hasDescription =
    !!companyData?.description && String(companyData.description).trim().length > 0;

  /** ORDER STATUS */
  const OrderStatusProgress = ({ statusId }) => {
    const status_id = statusId === 21 ? 22 : statusId;
    const currentIndex = orderStatus?.data.findIndex(
      (status) => status.status_id === status_id,
    );
    const label = orderStatus?.data[currentIndex]?.name || "UNKNOWN";
    return (
      <div className="d-flex justify-content-between align-items-center">
        <span>Order Status</span>
        <span
          className="d-flex gap-2 align-items-center"
          style={{ color: orderStatus?.data[currentIndex]?.colour_code }}
        >
          <img src={TimerIcon} alt="TimerIcon" />
          {label}
        </span>
      </div>
    );
  };

  const handleCheckList = (id) => {
    setCheckList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  return (
    <Fragment>
      <div className="position-relative customHeight">
        <Row className="w-100 mx-auto  ticketDetails h-100">
          <div className="p-0 w-100">
            <div className="ticketHeader d-flex flex-column align-items-start">
              <div className="d-flex flex-row align-items-stretch gap-2">
                {orderType?.data &&
                  renderOrderType(companyData, orderType?.data, true, true, null, true)}
                {companyData?.companyInfo?.isIPO && (
                  <div
                    className={`px-2 rounded d-flex align-items-center py-2 ${"className"}`}
                    style={{
                      backgroundColor: "#FFFF",
                      color: "#016859",
                      border: "1px solid #016859",
                      fontWeight: "500",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    {"IPO"}
                  </div>
                )}
              </div>
              <div
                className="companyNameText mt-2 d-flex align-items-start justify-content-between gap-2"
                title={
                  companyData?.workFlowType === 60
                    ? companyData?.companyInfo?.companyName
                    : companyData?.companyInfo?.taskName
                }
              >
                <span className="text-truncate">
                  {companyData?.workFlowType === 60
                    ? companyData?.companyInfo?.companyName
                    : companyData?.companyInfo?.taskName}
                </span>
                {isNonIodTask && (
                  <button
                    type="button"
                    className="btn btn-0 p-0 m-0 flex-shrink-0"
                    style={{ color: variables.common["--color-primary"] }}
                    onClick={openEditTaskName}
                    aria-label="Edit task name"
                    title="Edit task name"
                  >
                    <img src={pencilSimpleLine} alt="Edit task name" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 w-100 px-3">
              {sanitizeHTMLContent(companyData?.description).props
                ?.dangerouslySetInnerHTML?.__html?.length > 0 ? (
                <>
                  <p className="p-0 m-0 assigneeHeader">Description:</p>
                  <div
                    className="viewDescriptionBtn py-1 px-2 rounded"
                    onClick={() => {
                      setDescriptionModal(true);
                    }}
                    title="View Description"
                  >
                    <div className="sanitizedDescriptionText">
                      {sanitizeHTMLContent(companyData?.description)}
                    </div>
                    <div className="descriptionIcon">
                      <div className="info-icon">i</div>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  className="description_btn btn"
                  onClick={() => {
                    setDescriptionModal(true);
                    setUpdateDescription(true);
                  }}
                >
                  + Add Description
                </button>
              )}
            </div>

            <div
              className={`assigneeCard px-3 mt-2 w-100 ${companyData.workFlowType !== 60 ? "h-100" : ""}`}
              style={{maxHeight: `${companyData?.isProcessOrder == null ||
                (!companyData?.isProcessOrder && companyData?.workFlowType === 60 ) ? "calc(100vh - 350px)" : "calc(100vh - 270px)"}`}}
            >
              <div
                className={`d-flex flex-column gap-2 h-100 ${companyData.workFlowType === 60 ? "justify-content-between" : "justify-content-start"}`}
              >
                {companyData?.isProcessOrder === true && orderStatus?.data && (
                  <div className="orderStatusProgress">
                    <OrderStatusProgress statusId={companyData.status} />
                  </div>
                )}
                {labelValueRender &&
                  suggestedMembersList?.data &&
                  getRightPanelData &&
                  labelValues &&
                  labelValueRender?.map((row, i) => {
                    return (
                      <div className="w-100" key={`${row?.key}-${i}`}>
                        {row?.header !== "Labels" &&
                          row?.header !== "Assignee" &&
                          row.key !== "createdDate" && (
                            <div className="d-flex justify-content-between align-items-center">
                              {row?.key === "TASK" ? (
                                showEditCreatedTitle ? (
                                  <div
                                    ref={createdTitleEditRef}
                                    className="d-flex align-items-center gap-2 w-100 created-title-edit"
                                  >
                                    <input
                                      type="text"
                                      className="form-control nameInput"
                                      value={editCreatedTitle}
                                      maxLength={50}
                                      disabled={createdTitleSaving}
                                      autoFocus
                                      onChange={(e) =>
                                        setEditCreatedTitle(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          saveCreatedTitle();
                                        }
                                        if (e.key === "Escape") {
                                          closeEditCreatedTitle();
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-0 cancel-btn px-2"
                                      onClick={closeEditCreatedTitle}
                                      disabled={createdTitleSaving}
                                    >
                                      {t("common.cancel")}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn create_btn px-3 d-flex align-items-center"
                                      onClick={saveCreatedTitle}
                                      disabled={
                                        createdTitleSaving ||
                                        !normalizeSpaces(editCreatedTitle) ||
                                        normalizeSpaces(editCreatedTitle) ===
                                          normalizeSpaces(
                                            getRightPanelData?.createdTitle ||
                                              "Created by",
                                          )
                                      }
                                    >
                                      {createdTitleSaving && (
                                        <div
                                          className="spinner-border spinner-border-sm me-2"
                                          role="status"
                                          aria-hidden="true"
                                        />
                                      )}
                                      {createdTitleSaving
                                        ? "Saving..."
                                        : t("common.save")}
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="p-0 m-0 assigneeHeader">
                                      {row?.header}
                                    </p>
                                    <button
                                      type="button"
                                      className="btn btn-0 p-0 m-0 flex-shrink-0"
                                      style={{
                                        color: variables.common["--color-primary"],
                                      }}
                                      onClick={() =>
                                        openEditCreatedTitle(row?.header)
                                      }
                                      aria-label="Edit label"
                                      title="Edit label"
                                    >
                                      <img
                                        src={pencilSimpleLine}
                                        alt="Edit label"
                                      />
                                    </button>
                                  </>
                                )
                              ) : (
                                <>
                                  <p className="p-0 m-0 assigneeHeader">
                                    {row?.header}
                                  </p>
                                  {row?.type !== "AssigneeCard" && (
                                    <div className="rounded py-2 fs-14">
                                      {typeof row?.value === "object" ? (
                                        row?.value?.displayName || "---"
                                      ) : row?.key === "toolCenter" &&
                                        row?.value ? (
                                        <a
                                          href={row?.value}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color:
                                              variables.common["--color-primary"],
                                          }}
                                        >
                                          Link
                                        </a>
                                      ) : (
                                        row?.value || "---"
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        {row?.key === "createdDate" && (
                          <Fragment>
                            <div className="d-flex mt-3 justify-content-between align-items-center">
                              {/* Left side - Label */}
                              <p className="p-0 m-0 mb-1 assigneeHeader">{row?.header}</p>
                            </div>
                            <div
                              className="rounded py-2 fs-14 mb-2"
                              style={{
                                backgroundColor: "#F5F5F780",
                                padding: "16px 15px",
                                borderRadius: "7px",
                                fontSize: "var(--font-size-xs)",
                                height: "39px",
                                lineHeight: "22px",
                              }}
                            >
                              {row?.value || "---"}
                            </div>
                          </Fragment>
                        )}
                        {/* Assignee section */}
                        {row?.type === "AssigneeCard" && (
                          <AssigneeCard
                            title={"Team Members"}
                            assignedUser={row.value}
                            userList={row.teamMember}
                            key={`assigneeCard-${row?.key}`}
                            onChange={(eventData) => handleAssignee(eventData, row?.key)}
                            multiSelect={false}
                            placeHolder={row?.header}
                            userRole={userRole}
                            assigneeAddChange={row.assigneeAddChange}
                            rowInfo={row}
                          />
                        )}
                        {/* Labels section */}
                        {row?.header === "Labels" && (
                          <>
                            <div className="rounded d-flex flex-row align-items-center justify-content-between flex-wrap fs-14">
                              <div className="position-relative">
                                <p className="m-0 assigneeHeader">
                                  {companyData.workFlowType === 60
                                    ? "Labels"
                                    : "Priority"}
                                </p>
                              </div>
                              {row?.changeLabel && !showLabel && (
                                <button
                                  className="btn btn-0 p-0 m-0 fs-14 py-2"
                                  style={{
                                    color: variables.common["--color-primary"],
                                  }}
                                  onClick={() => setShowLabel(!showLabel)}
                                  onKeyDown={(e) => setShowLabel(!showLabel)}
                                  tabIndex={0}
                                >
                                  Edit
                                </button>
                              )}
                            </div>

                            <>
                              <div className="d-flex flex-row align-items-center gap-2 w-100 flex-wrap">
                                {labelValues?.map(
                                  (row, i) =>
                                    row?.isSelected ? ( // Check if isSelected exists and is truthy
                                      <div
                                        key={`label-${row.status_id}-${i}`}
                                        className="rounded-pill px-3 py-1 text-light mt-2 mb-2 fs-14"
                                        style={{
                                          backgroundColor: row?.colour_code, // Dynamic background color
                                        }}
                                      >
                                        {row.name}
                                      </div>
                                    ) : null, // If isSelected is falsy, render nothing
                                )}
                              </div>
                              <div className="mt-2">
                                <PopupModal
                                  size="sm"
                                  show={showLabel}
                                  onClose={() => setShowLabel(false)}
                                  header={true}
                                  className="commonForm"
                                  title={
                                    companyData.workFlowType === 60
                                      ? "Labels"
                                      : "Priority"
                                  }
                                >
                                  <LabelContainer />
                                </PopupModal>
                              </div>
                            </>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          {companyData?.isProcessOrder == null ||
            (!companyData?.isProcessOrder && companyData?.workFlowType === 60 && (
              <div className="py-2 d-flex flex-column justify-content-end">
                <button
                  className={`processOrder_btn btn py-2 mt-2 ${!enableProcess && "disabled"}`}
                  disabled={apiLoading || !enableProcess}
                  onClick={handleProceedOrder}
                >
                  {apiLoading ? "Processing..." : "Process Order"}
                </button>
              </div>
            ))}
          {labelValueRender.length === 0 &&
            suggestedMembersList?.data?.length === 0 &&
            getRightPanelData.length === 0 && <Spinner style={{ height: "200px" }} />}
        </Row>
      </div>
      <PopupModal
        size="lg"
        show={descriptionModal}
        onClose={() => {
          setDescriptionData(companyData?.description || "");
          setDescriptionModal(false);
        }}
        header={true}
        title={updateDescription ? "Add Description" : "Description"}
        customClassName={"rightSidePanel"}
      >
        <div className="description_container">
          {/* <p>Description</p> */}
          <div className="mt-2">
            <RichTextEditor
              toolbarId={"ticket-description"}
              headTitle="Description"
              placeholder={t("order_view.enter_description_here")}
              value={descriptionData}
              handleValueChange={ticketDescription}
              handleMentionedUsers={(e) => {
                return null;
              }}
              taggableMembers={[]}
              className={`description_input `}
              // onFocus={handleFocus}
              isVisible={false}
              enableMention={false}
            />
            {updateDescription &&
              (enteredCharacter !== null || enteredCharacter?.length > 0) && (
                <div className="error-msg fs-12 mt-2 text-danger">
                  <b>
                    {enteredCharacter > appConstants?.charCountLimit?.brandingNotes
                      ? appConstants?.charCountLimit?.brandingNotes
                      : enteredCharacter}
                    /{appConstants?.charCountLimit?.brandingNotes}
                  </b>{" "}
                  {t("ticket.characters_used")}, <b>{balanceCharacter}</b>{" "}
                  {t("ticket.remaining")}
                </div>
              )}
          </div>
          {updateDescription ? (
            <div className="d-flex flex-row justify-content-end mt-3">
              <button
                className="btn btn-0"
                onClick={() => {
                  if (!hasDescription) {
                    // First time add → close modal completely
                    setDescriptionData("");
                    setDescriptionModal(false);
                  } else {
                    // Editing existing → revert changes and stay in modal
                    setDescriptionData(companyData?.description);
                    setUpdateDescription(false);
                  }
                }}
              >
                Cancel
              </button>
              <button
                className="btn updateButton px-4"
                disabled={descriptionData == companyData?.description || descApiLoading}
                onClick={() => UpdateDescription()}
              >
                {descApiLoading
                  ? hasDescription
                    ? "Updating..."
                    : "Saving..."
                  : hasDescription
                    ? "Update"
                    : "Save"}
              </button>
            </div>
          ) : (
            <div className="d-flex flex-row justify-content-end mt-3">
              <button
                className="btn updateButton px-4"
                onClick={() => {
                  setUpdateDescription(true);
                  setDescriptionData(companyData?.description);
                }}
              >
                {"Edit"}
              </button>
            </div>
          )}
        </div>
      </PopupModal>
      {isNonIodTask && (
        <PopupModal
          size="sm"
          show={showEditTaskName}
          onClose={closeEditTaskName}
          header={true}
          className="commonForm"
          customClassName="edit-task-name-modal"
          title="Edit Task Name"
        >
          <div className="px-2 mt-2">
            <label className="heading mb-2">
              Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control nameInput"
              placeholder="Please enter the title"
              value={editTaskName}
              onChange={(e) => handleTaskNameChange(e.target.value)}
              disabled={apiLoading}
              autoFocus
            />
            {taskNameError && <p className="error-msg mt-2 mb-0">{taskNameError}</p>}
            <div className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
              <button
                type="button"
                className="btn w-auto cancel-btn px-3"
                onClick={closeEditTaskName}
                disabled={apiLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
                onClick={saveTaskName}
                disabled={
                  apiLoading ||
                  !!taskNameError ||
                  !normalizeSpaces(editTaskName) ||
                  normalizeSpaces(editTaskName) ===
                    normalizeSpaces(companyData?.companyInfo?.taskName || "")
                }
              >
                {apiLoading ? "Saving..." : t("common.save")}
              </button>
            </div>
          </div>
        </PopupModal>
      )}
    </Fragment>
  );
};

export default TicketDetailsRightPanel;

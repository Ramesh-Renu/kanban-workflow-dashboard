import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@orion/shared";
import {
  getDueDateColor,
  getLimitedHtmlWithNewlineContent,
  isCharacterLimitExceeded,
  isOnlyWhitespaceHtml,
  isValidFileSelection,
} from "../../../../../../utils/common";
import { sanitizeHTMLContent } from "../../../../../../utils/htmlSanitizer";
import appConstants from "../../../../../../constant/common";
import ToolsInfoListTable from "./ToolsInfoListTable";
import {
  addToolTicketInfo,
  getToolInfoDetails,
  addUpdateComment,
  deleteComment,
  getCommentDetails,
  addUpdateToolNotes,
  createTask,
} from "../../../../../../services";
import ActivityHistory from "../../Activity/ActivityHistory";
import { useParams } from "react-router-dom";
import { useGlobalContext } from "store/context/GlobalProvider";
import { useGlobalMaster } from "@orion/shared";
import useAuth from "../../../../../../hooks/useAuth";
import DOMPurify from "dompurify";
import BoardStageTable from "./BoardStageTable";
import LinkModal from "./LinkModal";
import NotesModal from "./NotesModal";
import AttachmentModal from "./AttachmentModal";
import SubToolLabels from "components/kanban/SubToolLabels";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import { matchFreeFlowLabels, toLabelIdSet } from "utils/subToolLabels";
import { toChecklistApiItems } from "utils/checkList";
import { initialActiveCommentsTabState } from "../../../../../../store/reducers/TicketReducers/activeCommentsTabReducer";
import { pencilSimpleLine } from "assets/images";
import CheckList from "components/common/Dynamic/CheckList";
import ToolsMoreDetailsPanel, { renderToolsStageBadge } from "../ToolsMoreDetailsPanel";

const ToolsInfoDetails = ({
  toolData,
  companyData,
  refreshToolTicketComment,
  refreshTicket,
  preserveScroll,
}) => {
  const fileInputRef = useRef(null);
  const { showToast } = useToast();
  // attachment States
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [attachmentErrors, setAttachmentErrors] = useState({
    attachmentName: false,
    attachment: false,
  });
  const [file, setFile] = useState();
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentValues, setAttachmentValues] = useState({
    type: "attachment",
    attachmentName: "",
    description: "",
    attachment_id: null,
    file_type: "",
    file_name: "",
    file_upload_path: "",
    blob_name: "",
  });
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};
  const navId = useParams();
  const currentBoardId = Number(navId?.boardId || activeBoard?.[0]?.boardID);
  const isProcessWorkflow = companyData?.workFlowType === 60;
  // Order workflow (60): show all tools; other workflows: only current board
  const showAllBoardTools = isProcessWorkflow;

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

  const [toolInfoTableData, setToolInfoTableData] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [toolActivity, setToolActivity] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [toolActivityPageOffset, setToolActivityPageOffset] = useState(
    appConstants.pageOffSet,
  );
  const [refreshEditor, setRefreshEditor] = useState(false);
  const [isLastActivity, setIsLastActivity] = useState([]);
  const [hasMoreActivityPages, setHasMoreActivityPages] = useState(false);
  const isFetchingActivityRef = useRef(false);
  const [noDataSpinnerShow, setNoDataSpinnerShow] = useState(false);
  const [isFetchingAPIData, setIsFetchingAPIData] = useState(false);
  const { activeCommentsTab, dispatch } = useGlobalContext();
  const masterData = useGlobalMaster();
  const {
    suggestedMembersList,
    taskPriority,
    getTaskPriority,
    freeFlowLabelList,
    getFreeFlowLabelList,
  } = masterData;
  const [{ data: auth }] = useAuth();
  const [notesState, setNotesState] = useState({
    showNotesModal: false,
    toolNotesData: "",
    canUpdateNotes: false,
    enteredCharacter: 0,
    balanceCharacter: null,
    notesApiLoading: false,
  });

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkErrors, setLinkErrors] = useState({
    linkHeading: false,
    url: false,
  });
  const [linkValues, setLinkValues] = useState({
    linkHeading: "",
    url: "",
    description: "",
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showtext, setShowtext] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [createTimeFormData, setCreateTimeFormData] = useState(null);

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (windowWidth < 1426) {
      setShowtext(false);
    } else {
      setShowtext(true);
    }
  }, [windowWidth]);

  useEffect(() => {
    if (taskPriority?.data?.length === 0 || !taskPriority) {
      getTaskPriority?.();
    }
    if (freeFlowLabelList?.data?.length === 0 || !freeFlowLabelList) {
      getFreeFlowLabelList?.();
    }
  }, []);

  // GET TOOL TICKET INFO DETAILS

  useEffect(() => {
    if (toolData?.ticketToolId) {
      getToolInfoData();

      /** UPDATE TOOL EXISTING NOTES */
      setNotesState((prev) => ({
        ...prev,
        toolNotesData: toolData?.toolNotes || "",
        canUpdateNotes: false,
      }));
    }
  }, [toolData]);

  // get Tools info link and attachment data

  const getToolInfoData = async () => {
    const params = toolData?.ticketToolId;
    try {
      setTableLoader(true);
      const response = await getToolInfoDetails(params); //603  this param get result  temp
      if (response?.status) {
        setToolInfoTableData(response?.data);
        setTableLoader(false);
      } else {
        setToolInfoTableData([]);
        setTableLoader(false);
      }
    } catch (error) {
      setTableLoader(false);
    }
  };

  // attachment Function
  const handleAttachments = (name, value) => {
    setAttachmentValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate the value
    setAttachmentErrors((prev) => {
      if (!value || value.trim() === "") {
        return {
          ...prev,
          [name]: `${name === "attachmentName" ? "Attachment name" : name} is required`,
        };
      } else {
        return { ...prev, [name]: false };
      }
    });
  };

  const handleFileChange = (e) => {
    setIsUploading(true);
    const selectedFiles = Array.from(e.target.files);
    setFile(e.target.files);
    const allSelectedFiles = [...selectedFiles];
    // setUploadedFiles(allselectedFiles);
    const result = isValidFileSelection(
      allSelectedFiles,
      appConstants?.restrictedFileTypes,
      50,
    );
    if (!result.isValid) {
      showToast({
        message: result.reason,
        variant: "danger",
        showTime: 5000,
      });
    } else {
      const values = result.data[0];
      setFile(values);
      const newErrors = {};
      newErrors.attachment = false;
      setAttachmentErrors((prev) => ({
        ...prev,
        ...newErrors,
      }));
      //   handleAttachments("attachment", result.data[0]);

      //   const paraData = {
      //     files: result.data,
      //     body: {
      //       module: moduleName,
      //       referenceId: referenceId.orderId,
      //     },
      //   };
      //   fetchUploadFile(paraData);
    }
    setIsUploading(false);
  };

  const addAttachment = async () => {
    setApiLoading(true);
    const newErrors = {};
    if (!attachmentValues.attachmentName?.trim()) {
      newErrors.attachmentName = "Attachment name is required";
    }
    if (!file) {
      newErrors.attachment = "Attachment is required";
    }
    setAttachmentErrors((prev) => ({
      ...prev,
      ...newErrors,
    }));
    if (Object.keys(newErrors).length > 0) {
      setApiLoading(false);
      return;
    }
    try {
      const param = {
        toolTicketInfoID: attachmentValues?.attachmentId || 0,
        toolTicketID: toolData?.ticketToolId,
        name: attachmentValues?.attachmentName,
        description: attachmentValues?.description,
        Files: file,
        toolLink: null,
        blobName: file instanceof File ? attachmentValues?.blobName : null,
        type: "attachment",
      };
      const response = await addToolTicketInfo(param);
      if (response?.status) {
        setApiLoading(false);
        showToast({
          message: response.message,
          variant: "success",
          showTime: 5000,
        });
        setShowAttachmentModal(false);
        cancelAttachment();
        await preserveScroll(async () => {
          await getToolInfoData();
        });
      } else {
        setApiLoading(false);
        showToast({
          message: response.message,
          variant: "danger",
          showTime: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      setApiLoading(false);
    }
  };

  const cancelAttachment = () => {
    setShowAttachmentModal(false);
    setAttachmentValues({
      type: "attachment",
      attachmentName: "",
      description: "",
      attachment_id: null,
      file_type: "",
      file_name: "",
      file_upload_path: "",
      blob_name: "",
    });
    setFile();
    setAttachmentErrors({ attachmentName: false, attachment: false });
  };

  /// add link Functions
  const handleLinkValues = (name, value) => {
    setLinkValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate the value
    setLinkErrors((prev) => {
      if (name === "url") {
        if (!value || value.trim() === "") {
          return { ...prev, [name]: "URL is required" }; // empty value
        } else if (!new RegExp(appConstants.VALIDATION_PATTERNS.url).test(value)) {
          return { ...prev, [name]: "Enter a valid URL" }; // invalid URL
        } else {
          return { ...prev, [name]: false }; // valid URL
        }
      } else {
        // For other fields (like linkHeading)
        if (!value || value.trim() === "") {
          return {
            ...prev,
            [name]: `${name === "linkHeading" ? "Heading name" : name} is required`,
          };
        } else {
          return { ...prev, [name]: false };
        }
      }
    });
  };

  const addLinkData = async () => {
    const newErrors = {};
    if (!linkValues.linkHeading?.trim()) {
      newErrors.linkHeading = "Heading name is required";
    }
    if (!linkValues.url?.trim()) {
      newErrors.url = "URL is required";
    } else if (!new RegExp(appConstants.VALIDATION_PATTERNS.url).test(linkValues.url)) {
      newErrors.url = "Enter a valid URL";
    }
    setLinkErrors((prev) => ({
      ...prev,
      ...newErrors,
    }));
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    try {
      setApiLoading(true);
      const param = {
        toolTicketInfoID: linkValues?.toolLinkId || 0,
        toolTicketID: toolData?.ticketToolId,
        name: linkValues?.linkHeading,
        toolLink: linkValues?.url,
        description: linkValues?.description,
        type: "link",
      };
      const response = await addToolTicketInfo(param);
      if (response?.status) {
        setApiLoading(false);
        showToast({
          message: response.message,
          variant: "success",
          showTime: 5000,
        });
        setShowLinkModal(false);
        cancelLinkModal();
        await preserveScroll(async () => {
          await getToolInfoData();
        });
      } else {
        setApiLoading(false);
        showToast({
          message: response.message,
          variant: "danger",
          showTime: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      setApiLoading(false);
    }
  };

  const cancelLinkModal = () => {
    setLinkErrors({ linkHeading: false, url: false });
    setLinkValues({ linkHeading: "", url: "", description: "" });
    setShowLinkModal(false);
  };

  const UpdateTool = (name, value) => {
    setIsUpdated(true);
    if (name === "link") {
      setLinkValues(value);
      setShowLinkModal(true);
    } else {
      setAttachmentValues(value);
      setFile(value);
      setShowAttachmentModal(true);
    }
  };

  /** TOOL COMMENTS - START */
  const activityTypeRef = useRef(activeCommentsTab?.activityType);

  useEffect(() => {
    activityTypeRef.current = activeCommentsTab?.activityType;
  }, [activeCommentsTab?.activityType]);

  useEffect(() => {
    if (!toolData?.ticketToolId || !refreshToolTicketComment) return;

    const commentsTab = initialActiveCommentsTabState.activityType;
    activityTypeRef.current = commentsTab;
    dispatch({ type: "CLEAR_ACTIVE_COMMENTS_TAB" });
    setToolActivityPageOffset(appConstants.pageOffSet);
    setToolActivity([]);
    setHasMoreActivityPages(false);
  }, [toolData?.ticketToolId, refreshToolTicketComment]);

  const triggerActivityAPI = async (currentActivity, offset) => {
    if (isFetchingActivityRef.current) return; // Prevent multiple calls
    try {
      setIsFetchingAPIData(true);
      isFetchingActivityRef.current = true; // Block further fetches
      const requestData = {
        orderId: companyData?.orderId,
        tool_ticket_id: toolData?.ticketToolId,
        pageoffset: offset,
        pagesize: appConstants?.pageSize,
        type: currentActivity.type,
      };
      const response = await getCommentDetails(requestData);
      setNoDataSpinnerShow(true);
      const pageItems = response?.data ?? [];
      setIsLastActivity(pageItems);
      setHasMoreActivityPages(pageItems.length >= appConstants.pageSize);
      setToolActivity((prevActivity) => {
        return offset > 0 ? [...prevActivity, ...pageItems] : pageItems;
      });
    } catch (error) {
    } finally {
      setNoDataSpinnerShow(false);
      setIsFetchingAPIData(false);
      isFetchingActivityRef.current = false;
    }
  };

  /** REFRESH COMMENT */
  const refreshComment = async () => {
    setToolActivityPageOffset(appConstants.pageOffSet);
    const activityType =
      activityTypeRef.current ?? initialActiveCommentsTabState.activityType;
    await triggerActivityAPI(activityType, appConstants.pageOffSet);
  };

  /** ADD/UPDATE COMMENT API */
  const handleAddUpdateComment = (res) => {
    const checkWhiteSpace = isOnlyWhitespaceHtml(res?.content);
    if (checkWhiteSpace) return;
    const { attachment, type, ...rest } = res;

    const requestData = {
      files: attachment,
      body: {
        ...rest,
        tool_ticket_id: toolData?.ticketToolId,
      },
    };
    // TRIGGER API CALL
    try {
      const response = addUpdateComment(requestData);
      response.then((res) => {
        if (res?.status) {
          showToast({ message: res?.message, variant: "success" });
          refreshComment();
          setRefreshEditor(false);
        } else {
          showToast({ message: res?.message, variant: "danger" });
          setRefreshEditor(true);
        }
      });
    } catch (error) {
      // Handle errors
      showToast({ message: error, variant: "danger" });
    }
  };

  /** ARCHIVE COMMENT API */
  const handleArchiveComment = (res) => {
    const requestData = {
      order_id: companyData?.orderId,
      tool_ticket_id: toolData?.ticketToolId,
      comment_id: res?.comment_id,
    };
    try {
      const response = deleteComment(requestData);
      response.then((res) => {
        if (res?.status) {
          showToast({ message: res?.data?.message, variant: "success" });
          refreshComment();
        } else {
          showToast({ message: res?.data?.message, variant: "danger" });
          setRefreshEditor(true);
        }
      });
    } catch (error) {
      // Handle errors
      showToast({ message: error, variant: "danger" });
    }
  };

  /** USED TO HANDLE ACTIVITY FILTER TYPE */
  const handleChangeActivityType = (e) => {
    setToolActivityPageOffset(appConstants?.pageOffSet);
    setToolActivity([]);
    setHasMoreActivityPages(false);
    dispatch({
      type: "SHOW_ACTIVE_COMMENTS_TAB",
      payload: {
        activityType: e,
        showFilter: true,
      },
    });
  };

  /** USED TO LOAD MORE ACTIVITY CONTENT */
  const handleShowMoreActivity = (e) => {
    e.stopPropagation();
    setToolActivityPageOffset((prevOffset) => prevOffset + 1);
  };

  /** USED TO CALL API ON TAB CHANGE & ON SCROLL */
  useEffect(() => {
    if (companyData?.orderId && toolData?.ticketToolId) {
      const activityType =
        activeCommentsTab?.activityType ?? initialActiveCommentsTabState.activityType;
      if (activityType?.type === 3) return;
      triggerActivityAPI(activityType, toolActivityPageOffset);
    }
  }, [activeCommentsTab?.activityType, toolActivityPageOffset]);

  useEffect(() => {
    return () => {
      dispatch({ type: "CLEAR_ACTIVE_COMMENTS_TAB" });
    };
  }, [dispatch]);

  /** TOOL COMMENTS - END */

  const handleToolNotes = (e) => {
    if (!notesState?.canUpdateNotes) return;
    const result = isCharacterLimitExceeded(
      e,
      appConstants?.charCountLimit?.brandingNotes,
    );
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants?.charCountLimit?.brandingNotes,
    );
    setNotesState((prev) => ({
      ...prev,
      enteredCharacter: result?.characterCount,
      balanceCharacter: result?.remainingCharacters,
      toolNotesData: limitedText,
    }));
  };
  const hasToolNotes =
    !!toolData?.toolNotes &&
    sanitizeHTMLContent(toolData?.toolNotes).props?.dangerouslySetInnerHTML?.__html
      ?.length > 0;

  const handleNotesUpdate = async () => {
    setNotesState((prev) => ({
      ...prev,
      notesApiLoading: true,
    }));
    try {
      const param = {
        toolTicketId: toolData?.ticketToolId,
        toolId: toolData?.toolId,
        notes: notesState.toolNotesData,
      };
      const response = await addUpdateToolNotes(param);
      if (response?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
          showTime: 5000,
        });
        setNotesState((prev) => ({
          ...prev,
          notesApiLoading: false,
          canUpdateNotes: false,
          showNotesModal: false,
        }));
        if (
          sanitizeHTMLContent(notesState.toolNotesData).props?.dangerouslySetInnerHTML
            ?.__html?.length === 0
        ) {
          setNotesState((prev) => ({
            ...prev,
            showNotesModal: false,
          }));
        }
        refreshTicket(); // refreshTicket to get DB updated tool notes
      } else {
        showToast({
          message: response?.data?.message,
          variant: "danger",
          showTime: 5000,
        });
        setNotesState((prev) => ({
          ...prev,
          notesApiLoading: false,
          canUpdateNotes: false,
        }));
      }
    } catch (err) {
      console.error(err);
      setNotesState((prev) => ({
        ...prev,
        notesApiLoading: false,
        showNotesModal: false,
      }));
    }
  };

  const toFirstId = (value) => {
    if (value == null || value === "") return null;
    const first = Array.isArray(value) ? value[0] : value;
    if (first != null && typeof first === "object") {
      return first.status_id ?? first.id ?? null;
    }
    return first ?? null;
  };

  const toFreeFlowLabelIds = (value = []) => {
    const list = Array.isArray(value) ? value : value != null ? [value] : [];
    return list
      .map((item) =>
        item != null && typeof item === "object" ? (item.status_id ?? item.id) : item,
      )
      .filter((id) => id != null && id !== "");
  };

  const handleCheckListSave = async (items) => {
    if (!toolData?.ticketToolId) return;
    setChecklistSaving(true);
    try {
      const parsedDue = toolData?.dueDate ? dayjs(toolData.dueDate) : null;
      const payload = {
        taskId: companyData?.orderId || 0,
        title: companyData?.companyInfo?.taskName || "",
        priorityId: toFirstId(companyData?.companyInfo?.priorityId),
        boardId: 0,
        labelId: null,
        createdTitle: companyData?.createdTitle || "Created by",
        subTask: [
          {
            subTaskId: Number(toolData?.ticketToolId) || 0,
            title: isProcessWorkflow
              ? toolData?.toolName || ""
              : toolData?.subTaskName || "",
            priorityId: toFirstId(toolData?.priorityId),
            freeFlowLabelId: toFreeFlowLabelIds(toolData?.freeFlowLabelId),
            assignee: null,
            dueDate: parsedDue?.isValid() ? parsedDue.format("YYYY-MM-DD") : null,
            dueDateChangeReason: toolData?.dueDateChangeReason || null,
            checkList: toChecklistApiItems(items),
          },
        ],
      };
      const response = await createTask(payload);
      if (response?.data?.status !== false && response) {
        showToast({
          message: response?.data?.message || "Checklist saved successfully",
          variant: "success",
          showTime: 5000,
        });
        refreshTicket();
      } else {
        showToast({
          message: response?.data?.message || "Failed to save checklist",
          variant: "danger",
          showTime: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      showToast({
        message: err?.message || "Failed to save checklist",
        variant: "danger",
        showTime: 5000,
      });
    } finally {
      setChecklistSaving(false);
    }
  };

  const updatedLabels =
    (!isProcessWorkflow &&
      taskPriority?.data?.map((label) => ({
        ...label,
        isSelected: toLabelIdSet(toolData?.priorityId).has(String(label.status_id)),
      }))) ||
    [];

  const selectedFreeFlowLabels = isProcessWorkflow
    ? []
    : matchFreeFlowLabels(freeFlowLabelList?.data, toolData?.freeFlowLabelId);
  const currentStage = getCurrentBoardStage(toolData);
  const otherStages = getOtherBoardStages(toolData);

  const renderStageBadge = renderToolsStageBadge;

  const renderDetailAssignee = (stage) => {
    if (stage?.assignee?.length > 0) {
      return stage.assignee.map((assignee, idx) => (
        <div key={assignee?.regId || idx} className="tools-info-detail-assignee">
          <span className="tools-info-detail-assignee__title">Assignee:</span>
          <div className="avatars">
            <LogoAvatarShowLetter
              genaralData={assignee}
              profileName="displayName"
              outerClassName="avatars__item"
              innerClassName="avatars__img"
            />
          </div>
          <span
            className="tools-info-detail-assignee__name"
            title={assignee?.displayName || assignee?.givenName || ""}
          >
            {assignee?.displayName || assignee?.givenName || "---"}
          </span>
        </div>
      ));
    }
    return (
      <div className="tools-info-detail-assignee tools-info-detail-assignee--empty">
        <span className="tools-info-detail-assignee__title">Assignee:</span>

        <span className="tools-info-detail-assignee__na">N/A</span>
      </div>
    );
  };

  const getCreateTimeFormDataApi = async () => {
    console.log("checking time tracking");
    // const response = await getCreateTimeFormData();
    // console.log(response, "response");
    // if (response?.status) {
    //   setCreateTimeFormData(response?.data);
    // }
  };
  
  return (
    <>
      <div className="tools_Details-container">
        <div className="headerRow p-3">
          <div className="d-flex flex-column gap-2 w-100">
            <div className="d-flex headerRow-col align-items-start gap-3 w-100 justify-content-between">
              <div className="tools-info-detail-title-block d-flex flex-column gap-3">
                <div className="tools-info-detail-title-row d-flex align-items-start gap-2 flex-wrap">
                  <h4 className="toolNameText">
                    {isProcessWorkflow ? toolData?.toolName : toolData?.subTaskName}
                  </h4>
                  {updatedLabels
                    .filter((row) => row?.isSelected)
                    .map((row, i) => (
                      <div
                        key={`label-${row.status_id}-${i}`}
                        className="rounded-pill px-2 py-1 text-light fs-12"
                        style={{
                          backgroundColor: row?.colour_code,
                        }}
                      >
                        {row.name}
                      </div>
                    ))}
                  {selectedFreeFlowLabels?.length > 0 && (
                    <div className="tools-info-detail-sub-tool-labels">
                      <SubToolLabels
                        card={toolData}
                        labelList={freeFlowLabelList?.data}
                        className="tools-info-sub-tool-labels"
                      />
                    </div>
                  )}
                </div>
                {toolData?.dueDate && (
                  <div
                    className="dateContainer gap-2"
                    style={{
                      color: getDueDateColor(toolData?.dueDate),
                    }}
                  >
                    <span className="timer-icon">&#9201;</span>
                    {dayjs(toolData?.dueDate).format("DD MMM, YYYY")}
                  </div>
                )}
              </div>
              <div className="tools-info-detail-side">
                <div className="py-1 tools_info_board_stage d-flex">
                  <span className="tools-info-detail-stage__title">Stage:</span>&#160;{" "}
                  {renderStageBadge(currentStage)}
                </div>
                {renderDetailAssignee(currentStage)}
              </div>
            </div>
          </div>
        </div>
        {/* <div className="shadow-sm rounded">
          <BoardStageTable data={toolData} companyData={companyData} />
        </div> */}

        <div className="hasToolNotes">
          <div className="">
            <div className="viewToolNotes" title="View Notes">
              <label className="viewToolNotes-head">Notes:</label>

              <div
                className="viewToolNotes-content"
                onClick={() => {
                  setNotesState((prev) => ({
                    ...prev,
                    toolNotesData: toolData?.toolNotes || "",
                    showNotesModal: true,
                    canUpdateNotes: true,
                  }));
                }}
              >
                {hasToolNotes && (
                  <div className="sanitizedNoteText">
                    <div
                      className="renderText"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(toolData?.toolNotes),
                      }}
                    ></div>
                  </div>
                )}
                <div className="notesIcon">
                  {/* <div className="info-icon">i</div> */}
                  <img src={pencilSimpleLine} alt="pencilSimpleLine" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="tools-details-info-more-btn"
          aria-expanded={showMoreDetails}
          onClick={() => setShowMoreDetails((prev) => !prev)}
        >
          {showMoreDetails ? "Less" : "More"} details
        </button>
        {showMoreDetails && (
          <ToolsMoreDetailsPanel
            createdDate={toolData?.createdDate}
            isProcessWorkflow={isProcessWorkflow}
            row={toolData}
            selectedLabels={selectedFreeFlowLabels}
            freeFlowLabelList={freeFlowLabelList}
            otherStages={otherStages}
          />
        )}
        {!isProcessWorkflow && (
          <CheckList
            checkList={toolData?.checkList || []}
            title="Checklist"
            onSave={handleCheckListSave}
          />
        )}
        <AttachmentModal
          show={showAttachmentModal}
          isUpdated={isUpdated}
          attachmentValues={attachmentValues}
          attachmentErrors={attachmentErrors}
          file={file}
          apiLoading={apiLoading}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          handleAttachments={handleAttachments}
          handleFileChange={handleFileChange}
          addAttachment={addAttachment}
          cancelAttachment={cancelAttachment}
          setFile={setFile}
        />

        <LinkModal
          show={showLinkModal}
          isUpdated={isUpdated}
          linkValues={linkValues}
          linkErrors={linkErrors}
          apiLoading={apiLoading}
          handleLinkValues={handleLinkValues}
          addLinkData={addLinkData}
          cancelLinkModal={cancelLinkModal}
        />

        <NotesModal
          notesState={notesState}
          hasToolNotes={hasToolNotes}
          toolData={toolData}
          handleToolNotes={handleToolNotes}
          handleNotesUpdate={handleNotesUpdate}
          setNotesState={setNotesState}
        />
      </div>

      <ActivityHistory
        data={toolActivity}
        activeBoard={activeBoard}
        activeWorkSpace={activeWorkSpace}
        taggableMembers={[
          ...new Map(
            suggestedMembersList?.data
              .filter((member) =>
                toolData?.activeStages?.some((stage) => stage.boardId === member.boardId),
              )
              .filter((member) => member.regId !== auth?.details?.regId)
              .map((member) => [member.regId, member]),
          ).values(),
        ]}
        ticketParticipants={toolData?.activeStages
          .map((item) => item.assignee)
          .flat()
          .filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.regId === value.regId),
          )}
        ticketData={companyData}
        activityType={activeCommentsTab?.activityType}
        handleAddUpdateComment={(e) => handleAddUpdateComment(e)}
        handleArchiveComment={(e) => handleArchiveComment(e)}
        handleChangeActivityType={(e) => handleChangeActivityType(e)}
        handleShowMoreActivity={handleShowMoreActivity}
        isLastActivity={isLastActivity}
        hasMoreActivityPages={hasMoreActivityPages}
        setShowSpinner={noDataSpinnerShow}
        isFetchingAPIData={isFetchingAPIData}
        key={`TOOL-${toolData?.ticketToolId}-${activeCommentsTab?.activityType?.type ?? 0}`}
        type="toolOrder"
        refresRichTextEditor={refreshEditor}
        stickyClassName={"customSticky"}
        workFlowType={companyData?.workFlowType === 60 ? "Order" : "Task"}
        infoTabLabel={isProcessWorkflow ? "Tool Info" : "Task Info"}
        infoTabContent={
          <div className="linkAttachmentContainer">
            <div className="d-flex flex-row align-items-center justify-content-start gap-3 buttonsRow mb-3">
              <button
                className="btn btn-0 px-2"
                onClick={() => {
                  setIsUpdated(false);
                  setShowAttachmentModal(true);
                }}
                title="Add Attachment"
              >
                <div className="icon-attachment-icon mx-1"></div>
                {"Add Attachment"}
              </button>
              <button
                className="btn btn-0 px-2"
                onClick={() => {
                  setIsUpdated(false);
                  setShowLinkModal(true);
                }}
                title="Add Link"
              >
                <div className="icon-attachment-icon mx-1"></div>
                {"Add Link"}
              </button>
              {/* <button
                className="btn btn-0 px-2"
                onClick={() => {
                  // getCreateTimeFormDataApi();
                  setShowTimeTrackingModal(true);
                }}
                title="Time Tracking"
              >
                <div className="icon-attachment-icon mx-1"></div>
                {"Time Tracking"}
              </button> */}
            </div>
            <ToolsInfoListTable
              tableData={toolInfoTableData}
              companyData={companyData}
              refreshList={getToolInfoData}
              updateTool={UpdateTool}
              tableLoader={tableLoader}
            />
          </div>
        }
      ></ActivityHistory>
    </>
  );
};

export default ToolsInfoDetails;

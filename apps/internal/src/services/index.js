import plgBaseAPI from "@orion/shared/src/services/plgBaseAPI";
import aiSummarizationAPI from "@orion/shared/src/services/orionAiInsightsAPI";
import orionTimeTrackingAPI from "@orion/shared/src/services/orionTimeTracking";
import { WITHOUTGATEWAY } from "@orion/shared/src/constant/service";
import { GATEWAY } from "@orion/shared/src/constant/plg-gateWayService";

/**
 *
 * @param {Record<string, any>} params
 * @returns {Promise<{
 *  data: {Record<string, any>}
 * }>}
 **/

const API = WITHOUTGATEWAY;
// !["production"].includes(process.env.REACT_APP_MODE)
//   ? WITHOUTGATEWAY
// : GATEWAY;

export const getLogin = (...props) => plgBaseAPI.POST(API.GET_LOGIN, ...props);
export const logout = (...props) => plgBaseAPI.PUT(API.LOGOUT, ...props);
export const getUserInfo = (params) => plgBaseAPI.GET(API.GET_USER_INFO, params);
export const getUserDetailsById = (params) =>
  plgBaseAPI.GET(API.GET_USER_DETAILS_BY_ID + "/" + params);
export const getPhotoSync = (params) => plgBaseAPI.PUT(API.GET_PHOTO_SYNC, params);

/** NOTIFICATION */
export const getPageNotification = (params) =>
  plgBaseAPI.GET(API.GET_PAGE_NOTIFICATION, params);
export const updateNotification = (params) =>
  plgBaseAPI.POST(API.UPDATE_NOTIFICATION, params);
export const readDeleteAllNotification = (params) =>
  plgBaseAPI.POST(API.READ_DELETE_ALL_NOTIFICATION, params);

/** MASTER */
export const customerSearchwithType = (params) =>
  plgBaseAPI.GET(
    API.CUSTOMER_SEARCH_WITH_TYPE +
      "?type=" +
      params.type +
      "&customersearch=" +
      params.search,
  );
export const getCountry = (params) => plgBaseAPI.GET(API.GET_ALL_COUNTRY_DETAIL, params);
export const getIndustry = (params) => plgBaseAPI.GET(API.GET_INDUSTRY, params);
export const getCustomerRegion = (params) =>
  plgBaseAPI.GET(API.GET_CUSTOMER_REGION, params);
export const getFontFamily = () => plgBaseAPI.GET(API.GET_FONT_FAMILY_MASTER);
export const addFontFamily = (params) => plgBaseAPI.POST(API.ADD_FONT_FAMILY, params);
export const getCustomerLanguage = (params) =>
  plgBaseAPI.GET(API.GET_CUSTOMER_LANGUAGE, params);
export const getPrimaryMarket = () => plgBaseAPI.GET(API.GET_PRIMARY_MARKET);
export const getDesignation = () => plgBaseAPI.GET(API.GET_DESIGNATION);
export const getAllTeam = () => plgBaseAPI.GET(API.GET_ALL_TEAM);
export const getAdUsers = () => plgBaseAPI.GET(API.GET_AD_USERS);
export const getAllWorkSpace = () => plgBaseAPI.GET(API.GET_ALL_WORKSPACE);
export const getAllBoards = () => plgBaseAPI.GET(API.GET_ALL_BOARDS);
export const getWorkSpaceUserList = (params) =>
  plgBaseAPI.POST(API.GET_USER_LIST, params);
export const updateUserType = (params) => plgBaseAPI.POST(API.UPDATE_USER_TYPE, params); // DATE USERS FOR ALL WORK  , ADMIN , INACTIVE
export const getUserRole = (params) => plgBaseAPI.GET(API.GET_USER_ROLE, params); // DATE USERS FOR ALL WORK  , ADMIN , INACTIVE

/**** Tools Master Data ***/
export const getProductTools = (params) => plgBaseAPI.GET(API.GET_PRODUCT_TOOLS, params);
export const getCurrency = (params) => plgBaseAPI.GET(API.GET_CURRENCY, params);

/** Order Orion */
export const globalMaster = (params) => plgBaseAPI.GET(API.GLOBAL_MASTER + params.type);
export const createPLGTicket = (params) => plgBaseAPI.POST(API.CREATE_TICKET, params);
export const getPlgSubscriptionsList = () => plgBaseAPI.GET(API.SUBSCRIPTIONS_TYPES);
export const getPackageDetails = (params) => plgBaseAPI.GET(API.GET_PACKAGE_DETAILS);
export const getOrderedTicketList = (params) =>
  plgBaseAPI.POST(API.GET_ORDERED_TICKET_LIST, params);
export const getTicketStatusCount = (params) =>
  plgBaseAPI.GET(API.TICKET_STATUS_COUNT, params);
export const deleteOrderedTicket = (params) =>
  plgBaseAPI.POST(API.DELETE_ORDERED_TICKET, params);
export const getTicketDetails = async (params) => 
  plgBaseAPI.GET(
    API.GET_TICKET_DETAILS + "/" + params.ticketId + "/" + params.boardID
  );
export const updateTicketDetails = (params) =>
  plgBaseAPI.POST(API.UPDATE_TICKET_DETAILS, params);
export const updateOrderInfoDetails = (params) =>
  plgBaseAPI.POST(API.UPDATE_ORDER_DETAILS, params);
export const addToolToExistingOrder = (params) =>
  plgBaseAPI.POST(API.ADD_TOOL_TO_EXISTING_ORDER, params);
export const updateOrderDescription = (params) =>
  plgBaseAPI.POST(API.UPDATE_ORDER_DESCRIPTION, params);
export const getSuggestedMembers = (params) =>
  plgBaseAPI.GET(API.SUGGESTED_MEMBERS + params);
// export const getSuggestedMembers = (params) => plgBaseAPI.GET(API.SUGGESTED_MEMBERS);
export const createProcessOrder = (params) =>
  plgBaseAPI.POST(API.PROCEED_ORDER + "?order_id=" + params);
export const getBoardMainTaskList = (params) =>
  plgBaseAPI.POST(API.GET_BOARD_MAIN_TASK_LIST, params);
export const getBoardSubTaskList = (params) =>
  plgBaseAPI.POST(API.GET_BOARD_SUB_TASK_LIST, params);
export const deleteOrderedTool = (params) => plgBaseAPI.DELETE(API.DELETE_TOOL, params);
export const getToolInfoDetails = (params) =>
  plgBaseAPI.GET(API.GET_TOOL_INFO_DETAILS + "?tool_ticket_id=" + params);
export const addToolTicketInfo = (params) =>
  plgBaseAPI.ADD_TOOL_INFO_DATA(API.ADD_TOOL_TICKET_INFO, params);
export const delete_tool_info = (params) =>
  plgBaseAPI.DELETE(API.DELETE_TOOL_INFO, params);
export const addUpdateToolNotes = (params) =>
  plgBaseAPI.POST(API.ADD_UPDATE_TOOL_NOTES, params);

//SUBTASK TOOL
export const updateSubtaskTool = (params) =>
  plgBaseAPI.POST(API.UPDATE_SUBTASK_TOOL, params);
export const getToolFlow = (params) => plgBaseAPI.GET(API.GET_TOOL_FLOW + params.id);
export const subTaskMoveTool = (params) => plgBaseAPI.POST(API.SUBTASK_MOVE_TOOL, params);

/** COMMENTS */
export const downloadAttachment = (params) =>
  plgBaseAPI.FILEDOWNLOAD(
    API.FILE_DOWNLOAD + "/" + params.attachement_id + "/" + params.type,
    params,
  );
/** Fetch comment attachment blob for in-app preview (does not download). */
export const fetchAttachmentBlob = (params) =>
  plgBaseAPI.FILEFETCH(
    API.FILE_DOWNLOAD + "/" + params.attachement_id + "/" + params.type,
    params,
  );
export const getCommentDetails = (params) =>
  plgBaseAPI.POST(API.GET_COMMENT_DETAILS, params);
export const addUpdateComment = (params) =>
  plgBaseAPI.FILEUPLOAD(API.ADD_UPDATE_COMMENT, params);
export const deleteComment = (params) => plgBaseAPI.POST(API.DELETE_COMMENT, params);

/*** Attachments ****/
export const uploadMultipleAttachmentFile = (params) =>
  plgBaseAPI.FILEUPLOAD(API.UPLOAD_MULTIPLE_FILE, params);
export const uploadAttachmentFile = (params) =>
  plgBaseAPI.FILEUPLOAD(API.UPLOAD_FILE, params);
export const getUploadAttachmentFile = (params) => {
  let url =
    API.GET_UPLOADED_FILE +
    "?Module=" +
    params.module +
    "&ReferenceId=" +
    params.referenceId;
  if (params.sectionId != null && params.sectionId !== "") {
    url += "&SectionId=" + params.sectionId;
  }
  return plgBaseAPI.GET(url);
};
export const downloadedAttachmentFile = (params) => {
  const url =
    API.DOWNLOADED_FILE +
    "/" +
    params.id +
    (params.sectionId ? `?sectionId=${params.sectionId}` : "");

  return plgBaseAPI.FILEDOWNLOAD(url, params);
};
export const deleteAttachmentFile = (params) =>
  plgBaseAPI.POST(API.DELETE_FILE + "/" + params.id);
export const downloadToolAttachmentFile = (params) =>
  plgBaseAPI.FILEDOWNLOAD(
    API.DOWNLOAD_TOOL_ATTACHMENT + "/" + params.attachmentId,
    params,
  );

/** ORDER_HISTORY */
export const getOrderHistory = (params) => plgBaseAPI.GET(API.GET_ORDER_HISTORY + params);

/*** Instrument Details ***/
export const getInstrumentDetails = (params) =>
  plgBaseAPI.GET(API.GET_INSTRUMENT_DETAILS + "?companycode=" + params.companyCode);

// MASTER SETTINGS
export const createWorkspaceUser = (params) =>
  plgBaseAPI.POST(API.WORKSPACE_ADD_USER, params);
export const getWorkspaceList = (params) => plgBaseAPI.GET(API.GET_WORKSPACE_LIST);
export const createWorkspaceBoard = (params) =>
  plgBaseAPI.POST(API.WORKSPACE_ADD_BOARD, params);
export const createWorkspace = (params) => plgBaseAPI.POST(API.CREATE_WORKSPACE, params);
export const deleteWorkSpaceBoard = (params) =>
  plgBaseAPI.DELETE(API.DELETE_WORKSPACE_BOARD, params);

/*** USER Management ***/
export const addUserBoardPermission = (params) =>
  plgBaseAPI.POST(API.ADD_USER_BOARD_PERMISSION, params);
export const getUserBoardPermission = (params) =>
  plgBaseAPI.GET(API.GET_USER_BOARD_PERMISSION + params.regId);
export const getTicketCretedUserList = (params) =>
  plgBaseAPI.GET(API.GET_TICKET_CREATED_USERLIST);

/** WORKFLOW MANAGEMENT */
export const getWorkFlowList = (params) =>
  plgBaseAPI.GET(API.GET_WORKFLOW_LIST + params.flow_id);
export const createWorkFlow = (params) => plgBaseAPI.POST(API.CREATE_WORKFLOW, params);
export const deleteWorkFlow = (params) => plgBaseAPI.DELETE(API.DELETE_WORKFLOW, params);
export const getWorkFlowMappingList = (params) =>
  plgBaseAPI.GET(API.GET_WORKFLOW_MAPPING_LIST + params.tool_flow_id);
export const createWorkFlowMapping = (params) =>
  plgBaseAPI.POST(API.CREATE_WORKFLOW_MAPPING, params);
export const deleteWorkFlowMapping = (params) =>
  plgBaseAPI.DELETE(API.DELETE_WORKFLOW_MAPPING, params);

/** WORKALLOCATION */
export const getWorkAllocation = (params) =>
  plgBaseAPI.GET(
    `${API.WORKALLOCATION}?board_id=${params.board_id}${params?.reg_id ? `&reg_id=${params.reg_id}` : ""}`,
  );

/** TASK MANAGEMENT */
export const createTask = (params) => plgBaseAPI.POST(API.CREATE_TASK, params);
export const getBoardTaskList = (params) =>
  plgBaseAPI.POST(API.GET_BOARD_TASK_LIST, params);
export const deleteTaskList = (params) =>
  plgBaseAPI.DELETE(API.DELETE_BOARD_TASK_LIST, params);
export const updateToolPosition = (params) =>
  plgBaseAPI.POST(API.UPDATE_TOOL_POSITION, params);

/** DASHBOARD */
export const getWorkspaceHealth = (params) =>
  plgBaseAPI.POST(API.GET_WORKSPACE_HEALTH, params);
export const performanceHealthSummary = (params) =>
  plgBaseAPI.POST(API.PERFORMANCE_HEALTH_SUMMARY, params);
export const getVelocityComparison = (params) =>
  plgBaseAPI.POST(API.VELOCITY_COMPARISON, params);
export const getBoardPerformanceTrend = (params) =>
  plgBaseAPI.POST(API.BOARD_PERFORMANCE_TREND, params);
export const getDashboardFormula = (params) => plgBaseAPI.GET(API.GET_DASHBOARD_FORMULA);
export const addUpdateDashboardFormula = (params) =>
  plgBaseAPI.POST(API.DASHBOARD_FORMULA_CONFIGURATION, params);
export const getBoardHealthSummary = (params) =>
  plgBaseAPI.POST(API.BOARD_HEALTH_SUMMARY, params);
export const getUpcomingDeadlines = (params) =>
  plgBaseAPI.POST(API.UPCOMMING_DEAD_LINE, params);
export const getOrderToolsPerformanceTrend = (params) =>
  plgBaseAPI.POST(API.ORDER_TOOLS_PERFORMANCE_TREND, params);
export const getDashBoardFilterList = (params) =>
  plgBaseAPI.POST(API.BOARD_FILTER, params);
export const getTaskSubGridSummary = (params) =>
  plgBaseAPI.POST(API.TASK_SUB_GRID_SUMMARY, params);
export const exportMainSubGridSummary = (params) =>
  plgBaseAPI.POST(API.MAIN_SUB_GRID_EXPORT_SUMMARY, params);
export const getWorkloadByUsers = (params) =>
  plgBaseAPI.POST(API.WORKLOAD_BY_USERS, params);

/** BRANDING GUIDELINE */
export const getBrandingGuideline = (params) =>
  plgBaseAPI.GET(`${API.GET_BRANDING_GUIDELINE}?token=${params.token}`);
export const getBrandingGuidelineNotes = (params) =>
  plgBaseAPI.GET(
    `${API.GET_BRANDING_GUIDELINE_NOTES}?token=${params.token}&sectionId=${params.sectionId}`,
  );
export const updateBrandingGuidelineNotes = (params) =>
  plgBaseAPI.POST(API.UPDATE_BRANDING_GUIDELINE_NOTES, params);
export const updateBrandingGuidelines = (formData) =>
  plgBaseAPI.UPLOAD_BRANDING_GUIDELINES(API.UPDATE_BRANDING_GUIDELINES, formData);
export const generateBrandingFromScraper = (formData) =>
  plgBaseAPI.UPLOAD_BRANDING_GUIDELINES(API.GENERATE_BRANDING_FROM_SCRAPER, formData);
export const getBrandingScraperJobsByOrder = (body) =>
  plgBaseAPI.POST(API.GET_BRANDING_SCRAPER_JOBS, body);
export const getBrandingScraperJobStatus = ({ jobId, orderId, typeId }) =>
  plgBaseAPI.GET(`${API.GET_BRANDING_SCRAPER_JOB_STATUS}/${jobId}`, {
    orderId,
    typeId,
  });
export const cancelBrandingScraperJob = (jobId) =>
  plgBaseAPI.POST(`${API.CANCEL_BRANDING_SCRAPER_JOB}/${jobId}`);

/** TASK BY WORKLOAD */
export const getTaskByWorkload = (params) =>
  plgBaseAPI.POST(API.TASK_BY_WORKLOAD, params);
export const getBoardStageSummaryItem = (params) =>
  plgBaseAPI.POST(API.BOARD_STAGE_SUMMARY_ITEM, params);
export const getAverageTimePerStage = (params) =>
  plgBaseAPI.POST(API.AVERAGE_TIME_PER_STAGE, params);
export const getBoardStageHeatmapSummary = (params) =>
  plgBaseAPI.POST(API.BOARD_STAGE_HEATMAP_SUMMARY, params);
export const getStageTimeTracking = (params) =>
  plgBaseAPI.POST(API.STAGE_TIME_TRACKING, params);
export const getandUpdateFreeFlowLabelMaster = (params) =>
  plgBaseAPI.POST(API.FREE_FLOW_LABEL_MASTER, params);

  /** ORION AI SUMMARIZATION
   * Base URL = REACT_APP_ORION_AI_INSIGHTS_URL (e.g. https://orionai.euroland.com)
   * Path = /summarization
   */
  export const getOrionAiInsights = (params = {}) => {
    const query = {};
    if (params.reg_id != null && params.reg_id !== "") {
      query.reg_id = params.reg_id;
    }
    if (params.current_date) query.current_date = params.current_date;
    if (params.compare_date) query.compare_date = params.compare_date;
    if (params.user_type_id != null && params.user_type_id !== "") {
      query.user_type_id = params.user_type_id;
    }
    if (params.workspace_id != null && params.workspace_id !== "") {
      query.workspace_id = params.workspace_id;
    }
    if (params.board_id != null && params.board_id !== "") {
      query.board_id = params.board_id;
    }
    return aiSummarizationAPI.GET(API.AI_SUMMARIZATION, query);
  };

/** KNOWLEDGE BASE */
export const getKnowledgeBaseList = (params) => plgBaseAPI.GET(API.KNOWLEDGE_BASE_LIST, params);
export const addUpdateKnowledgeBase = (params) =>
  plgBaseAPI.POST(API.KNOWLEDGE_BASE_ADD_UPDATE, params);
export const deleteKnowledgeBase = (params) =>
  plgBaseAPI.DELETE(API.KNOWLEDGE_BASE_DELETE, params);

/** USER KNOWLEDGE BASE PERMISSION */
export const getUserKnowledgeBasePermission = (params) =>
  plgBaseAPI.GET(API.GET_USER_KNOWLEDGEBASE_PERMISSION + params.regId);
export const addUserKnowledgeBasePermission = (params) =>
  plgBaseAPI.POST(API.ADD_USER_KNOWLEDGEBASE_PERMISSION, params);

/** USER APP PERMISSION */
export const getUserAppPermission = (params) =>
  plgBaseAPI.GET(API.GET_USER_APP_PERMISSION + params.regId);
export const addUserAppPermission = (params) =>
  plgBaseAPI.POST(API.ADD_USER_APP_PERMISSION, params);

/** KB FOLDERS */
export const getKbFolders = (params) => plgBaseAPI.GET(API.KB_FOLDERS_LIST, params);
export const getKbFolderItems = (params) =>
  plgBaseAPI.GET(API.KB_FOLDER_ITEMS, params);
export const addUpdateKbFolder = (params) =>
  plgBaseAPI.POST(API.KB_FOLDER_ADD_UPDATE, params);
export const deleteKbFolder = (params) =>
  plgBaseAPI.DELETE(API.KB_FOLDER_DELETE, params);

/** KB ATTACHMENTS */
export const addKbAttachments = (formData) =>
  plgBaseAPI.UPLOAD_BRANDING_GUIDELINES(API.KB_ATTACHMENTS_ADD, formData);
export const deleteKbAttachment = (params) =>
  plgBaseAPI.DELETE(API.KB_ATTACHMENT_DELETE, params);
export const downloadKbAttachment = (params) =>
  plgBaseAPI.FILEDOWNLOAD(API.KB_ATTACHMENT_DOWNLOAD + params.id, params);
/** Fetch KB attachment blob for in-app preview (does not download). */
export const fetchKbAttachmentBlob = (params) =>
  plgBaseAPI.FILEFETCH(API.KB_ATTACHMENT_DOWNLOAD + params.id, params);

/** KB LINKS */
export const addUpdateKbLink = (params) =>
  plgBaseAPI.POST(API.KB_LINK_ADD_UPDATE, params);
export const deleteKbLink = (params) =>
  plgBaseAPI.DELETE(API.KB_LINK_DELETE, params);

/** KB ISSUES (Helpdesk Issue & Resolution) */
export const getKbIssues = (params) => plgBaseAPI.GET(API.KB_ISSUES_LIST, params);
export const getKbIssue = (params) => plgBaseAPI.GET(API.KB_ISSUE_DETAILS, params);
export const addUpdateKbIssue = (params) =>
  plgBaseAPI.POST(API.KB_ISSUE_ADD_UPDATE, params);

/** KB SEARCH */
export const searchKb = (params) => plgBaseAPI.GET(API.KB_SEARCH, params);

/** APP PERMISSION */
export const getAppPermission = (params) => plgBaseAPI.GET(API.GET_APP_PERMISSION);

/** KIMAI TIME TRACKING */
export const getKimaiProjects = () => orionTimeTrackingAPI.GET("/api/projects");
export const getKimaiActivities = (projectId) =>
  orionTimeTrackingAPI.GET("/api/activities", { project: projectId });
// "/find" (not the deprecated "/tags") returns full tag objects incl. color, not just names.
export const getKimaiTags = () => orionTimeTrackingAPI.GET("/api/tags/find", { name: "" });
export const createKimaiTimesheet = (payload) =>
  orionTimeTrackingAPI.POST("/api/timesheets", payload);
// Most recently finished entry for the current user - used to default a new
// entry's "From" to where the last one left off, like Kimai's own UI does.
export const getKimaiLastTimesheet = () =>
  orionTimeTrackingAPI.GET("/api/timesheets", {
    size: 1,
    orderBy: "end",
    order: "DESC",
    active: 0,
  });
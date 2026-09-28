export const WITHOUTGATEWAY = {
  /*** USER Login ***/
  GET_LOGIN: "/master/auth/login",
  LOGOUT: "/master/api/AdManagement/sign-out",
  GET_USER_INFO: "/master/api/Login/userinfo",
  GET_USER_DETAILS_BY_ID: "/master/api/Login/userdetail",
  GET_PHOTO_SYNC: "/master/api/AdManagement/ad-user-photosync",

  /** NOTIFICATION */
  GET_PAGE_NOTIFICATION: "/OrderTicketing/api/ToolTicketManagement/getpagenotification",
  GET_PAGE_NOTIFICATION: "/OrderTicketing/api/ToolTicketManagement/getpagenotification",
  UPDATE_NOTIFICATION: "/OrderTicketing/api/ToolTicketManagement/updatenotification",
  READ_DELETE_ALL_NOTIFICATION:
    "/OrderTicketing/api/ToolTicketManagement/readupdateallnotification",

  /** MASTER ***/
  CUSTOMER_SEARCH_WITH_TYPE: "/customermaster/api/CustomerManagement/customersearch",
  GET_ALL_COUNTRY_DETAIL: "/master/api/CountryDetail/getallcountrydetail",
  GET_INDUSTRY: "/customermaster/api/IndustryManagement/industries",
  GET_CUSTOMER_REGION: "/master/api/Region/marketregions",
  GET_FONT_FAMILY_MASTER: "/master/api/FontFamily/fonts",
  ADD_FONT_FAMILY: "/master/api/FontFamily/add",
  GET_CUSTOMER_LANGUAGE: "/master/api/Language/languages",
  GET_PRIMARY_MARKET: "/customermaster/api/MarketManagement/markets",
  GET_PRODUCT_TOOLS: "/master/api/Tool/tools",
  GET_CURRENCY: "/master/api/Currency/currency",
  SUBSCRIPTIONS_TYPES: "/master/api/Tool/subscriptions",
  GET_PACKAGE_DETAILS: "/OrderTicketing/api/TicketManagement/package-details",

  /** Designation **/
  GET_DESIGNATION: "/master/api/Desgination/designations",

  /** USERS **/
  GET_AD_USERS: "/master/api/AdManagement/ad-users",
  GET_ALL_TEAM: "/master/api/Team/getallteam",
  GET_ALL_WORKSPACE: "/master/api/Workspace/getallworkspace",
  WORKSPACE_ADD_USER: "/UserManagement/api/UserManagement/add-user",
  GET_USER_LIST: "/UserManagement/api/UserManagement/get-user-list",
  UPDATE_USER_TYPE: "/UserManagement/api/UserManagement/update_user_type",
  GET_USER_ROLE: "/master/api/Role/roles",

  /** BOARD MANAGEMENT **/
  GET_ALL_BOARDS: "/master/api/BoardManagement/boards",
  GET_BOARD_MAIN_TASK_LIST:
    "/OrderTicketing/api/OrderTicketManagement/get_board_main_task_list",
  GET_BOARD_SUB_TASK_LIST:
    "/OrderTicketing/api/OrderTicketManagement/get_board_sub_task_list",
  UPDATE_SUBTASK_TOOL: "/OrderTicketing/api/ToolTicketManagement/update_tool_detail",
  GET_TOOL_FLOW: "/master/api/BoardManagement/getflow/?flow_id=",
  SUBTASK_MOVE_TOOL: "/OrderTicketing/api/ToolTicketManagement/move_tool",

  /** ORDER TICKETING **/
  GLOBAL_MASTER: "/OrderTicketing/api/OrderTicketManagement/status-type?type=",
  CREATE_TICKET: "/OrderTicketing/api/OrderTicketManagement/add-ticket",
  GET_ORDERED_TICKET_LIST: "/OrderTicketing/api/OrderTicketManagement/get_order_list",
  TICKET_STATUS_COUNT: "/OrderTicketing/api/OrderTicketManagement/ticket-status-count",
  DELETE_ORDERED_TICKET: "/OrderTicketing/api/OrderTicketManagement/delete",
  FILE_DOWNLOAD: "/OrderTicketing/api/OrderTicketManagement/downloadcommentfile",
  SUGGESTED_MEMBERS:
    "/OrderTicketing/api/OrderTicketManagement/ticketsuggested-members?boardIds=",

  /** Order Ticket Get and Update Service **/
  GET_TICKET_DETAILS: "/OrderTicketing/api/OrderTicketManagement/Orderticketdetails",
  UPDATE_TICKET_DETAILS: "/OrderTicketing/api/OrderTicketManagement/update-ticket",
  UPDATE_ORDER_DETAILS: "/OrderTicketing/api/OrderTicketManagement/add-order-detail",
  ADD_TOOL_TO_EXISTING_ORDER:
    "/OrderTicketing/api/OrderTicketManagement/addtooltoexistingorder",
  UPDATE_ORDER_DESCRIPTION:
    "/OrderTicketing/api/OrderTicketManagement/Update-Order-description",
  PROCEED_ORDER: "/OrderTicketing/api/OrderTicketManagement/process_order",
  DELETE_TOOL: "/OrderTicketing/api/ToolTicketManagement/delete_tool_option",

  // ADD LINK AND ATTACHMENTS IN TOOL AND GET TOOL TICKET DETAILS
  GET_TOOL_INFO_DETAILS: "/OrderTicketing/api/ToolTicketManagement/get_tool_info_details",
  ADD_TOOL_TICKET_INFO: "/OrderTicketing/api/ToolTicketManagement/add_tool_ticket_info",
  DELETE_TOOL_INFO: "/OrderTicketing/api/ToolTicketManagement/delete_tool_ticket_info",
  ADD_UPDATE_TOOL_NOTES: "/OrderTicketing/api/ToolTicketManagement/update_tool_notes",

  /** COMMENTS **/
  GET_COMMENT_DETAILS: "/OrderTicketing/api/OrderTicketManagement/ticketcommentdetails",
  ADD_UPDATE_COMMENT: "/OrderTicketing/api/OrderTicketManagement/addupdatecomment",
  DELETE_COMMENT: "/OrderTicketing/api/OrderTicketManagement/deletecommentdetails",

  /** Attachments **/
  UPLOAD_MULTIPLE_FILE: "/attachment/api/Attachments/upload-multiple",
  UPLOAD_FILE: "/attachment/api/Attachments/upload",
  GET_UPLOADED_FILE: "/attachment/api/Attachments/List",
  DOWNLOADED_FILE: "/attachment/api/Attachments/Download",
  DELETE_FILE: "/attachment/api/Attachments/Delete",
  DOWNLOAD_TOOL_ATTACHMENT:
    "/OrderTicketing/api/ToolTicketManagement/download_tool_info_file",

  /** ORDER HISTORY **/
  GET_ORDER_HISTORY:
    "/OrderTicketing/api/OrderTicketManagement/order-histroy?companyCode=",

  /** Instrument Details **/
  GET_INSTRUMENT_DETAILS:
    "/OrderTicketing/api/OrderTicketManagement/getinstrumentdetails",

  /** USER Management **/
  GET_USER_BOARD_PERMISSION:
    "/UserManagement/api/UserManagement/get_user_board_permission/",
  ADD_USER_BOARD_PERMISSION:
    "/UserManagement/api/UserManagement/add_user_board_permission",
  GET_USER_APP_PERMISSION:
    "/UserManagement/api/UserManagement/get_user_app_permission/",
  ADD_USER_APP_PERMISSION:
    "/UserManagement/api/UserManagement/add_user_app_permission",
  GET_TICKET_CREATED_USERLIST:
    "/OrderTicketing/api/OrderTicketManagement/get_sa_assignee_list",

  /** SETTINGS **/
  GET_WORKSPACE_LIST: "/master/api/Workspace/getworkspacewithboards",
  CREATE_WORKSPACE: "/master/api/Workspace/addupdateworkspace",
  WORKSPACE_ADD_BOARD: "/master/api/BoardManagement/addupdateboard",
  DELETE_WORKSPACE_BOARD: "/master/api/Workspace/deleteworkspaceboard",

  /** WORKFLOW **/
  GET_WORKFLOW_LIST: "/master/api/BoardManagement/getflow/?flow_id=",
  CREATE_WORKFLOW: "/master/api/BoardManagement/addupdateflow",
  DELETE_WORKFLOW: "/master/api/BoardManagement/deleteflow",
  GET_WORKFLOW_MAPPING_LIST: "/master/api/BoardManagement/gettoolflow/?tool_flow_id=",
  CREATE_WORKFLOW_MAPPING: "/master/api/BoardManagement/addtoolflow",
  DELETE_WORKFLOW_MAPPING: "/master/api/BoardManagement/deletetoolflow",

  /** WORK ALLOCATION */
  WORKALLOCATION: "/master/api/BoardManagement/gettaskallocation",

  /** DASHBOARD FORMULA */
  GET_DASHBOARD_FORMULA: "/master/api/Workspace/gethealthstatus",
  DASHBOARD_FORMULA_CONFIGURATION: "/master/api/Workspace/addupdatemasterconfiguration",

  /** TASK MANAGEMENT */
  CREATE_TASK: "/TaskManagement/api/TaskManagement/addtask",
  GET_BOARD_TASK_LIST: "/TaskManagement/api/TaskManagement/getboardtasklist",
  DELETE_BOARD_TASK_LIST: "/TaskManagement/api/TaskManagement/deletetask",
  UPDATE_TOOL_POSITION: "/TaskManagement/api/TaskManagement/update-tool-position",

  /** DASHBOARD */
  GET_WORKSPACE_HEALTH: "/dashBoard/api/DashBoard/workspacehealthsummary",
  PERFORMANCE_HEALTH_SUMMARY: "/dashBoard/api/DashBoard/performancehealthsummary",
  VELOCITY_COMPARISON: "/dashBoard/api/DashBoard/velocitycomparison",
  BOARD_PERFORMANCE_TREND: "/dashBoard/api/DashBoard/boardperformancetrend",
  BOARD_HEALTH_SUMMARY: "/dashBoard/api/DashBoard/boardhealthsummary",
  UPCOMMING_DEAD_LINE: "/dashBoard/api/DashBoard/boardupcomingdeadlines",
  ORDER_TOOLS_PERFORMANCE_TREND: "/DashBoard/api/DashBoard/ordertoolsperformancetrend",
  BOARD_FILTER: "/dashBoard/api/DashBoard/taskmaingridsummary",
  TASK_SUB_GRID_SUMMARY: "/dashBoard/api/DashBoard/tasksubgridsummary",
  MAIN_SUB_GRID_EXPORT_SUMMARY: "/dashBoard/api/DashBoard/mainsubgridexportsummary",
  WORKLOAD_BY_USERS: "/dashBoard/api/DashBoard/workloadbyusers",

  /** BRANDING GUIDELINE */
  GET_BRANDING_GUIDELINE: "/OrderTicketing/api/public/branding/info",
  GET_BRANDING_GUIDELINE_NOTES: "/OrderTicketing/api/public/branding/notes",
  UPDATE_BRANDING_GUIDELINE_NOTES: "/OrderTicketing/api/public/branding/notes-update",
  UPDATE_BRANDING_GUIDELINES: "/customermaster/api/CustomerManagement/addupdatecustomerbranding",
  GENERATE_BRANDING_FROM_SCRAPER: "/customermaster/api/CustomerManagement/extractbrandguidelines",
  GET_BRANDING_SCRAPER_JOBS: "/customermaster/api/CustomerManagement/getscraperjobs",
  GET_BRANDING_SCRAPER_JOB_STATUS: "/customermaster/api/CustomerManagement/jobs",
  CANCEL_BRANDING_SCRAPER_JOB: "/customermaster/api/CustomerManagement/jobs/cancel",

  TASK_BY_WORKLOAD: "/dashBoard/api/DashBoard/boardstagebyworkloadsummary",
  BOARD_STAGE_SUMMARY_ITEM: "/dashBoard/api/DashBoard/boardstagebyagesummary",
  AVERAGE_TIME_PER_STAGE: "/dashBoard/api/DashBoard/averagetimeperstage",
  BOARD_STAGE_HEATMAP_SUMMARY: "/dashBoard/api/DashBoard/boardstageheatmapsummary",
  STAGE_TIME_TRACKING: "/dashBoard/api/DashBoard/subtaskprogressbar",
  FREE_FLOW_LABEL_MASTER: "/master/api/Workspace/upsertstatuscodemasterconfiguration",
  AI_SUMMARIZATION: "/summarization",

  /** KNOWLEDGE BASE */
  KNOWLEDGE_BASE_LIST: "/master/api/KnowledgeBase/getknowledgebase",
  KNOWLEDGE_BASE_ADD_UPDATE: "/master/api/KnowledgeBase/addUpdateKnowledgeBase",
  KNOWLEDGE_BASE_DELETE: "/master/api/KnowledgeBase/deleteknowledgebase",
  GET_USER_KNOWLEDGEBASE_PERMISSION: "/master/api/KnowledgeBase/get_user_knowledgebase_permission/",
  ADD_USER_KNOWLEDGEBASE_PERMISSION: "/master/api/KnowledgeBase/add_user_knowledgebase_permission",
  KB_FOLDERS_LIST: "/master/api/KnowledgeBase/getfolders",
  KB_FOLDER_ITEMS: "/master/api/KnowledgeBase/getfolderitems",
  KB_FOLDER_ADD_UPDATE: "/master/api/KnowledgeBase/addUpdateFolder",
  KB_FOLDER_DELETE: "/master/api/KnowledgeBase/deletefolder",
  KB_ATTACHMENTS_ADD: "/master/api/KnowledgeBase/addattachments",
  KB_ATTACHMENT_DELETE: "/master/api/KnowledgeBase/deleteattachment",
  KB_ATTACHMENT_DOWNLOAD: "/master/api/KnowledgeBase/downloadattachment/",
  KB_LINK_ADD_UPDATE: "/master/api/KnowledgeBase/addUpdateLink",
  KB_LINK_DELETE: "/master/api/KnowledgeBase/deletelink",
  KB_ISSUES_LIST: "/master/api/KnowledgeBase/getIssueList",
  KB_ISSUE_DETAILS: "/master/api/KnowledgeBase/getIssueDetails",
  KB_ISSUE_ADD_UPDATE: "/master/api/KnowledgeBase/addUpdateIssue",
  KB_SEARCH: "/master/api/KnowledgeBase/search",

  /*** App Permission ***/
  GET_APP_PERMISSION: "/master/api/AppMaster/apps",
};

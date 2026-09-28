export const GATEWAY = {
  /*** USER Login ***/
  GET_LOGIN: "/master/auth/login",
  LOGOUT: "/master/AdManagement/sign-out",
  GET_USER_INFO: "/master/Login/userinfo",
  GET_USER_DETAILS_BY_ID: "/master/Login/userdetail",
  GET_PHOTO_SYNC: "/master/AdManagement/ad-user-photosync",

  /** NOTIFICATION */
  GET_PAGE_NOTIFICATION: "/OrderTicketing/ToolTicketManagement/getpagenotification",
  UPDATE_NOTIFICATION: "/OrderTicketing/ToolTicketManagement/updatenotification",
  READ_DELETE_ALL_NOTIFICATION:
    "/OrderTicketing/ToolTicketManagement/readupdateallnotification",

  /** MASTER ***/
  CUSTOMER_SEARCH_WITH_TYPE: "/customermaster/CustomerManagement/customersearch",
  GET_ALL_COUNTRY_DETAIL: "/master/CountryDetail/getallcountrydetail",
  GET_INDUSTRY: "/customermaster/IndustryManagement/industries",
  GET_CUSTOMER_REGION: "/master/Region/marketregions",
  GET_FONT_FAMILY_MASTER: "/master/FontFamily/fonts",
  ADD_FONT_FAMILY: "/master/FontFamily/add",
  GET_CUSTOMER_LANGUAGE: "/master/Language/languages",
  GET_PRIMARY_MARKET: "/customermaster/MarketManagement/markets",
  GET_PRODUCT_TOOLS: "/master/Tool/tools",
  GET_CURRENCY: "/master/Currency/currency",
  SUBSCRIPTIONS_TYPES: "/master/Tool/subscriptions",
  GET_PACKAGE_DETAILS: "/OrderTicketing/TicketManagement/package-details",

  /** Designation **/
  GET_DESIGNATION: "/master/Desgination/designations",

  /** USERS **/
  GET_AD_USERS: "/master/AdManagement/ad-users",
  GET_ALL_TEAM: "/master/Team/getallteam",
  GET_ALL_WORKSPACE: "/master/Workspace/getallworkspace",
  WORKSPACE_ADD_USER: "/UserManagement/UserManagement/add-user",
  GET_USER_LIST: "/UserManagement/UserManagement/get-user-list",
  UPDATE_USER_TYPE: "/UserManagement/UserManagement/update_user_type",
  GET_USER_ROLE: "/master/Role/roles",

  /** BOARD MANAGEMENT **/
  GET_ALL_BOARDS: "/master/BoardManagement/boards",
  GET_BOARD_MAIN_TASK_LIST:
    "/OrderTicketing/OrderTicketManagement/get_board_main_task_list",
  GET_BOARD_SUB_TASK_LIST:
    "/OrderTicketing/OrderTicketManagement/get_board_sub_task_list",
  UPDATE_SUBTASK_TOOL: "/OrderTicketing/ToolTicketManagement/update_tool_detail",
  GET_TOOL_FLOW: "/master/BoardManagement/getflow/?flow_id=",
  SUBTASK_MOVE_TOOL: "/OrderTicketing/ToolTicketManagement/move_tool",

  /** ORDER TICKETING **/
  GLOBAL_MASTER: "/OrderTicketing/OrderTicketManagement/status-type?type=",
  CREATE_TICKET: "/OrderTicketing/OrderTicketManagement/add-ticket",
  GET_ORDERED_TICKET_LIST: "/OrderTicketing/OrderTicketManagement/get_order_list",
  TICKET_STATUS_COUNT: "/OrderTicketing/OrderTicketManagement/ticket-status-count",
  DELETE_ORDERED_TICKET: "/OrderTicketing/OrderTicketManagement/delete",
  FILE_DOWNLOAD: "/OrderTicketing/OrderTicketManagement/downloadcommentfile",
  SUGGESTED_MEMBERS:
    "/OrderTicketing/OrderTicketManagement/ticketsuggested-members?boardIds=",

  /** Order Ticket Get and Update Service **/
  GET_TICKET_DETAILS: "/OrderTicketing/OrderTicketManagement/Orderticketdetails",
  UPDATE_TICKET_DETAILS: "/OrderTicketing/OrderTicketManagement/update-ticket",
  UPDATE_ORDER_DETAILS: "/OrderTicketing/OrderTicketManagement/add-order-detail",
  ADD_TOOL_TO_EXISTING_ORDER:
    "/OrderTicketing/OrderTicketManagement/addtooltoexistingorder",
  UPDATE_ORDER_DESCRIPTION:
    "/OrderTicketing/OrderTicketManagement/Update-Order-description",
  PROCEED_ORDER: "/OrderTicketing/OrderTicketManagement/process_order",
  DELETE_TOOL: "/OrderTicketing/ToolTicketManagement/delete_tool_option",

  // ADD LINK AND ATTACHMENTS IN TOOL AND GET TOOL TICKET DETAILS
  GET_TOOL_INFO_DETAILS: "/OrderTicketing/ToolTicketManagement/get_tool_info_details",
  ADD_TOOL_TICKET_INFO: "/OrderTicketing/ToolTicketManagement/add_tool_ticket_info",
  DELETE_TOOL_INFO: "/OrderTicketing/ToolTicketManagement/delete_tool_ticket_info",
  ADD_UPDATE_TOOL_NOTES: "/orderticketing/ToolTicketManagement/update_tool_notes",

  /** COMMENTS **/
  GET_COMMENT_DETAILS: "/OrderTicketing/OrderTicketManagement/ticketcommentdetails",
  ADD_UPDATE_COMMENT: "/OrderTicketing/OrderTicketManagement/addupdatecomment",
  DELETE_COMMENT: "/OrderTicketing/OrderTicketManagement/deletecommentdetails",

  /** Attachments **/
  UPLOAD_MULTIPLE_FILE: "/attachment/Attachments/upload-multiple",
  UPLOAD_FILE: "/attachment/Attachments/upload",
  GET_UPLOADED_FILE: "/attachment/Attachments/List",
  DOWNLOADED_FILE: "/attachment/Attachments/Download",
  DELETE_FILE: "/attachment/Attachments/Delete",
  DOWNLOAD_TOOL_ATTACHMENT:
    "/OrderTicketing/ToolTicketManagement/download_tool_info_file",

  /** ORDER HISTORY **/
  GET_ORDER_HISTORY: "/OrderTicketing/OrderTicketManagement/order-histroy?companyCode=",

  /** Instrument Details **/
  GET_INSTRUMENT_DETAILS: "/OrderTicketing/OrderTicketManagement/getinstrumentdetails",

  /** USER Management **/
  GET_USER_BOARD_PERMISSION: "/UserManagement/UserManagement/get_user_board_permission/",
  ADD_USER_BOARD_PERMISSION: "/UserManagement/UserManagement/add_user_board_permission",
  GET_USER_APP_PERMISSION: "/UserManagement/UserManagement/get_user_app_permission/",
  ADD_USER_APP_PERMISSION: "/UserManagement/UserManagement/add_user_app_permission",
  GET_TICKET_CREATED_USERLIST:
    "/OrderTicketing/OrderTicketManagement/get_sa_assignee_list",

  /** SETTINGS **/
  GET_WORKSPACE_LIST: "/Master/Workspace/getworkspacewithboards",
  CREATE_WORKSPACE: "/Master/Workspace/addupdateworkspace",
  WORKSPACE_ADD_BOARD: "/Master/BoardManagement/addupdateboard",
  DELETE_WORKSPACE_BOARD: "/Master/Workspace/deleteworkspaceboard",

  /** WORKFLOW **/
  GET_WORKFLOW_LIST: "/master/BoardManagement/getflow/?flow_id=",
  CREATE_WORKFLOW: "/master/BoardManagement/addupdateflow",
  DELETE_WORKFLOW: "/master/BoardManagement/deleteflow",
  GET_WORKFLOW_MAPPING_LIST: "/master/BoardManagement/gettoolflow/?tool_flow_id=",
  CREATE_WORKFLOW_MAPPING: "/master/BoardManagement/addtoolflow",
  DELETE_WORKFLOW_MAPPING: "/master/BoardManagement/deletetoolflow",

  /** WORK ALLOCATION */
  WORKALLOCATION: "/master/BoardManagement/gettaskallocation",

  /** DASHBOARD FORMULA */
  GET_DASHBOARD_FORMULA: "/master/Workspace/gethealthstatus",
  DASHBOARD_FORMULA_CONFIGURATION: "/master/Workspace/addupdatemasterconfiguration",

  /** TASK MANAGEMENT */
  CREATE_TASK: "/TaskManagement/TaskManagement/addtask",
  GET_BOARD_TASK_LIST: "/TaskManagement/TaskManagement/getboardtasklist",
  DELETE_BOARD_TASK_LIST: "/TaskManagement/TaskManagement/deletetask",
  UPDATE_TOOL_POSITION: "/TaskManagement/TaskManagement/update-tool-position",

  /** DASHBOARD */
  GET_WORKSPACE_HEALTH: "/dashBoard/DashBoard/workspacehealthsummary",
  PERFORMANCE_HEALTH_SUMMARY: "/dashBoard/DashBoard/performancehealthsummary",
  VELOCITY_COMPARISON: "/dashBoard/DashBoard/velocitycomparison",
  BOARD_PERFORMANCE_TREND: "/dashBoard/DashBoard/boardperformancetrend",
  BOARD_HEALTH_SUMMARY: "/dashBoard/DashBoard/boardhealthsummary",
  UPCOMMING_DEAD_LINE: "/dashBoard/DashBoard/boardupcomingdeadlines",
  ORDER_TOOLS_PERFORMANCE_TREND: "/dashBoard/DashBoard/ordertoolsperformancetrend",
  BOARD_FILTER: "/dashBoard/DashBoard/taskmaingridsummary",
  TASK_SUB_GRID_SUMMARY: "/dashBoard/DashBoard/tasksubgridsummary",
  MAIN_SUB_GRID_EXPORT_SUMMARY: "/dashBoard/DashBoard/mainsubgridexportsummary",
  WORKLOAD_BY_USERS: "/dashBoard/DashBoard/workloadbyusers",

  /** BRANDING INFORMATION */
  GET_BRANDING_GUIDELINE: "/OrderTicketing/public/branding/info",
  GET_BRANDING_GUIDELINE_NOTES: "/OrderTicketing/public/branding/notes",
  UPDATE_BRANDING_GUIDELINE_NOTES: "/OrderTicketing/public/branding/notes-update",
  UPDATE_BRANDING_GUIDELINES: "/customermaster/CustomerManagement/addupdatecustomerbranding",
  GENERATE_BRANDING_FROM_SCRAPER: "/customermaster/CustomerManagement/extractbrandguidelines",
  GET_BRANDING_SCRAPER_JOBS: "/customermaster/CustomerManagement/getscraperjobs",
  GET_BRANDING_SCRAPER_JOB_STATUS: "/customermaster/CustomerManagement/jobs",
  CANCEL_BRANDING_SCRAPER_JOB: "/customermaster/CustomerManagement/jobs/cancel",

  TASK_BY_WORKLOAD: "/dashBoard/DashBoard/boardstagebyworkloadsummary",
  BOARD_STAGE_SUMMARY_ITEM: "/dashBoard/DashBoard/boardstagebyagesummary",
  AVERAGE_TIME_PER_STAGE: "/dashBoard/DashBoard/averagetimeperstage",
  BOARD_STAGE_HEATMAP_SUMMARY: "/dashBoard/DashBoard/boardstageheatmapsummary",
  STAGE_TIME_TRACKING: "/dashBoard/DashBoard/subtaskprogressbar",
  FREE_FLOW_LABEL_MASTER: "/master/Workspace/upsertstatuscodemasterconfiguration",
  AI_SUMMARIZATION: "/summarization",

  /** KNOWLEDGE BASE */
  KNOWLEDGE_BASE_LIST: "/master/KnowledgeBase/getknowledgebase",
  KNOWLEDGE_BASE_ADD_UPDATE: "/master/KnowledgeBase/addUpdateKnowledgeBase",
  KNOWLEDGE_BASE_DELETE: "/master/KnowledgeBase/deleteknowledgebase",
  GET_USER_KNOWLEDGEBASE_PERMISSION: "/master/KnowledgeBase/get_user_knowledgebase_permission/",
  ADD_USER_KNOWLEDGEBASE_PERMISSION: "/master/KnowledgeBase/add_user_knowledgebase_permission",
  KB_FOLDERS_LIST: "/master/KnowledgeBase/getfolders",
  KB_FOLDER_ITEMS: "/master/KnowledgeBase/getfolderitems",
  KB_FOLDER_ADD_UPDATE: "/master/KnowledgeBase/addUpdateFolder",
  KB_FOLDER_DELETE: "/master/KnowledgeBase/deletefolder",
  KB_ATTACHMENTS_ADD: "/master/KnowledgeBase/addattachments",
  KB_ATTACHMENT_DELETE: "/master/KnowledgeBase/deleteattachment",
  KB_ATTACHMENT_DOWNLOAD: "/master/KnowledgeBase/downloadattachment/",
  KB_LINK_ADD_UPDATE: "/master/KnowledgeBase/addUpdateLink",
  KB_LINK_DELETE: "/master/KnowledgeBase/deletelink",
  KB_ISSUES_LIST: "/master/KnowledgeBase/getIssueList",
  KB_ISSUE_DETAILS: "/master/KnowledgeBase/getIssueDetails",
  KB_ISSUE_ADD_UPDATE: "/master/KnowledgeBase/addUpdateIssue",
  KB_SEARCH: "/master/KnowledgeBase/search",
    /*** App Permission ***/
    GET_APP_PERMISSION: "/master/AppMaster/apps",
};

import { useGlobalContext } from "store/context/GlobalProvider";
import {
  getSuggestedMembers,
  globalMaster,
  getCountry,
  getPrimaryMarket,
  getCustomerRegion,
  getCurrency,
  getProductTools,
  getCustomerLanguage,
  getFontFamily,
  getIndustry,
  getDesignation,
  getAllTeam,
  getAdUsers,
  getAllWorkSpace,
  getAllBoards,
  addFontFamily,
  getUserRole,
  getPackageDetails,
  getTicketCretedUserList,
  getWorkFlowList,
  getDashboardFormula,
  getKnowledgeBaseList as getKnowledgeBaseListApi,
  getAppPermission,
  getWorkspaceList,
  } from "services";

/** In-flight master fetches so concurrent callers share one request. */
const inflightMasterRequests = new Map();

/**
 * @typedef {{ data?: unknown[], loading?: boolean, error?: string, loaded?: boolean }} MasterDataSlice
 */

/**
 * @returns {Record<string, MasterDataSlice | undefined> & {
 *   getOrderType: () => Promise<unknown>,
 *   getOrderCategory: () => Promise<unknown>,
 *   getOrderStatus: () => Promise<unknown>,
 *   getPackageList: () => Promise<unknown>,
 *   getLabelList: () => Promise<unknown>,
 *   getRoleList: () => Promise<unknown>,
 *   getDeleteToolReasonList: () => Promise<unknown>,
 *   getDeleteTaskReasonList: () => Promise<unknown>,
 *   getSuggestedMembersList: (params?: unknown) => Promise<unknown>,
 *   getTaskPriority: () => Promise<unknown>,
 *   getWorkFlowType: () => Promise<unknown>,
 *   getTaskDueStatusList: () => Promise<unknown>,
 *   getCountryList: () => Promise<unknown>,
 *   getMarketRegionList: () => Promise<unknown>,
 *   getRegionList: () => Promise<unknown>,
 *   getCurrencyList: () => Promise<unknown>,
 *   getToolsList: () => Promise<unknown>,
 *   getLanguageList: () => Promise<unknown>,
 *   getFontFamilyList: () => Promise<unknown>,
 *   addFontFamilyList: (params?: unknown) => Promise<unknown>,
 *   getIndustriesList: () => Promise<unknown>,
 *   getPackageDetails: () => Promise<unknown>,
 *   getDesignationList: () => Promise<unknown>,
 *   getAllTeamList: () => Promise<unknown>,
 *   getAdUsersList: () => Promise<unknown>,
 *   getAllWorkSpaceList: () => Promise<unknown>,
 *   getBoardList: () => Promise<unknown>,
 *   getUserRoleList: () => Promise<unknown>,
 *   getTicketAssigneeList: () => Promise<unknown>,
 *   getWorkFlowList: (params?: unknown) => Promise<unknown>,
 *   getDashboardFormulaData: (params?: unknown) => Promise<unknown>,
 *   getFreeFlowLabelList: () => Promise<unknown>,
 *   getKnowledgeBaseList: (options?: { force?: boolean }) => Promise<unknown>,
 *   getAppPermissionList: () => Promise<unknown>,
 *   getWorkspaceWithBoardsList: (options?: { force?: boolean }) => Promise<unknown>,
 * }}
 */
const useGlobalMaster = () => {
  const { masterState, dispatch } = useGlobalContext();

  const fetchMasterData = async (key, apiCall, options = {}) => {
    const { force = false } = options || {};
    if (!force && masterState[key]?.loaded) {
      return { data: masterState[key]?.data ?? [] };
    }
    if (!force && inflightMasterRequests.has(key)) {
      return inflightMasterRequests.get(key);
    }
    if (masterState[key]?.loading && inflightMasterRequests.has(key)) {
      return inflightMasterRequests.get(key);
    }
    if (!force && masterState[key]?.loading) return;
    if (!force && masterState[key]?.error) return;
    if (!force && masterState[key]?.data?.length > 0) {
      return { data: masterState[key].data };
    }

    dispatch({ type: "LOADING", payload: { key } });

    const requestPromise = (async () => {
      try {
        const res = await apiCall();

        dispatch({
          type: "SUCCESS",
          payload: {
            key,
            data: res?.data ?? [],
          },
        });
        return res;
      } catch (error) {
        dispatch({
          type: "ERROR",
          payload: {
            key,
            error: error.message || "Something went wrong",
          },
        });
        throw error;
      } finally {
        inflightMasterRequests.delete(key);
      }
    })();

    inflightMasterRequests.set(key, requestPromise);
    return requestPromise;
  };

  return {
    ...masterState,
    getOrderType: () =>
      fetchMasterData("orderType", () => globalMaster({ type: "ORDERTYPE" })),
    getOrderCategory: () =>
      fetchMasterData("orderCategory", () => globalMaster({ type: "ORDERCATEGORY" })),
    getOrderStatus: () =>
      fetchMasterData("orderStatus", () => globalMaster({ type: "ORDERSTATUS" })),
    getPackageList: () =>
      fetchMasterData("packageList", () => globalMaster({ type: "PACKAGE" })),
    getLabelList: () =>
      fetchMasterData("labelList", () => globalMaster({ type: "ORDERLABEL" })),
    getRoleList: () =>
      fetchMasterData("roleList", () => globalMaster({ type: "USERROLE" })),
    getDeleteToolReasonList: () =>
      fetchMasterData("deleteToolReasonList", () => globalMaster({ type: "DELETETOOL" })),
    getDeleteTaskReasonList: () =>
      fetchMasterData("deleteTaskReasonList", () => globalMaster({ type: "DELETETASK" })),
    // Suggested members depend on board selection; always refresh when caller asks.
    getSuggestedMembersList: (params) =>
      fetchMasterData("suggestedMembersList", () => getSuggestedMembers(params), {
        force: true,
      }),
    getTaskPriority: () =>
      fetchMasterData("taskPriority", () => globalMaster({ type: "TASKPRIORITY" })),
    getWorkFlowType: () =>
      fetchMasterData("workFlowType", () => globalMaster({ type: "WORKFLOWTYPE" })),
    getTaskDueStatusList: () =>
      fetchMasterData("taskDueStatus", () => globalMaster({ type: "TASKDUESTATUS" })),
    getTaskAgeStatusList: () =>
      fetchMasterData("taskAgeStatusList", () => globalMaster({ type: "TASKAGESTATUS" })),
    //
    getCountryList: () => fetchMasterData("countryList", getCountry),
    getMarketRegionList: () => fetchMasterData("marketRegionList", getPrimaryMarket),
    getRegionList: () => fetchMasterData("regionList", getCustomerRegion),
    getCurrencyList: () => fetchMasterData("currencyList", getCurrency),
    getToolsList: () => fetchMasterData("toolsList", getProductTools),
    getLanguageList: () => fetchMasterData("languageList", getCustomerLanguage),
    getFontFamilyList: (options = {}) =>
      fetchMasterData("fontFamilyList", getFontFamily, options),
    addFontFamilyList: (params) => addFontFamily(params),
    getIndustriesList: () => fetchMasterData("industriesList", getIndustry),
    getPackageDetails: () => fetchMasterData("packageDetails", getPackageDetails),
    getDesignationList: () => fetchMasterData("designationList", getDesignation),
    getAllTeamList: () => fetchMasterData("allTeamList", getAllTeam),
    getAdUsersList: () => fetchMasterData("adUsersList", getAdUsers),
    getAllWorkSpaceList: () => fetchMasterData("allWorkspaceList", getAllWorkSpace),
    getBoardList: () => fetchMasterData("boardList", getAllBoards),
    getUserRoleList: () => fetchMasterData("userRole", getUserRole),
    getTicketAssigneeList: () =>
      fetchMasterData("ticketAssigneeList", getTicketCretedUserList),
    getWorkFlowList: (params, options = {}) =>
      fetchMasterData("workFlowList", () => getWorkFlowList(params), options),
    getDashboardFormulaData: (params) =>
      fetchMasterData("dashboardFormula", () => getDashboardFormula(params), params),
    getFreeFlowLabelList: () =>
      fetchMasterData("freeFlowLabelList", () => globalMaster({ type: "FREEFLOWLABLE" })),
    getKnowledgeBaseList: (options = {}) =>
      fetchMasterData("knowledgeBaseList", getKnowledgeBaseListApi, options),
    getIssueTypeList: (options = {}) =>
      fetchMasterData("issueTypeList", () => globalMaster({ type: "ISSUETYPE" }), options),
    getIssueSubtypeList: (options = {}) =>
      fetchMasterData(
        "issueSubtypeList",
        () => globalMaster({ type: "ISSUESUBTYPE" }),
        options,
      ),
    getIssueTagList: (options = {}) =>
      fetchMasterData(
        "issueTagList",
        () => globalMaster({ type: "ISSUETAGS" }),
        options,
      ),
    getAppPermissionList: () =>
      fetchMasterData("appPermissionList", () => getAppPermission()),
    getWorkspaceWithBoardsList: (options = {}) =>
      fetchMasterData("workspaceWithBoardsList", () => getWorkspaceList(), options),
  };
};

export default useGlobalMaster;

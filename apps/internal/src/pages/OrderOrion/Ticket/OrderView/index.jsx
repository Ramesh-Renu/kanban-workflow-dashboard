import React, {
  Fragment,
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import { Col, Row } from "react-bootstrap";
import Breadcrumb from "../../../../components/common/Breadcrumb";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import CompanyDetails from "./CompanyDetails";
import OrderInfoDetails from "./OrderInfoDetails";
import { chevronLeftDuo, pencilSimpleLine } from "../../../../assets/images";
import BrandingGuidelines from "./BrandingGuidelines";
import OrderDocuments from "./OrderDocuments";
import { t } from "i18next";
import TicketFormContainer from "../Form";
import { useToast } from "@orion/shared";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  getTicketDetails,
  getCommentDetails,
  getInstrumentDetails,
  addUpdateComment,
  deleteComment,
} from "../../../../services";
import { useGlobalMaster } from "@orion/shared";
import appConstants from "../../../../constant/common";
import TicketDetailsRightPanel from "./TicketDetailsRightPanel";
import ActivityHistory from "./Activity/ActivityHistory";
import { checkMandatoryFields, isOnlyWhitespaceHtml } from "../../../../utils/common";
import useAuth from "../../../../hooks/useAuth";
import NotFound from "pages/NotFound/NotFound";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import ToolsInfo from "./ToolsInfo";
import { initialActiveCommentsTabState } from "../../../../store/reducers/TicketReducers/activeCommentsTabReducer";
import CaretDoubleLeft from "./CaretDoubleLeft";
import {
  safeParseLocalStorage,
  DASHBOARD_ROUTES,
  getDashboardTablePath,
  getDashboardBreadcrumbHomePath,
  getDashboardHomeBreadcrumbLabel,
  prepareDashboardHomeNavigation,
} from "../../../../utils/dashboard";
import { getKanbanBreadcrumbLabel } from "../../../../utils/kanbanRoutes";
import { Link } from "react-router-dom";
import TicketDetailSkeleton from "components/common/skeletons/TicketDetailSkeleton";

const OrderViewUpdated = () => {
  const workspaceDashboard = safeParseLocalStorage("selectWorkspaceDashboard");
  const route = useLocation();
  const navId = useParams();
  const [{ data: auth }] = useAuth();
  const navigate = useNavigate();
  const ticketFetchedRef = useRef(false);
  const [canShow, setCanShow] = useState([]);
  const [enableProcessOrder, setEnableProcessOrder] = useState(false);
  const renderContainerRef = useRef(null);
  const { ticketDetails, activeCommentsTab, instrumentData, dispatch } =
    useGlobalContext();
  const preserveScroll = async (callback) => {
    const container = renderContainerRef.current;
    const scrollTop =  0;
    await callback();

    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = scrollTop;
      }
    });
  };
  //   VARIABLE DECLARATIONS
  const tabsName = [
    {
      name: t("order_view.company_details"),
      isActive: true,
      id: 1,
    },
    {
      name: t("order_view.order_info"),
      isActive: false,
      id: 2,
    },
    // {
    //   name: "Tools Information",
    //   isActive: false,
    //   id: 3,
    // },
    // {
    //   name: "Market Details",
    //   isActive: false,
    //   id: 4,
    // },
    {
      name: t("order_view.branding_guidelines"),
      isActive: false,
      id: 5,
    },
    // {
    //   name: "Templates",
    //   isActive: false,
    //   id: 6,
    // },
    {
      name: t("order_view.documents"),
      isActive: false,
      id: 7,
    },
  ];

  const [companyData, setCompanyData] = useState("");
  const [currentTab, setCurrentTab] = useState(tabsName[0]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTab, setShowTab] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const {
    orderType,
    orderCategory,
    packageList,
    labelList,
    suggestedMembersList,
    countryList,
    marketRegionList,
    regionList,
    toolsList,
    languageList,
    currencyList,
    fontFamilyList,
    industriesList,
    packageDetails,
    boardList,
    orderStatus,
    getOrderType,
    getOrderCategory,
    getPackageList,
    getLabelList,
    userRole,
    getCountryList,
    getMarketRegionList,
    getRegionList,
    getToolsList,
    getLanguageList,
    getFontFamilyList,
    getIndustriesList,
    getPackageDetails,
    getBoardList,
    getUserRoleList,
    getOrderStatus,
    getCurrencyList,
  } = useGlobalMaster();
  const [isLastActivity, setIsLastActivity] = useState([]);
  const [hasMoreActivityPages, setHasMoreActivityPages] = useState(false);
  const [noDataSpinnerShow, setNoDataSpinnerShow] = useState(false);
  const [isFetchingAPIData, setIsFetchingAPIData] = useState(false);
  const [refreshEditor, setRefreshEditor] = useState(false);
  const [activityPageOffset, setActivityPageOffset] = useState(appConstants.pageOffSet);
  const [ticketActivity, setTicketActivity] = useState([]);
  const [currentInfoTab, setCurrentInfoTab] = useState("Main info");
  const [isToolDetailView, setIsToolDetailView] = useState(false);
  const [backToListTick, setBackToListTick] = useState(0);
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};
  const [apiLoading, setApiLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const previousTab = useRef(null);
  const [unauthorizedError, setUnauthorizedError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [showMainComments, setShowMainComments] = useState(false);

  useEffect(() => {
    if (
      !packageDetails?.loading &&
      packageDetails?.data?.length === 0 &&
      companyData?.orderType?.includes(16)
    ) {
      getPackageDetails();
    }
    // setCurrentInfoTab(
    //   companyData?.workFlowType === 60 ? "Main info" : "Sub info",
    // );

    getShowMainComment();
  }, [companyData]);

  useEffect(() => {
    const orderTicketDetails = ticketDetails?.orderTicketDetails;

    if (
      orderTicketDetails &&
      !Array.isArray(orderTicketDetails) &&
      typeof orderTicketDetails === "object"
    ) {
      setCompanyData(orderTicketDetails);
      dispatch({
        type: "CLEAR_ACTIVE_COMMENTS_TAB",
      });
      if (orderTicketDetails?.workFlowType === 60 && currentInfoTab === "Main info") {
        refreshComment();
      }
      if (Number(navId?.orderId) === Number(orderTicketDetails?.orderId)) {
        if (orderTicketDetails?.companyInfo?.companyCode) {
          fetchInstrumentDetails({
            companyCode: orderTicketDetails?.companyInfo?.companyCode,
          });
        }
      } else {
        dispatch({ type: "SET_INSTRUMENT_DATA", payload: [] });
      }
    } else if (orderTicketDetails == null || Array.isArray(orderTicketDetails)) {
      // Restored/cleared ticket store (e.g. [] from Kanban) — refetch for deep link
      if (navId?.orderId && navId?.boardId && !ticketFetchedRef.current) {
        fetchTicketData(navId?.boardId, navId?.orderId);
      }
    }
  }, [ticketDetails?.orderTicketDetails]);

  const activeBoardCode = activeBoard?.[0]?.code;

  useEffect(() => {
    if (route?.state?.isEditable && !ticketFetchedRef.current) {
      setShowForm(true);
      setCurrentTab(tabsName[0]);
      const key = activeBoardCode + "CanShowField";
      const fields = appConstants[key]?.[tabsName[0].id]?.fields || [];
      setCanShow(fields);
      fetchTicketData(
        route?.state?.boardId || activeBoard?.[0]?.boardID,
        route?.state?.orderData.orderId,
      );
      navigate({ state: { ...route?.state, isEditable: false } });
    } else if (route?.state && !route?.state?.isEditable) {
      setShowForm(false);
    }
  }, [route.state?.orderData]);

  useEffect(() => {
    if (
      navId?.orderId &&
      !ticketFetchedRef.current &&
      route?.state?.isEditable === undefined
    ) {
      fetchTicketData(navId?.boardId, navId?.orderId);
    }
  }, [navId?.orderId]);

  const isFetchingInstrumentRef = useRef(false);
  const isFetchingActivityRef = useRef(false);

  const fetchInstrumentDetails = async (param) => {
    if (isFetchingInstrumentRef.current) return; // Prevent multiple calls
    try {
      isFetchingInstrumentRef.current = true; // Block further fetches
      const response = await getInstrumentDetails(param);
      if (response.status) {
        dispatch({ type: "SET_INSTRUMENT_DATA", payload: response.data });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to fetch Instrument.",
        variant: "danger",
      });
    } finally {
      isFetchingInstrumentRef.current = false;
    }
  };

  //storing company data from route  (temporary solution)
  const { showToast } = useToast();

  /** INITIAL CALLS */
  useEffect(() => {
    if (!regionList?.loading && regionList?.data?.length === 0) {
      getRegionList();
    }
    if (!languageList?.loading && languageList?.data?.length === 0) {
      getLanguageList();
    }
    if (!industriesList?.loading && industriesList?.data?.length === 0) {
      getIndustriesList();
    }
    if (!countryList?.loading && countryList?.data?.length === 0) {
      getCountryList();
    }
    if (!marketRegionList?.loading && marketRegionList?.data?.length === 0) {
      getMarketRegionList();
    }
    if (!fontFamilyList?.loading && fontFamilyList?.data?.length === 0) {
      getFontFamilyList();
    }
    if (!toolsList?.loading && toolsList?.data?.length === 0) {
      getToolsList();
    }
    if (!orderType?.loading && orderType?.data?.length === 0) {
      getOrderType();
    }
    if (!orderCategory?.loading && orderCategory?.data?.length === 0) {
      getOrderCategory();
    }
    if (!packageList?.loading && packageList?.data?.length === 0) {
      getPackageList();
    }
    if (!labelList?.loading && labelList?.data?.length === 0) {
      getLabelList();
    }
    if (!boardList?.loading && boardList?.data?.length === 0) {
      getBoardList();
    }
    if (!orderStatus?.loading && orderStatus?.data?.length === 0) {
      getOrderStatus();
    }
    if (!userRole?.loading && (userRole?.data?.length === 0 || userRole === undefined)) {
      getUserRoleList();
    }
    if (!currencyList?.loading && currencyList?.data?.length === 0) {
      getCurrencyList();
    }
  }, []);

  const fetchTicketData = async (boardId, ticketId, showLoader = true) => {
    if (ticketFetchedRef.current) return; // Prevent multiple calls

    if (showLoader) setApiLoading(true);
    ticketFetchedRef.current = true;
    try {
      const response = await getTicketDetails({
        ticketId: ticketId,
        boardID: boardId,
      });
      if (response?.status) {
        dispatch({ type: "SET_TICKET_DETAILS", payload: response.data });
      } else {
        showToast({
          message: response?.message || "Something went wrong.",
          variant: "danger",
        });
        setServerError(true);
      }
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || error.message || "Something went wrong.";

      if (status === 401) {
        setUnauthorizedError(true);
      } else if (error?.response) {
        // Server responded with error status
        showToast({ message, variant: "danger" });
        setServerError(true);
      } else if (error?.request) {
        // Request made but no response received
        showToast({ message: "No response from server.", variant: "danger" });
        setServerError(true);
      } else {
        // Something else (like setting up the request)
        showToast({ message: `Request failed: ${message}`, variant: "danger" });
        setServerError(true);
      }
    } finally {
      setApiLoading(false);
      ticketFetchedRef.current = false;
    }
  };

  const openEditForm = useCallback(async () => {
    const boardId = navId?.boardId || activeBoard?.[0]?.boardID;
    const ticketId = navId?.orderId || companyData?.orderId;
    if (!boardId || !ticketId) {
      setShowForm(true);
      return;
    }

    // Always reload ticket details before Edit so scraper sources and other
    // server-persisted fields are not stale from the initial page cache.
    try {
      const response = await getTicketDetails({
        ticketId,
        boardID: boardId,
      });
      if (response?.status && response.data) {
        dispatch({ type: "SET_TICKET_DETAILS", payload: response.data });
        const refreshed = response.data?.orderTicketDetails;
        if (refreshed && !Array.isArray(refreshed) && typeof refreshed === "object") {
          setCompanyData(refreshed);
        }
      }
    } catch {
      // Fall through and open Edit with whatever companyData we already have.
    } finally {
      setShowForm(true);
    }
  }, [activeBoard, companyData?.orderId, dispatch, navId?.boardId, navId?.orderId]);

  // handle tab button
  const handleTab = (item) => {
    if (item.id !== 4) {
      setCurrentTab(item);
      const activeBoardCode = activeBoard?.[0]?.code;
      const key = activeBoardCode + "CanShowField";
      const fields = appConstants[key]?.[item.id]?.fields || [];
      setCanShow(fields);
    }
  };

  const TAB_COMPONENTS = {
    "Company information": () => (
      <CompanyDetails
        companyData={companyData}
        sourceData={{
          customerLanguageList: languageList?.data,
          marketRegionList: marketRegionList?.data,
          regionList: regionList?.data,
          industryData: industriesList?.data,
          countryList: countryList?.data,
          instrumentList: instrumentData.data,
        }}
        activeBoardCode={activeBoardCode}
        setCanShow={canShow}
      />
    ),
    "Order Info": () => (
      <OrderInfoDetails
        companyData={companyData}
        sourceData={{
          plgList:
            packageDetails?.data?.find((item) => item.package_name === "PLG")?.tools ||
            [],
          customerLanguageList: languageList?.data,
          customerCurrencyList: currencyList?.data,
        }}
        setCanShow={canShow}
      />
    ),
    "Branding Guidelines": () => (
      <BrandingGuidelines companyData={companyData} setCanShow={canShow} />
    ),
    Documents: () => (
      <OrderDocuments
        companyData={companyData}
        onEdit={openEditForm}
        setCanShow={canShow}
      />
    ),
  };

  const SelectedTabComponent = useMemo(() => {
    return TAB_COMPONENTS[currentTab.name] || (() => <CompanyDetails />);
  }, [currentTab, companyData, instrumentData.data]);

  const RenderPills = () => {
    const activeBoardCode = activeBoard?.[0]?.code;
    const key = "canClickEditButton";
    return (
      <>
        {/* {currentTab.id !== 7 &&
          appConstants[key]?.includes(activeBoardCode) && (
            <EditHeader onEdit={openEditForm} />
          )} */}
        {/* {currentTab.id !== 7 &&
          appConstants[key]?.includes(activeBoardCode) && (
            <hr className="m-0 p-0" />
          )} */}
        {SelectedTabComponent()} {/* ✅ invoke as function */}
      </>
    );
  };

  const changeRoote = () => {
    setShowForm(false);
  };
  function getFields(formId, companyData) {
    const config = appConstants.orderCreationMandatoryField[formId];
    if (!config) return { fields: [], tab_restiction: [] };

    const fields =
      typeof config.fields === "function"
        ? config.fields(companyData)
        : config.fields || [];
    return {
      fields,
      tab_restiction: config.tab_restiction || [],
    };
  }

  useEffect(() => {
    const currentStep =
      activeBoardCode === "SA"
        ? getFields(currentTab.id, companyData)
        : appConstants.OBMandatoryField[currentTab.id];
    // Fallback if step is undefined
    if (!currentStep || !currentStep.fields) {
      setShowTab([]);
      return;
    }
    const allFieldsFilled = currentStep?.fields?.every((field) => {
      const value = companyData?.companyInfo?.[field];
      return (
        value !== null &&
        value !== undefined &&
        (typeof value === "string" ? value.trim().length > 0 : true) &&
        (!Array.isArray(value) || value.length > 0)
      );
    });

    setShowTab(allFieldsFilled ? [] : currentStep.tab_restiction); // ✅ true if all fields are filled
    const resultAll = checkMandatoryFields(
      companyData,
      appConstants.beforeProcessOrderSalesMandatoryField,
    );

    setEnableProcessOrder(resultAll);
  }, [companyData, currentTab]);

  //show hide right side panel
  const expandCollapse = () => {
    // let showTitle = collaps ? !collaps : true;
    setShowSidebar(!showSidebar);
  };

  /** COMMON BREADCRUMB */
  const BreadCrumbUI = ({ ...param }) => {
    return (
      <div className="p-0">
        <Breadcrumb
          customTitle={{
            name:
              companyData?.workFlowType === 60
                ? companyData?.companyInfo?.companyName
                : companyData?.companyInfo?.taskName,
            urlPath: "",
          }}
          previousTitle={getKanbanBreadcrumbLabel()}
          {...param}
        />
      </div>
    );
  };

  /** GET ACTIVITY CONTENT */
  const triggerActivityAPI = async (currentActivity, offset) => {
    if (
      isFetchingActivityRef.current ||
      (companyData?.workFlowType === 60 && currentInfoTab === "Sub info") ||
      companyData?.workFlowType === 61
    )
      return; // Prevent multiple calls
    try {
      setIsFetchingAPIData(true);
      isFetchingActivityRef.current = true; // Block further fetches
      const requestData = {
        orderId: navId?.orderId,
        pageoffset: offset,
        pagesize: appConstants?.pageSize,
        type: currentActivity.type,
      };
      const response = await getCommentDetails(requestData);
      setNoDataSpinnerShow(true);
      const pageItems = response?.data ?? [];
      setIsLastActivity(pageItems);
      setHasMoreActivityPages(pageItems.length >= appConstants.pageSize);
      setTicketActivity((prevActivity) => {
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
    setActivityPageOffset(appConstants.pageOffSet);
    if (ticketDetails && ticketDetails.orderTicketDetails && companyData) {
      const activityType =
        activityTypeRef.current ?? initialActiveCommentsTabState.activityType;
      await triggerActivityAPI(activityType, appConstants.pageOffSet);
    }
  };
  /** ADD/UPDATE COMMENT API */
  const handleAddUpdateComment = (res) => {
    const checkWhiteSpace = isOnlyWhitespaceHtml(res?.content);
    if (checkWhiteSpace) return;
    // var requestData = {};
    // if (res?.type == "add") {
    //   const { attachment, type, ...rest } = res;
    //   requestData = {
    //     files: attachment,
    //     body: {
    //       ...rest,
    //     },
    //   };
    // } else {
    const { attachment, type, ...rest } = res;

    const requestData = {
      files: attachment,
      body: {
        ...rest,
      },
    };
    // }
    // TRIGGER API CALL
    try {
      const response = addUpdateComment(requestData);
      response.then((res) => {
        if (res?.status) {
          dispatch(showToast({ message: res?.message, variant: "success" }));
          refreshComment();
          setRefreshEditor(false);
        } else {
          dispatch(showToast({ message: res?.message, variant: "danger" }));
          setRefreshEditor(true);
        }
      });
    } catch (error) {
      // Handle errors
      dispatch(showToast({ message: error, variant: "danger" }));
    }
  };

  /** ARCHIVE COMMENT API */
  const handleArchiveComment = (res) => {
    const requestData = {
      order_id: res?.ticket_id,
      comment_id: res?.comment_id,
    };
    try {
      const response = deleteComment(requestData);
      response.then((res) => {
        if (res?.status) {
          dispatch(showToast({ message: res?.data?.message, variant: "success" }));
          refreshComment();
        } else {
          dispatch(showToast({ message: res?.data?.message, variant: "danger" }));
          setRefreshEditor(true);
        }
      });
    } catch (error) {
      // Handle errors
      dispatch(showToast({ message: error, variant: "danger" }));
    }
  };

  /** USED TO HANDLE ACTIVITY FILTER TYPE */
  const handleChangeActivityType = (e) => {
    setActivityPageOffset(appConstants?.pageOffSet);
    setTicketActivity([]);
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
    setActivityPageOffset((prevOffset) => prevOffset + 1);
  };

  /** USED TO CALL API ON TAB CHANGE & ON SCROLL */
  useEffect(() => {
    if (ticketDetails && ticketDetails.orderTicketDetails && companyData) {
      const activityType =
        activeCommentsTab?.activityType ?? initialActiveCommentsTabState.activityType;
      triggerActivityAPI(activityType, activityPageOffset);
    }
  }, [activeCommentsTab?.activityType, activityPageOffset, companyData]);

  /** USED TO MAKE REFERENCE COPY & UPDATE ACTIVITY TYPE */
  const activityTypeRef = useRef(activeCommentsTab?.activityType);
  useEffect(() => {
    activityTypeRef.current = activeCommentsTab?.activityType;
  }, [activeCommentsTab?.activityType]);

  const getCompanyDataUpdated = (data) => {
    setCompanyData(data);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get("toolId") || params.get("activetab") === "subinfo";
    if (toolId) {
      setCurrentInfoTab("Sub info");
    } else {
      // setCurrentInfoTab(
      //   companyData?.workFlowType === 60 ? "Main info" : "Sub info",
      // );
    }
    // getShowMainComment();
  }, []);

  useEffect(() => {
    if (currentInfoTab !== "Sub info") {
      setIsToolDetailView(false);
    }
  }, [currentInfoTab]);

  useEffect(() => {
    if (previousTab.current === "Sub info" && currentInfoTab === "Main info") {
      const currentPath = window.location.href;

      let newPath = currentPath;
      if (newPath.includes("?toolId=")) {
        newPath = newPath.split("?toolId=")[0];
      } else if (newPath.includes("&toolId=")) {
        newPath = newPath.split("&toolId=")[0];
      }

      if (newPath.includes("?activetab=subinfo")) {
        newPath = newPath.split("?activetab=subinfo")[0];
      } else if (newPath.includes("&activetab=subinfo")) {
        newPath = newPath.split("&activetab=subinfo")[0];
      }
      // const newPath = currentPath.split("?toolId=")[0];
      window.history.replaceState(null, "", newPath);
      refreshComment();
    }
    previousTab.current = currentInfoTab;
  }, [currentInfoTab]);

  const getShowMainComment = () => {
    const setShow =
      currentInfoTab === "Sub info" &&
      !window?.location?.search.includes("taskId") &&
      companyData?.workFlowType !== 60;
    setShowMainComments(setShow);
  };

  useEffect(() => {
    if (companyData.workFlowType && companyData.workFlowType !== 60) {
      setCurrentInfoTab("Sub info");
      const setShow =
        !window?.location?.search.includes("taskId") && companyData?.workFlowType !== 60;
      setShowMainComments(setShow);
    }
  }, [companyData]);

  const BackToDashboardBreadcrumb = ({
    boardType,
    workSpaceId,
    pageSize,
    pageOffset,
    ticketId,
  }) => {
    const wsId = workSpaceId ?? safeParseLocalStorage("selectWorkspaceDashboard")?.id;
    const isOrderWorkspace = wsId === 1;
    // IOD (workspace 1 / process workflow 60) uses Tool; other workspaces use Task.
    const isIodWorkspace = Number(wsId) === 1 || companyData?.workFlowType === 60;
    const ticketCrumbLabel = isIodWorkspace ? "Tool" : "Task";
    const resolvedBoardType =
      boardType ??
      (safeParseLocalStorage("selectBoardDashboard")?.type === "board"
        ? "board"
        : safeParseLocalStorage("selectWorkspaceDashboard")?.type) ??
      "workspace";

    const tableDashboardPath = getDashboardTablePath(resolvedBoardType);

    // The sub-task popup should only reopen when we came from a sub-task details
    // page (URL carries toolId/taskId/activetab=subinfo). A plain ticket page
    // should just restore the table + pagination without reopening the popup.
    const search = window?.location?.search ?? "";
    const cameFromSubtask =
      search.includes("toolId=") ||
      search.includes("taskId=") ||
      search.includes("activetab=subinfo");

    const baseReturnState = {
      from: "dashboard",
      boardType: resolvedBoardType,
      workSpaceId: wsId,
      ticketId: ticketId != null ? Number(ticketId) : undefined,
      ticketName:
        companyData?.workFlowType === 60
          ? companyData?.companyInfo?.companyName
          : companyData?.companyInfo?.taskName,
      pageSize,
      pageOffset,
      restorePage: true,
    };

    // "Workspace" / "Board" crumbs: return to the dashboard and restore the table
    // + pagination WITHOUT reopening the sub-task popup.
    const returnStateNoPopup = { ...baseReturnState, openSubtaskPopup: false };
    // "Task" / "Order" crumb: return to the dashboard AND reopen the sub-task popup.
    const returnStateWithPopup = { ...baseReturnState, openSubtaskPopup: true };

    const homePath = getDashboardBreadcrumbHomePath(auth?.details);
    const homeLabel = getDashboardHomeBreadcrumbLabel(auth?.details);
    const isHomeWorkspace = homePath === DASHBOARD_ROUTES.workspace;

    // Always show Workspace between home and Board. When home is already the boards
    // list, Workspace uses isHome so single-board users aren't bounced back to Board.
    const workspaceCrumb = {
      label: "Workspace",
      to: DASHBOARD_ROUTES.workspace,
      state: returnStateNoPopup,
      ...(isHomeWorkspace ? { isHome: true } : {}),
    };

    const BACK_TO_DASHBOARD_BREADCRUMBS = {
      workspace: [
        { label: homeLabel, to: homePath, isHome: true },
        { label: "Workspace", to: DASHBOARD_ROUTES.workspace, state: returnStateNoPopup },
        ...(cameFromSubtask
          ? [
              {
                label: isOrderWorkspace ? "Order" : "Task",
                to: tableDashboardPath,
                state: returnStateWithPopup,
              },
            ]
          : [{ label: ticketCrumbLabel, to: null }]),
        ...(cameFromSubtask
          ? [{ label: isOrderWorkspace ? "Tools" : "Sub Task", to: null }]
          : []),
      ],
      task: [
        { label: homeLabel, to: homePath, isHome: true },
        workspaceCrumb,
        { label: "Board", to: DASHBOARD_ROUTES.board, state: returnStateNoPopup },
        ...(cameFromSubtask
          ? [
              {
                label: isOrderWorkspace ? "Order" : "Task",
                to: tableDashboardPath,
                state: returnStateWithPopup,
              },
            ]
          : [{ label: ticketCrumbLabel, to: null }]),
        ...(cameFromSubtask
          ? [{ label: isOrderWorkspace ? "Tools" : "Sub Task", to: null }]
          : []),
      ],
      board: [
        { label: homeLabel, to: homePath, isHome: true },
        workspaceCrumb,
        { label: "Board", to: DASHBOARD_ROUTES.board, state: returnStateNoPopup },
        ...(cameFromSubtask
          ? [
              {
                label: isOrderWorkspace ? "Order" : "Task",
                to: tableDashboardPath,
                state: returnStateWithPopup,
              },
            ]
          : [{ label: ticketCrumbLabel, to: null }]),
        ...(cameFromSubtask
          ? [{ label: isOrderWorkspace ? "Tools" : "Sub Task", to: null }]
          : []),
      ],
    };

    const crumbs =
      BACK_TO_DASHBOARD_BREADCRUMBS[resolvedBoardType] ??
      BACK_TO_DASHBOARD_BREADCRUMBS.workspace;

    return (
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            return (
              <li
                key={`${crumb.label}-${index}`}
                className={`breadcrumb-item${isLast ? " active" : ""}`}
                aria-current={isLast ? "page" : undefined}
                title={crumb.label}
              >
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    state={crumb.state}
                    onClick={() => {
                      if (crumb.isHome) {
                        prepareDashboardHomeNavigation(auth?.details);
                      }
                    }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  crumb.label
                )}
                {!isLast && (
                  <span className="breadcrumb-item-divider">
                    <span className="icon-chevron-thin-right"></span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  };

  return (
    <Fragment>
      {/* ORDER DETAIL VIEW */}

      {!showForm && apiLoading && <TicketDetailSkeleton />}
      {!showForm &&
        Object.keys(companyData)?.length > 0 &&
        companyData?.orderId !== null &&
        !apiLoading && (
          <div className="w-100 fluid mx-auto orderOverViewContainer p-0">
            {/* this column for  rendering order overView Components rendering */}
            {/* <div className="px-0 py-0 d-flex align-items-center justify-content-between breadCrumbContainer"> */}
            <div className="d-flex align-items-center pb-2 justify-content-between">
              {(route?.state == null || route?.state?.from !== "dashboard") &&
                !route?.pathname?.includes("/dashboard/") && (
                  <BreadCrumbUI isParamExist="true" />
                )}
              {(route?.state?.from === "dashboard" ||
                route?.pathname?.includes("/dashboard/")) && (
                <BackToDashboardBreadcrumb
                  boardType={route?.state?.boardType}
                  workSpaceId={route?.state?.workSpaceId}
                  pageSize={route?.state?.pageSize}
                  pageOffset={route?.state?.pageOffset}
                  ticketId={route?.state?.ticketId ?? navId?.orderId}
                />
              )}
            </div>
            <Row xs={12} className="d-flex mx-auto">
              <Col md={3} className="rightSidePanel p-0">
                <div className="bg-white p-0 m-0 h-100">
                  {/* {labelList && ( */}
                  <TicketDetailsRightPanel
                    companyData={companyData}
                    showHide={expandCollapse}
                    showSidebar={showSidebar}
                    boardList={boardList}
                    userRole={userRole}
                    onCompanyDataUpdate={getCompanyDataUpdated}
                    enableProcess={enableProcessOrder}
                    boardID={route?.state?.boardId || activeBoard?.[0]?.boardID}
                  />
                  {/* )} */}
                </div>
              </Col>
              <Col
                md={9}
                className="h-100 transition-flex renderContainer"
                ref={renderContainerRef}
              >
                {/* order overView Breadcrumb */}
                <div className="w-100 ps-2 mt-0 ">
                  <div className="infoViewTabs_container d-flex  flex-row justify-content-between align-items-center pb-3">
                    <div className="d-flex flex-row align-items-center gap-2 bg-white shadow-sm rounded p-2">
                      {companyData?.workFlowType === 60 && (
                        <button
                          className={`btn btn-0 px-4 border-0 py-2 ${
                            currentInfoTab === "Main info"
                              ? "activeButton"
                              : "inActiveButton"
                          }`}
                          onClick={() => {
                            setCurrentInfoTab("Main info");
                          }}
                        >
                          Main Info
                        </button>
                      )}
                      {(companyData?.isProcessOrder ||
                        companyData?.workFlowType !== 60) && (
                        <button
                          className={`btn btn-0 px-4 border-0 py-2 ${
                            currentInfoTab === "Sub info"
                              ? "activeButton"
                              : "inActiveButton"
                          }`}
                          onClick={() => {
                            if (currentInfoTab === "Sub info" && isToolDetailView) {
                              setBackToListTick((tick) => tick + 1);
                              return;
                            }
                            setCurrentInfoTab("Sub info");
                          }}
                        >
                          {currentInfoTab === "Sub info" && isToolDetailView
                            ? "Back to Progress"
                            : `Sub ${
                                companyData?.workFlowType !== 60
                                  ? "Task Progress"
                                  : "Info Progress"
                              }`}
                        </button>
                      )}
                    </div>
                    {currentTab.id !== 7 &&
                      appConstants["canClickEditButton"]?.includes(activeBoardCode) &&
                      currentInfoTab === "Main info" && (
                        <button
                          className="btn btn-0 primary_button px-3"
                          onClick={openEditForm}
                        >
                          Edit Details
                        </button>
                      )}
                  </div>

                  <Col className="bg-white rounded d-flex flex-row justify-content-between align-items-center w-100 flex-wrap tabsContainer">
                    {/* company Over View info container and pill section  */}
                    {/* {companyData && (
                    <OrderInfoView
                      companyData={companyData}
                      enableProcess={enableProcessOrder}
                      onCompanyDataUpdate={getCompanyDataUpdated}
                    />
                  )}
                  <hr className="w-100 p-0 m-0 " /> */}
                    {/* tabs and pills button section  */}
                    {currentInfoTab === "Main info" && (
                      <Row className="w-100 d-flex flex-row align-items-center gap-3 mx-auto tabsSection pt-2">
                        {tabsName.map((row, i) => {
                          return (
                            <div
                              className={`w-auto  buttonSections ${
                                row.id === currentTab.id ? "activeTab" : "inActiveTab"
                              } ${
                                row.name !== "Company Details" && showTab.includes(row.id)
                                  ? "disabled"
                                  : ""
                              }`}
                              key={i}
                              onClick={() => handleTab(row)}
                            >
                              {row.name}
                            </div>
                          );
                        })}
                      </Row>
                    )}
                  </Col>

                  {/* Pills rendering section from current tabs  */}
                  {/* {currentTab.id !== 7 ? ( */}
                  {currentInfoTab === "Main info" ? (
                    <Row
                      key={currentTab.name}
                      className={`${
                        currentTab.id == 7
                          ? "d-flex flex-row justify-content-between align-items-center w-100 flex-wrap m-0"
                          : "bg-white d-flex flex-row justify-content-between align-items-center w-100 flex-wrap mt-3 mx-auto"
                      }`}
                    >
                      <RenderPills companyData={companyData} />
                    </Row>
                  ) : (
                    <div className="tools_info_page-wrap">
                      <ToolsInfo
                        companyData={companyData}
                        refreshTicket={() => {
                          fetchTicketData(navId?.boardId, navId?.orderId, false);
                        }}
                        activeWorkSpace={activeWorkSpace}
                        activeCommentsTab={activeCommentsTab}
                        showMainComment={getShowMainComment}
                        preserveScroll={preserveScroll}
                        onToolDetailViewChange={setIsToolDetailView}
                        backToListTick={backToListTick}
                      />{" "}
                    </div>
                  )}
                  {ticketActivity &&
                    suggestedMembersList?.data &&
                    (currentInfoTab === "Main info" || showMainComments) &&
                    companyData?.workFlowType === 60 && ( // SHOW ACTIVITY TAB ONLY FOR ORDER TICKET (WORKFLOWTYPE 60) AND MAIN INFO TAB
                      <ActivityHistory
                        activeBoard={activeBoard}
                        activeWorkSpace={activeWorkSpace}
                        data={ticketActivity}
                        taggableMembers={suggestedMembersList?.data.filter(
                          (value, index, self) =>
                            index === self.findIndex((t) => t.regId === value.regId) &&
                            value.regId !== auth?.details?.regId,
                        )}
                        ticketParticipants={(() => {
                          const toolInfo = Array.isArray(
                            ticketDetails?.orderTicketDetails?.toolInfo,
                          )
                            ? ticketDetails.orderTicketDetails.toolInfo
                            : [];

                          const ticketAssignee = Array.isArray(
                            ticketDetails?.orderTicketDetails?.orderManagementPanel
                              ?.ticketAssignee,
                          )
                            ? ticketDetails.orderTicketDetails.orderManagementPanel
                                .ticketAssignee
                            : [];

                          const all = [
                            ...ticketAssignee.flatMap((item) => item.assigneeTo || []),
                            ...toolInfo.flatMap((t) =>
                              Array.isArray(t.activeStages)
                                ? t.activeStages.flatMap((s) => s.assignee || [])
                                : [],
                            ),
                          ];
                          const unique = all.filter(
                            (a, i) =>
                              a.regId &&
                              a.regId !== auth?.details?.regId &&
                              all.findIndex((t) => t.regId === a.regId) === i,
                          );
                          return unique;
                        })()}
                        ticketData={ticketDetails.orderTicketDetails}
                        activityType={activeCommentsTab?.activityType}
                        handleAddUpdateComment={(e) => handleAddUpdateComment(e)}
                        handleArchiveComment={(e) => handleArchiveComment(e)}
                        handleChangeActivityType={(e) => handleChangeActivityType(e)}
                        handleShowMoreActivity={handleShowMoreActivity}
                        isLastActivity={isLastActivity}
                        hasMoreActivityPages={hasMoreActivityPages}
                        setShowSpinner={noDataSpinnerShow}
                        isFetchingAPIData={isFetchingAPIData}
                        key={`ORDER-${navId?.orderId}-${activeCommentsTab?.activityType?.type ?? 0}`}
                        type="parentOrder"
                        refresRichTextEditor={refreshEditor}
                        stickyClassName={"customSticky"}
                        workFlowType="Order"
                      ></ActivityHistory>
                    )}
                </div>
              </Col>
            </Row>

            {/* this column for side bar as ticket Details */}
          </div>
        )}
      {/* {!showForm && apiLoading && <Spinner style={{ height: "100vh" }}></Spinner>} */}
      {!showForm && companyData?.orderId === null && !apiLoading && (
        <NotFound code="400" name={"Ticket"}></NotFound>
      )}
      {unauthorizedError && !apiLoading && <NotFound code="403" />}
      {serverError && !apiLoading && <NotFound code="500" />}
      {showForm && companyData?.orderId !== null && (
        <>
          <div className="w-100 fluid mx-auto orderOverViewContainer p-0">
            <div className="d-flex align-items-center p-0">
              <BreadCrumbUI
                addExtra={"Edit"}
                isParamExist={false}
                getLocation={changeRoote}
              />
            </div>
          </div>
          <TicketFormContainer companyData={companyData} tabName={currentTab} />
        </>
      )}
    </Fragment>
  );
};

export default OrderViewUpdated;

export const EditHeader = ({ onEdit }) => (
  <Row className="editHeader mx-auto align-items-center px-3 py-2">
    <Col className="text-end m-0 p-0">
      <button className="btn btn-0 border-0" onClick={onEdit}>
        <img src={pencilSimpleLine} alt="pencilSimpleLine" className="mx-2 mb-1" />
        Edit
      </button>
    </Col>
  </Row>
);

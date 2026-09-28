// @ts-nocheck
import Table from "components/common/Table";
import { classNames } from "@euroland/libs";
import { Fragment, useState, memo, useRef, useEffect, useCallback, useMemo } from "react";
import Pagination from "react-bootstrap/Pagination";
import { createColumnHelper } from "@tanstack/react-table";
import { useGlobalMaster, useToast, PopupModal } from "@orion/shared";
import { useTranslation } from "react-i18next";
import { renderOrderTypeNormal } from "utils/common";
import { useGlobalContext } from "store/context/GlobalProvider";
import variables from "@orion/shared/src/styles/variables-style.json";
import { EmptyOrder, gotoPageIcon } from "assets/images";
import { getTaskSubGridSummary } from "services";
import SubTaskList from "./SubTaskList";
import {
  customMonthDashboardDates,
  getBoardPerformanceHealthParams,
  DASHBOARD_ROUTES,
  getDashboardApiWorkspaceIds,
  getDashboardApiBoardIds,
} from "../../../utils/dashboard";
import { getProgressBarColor, parseProgressValue } from "utils/progress";
import dayjs from "dayjs";
import SideDrawer from "components/common/SideDrawer";
import { useNavigate, useLocation } from "react-router-dom";
import useOrderToolsModalSidenavOffset from "../utils/useOrderToolsModalSidenavOffset";
import { IOD_WORKSPACE_ID } from "utils/kanbanRoutes";

const OrderAndToolsTable = ({
  rows,
  onExport,
  filterApiCallParams,
  props = {},
  selectWorkspaceDashboard,
  taskType,
  boardType,
  authData,
  selectedRange,
  onSortChange,
  scrollLoading,
  orderToolsTablePage,
  orderToolsLastPage,
  orderToolsPageSize = 10,
  onOrderToolsPageChange,
  getSelectedDate,
  isTableExpanded,
  orderToolsPageOffset,
  onDashboardSoftRefresh,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const columnHelper = createColumnHelper();
  const { showToast } = useToast();
  const isIodWorkspace = Number(selectWorkspaceDashboard) === IOD_WORKSPACE_ID;
  const {
    orderType,
    labelList,
    taskPriority,
    freeFlowLabelList,
    countryList,
    stageList,
    regionList,
    marketRegionList,
    getOrderType,
    getCountryList,
    getLabelList,
    getStageList,
    getRegionList,
    getMarketRegionList,
  } = useGlobalMaster();
  const { t } = useTranslation();
  const { masterState, orderCountState } = useGlobalContext();
  const [showTicketModal, setShowTicketModal] = useState(false);
  useOrderToolsModalSidenavOffset(showTicketModal);
  const [taskSubGridSummary, setTaskSubGridSummary] = useState([]);
  const [sorting, setSorting] = useState();
  // isIodWorkspace
  //   ?
  // [{ id: "orderTypeDetails", desc: false }],
  // : [{ id: "ticketName", desc: false }],
  const orderItems = rows?.maintaskList || [];
  const pageCount = Number(rows?.totalPageCount) || 0;
  const currentPage = orderToolsTablePage ?? 1;
  const totalPages = pageCount > 0 ? pageCount : Math.max(1, orderToolsLastPage ?? 1);

  const MAX_VISIBLE_PAGES = 5;
  const INITIAL_VISIBLE_PAGES = 5;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];

    if (currentPage <= 1) {
      return Array.from(
        { length: Math.min(INITIAL_VISIBLE_PAGES, totalPages) },
        (_, i) => i + 1,
      );
    }

    if (totalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 2) {
      return Array.from({ length: MAX_VISIBLE_PAGES }, (_, i) => i + 1);
    }

    let end = Math.min(totalPages, currentPage + 2);
    let start = end - MAX_VISIBLE_PAGES + 1;
    if (start < 1) {
      start = 1;
      end = MAX_VISIBLE_PAGES;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);
  const [selectedCompanyData, setSelectedCompanyData] = useState();
  const [loading, setLoading] = useState(false);
  const contentRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const scrollbarRef = useRef(null);
  const visibleRef = useRef(null);
  const [showScroll, setShowScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScroll, setStartScroll] = useState(0);
  const [leftPosition, setLeftPosition] = useState(5);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1300,
  );

  useEffect(() => {
    if (
      !orderType?.loading &&
      (orderType?.data?.length === 0 || orderType === undefined)
    ) {
      getOrderType();
    }
    if (!countryList?.loading && countryList?.data?.length == 0) {
      getCountryList();
    }
    if (!labelList?.loading && labelList?.data?.length == 0) {
      getLabelList();
    }
    if (!stageList?.loading && stageList?.data?.length == 0) {
      getStageList();
    }
    if (!regionList?.loading && regionList?.data?.length == 0) {
      getRegionList();
    }
    if (!marketRegionList?.loading && marketRegionList?.data?.length === 0) {
      getMarketRegionList();
    } else return;
  }, []);

  const getTaskSubGridSummaryData = useCallback(
    async (params) => {
      setLoading(true);
      setTaskSubGridSummary([]);
      try {
        const parasData = {
          ...params,
          userTypeId: authData?.details?.user_type || null,
          regId: authData?.details?.regId || null,
          workspaceId: getDashboardApiWorkspaceIds(authData?.details, boardType),
          boardId: getDashboardApiBoardIds(authData?.details, {
            boardType,
            filterBoardId: params?.boardId,
            taskType,
          }),
          taskType: taskType || "mainTask",
        };
        const response = await getTaskSubGridSummary(parasData);
        if (response?.status) {
          setTaskSubGridSummary(response?.data?.taskSummaryItem || []);
        }
      } catch (error) {
        console.log(error);
        showToast({
          message: error?.message || "Failed to load task sub grid summary",
          variant: "danger",
        });
      } finally {
        setLoading(false);
      }
    },
    [authData, boardType, selectWorkspaceDashboard, taskType, showToast],
  );

  const handleShowComppanyData = useCallback(
    (companyData) => {
      setShowTicketModal(true);
      setSelectedCompanyData(companyData);
      const { toolsId, ...filterParamsWithoutToolsId } = filterApiCallParams || {};
      const orderToolsPerformanceTrendDateParams =
        selectedRange?.[0]?.value == "CUSTOM_RANGE"
          ? { ...customMonthDashboardDates(getSelectedDate).performancehealthsummary }
          : getBoardPerformanceHealthParams(selectedRange?.[0]?.value);
      const taskSubGridSummaryDateParams = {
        ...filterParamsWithoutToolsId,
        ...orderToolsPerformanceTrendDateParams,
        fromDate: orderToolsPerformanceTrendDateParams.toDate,
        toolId: toolsId,
        toDate: orderToolsPerformanceTrendDateParams.fromDate,
        pageOffset: 0,
        pageSize: 10,
        sortBy: null,
        sortOrder: null,
        ticketId: companyData?.ticketId ?? companyData?.orderId,
      };
      getTaskSubGridSummaryData(taskSubGridSummaryDateParams);
    },
    [filterApiCallParams, selectedRange, getSelectedDate, getTaskSubGridSummaryData],
  );

  const restoreHandledRef = useRef(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  // Capture the restore request once. Do not strip history state here — that
  // raced the table remount and dropped openSubtaskPopup before the list API ran.
  useEffect(() => {
    const state = location.state;
    if (!state?.restorePage) return;
    if (restoreHandledRef.current) return;

    restoreHandledRef.current = true;
    const parsedTicketId = Number(state.ticketId);
    setPendingRestore({
      ticketId: Number.isFinite(parsedTicketId) ? parsedTicketId : null,
      ticketName: state.ticketName || null,
      targetPage: (state.pageOffset ?? 0) + 1,
      openPopup: Boolean(state.openSubtaskPopup),
    });
  }, [location.state]);

  // Restore pagination, then reopen the subtask/tool list and fetch it.
  useEffect(() => {
    if (!pendingRestore) return;

    const { ticketId, ticketName, targetPage, openPopup } = pendingRestore;

    if (openPopup && Number.isFinite(ticketId)) {
      const matchedRow = orderItems.find(
        (item) =>
          Number(item.ticketId) === ticketId || Number(item.orderId) === ticketId,
      );
      setPendingRestore(null);
      handleShowComppanyData({
        ...(matchedRow || {}),
        ticketId,
        ticketName: matchedRow?.ticketName || ticketName,
      });
      if (currentPage !== targetPage) {
        onOrderToolsPageChange?.(targetPage);
      }
      return;
    }

    if (currentPage !== targetPage) {
      onOrderToolsPageChange?.(targetPage);
      return;
    }

    if (scrollLoading) return;

    setPendingRestore(null);
  }, [
    pendingRestore,
    currentPage,
    orderItems,
    scrollLoading,
    onOrderToolsPageChange,
    handleShowComppanyData,
  ]);

  const viewTaskInfo = (row, boardId) => {
    if (!boardId) return;
    const path = DASHBOARD_ROUTES.details(boardId, Number(row?.ticketId));
    navigate(path, {
      state: {
        from: "dashboard",
        boardType,
        workSpaceId: selectWorkspaceDashboard,
        ticketId: Number(row?.ticketId),
        pageSize: orderToolsPageSize,
        pageOffset: orderToolsPageOffset,
      },
    });
  };

  /** COLUMNS DEFINITION */
  const columns = [
    columnHelper.accessor("s_no", {
      header: () => <span className="order_orion_header">S.No</span>,
      cell: (info) => {
        const visibleRowIndex = info.table
          .getRowModel()
          .rows.findIndex((row) => row.id === info.row.id);
        const page = orderToolsTablePage ?? 1;
        const size = orderToolsPageSize ?? 10;
        const serialStart = (page - 1) * size;
        return (
          <div className="text-start">
            {visibleRowIndex > -1 ? serialStart + visibleRowIndex + 1 : "---"}
          </div>
        );
      },
    }),
    columnHelper.accessor("ticketName", {
      header: () => (
        <span className="order_orion_header">
          {" "}
          {isIodWorkspace ? "Order Name" : "Task Name"}
          {}
        </span>
      ),
      cell: (info) => {
        const row = info.row.original;
        const boardId = row?.boardIds?.[0] || null;
        return (
          <>
            <div
              tabIndex={0}
              className="truncate-2-lines cursor-pointer board-dashboard-widget__table-company-name-link"
              title={`View ${isIodWorkspace ? "Tools" : "Tasks"} List`}
              // "${info.getValue()}" -
              onClick={() => handleShowComppanyData(row)}
            >
              {info.getValue()}
            </div>
            {boardId && (
              <img
                src={gotoPageIcon}
                alt="gotoPageIcon"
                className="gotoPageIcon"
                onClick={() => viewTaskInfo(row, boardId || "")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    viewTaskInfo(row, boardId || "");
                  }
                }}
                title={`View ${isIodWorkspace ? "Order" : "Task"} Details`}
                tabIndex={0}
              />
            )}
          </>
        );
      },
    }),
    columnHelper.accessor("createdDate", {
      header: () => <span className="order_orion_header">{"Created Date"}</span>,

      cell: (info) => {
        const rowData = info.row.original;
        return (
          <span onClick={() => handleShowComppanyData(rowData)}>
            {info.getValue() ? dayjs(info.getValue()).format("MMM DD, YYYY") : "---"}
          </span>
        );
      },
    }),
    ...(isIodWorkspace
      ? [
          columnHelper.accessor("orderTypeDetails", {
            header: () => (
              <span className="order_orion_header">{t("order_orion_v2.order_type")}</span>
            ),
            cell: (info) => {
              const row = info.row.original.orderTypeDetails || [];
              return row.length > 0 ? (
                <div className="flex-row-wrap">
                  {row.map((type, i) => (
                    <div
                      className="d-flex align-items-center"
                      onClick={() => handleShowComppanyData(info.row.original)}
                      key={i}
                    >
                      {renderOrderTypeNormal(
                        [type.id],
                        orderType.data,
                        true,
                        true,
                        "",
                        true,
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                "---"
              );
            },
            canSort: true,
          }),
          columnHelper.accessor("regionDetails", {
            header: () => <span className="order_orion_header">Region</span>,
            cell: (info) => {
              const row = info.row.original;
              return (
                <span onClick={() => handleShowComppanyData(row)}>
                  {row?.regionDetails?.map((region) => region?.name).join(", ") || "---"}
                </span>
              );
            },
            canSort: true,
          }),
          columnHelper.accessor("countryDetails", {
            header: () => <span className="order_orion_header">Country</span>,
            cell: (info) => {
              const row = info.row.original.countryDetails || [];
              return (
                <span onClick={() => handleShowComppanyData(info.row.original)}>
                  {row?.map((country) => country?.name).join(", ") || "---"}
                </span>
              );
            },
            canSort: true,
          }),
          columnHelper.accessor("marketDetails", {
            header: () => <span className="order_orion_header">Market</span>,
            cell: (info) => {
              const row = info.row.original.marketDetails || [];
              return (
                <span onClick={() => handleShowComppanyData(info.row.original)}>
                  {row?.map((market) => market?.name).join(", ") || "---"}
                </span>
              );
            },
            canSort: true,
          }),
        ]
      : []),
    columnHelper.accessor(isIodWorkspace ? "labelDetails" : "priority", {
      header: () => (
        <span className="order_orion_header">
          {isIodWorkspace ? "Labels" : "Priority"}
        </span>
      ),
      cell: (info) => {
        const row = info.row.original.labelDetails || [];
        const matched =
          isIodWorkspace
            ? labelList?.data?.filter((item) =>
                row.map((label) => label.id).includes(item.status_id),
              )
            : taskPriority?.data?.filter((item) =>
                row.map((label) => label.id).includes(item.status_id),
              );
        return matched?.length > 0 ? (
          <div
            className="labelDetails__flex-cloumn"
            onClick={() => handleShowComppanyData(info.row.original)}
          >
            {matched.map((label, i) => (
              <div
                className="d-flex align-items-center gap-2 labelDetails__item"
                style={{
                  color: label.colour_code,
                }}
                key={i}
              >
                <span
                  style={{
                    display: "block",
                    background: label.colour_code,
                    fontWeight: "500",
                    width: "8px",
                    height: "8px",
                  }}
                >
                  &#160;
                </span>
                {label.name}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="labelDetails__flex-cloumn"
            onClick={() => handleShowComppanyData(info.row.original)}
          >
            {" "}
            ---
          </div>
        );
      },
    }),
    columnHelper.accessor("progressPercentage", {
      header: () => <span className="order_orion_header">Progress</span>,
      cell: (info) => {
        const row = info.row.original;
        const progressValue = parseProgressValue(row.progress ?? row.progressPercentage);

        if (progressValue === null) {
          return (
            <span
              className="order-tools-progress order-tools-progress--empty"
              onClick={() => handleShowComppanyData(row)}
            >
              ---
            </span>
          );
        }

        const isOngoing = row.stageDurationOngoing === true;
        const fillColor = isOngoing
          ? getProgressBarColor(progressValue)
          : "var(--color-icon-green)";
        const isComplete = progressValue >= 100;

        return (
          <div
            className="order-tools-progress"
            onClick={() => handleShowComppanyData(row)}
          >
            <div className="order-tools-progress__track">
              <div
                className="order-tools-progress__fill"
                style={{ width: `${progressValue}%`, backgroundColor: fillColor }}
              />
            </div>
            <span
              className={classNames("order-tools-progress__label", {
                "order-tools-progress__label--complete": isComplete && isOngoing,
              })}
              style={isComplete || !isOngoing ? { color: fillColor } : undefined}
            >
              {progressValue}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("toolOverallTime", {
      header: () => <span className="order_orion_header">Total Time</span>,
      cell: (info) => {
        const row = info.row.original;
        return (
          <span onClick={() => handleShowComppanyData(row)}>
            {row.toolOverallTime || "---"}
          </span>
        );
      },
    }),
    columnHelper.accessor("toolCount", {
      header: () => (
        <span className="header">
          {isIodWorkspace ? "Tool Count" : "Task Count"}
        </span>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <span onClick={() => handleShowComppanyData(row)}>
            {row.toolCount || "---"}
          </span>
        );
      },
    }),
    columnHelper.accessor("dueStatusDetails", {
      header: () => (
        <span className="order_orion_header">
          {isIodWorkspace ? "Order Status" : "Task Status"}
        </span>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="d-flex align-items-center justify-content-start position-relative">
            {/* {row?.overdueCount > 0 && (
              <span
                className="overdue-count"
                style={{ color: row?.dueStatusDetails[0]?.colorCode }}
              >
                {row?.overdueCount}
              </span>
            )} */}
            <span
              className="status-pill"
              onClick={() => handleShowComppanyData(row)}
              style={{
                backgroundColor: row?.dueStatusDetails[0]?.colorCode,
                color: row?.dueStatusDetails[0]?.colorCode ? "#ffffff" : "#000000",
                padding: "4px 8px",
                borderRadius: "50px",
                fontSize: "12px",
                fontWeight: "500",
                lineHeight: "12px",
                verticalAlign: "middle",
                textAlign: "center",
              }}
            >
              {" "}
              {row?.overdueCount > 0 ? row?.overdueCount : ""}
              &#160;
              {row?.dueStatusDetails[0]?.name || "---"}
            </span>
          </div>
        );
      },
    }),
  ];

  const scrollColumnMarkers = useMemo(
    () => [
      { key: "s_no", name: "S.No" },
      {
        key: "ticketName",
        name: isIodWorkspace ? "Order Name" : "Task Name",
      },
      { key: "createdDate", name: "Created Date" },
      ...(isIodWorkspace
        ? [
            { key: "orderType", name: "Order Type" },
            { key: "region", name: "Region" },
            { key: "country", name: "Country" },
            { key: "market", name: "Market" },
          ]
        : []),
      {
        key: "labels",
        name: isIodWorkspace ? "Labels" : "Priority",
      },
      {
        key: "progress",
        name: "Progress",
      },
      {
        key: "toolOverallTime",
        name: "Total Time",
      },
      {
        key: "toolCount",
        name: isIodWorkspace ? "Tool Count" : "Task Count",
      },
      {
        key: "status",
        name: isIodWorkspace ? "Order Status" : "Task Status",
      },
    ],
    [selectWorkspaceDashboard],
  );

  const columnCount = scrollColumnMarkers.length;

  const resolveScrollContainer = useCallback(() => {
    const tableContainer = contentRef.current?.querySelector(".table-container") ?? null;
    scrollContainerRef.current = tableContainer;
    return tableContainer;
  }, []);

  const updateThumbPosition = useCallback(() => {
    const container = scrollContainerRef.current ?? resolveScrollContainer();
    const scrollbar = scrollbarRef.current;
    const thumb = visibleRef.current;
    if (!container || !scrollbar || !thumb) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) {
      setLeftPosition(4);
      return;
    }
    const maxDrag = scrollbar.clientWidth - thumb.clientWidth;
    const scrollRatio = container.scrollLeft / maxScroll;
    const newLeft = scrollRatio * maxDrag;
    const correctedLeft = newLeft <= 0 ? 4 : newLeft >= maxDrag ? maxDrag - 4 : newLeft;
    setLeftPosition(correctedLeft);
  }, [resolveScrollContainer]);

  const calculateVisibleColumns = useCallback(() => {
    const container = resolveScrollContainer();
    if (!container) return;
    const needsHorizontalScroll = container.scrollWidth > container.clientWidth + 1;
    if (needsHorizontalScroll && columnCount > 2) {
      setShowScroll(true);
    } else if (windowWidth <= 600 && columnCount > 2) {
      setShowScroll(true);
    } else {
      setShowScroll(false);
    }
  }, [columnCount, windowWidth, resolveScrollContainer]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const container = scrollContainerRef.current ?? resolveScrollContainer();
    if (!container) return;
    setIsDragging(true);
    setStartX(e.clientX);
    setStartScroll(container.scrollLeft);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const container = scrollContainerRef.current;
      const scrollbar = scrollbarRef.current;
      const thumb = visibleRef.current;
      if (!container || !scrollbar || !thumb) return;

      const deltaX = e.clientX - startX;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const maxDrag = scrollbar.clientWidth - thumb.clientWidth;
      if (maxDrag <= 0 || maxScroll <= 0) return;

      const dragPercent = deltaX / maxDrag;
      let newScroll = startScroll + dragPercent * maxScroll;
      newScroll = Math.max(0, Math.min(newScroll, maxScroll));
      container.scrollLeft = newScroll;
      updateThumbPosition();
    },
    [isDragging, startScroll, startX, updateThumbPosition],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!orderItems?.length && scrollLoading) return undefined;

    const syncScrollUi = () => {
      resolveScrollContainer();
      calculateVisibleColumns();
      updateThumbPosition();
    };

    syncScrollUi();
    const frameId = requestAnimationFrame(syncScrollUi);
    const timeoutId = window.setTimeout(syncScrollUi, 150);

    window.addEventListener("resize", syncScrollUi);

    const container = scrollContainerRef.current;
    let resizeObserver;
    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncScrollUi);
      resizeObserver.observe(container);
      const tableEl = container.querySelector("table");
      if (tableEl) resizeObserver.observe(tableEl);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", syncScrollUi);
      resizeObserver?.disconnect();
    };
  }, [
    orderItems,
    scrollLoading,
    selectWorkspaceDashboard,
    calculateVisibleColumns,
    updateThumbPosition,
    resolveScrollContainer,
  ]);

  useEffect(() => {
    const container = scrollContainerRef.current ?? resolveScrollContainer();
    if (!container) return undefined;

    const onScroll = () => updateThumbPosition();
    container.addEventListener("scroll", onScroll, { passive: true });
    updateThumbPosition();
    return () => container.removeEventListener("scroll", onScroll);
  }, [
    updateThumbPosition,
    resolveScrollContainer,
    orderItems,
    showScroll,
    scrollLoading,
  ]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /** HANDLE SORTING CHANGE */
  const handleSortingChange = (columnId, newSorting) => {
    const newSortOrder =
      newSorting.find((sort) => sort.id === columnId)?.desc === true ? "desc" : "asc";

    if (typeof onSortChange === "function") {
      onSortChange(columnId, newSortOrder);
    } else if (typeof props?.onSortChange === "function") {
      props.onSortChange(columnId, newSortOrder);
    }

    let updatedSorting = sorting.map((sort) => {
      if (sort.id === columnId) {
        return {
          ...sort,
          desc: !sort.desc,
        };
      } else {
        return {
          ...sort,
          desc: false,
        };
      }
    });
    setSorting(updatedSorting);
  };

  /** GET STATUS BY ID */
  const getStatus = (status) => {
    const getStatusData = masterState?.orderStatus?.data?.filter((ids) =>
      status.includes(ids.status_id),
    );
    let color = variables.common["--color-primary-light-11"];
    let text = getStatusData[0]?.name || "---";
    if (getStatusData[0]?.code === "INP") {
      color = variables.common["--color-orange-lighter"];
      text = getStatusData[0].name;
    }
    if (getStatusData[0]?.code === "OP") {
      color = variables.common["--color-icon-purple"];
      text = getStatusData[0].name;
    }
    if (getStatusData[0]?.code === "COM") {
      color = variables.common["--color-icon-green"];
      text = getStatusData[0].name;
    }
    return {
      color: color || "---",
      text: text || "---",
    };
  };

  /** RENDER EMPTY CONTENT */
  const renderEmptyContent = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
      <img src={EmptyOrder} alt="Empty Order" />
      <h5 className="mt-4 text-center">{t("order_create.view_your_work_in_a_list")}</h5>
      <p className="text-center w-25">
        {t(
          "order_create.manage_and_sort_all_your_company_orders_work_into_a_single_list_that_can_be_easily_scanned_and_sorted_by_category",
        )}
      </p>
      <div className="orderSection mt-3">
        <button className="btn  activeButton" onClick={() => props?.setShowDrawer(true)}>
          {t("order_create.create_order_")}
        </button>
      </div>
    </div>
  );

  return (
    <Fragment>
      <section
        className={classNames("dashboard-page__order-tools", {
          "expanded-mode": isTableExpanded,
        })}
      >
        <div
          className="dashboard-page__order-tools-table-wrap"
          ref={contentRef}
        >
          {orderItems && (
            <Table
              columns={columns}
              columnData={orderItems}
              className={classNames("products__body-table dashboard_table")}
              // {...(isIodWorkspace && {
              //   onSortingChange: handleSortingChange,
              //   sorting: sorting,
              //   setSorting: setSorting,
              // })}
              tableName="Order_and_tools_table"
              noDataContent={
                scrollLoading ? null : orderItems !== undefined && // ✅ Do not render any "no data" content while loading
                  orderItems.length === 0 ? (
                  <div className="workspace-widget__no-data">
                    <p className="workspace-widget__no-data-found w-100">No Data Found</p>
                  </div>
                ) : null
              }
              loading={scrollLoading}
              skeletonRowCount={10}
              tableHeight="calc(100vh - 150px)"
            />
          )}
          {orderItems && orderItems.length > 0 && totalPages > 1 && (
            <div className="dashboard-page__order-tools-pagination d-flex justify-content-center pt-1">
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={scrollLoading || currentPage <= 1}
                  onClick={() =>
                    currentPage > 1 &&
                    typeof onOrderToolsPageChange === "function" &&
                    onOrderToolsPageChange(currentPage - 1)
                  }
                  className="pagination-prev"
                />
                {pageNumbers.map((p) => (
                  <Pagination.Item
                    key={p}
                    active={p === currentPage}
                    disabled={scrollLoading}
                    onClick={() =>
                      typeof onOrderToolsPageChange === "function" &&
                      onOrderToolsPageChange(p)
                    }
                  >
                    {p}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={scrollLoading || currentPage >= totalPages}
                  onClick={() =>
                    currentPage < totalPages &&
                    typeof onOrderToolsPageChange === "function" &&
                    onOrderToolsPageChange(currentPage + 1)
                  }
                  className="pagination-next"
                />
              </Pagination>
            </div>
          )}
          {showScroll && (
            <div
              className="dashboard-page__order-tools-scroll-content scroll-content"
              ref={scrollbarRef}
            >
              <div
                className="visibleStages"
                role="slider"
                aria-label="Scroll table horizontally"
                tabIndex={0}
                style={{
                  width: "22px",
                  left: `${leftPosition}px`,
                  transition: isDragging ? "none" : "left 0.1s ease-out",
                }}
                ref={visibleRef}
                onMouseDown={handleMouseDown}
              />
              {columnCount > 6 &&
                scrollColumnMarkers.slice(0, Math.ceil(columnCount / 2)).map((column) => (
                  <div
                    className="stage"
                    title={column.name}
                    key={`scroll-col-${column.key}`}
                  >
                    &#160;
                  </div>
                ))}
              {columnCount <= 6 &&
                scrollColumnMarkers.map((column) => (
                  <div
                    className="stage"
                    title={column.name}
                    key={`scroll-col-${column.key}`}
                  >
                    &#160;
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>
      <SideDrawer
        show={showTicketModal}
        onHide={() => {
          setShowTicketModal(!showTicketModal);
          setTaskSubGridSummary([]);
        }}
        title={selectedCompanyData?.ticketName}
        customWidth={windowWidth > 1350 ? "fit-content" : "90%"}
        className="sub_task_list_table__modal-body"
        showEdgeCloseButton
        headerClassName="sub_task_list_table__modal-header"
        subTitle={
          <>
            {selectedCompanyData?.regionDetails?.length > 0 && (
              <span className="sub_task_list_table__container">
                <strong>Region:</strong>{" "}
                <span className="region_name">
                  {selectedCompanyData?.regionDetails
                    ?.map((item) => item.name)
                    .join(", ")}
                </span>
              </span>
            )}
            {selectedCompanyData?.countryDetails?.length > 0 && (
              <span className="sub_task_list_table__container">
                <strong>Country:</strong>{" "}
                <span className="country_name">
                  {selectedCompanyData?.countryDetails
                    ?.map((item) => item.name)
                    .join(", ")}
                </span>
              </span>
            )}
            {selectedCompanyData?.marketDetails?.length > 0 && (
              <span className="sub_task_list_table__container">
                <strong>Market:</strong>{" "}
                <span className="market_name">
                  {selectedCompanyData?.marketDetails
                    ?.map((item) => item.name)
                    .join(", ")}
                </span>
              </span>
            )}
            {taskSubGridSummary?.subtaskGrid?.overallTime && (
              <span className="sub_task_list_table__overall-time">
                <strong>Overall Time:</strong>{" "}
                <span className="overall_time_value">
                  {taskSubGridSummary.subtaskGrid.overallTime}
                </span>
              </span>
            )}
          </>
        }
      >
        <SubTaskList
          companyData={taskSubGridSummary?.subtaskGrid || []}
          onClose={() => {
            setShowTicketModal(!showTicketModal);
            setTaskSubGridSummary([]);
          }}
          selectedCompanyData={selectedCompanyData}
          companyName={selectedCompanyData?.ticketName}
          orderId={selectedCompanyData?.ticketId}
          selectWorkspaceDashboard={selectWorkspaceDashboard}
          loading={loading}
          boardType={boardType}
          orderToolsPageOffset={orderToolsPageOffset}
          orderToolsPageSize={orderToolsPageSize}
          taskPriorityList={taskPriority?.data}
          freeFlowLabelList={freeFlowLabelList?.data}
          onDashboardSoftRefresh={onDashboardSoftRefresh}
        />
      </SideDrawer>
    </Fragment>
  );
};
export default memo(OrderAndToolsTable);

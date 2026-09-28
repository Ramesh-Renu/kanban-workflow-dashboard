import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import OrderOrionCreation from "./OrderOrionCreation";
import useAuth from "../../hooks/useAuth";
import { useToast } from "@orion/shared";
import appConstants from "../../constant/common";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  deleteOrderedTicket,
  getOrderedTicketList,
  getTicketStatusCount,
  deleteTaskList,
} from "../../services";
import OrderList from "./OrderList";
import { initialFilterState } from "store/reducers/filterValuesReducer";
import { OrderOrionFilterConfig } from "./FilterMasters";
import { normalizeFilters, normalizeFiltersOrders } from "../../utils/common";
import { useLocation, useNavigate } from "react-router-dom";
import { ActiveFilters, FilterPrimaryIcon } from "../../assets/images";
import OrdersFilterComponent from "./OrdersFilterComponent";

const OrderOrion = ({
  showDrawer,
  setShowDrawer,
  getScoreBoardData,
  getHandlePermissionChange,
  boardData
}) => {
  /* VARIABLE DECLARATIONS */
  const { showToast } = useToast();
  const filterContainerRef = useRef(null);
  const [{ data: auth }] = useAuth();
  const orderFilterConfig = OrderOrionFilterConfig({
    data: getHandlePermissionChange,
  });
  // const [showDrawer, setShowDrawer] = useState(false);
  const [counterResults, setCounterResults] = useState([]);
  const [scoreBoardData, setScoreBoardData] = useState([]);
  const [reloadTable, setReloadTable] = useState(false);
  const [getImageLeft, setImageLeft] = useState(0);
  const [getImageHeight, setImageHeight] = useState(50);
  const [sectionTwoHeight, setSectionTwoHeight] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState({
    // allUser: getHandlePermissionChange[0]?.id,
    // searchTxt: "",
    // orderStatus: [],
    // orderLabels: [],
    // orderCategory: [],
    // orderType: [],
    // assignee: [],
    // orderDateRange: [],
    // selectedDate: null,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { filterState, orderListState, dispatch } = useGlobalContext();
  // const [masterData, setMasterData] = useState({});
  const [filters, setFilters] = useState({});
  const [pageOffset, setPageOffset] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    sortBy: "orderDate",
    sortOrder: "desc",
  });
  const [deleteModal, setDeleteModal] = useState(false);
  const [filtersShow, setFiltersShow] = useState(false);

  const counterBoard = useMemo(
    () => [
      {
        id: 1,
        name: "Total Orders",
        matchingName: "totalOrders",
        iconPlacement: 0,
        iconColor: "#D27430",
        bgColor: "#FFF1E6",
      },
      {
        id: 2,
        name: "Yet to Process",
        matchingName: "yetToProcess",
        iconPlacement: 0,
        iconColor: "#082B45CC",
        bgColor: "#F9F6F6",
      },
      {
        id: 3,
        name: "Open",
        matchingName: "open",
        iconPlacement: 0,
        iconColor: "#6D36CC",
        bgColor: "#F1ECFB",
      },
      {
        id: 4,
        name: "In-Progress",
        matchingName: "inProgress",
        iconPlacement: 0,
        iconColor: "#F1B90E",
        bgColor: "#FFFBEE",
      },
      {
        id: 5,
        name: "Completed",
        matchingName: "completed",
        iconPlacement: 0,
        iconColor: "#13AA45",
        bgColor: "#F2FBFF",
      },
    ],
    []
  );
  const [hasMoreRecords, setHasMoreRecords] = useState(true);
  const [listView, setListView] = useState("orders");
  const totalFixedOffset = 400;
  const dynamicTableHeight = `calc(100vh - ${sectionTwoHeight + totalFixedOffset
    }px)`;
  const [filtersReset, setFiltersReset] = useState(false);
  const [filterCount, setFilterCount] = useState(null);
  const {
    isSuperAdmin = false,
    user_type_code,
    userRoleResponseDetail,
  } = auth?.details || {};
  // Ensure it's an array
  const rolesArray = Array.isArray(userRoleResponseDetail)
    ? userRoleResponseDetail.filter(Boolean) // remove null/undefined
    : [];
  // Flatten all boards safely
  const allBoards = rolesArray.flatMap((ws) =>
    Array.isArray(ws?.boards) ? ws.boards : []
  );

  // Find the board with code "SA"
  const userRole = allBoards.find((board) => board?.boardCode === "SA");
  function getEnabledFilterCount(filters) {
    const ignoredKeys = [
      "pageOffSet",
      "pageSize",
      "sortOrder",
      "sortBy",
      "boardId",
      "allUser",
    ];
    let count = 0;

    for (const key in filters) {
      if (ignoredKeys.includes(key)) continue;

      const value = filters[key];
      if (value == null) continue;

      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        if (key === "meAndUnassigned") {
          const unique = new Set(
            value.map((item) =>
              String(
                item?.regId ?? item?.displayName ?? item?.id ?? item ?? "",
              ).toLowerCase(),
            ),
          );
          count += unique.size;
        } else {
          count += value.length;
        }
      } else if (typeof value === "object") {
        const presetActive = [
          "thisWeek",
          "thisMonth",
          "overDue",
          "lastWeek",
          "lastMonth",
          "today",
          "tomorrow",
        ].some((flag) => value?.[flag] === true);
        const hasNonNullCustomDate = Boolean(
          value?.customDateRange &&
            (value.customDateRange.from || value.customDateRange.to),
        );
        if (presetActive || (value?.customDate === true && hasNonNullCustomDate)) {
          count++;
        }
      } else if (typeof value === "string" && value.trim() !== "") {
        count++;
      } else if (typeof value === "number" && value !== 0) {
        count++;
      }
    }

    return count === 0 ? null : count;
  }
  const saved = localStorage.getItem("order_filters");
  useEffect(() => {
    if (saved) {
      const parsed = JSON.parse(saved);
      const enabledCount = getEnabledFilterCount(parsed);
      setFilterCount(enabledCount);
    } else {
      const enabledCount = getEnabledFilterCount(selectedFilters);
      setFilterCount(enabledCount);
    }
  }, [filtersShow, selectedFilters, saved]);

  /** RELOAD TABLE ON FILTER CHANGE */
  useEffect(() => {
    if (reloadTable) {
      fetchOrderCount(getHandlePermissionChange[0].id);
      setFiltersReset(true);
      fetchOrderListing(
        {
          ...filterState?.filterValues,
          allUser: getHandlePermissionChange[0].id,
          pageSize: appConstants.pageSize,
          pageOffSet: 0,
          sortBy: "orderDate",
          sortOrder: "desc",
        },
        "reloadTable"
      );
      setReloadTable(false);
    }
  }, [reloadTable]);

  /** FETCH ORDER COUNT */
  const fetchOrderCount = async (param) => {
    try {
      const params = {
        allUser: param,
      };
      const response = await getTicketStatusCount(params);
      if (response?.status) {
        setCounterResults([response.data]);
      } else {
        showToast({ message: response.data.message, variant: "danger" });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
    }
  };

  /** FETCH ORDER LISTING */
  const fetchOrderListing = async (params, state) => {
    const updatedFilters = normalizeFiltersOrders(params, params.selectedDate);
    const { pageOffSet = 0 } = updatedFilters;
    if (pageOffSet > 0 && !hasMoreRecords) return;
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await getOrderedTicketList(updatedFilters);
      localStorage.setItem("order_filters", JSON.stringify(params));
      setSelectedFilters(params);
      if (response?.status) {
        const fetchedItems = response.data?.orderItems || [];
        const fetchedDeleted = response.data?.deleteorderListing || [];

        if (
          pageOffSet > 0 &&
          fetchedItems.length === 0 &&
          fetchedDeleted.length === 0
        ) {
          setHasMoreRecords(false);
          return;
        }
        let payloadToDispatch = response.data;

        // ✅ Merge with existing only if pageOffSet > 0
        if (pageOffSet > 0) {
          const existingDeleted = orderListState?.deletedOrderList || [];
          const deletedIds = new Set(
            existingDeleted.map((item) => item?.orderId).filter((id) => id != null),
          );
          payloadToDispatch = {
            ...response.data,
            orderItems: [...(orderListState?.orderList || []), ...fetchedItems],
            deleteorderListing: [
              ...existingDeleted,
              ...fetchedDeleted.filter(
                (item) => item?.orderId == null || !deletedIds.has(item.orderId),
              ),
            ],
          };
        }
        dispatch({
          type: "SET_ORDER_DATA",
          payload: payloadToDispatch,
        });
      } else {
        showToast({ message: response.data.message, variant: "danger" });
        dispatch({
          type: "SET_ERROR",
          payload: response.data.message,
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
      dispatch({ type: "SET_LOADING", payload: false });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  /** HANDLE DELETE ORDER */
  const handleDeleteOrder = async (param) => {
    setDeleteModal(false);
    try {
      // const response = await deleteOrderedTicket({
      //   ticket_id: param,
      // });
      const response = await deleteTaskList({
        ticket_id: param,
        tool_ticket_id: null,
      });
      if (response?.status || response?.data?.status) {
        showToast({
          message: response?.data?.message || "Delete Order/Task completed successfully",
          variant: "success",
        });
        setReloadTable(true);
      } else {
        showToast({
          message: response.data.message,
          variant: "danger",
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
    }
  };

  /** HANDLE FILTER CHANGE */
  const handleFilterChange = (newFilters) => {
    const mergedFilters = {
      ...filterState?.filterValues,
      pageOffSet: 0,
      ...newFilters,
      sortBy: "orderDate",
      sortOrder: "desc",
    };
    setPageOffset(0);
    // setFilters(mergedFilters);
    setSortConfig({
      // sortBy: mergedFilters.sortBy,
      // sortOrder: mergedFilters.sortOrder,
      sortBy: "orderDate",
      sortOrder: "desc",
    });
    setHasMoreRecords(true);
    dispatch({ type: "SET_FILTER", payload: mergedFilters });
    fetchOrderListing(
      {
        ...mergedFilters,
        pageSize: appConstants.pageSize,
        pageOffSet: 0,
      },
      "handleFilterChange"
    );
  };

  /** HANDLE SCROLL END */
  const handleScrollEnd = () => {
    const nextOffset = filterState.filterValues?.pageOffSet + 1;
    setPageOffset(nextOffset);
    const updatedFilters = {
      ...filterState.filterValues,
      pageOffSet: nextOffset,
    };
    // setHasMoreRecords(true);
    dispatch({
      type: "SET_FILTER",
      payload: updatedFilters,
    });
    setFilters(filters);
    fetchOrderListing(
      {
        ...updatedFilters,
        pageSize: appConstants.pageSize,
        pageOffSet: nextOffset,
        ...sortConfig,
      },
      "handleScrollEnd"
    );
  };

  /** HANDLE TABLE SORT CHANGE */
  const handleSortChange = (columnId, order) => {
    const sortData = { sortBy: columnId, sortOrder: order };
    setSortConfig(sortData);
    setHasMoreRecords(true);
    const updatedFilters = {
      ...filterState.filterValues,
      sortBy: columnId,
      sortOrder: order,
      pageOffSet: 0, // reset to first page on sort change
    };
    const mergedFilters = { ...filterState?.filterValues, ...updatedFilters };
    dispatch({
      type: "SET_FILTER",
      payload: mergedFilters,
    });
    fetchOrderListing(
      {
        ...mergedFilters,
        pageSize: appConstants.pageSize,
        pageOffSet: 0,
      },
      "handleSortChange"
    );
  };

  /** GET BOARD COUNT */
  const getBoardCount = useCallback(() => {
    const updatedCounterBoard = counterBoard?.map((item) => ({
      ...item,
      value: counterResults[0]?.[item?.matchingName] ?? 0,
    }));
    setScoreBoardData(updatedCounterBoard);
    getScoreBoardData(updatedCounterBoard);
  }, [counterBoard, counterResults]);

  /** EFFECTS TO UPDATE SCORE BOARD */
  useEffect(() => {
    if (counterResults?.length > 0) getBoardCount();
  }, [counterResults]);

  /** EFFECT TO SET SECTION TWO HEIGHT */
  useEffect(() => {
    if (filterContainerRef.current) {
      const height = filterContainerRef.current.offsetHeight;
      setSectionTwoHeight(height);
    }
  }, [selectedFilters]);

  /** EFFECT TO SET IMAGE LEFT AND HEIGHT */
  useEffect(() => {
    const getWith = 984 / 20;
    setImageLeft(getWith);
    setImageHeight(50);
  }, []);

  useEffect(() => {
    const checked =
      getHandlePermissionChange?.length > 0
        ? getHandlePermissionChange[0]?.id
        : undefined;
    if (checked === undefined) return;
    if (!isSuperAdmin && user_type_code !== "ADM") {
      handlePermissionChange(checked);
    } else {
      handlePermissionChange(1);
    }
  }, [getHandlePermissionChange]);

  const handlePermissionChange = (checked) => {
    const saved = localStorage.getItem("order_filters");
    if (saved) {
      const parsed = JSON.parse(saved);
      const { ...filters } = parsed;
      const setFilter = {
        ...filters,
        allUser: checked,
        assignee: checked === 1 ? filters.assignee : [],
        pageOffSet: 0,
        sortBy: "orderDate",
        sortOrder: "desc",
      };
      // const updatedFilters = normalizeFiltersOrders(setFilter, selectedDate);
      setSelectedFilters(setFilter);
      dispatch({ type: "SET_FILTER", payload: setFilter });
      navigate(location.pathname, { replace: true, state: null });
      fetchOrderListing(setFilter, "handlePermissionChange");
    } else {
      const defaultFilters = initialFilterState.filterValues;
      const setFilter = {
        ...defaultFilters,
        allUser: checked,
        pageOffSet: 0,
        assignee: checked === 1 ? selectedFilters.assignee : [],
      };
      dispatch({ type: "SET_FILTER", payload: setFilter });
      setSelectedFilters(setFilter);
      fetchOrderListing(setFilter, "handlePermissionChange");
    }

    fetchOrderCount(checked);
  };
  const handleFilter = () => {
    setFiltersShow(!filtersShow);
  };
  const isDeletedView = listView === "deleted";
  const displayedOrders = isDeletedView
    ? orderListState?.deletedOrderList || []
    : orderListState?.orderList || [];
  const displayedCount = isDeletedView
    ? displayedOrders.length
    : orderListState?.totalCount || 0;

  return (
    <div className="d-flex flex-row flex-wrap align-items-center justify-content-between pb-2 orderOrionDashboard bg-gray">
      {/* greetings container  */}
      <div className="orders-filters">
        <div className="flex-col-1">
          <h4 className="order-list-table-head">Order list overview</h4>
          <div className="order-list-view-tabs" role="tablist" aria-label="Order list view">
            <button
              type="button"
              role="tab"
              aria-selected={!isDeletedView}
              className={`order-list-view-tab ${!isDeletedView ? "active" : ""}`}
              onClick={() => setListView("orders")}
            >
              Active Order
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isDeletedView}
              className={`order-list-view-tab ${isDeletedView ? "active" : ""}`}
              onClick={() => setListView("deleted")}
            >
              Deleted Order
            </button>
          </div>
        </div>
        <div className="flex-col-2">
          <button
            className={`filterButton ${filtersShow ? "activeButton" : "inActiveButton"
              } btn btn-0 position-relative`}
            onClick={() => handleFilter()}
          >
            <img
              src={filtersShow ? ActiveFilters : FilterPrimaryIcon}
              alt="FilterPrimaryIcon"
              className={filtersShow ? "ActiveFilters" : "FilterPrimaryIcon"}
            />
            Filter
            {filterCount && <span>({filterCount})</span>}
          </button>
        </div>
      </div>

      {filtersShow && (
        <div
          className="kanaban-body-content sectionTwo"
          ref={filterContainerRef}
        >
          <div className="bg-white rounded w-100 filterComponent">

            <OrdersFilterComponent
              getSelectedFilters={handleFilterChange}
              initialSelectedFilter={selectedFilters}
              filterFrom="kanban"
              filterConfig={orderFilterConfig}
              ticketsCount={orderListState?.totalCount}
              apiLoading={
                orderListState?.loading ||
                (orderListState?.totalCount === 0 && !orderListState?.is_ticket)
              }
              allUser={getHandlePermissionChange[0].id}
            />
          </div>
        </div>
      )}
      <div className="w-100 tableSection position-relative">
        {orderListState && (
          <OrderList
            orders={displayedOrders}
            totalCount={displayedCount}
            isTicket={orderListState.is_ticket}
            isDeletedView={isDeletedView}
            onScrollEnd={handleScrollEnd}
            onSortChange={handleSortChange}
            loading={orderListState?.loading}
            tableHeight={dynamicTableHeight}
            setShowDrawer={setShowDrawer}
            deleteModal={deleteModal}
            setDeleteModal={setDeleteModal}
            handleDeleteOrder={handleDeleteOrder}
            selectedFilters={selectedFilters}
            boardData={boardData}
          />
        )}
      </div>
      <p className="footer-text">Showing the most recent entries</p>
      {showDrawer && (
        <OrderOrionCreation
          showDrawer={showDrawer}
          setShowDrawer={setShowDrawer}
          orderCreated={() => {
            setReloadTable(true);
          }}
        />
      )}
    </div>
  );
};

export default OrderOrion;

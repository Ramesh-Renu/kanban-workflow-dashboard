import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import KanbanBoard from "../../components/kanban/KanbanBoard";
import { useGlobalContext } from "store/context/GlobalProvider";
import WorkAllocation from "../../components/common/WorkAllocation";
import { initialWorkSpaceFilterState } from "store/reducers/workspaceFilterReducer";
import {
  useKanbanFiltersConfig,
  useTaskFiltersConfig,
} from "../OrderOrion/FilterMasters";
import { useToast } from "@orion/shared";
import {
  getBoardMainTaskList,
  getBoardSubTaskList,
  getBoardTaskList,
} from "../../services";
import KanbanBoardSkeleton from "../../components/common/skeletons/KanbanBoardSkeleton";
import useAuth from "../../hooks/useAuth";
import {
  scrollAPIMergeKanbanStages,
  normalizeFilters,
  moveAPIMergeKanbanStages,
  normalizeTaskFilters,
  isUnassignedAssigneeFilterItem,
} from "../../utils/common";
import { useLocation, useNavigate } from "react-router-dom";
import KanbanFilterComponent from "../OrderOrion/KanbanFilterComponent";
import { leftArrowIcon } from "../../assets/images";
import { isAdminKanbanMyWorkspaceMode } from "utils/dashboard";
import {
  readKanbanFiltersFromStorage,
  writeKanbanFiltersToStorage,
  sanitizeKanbanFiltersForCount,
} from "../../utils/kanbanRoutes";

const KanbanHome = ({
  filtersShow,
  activeTaskCodes,
  board,
  onError,
  refreshKey,
  resetRefreshKey,
  disableDefaultAssignee = false,
  onBoardDataChanged,
}) => {
  const { taskDetails, dispatch } = useGlobalContext();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mainTasks, setMainTasks] = useState();
  const [boardStages, setBoardStages] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiCall, setApiCall] = useState(false);
  const [scrollingApiLoading, setScrollingApiLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [ticketsCount, setTicketsCount] = useState(null);
  const ticketFetchedRef = useRef(false);
  const skeletonLayoutRef = useRef(null);
  const kanbanFilterConfig = useKanbanFiltersConfig({
    activeTaskCodes,
    boardStages,
    board,
  });
  const taskFilterConfig = useTaskFiltersConfig({
    activeTaskCodes,
    boardStages,
    board,
  });
  const [showDrawer, setShowDrawer] = useState(false);
  const [{ data: auth }] = useAuth();
  const { isSuperAdmin, user_type_code } = auth?.details || {};
  const isAdmin = user_type_code === "ADM";
  const isKanbanMyWorkspaceAdmin = isAdminKanbanMyWorkspaceMode(auth?.details);
  // USR + Admin My Workspace: default assignee to logged-in user on first call.
  // Admin All Workspace / SuperAdmin: unchanged (no Me default).
  // disableDefaultAssignee: caller wants every ticket, not just the logged-in user's own
  // (e.g. the dashboard's Kanban preview, which mirrors the dashboard's own unfiltered scope).
  const shouldDefaultMeAssignee =
    !disableDefaultAssignee &&
    Boolean(
      auth?.details?.regId &&
        ((!isAdmin && !isSuperAdmin) || isKanbanMyWorkspaceAdmin),
    );
  const allBoards =
    auth?.details?.userRoleResponseDetail?.flatMap((ws) => ws?.boards || []) || [];
  const userRole = allBoards.find((a) => a?.boardCode === board[0]?.code);
  const apiCallRef = useRef(apiCall);
  const isOBMainTask = activeTaskCodes === "MainTask" && board?.[0]?.code === "OB";
  const isNotOBMainTask = activeTaskCodes === "MainTask" && board?.[0]?.code !== "OB";
  const isSubTask = activeTaskCodes === "SubTask";
  const isTask = activeTaskCodes === "Task";
  const [isFetching, setIsFetching] = useState(false);
  // const { socket } = useSocket();
  // function getEnabledFilterCount(filters) {
  const getEnabledFilterCount = useCallback((filters) => {
    const ignoredKeys = [
      "pageOffSet",
      "pageSize",
      "sortOrder",
      "sortBy",
      "boardId",
      "assignee",
      "stageScroll",
    ];
    let count = 0;

    for (const key in filters) {
      if (ignoredKeys.includes(key)) continue;

      const value = filters[key];
      if (value == null) continue;

      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        if (key === "meAndUnassigned") {
          // Unique people / Me / Unassigned — avoid double-counting duplicates.
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
        // Date-range objects: count only real presets or a filled custom range.
        // customDate:true with empty from/to (dashboard pollution) must not count.
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
  }, []);
  const manualRefreshRef = useRef(false);

  const getMemberDefaultAssigneeFilter = () => {
    // Match FilterMasters: anyone who sees "Me" / login user gets them selected by default
    if (!shouldDefaultMeAssignee) return [];
    if (!(isOBMainTask || isSubTask || isNotOBMainTask || isTask)) return [];
    // Admin My Workspace: show login user name in assignee filter (first call)
    if (isKanbanMyWorkspaceAdmin) {
      return [
        {
          displayName:
            auth?.details?.displayName ||
            auth?.details?.userName ||
            "Me",
          regId: auth.details.regId,
        },
      ];
    }
    return [
      {
        displayName: "Me",
        regId: auth.details.regId,
      },
    ];
  };

  const migrateAssigneeFilterSelection = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) => {
      if (
        item?.displayName === "Me & Unassigned" ||
        item?.displayName === "Assigned to Me"
      ) {
        return { ...item, displayName: "Me" };
      }
      return item;
    });

  const hasMeAssigneeSelected = (items = []) =>
    (Array.isArray(items) ? items : []).some(
      (item) =>
        item?.displayName === "Me" ||
        String(item?.regId || "").toLowerCase() ===
          String(auth?.details?.regId || "").toLowerCase(),
    );

  const resolveInitialMeAndUnassigned = (savedItems) => {
    // disableDefaultAssignee / no Me default: never keep Me in meAndUnassigned,
    // or normalizeFilters maps it to API assignee: [regId]. Explicit "Unassigned"
    // selections (e.g. the dashboard's Unassigned toggle) are unrelated and must survive.
    if (!shouldDefaultMeAssignee) {
      return (Array.isArray(savedItems) ? savedItems : []).filter(
        isUnassignedAssigneeFilterItem,
      );
    }

    const migrated = migrateAssigneeFilterSelection(savedItems);
    if (hasMeAssigneeSelected(migrated)) {
      return migrated;
    }
    return getMemberDefaultAssigneeFilter();
  };

  const activeBoardId = board?.[0]?.boardID ?? board?.[0]?.boardId ?? null;
  const isFetchingRef = useRef(false);
  // Dashboard embed must not overwrite /orders workspace_filters (breaks Filters count).
  const isDashboardEmbed = Boolean(disableDefaultAssignee);

  useEffect(() => {
    apiCallRef.current = apiCall; // keep ref updated
  }, [apiCall]);

  useEffect(() => {
    if (manualRefreshRef.current) {
      manualRefreshRef.current = false; // reset flag
      return; // skip this run
    }
    if (
      !location?.state?.selectedFilters ||
      Object.keys(location?.state?.selectedFilters).length === 0
    ) {
      return;
    } else {
      const selected = location?.state?.selectedFilters || {};
      fetchTicketData(
        {
          ...selected,
          pageOffSet: 0,
          pageSize: 10,
          meAndUnassigned: resolveInitialMeAndUnassigned(selected?.meAndUnassigned),
          stageScroll: null,
        },
        true,
      );
      // ✅ clear state after Ticket View
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, selectedFilters: {} },
      });
    }
  }, [location.state]);

  useEffect(() => {
    dispatch({ type: "SET_TICKET_DETAILS", payload: [] });
  }, []);

  // Dashboard embed: parent writes dashboard_workspace_filters then bumps refreshKey.
  useEffect(() => {
    if (!refreshKey) return;

    const parsed = readKanbanFiltersFromStorage(true);
    if (parsed) {
      manualRefreshRef.current = true;
      fetchTicketData(
        {
          ...parsed,
          pageOffSet: 0,
          pageSize: 10,
          meAndUnassigned: resolveInitialMeAndUnassigned(parsed?.meAndUnassigned),
          stageScroll: null,
        },
        true,
      );
    }
    resetRefreshKey();
  }, [refreshKey]);

  // Single bootstrap for /orders|/task kanban — skip when dashboard controls fetch via refreshKey.
  useEffect(() => {
    if (disableDefaultAssignee) return;
    if (manualRefreshRef.current) {
      manualRefreshRef.current = false;
      return;
    }
    if (!activeTaskCodes || activeTaskCodes.length === 0) return;
    if (!auth?.details?.regId && shouldDefaultMeAssignee) return;
    if (!activeBoardId) return;

    const parsedRaw = readKanbanFiltersFromStorage(false);
    const parsed = parsedRaw ? sanitizeKanbanFiltersForCount(parsedRaw) : null;
    let restoredFilters =
      activeTaskCodes === "Task"
        ? initialWorkSpaceFilterState.taskFilterValues
        : initialWorkSpaceFilterState.filterValues;

    dispatch({ type: "SET_MAIN_TASK_LIST", payload: [] });
    dispatch({ type: "SET_SUB_TASK_LIST", payload: [] });

    if (parsed) {
      // Persist sanitized filters so Filters (N) stays correct after dashboard visits.
      writeKanbanFiltersToStorage(parsed, false);
      fetchTicketData(
        {
          ...parsed,
          pageOffSet: 0,
          pageSize: 10,
          meAndUnassigned: resolveInitialMeAndUnassigned(parsed?.meAndUnassigned),
          stageScroll: null,
        },
        true,
      );
    } else {
      fetchTicketData(
        {
          ...restoredFilters,
          pageOffSet: 0,
          pageSize: 10,
          meAndUnassigned: getMemberDefaultAssigneeFilter(),
          stageScroll: null,
        },
        true,
      );
    }
  }, [
    disableDefaultAssignee,
    activeBoardId,
    activeTaskCodes,
    shouldDefaultMeAssignee,
    auth?.details?.regId,
  ]);

  const fetchTicketData = async (
    filterValues,
    hardRefresh = true,
    labelId,
    isScroll,
    apiType = "initial",
  ) => {
    if (isFetchingRef.current || !filterValues) return;
    // Dashboard Kanban: clear Me default (meAndUnassigned → API false),
    // but keep assignee GUIDs from dashboard filter when present, and keep any
    // explicit "Unassigned" selection (e.g. the dashboard's Unassigned toggle).
    const safeFilterValues = disableDefaultAssignee
      ? {
          ...filterValues,
          meAndUnassigned: (Array.isArray(filterValues?.meAndUnassigned)
            ? filterValues.meAndUnassigned
            : []
          ).filter(isUnassignedAssigneeFilterItem),
        }
      : filterValues;
      
    try {
      isFetchingRef.current = true;
      setIsFetching(true);

      if (hardRefresh) {
        setApiLoading(true);
        setBoardStages([]);
      } else {
        setScrollingApiLoading(true);
      }
      const meUnassigned =
        isOBMainTask || activeTaskCodes === "SubTask" || activeTaskCodes === "Task";
      const updatedFilters = normalizeFilters(
        safeFilterValues,
        activeTaskCodes,
        board,
        auth?.details?.regId,
        meUnassigned,
      );
      const taskUpdatedFilters = normalizeTaskFilters(
        safeFilterValues,
        board,
        auth?.details?.regId,
        meUnassigned,
      );

      // if (socket && socket.readyState === WebSocket.OPEN) {
      //   socket.send(
      //     JSON.stringify({
      //       type: "SUBSCRIBE_TICKETS",
      //       filter: updatedFilters,
      //     })
      //   );
      // }

      const apiCall =
        activeTaskCodes === "SubTask"
          ? getBoardSubTaskList
          : activeTaskCodes === "MainTask"
            ? getBoardMainTaskList
            : getBoardTaskList;
      const res = await apiCall(
        activeTaskCodes === "Task" ? taskUpdatedFilters : updatedFilters,
      );

      dispatch({ type: "SET_LOADING", payload: true });
      // if (!res?.data?.status) return;

      if (!res?.data?.status) {
        showToast({
          message: res?.data?.message || "Something went wrong.",
          variant: "danger",
        });
        onError(
          "server",
          res?.data?.message || "Something went wrong.",
          res?.data?.status || 500,
        );
        return;
      }

      const list = res.data.orderItems?.boardStageList || [];
      const isSubTask = activeTaskCodes === "SubTask";
      const isTask = activeTaskCodes === "Task";
      const actionType = isSubTask || isTask ? "SET_SUB_TASK_LIST" : "SET_MAIN_TASK_LIST";
      const actionStoreType = isSubTask || isTask ? "subTaskList" : "mainTaskList";
      const actualTicketCount =
        list.find((lab) => lab.labelId === labelId)?.total_tickets_count || 0;
      const fetchingTicketCount =
        taskDetails[actionStoreType]?.find((lab) => lab.labelId === labelId)?.ticketList
          ?.length || 0;
      const isValidCount = actualTicketCount >= 0 && fetchingTicketCount >= 0;
      setApiCall(isValidCount);
      const payload =
        isScroll === "isScroll"
          ? scrollAPIMergeKanbanStages(mainTasks, list)
          : isScroll === "update"
            ? moveAPIMergeKanbanStages(mainTasks, list)
            : list;
      dispatch({ type: actionType, payload: payload });
      dispatch({ type: "SET_LOADING", payload: false });
      const totalCount = payload.reduce(
        (sum, item) => sum + (item.total_tickets_count || 0),
        0,
      );
      if (!disableDefaultAssignee || isScroll === "isScroll") {
        const filtersToPersist =
          activeTaskCodes === "Task"
            ? { ...filterValues }
            : { ...selectedFilters, ...filterValues };
        writeKanbanFiltersToStorage(filtersToPersist, isDashboardEmbed);
        if (!disableDefaultAssignee) {
          const enabledCount = getEnabledFilterCount(filtersToPersist);
          localStorage.setItem("filterCount", JSON.stringify({ enabledCount }));
        }
      }

      setSelectedFilters(safeFilterValues);
      setTicketsCount(totalCount);

      // Dashboard embed: after move/update, soft-refresh parent widgets (heatmap, counts).
      if (disableDefaultAssignee && isScroll === "update") {
        onBoardDataChanged?.();
      }
    } catch (error) {
      // showToast({
      //   message: error?.message || String(error),
      //   variant: "danger",
      // });
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || error.message || "Something went wrong.";

      if (status === 401) {
        onError("unauthorized", message, status);
      } else if (error?.response) {
        // Server responded with error status
        showToast({ message, variant: "danger" });
        onError("server", message, status || 500);
      } else if (error?.request) {
        // Request made but no response received
        showToast({ message: "No response from server.", variant: "danger" });
        onError("server", "No response from server.", 500);
      } else {
        // Something else (like setting up the request)
        showToast({ message: `Request failed: ${message}`, variant: "danger" });
        onError("server", `Request failed: ${message}`, 500);
      }
    } finally {
      ticketFetchedRef.current = false;
      isFetchingRef.current = false;
      dispatch({ type: "SET_LOADING", payload: false });
      if (hardRefresh) setApiLoading(false);
      setScrollingApiLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (
      (activeTaskCodes === "SubTask" || activeTaskCodes === "Task") &&
      taskDetails?.subTaskList.length
    ) {
      setBoardStages(
        taskDetails.subTaskList.map((i) => ({
          name: i.name,
          color: i.colorCode,
          total_tickets_count: i.total_tickets_count,
          position: i.position,
          labelId: i.labelId,
        })),
      );
      setMainTasks(taskDetails.subTaskList);
    } else if (activeTaskCodes === "MainTask" && taskDetails?.mainTaskList.length) {
      setBoardStages(
        taskDetails.mainTaskList.map((i) => ({
          name: i.name,
          color: i.colorCode,
          total_tickets_count: i.total_tickets_count,
          position: i.position,
          labelId: i.labelId,
        })),
      );
      setMainTasks(taskDetails.mainTaskList);
    } else {
      setMainTasks([]);
    }
  }, [taskDetails]);

  useEffect(() => {
    if (!Array.isArray(mainTasks) || mainTasks.length === 0) return;

    const pageSize = Number(selectedFilters?.pageSize) || 10;
    skeletonLayoutRef.current = mainTasks.map((stage) => {
      const loadedCount = Array.isArray(stage?.ticketList) ? stage.ticketList.length : 0;
      // Prefer the currently loaded page count so skeleton columns don't inflate
      // to total_tickets_count (often hundreds) on filter refreshes.
      const cardCount =
        loadedCount > 0
          ? Math.min(loadedCount, 5)
          : Math.min(Math.max(pageSize, 2), 3);
      return { cardCount };
    });
  }, [mainTasks, selectedFilters?.pageSize]);

  const skeletonColumns = useMemo(() => {
    if (skeletonLayoutRef.current?.length) {
      return skeletonLayoutRef.current;
    }

    const pageSize = Number(selectedFilters?.pageSize) || 10;
    const cardsPerColumn = Math.min(Math.max(pageSize, 2), 4);
    return Array.from({ length: 4 }, () => ({ cardCount: cardsPerColumn }));
  }, [apiLoading, selectedFilters?.pageSize]);

  /*** HANDLE FILTER CHANGE ***/
  const handleFilterChange = (newFilters) => {
    const parsed = readKanbanFiltersFromStorage(isDashboardEmbed) || {};
    const mergedFilters = {
      ...parsed,
      ...newFilters,
      pageOffSet: 0,
      pageSize: 10,
      stageScroll: null,
    };

    fetchTicketData(mergedFilters, true);
    dispatch({
      type: activeTaskCodes === "Task" ? "SET_TASK_FILTER" : "SET_WORKSPACE_FILTER",
      payload: mergedFilters,
    });
  };
  const scrollFetchingRef = useRef(false);
  const exhaustedLabelsRef = useRef(new Set());

  const callApiOnScroll = (param, labelId) => {
    // if (scrollFetchingRef.current || exhaustedLabelsRef.current.has(labelId)) return;
    scrollFetchingRef.current = true;
    // stageScroll: filterValues.pageOffSet === 0 ? null : [labelId],
    return fetchTicketData(
      {
        ...param,
        stageScroll: [labelId],
      },
      false,
      labelId,
      "isScroll",
    )
      .then((res) => {
        const list = res?.data?.orderItems?.boardStageList || [];

        const labelData = list.find((lab) => lab.labelId === labelId);

        if (!labelData || !labelData.ticketList || labelData.ticketList.length === 0) {
          exhaustedLabelsRef.current.add(labelId);
        }
      })
      .catch((err) => {
        console.error("Scroll API error:", err);
      })
      .finally(() => {
        scrollFetchingRef.current = false;
      });
  };

  const handleOpenDrawer = () => {
    setShowDrawer(true);
  };
  const handleCloseDrawer = () => {
    setShowDrawer(false);
  };
  return (
    <div className="kanaban-body-content">
     {
      filtersShow &&
      activeTaskCodes && (
        <div className="bg-white rounded w-100 filterComponent">
          <KanbanFilterComponent
            getSelectedFilters={handleFilterChange}
            initialSelectedFilter={selectedFilters}
            filterFrom={activeTaskCodes === "Task" ? "task" : "kanban"}
            filterConfig={
              activeTaskCodes === "Task" ? taskFilterConfig : kanbanFilterConfig
            }
            ticketsCount={ticketsCount}
            apiLoading={apiLoading}
          />
        </div>
      )}

      {apiLoading ? (
        <KanbanBoardSkeleton columns={skeletonColumns} ariaLabel="Loading board tickets" />
      ) : (
        boardStages && (
          <KanbanBoard
            isDraggable={
              activeTaskCodes === "SubTask" || activeTaskCodes === "Task" ? true : false
            }
            stages={boardStages}
            tasks={mainTasks}
            setTasks={setMainTasks}
            boardData={board}
            selectedFilters={selectedFilters}
            reloadTask={(filtersValue, refresh, labelId, isScroll) => {
              fetchTicketData(filtersValue, refresh, labelId, isScroll);
            }}
            callApiOnScroll={callApiOnScroll}
            scrollingApiLoading={scrollingApiLoading}
            activeTaskCodes={activeTaskCodes}
            embedded={disableDefaultAssignee}
          />
        )
      )}
      <div className="work-allocation" onClick={handleOpenDrawer}>
        Work Allocation{" "}
        <img src={leftArrowIcon} className="leftArrowIcon" alt="Open Drawer" />
      </div>
      {
        <WorkAllocation
          userRole={userRole}
          boardData={board}
          activeTask={activeTaskCodes}
          isTask={activeTaskCodes === "Task"}
          showDrawer={showDrawer}
          handleCloseDrawer={handleCloseDrawer}
        />
      }
    </div>
  );
};

export default KanbanHome;

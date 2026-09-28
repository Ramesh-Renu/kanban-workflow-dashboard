import { useEffect, useState } from "react";
import { useGlobalMaster } from "@orion/shared";
import { useGlobalContext } from "store/context/GlobalProvider";
import variables from "@orion/shared/src/styles/variables-style.json";
import useAuth from "../../hooks/useAuth";
import { buildMemberAssigneeFilterOptions } from "../../utils/common";
import { isAdminKanbanMyWorkspaceMode } from "utils/dashboard";

// ---------------------
// Common Constants
// ---------------------

const dateNestedValues = [
  {
    name: "Order Date",
    id: "orderDateRange",
    disabled: false,
    child: [
      { name: "This Week", id: "thisWeek", customEntry: false },
      { name: "This Month", id: "thisMonth", customEntry: false },
      { name: "Custom", id: "customDateRange", customEntry: true },
    ],
  },
  // {
  //   name: "Delivery Date",
  //   id: "dueDateRange",
  //   disabled: false,
  //   child: [
  //     { name: "This Week", id: "thisWeek", customEntry: false },
  //     { name: "This Month", id: "thisMonth", customEntry: false },
  //     { name: "Overdue", id: "overDue", customEntry: false },
  //     { name: "Custom", id: "customDateRange", customEntry: true },
  //   ],
  // },
  {
    name: "Tool Due Date",
    id: "subTaskDueDateRange",
    disabled: false,
    child: [
      { name: "This Week", id: "thisWeek", customEntry: false },
      { name: "This Month", id: "thisMonth", customEntry: false },
      { name: "Overdue", id: "overDue", customEntry: false },
      { name: "Custom", id: "customDateRange", customEntry: true },
    ],
  },
];

// ---------------------
// Hook: Fetch Masters
// ---------------------
const useFilterMasters = (key, board, activeTaskCodes) => {
  const { dispatch } = useGlobalContext();
  const [masterData, setMasterData] = useState({});
  const {
    orderType,
    orderCategory,
    orderStatus,
    labelList,
    ticketAssigneeList,
    getOrderType,
    getOrderCategory,
    getOrderStatus,
    getLabelList,
    workFlowList,
    getTicketAssigneeList,
    suggestedMembersList,
    getSuggestedMembersList,
    taskPriority,
    getTaskPriority,
    getFreeFlowLabelList,
    freeFlowLabelList,    
  } = useGlobalMaster();

  function getTargetBoardIds(workFlowList, sourceBoardId) {
    if (!workFlowList?.data || !Array.isArray(workFlowList.data)) return [];

    const targetIds = new Set();

    workFlowList.data.forEach((flow) => {
      flow.flow_detail?.forEach((detail) => {
        // Case 1: Current flow source matches
        if (detail?.source?.board_id === sourceBoardId) {
          detail.targets?.forEach((target) => {
            if (target?.board_id) targetIds.add(target.board_id);
          });
        }

        // Case 2: Current flow has this board as a target (reverse link)
        else if (detail?.targets?.some((t) => t?.board_id === sourceBoardId)) {
          if (detail?.source?.board_id) targetIds.add(detail.source.board_id);
        }
      });
    });

    // Convert to array and ensure sourceBoardId appears only once
    const result = [sourceBoardId, ...Array.from(targetIds)].filter(
      (v, i, arr) => arr.indexOf(v) === i,
    );

    // If no connected boards found, return []
    if (result.length === 1) return [];

    return result;
  }
  // useEffect(() => {
  //     if (board === undefined || workFlowList?.data?.length === 0) return;
  //     if (
  //       !suggestedMembersList?.loading &&
  //       board[0]?.boardID &&
  //       workFlowList.data?.length > 0
  //     ) {
  //       const result = getTargetBoardIds(workFlowList, board[0]?.boardID);
  //       if (activeTaskCodes === "MainTask") {
  //         getSuggestedMembersList(board[0]?.boardID);
  //       } else if (board[0].code === "OB" && activeTaskCodes === "SubTask") {
  //         getSuggestedMembersList(
  //           result.length > 0 ? result.filter((id) => id !== 108) : 0
  //         );
  //       } else if (board[0]?.boardID) {
  //         getSuggestedMembersList(
  //           result.length > 0 ? result.filter((id) => id !== 108) : 0
  //         );
  //       }
  //     }
  //   }, [board, activeTaskCodes, workFlowList]);

  useEffect(() => {
    if (board === undefined) return;
    if (!suggestedMembersList?.loading && board[0]?.boardID) {
      getSuggestedMembersList(board[0]?.boardID);
    }
  }, [board]);

  useEffect(() => {
    if (!orderType?.loading && !orderType?.data?.length) getOrderType();
    if (!taskPriority?.loading && !taskPriority?.data?.length)
      getTaskPriority();
    if (!orderCategory?.loading && !orderCategory?.data?.length)
      getOrderCategory();
    if (!orderStatus?.loading && !orderStatus?.data?.length) getOrderStatus();
    if (!labelList?.loading && !labelList?.data?.length) getLabelList();
    if (!ticketAssigneeList?.loading && !ticketAssigneeList?.data?.length)
      getTicketAssigneeList();
    if (!freeFlowLabelList?.loading && !freeFlowLabelList?.data?.length)
      getFreeFlowLabelList();
    // clear redux states once
    dispatch({ type: "SET_TICKET_DETAILS", payload: [] });
    dispatch({ type: "SET_INSTRUMENT_DATA", payload: [] });
    dispatch({ type: "SET_ATTACHMENT_DATA", payload: [] });
    dispatch({ type: "SET_ATTACHMENT_ORDERID", payload: null });
    dispatch({ type: "SET_CONFIDENTIAL_DATA", payload: [] });
    dispatch({ type: "SET_BRANDING_GUIDELINES_DATA", payload: [] });
    dispatch({ type: "SET_BRANDING_ATTACHMENT_ORDERID", payload: null });
  }, []);

  useEffect(() => {
    setMasterData({
      ORDERTYPE: orderType?.data || [],
      ORDERCATEGORY: orderCategory?.data || [],
      ORDERSTATUS: orderStatus?.data || [],
      ORDERLABELS: labelList?.data || [],
      TICKETASSIGNEE:
        key === "kanban"
          ? suggestedMembersList?.data
          : ticketAssigneeList?.data || [],
      TASKPRIORITY: taskPriority?.data || [],
      FREEFLOWLABELS: freeFlowLabelList?.data || [],
    });
  }, [
    orderType,
    orderCategory,
    orderStatus,
    labelList,
    ticketAssigneeList,
    suggestedMembersList,
    taskPriority,
    key,
    freeFlowLabelList,
  ]);

  return masterData;
};

const createFilterConfig = ({
  key,
  type,
  options,
  labelField,
  valueField,
  placeholder,
  iconPlacement,
  iconColor,
  disabled = false,
  multi = true,
  searchable = true,
}) => ({
  key,
  type,
  options,
  labelField,
  valueField,
  placeholder,
  iconPlacement,
  iconColor,
  disabled,
  multi,
  searchable,
});

// ---------------------
// Config hooks
// ---------------------

const OrderOrionFilterConfig = ({ data }) => {
  const masterData = useFilterMasters();
  return [
    createFilterConfig({
      key: "dueDate",
      type: "nested",
      options: dateNestedValues?.filter(
        (range) => range.id !== "subTaskDueDateRange",
      ),
      // options: dateNestedValues,
      labelField: "name",
      valueField: "id",
      iconPlacement: 2,
      iconColor: variables.common["--color-orange-lighter"],
    }),
    createFilterConfig({
      key: "orderStatus",
      type: "simple",
      options: masterData?.ORDERSTATUS,
      labelField: "name",
      valueField: "code",
      placeholder: "Status",
      iconPlacement: 3,
      iconColor: variables.common["--color-icon-orange"],
    }),
    createFilterConfig({
      key: "orderLabels",
      type: "simple",
      options: masterData?.ORDERLABELS,
      labelField: "name",
      valueField: "code",
      placeholder: "Labels",
      iconPlacement: 4,
      iconColor: variables.common["--color-icon-purple"],
    }),
    createFilterConfig({
      key: "assignee",
      type: "simple",
      options: masterData?.TICKETASSIGNEE,
      labelField: "displayName",
      valueField: "regId",
      placeholder: "Assignee",
      iconPlacement: 5,
      iconColor: variables.common["--color-icon-purple"],
      disabled: data.some((user) => user.id === 0),
    }),
    createFilterConfig({
      key: "orderType",
      type: "simple",
      options: masterData?.ORDERTYPE,
      labelField: "name",
      valueField: "code",
      placeholder: "Order Type",
      iconPlacement: 10,
      iconColor: variables.common["--color-icon-green"],
    }),
    createFilterConfig({
      key: "orderCategory",
      type: "simple",
      options: masterData?.ORDERCATEGORY,
      labelField: "name",
      valueField: "code",
      placeholder: "Category",
      iconPlacement: 11,
      iconColor: variables.common["--color-icon-purple"],
    }),
  ];
};

const useKanbanFiltersConfig = ({ activeTaskCodes, boardStages, board }) => {
  const [{ data: auth }] = useAuth();
  const masterData = useFilterMasters("kanban", board, activeTaskCodes);
  const { isSuperAdmin, user_type_code } = auth?.details || {};
  const isAdmin = user_type_code === "ADM";
  const isKanbanMyWorkspaceAdmin = isAdminKanbanMyWorkspaceMode(auth?.details);
  // Admin My Workspace: keep login user at top of assignee options (USR behavior unchanged)
  const assigneeOptions = isKanbanMyWorkspaceAdmin
    ? buildMemberAssigneeFilterOptions(masterData?.TICKETASSIGNEE, auth, {
        isAdmin: false,
        isSuperAdmin: false,
        includeUnassigned: true,
      }).map((option) =>
        option?.displayName === "Me"
          ? {
              ...option,
              displayName:
                auth?.details?.displayName ||
                auth?.details?.userName ||
                option.displayName,
            }
          : option,
      )
    : buildMemberAssigneeFilterOptions(masterData?.TICKETASSIGNEE, auth, {
        isAdmin,
        isSuperAdmin,
      });
  return [
    createFilterConfig({
      key: "meAndUnassigned",
      type: "simple",
      options: assigneeOptions,
      labelField: "displayName",
      valueField: "regId",
      placeholder: "Assignee",
      iconPlacement: 5,
      iconColor: variables.common["--color-icon-purple"],
    }),
    createFilterConfig({
      key: "dueDate",
      type: "nested",
      options: dateNestedValues?.filter((range) =>
        activeTaskCodes === "MainTask"
          ? range.id !== "subTaskDueDateRange"
          : range,
      ),
      labelField: "name",
      valueField: "id",
      iconPlacement: 2,
      iconColor: variables.common["--color-orange-lighter"],
    }),
    createFilterConfig({
      key: "orderType",
      type: "simple",
      options: masterData?.ORDERTYPE,
      labelField: "name",
      valueField: "code",
      placeholder: "Order Type",
      iconPlacement: 10,
      iconColor: variables.common["--color-icon-green"],
    }),
    createFilterConfig({
      key: "orderLabels",
      type: "simple",
      options: masterData?.ORDERLABELS,
      labelField: "name",
      valueField: "code",
      placeholder: "Labels",
      iconPlacement: 4,
      iconColor: variables.common["--color-icon-purple"],
    }),
    createFilterConfig({
      key: "stageList",
      type: "simple",
      options: boardStages,
      labelField: "name",
      valueField: "labelId",
      placeholder: "Stage",
      iconPlacement: 3,
      iconColor: variables.common["--color-icon-orange"],
      disabled: false,
    }),
  ];
};

const useTaskFiltersConfig = ({ activeTaskCodes, boardStages, board }) => {
  const [{ data: auth }] = useAuth();
  const masterData = useFilterMasters("kanban", board, activeTaskCodes);
  const { isSuperAdmin, user_type_code } = auth?.details || {};
  const isAdmin = user_type_code === "ADM";
  const isKanbanMyWorkspaceAdmin = isAdminKanbanMyWorkspaceMode(auth?.details);
  const assigneeOptions = isKanbanMyWorkspaceAdmin
    ? buildMemberAssigneeFilterOptions(masterData?.TICKETASSIGNEE, auth, {
        isAdmin: false,
        isSuperAdmin: false,
        includeUnassigned: true,
      }).map((option) =>
        option?.displayName === "Me"
          ? {
              ...option,
              displayName:
                auth?.details?.displayName ||
                auth?.details?.userName ||
                option.displayName,
            }
          : option,
      )
    : buildMemberAssigneeFilterOptions(masterData?.TICKETASSIGNEE, auth, {
        isAdmin,
        isSuperAdmin,
      });
  return [
   
    createFilterConfig({
      key: "meAndUnassigned",
      type: "simple",
      options: assigneeOptions,
      labelField: "displayName",
      valueField: "regId",
      placeholder: "Assignee",
      iconPlacement: 5,
      iconColor: variables.common["--color-icon-purple"],
    }),
    createFilterConfig({
      key: "dueDate",
      type: "nested",
      options: dateNestedValues?.map((range) => {
        if (range.id === "subTaskDueDateRange") {
          return {
            ...range,
            name: "Task Due date",
          };
        }
        if (range.id === "orderDateRange") {
          return {
            ...range,
            name: "Created date",
          };
        }

        return range;
      }),
      labelField: "name",
      valueField: "id",
      iconPlacement: 2,
      iconColor: variables.common["--color-orange-lighter"],
    }),
    createFilterConfig({
      key: "orderLabels",
      type: "simple",
      options: masterData?.TASKPRIORITY,
      labelField: "name",
      valueField: "status_id",
      placeholder: "Priority",
      iconPlacement: 4,
      iconColor: variables.common["--color-icon-purple"],
    }),
    createFilterConfig({
      key: "stageList",
      type: "simple",
      options: boardStages,
      labelField: "name",
      valueField: "labelId",
      placeholder: "Stage",
      iconPlacement: 3,
      iconColor: variables.common["--color-icon-orange"],
      disabled: false,
    }),
    createFilterConfig({
      key: "freeFlowLabelId",
      type: "simple",
      options: masterData?.FREEFLOWLABELS,
      labelField: "name",
      valueField: "status_id",
      placeholder: "Labels",
      iconPlacement: 1,
      iconColor: variables.common["--color-icon-green"],
    }),
  ];
};

// ---------------------
// Export
// ---------------------
export {
  useFilterMasters,
  OrderOrionFilterConfig,
  useKanbanFiltersConfig,
  useTaskFiltersConfig,
};

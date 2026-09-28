export const initialWorkSpaceFilterState = {
  filterValues: {
    boardId: null,
    searchTxt: null,
    orderLabels: [],
    orderType: [],
    assignee: [],
    meAndUnassigned: [],
    orderDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: null,
        to: null,
      },
    },
    dueDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: "",
        to: "",
      },
    },
    subTaskDueDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: "",
        to: "",
      },
    },
    stageList: null,
    pageOffSet: 0,
    pageSize: 10,
    sortBy: null,
    sortOrder: null,
    stageScroll: null,
  },
  clearFilterValues: {
    boardId: null,
    searchTxt: null,
    orderLabels: [],
    orderType: [],
    assignee: [],
    meAndUnassigned: [],
    orderDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: null,
        to: null,
      },
    },
    dueDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: "",
        to: "",
      },
    },
    subTaskDueDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: "",
        to: "",
      },
    },
    stageList: null,
    pageOffSet: 0,
    pageSize: 10,
    sortBy: null,
    sortOrder: null,
    stageScroll: null,
  },
  taskFilterValues: {
    boardId: null,
    searchTxt: null,
    assignee: [],
    orderLabels: [],
    pageOffSet: 0,
    pageSize: 10,
    sortBy: null,
    sortOrder: null,
    stageScroll: null,
    stageList: null,
    meAndUnassigned: null,
    freeFlowLabelId: [],
    orderDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: null,
        to: null,
      },
    },
    subTaskDueDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: null,
        to: null,
      },
    },
  },
  clearTaskFilterValues: {
    boardId: null,
    searchTxt: null,
    pageOffSet: 0,
    pageSize: 10,
    sortBy: null,
    assignee: [],
    orderLabels: [],
    sortOrder: null,
    stageScroll: null,
    stageList: null,
    meAndUnassigned: null,
    freeFlowLabelId: [],
    orderDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: null,
        to: null,
      },
    },
    subTaskDueDateRange: {
      thisWeek: false,
      thisMonth: false,
      overDue: false,
      customDate: false,
      customDateRange: {
        from: null,
        to: null,
      },
    },
  },
  loading: false,
  error: null,
  showFilter: false,
};

export const workSpaceFilterValuesReducer = (state, action) => {
  switch (action?.type) {
    case "SET_WORKSPACE_FILTER":
      return { ...state, filterValues: action.payload, showFilter: true };
    case "CLEAR_WORKSPACE_FILTER":
      return {
        ...state,
        filterValues: state.clearFilterValues,
        showFilter: false,
      };
    case "SET_TASK_WORKSPACE_FILTER":
      return { ...state, taskFilterValues: action.payload, showFilter: true };
    case "CLEAR_TASK_WORKSPACE_FILTER":
      return {
        ...state,
        taskFilterValues: state.clearTaskFilterValues,
        showFilter: false,
      };
    case "TOGGLE_SHOW_FILTER":
      return {
        ...state,
        showFilter: action.payload, // payload should be true/false
      };
    default:
      return state;
  }
};

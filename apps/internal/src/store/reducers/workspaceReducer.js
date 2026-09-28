export const initialWorkspaceState = {
  activeWorkSpace: [],
  activeBoard: [],
  activeDepartmentPermission: null,
  workAllocation: {data: [], loading: false, error: null },
};

export const workspaceReducer = (state, action) => {
  const key = action?.payload?.key;

  switch (action?.type) {
    case "LOADING":
      return {
        ...state,
        [key]: {
          ...state[key],
          loading: true,
          error: null,
        },
      };

    case "SUCCESS":
      return {
        ...state,
        [key]: {
          data: action.payload.data,
          loading: false,
          error: null,
        },
      };

    case "ERROR":
      return {
        ...state,
        [key]: {
          data: [],
          loading: false,
          error: action.payload.error,
        },
      };

    default:
      return state;
  }
};

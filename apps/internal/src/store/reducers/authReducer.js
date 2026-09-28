// context/authReducer.js

export const initialAuthState = {
  activeUser: {
    data: {
      accessToken: null,
      details: null,
      restrictions: null,
      activeDepartmentPermission: null,
    },
    loading: false,
    error: null,
  },
  logout: {
    loading: false,
    error: null,
  },
  userDetailsById: {
    data: [],
    loading: false,
    error: null,
  },
};

export const authReducer = (state, action) => {
  switch (action?.type) {
    case "SET_AUTH":
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            accessToken: action.payload,
          },
        },
      };

    case "SET_ACTIVE_DEPARTMENT_PERMISSION":
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            activeDepartmentPermission: action.payload,
          },
        },
      };

    case "SET_ACTIVE_WORKSPACE":
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            activeWorkSpace: action.payload,
          },
        },
      };

    case "SET_ACTIVE_BOARD":
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            activeBoard: action.payload,
          },
        },
      };

    case "SET_DEFAULT_WORKSPACE":
      const workspaceList = [...state.activeUser.data.details.workspaceDTO];
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            details: {
              ...state.activeUser.data.details,
              workspaceDTO: workspaceList.map((ws) => ({
                ...ws,
                is_workspace_default:
                  Number(ws.work_space_id) ===
                  Number(action.payload.work_space_id),
              })),
            },
          },
        },
      };

    case "SET_DEFAULT_BOARD":
      const boardsKey = state.activeUser.data.details?.workspaceDTO?.find(
        (board) => {
          // console.log("board", board);
        }
      );
      const boards = [...state.activeUser.data.details[boardsKey]];
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            details: {
              ...state.activeUser.data.details,
              [boardsKey]: boards.map((board) => ({
                ...board,
                is_board_default: board.boardId === action.payload.ubId,
              })),
            },
          },
        },
      };

    case "SET_USER_DETAILS":
      const boardsData = action.payload?.userRoleResponseDetail ?? [];

      // try to find the board that matches activeBoard
      const matchedBoard = boardsData
        .flatMap((user) => user?.boards ?? []) // collect all boards
        .find((board) => board?.boardId === state?.activeUser?.activeBoard);

      // if no match, fall back to first available board
      const activeBoard = matchedBoard ?? boardsData[0]?.boards?.filter((board)=>board.boardCode === "SA")[0] ?? null;
      
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          data: {
            ...state.activeUser.data,
            details: action.payload,
            restrictions: activeBoard,
            // formatUserRestrictions(
            //   action.payload.userRoleResponseDetail
            // ),
            error: null,
            errorType: null,
          },
          loading: false,
        },
      };

    case "SET_USER_DETAILS_LOADING":
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          loading: true,
          error: null,
          errorType: null,
          errorTitle: null,
        },
      };

    case "SET_USER_DETAILS_ERROR":
      return {
        ...state,
        activeUser: {
          ...state.activeUser,
          error: action.payload.error,
          errorType: action.payload.type,
          errorTitle: action.payload.title,
          loading: false,
        },
      };

    case "LOGOUT":
      return initialAuthState;

    default:
      return state;
  }
};

// Helper to format restrictions
const formatUserRestrictions = (userRoleResponseDetail) => {
  if (!userRoleResponseDetail) return null;
  return userRoleResponseDetail.reduce((acc, item) => {
    const { depcode, rolepermission } = item;
    const featureLabel = {};

    rolepermission.forEach((role) => {
      const restriction = {};
      role.details.forEach((detail) => {
        restriction[`can${detail.type?.split(" ").join("_")}`] =
          detail.ischecked;
      });
      featureLabel[
        role.permission?.split(" ").join("_")?.toLowerCase()
      ] = restriction;
    });

    acc[depcode] = featureLabel;
    return acc;
  }, {});
};

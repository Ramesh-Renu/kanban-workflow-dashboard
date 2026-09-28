export const initialUserListState = {
  userList: [],
  totalCount: null,
  loading: false,
  error: null,
};

export const userCreationReducer = (state, action)=> {
  switch (action?.type) {
    case 'SET_USERLIST_DATA':
      return { ...state, userList: action.payload.userItems, totalCount: action.payload.totalCount};
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

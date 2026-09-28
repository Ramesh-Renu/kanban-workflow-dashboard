export const initialNotificationState = {
  pageNotification: [],
};

export const notificationReducer = (state, action) => {
  switch (action?.type) {
    case "SET_PAGE_NOTIFICATIONS":
      return {
        ...state,
        pageNotification: action.payload,
      };
    default:
      return state;
  }
};

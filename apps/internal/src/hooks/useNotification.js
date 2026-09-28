import { useCallback } from "react";
import { useGlobalContext } from "store/context/GlobalProvider"; // update the path
import { getPageNotification } from "../services"; // your API function

export const useNotification = () => {
  const { notificationState, dispatch } = useGlobalContext();

  const getPageNotificationData = useCallback(async (params) => {
    try {
      const res = await getPageNotification(params); // call your API
      if (res?.data) {
        dispatch({
          type: "SET_PAGE_NOTIFICATIONS",
          payload: res.data, // or res.payload
        });
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  return {
    pageNotification: notificationState.pageNotification,
    getPageNotificationData,
  };
};

import { useGlobalContext } from "store/context/GlobalProvider";
import { getWorkAllocation } from "../services";

const useWorkspace = () => {
  const { workspaceState, dispatch } = useGlobalContext();

  const fetchAPI = async (key, apiCall) => {
    if (workspaceState[key]?.loading) return;

    dispatch({ type: "LOADING", payload: { key } });

    try {
      const res = await apiCall();

      // Adjust this line based on actual structure
      dispatch({
        type: "SUCCESS",
        payload: {
          key,
          data: res?.data ?? [],
        },
      });
      return res;
    } catch (error) {
      dispatch({
        type: "ERROR",
        payload: {
          key,
          error: error.message || "Something went wrong",
        },
      });
      throw error;
    }
  };

  return {
    ...workspaceState,
    getWorkAllocation: (params) => fetchAPI("workAllocation", () => getWorkAllocation(params)),
  };
};

export default useWorkspace;

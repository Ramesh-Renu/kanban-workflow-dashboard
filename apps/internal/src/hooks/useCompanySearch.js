// hooks/useCompanySearch.js
import { useCallback } from "react";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  customerSearchwithType,
} from "../services"; // Keep API actions here

const useCompanySearch = () => {
  const { companySearchState, dispatch } = useGlobalContext();
  const getCustomerSearch = useCallback(async (params) => {
    const data = await customerSearchwithType(params);
    dispatch({
      type: "SET_CUSTOMER_SEARCH",
      payload: data,
    });
    return data;
  }, []);

  return {
    customerSearchList: companySearchState.customerSearchList,
    getCustomerSearch,
  };
};

export default useCompanySearch;

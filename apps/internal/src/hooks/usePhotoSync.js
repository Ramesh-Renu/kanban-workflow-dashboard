import { useCallback, useState } from "react";
import { getPhotoSync } from "../services";
import useAuth from "./useAuth";

const usePhotoSync = () => {
  const [, { getUserInfoData }] = useAuth();
  const [photoSyncLoading, setPhotoSyncLoading] = useState(false);

  const photoSync = useCallback(
    async (params) => {
      setPhotoSyncLoading(true);
      try {
        const response = await getPhotoSync({},params);

        if (response?.status === 200) {
          await getUserInfoData(); // Refresh user data on success
        }

        return { type: "photoSync/fulfilled", payload: response?.data };
      } catch (error) {
        return { type: "photoSync/rejected", error };
      } finally {
        setPhotoSyncLoading(false);
      }
    },
    [getUserInfoData]
  );

  return { photoSync, photoSyncLoading  };
};

export default usePhotoSync;

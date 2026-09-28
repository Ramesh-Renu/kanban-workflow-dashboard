import { useState, useCallback } from "react";

export const useToolFlowData = ({
  isTask,
  getData,
  workFlowList,
  getWorkFlowList,
  boardData,
  labelData,
}) => {
  const [moveToData, setMoveToData] = useState([]);

  const getToolFlowData = useCallback(async () => {
    try {
      const flowId = getData?.flowId;

      if (!workFlowList?.data || workFlowList?.data.length === 0) {
        await getWorkFlowList({ flow_id: "" });
      }

      const flow = workFlowList?.data?.find(
        (f) => f.flow_id === flowId,
      );

      const value = isTask
        ? flow?.flow_detail
            ?.filter(
              (detail) =>
                detail.source?.board_id === boardData[0]?.boardID,
            )
            ?.map(({ action_id, action_name, targets, source }) => ({
              action_id,
              action_name,
              targets,
              source,
            })) || []
        : flow?.flow_detail
            ?.filter(
              (detail) =>
                detail.source?.label_id === labelData?.labelId,
            )
            ?.map(({ action_id, action_name, targets, source }) => ({
              action_id,
              action_name,
              targets,
              source,
            })) || [];

      // your existing workspace grouping
      const workspaceWiseData = Object.values(
        value
          .flatMap((item) => item.targets)
          .reduce((acc, target) => {
            const {
              workspace_id,
              workspace_name,
              board_id,
              label_id,
              board_name,
              label_name,
              unassigned,
              emailnotify,
            } = target;

            if (!acc[workspace_id]) {
              acc[workspace_id] = {
                workspace_id,
                workspace_name,
                boards: [],
              };
            }

            const existingBoard =
              acc[workspace_id].boards.find(
                (b) =>
                  b.board_id === board_id &&
                  b.label_id === label_id,
              );

            if (!existingBoard) {
              acc[workspace_id].boards.push({
                board_id,
                label_id,
                board_name,
                label_name,
                unassigned,
                emailnotify,
              });
            } else {
              existingBoard.emailnotify ||= emailnotify;
            }

            return acc;
          }, {}),
      );

      const allTargets = isTask ? workspaceWiseData : value;

      setMoveToData(allTargets);
    } catch (err) {
      console.error("getToolFlowData error", err);
    }
  }, [
    isTask,
    getData,
    workFlowList,
    getWorkFlowList,
    boardData,
    labelData,
  ]);

  return { moveToData, getToolFlowData };
};

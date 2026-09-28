import PopupModal from "@orion/shared/src/components/PopupModal";
import { SelectDropDown } from "@orion/shared";
import { Fragment, useEffect, useState } from "react";

const TaskMovetoMenu = ({
  moveToData,
  showPopup,
  closePopup,
  moveToTicket,
  apiLoading,
}) => {
  const [getWorkspace, setGetWorkspace] = useState([]);
  const [getBoard, setGetBoard] = useState([]);
  const [getStage, setGetStage] = useState([]);
  const [getSelectedWorkspace, setGetSelectedWorkspace] = useState([]);
  const [getSelectedBoard, setGetSelectedBoard] = useState([]);
  const [getSelectedStage, setGetSelectedStage] = useState([]);

  useEffect(() => {
    setGetWorkspace(
      (moveToData?.length > 0 &&
        moveToData?.map((item) => ({
          workspace_name: item.workspace_name,
          workspace_id: item.workspace_id,
        }))) ||
        [],
    );
  }, [moveToData]);

  const handleChangeWorkspace = (selectedOption) => {
    if (!selectedOption?.length) {
      setGetSelectedWorkspace([]);
      setGetSelectedBoard([]);
      setGetSelectedStage([]);
      setGetBoard([]);
      setGetStage([])
      return;
    }
    setGetSelectedWorkspace(selectedOption);
    const workspaceId = selectedOption[0]?.workspace_id;

    const selectedWorkspace = Array.isArray(moveToData)
      ? moveToData.find((ws) => ws.workspace_id === workspaceId)
      : moveToData;
    if (!selectedWorkspace?.boards?.length) {
      setGetBoard([]);
      return;
    }

    // ✅ Group boards with stages
    const groupedBoards = Object.values(
      selectedWorkspace?.boards?.reduce((acc, item) => {
        if (!acc[item.board_id]) {
          acc[item.board_id] = {
            board_id: item.board_id,
            board_name: item.board_name,
            stages: [],
          };
        }

        acc[item.board_id].stages.push({
          label_id: item.label_id,
          label_name: item.label_name,
        });

        return acc;
      }, {}),
    );
    setGetSelectedBoard([]);
    setGetSelectedStage([]);
    setGetStage([]);
    setGetBoard(groupedBoards || []);
  };

  const handleChangeBoard = (selectedOption) => {
    if (!selectedOption?.length) {
      setGetSelectedBoard([]);
      setGetSelectedStage([]);
      setGetStage([])
      return;
    }
    const selectedBoard = selectedOption[0];
    setGetSelectedBoard([selectedBoard]);
    setGetSelectedStage([]);
    // ✅ use selectedOption directly
    setGetStage(selectedBoard.stages ?? []);
  };
  
  const handleChangeStage = (selectedOption) => {
    if (!selectedOption?.length) {
      setGetSelectedStage([]);
      return;
    }
    const stage = selectedOption[0];
    const board = getSelectedBoard[0];
    const workspace = getSelectedWorkspace[0];

    setGetSelectedStage([
      {
        board_id: board.board_id,
        board_name: board.board_name,
        label_id: stage.label_id,
        label_name: stage.label_name,
        workspace_id: workspace.workspace_id,
        workspace_name: workspace.workspace_name,
      },
    ]);
  };

  return (
    <PopupModal
      show={showPopup}
      onClose={() => closePopup(false)}
      header={true}
      title={"Select Target Workspace and Board Stages"}
      className={"select-target-workspace"}
      key="selectTarget"
    >
      {" "}
      <div className="select-target-workspace-body">
        <div className="select-target-workspace-body--dropdown">
          <label className="heading">Workspace</label>
          <SelectDropDown
            multi={false}
            options={getWorkspace}
            labelField={"workspace_name"}
            valueField={"workspace_id"}
            values={getSelectedWorkspace || []}
            searchable={true}
            onChange={handleChangeWorkspace}
            placeholder={"Select Workspace"}
            className="taskMove-select-dropDown"
            disabled={false}
            dropdownPosition="bottom"
          />
        </div>
        <div className="select-target-workspace-body--dropdown mt-2">
          <label className="heading">Board</label>
          {getBoard && getWorkspace && (
            <SelectDropDown
              multi={false}
              options={getBoard}
              labelField={"board_name"}
              valueField={"board_id"}
              values={getSelectedBoard || []}
              searchable={true}
              onChange={handleChangeBoard}
              placeholder={"Select Board"}
              className="taskMove-select-dropDown"
              disabled={getBoard.length === 0}
              dropdownPosition="auto"
            />
          )}
        </div>
        <div className="select-target-workspace-body--dropdown mb-2 mt-2">
          <label className="heading">Stage</label>
          {getStage && getBoard && (
            <SelectDropDown
              key={getSelectedBoard[0]?.board_id || "stage"}
              multi={false}
              options={getStage}
              labelField={"label_name"}
              valueField={"label_id"}
              values={getSelectedStage || []}
              searchable={true}
              onChange={handleChangeStage}
              placeholder={"Select Stage"}
              className="taskMove-select-dropDown"
              disabled={getSelectedBoard.length === 0}
              dropdownPosition="a"
            />
          )}
        </div>
        <div className="button-list">
          <button
            onClick={() => closePopup(false)}
            className="cancel-moveToTask"
          >
            Cancel
          </button>
          <button
            disabled={
              Object.keys(getSelectedStage).length === 0 ||
              getSelectedWorkspace.length === 0 ||
              getSelectedBoard.length === 0 ||
              apiLoading
            }
            onClick={() => moveToTicket(getSelectedStage[0])}
            className={`moveToTask ${apiLoading ? "api-loading" : ""}`}
          >
            {apiLoading ? "Moving Task" : "Move Task"}
          </button>
        </div>
      </div>
    </PopupModal>
  );
};
export default TaskMovetoMenu;

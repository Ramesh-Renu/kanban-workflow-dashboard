import React from "react";
import AssignMember from "./AssignMember";
const ToolAssignMember = ({
  apiLoading,
  flowData,
  toolSelected,
  assigneeList,
  selectedUser,
  updateTool,
  setApiLoading,
  setOpenAssignee,
}) => {
  
  return (
    <div className="movetoCard">
      <AssignMember
        userList={assigneeList}
        assignedUser={selectedUser}
        onChange={(data) => {
          updateTool("assignee",data, flowData, toolSelected);
        }}
        cancel={() => {
          setApiLoading(false);
          setOpenAssignee(false);
        }}
        apiLoading={apiLoading}
      />
    </div>
  );
};

export default ToolAssignMember;

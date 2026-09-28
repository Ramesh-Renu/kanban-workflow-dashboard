const buildUpdatedTools = ({
  isGrouped,
  isAllFlowSelected,
  getData,
  ticketData,
  toolSelected,
  type,
  data,
  formattedDueDate,
}) => {
  const mapTool = (item) => ({
    toolTicketId: item.toolTicketId,
    toolBoardLogId: item.toolBoardLogId,
    assignee: type === "assignee" ? data?.regId : null,
    dueDate: type === "dueDate" ? formattedDueDate : item.dueDate || null,
    dueDateChangeReason: type === "dueDate" && data?.description !==undefined ? data?.description : null,
  });

  if (isGrouped) {
    return getData?.listOfTools?.map(mapTool) || [];
  }

  if (isAllFlowSelected) {
    return (
      ticketData?.toolList?.flatMap(
        (flow) => flow.listOfTools?.map(mapTool) || [],
      ) || []
    );
  }

  return [
    {
      toolTicketId: toolSelected.toolTicketId,
      toolBoardLogId: toolSelected.toolBoardLogId,
      assignee: type === "assignee" ? data?.regId : null,
      dueDate:
        type === "dueDate" ? formattedDueDate : toolSelected.dueDate || null,
      dueDateChangeReason: type === "dueDate" && data?.description !==undefined ? data?.description : null,
    },
  ];
};

export default buildUpdatedTools;

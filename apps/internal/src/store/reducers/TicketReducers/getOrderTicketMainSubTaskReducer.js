
export const initialTaskDetailState = {
  mainTaskList: [],
  subTaskList: [],
  loading: false,
  error: null,
};

export const getOrderTicketMainSubTaskReducer = (state, action) => {
  switch (action?.type) {
    case "SET_MAIN_TASK_LIST":
      return { ...state, mainTaskList: action.payload };
    case "SET_SUB_TASK_LIST":
      return { ...state, subTaskList: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "UPDATE_KANBAN_TICKETS": {
      const { actionType, level, ticket, fromLabelId, toLabelId } = action.payload;

      const listType = level === "MAIN" ? "mainTaskList" : "subTaskList";
      
      const updatedList = updateKanbanStages(
        level,
        state[listType],
        actionType,
        ticket,
        fromLabelId,
        toLabelId
      );

      return { ...state, [listType]: updatedList };
    }

    default:
      return state;
  }
};

function updateKanbanStages(level, list, actionType, ticket, oldLabelId, newLabelId) {
  if (!Array.isArray(list)) return list;
  if (!ticket || !ticket.orderId) return list;

  const calculateToolCount = (stage) =>{
    return stage.ticketList?.reduce((sum, t) => {
      if (t.toolList === null) {
        return sum;
      }
      const perTicketToolCount = t.toolList?.reduce(
        (toolSum, flow) => toolSum + (flow.listOfTools?.length || 0),
        0
      );
      return sum + (perTicketToolCount || 0);
    }, 0) || 0;
  }
  
  const calculateTicketCount = (stage) => stage.ticketList?.length || 0;

  switch (actionType) {
    /** --------------------------------------------------
     * ADD - Add new ticket or replace existing
     * -------------------------------------------------- */
    case "ADD":
      return list.map((stage) => {
        if (stage.labelId !== ticket.labelId) return stage;

        // Remove any duplicate by orderId
        const filtered = stage?.ticketList?.filter(
          (t) => t.orderId !== ticket.orderId
        ) || [];
        const updatedTicketList = [ticket, ...(filtered || [])];

        const updatedStage = {
          ...stage,
          ticketList: updatedTicketList,
          total_tickets_count: calculateTicketCount({ ticketList: updatedTicketList }),
        };
        if (level === "SUB") {
          updatedStage.total_tools_count = calculateToolCount({ ticketList: updatedTicketList });
        }
        
        return updatedStage;
      });

    /** --------------------------------------------------
     * UPDATE - Replace existing ticket if exists
     * -------------------------------------------------- */
    case "UPDATE":
      return list.map((stage) => {
        if (stage.labelId !== ticket.labelId) return stage;

        const exists = stage?.ticketList?.some(
          (t) => t.orderId === ticket.orderId
        );
        // if (!exists) return stage; // ignore duplicates / invalid updates

        let updatedTicketList;
        let totalTicketCount = 0;

        if (exists) {
          // Merge with existing ticket
          updatedTicketList = stage?.ticketList?.map((t) => {
            if (t.orderId !== ticket.orderId) return t;

            /** Check tool exist */
            const noTools =
              !ticket.toolList ||
              ticket.toolList.some(flow =>
                flow.listOfTools === null ||
                (Array.isArray(flow.listOfTools) && flow.listOfTools.length === 0)
              );
              
            if(noTools) return t; 

                
            // Merge updated fields deeply
            const mergedTicket = {
              ...t,
              ...ticket,
              // If toolList exists, merge it properly instead of replacing
              toolList: (()=>{
                // CASE 1: No incoming toolList → keep existing
                if (!ticket.toolList) return t.toolList;

                // CASE 2: No existing toolList → use incoming fully
                if (!t.toolList || t.toolList.length === 0) return ticket.toolList;

                // CASE 3: Merge deeply (existing + incoming)
                const mergedFlows = t.toolList.map((flow) => {
                  const updatedFlow = ticket.toolList.find(
                    (f) => Number(f.flowId) === Number(flow.flowId)
                  );
                  if (!updatedFlow) return flow;

                  // Merge tool-level updates
                  const updatedTools = flow.listOfTools?.map((tool) => {
                    const incomingTool = updatedFlow.listOfTools?.find(
                      (it) => it.toolTicketId === tool.toolTicketId
                    );
                    return incomingTool ? { ...tool, ...incomingTool } : tool;
                  }) || [];

                  // Add new tools (if any)
                  const newTools = updatedFlow.listOfTools?.filter(
                    (incomingTool) =>
                      !flow.listOfTools?.some(
                        (t) => t.toolTicketId === incomingTool.toolTicketId
                      )
                  ) || [];

                  return {
                    ...flow,
                    listOfTools: [...updatedTools, ...newTools],
                  };
                })

                // --- ADD NEW FLOWS NOT PRESENT IN EXISTING ---
                const newFlows = ticket.toolList.filter(
                  (incomingFlow) =>
                    !t.toolList.some(
                      (existingFlow) =>
                        Number(existingFlow.flowId) === Number(incomingFlow.flowId)
                    )
                );

                return [...mergedFlows, ...newFlows];
              })()
            };

            return mergedTicket;
          });
        } else {
          // New ticket appeared (assigned or newly visible)
          updatedTicketList = [ticket, ...(stage?.ticketList || [])];
          totalTicketCount = stage.total_tickets_count + 1;
        }

        const updatedStage = {
          ...stage,
          ticketList: updatedTicketList,
          total_tickets_count: totalTicketCount > 0 ? totalTicketCount : stage.total_tickets_count,
        };

        if (level === "MAIN") {
          updatedStage.total_tools_count = updatedTicketList.length;
        /*} else if (level === "SUB") {          
          updatedStage.total_tools_count = updatedTicketList.reduce((sum, ticket) => {
            if (ticket.toolList === null) {
              return sum;
            }
            const perTicketToolCount = ticket.toolList?.reduce(
              (toolSum, flow) => toolSum + (flow.listOfTools?.length || 0),
              0
            );
            return sum + (perTicketToolCount || 0);
          }, 0);
        }*/
        } else if (level === "SUB" || level === "TASK") {
          let addedToolCount = 0;

          if (!exists) {
            // CASE 1: Ticket did not exist earlier → add all tools
            addedToolCount = calculateToolCount({ ticketList: [ticket] });

          } else {
            // CASE 2: Ticket exists → calculate only NEW flows / NEW tools
            const existingTicket = stage?.ticketList?.find(t => t.orderId === ticket.orderId);

            const existingFlows = existingTicket?.toolList || [];

            ticket.toolList?.forEach((incomingFlow) => {
              const matchFlow = existingFlows.find(f => Number(f.flowId) === Number(incomingFlow.flowId));

              if (!matchFlow) {
                // Entire new flow → add all its tools
                addedToolCount += (incomingFlow.listOfTools?.length || 0);
              } else {
                // Flow exists → check new tools
                const existingTools = matchFlow.listOfTools?.map(t => t.toolTicketId) || [];

                const newTools = incomingFlow.listOfTools?.filter(
                  (tool) => !existingTools.includes(tool.toolTicketId)
                ) || [];

                addedToolCount += newTools.length;
              }
            });
          }

          updatedStage.total_tools_count = stage.total_tools_count + addedToolCount;
        }


        return updatedStage;
      });

    /** --------------------------------------------------
     * MOVE - Handle both MAIN and SUB level moves
     * -------------------------------------------------- */
    case "MOVE": {
      if (level === "MAIN") {
        return list.map((stage) => {

          const actualOldLabelId =
          oldLabelId && oldLabelId !== 0
            ? oldLabelId
            : list.find((s) =>
                s.ticketList?.some((t) => t.orderId === ticket.orderId)
              )?.labelId;
              
          // Remove from old label
          if (stage.labelId === actualOldLabelId) {
            const exists = stage?.ticketList?.some(
              (t) => t.orderId === ticket.orderId
            );
            if (!exists) return stage;

            const updatedTicketList = stage?.ticketList?.filter(
              (t) => t.orderId !== ticket.orderId
            );
            const updatedStage = {
              ...stage,
              ticketList: updatedTicketList,
              total_tickets_count: stage.total_ticket_count - 1, // calculateTicketCount({ ticketList: updatedTicketList }),
              total_tools_count: calculateTicketCount({ ticketList: updatedTicketList }), // same as ticket count for MAIN
            };
            return updatedStage;
          }

          // Add or update in new label
          if (stage.labelId === newLabelId) {
            const existing = stage?.ticketList?.find(
              (t) => t.orderId === ticket.orderId
            );

            if (existing) {
              // Replace existing ticket (idempotent move)
              const updateExistingList = stage?.ticketList?.map((t) => t.orderId === ticket.orderId ? ticket : t );
              return {
                ...stage,
                ticketList: updateExistingList,
                total_tickets_count: calculateTicketCount({ ticketList: updateExistingList }),
                total_tools_count: calculateTicketCount({ ticketList: updateExistingList }),
              };
            }

            const updatedTicketList = [ticket, ...(stage?.ticketList || [])];
            const updatedStage = {
              ...stage,
              ticketList: updatedTicketList,
              total_tickets_count: calculateTicketCount({ ticketList: updatedTicketList }),
              total_tools_count: calculateTicketCount({ ticketList: updatedTicketList }),
            };
            return updatedStage;
          }

          return stage;
        });
      }

      /** --------------------------------------------
       * SUB Level Move (partial tool movement)
       * -------------------------------------------- */
      if (level === "SUB" || level === "TASK") {
        return list.map((stage) => {

          const hasValidToolList =
            Array.isArray(ticket?.toolList) &&
            ticket.toolList.length > 0 &&
            ticket.toolList.some(
              flow =>
                Array.isArray(flow.listOfTools) &&
                flow.listOfTools.length > 0
          );
          
          // --- REMOVE from old stage ---
          if (stage.labelId === oldLabelId) {
            const updatedTicketList = stage?.ticketList
              .map((t) => {
                if (t.orderId !== ticket.orderId) return t;

                // Remove moved tools
                const remainingToolList = t.toolList.map((flow) => ({
                  ...flow,
                  listOfTools: flow.listOfTools?.filter(
                    (tool) =>
                      !ticket.toolList?.some((movedFlow) =>
                        movedFlow.listOfTools?.some(
                          (movedTool) =>
                            movedTool.toolTicketId === tool.toolTicketId
                        )
                      )
                  ),
                }));

                // Keep only non-empty flows
                const nonEmptyFlows = remainingToolList.filter(
                  (f) => f.listOfTools.length > 0
                );

                return { ...t, toolList: nonEmptyFlows };
              })
              // Remove ticket entirely if no tools left
              .filter((t) => t.toolList && t.toolList.length > 0);

            return {
              ...stage,
              ticketList: updatedTicketList,
              total_tickets_count: updatedTicketList.length - 1, // not a major change - utilized only on MAIN level
              total_tools_count: stage.total_tools_count - calculateToolCount({ ticketList: [ticket] }),
            };
          }

          // --- ADD / MERGE to new stage ---
          if (stage.labelId === newLabelId) {
            const existingTicket = stage?.ticketList?.find(
              (t) => t.orderId === ticket.orderId
            );
            let updatedTicketList;

            if (existingTicket) {
              // Merge tools into existing flows (append if same flowId)
                  const existingFlows = existingTicket?.toolList?.map((flow) => {
                const movedFlow = ticket?.toolList?.find(
                  (mf) => Number(mf.flowId) === Number(flow.flowId)
                );

                if (movedFlow && Array.isArray(movedFlow.listOfTools) && movedFlow.listOfTools.length > 0) {
                  // Avoid duplicates before appending
                  const existingToolIds = new Set(
                    flow?.listOfTools?.map((tool) => tool.toolTicketId)
                  );

                  const mergedTools = [
                    ...flow.listOfTools,
                    ...movedFlow?.listOfTools?.filter(
                      (tool) => !existingToolIds.has(tool.toolTicketId)
                    ),
                  ];

                  return { ...flow, listOfTools: mergedTools };
                }

                return flow;
              });

              // Add new flows that didn’t exist before
              // const newFlows = ticket.toolList.filter(
              //   (mf) =>
              //     !existingFlows.some(
              //       (ef) => Number(ef.flowId) === Number(mf.flowId)
              //     )
              // );
              const newFlows = ticket?.toolList?.filter((mf) =>
                mf.listOfTools &&
                Array.isArray(mf.listOfTools) &&
                mf.listOfTools.length > 0 &&

                // must also not exist in existing flows
                !existingFlows.some((ef) => Number(ef.flowId) === Number(mf.flowId))
              );

              const mergedToolList = [...existingFlows, ...newFlows];

              updatedTicketList = stage?.ticketList?.map((t) =>
                t.orderId === ticket.orderId ? { ...t, toolList: mergedToolList } : t
              );

              return {
                ...stage,
                ticketList: updatedTicketList,
                // total_tickets_count: updatedTicketList.length,
                // total_tools_count: calculateToolCount({ ticketList: updatedTicketList }),
                total_tools_count: stage.total_tools_count + calculateToolCount({ ticketList: [ticket] }),                
              };

            } else {
              // Ticket doesn’t exist in this stage → prepend to top
              // updatedTicketList = [ticket, ...(hasValidToolList? stage.ticketList : [] || [])];

              // ------------------------
              // CASE 2: New Ticket
              // Only add if toolList has actual tools
              // ------------------------
              if (!hasValidToolList) {
                // incoming has no tools → DO NOT add
                return stage;
              }

              // incoming has tools → add at top
              const updatedTicketList = [ticket, ...(stage?.ticketList || [])];

              return {
                ...stage,
                ticketList: updatedTicketList,
                total_tickets_count: stage.total_tickets_count + 1,
                total_tools_count: stage.total_tools_count + calculateToolCount({ ticketList: [ticket] }),
              };
              
            }
          }

          return stage;
        });
      }

      return list;
    }

    /** --------------------------------------------------
     * REMOVE - Remove existing ticket tool if exists
     * -------------------------------------------------- */
    case "REMOVE": {
      if (level === "SUB" || level === "TASK") {
        return list.map(stage => {

          if (stage.labelId !== ticket.labelId) return stage;

          let totalRemovedTools = 0;

          const updatedTicketList = stage?.ticketList
            .map(t => {
              if (t.orderId !== ticket.orderId) return t;

              // Loop through flows and remove incoming tools
              const updatedFlows = t?.toolList
                .map(flow => {
                  const incomingFlow = ticket?.toolList?.find(
                    f => Number(f.flowId) === Number(flow.flowId)
                  );

                  if (!incomingFlow) return flow;

                  // count matched tools before removal
                  const removedCount = flow?.listOfTools?.filter(tool =>
                    incomingFlow.listOfTools.some(rm => rm.toolTicketId === tool.toolTicketId)
                  ).length;

                  totalRemovedTools += removedCount;

                  // Remove ONLY the incoming tools
                  const remainingTools = flow?.listOfTools?.filter(
                    tool =>
                      !incomingFlow.listOfTools.some(
                        rm => rm.toolTicketId === tool.toolTicketId
                      )
                  );

                  return { ...flow, listOfTools: remainingTools };
                })
                // Remove empty flows
                .filter(flow => flow?.listOfTools?.length > 0);

              return {
                ...t,
                toolList: updatedFlows
              };
            })
            // Remove ticket entirely if no flows remain
            .filter(t => t?.toolList && t?.toolList?.length > 0);
// console.log("REMOVE updatedTicketList", { stage, updatedTicketList, totalRemovedTools });
          return {
            ...stage,
            ticketList: updatedTicketList,
            total_tickets_count: stage?.total_tickets_count,
            total_tools_count: totalRemovedTools > 0 ? stage?.total_tools_count - totalRemovedTools : stage?.total_tools_count,
          };
        });
      }

      return list;
    }

    default:
      return list;
  }
}

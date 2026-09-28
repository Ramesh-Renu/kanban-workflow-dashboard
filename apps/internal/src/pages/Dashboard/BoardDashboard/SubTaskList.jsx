import { createColumnHelper } from "@tanstack/react-table";
import { getStageTimeTracking, updateSubtaskTool, subTaskMoveTool } from "services";
import { classNames } from "@euroland/libs";
import Table from "components/common/Table";
import dayjs from "dayjs";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import { getDueDateColor } from "utils/common";
import { getDueTaskStatus, DASHBOARD_ROUTES } from "utils/dashboard";
import { IOD_WORKSPACE_ID } from "utils/kanbanRoutes";
import { useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { parseProgressValue, getProgressBarColor } from "utils/progress";
import { PopupModal, useToast, useGlobalMaster } from "@orion/shared";
import { closeIcon } from "assets/images";
import SubTaskProgressTimeTracking from "./SubTaskProgressTimeTracking";
import useAuth from "hooks/useAuth";
import ToolAssignMember from "components/kanban/KebabMenu/ToolAssignMember";
import MoveToMenu from "components/kanban/KebabMenu/MoveToMenu";
import TaskMovetoMenu from "components/kanban/KebabMenu/TaskMovetoMenu";

const SubTaskList = ({
  companyData,
  onClose,
  companyName,
  selectWorkspaceDashboard,
  loading,
  selectedCompanyData,
  boardType,
  orderId,
  variant = "default",
  orderToolsPageOffset,
  orderToolsPageSize,
  taskPriorityList,
  freeFlowLabelList,
  onDashboardSoftRefresh,
}) => {
  const columnHelper = createColumnHelper();
  const navigate = useNavigate();
  const isEmbedded = variant === "embedded";
  const isIodWorkspace = Number(selectWorkspaceDashboard) === IOD_WORKSPACE_ID;
  const isTaskWorkflow = !isIodWorkspace;
  const entityLabel = isIodWorkspace ? "Tools" : "Task";
  const entityLabelSingular = isIodWorkspace ? "Tool" : "Task";
  const [summary, setSummary] = useState([]);
  const [showTimeTrackingModal, setShowTimeTrackingModal] = useState(false);
  const [selectedTrackingData, setSelectedTrackingData] = useState(null);
  const [{ data: auth }] = useAuth();
  const { showToast } = useToast();
  const {
    suggestedMembersList,
    getSuggestedMembersList,
    workFlowList,
    getWorkFlowList,
    workspaceWithBoardsList,
    getWorkspaceWithBoardsList,
  } = useGlobalMaster();

  // Fresh workspace+boards fetch once per subtask drawer open; reuse from store on stage clicks.
  useEffect(() => {
    getWorkspaceWithBoardsList({ force: true });
    if (!workFlowList?.loaded && !workFlowList?.loading) {
      getWorkFlowList({ flow_id: "" });
    }
    // Intentionally once on mount (drawer open). Close + reopen remounts and refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local copy of the rows so an assignee update can reflect immediately
  // without needing the parent to refetch the whole summary.
  const [subtaskList, setSubtaskList] = useState(companyData?.subtaskList || []);
  useEffect(() => {
    setSubtaskList(companyData?.subtaskList || []);
  }, [companyData]);

  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);
  const [assigneePosition, setAssigneePosition] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null); // { row, stageItem }
  const [selectedUser, setSelectedUser] = useState([]);
  const [assigneeApiLoading, setAssigneeApiLoading] = useState(false);
  const assigneePopupRef = useRef(null);

  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stagePosition, setStagePosition] = useState(null);
  const [moveToData, setMoveToData] = useState([]);
  const [boardStages, setBoardStages] = useState([]);
  const [resolvedFlowId, setResolvedFlowId] = useState(null);
  const [openGroups, setOpenGroups] = useState({});
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [stageApiLoading, setStageApiLoading] = useState(false);
  const stagePopupRef = useRef(null);
  const stageAnchorRectRef = useRef(null);

  const clampPopupToViewport = useCallback((anchorRect, popupEl, fallbackWidth, fallbackHeight) => {
    if (!anchorRect) return null;
    const gap = 8;
    const margin = 160;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = popupEl?.offsetWidth || fallbackWidth;
    const popupHeight = popupEl?.offsetHeight || fallbackHeight;

    let left = anchorRect.left;
    if (left + popupWidth > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - popupWidth - margin);
    }
    if (left < margin) left = margin;

    let top = anchorRect.bottom + gap;
    if (top + popupHeight > viewportHeight - margin) {
      top = Math.max(margin, anchorRect.top - popupHeight - gap);
    }
    if (top < margin) top = margin;

    return { top, left };
  }, []);

  useEffect(() => {
    if (!assigneeDialogOpen) return;
    const handleClickOutside = (event) => {
      if (
        assigneePopupRef.current &&
        !assigneePopupRef.current.contains(event.target)
      ) {
        setAssigneeDialogOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [assigneeDialogOpen]);

  useEffect(() => {
    if (!stageDialogOpen) return;
    // TaskMovetoMenu (PopupModal) manages its own close; only watch the portal popup.
    if (isTaskWorkflow && !(boardStages?.length > 0)) return;
    const handleClickOutside = (event) => {
      if (stagePopupRef.current && !stagePopupRef.current.contains(event.target)) {
        setStageDialogOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stageDialogOpen, isTaskWorkflow, boardStages?.length]);

  const openAssigneeDialog = useCallback(
    (event, row, stageItem) => {
      // Assignee editing is only available on a single-board dashboard view,
      // not on the all-workspace boards overview.
      if (boardType !== "board") return;
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      setAssigneePosition(clampPopupToViewport(rect, null, 300, 360));
      setSelectedTool({ row, stageItem });
      setSelectedUser(stageItem?.assignee || []);
      if (stageItem?.boardId) {
        getSuggestedMembersList(String(stageItem.boardId));
      }
      setAssigneeDialogOpen(true);
    },
    [boardType, getSuggestedMembersList, clampPopupToViewport],
  );

  const buildMoveToData = useCallback(
    async (row, stageItem) => {
      const currentLabelId =
        stageItem?.labelId ?? stageItem?.stage?.labelId ?? stageItem?.stage?.label_id;
      const flowId = row?.flowId ?? stageItem?.flowId ?? null;
      const boardId = stageItem?.boardId;

      let flows = workFlowList?.data || [];
      if (!flows.length) {
        const res = await getWorkFlowList({ flow_id: "" });
        flows = res?.data ?? [];
      }

      // Prefer cached getworkspacewithboards from store (fetched once when drawer opens).
      let workspaces = workspaceWithBoardsList?.data || [];
      if (!workspaces.length) {
        const wsRes = await getWorkspaceWithBoardsList();
        workspaces = wsRes?.data || [];
      }

      let matchedBoard = null;
      let matchedWorkspace = null;
      try {
        for (const workspace of workspaces) {
          matchedBoard = (workspace?.boards || []).find(
            (board) => String(board.boardId) === String(boardId),
          );
          if (matchedBoard) {
            matchedWorkspace = workspace;
            break;
          }
        }
        setBoardStages(matchedBoard?.labels || []);
      } catch {
        matchedBoard = null;
        setBoardStages([]);
      }

      const flow =
        (flowId != null && flows.find((f) => String(f.flow_id) === String(flowId))) ||
        flows.find((f) =>
          f.flow_detail?.some(
            (detail) => String(detail.source?.label_id) === String(currentLabelId),
          ),
        );

      // Dashboard subtask rows often omit flowId; keep the matched workflow id for the move API.
      const matchedFlowId = flow?.flow_id ?? flowId ?? null;
      setResolvedFlowId(matchedFlowId);

      const value = isTaskWorkflow
        ? flow?.flow_detail
            ?.filter((detail) => String(detail.source?.board_id) === String(boardId))
            ?.map(({ action_id, action_name, targets, source }) => ({
              action_id,
              action_name,
              targets,
              source,
              flow_id: matchedFlowId,
            })) || []
        : flow?.flow_detail
            ?.filter(
              (detail) => String(detail.source?.label_id) === String(currentLabelId),
            )
            ?.map(({ action_id, action_name, targets, source }) => ({
              action_id,
              action_name,
              targets,
              source,
              flow_id: matchedFlowId,
            })) || [];

      if (isTaskWorkflow) {
        const workspaceWiseData = Object.values(
          value
            .flatMap((item) => item.targets || [])
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

              const existingBoard = acc[workspace_id].boards.find(
                (b) => b.board_id === board_id && b.label_id === label_id,
              );

              if (!existingBoard) {
                acc[workspace_id].boards.push({
                  board_id,
                  label_id,
                  board_name,
                  label_name,
                  unassigned,
                  emailnotify,
                  flow_id: matchedFlowId,
                });
              } else {
                existingBoard.emailnotify ||= emailnotify;
                existingBoard.flow_id ??= matchedFlowId;
              }

              return acc;
            }, {}),
        );

        // Freeflow / task boards: Kanban allows move to any stage on the same board
        // even when workflow targets are empty — synthesize from board labels.
        if (!workspaceWiseData.length && matchedBoard?.labels?.length) {
          const savedWorkSpaceState = localStorage.getItem("workspaceState");
          const parsedWorkSpaceState = savedWorkSpaceState
            ? JSON.parse(savedWorkSpaceState)
            : {};
          const activeWorkSpace = parsedWorkSpaceState?.activeWorkSpace?.[0];
          const workspaceId =
            matchedWorkspace?.workspaceId ??
            matchedWorkspace?.work_space_id ??
            activeWorkSpace?.work_space_id;
          const workspaceName =
            matchedWorkspace?.name ?? activeWorkSpace?.name ?? "";

          setMoveToData([
            {
              workspace_id: workspaceId,
              workspace_name: workspaceName,
              boards: matchedBoard.labels.map((label) => ({
                board_id: boardId,
                board_name: matchedBoard?.name || stageItem?.boardName,
                label_id: label.labelId,
                label_name: label.name,
                unassigned: false,
                emailnotify: true,
                flow_id: null,
              })),
            },
          ]);
        } else {
          setMoveToData(workspaceWiseData);
        }
      } else {
        setMoveToData(value);
      }
    },
    [
      getWorkFlowList,
      getWorkspaceWithBoardsList,
      isTaskWorkflow,
      workFlowList?.data,
      workspaceWithBoardsList?.data,
    ],
  );

  const openStageMoveDialog = useCallback(
    async (event, row, stageItem) => {
      if (boardType !== "board") return;
      event.stopPropagation();
      setAssigneeDialogOpen(false);
      const rect = event.currentTarget.getBoundingClientRect();
      stageAnchorRectRef.current = rect;
      const nextPosition = clampPopupToViewport(rect, null, 320, 280);
      setStagePosition(nextPosition);
      setSelectedTool({ row, stageItem });
      setOpenGroups({});
      setLoadingActionId(null);
      setResolvedFlowId(null);
      setMoveToData([]);
      setStageDialogOpen(true);
      await buildMoveToData(row, stageItem);
    },
    [boardType, buildMoveToData, clampPopupToViewport],
  );

  useLayoutEffect(() => {
    if (!stageDialogOpen || !stageAnchorRectRef.current) return;
    const nextPosition = clampPopupToViewport(
      stageAnchorRectRef.current,
      stagePopupRef.current,
      320,
      280,
    );
    if (!nextPosition) return;
    setStagePosition((prev) => {
      if (
        prev &&
        Math.abs(prev.top - nextPosition.top) < 1 &&
        Math.abs(prev.left - nextPosition.left) < 1
      ) {
        return prev;
      }
      return nextPosition;
    });
  }, [stageDialogOpen, moveToData, boardStages, clampPopupToViewport]);

  const toggleGroup = useCallback((id) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleStageMove = useCallback(
    async (data, preferredLabelId = null) => {
      if (!data || !selectedTool?.row || !selectedTool?.stageItem) return;

      const row = selectedTool.row;
      const stageItem = selectedTool.stageItem;
      const currentLabelId =
        stageItem?.labelId ?? stageItem?.stage?.labelId ?? stageItem?.stage?.label_id;
      const currentBoardId = stageItem?.boardId;
      const toolTicketId = isTaskWorkflow
        ? row?.ticketToolId ?? row?.toolTicketId ?? stageItem?.ticketToolId ?? stageItem?.toolTicketId
        : row?.ticketToolId ?? row?.toolTicketId ?? stageItem?.ticketToolId ?? stageItem?.toolTicketId;
      const flowId =
        data?.flow_id ??
        resolvedFlowId ??
        row?.flowId ??
        stageItem?.flowId ??
        null;
      const hasAssignee = Array.isArray(stageItem?.assignee) && stageItem.assignee.length > 0;

      if (isTaskWorkflow && !hasAssignee) {
        showToast({
          message: `Assign someone to the selected "${entityLabelSingular}" before moving!`,
          variant: "danger",
        });
        return;
      }

      if (toolTicketId == null || toolTicketId === "") {
        showToast({
          message: "Missing tool ticket id. Unable to move stage.",
          variant: "danger",
        });
        return;
      }

      if (!isTaskWorkflow && (flowId == null || flowId === "")) {
        showToast({
          message: "No workflow found for this stage. Unable to move.",
          variant: "danger",
        });
        return;
      }

      setLoadingActionId(isTaskWorkflow ? data.board_id : data.action_id);
      setStageApiLoading(true);

      const savedWorkSpaceState = localStorage.getItem("workspaceState");
      const parsedWorkSpaceState = savedWorkSpaceState
        ? JSON.parse(savedWorkSpaceState)
        : {};
      const activeWorkSpace = parsedWorkSpaceState?.activeWorkSpace?.[0];

      const targetOnCurrentBoard = isTaskWorkflow
        ? data?.board_id
        : data?.targets?.find(
            (item) =>
              String(item.board_id) === String(currentBoardId) &&
              (preferredLabelId == null ||
                String(item.label_id) === String(preferredLabelId)),
          ) ||
          data?.targets?.find(
            (item) => String(item.board_id) === String(currentBoardId),
          ) ||
          (preferredLabelId != null
            ? data?.targets?.find(
                (item) => String(item.label_id) === String(preferredLabelId),
              )
            : null);

      const updatedParam = isTaskWorkflow
        ? {
            boardId: currentBoardId,
            toolTicketId: [toolTicketId],
            flowId: null,
            isMoved: false,
            actionId: null,
            isTaskWorkFlow: true,
            flowDetail: {
              source: {
                board_id: currentBoardId,
                board_name: stageItem?.boardName,
                label_id: currentLabelId,
                label_name: stageItem?.stage?.name,
                workspace_id: activeWorkSpace?.work_space_id,
                workspace_name: activeWorkSpace?.name,
              },
              targets: {
                board_id: data?.board_id,
                board_name: data?.board_name,
                label_id: data?.label_id,
                label_name: data?.label_name,
                unassigned: data.unassigned,
                emailnotify: true,
                workspace_id: data?.workspace_id,
                workspace_name: data?.workspace_name,
              },
            },
          }
        : {
            boardId: currentBoardId,
            toolTicketId: [toolTicketId],
            flowId,
            isMoved: targetOnCurrentBoard ? false : true,
            actionId: data?.action_id,
            isTaskWorkFlow: false,
            flowDetail: null,
          };

      try {
        const response = await subTaskMoveTool(updatedParam);
        if (response?.data?.status) {
          showToast({
            message: response?.data?.message || "Stage moved successfully",
            variant: "success",
          });

          const nextLabelId = isTaskWorkflow
            ? data?.label_id
            : targetOnCurrentBoard?.label_id ?? data?.targets?.[0]?.label_id;
          const nextLabelName = isTaskWorkflow
            ? data?.label_name
            : targetOnCurrentBoard?.label_name ?? data?.targets?.[0]?.label_name;
          const nextBoardName = isTaskWorkflow
            ? data?.board_name
            : targetOnCurrentBoard?.board_name ?? data?.targets?.[0]?.board_name;
          const matchedBoardStage = boardStages.find(
            (label) => String(label.labelId) === String(nextLabelId),
          );

          setSubtaskList((prev) =>
            prev.map((item) => {
              if (item !== row) return item;
              return {
                ...item,
                activeStages: item.activeStages?.map((stg) =>
                  stg === stageItem
                    ? {
                        ...stg,
                        labelId: nextLabelId,
                        boardName: nextBoardName || stg.boardName,
                        stage: {
                          ...stg.stage,
                          labelId: nextLabelId,
                          name: nextLabelName || matchedBoardStage?.name || stg.stage?.name,
                          colorCode:
                            matchedBoardStage?.color_Code ||
                            matchedBoardStage?.colorCode ||
                            stg.stage?.colorCode,
                        },
                      }
                    : stg,
                ),
              };
            }),
          );

          setStageDialogOpen(false);
          // Soft-refresh background dashboard (heatmap + KPI) without remounting the modal.
          onDashboardSoftRefresh?.();
        } else {
          showToast({
            message: response?.data?.message || "Failed to move stage",
            variant: "danger",
          });
        }
      } catch (error) {
        showToast({
          message: error?.message || "Failed to move stage",
          variant: "danger",
        });
      } finally {
        setLoadingActionId(null);
        setStageApiLoading(false);
      }
    },
    [
      boardStages,
      isTaskWorkflow,
      onDashboardSoftRefresh,
      resolvedFlowId,
      selectedTool,
      showToast,
    ],
  );

  // Same payload shape as KebabMenu/KanbanCard's updateTool - toolBoardLogId
  // and labelId come from whatever the row/stage actually carries.
  const handleAssigneeUpdate = useCallback(
    async (type, data, flowData, toolSelected) => {
      if (!flowData || !toolSelected) return;
      const updatedTools = [
        {
          toolTicketId: flowData?.ticketToolId ?? flowData?.toolTicketId ?? flowData?.toolId,
          // Same fallback chain as OrderView/ToolsInfo/index.jsx's
          // updateSubTask - toolBoardLogId can live on the row itself or on
          // the specific stage entry, depending on the API response.
          toolBoardLogId: flowData?.toolBoardLogId ?? toolSelected?.toolBoardLogId ?? null,
          assignee: data?.regId || null,
          dueDate: flowData?.dueDate || null,
        },
      ];

      const updateParam = {
        ticketId: orderId,
        boardId: toolSelected?.boardId,
        labelId: toolSelected?.labelId ?? toolSelected?.stage?.labelId ?? null,
        isAssignee: true,
        isDueDate: false,
        toolDetail: updatedTools,
      };

      setAssigneeApiLoading(true);
      try {
        const response = await updateSubtaskTool(updateParam);
        if (response?.data?.status) {
          showToast({
            message: response?.data?.message || "Assignee updated",
            variant: "success",
          });
          setSelectedUser(data ? [data] : []);
          setSubtaskList((prev) =>
            prev.map((item) => {
              if (item !== flowData) return item;
              const assigneeName = data?.displayName || data?.name || "";
              return {
                ...item,
                activeStages: item.activeStages?.map((stg) =>
                  stg === toolSelected
                    ? {
                        ...stg,
                        assignee: data
                          ? [
                              {
                                name: assigneeName,
                                displayName: assigneeName,
                                photo: data?.photo || data?.photoUrl || null,
                                regId: data?.regId,
                              },
                            ]
                          : [],
                      }
                    : stg,
                ),
              };
            }),
          );
          setAssigneeDialogOpen(false);
        } else {
          showToast({
            message: response?.data?.message || "Failed to update assignee",
            variant: "danger",
          });
        }
      } catch (error) {
        showToast({
          message: error?.message || "Failed to update assignee",
          variant: "danger",
        });
      } finally {
        setAssigneeApiLoading(false);
      }
    },
    [orderId, showToast],
  );
  const handleShowTimeTracking = useCallback(
    async (row) => {
      if (!orderId) return;
      const response = await getStageTimeTracking({
        regId: auth?.details?.regId,
        ticket_id: orderId,
        tool_ticket_id: row?.ticketToolId,
      });
      setSelectedTrackingData(response?.data?.data);
      setShowTimeTrackingModal(true);
    },
    [companyData.ticketId, auth?.details?.regId],
  );

  const handleCloseTimeTracking = useCallback(() => {
    setShowTimeTrackingModal(false);
    setSelectedTrackingData(null);
  }, []);

  const timeTrackingModal = (
    <PopupModal
      show={showTimeTrackingModal}
      onClose={handleCloseTimeTracking}
      header={false}
      size="xl"
      customClassName="order-tools-subtask-modal__dialog"
      className="order-tools-subtask-modal__body"
    >
      <div className="order-tools-subtask-panel">
        <button
          type="button"
          className="order-tools-subtask-panel__close"
          onClick={handleCloseTimeTracking}
          aria-label="Close time tracking"
        >
          <img
            src={closeIcon}
            alt="close icon"
            className="dashboard-chart-panel__modal-close-icon"
          />
        </button>
        <SubTaskProgressTimeTracking
          trackingData={selectedTrackingData}
          title={entityLabelSingular}
        />
      </div>
    </PopupModal>
  );

  useEffect(() => {
    if (companyData) {
      setSummary([
        {
          title: `Total ${entityLabel}`,
          count: companyData?.taskCount || 0,
        },
        { title: `Completed`, count: companyData?.completedCount || 0 },
        { title: `Active`, count: companyData?.activeCount || 0 },
        { title: `Overdue`, count: companyData?.overdueCount || 0 },
      ]);
    } else {
      setSummary([]);
    }
  }, [companyData, entityLabel]);

  const viewSubTaskInfo = useCallback(
    (row, boardId, selectedCompanyData) => {
      const path = `${DASHBOARD_ROUTES.details(boardId, orderId)}?${isIodWorkspace ? "toolId" : "taskId"}=${
        isIodWorkspace ? row?.toolId : row?.ticketToolId
      }`;
      navigate(path, {
        state: {
          from: "dashboard",
          boardType,
          workSpaceId: selectWorkspaceDashboard,
          ticketId: Number(selectedCompanyData?.ticketId),
          pageSize: orderToolsPageSize,
          pageOffset: orderToolsPageOffset,
        },
      });
    },
    [
      boardType,
      navigate,
      orderId,
      isIodWorkspace,
      selectWorkspaceDashboard,
      orderToolsPageSize,
      orderToolsPageOffset,
    ],
  );

  const toolColumns = useMemo(() => {
    const canEditAssignee = boardType === "board";
    const assigneeColumn = columnHelper.accessor("currentAssignee", {
      header: () => <span>Assignee</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div key={index}>
                {item?.assignee?.length > 0 ? (
                  item?.assignee.map((assignee, idx) => (
                    <div
                      key={idx}
                      className="py-1 tools_info_board_stage d-flex avatars"
                      role={canEditAssignee ? "button" : undefined}
                      tabIndex={canEditAssignee ? 0 : undefined}
                      onClick={
                        canEditAssignee
                          ? (e) => openAssigneeDialog(e, info.row.original, item)
                          : undefined
                      }
                      style={canEditAssignee ? undefined : { cursor: "default" }}
                    >
                      <LogoAvatarShowLetter
                        genaralData={{
                          ...assignee,
                          name: assignee?.name || assignee?.displayName || "",
                          photo: assignee?.photo || assignee?.photoUrl || null,
                        }}
                        profileName={"name"}
                        profilePhotoName={"photo"}
                        outerClassName={"avatars__item stage_Badge"}
                        innerClassName={"avatars__img"}
                      ></LogoAvatarShowLetter>
                    </div>
                  ))
                ) : (
                  <div
                    className="py-1 tools_info_board_stage d-flex avatars"
                    role={canEditAssignee ? "button" : undefined}
                    tabIndex={canEditAssignee ? 0 : undefined}
                    onClick={
                      canEditAssignee
                        ? (e) => openAssigneeDialog(e, info.row.original, item)
                        : undefined
                    }
                    style={canEditAssignee ? undefined : { cursor: "default" }}
                  >
                    <span className="circle-badge stage_Badge">N/A</span>
                  </div>
                )}
              </div>
            );
          })
        );
      },
      canSort: false,
    });
    const dueDateColumn = columnHelper.accessor("dueDate", {
      header: () => <span>Due Date</span>,
      cell: (info) => {
        const activeStages = info.row.original.activeStages;
        const isLastStage =
          activeStages.length > 0
            ? activeStages.every((d) => d.isStageCompleted)
            : activeStages.length == 1
              ? activeStages[0].isStageCompleted
              : false;
        return (
          <div
            style={{
              color: getDueDateColor(info.getValue(), isLastStage),
            }}
          >
            {" "}
            {info.getValue() ? dayjs(info.getValue()).format("MMM DD, YYYY") : "---"}
          </div>
        );
      },
      canSort: false,
    });
    const progressColumn = columnHelper.accessor("progressPercentage", {
      header: () => <span className="order_orion_header">Progress</span>,
      cell: (info) => {
        const row = info.row.original;
        const progressValue = parseProgressValue(row.progress ?? row.progressPercentage);

        if (progressValue === null) {
          return (
            <button
              type="button"
              className="order-tools-progress order-tools-progress--empty order-tools-progress--clickable"
              onClick={() => handleShowTimeTracking(row)}
            >
              ---
            </button>
          );
        }

        const isOngoing = row.stageDurationOngoing === true;
        const fillColor = isOngoing
          ? getProgressBarColor(progressValue)
          : "var(--color-icon-green)";
        const isComplete = progressValue >= 100;

        return (
          <button
            type="button"
            className="order-tools-progress order-tools-progress--clickable"
            onClick={() => handleShowTimeTracking(row)}
            aria-label={`View time tracking for ${row.toolName !== null && row.toolName !== undefined ? row.toolName : row.subTaskName !== null && row.subTaskName !== undefined ? row.subTaskName : "subtask"}`}
          >
            <div className="order-tools-progress__track">
              <div
                className="order-tools-progress__fill"
                style={{ width: `${progressValue}%`, backgroundColor: fillColor }}
              />
            </div>
            <span
              className={classNames("order-tools-progress__label", {
                "order-tools-progress__label--complete": isComplete && isOngoing,
              })}
              style={isComplete || !isOngoing ? { color: fillColor } : undefined}
            >
              {progressValue}%
            </span>
          </button>
        );
      },
      canSort: false,
    });
    const timeColumn = columnHelper.accessor("toolOverallTime", {
      header: () => <span className="order_orion_header">Total Time</span>,
      cell: (info) => {
        const value = info.getValue();
        return <span>{value || "---"}</span>;
      },
      canSort: false,
    });
    const priorityColumn =
      !isIodWorkspace
        ? columnHelper.accessor("priorityId", {
            header: () => <span className="order_orion_header">{"Priority"}</span>,
            cell: (info) => {
              const priorityIds =
                info.row.original?.priorityId?.map((item) => item?.id) || [];
              const matched = taskPriorityList?.filter((item) =>
                Array.isArray(priorityIds)
                  ? priorityIds.includes(item.status_id)
                  : priorityIds === item.status_id,
              );
              return matched?.length > 0 ? (
                <div className="labelDetails__flex-cloumn">
                  {matched.map((label, i) => (
                    <div
                      className="d-flex align-items-center gap-2 labelDetails__item"
                      style={{
                        color: label.colour_code,
                      }}
                      key={label.status_id ?? i}
                    >
                      <span
                        style={{
                          display: "block",
                          background: label.colour_code,
                          fontWeight: "500",
                          width: "8px",
                          height: "8px",
                        }}
                      >
                        &#160;
                      </span>
                      {label.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="labelDetails__flex-cloumn"> ---</div>
              );
            },
          })
        : null;
    const freeFlowLabelColumn =
      !isIodWorkspace
        ? columnHelper.accessor("freeFlowLabelId", {
            header: () => <span className="order_orion_header">{"Label"}</span>,
            cell: (info) => {
              const labelIds =
                info.row.original?.freeFlowLabelId?.map((item) => item?.id) || [];
              const matched = freeFlowLabelList?.filter((item) =>
                Array.isArray(labelIds)
                  ? labelIds.includes(item.status_id)
                  : labelIds === item.status_id,
              );

              return matched?.length > 0 ? (
                <div className="labelDetails__flex-cloumn">
                  {matched.map((label, i) => (
                    <div
                      className="d-flex align-items-center gap-2 labelDetails__item"
                      style={{
                        color: label.colour_code,
                      }}
                      key={label.status_id ?? i}
                    >
                      <span
                        style={{
                          display: "block",
                          background: label.colour_code,
                          fontWeight: "500",
                          width: "8px",
                          height: "8px",
                        }}
                      >
                        &#160;
                      </span>
                      {label.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="labelDetails__flex-cloumn"> ---</div>
              );
            },
          })
        : null;
    const workspaceColumn = columnHelper.accessor("workspaceId", {
      header: () => <span>Workspace</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div
                key={index}
                title={item?.workspaceName}
                className={`py-1 tools_info_board_stage`}
              >
                <div className="px-1 rounded py-1 w-100">{item?.workspaceName}</div>
              </div>
            );
          })
        );
      },
      canSort: false,
    });
    const boardColumn = columnHelper.accessor("board", {
      header: () => <span>Board</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div
                key={index}
                title={item?.boardName}
                className={`py-1 tools_info_board_stage`}
              >
                <div className="px-1 rounded py-1 w-100">{item?.boardName}</div>
              </div>
            );
          })
        );
      },
      canSort: false,
    });
    const stageColumn = columnHelper.accessor("activeStages", {
      header: () => <span>Stage</span>,
      cell: (info) => {
        const row = info.row.original.activeStages;
        const canMoveStage = boardType === "board";
        return (
          row?.length > 0 &&
          row.map((item, index) => {
            return (
              <div key={index} className="py-1 tools_info_board_stage d-flex justify-content-start">
                <div
                  className="px-2 rounded py-1 stage_Badge"
                  style={{
                    color: item?.stage?.colorCode,
                    border: `1px solid ${item?.stage?.colorCode}`,
                    backgroundColor: `${item?.stage?.colorCode}10`,
                    textAlign: "center",
                    cursor: canMoveStage ? "pointer" : "default",
                    display: "inline-block",
                  }}
                  title={
                    canMoveStage
                      ? `Move from ${item?.stage?.name || "stage"}`
                      : item?.stage?.name
                  }
                  role={canMoveStage ? "button" : undefined}
                  tabIndex={canMoveStage ? 0 : undefined}
                  onClick={
                    canMoveStage
                      ? (e) => openStageMoveDialog(e, info.row.original, item)
                      : undefined
                  }
                  onKeyDown={
                    canMoveStage
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openStageMoveDialog(e, info.row.original, item);
                          }
                        }
                      : undefined
                  }
                >
                  {item?.stage?.name}
                </div>
              </div>
            );
          })
        );
      },
      canSort: false,
    });
    const statusColumn = columnHelper.accessor("duestatus", {
      header: () => <span className="order_orion_header"> Status</span>,
      cell: (info) => {
        const row = info?.row?.original;
        const isLastStage =
          row?.activeStages?.length > 0
            ? row?.activeStages?.every((d) => d?.isStageCompleted)
            : row?.activeStages?.length === 1
              ? row?.activeStages?.[0]?.isStageCompleted
              : false;
        const getStatus = getDueTaskStatus(
          info?.row?.original?.dueDate,
          isLastStage,
          row?.duestatus,
        );
        return (
          <span
            className="duestatus-badge"
            style={{
              backgroundColor: getStatus?.colorCode,
              color: getStatus?.colorCode ? "#ffffff" : "#000000",
              padding: "4px 8px",
              borderRadius: "50px",
              fontSize: "12px",
              fontWeight: "500",
              lineHeight: "12px",
              verticalAlign: "middle",
              textAlign: "center",
              display: "inline-block",
            }}
          >
            {getStatus?.name || "---"}
          </span>
        );
      },
    });

    const nameColumns =
      isIodWorkspace
        ? [
            columnHelper.accessor("toolName", {
              header: () => <span>Tools</span>,
              cell: (info) => {
                const row = info.row.original;
                const boardId = row?.activeStages?.[0]?.boardId;
                return (
                  <button
                    className="py-3 d-flex align-items-center gap-2 btn btn-0"
                    type="button"
                    title={info?.getValue()}
                    onClick={() => viewSubTaskInfo(row, boardId, selectedCompanyData)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        viewSubTaskInfo(row, boardId, selectedCompanyData);
                      }
                    }}
                  >
                    {info.getValue()}
                  </button>
                );
              },
              canSort: false,
            }),
          ]
        : [
            columnHelper.accessor("subTaskName", {
              header: () => <span>Task</span>,
              cell: (info) => {
                const row = info.row.original;
                const boardId = row?.activeStages?.[0]?.boardId;
                return (
                  <button
                    className="py-3 d-flex align-items-center gap-2 btn btn-0"
                    type="button"
                    title={info?.getValue()}
                    onClick={() => viewSubTaskInfo(row, boardId, selectedCompanyData)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        viewSubTaskInfo(row, boardId, selectedCompanyData);
                      }
                    }}
                  >
                    <span
                      className={`${row?.isActive === false && "text-decoration-line-through"}`}
                    >
                      {info.getValue()}
                    </span>
                  </button>
                );
              },
              canSort: false,
            }),
          ];

    const columns = [...nameColumns];

    if (isEmbedded) {
      columns.push(
        dueDateColumn,
        progressColumn,
        timeColumn,
        ...(priorityColumn ? [priorityColumn] : []),
        ...(freeFlowLabelColumn ? [freeFlowLabelColumn] : []),
        boardColumn,
        stageColumn,
        statusColumn,
        assigneeColumn,
      );
    } else {
      columns.push(
        assigneeColumn,
        dueDateColumn,
        progressColumn,
        timeColumn,
        ...(priorityColumn ? [priorityColumn] : []),
        ...(freeFlowLabelColumn ? [freeFlowLabelColumn] : []),
        workspaceColumn,
        boardColumn,
        stageColumn,
        statusColumn,
      );
    }

    return columns;
  }, [
    boardType,
    columnHelper,
    isEmbedded,
    isIodWorkspace,
    selectWorkspaceDashboard,
    handleShowTimeTracking,
    viewSubTaskInfo,
    selectedCompanyData,
    taskPriorityList,
    freeFlowLabelList,
    openAssigneeDialog,
    openStageMoveDialog,
  ]);

  const SummaryCard = ({ title, count, showDot }) => (
    <div className="p-3 position-relative flex-fill summary-card d-flex flex-column">
      <div
        className={`count ${title === "Completed" ? "text-success" : title === "Active" ? "text-primary" : title === "Overdue" ? "text-danger" : "text-black"}`}
      >
        {count}
      </div>
      <div className="title">{title}</div>
    </div>
  );

  const tableBody = (
    <div className="sub_task_list_table__modal-dialog">
      {summary && (
        <div className="d-flex justify-content-between gap-2 mb-4 work-allocation-cards">
          {summary.map((item, index) => (
            <SummaryCard
              key={index}
              title={item.title}
              count={item.count}
              showDot={item.showDot}
            />
          ))}
        </div>
      )}

      <div
        className={classNames(
          "sub_task_list_table__modal-body",
          isEmbedded && "sub_task_list_table__modal-body--embedded",
        )}
      >
        <Table
          columns={toolColumns}
          columnData={subtaskList}
          className={classNames(
            "sub_task_list_table",
            isEmbedded && "sub_task_list_table--embedded",
          )}
          tableName={"SubInfoTable"}
          loading={loading}
          skeletonRowCount={6}
        />
      </div>
    </div>
  );

  const assigneePopup =
    assigneeDialogOpen &&
    assigneePosition &&
    createPortal(
      <div
        ref={assigneePopupRef}
        style={{
          position: "fixed",
          top: assigneePosition.top,
          left: assigneePosition.left,
          zIndex: 2000,
        }}
        className="sub_task_list_table__modal-dialog-assignee"
      >
        <ToolAssignMember
          apiLoading={assigneeApiLoading}
          flowData={selectedTool?.row}
          toolSelected={selectedTool?.stageItem}
          assigneeList={suggestedMembersList?.data || []}
          selectedUser={selectedUser}
          updateTool={handleAssigneeUpdate}
          setApiLoading={setAssigneeApiLoading}
          setOpenAssignee={setAssigneeDialogOpen}
        />
      </div>,
      document.body,
    );

  const currentStageLabelId =
    selectedTool?.stageItem?.labelId ??
    selectedTool?.stageItem?.stage?.labelId ??
    selectedTool?.stageItem?.stage?.label_id;

  const currentBoardId = selectedTool?.stageItem?.boardId;

  // Stages reachable from the current workflow actions (same rules as Kanban drop).
  // Task/freeflow boards: any stage on the current board is allowed (Kanban skips canDropCard).
  const applicableStageMoveByLabelId = useMemo(() => {
    const map = new Map();

    if (isTaskWorkflow) {
      (boardStages || []).forEach((label) => {
        if (label?.labelId == null) return;
        map.set(String(label.labelId), {
          __freeFlowTaskMove: true,
          board_id: currentBoardId,
          board_name: selectedTool?.stageItem?.boardName,
          label_id: label.labelId,
          label_name: label.name,
        });
      });
      return map;
    }

    if (!Array.isArray(moveToData)) return map;

    moveToData.forEach((action) => {
      (action?.targets || []).forEach((target) => {
        const labelId = target?.label_id;
        if (labelId == null) return;
        const key = String(labelId);
        const sameBoard =
          currentBoardId == null ||
          String(target.board_id) === String(currentBoardId);

        if (!map.has(key)) {
          map.set(key, action);
          return;
        }

        // Prefer an action whose target is on the current board.
        if (!sameBoard) return;
        const existing = map.get(key);
        const existingSameBoard = existing?.targets?.some(
          (t) =>
            String(t.label_id) === key &&
            String(t.board_id) === String(currentBoardId),
        );
        if (!existingSameBoard) {
          map.set(key, action);
        }
      });
    });

    return map;
  }, [
    boardStages,
    currentBoardId,
    isTaskWorkflow,
    moveToData,
    selectedTool?.stageItem?.boardName,
  ]);

  const handleBoardStagePillClick = useCallback(
    (label) => {
      if (stageApiLoading) return;
      const labelId = label?.labelId;
      if (labelId == null) return;
      if (String(labelId) === String(currentStageLabelId)) return;

      const action = applicableStageMoveByLabelId.get(String(labelId));
      if (!action) return;

      if (isTaskWorkflow || action.__freeFlowTaskMove) {
        const savedWorkSpaceState = localStorage.getItem("workspaceState");
        const parsedWorkSpaceState = savedWorkSpaceState
          ? JSON.parse(savedWorkSpaceState)
          : {};
        const activeWorkSpace = parsedWorkSpaceState?.activeWorkSpace?.[0];

        handleStageMove({
          board_id: currentBoardId ?? action.board_id,
          board_name:
            action.board_name || selectedTool?.stageItem?.boardName || "",
          label_id: labelId,
          label_name: label.name,
          unassigned: false,
          emailnotify: true,
          workspace_id: activeWorkSpace?.work_space_id,
          workspace_name: activeWorkSpace?.name,
        });
        return;
      }

      handleStageMove(action, labelId);
    },
    [
      applicableStageMoveByLabelId,
      currentBoardId,
      currentStageLabelId,
      handleStageMove,
      isTaskWorkflow,
      selectedTool?.stageItem?.boardName,
      stageApiLoading,
    ],
  );

  const stageMovePopup =
    stageDialogOpen &&
    stagePosition &&
    (boardStages?.length > 0 || (!isTaskWorkflow && moveToData?.length > 0)) &&
    createPortal(
      <div
        ref={stagePopupRef}
        style={{
          position: "fixed",
          top: stagePosition.top,
          left: stagePosition.left,
          zIndex: 2000,
          minWidth: 280,
          maxWidth: 340,
        }}
        className="sub_task_list_table__modal-dialog-assignee sub_task_list_table__modal-dialog-stage"
      >
        {boardStages?.length > 0 && (
          <div className="sub_task_list_table__board-stages mb-2">
            <p className="mb-1 fw-600">Board Stages</p>
            <div className="d-flex flex-wrap gap-1">
              {boardStages.map((label) => {
                const isCurrent =
                  String(label.labelId) === String(currentStageLabelId);
                const isApplicable = applicableStageMoveByLabelId.has(
                  String(label.labelId),
                );
                const isDisabled = !isApplicable || isCurrent || stageApiLoading;
                const stageColor =
                  label.color_Code || label.colorCode || "#334155";

                return (
                  <button
                    key={label.labelId}
                    type="button"
                    className={`px-2 py-1 rounded sub_task_list_table__stage-pill ${
                      isCurrent ? "sub_task_list_table__stage-current" : ""
                    } ${isApplicable && !isCurrent ? "is-applicable" : ""} ${
                      isDisabled ? "is-disabled" : ""
                    }`}
                    style={{
                      color: stageColor,
                      border: `1px solid ${
                        label.color_Code || label.colorCode || "#cbd5e1"
                      }`,
                      backgroundColor: isCurrent
                        ? `${stageColor}20`
                        : isApplicable
                          ? `${stageColor}08`
                          : "transparent",
                      fontSize: 12,
                      fontWeight: isCurrent || isApplicable ? 600 : 400,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled && !isCurrent ? 0.45 : 1,
                    }}
                    title={
                      isCurrent
                        ? "Current stage"
                        : isApplicable
                          ? `Move to ${label.name}`
                          : "Not available from current stage"
                    }
                    disabled={isDisabled}
                    onClick={() => handleBoardStagePillClick(label)}
                  >
                    {label.name}
                    {isCurrent ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
            {!isTaskWorkflow && <hr className="my-2" />}
          </div>
        )}
        {!isTaskWorkflow && (
          <MoveToMenu
            moveToData={moveToData}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            loadingActionId={loadingActionId}
            moveToTicket={handleStageMove}
            apiLoading={stageApiLoading}
          />
        )}
      </div>,
      document.body,
    );

  // Cross-board task moves when workflow targets exist but board stages UI is unavailable.
  const taskStageMoveModal =
    isTaskWorkflow &&
    stageDialogOpen &&
    !(boardStages?.length > 0) &&
    moveToData?.length > 0 ? (
      <TaskMovetoMenu
        moveToData={moveToData}
        showPopup={stageDialogOpen}
        closePopup={setStageDialogOpen}
        moveToTicket={handleStageMove}
        apiLoading={stageApiLoading}
      />
    ) : null;

  if (isEmbedded) {
    return (
      <>
        <div className="sub_task_list_table__modal-dialog sub_task_list_table__modal-dialog--embedded">
          {tableBody}
        </div>
        {timeTrackingModal}
        {assigneePopup}
        {stageMovePopup}
        {taskStageMoveModal}
      </>
    );
  }

  return (
    <>
      <div className="sub_task_list_table__modal-dialog">{tableBody}</div>
      {timeTrackingModal}
      {assigneePopup}
      {stageMovePopup}
      {taskStageMoveModal}
    </>
  );
};

export default SubTaskList;

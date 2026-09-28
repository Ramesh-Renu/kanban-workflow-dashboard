import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import KanbanColumn from "./KanbanColumn";
import {
  moveWholeCard,
  moveSingleTool,
  moveSelectedToolsFromCard,
  nextStage,
} from "../../utils/kanbanUtils";
import { useToast } from "@orion/shared";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalMaster } from "@orion/shared";
import { subTaskMoveTool } from "../../services";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";
import { useGlobalContext } from "store/context/GlobalProvider";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { readActiveKanbanFiltersFromStorage } from "../../utils/kanbanRoutes";

const setPayload = (e, payload) => {
  const str = JSON.stringify(payload);
  try {
    e.dataTransfer.setData("application/json", str);
  } catch {}
  e.dataTransfer.setData("text/plain", str);
};

const getPayload = (e) => {
  let str = "";
  try {
    str = e.dataTransfer.getData("application/json");
  } catch {}
  if (!str) str = e.dataTransfer.getData("text/plain");
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const KanbanBoard = ({
  isDraggable,
  stages,
  tasks,
  setTasks,
  boardData,
  reloadTask,
  callApiOnScroll,
  selectedFilters,
  scrollingApiLoading,
  activeTaskCodes,
  embedded = false,
}) => {
  /** VARIABLE DECLARATIONS */
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { taskDetails } = useGlobalContext();
  const savedWorkSpaceState = localStorage.getItem("workspaceState");
  const parsedWorkSpaceState = JSON.parse(savedWorkSpaceState);

  const [moveApiLoading, setMoveApiLoading] = useState(false);
  // Prefer prop over shared isActiveTab — IOD tab in another window must not
  // force SubTask UI onto Non-IOD / dashboard Task boards.
  let lsActiveCode;
  try {
    const savedTask = localStorage.getItem("isActiveTab");
    const parsedTask = savedTask ? JSON.parse(savedTask) : null;
    lsActiveCode = parsedTask?.tabs
      ?.filter((task) => task.isActive)
      ?.map((task) => task.code)?.[0];
  } catch {
    lsActiveCode = undefined;
  }
  const activeCodes = activeTaskCodes || lsActiveCode;
  const { workFlowList, getWorkFlowList } = useGlobalMaster();
  const SCROLL_EDGE_DISTANCE = 120; // px from edge to start scrolling
  const SCROLL_SPEED = 60; // px per frame
  const scrollAnimationRef = useRef(null);
  const lastClientXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [moveToData, setMoveToData] = useState([]);
  const [moveAPIParam, setMoveAPIParam] = useState({});
  const [openGroups, setOpenGroups] = useState({}); // track opened groups
  const contentRef = useRef(null);
  const scrollbarRef = useRef(null);
  const visibleRef = useRef(null);
  const [showScroll, setShowScroll] = useState(false);
  const [getVisibleStages, setVisibleStages] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScroll, setStartScroll] = useState(0);
  const [leftPosition, setLeftPosition] = useState(5);
  const [thumbWidth, setThumbWidth] = useState(22);
  const [columnsRendered, setColumnsRendered] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [placeholder, setPlaceholder] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const dragPreviewPosRef = useRef({ x: 0, y: 0 });
  const transparentImgRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const getReloadFilters = () => readActiveKanbanFiltersFromStorage();

  useEffect(() => {
    if (workFlowList?.data?.length === 0) {
      getWorkFlowList({ flow_id: "" });
    }
  }, []);

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  /** SMOOTH SCROLL WHEN USER DRAG TICKET TO OTHER STAGE  */
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const smoothAutoScroll = () => {
      if (!isDraggingRef.current) return;

      const rect = container.getBoundingClientRect();
      const clientX = lastClientXRef.current;
      let direction = 0;

      if (clientX < rect.left + SCROLL_EDGE_DISTANCE) direction = -1;
      else if (clientX > rect.right - SCROLL_EDGE_DISTANCE) direction = 1;

      if (direction !== 0) {
        container.scrollLeft += direction * SCROLL_SPEED;
      }

      // keep the loop going
      scrollAnimationRef.current = requestAnimationFrame(smoothAutoScroll);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      lastClientXRef.current = e.clientX;
    };

    const handleDragStart = () => {
      isDraggingRef.current = true;
      if (!scrollAnimationRef.current) {
        scrollAnimationRef.current = requestAnimationFrame(smoothAutoScroll);
      }
    };

    const stopScroll = () => {
      isDraggingRef.current = false;
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    };

    // Attach to window for reliability
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragend", stopScroll);
    window.addEventListener("drop", stopScroll);

    return () => {
      stopScroll();
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", stopScroll);
      window.removeEventListener("drop", stopScroll);
    };
  }, []);

  /** USED TO RESET BOX SHADOW WHEN USER DRAG TICKET AND DROP OUTSIDE THE BOX */
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      document.querySelectorAll(".kanban-column").forEach((col) => {
        col.style.boxShadow = "none";
      });
      document
        .querySelectorAll(".kanbanCard.is-dragging, .tool-name.is-dragging")
        .forEach((el) => {
          el.classList.remove("is-dragging");
        });
        document.querySelectorAll(".active-move-tool").forEach((el) => {
          el.classList.remove("active-move-tool");
        });
      setDragState(null);
      setPlaceholder(null);
      setDragPreview(null);
    };

    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("drop", handleGlobalDragEnd); // optional extra safety

    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("drop", handleGlobalDragEnd);
    };
  }, []);

  useEffect(() => {
    if (!transparentImgRef.current) {
      const img = new Image();
      img.src =
        "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      transparentImgRef.current = img;
    }
  }, []);

  useEffect(() => {
    const handleDragOver = (e) => {
      dragPreviewPosRef.current = { x: e.clientX, y: e.clientY };
      setDragPreview((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX,
              y: e.clientY,
            }
          : prev,
      );
    };
    const handleDrag = (e) => {
      if (!e.clientX && !e.clientY) return;
      dragPreviewPosRef.current = { x: e.clientX, y: e.clientY };
      setDragPreview((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX,
              y: e.clientY,
            }
          : prev,
      );
    };
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drag", handleDrag);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drag", handleDrag);
    };
  }, []);

  useEffect(() => {
    // Only run when stages exist
    if (!stages || stages.length === 0) return;

    // Perform your initial calculations
    calculateVisibleStages();

    // If you wanted to determine the left position or something based on stages
    // (instead of doing it inside the map)
    // const lastIndex = stages.length - 1;
    // setGetLeftPosition(lastIndex); // or whatever logic you need

    // Handle window resize
    window.addEventListener("resize", calculateVisibleStages);
    return () => window.removeEventListener("resize", calculateVisibleStages);
  }, [stages]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (stages?.length > 0) {
      // Wait until React flushes updates to DOM
      const timeout = setTimeout(() => {
        const hasColumns =
          document.querySelectorAll(".kanban-column").length > 0;
        setColumnsRendered(hasColumns);
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [stages, tasks]);

  useEffect(() => {
    if (!columnsRendered || !location?.state?.stage?.labelId) return;

    // wait one frame to ensure layout fully ready
    requestAnimationFrame(() => {
      const firstCard = document.getElementById(
        `label_${location.state.stage.labelId}`,
      );
      const columnPos = getColumnLeftPosition(firstCard);
      if (columnPos?.left != null && contentRef.current) {
        contentRef.current.scrollTo({
          left: columnPos.left,
          behavior: "smooth",
        });
        requestAnimationFrame(updateThumbPosition);
      }
      // ✅ clear navigation state
      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state.stage,
          labelId: columnsRendered
            ? undefined
            : location?.state?.stage?.labelId,
        },
      });
    });
  }, [columnsRendered, location.state]);

  useEffect(() => {
    const firstCard = document.querySelector(".kanbanCard");
    if (firstCard && contentRef.current) {
      const { left } = getColumnLeftPosition(firstCard);
    }
  }, [tasks]); // or [stages] if you want after board render

  const displayStages = useMemo(
    () =>
      selectedFilters?.stageList?.length > 0
        ? stages?.filter((stage) =>
            selectedFilters.stageList.some(
              (filter) => filter.labelId === stage.labelId,
            ),
          )
        : stages,
    [selectedFilters?.stageList, stages],
  );

  const stageMarkerCount = useMemo(() => {
    const count = displayStages?.length ?? 0;
    if (count <= 0) return 0;
    return count > 6 ? Math.ceil(count / 2) : count;
  }, [displayStages]);

  const updateThumbPosition = useCallback(() => {
    const container = contentRef.current;
    const scrollbar = scrollbarRef.current;
    const thumb = visibleRef.current;

    if (!container || !scrollbar || !thumb) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const maxDrag = Math.max(0, scrollbar.clientWidth - thumb.clientWidth);

    if (maxScroll <= 0 || maxDrag <= 0) {
      setLeftPosition(4);
      return;
    }
    const scrollRatio = Math.min(1, Math.max(0, container.scrollLeft / maxScroll));
    const newLeft = scrollRatio * maxDrag;
    
    const correctedLeft =
      newLeft <= 0 ? 4 : newLeft >= maxDrag ? maxDrag - 4 : newLeft;
    setLeftPosition(correctedLeft);
  }, []);

  useEffect(() => {
    const visibleCount = Math.max(1, getVisibleStages || 1);
    const markerCount = Math.max(1, stageMarkerCount || 1);
    // Thumb width represents how many stage markers fit in the viewport
    const width = Math.min(markerCount, visibleCount) * 22;
    // setThumbWidth(Math.max(22, width));
  }, [getVisibleStages, stageMarkerCount]);

  useEffect(() => {
    if (!displayStages?.length) return undefined;

    const syncScrollUi = () => {
      calculateVisibleStages();
      updateThumbPosition();
    };

    syncScrollUi();
    const frameId = requestAnimationFrame(syncScrollUi);
    const timeoutId = window.setTimeout(syncScrollUi, 150);

    window.addEventListener("resize", syncScrollUi);

    const container = contentRef.current;
    let resizeObserver;
    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncScrollUi);
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", syncScrollUi);
      resizeObserver?.disconnect();
    };
  }, [displayStages, tasks, windowWidth, updateThumbPosition]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;

    const onScroll = () => updateThumbPosition();
    container.addEventListener("scroll", onScroll, { passive: true });
    // Wait a frame so the portaled scrollbar is measured
    const frameId = requestAnimationFrame(updateThumbPosition);

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener("scroll", onScroll);
    };
  }, [displayStages, showScroll, thumbWidth, updateThumbPosition]);

  useEffect(() => {
    // Full-page overlay sizing — skip when embedded in the dashboard card.
    if (embedded || document.querySelector(".dashboard-orders-kanban")) return;

    const expandedBodyContent = document.querySelector(
      ".sidenav-content.expanded",
    );
    const notexpandedBodyContent = document.querySelector(".sidenav-content");
    const bodyContent = document.querySelector(".customKanabnLoader");
    if (expandedBodyContent && bodyContent) {
      bodyContent.style.width = `calc(100% - ${290}px)`;
      bodyContent.style.height = "calc(100vh - 160px)";
    } else if (notexpandedBodyContent && bodyContent) {
      bodyContent.style.width = `calc(100% - ${100}px)`;
      bodyContent.style.height = "calc(100vh - 160px)";
    }
  }, [embedded]);

  const dargAndDropToTicketApi = async (param, getData, stageId) => {
    if (!param) return;
    setMoveApiLoading(true);

    try {
      const response = await subTaskMoveTool(param);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
        });
        setMoveApiLoading(false);
        const parsed = getReloadFilters();
        reloadTask(
          {
            ...parsed,
            pageOffSet: 0,
            pageSize:
              parsed.stageScroll !== null &&
              parsed.stageScroll?.includes(getData.curentStage?.labelId)
                ? parsed.pageSize * (parsed.pageOffSet + 1)
                : 10,
            stageScroll:
              parsed.stageScroll !== null &&
              parsed.stageScroll?.includes(getData.curentStage?.labelId)
                ? parsed.stageScroll
                : null,
          },
          false,
          getData.curentStage?.labelId,
          "update",
        );
        setTimeout(() => {
          const parsedNext = getReloadFilters();
          reloadTask(
            {
              ...parsedNext,
              pageOffSet: 0,
              pageSize:
                parsedNext.stageScroll !== null &&
                parsedNext.stageScroll?.includes(stageId)
                  ? parsedNext.pageSize * (parsedNext.pageOffSet + 1)
                  : 10,
              stageScroll:
                parsedNext.stageScroll !== null &&
                parsedNext.stageScroll?.includes(stageId)
                  ? parsedNext.stageScroll
                  : null,
            },
            false,
            stageId,
            "update",
          );
        }, 3000);
      } else {
        showToast({
          message: response?.data?.message,
          variant: "danger",
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || String(error),
        variant: "danger",
      });
      setMoveApiLoading(false);
    }
  };

  const moveToTicket = async (data) => {
    if (!data) return;
    setLoadingActionId(data.action_id);
    const currentBoardId = boardData[0]?.boardID;
    const TargetBoardId = data?.targets.some(
      (item) => item.board_id !== currentBoardId,
    );
    const TargetStageId = data?.targets
      .filter((item) => item.board_id === currentBoardId)
      .map((item) => item.label_id);
    const updatedParam = {
      ...moveAPIParam,
      isMoved: TargetBoardId,
      actionId: data?.action_id,
    };

    try {
      const response = await subTaskMoveTool(updatedParam);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
        });
        setShowPopup(false);
        setLoadingActionId(null);
        if (moveAPIParam.currentStageLabelId) {
          const parsed = getReloadFilters();
          reloadTask(
            {
              ...parsed,
              pageOffSet: 0,
              pageSize:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(moveAPIParam.currentStageLabelId)
                  ? parsed.pageSize * (parsed.pageOffSet + 1)
                  : 10,
              stageScroll: [moveAPIParam.currentStageLabelId],
            },
            false,
            moveAPIParam.currentStageLabelId,
            "update",
          );
          // setTimeout(() => {
          //   reloadTask(
          //     {
          //       ...parsed,
          //       pageOffSet: 0,
          //       pageSize:
          //         parsed.stageScroll !== null &&
          //         parsed.stageScroll?.includes(TargetStageId[0])
          //           ? parsed.pageSize * (parsed.pageOffSet + 1)
          //           : 10,
          //       stageScroll: TargetStageId,
          //     },
          //     false,
          //     TargetStageId[0],
          //     "update"
          //   );
          // }, 10000);
        }
      } else {
        showToast({
          message: response?.data?.message,
          variant: "danger",
        });
        setLoadingActionId(null);
      }
    } catch (error) {
      setLoadingActionId(null);
      showToast({
        message: error?.message || String(error),
        variant: "danger",
      });
    }
  };

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id], // toggle
    }));
  };

  function canDropCard(workFlowList, flowId, currentStageLabelId, stageId) {
    const flow = workFlowList?.data?.find((f) => f.flow_id === flowId);
    if (!flow) return { allowed: false, actionIds: [], flowId: null };

    // Filter actions by current stage
    const validActions =
      flow.flow_detail?.filter(
        (detail) => detail.source?.label_id === currentStageLabelId,
      ) || [];

    // Find actions where target matches stageId
    const matchingActions = validActions.filter((action) =>
      action.targets?.some((target) => target.label_id === stageId),
    );

    return {
      allowed: matchingActions.length > 0, // boolean
      actionIds: matchingActions.map((a) => a.action_id), // array of action_ids
      flowId: flow.flow_id, // the flowId
    };
  }

  function getTargetLabelIds(workFlowList, flowId, currentStageLabelId) {
    return (
      workFlowList?.data
        ?.find((flow) => flow.flow_id === flowId) // find the correct flow
        ?.flow_detail?.filter(
          (detail) => detail.source?.label_id === currentStageLabelId,
        ) // filter by current stage
        ?.flatMap((action) => action.targets?.map((t) => t.label_id) || []) || // collect all label_ids
      [] // fallback to empty array
    );
  }

  function getToolTicketIdsByFlowId(toolList, flowId) {
    if (!toolList || toolList.length === 0) return [];

    const flow = toolList.find((flow) => flow.flowId === flowId);
    if (!flow) return [];

    return (
      flow.listOfTools
        ?.filter((tool) => tool.selected)
        ?.map((tool) => tool.toolTicketId) || []
    );
  }

  function getActionsForStage(
    workFlowList,
    selectedFlowId,
    currentStageLabelId,
  ) {
    if (!workFlowList?.data) return [];

    // find the matching flow
    const selectedFlow = workFlowList.data.find(
      (flow) => flow.flow_id === selectedFlowId,
    );

    if (!selectedFlow?.flow_detail) return [];

    // return all action objects where source.label_id matches
    const matchedActions = selectedFlow.flow_detail.filter(
      (detail) =>
        Number(detail.source?.label_id) === Number(currentStageLabelId),
    );

    return matchedActions; // return the full action objects
  }

  const onDragStartCard = (e, card, stage, cardEl) => {
    if (cardEl) {
      cardEl.classList.add("is-dragging");
    }
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
    const toolList = card?.toolList || [];
    const allTools = toolList.flatMap((flow) => flow.listOfTools || []);
    const selectedTools = allTools.filter((item) => item.selected);
    const isAllSelected =
      allTools.length > 0 && selectedTools.length === allTools.length;

      const selectedToolIds = selectedTools.map(
        (item) => item.toolTicketId ?? item.id,
      );
      const toolElements = collectToolElements(card?.orderId, selectedToolIds);
      toolElements.forEach((el) => {
        el.className = el.className +" active-move-tool";
      });


    if (activeTaskCodes !== "Task") {
      // Find flows with at least one selected subTool
      const selectedFlows = toolList.filter((flow) =>
        flow.listOfTools?.some((subTool) => subTool.selected),
      );

      if (selectedFlows.length !== 1) {
        e.preventDefault();
        e.stopPropagation();
        showToast({
          message: "Select exactly one Flow before moving.",
          variant: "danger",
        });
        document.querySelectorAll(".kanban-column").forEach((col) => {
          col.style.boxShadow = "0 0 6px 2px rgba(249, 22, 22, 0.6)";
        });
        cardEl.classList.remove("is-dragging");
        resetDragUI();
        return;
      }

      if (selectedFlows.length === 1) {
      const selectedFlowId = selectedFlows[0].flowId;
      const targetLabelIds = getTargetLabelIds(
        workFlowList,
        selectedFlowId,
        stage?.labelId,
      );

      const result = getToolTicketIdsByFlowId(toolList, selectedFlowId);
      setMoveAPIParam({
        boardId: boardData[0].boardID,
        toolTicketId: result,
        flowId: selectedFlowId,
        currentStageLabelId: stage?.labelId,
      });
      // Highlight allowed & restricted target columns
      document.querySelectorAll(".kanban-column").forEach((col) => {
        const colId = Number(col.id.replace("label_", ""));
        col.style.boxShadow = targetLabelIds.includes(colId)
          ? "0 0 6px 2px rgba(43, 137, 49, 0.6)" // ? allowed ? green
          : "0 0 6px 2px rgba(249, 22, 22, 0.6)"; // ? not allowed ? red
      });
      } else if (!isAllSelected) {
        document.querySelectorAll(".kanban-column").forEach((col) => {
          col.style.boxShadow = "none";
        });
      }
    }
    if (activeTaskCodes === "Task" && selectedTools.length === 0) {
      e.preventDefault();
      e.stopPropagation();
      showToast({
        message: "Select at least one Sub Task before moving.",
        variant: "danger",
      });
      cardEl.classList.remove("is-dragging");
      resetDragUI();
      return;
    }
      
    // If tools are selected but not all, treat as child drag preview
    if (selectedTools.length > 0 && !isAllSelected) {
      const selectedToolIds = selectedTools.map(
        (item) => item.toolTicketId ?? item.id,
      );
      const toolElements = collectToolElements(card?.orderId, selectedToolIds);
      const dragHeight =
        toolElements.length > 0
          ? toolElements.reduce((sum, el) => sum + getOuterHeight(el), 0)
          : 0;

      setDragState({
        type: "tool",
        stageId: stage?.labelId,
        height: dragHeight,
        selectedToolIds,
        cardId: card?.orderId,
      });

      setPayload(e, {
        type: "tool",
        fromCardId: card.id || card.orderId,
        toolId: selectedTools[0]?.id || selectedTools[0]?.toolTicketId,
        selectedToolIds,
        cardId: card?.orderId,
        stageId: stage?.labelId,
        orderId: card.orderId,
        card: card,
        curentStage: stage,
      });

      if (e?.dataTransfer?.setDragImage) {
        e.dataTransfer.setDragImage(transparentImgRef.current, 0, 0);
        const html = buildToolPreviewHtmlFromCardElement(
          cardEl,
          selectedToolIds,
        );
        setDragPreview({
          type: "tool",
          html,
          width: cardEl?.getBoundingClientRect()?.width || 0,
          height: dragHeight,
          x: e.clientX,
          y: e.clientY,
        });
      }
      return;
    }

    const dragHeight = cardEl?.getBoundingClientRect()?.height || 0;
    setDragState({
      type: "card",
      stageId: stage?.labelId,
      height: dragHeight,
    });
    // Store drag payload
    setPayload(e, {
      type: "card",
      cardId: card.orderId,
      card,
      curentStage: stage,
    });
    if (cardEl && e?.dataTransfer?.setDragImage) {
      e.dataTransfer.setDragImage(transparentImgRef.current, 0, 0);
      const rect = cardEl.getBoundingClientRect();
      const clone = cardEl.cloneNode(true);
      clone.classList.remove("is-dragging");
      setDragPreview({
        type: "card",
        html: clone.outerHTML,
        width: rect.width,
        height: rect.height,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  /** RESET DRAG OUTLINE */
  const resetDragUI = () => {
    document.querySelectorAll(".kanban-column").forEach((col) => {
      col.style.boxShadow = "none";
    });

    document
      .querySelectorAll(".kanbanCard.is-dragging, .tool-name.is-dragging")
      .forEach((el) => {
        el.classList.remove("is-dragging");
      });

    setDragState(null);
    setPlaceholder(null);
    setDragPreview(null);
  };

  const getOuterHeight = (el) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);
    const marginTop = parseFloat(styles.marginTop || "0");
    const marginBottom = parseFloat(styles.marginBottom || "0");
    return rect.height + marginTop + marginBottom;
  };

  const normalizeId = (value) => {
    if (value === null || value === undefined) return null;
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? String(value) : asNumber;
  };

  const buildToolPreviewHtmlFromCardElement = (cardEl, selectedToolIds) => {
    if (!cardEl) return "";
    const selectedSet = new Set(selectedToolIds.map(normalizeId));
    const clone = cardEl.cloneNode(true);
    clone.classList.remove("is-dragging");

    clone.querySelectorAll(".collapse").forEach((el) => {
      el.classList.add("show");
      el.style.height = "auto";
      el.style.overflow = "visible";
    });

    clone.querySelectorAll("[data-tool-ticket-id]").forEach((el) => {
      const attr = el.getAttribute("data-tool-ticket-id");
      const id = normalizeId(attr);
      if (!selectedSet.has(id)) {
        el.remove();
      }
    });

    clone.querySelectorAll(".flow-group").forEach((group) => {
      if (group.querySelectorAll("li").length === 0) {
        const prev = group.previousElementSibling;
        if (prev && prev.classList.contains("flow-heading")) {
          prev.remove();
        }
        group.remove();
      }
    });

    clone.querySelectorAll(".toolsText, .tool-count-container, .toolsTextContainer").forEach((el) => {
      el.remove();
    });

    clone.querySelectorAll(".flow-heading").forEach((heading) => {
      if (!heading.classList.contains("disabled")) return;
      const nextGroup = heading.nextElementSibling;
      if (!nextGroup || nextGroup.querySelectorAll("li").length === 0) {
        heading.remove();
      }
    });

    clone.querySelectorAll(".flow-group-container").forEach((container) => {
      if (container.querySelectorAll("li").length === 0) {
        container.remove();
      }
    });

    return clone.outerHTML;
  };


  const collectToolElements = (cardOrderId, selectedToolIds) => {
    const normalized = new Set(selectedToolIds.map(normalizeId));
    return Array.from(
      document.querySelectorAll(
        `[data-card-id="${cardOrderId}"][data-tool-ticket-id]`,
      ),
    ).filter((el) => {
      const attr = el.getAttribute("data-tool-ticket-id");
      return normalized.has(normalizeId(attr));
    });
  };

  const onDragStartTool = (e, card, tool, stage, toolEl) => {
    if(activeTaskCodes === "Task") return;
    e.stopPropagation();
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
    const selectedTools =
      card?.toolList
        ?.flatMap((flow) => flow.listOfTools || [])
        ?.filter((item) => item.selected) || [];
    const isToolSelected = !!tool?.selected;
    const selectedToolIds = selectedTools.map(
      (item) => item.toolTicketId ?? item.id,
    );
    const isToolInSelection = selectedToolIds.some(
      (id) => String(id) === String(tool?.toolTicketId ?? tool?.id),
    );
    if (selectedTools.length === 0 && !isToolSelected) {
      e.preventDefault();
      return;
    }
    if (selectedTools.length > 0 && !isToolInSelection) {
      e.preventDefault();
      return;
    }
    // Highlight allowed & restricted target columns for tool drag
    const toolList = card?.toolList || [];
    const selectedFlows = toolList.filter((flow) =>
      flow.listOfTools?.some((subTool) => subTool.selected),
    );        
    
    if (selectedFlows.length === 1) {
      const selectedFlowId = selectedFlows[0].flowId;
      const targetLabelIds = getTargetLabelIds(
        workFlowList,
        selectedFlowId,
        stage?.labelId,
      );
      document.querySelectorAll(".kanban-column").forEach((col) => {
        const colId = Number(col.id.replace("label_", ""));
        col.style.boxShadow = targetLabelIds.includes(colId)
          ? "0 0 6px 2px rgba(43, 137, 49, 0.6)" // allowed
          : "0 0 6px 2px rgba(249, 22, 22, 0.6)"; // not allowed
      });
    }

    if (toolEl) {
      toolEl.classList.add("is-dragging");
      toolEl.style.opacity = "1";
      // toolEl.style.padding = "20px";
      // toolEl.style.border ="1px solid var(--color-primary)";
      // toolEl.style.borderRadius = "10px";
    }
    const dragItems =
      selectedTools.length > 0 ? selectedTools : tool ? [tool] : [];
    const dragItemIds = dragItems.map(
      (item) => item.toolTicketId ?? item.id,
    );

    const toolElements = collectToolElements(card?.orderId, dragItemIds);
    const dragHeight =
      toolElements.length > 0
        ? toolElements.reduce((sum, el) => sum + getOuterHeight(el), 0)
        : toolEl?.getBoundingClientRect()?.height || 0;

    setDragState({
      type: "tool",
      stageId: stage?.labelId,
      height: dragHeight,
      selectedToolIds: dragItemIds,
      cardId: card?.orderId,
    });

    setPayload(e, {
      type: "tool",
      fromCardId: card.id || card.orderId,
      toolId: tool.id || tool.toolTicketId,
      selectedToolIds: dragItemIds,
      cardId: card?.orderId,
      stageId: stage?.labelId,
      orderId: card.orderId,
      card: card,
      curentStage: stage,
    });

    if (e?.dataTransfer?.setDragImage) {
      e.dataTransfer.setDragImage(transparentImgRef.current, 0, 0);
      const cardEl = toolEl?.closest(".kanbanCard");
      const html = buildToolPreviewHtmlFromCardElement(cardEl, dragItemIds);
      setDragPreview({
        type: "tool",
        html,
        width: cardEl?.getBoundingClientRect()?.width || 0,
        height: dragHeight,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const onDropToStage = (e, stage, stageId) => {
    // Reset column background

    document.querySelectorAll(".kanban-column").forEach((col) => {
      col.style.boxShadow = "none";
    });
    setDragState(null);
    setPlaceholder(null);
    setDragPreview(null);

    if (activeCodes === "MainTask")
      return showToast({
        message: "Main Task Movement Restriction!",
        variant: "danger",
      });

    const data = getPayload(e);
    if (!data) return;

    const toolList = data?.card?.toolList || [];
    const selectedFlow = toolList.find((flow) =>
      flow.listOfTools?.some((subTool) => subTool.selected),
    );

    if (!selectedFlow && data.type !== "card")
      return showToast({
        message: `Select any ${activeCodes === "Task" ? "Sub Task" : "tool"} before moving!`,
        variant: "danger",
      });

    const { flowId: selectedFlowId, listOfTools = [] } = selectedFlow;

    // Check for assignee inside selected flow
    const hasAssignee = listOfTools
      .filter((tool) => tool.selected) // only check selected tools
      .every((tool) => tool.assignee?.length > 0);

    if (!hasAssignee && data?.curentStage?.labelId !== stageId)
      return showToast({
        message: `Assign someone to the selected ${activeCodes === "Task" ? "Sub Task" : "tool"} before moving!`,
        variant: "danger",
      });

    const isDropCard = canDropCard(
      workFlowList,
      selectedFlowId,
      data?.curentStage?.labelId,
      stageId,
    );
    const result = getToolTicketIdsByFlowId(toolList, selectedFlowId);

    if (activeCodes !== "Task") {
      if (!isDropCard.allowed && data?.curentStage?.labelId !== stageId)
        return showToast({
          message: "Target Stage Restriction!",
          variant: "danger",
        });
    }
    const targetList = getActionsForStage(
      workFlowList,
      selectedFlowId,
      data?.curentStage?.labelId,
    );

    const hasOtherBoard = (targetList = [], stageId) => {
      if (!Array.isArray(targetList) || !stageId) return false;

      const result = [];

      for (const item of targetList) {
        const targets = item.targets || [];

        // Check if stageId is present
        const hasStage = targets.some(
          (t) => Number(t.label_id) === Number(stageId),
        );

        if (hasStage) {
          result.push({
            action_id: item.action_id,
            action_name: item.action_name,
            source: item.source,
            targets: item.targets,
          });
        }
      }

      return result.length ? result : false;
    };

    // Usage example
    const resultPoup = hasOtherBoard(targetList, stageId, boardData);
    if (!result?.length || data?.curentStage?.labelId === stageId) return;
    const updatedParam =
      activeCodes === "Task"
        ? {
            boardId: boardData[0]?.boardID,
            toolTicketId: result,
            flowId: null,
            isMoved: false,
            actionId: null,
            isTaskWorkFlow: true,
            flowDetail: {
              source: {
                board_id: boardData[0]?.boardID,
                board_name: boardData[0]?.name,
                label_id: data?.curentStage?.labelId,
                label_name: data?.curentStage?.name,
                workspace_id:
                  parsedWorkSpaceState?.activeWorkSpace[0]?.work_space_id,
                workspace_name: parsedWorkSpaceState?.activeWorkSpace[0]?.name,
              },
              targets: {
                board_id: boardData[0]?.boardID,
                board_name: boardData[0]?.name,
                label_id: stage?.labelId,
                label_name: stage?.name,
                unassigned: false,
                emailnotify: true,
                workspace_id:
                  parsedWorkSpaceState?.activeWorkSpace[0]?.work_space_id,
                workspace_name: parsedWorkSpaceState?.activeWorkSpace[0]?.name,
              },
            },
          }
        : {
            boardId: boardData[0]?.boardID,
            toolTicketId: result,
            flowId: isDropCard.flowId,
            isMoved: false,
            actionId: isDropCard.actionIds?.[0],
            isTaskWorkFlow: false,
            flowDetail: null,
          };

    if (resultPoup?.length > 1) {
      setShowPopup(true);
      setMoveToData(resultPoup);
      setOpenGroups(
        resultPoup.reduce((acc, task) => {
          acc[task.action_id] = true;
          return acc;
        }, {}),
      );
    } else {
      dargAndDropToTicketApi(updatedParam, data, stageId);
    }

    if (data.type === "card") {
      // if (data?.curentStage?.labelId === stageId) return;
      moveWholeCard(tasks, data.cardId, stage?.name);
      // setTasks(prev => moveWholeCard(prev, data.cardId, stage?.name));
    } else if (data.type === "tool") {
      setTasks((prev) =>
        moveSingleTool(prev, data.fromCardId, data.toolId, stage?.name),
      );
    }
  };

  const onDragOverStage = (e, stage) => {
    e.preventDefault();
    if (!dragState || !stage) return;
    if (dragState.stageId === stage.labelId) {
      if (placeholder) setPlaceholder(null);
      return;
    }
    const column = document.getElementById(`label_${stage.labelId}`);
    const container = column?.querySelector(".kanban-card-container");
    if (!container) return;
    const cards = Array.from(container.querySelectorAll(".kanbanCard"));
    const clientY = e.clientY;
    let index = cards.length;
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        index = i;
        break;
      }
    }
    setPlaceholder((prev) => {
      const next = {
        stageId: stage.labelId,
        index,
        height: dragState.height || 0,
        type: dragState.type,
      };
      if (
        prev &&
        prev.stageId === next.stageId &&
        prev.index === next.index &&
        prev.height === next.height &&
        prev.type === next.type
      ) {
        return prev;
      }
      return next;
    });
  };

  const onMoveSelectedNext = (cardId) => {
    const card = tasks.find((c) => c.id === cardId);
    if (!card) return;
    const toStage = nextStage(stages, card?.stage);
    setTasks((prev) => moveSelectedToolsFromCard(prev, cardId, toStage));
  };

  const calculateVisibleStages = () => {
    const isEmbedded =
      embedded || Boolean(document.querySelector(".dashboard-orders-kanban"));

    const bodyContent = isEmbedded
      ? document.querySelector(".dashboard-orders-kanban .kanbanContainer") ||
        document.querySelector(".dashboard-orders-kanban")
      : document.querySelector(".outlet-container");
    const columns = isEmbedded
      ? document.querySelectorAll(
          ".dashboard-orders-kanban .kanbanContainer > .kanban-column",
        )
      : document.querySelectorAll(".kanbanContainer > .kanban-column");
    const scopedColumns =
      columns.length > 0
        ? columns
        : document.querySelectorAll(".kanban-column");
    const kanbanColumn = scopedColumns[0];

    if (contentRef.current && bodyContent && scopedColumns.length > 0) {
      const bodyWidth = bodyContent.clientWidth || bodyContent.offsetWidth;

      // Sum all column widths
      let totalKanbanWidth = 0;
      scopedColumns.forEach((col) => {
        totalKanbanWidth += col.offsetWidth + 16;
      });
      if (bodyWidth < totalKanbanWidth + 20 && scopedColumns?.length > 2) {
        const kanbanWidth = (kanbanColumn?.offsetWidth || 0) + 40;
        const ratio = bodyWidth / kanbanWidth;
        const visible = Math.round(ratio * 10) / 10; // round to 1 decimal place
        setVisibleStages(visible);
        setShowScroll(true);
      } else {
        setVisibleStages(1); // entire width is visible
        setShowScroll(false);
      }
      if (windowWidth <= 600) {
        setShowScroll(true);
      }
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const container = contentRef.current;
    if (!container) return;
    setIsDragging(true);
    setStartX(e.clientX);
    setStartScroll(container.scrollLeft);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const container = contentRef.current;
      const scrollbar = scrollbarRef.current;
      const thumb = visibleRef.current;
      if (!container || !scrollbar || !thumb) return;

      const deltaX = e.clientX - startX;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const maxDrag = scrollbar.clientWidth - thumb.clientWidth;
      if (maxDrag <= 0 || maxScroll <= 0) return;

      const dragPercent = deltaX / maxDrag;
      let newScroll = startScroll + dragPercent * maxScroll;
      newScroll = Math.max(0, Math.min(newScroll, maxScroll));

      container.scrollLeft = newScroll;
      updateThumbPosition();
    },
    [isDragging, startScroll, startX, updateThumbPosition],
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  function getColumnLeftPosition(cardEl) {
    if (!cardEl) return null;

    // find parent column
    const parentColumn = cardEl.closest(".kanban-column");
    if (!parentColumn) return null;

    // left offset relative to the scroll container
    const container = parentColumn.closest(".kanbanContainer");
    const columnLeft = parentColumn?.offsetLeft - container?.offsetLeft;

    return {
      parentColumn,
      left: columnLeft,
      columnIndex: [
        ...parentColumn.parentNode.querySelectorAll(".kanban-column"),
      ].indexOf(parentColumn),
      columnTitle: parentColumn.querySelector("h6")?.innerText || null,
    };
  }

  const stageCount = displayStages?.length ?? 0;
  const scrollMarkers =
    stageCount > 6
      ? displayStages?.slice(0, Math.ceil(stageCount / 2))
      : displayStages;

  return (
    <div className="kanban-board-wrap">
      <div
        className="d-flex kanbanContainer"
        ref={contentRef}
        role="region"
        aria-label="Kanban board"
      >
        {(moveApiLoading || scrollingApiLoading) && (
          <TopProgressBar loading={moveApiLoading || scrollingApiLoading} />
        )}
        {displayStages?.map((stage) => (
          <KanbanColumn
            key={stage?.name}
            stages={stages}
            stage={stage}
            tasks={tasks?.filter((t) => t.name === stage.name)?.[0]}
            onDropToStage={onDropToStage}
            onDragOverStage={onDragOverStage}
            onDragStartCard={onDragStartCard}
            onMoveSelectedNext={onMoveSelectedNext}
            onDragStartTool={onDragStartTool}
            boardData={boardData}
            reloadTask={reloadTask}
            isDraggable={isDraggable}
            callApiOnScroll={callApiOnScroll}
            isFullView={selectedFilters?.stageList?.length}
            activeTaskCodes={activeTaskCodes}
            placeholder={placeholder}
            windowWidth={windowWidth}
          />
        ))}
        {dragPreview &&
        createPortal(
          <div
            className="kanban-drag-layer kanban-column"
            style={{
              position: "fixed",
              left: `${dragPreview.x + 14}px`,
              top: `${dragPreview.y + 14}px`,
              width: dragPreview.width ? `${dragPreview.width}px` : "auto",
              zIndex: 9999,
              pointerEvents: "none",
            }}
            dangerouslySetInnerHTML={{ __html: dragPreview.html }}
          ></div>,
          document.body,
        )}

      {showPopup && (
        <PopupModal
          show={showPopup}
          onClose={() => {
            setShowPopup(!showPopup);
            setLoadingActionId(null);
          }}
          header={true}
          title={
            <span className="move-to-aarow">&#x2192; &#160;&#160;Move to</span>
          }
          customClassName={"dueDateCalender"}
          children={
            <div className="movetoCard-DragDrop">
              <div className="d-flex flex-column w-100">
                {moveToData.map((group) => (
                  <div key={group.action_id} className="bg-white">
                    {/* Header row */}
                    <div className="d-flex align-items-center justify-content-between groupContainer">
                      <div className="d-flex align-items-center gap-2 w-100">
                        <button
                          className="toggleGroup"
                          onClick={() => toggleGroup(group.action_id)}
                          title="Expand"
                        >
                          {openGroups[group.action_id] ? "−" : "+"}
                        </button>
                        <button
                          onClick={() => moveToTicket(group)}
                          className={`option-btn ${
                            loadingActionId === group.action_id
                              ? "api-loading"
                              : ""
                          }`}
                          title="Move"
                          disabled={loadingActionId === group.action_id}
                        >
                          {group.action_name}
                          <span>›</span>
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    {openGroups[group.action_id] &&
                      group?.targets?.length > 0 && (
                        <div
                          className="openGroups"
                          style={{
                            borderLeft: "2px dashed #ddd", // vertical dashed line
                            marginLeft: "12px", // align under toggle
                          }}
                        >
                          {group?.targets?.map((detail, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded mb-1"
                              style={{
                                background: "var(--color-primary-light-12)",
                              }}
                            >
                              <span className="targetNames">
                                {detail?.board_name} {"->"} {detail?.label_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          }
        />
      )}
      </div>
      {showScroll &&
        stageCount > 0 &&
        (embedded
          ? (
              <div
                className="dashboard-page__order-tools-scroll-content kanban-board-scroll-content scroll-content"
                ref={scrollbarRef}
              >
                <div
                  className="visibleStages"
                  role="slider"
                  aria-label="Scroll board horizontally"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  tabIndex={0}
                  style={{
                    width: `${thumbWidth}px`,
                    left: `${leftPosition}px`,
                    transition: isDragging
                      ? "none"
                      : "left 0.1s ease-out, width 0.1s ease-out",
                  }}
                  ref={visibleRef}
                  onMouseDown={handleMouseDown}
                />
                {scrollMarkers?.map((stage) => (
                  <div
                    className="stage"
                    title={stage?.name}
                    key={`stage-${stage.name}`}
                  >
                    &#160;
                  </div>
                ))}
              </div>
            )
          : createPortal(
              <div
                className="kanban-board-scroll-content scroll-content"
                ref={scrollbarRef}
              >
                <div
                  className="visibleStages"
                  role="slider"
                  aria-label="Scroll board horizontally"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  tabIndex={0}
                  style={{
                    width: `${thumbWidth}px`,
                    left: `${leftPosition}px`,
                    transition: isDragging
                      ? "none"
                      : "left 0.1s ease-out, width 0.1s ease-out",
                  }}
                  ref={visibleRef}
                  onMouseDown={handleMouseDown}
                />
                {scrollMarkers?.map((stage) => (
                  <div
                    className="stage"
                    title={stage?.name}
                    key={`stage-${stage.name}`}
                  >
                    &#160;
                  </div>
                ))}
              </div>,
              document.body,
            ))}
    </div>
  );
};

export default KanbanBoard;

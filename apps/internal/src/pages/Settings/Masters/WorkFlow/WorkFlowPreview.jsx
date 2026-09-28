import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import { Card, ListGroup } from "react-bootstrap";
import dagre from "dagre";
import "reactflow/dist/style.css";

// ------------------- Node Component -------------------
const StageNode = ({ data }) => (
  <Card
    className="shadow-sm"
    style={{ minWidth: 180, fontSize: 12, textAlign: "center" }}
  >
    <Card.Header
      className="p-1 text-white"
      style={{
        fontSize: 12,
        fontWeight: "bold",
        backgroundColor: data.headerColor || "#6c757d",
      }}
    >
      {/* Workspace name */}
      {data.workspaceName && (
        <div style={{ fontSize: 10, opacity: 0.8 }}>{data.workspaceName}</div>
      )}
      {data.board}
    </Card.Header>

    <Card.Body className="p-1">
      {data.label && Array.isArray(data.label) && data.label.length > 0 ? (
        <ListGroup variant="flush">
          {data.label.map((lbl, idx) => (
            <ListGroup.Item
              key={idx}
              className="p-1"
              style={{ fontSize: 12, border: "none" }}
            >
              {lbl}
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        data.label && <div>{data.label}</div>
      )}
    </Card.Body>

    <Handle type="target" position={Position.Left} style={{ background: "#555" }} />
    <Handle type="source" position={Position.Right} style={{ background: "#555" }} />
  </Card>
);

const nodeTypes = { stage: StageNode };

// ------------------- Layout Function -------------------
const getLayoutedElements = (nodes, edges, direction = "LR") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  const nodeWidth = 200;
  const nodeHeight = 80;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const pos = dagreGraph.node(node.id);
    node.position = { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 };
    node.targetPosition = direction === "LR" ? Position.Left : Position.Top;
    node.sourcePosition = direction === "LR" ? Position.Right : Position.Bottom;
  });

  return { nodes, edges };
};

// ------------------- Main Component -------------------
const WorkFlowPreview = ({ flowData, boards, masterWorkFlowType = [] }) => {
  const workflowTypeInfo = masterWorkFlowType?.find(
    (wt) => wt?.status_id === flowData?.workflowType,
  );
  const isTaskWorkflow = workflowTypeInfo?.name?.toLowerCase() === "task";

  // Step 1: Build map of used labels
  const usedLabelMap = new Map();
  flowData.flow_detail.forEach((action) => {
    const src = action.source;
    if (!usedLabelMap.has(src.board_id)) usedLabelMap.set(src.board_id, new Set());
    usedLabelMap.get(src.board_id).add(src.label_id);

    action.targets.forEach((target) => {
      if (!usedLabelMap.has(target.board_id))
        usedLabelMap.set(target.board_id, new Set());
      usedLabelMap.get(target.board_id).add(target.label_id);
    });
  });

  // Step 2: Filter boards and labels
  const filteredBoards = boards
    .filter((b) => usedLabelMap.has(b.boardId))
    .map((b) => {
      const usedLabels = usedLabelMap.get(b.boardId);

      if (isTaskWorkflow && usedLabels.has(0)) {
        return { ...b, labels: [{ labelId: 0, name: "" }] };
      }

      return { ...b, labels: b.labels.filter((l) => usedLabels?.has(l.labelId)) };
    });

  // Step 3: Assign board colors
  const boardColors = ["#00ADF0", "#7B61FF", "#00D5A2", "#FA8633", "#17a2b8"];
  const boardColorMap = new Map();
  let colorIndex = 0;
  filteredBoards.forEach((board) => {
    if (!boardColorMap.has(board.boardId)) {
      boardColorMap.set(board.boardId, boardColors[colorIndex % boardColors.length]);
      colorIndex++;
    }
  });

  // Step 4: Generate nodes
  const nodes = [];
  const combinedTargetBoards = new Set();
  if (isTaskWorkflow) {
    flowData.flow_detail.forEach((a) =>
      a.targets.forEach((t) => combinedTargetBoards.add(t.board_id)),
    );
  }

  filteredBoards.forEach((board) => {
    const boardColor = boardColorMap.get(board.boardId);

    // --- Board-level node (Task workflow + label_id=0)
    if (
      isTaskWorkflow &&
      flowData.flow_detail.some(
        (a) => a.source.board_id === board.boardId && a.source.label_id === null,
      )
    ) {
      nodes.push({
        id: `board-${board.boardId}`,
        type: "stage",
        data: {
          board: isTaskWorkflow ? board.workspaceName : board.name,
          workspaceName: null,
          label: board.name,
          headerColor: boardColor,
        },
        position: { x: 0, y: 0 },
      });
    }

    // --- Labels
    board.labels.forEach((label) => {
      if (isTaskWorkflow && combinedTargetBoards.has(board.boardId)) return;

      nodes.push({
        id: `board-${board.boardId}-label-${label.labelId}`,
        type: "stage",
        data: {
          label: [label.name.trim() || `Label ${label.labelId}`],
          color: label.color_Code || "#bbb",
          board: board.name,
          workspaceName: isTaskWorkflow ? board.workspaceName : null,
          headerColor: boardColor,
        },
        position: { x: 0, y: 0 },
        draggable: true,
      });
    });

    // --- Combined target node (Task workflow)
    if (isTaskWorkflow && combinedTargetBoards.has(board.boardId)) {
      const labelNames = [];
      flowData.flow_detail.forEach((a) =>
        a.targets.forEach((t) => {
          if (t.board_id === board.boardId) {
            const lbl = board.labels.find((l) => l.labelId === t.label_id);
            if (lbl?.name) labelNames.push(lbl.name.trim());
          }
        }),
      );

      nodes.push({
        id: `board-${board.boardId}-combined`,
        type: "stage",
        data: {
          board: board.name,
          workspaceName: isTaskWorkflow ? board.workspaceName : null,
          label: [...new Set(labelNames)],
          headerColor: boardColor,
        },
        position: { x: 0, y: 0 },
      });
    }
  });

  // Step 5: Generate edges
  const edgeColors = ["#4CAF50", "#FF9800", "#2196F3", "#9C27B0", "#FF5722"];
  const edges = [];

  flowData.flow_detail.forEach((action, index) => {
    const sourceId =
      isTaskWorkflow && action.source.label_id === null
        ? `board-${action.source.board_id}`
        : `board-${action.source.board_id}-label-${action.source.label_id}`;

    action.targets.forEach((target, tIdx) => {
      const targetId =
        isTaskWorkflow && combinedTargetBoards.has(target.board_id)
          ? `board-${target.board_id}-combined`
          : `board-${target.board_id}-label-${target.label_id}`;

      const color = edgeColors[(index + tIdx) % edgeColors.length];

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        label: !isTaskWorkflow ? action.action_name : null,
        animated: true,
        style: { stroke: color, strokeWidth: 1 },
        labelStyle: { fill: color, fontSize: 12, fontWeight: 500 },
      });
    });
  });

  // Step 6: Layout with dagre
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(nodes, edges, "LR"),
    [],
  );

  const [rfNodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(layoutedEdges);

  // Step 7: Render
  return (
    <div style={{ width: "100%", height: "700px" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="top-right"
        nodeTypes={nodeTypes}
      >
        <MiniMap />
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default WorkFlowPreview;

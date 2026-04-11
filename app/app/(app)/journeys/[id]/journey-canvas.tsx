"use client";

import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  Journey,
  JourneyStats,
  JourneyNode,
  JourneyEdge,
  JourneyGraph,
} from "@/lib/journeys/types";
import { TriggerNode } from "@/components/journeys/nodes/trigger-node";
import { ActionNode } from "@/components/journeys/nodes/action-node";
import { WaitNode } from "@/components/journeys/nodes/wait-node";
import { ConditionNode } from "@/components/journeys/nodes/condition-node";
import { SplitNode } from "@/components/journeys/nodes/split-node";
import { ExitNode } from "@/components/journeys/nodes/exit-node";
import { JourneyTopBar } from "@/components/journeys/journey-top-bar";
import { JourneyStatsBar } from "@/components/journeys/journey-stats-bar";
import { NodePalette } from "@/components/journeys/node-palette";
import { NodeConfigPanel } from "@/components/journeys/node-config-panel";
import { LabeledEdge } from "@/components/journeys/edges/labeled-edge";
import { ScheduleModal } from "@/components/journeys/schedule-modal";

import * as journeyActions from "@/app/actions/journeys";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  wait: WaitNode,
  condition: ConditionNode,
  split: SplitNode,
  exit: ExitNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

const defaultEdgeOptions = {
  type: "labeled" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#94A3B8" },
};

interface JourneyCanvasProps {
  journey: Journey;
  stats: JourneyStats;
}

export function JourneyCanvas({
  journey: initialJourney,
  stats,
}: JourneyCanvasProps) {
  const [journey, setJourney] = useState(initialJourney);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const nodeCounterRef = useRef(
    initialJourney.graph.nodes.length > 0
      ? Math.max(...initialJourney.graph.nodes.map((n) => {
          const num = parseInt(n.id.replace("node_", ""));
          return isNaN(num) ? 0 : num;
        })) + 1
      : 1
  );

  const initialNodes: Node[] = initialJourney.graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as unknown as Record<string, unknown>,
  }));
  const initialEdges: Edge[] = initialJourney.graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label,
    type: "labeled",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94A3B8" },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Auto-assign labels based on source node type and handle
      const sourceNode = nodes.find((n) => n.id === connection.source);
      let label: string | undefined;
      if (sourceNode?.type === "condition") {
        label = connection.sourceHandle === "yes" ? "Yes" : "No";
      } else if (sourceNode?.type === "split") {
        label = connection.sourceHandle === "a" ? "A" : "B";
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
            type: "labeled",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94A3B8" },
            label,
          },
          eds
        )
      );
      setDirty(true);
    },
    [setEdges, nodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      } as unknown as JourneyNode);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // React Flow fires "dimensions" changes on mount — don't mark dirty for those
      const isUserChange = changes.some(
        (c) => c.type !== "dimensions"
      );
      if (isUserChange) setDirty(true);
    },
    [onNodesChange]
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setDirty(true);
    },
    [onEdgesChange]
  );

  const handleUpdateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: data as unknown as JourneyNode["data"] }
          : prev
      );
      setDirty(true);
    },
    [setNodes]
  );

  const handleAddNode = useCallback(
    (type: string, subType?: string) => {
      const id = `node_${nodeCounterRef.current++}`;
      // Place new node below the last node
      const lastNode = nodes[nodes.length - 1];
      const y = lastNode ? lastNode.position.y + 120 : 170;

      let data: Record<string, unknown> = {};

      switch (type) {
        case "trigger":
          data = { label: "Entry", event_type: "" };
          break;
        case "action":
          data = {
            label:
              subType === "send_email"
                ? "Send Email"
                : subType === "send_sms"
                  ? "Send SMS"
                  : subType === "send_push"
                    ? "Send Push"
                    : "Update Attribute",
            action_type: subType ?? "send_email",
          };
          break;
        case "wait":
          data = { label: "Wait 1 hour", wait_type: "delay", delay_amount: 1, delay_unit: "hours" };
          break;
        case "condition":
          data = { label: "Condition", field: "", operator: "eq", value: "" };
          break;
        case "split":
          data = { label: "A/B Split", split_a_percent: 50 };
          break;
        case "exit":
          data = { label: "Exit", exit_reason: "journey_complete" };
          break;
      }

      const newNode: Node = {
        id,
        type,
        position: { x: 250, y },
        data,
      };

      setNodes((nds) => [...nds, newNode]);
      setDirty(true);
    },
    [nodes, setNodes]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const graph: JourneyGraph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as JourneyNode["type"],
          position: n.position,
          data: n.data as unknown as JourneyNode["data"],
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
          label: (e.label as string) ?? undefined,
        })),
      };

      const result = await journeyActions.updateJourney(journey.id, {
        graph,
        trigger_config: (() => {
          const triggerNode = nodes.find((n) => n.type === "trigger");
          if (triggerNode?.data) {
            const data = triggerNode.data as Record<string, unknown>;
            const triggerType = (data.trigger_type as string) ?? "event";
            if (triggerType === "segment") {
              return {
                ...journey.trigger_config,
                trigger_type: "segment" as const,
                segment_id: data.segment_id as string,
                segment_name: data.segment_name as string,
                event_type: undefined,
              };
            }
            return {
              ...journey.trigger_config,
              trigger_type: "event" as const,
              event_type: data.event_type as string,
              segment_id: undefined,
              segment_name: undefined,
            };
          }
          return journey.trigger_config;
        })(),
      });

      if ("journey" in result) {
        setJourney(result.journey);
        setDirty(false);
      }
    } finally {
      setSaving(false);
    }
  }, [journey, nodes, edges]);

  const handleActivate = useCallback(async () => {
    // Save first if dirty
    if (dirty) await handleSave();

    const triggerType = journey.trigger_config?.trigger_type ?? "event";
    if (triggerType === "segment") {
      setShowScheduleModal(true);
      return;
    }

    // Event trigger — activate immediately
    const result = await journeyActions.activateJourney(journey.id);
    if ("journey" in result) {
      setJourney(result.journey);
    } else if ("error" in result) {
      alert(result.error);
    }
  }, [journey, dirty, handleSave]);

  const handleScheduleConfirm = useCallback(
    async (schedule: { scheduled_for: string; timezone: string } | null) => {
      setShowScheduleModal(false);
      const result = await journeyActions.activateJourney(journey.id, schedule);
      if ("journey" in result) {
        setJourney(result.journey);
      } else if ("error" in result) {
        alert(result.error);
      }
    },
    [journey]
  );

  const handlePause = useCallback(async () => {
    const result = await journeyActions.pauseJourney(journey.id);
    if ("journey" in result) setJourney(result.journey);
  }, [journey]);

  const handleResume = useCallback(async () => {
    const result = await journeyActions.resumeJourney(journey.id);
    if ("journey" in result) setJourney(result.journey);
  }, [journey]);

  const isEditable = journey.status === "draft" || journey.status === "paused";

  return (
    <div className="flex flex-1 flex-col">
      <JourneyTopBar
        journey={journey}
        onSave={handleSave}
        onActivate={handleActivate}
        onPause={handlePause}
        onResume={handleResume}
        saving={saving}
        dirty={dirty}
      />
      <JourneyStatsBar stats={stats} />

      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isEditable ? handleNodesChange : undefined}
          onEdgesChange={isEditable ? handleEdgesChange : undefined}
          onConnect={isEditable ? onConnect : undefined}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          deleteKeyCode={isEditable ? "Backspace" : null}
          nodesDraggable={isEditable}
          nodesConnectable={isEditable}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls position="top-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(node) => {
              switch (node.type) {
                case "trigger": return "#10B981";
                case "action": return "#3B82F6";
                case "wait": return "#F59E0B";
                case "condition": return "#F97316";
                case "split": return "#8B5CF6";
                case "exit": return "#EF4444";
                default: return "#94A3B8";
              }
            }}
          />
        </ReactFlow>

        {isEditable && <NodePalette onAddNode={handleAddNode} />}

        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleUpdateNodeData}
            onClose={() => setSelectedNode(null)}
            journeyStatus={journey.status}
          />
        )}
      </div>

      {showScheduleModal && (
        <ScheduleModal
          onConfirm={handleScheduleConfirm}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}

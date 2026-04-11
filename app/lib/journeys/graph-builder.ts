/**
 * Graph Builder — converts linear step descriptions from chat
 * into React Flow graphs with vertical layout.
 */

import type {
  JourneyGraph,
  JourneyNode,
  JourneyEdge,
  TriggerNodeData,
  ActionNodeData,
  WaitNodeData,
  ConditionNodeData,
  SplitNodeData,
  ExitNodeData,
  ActionType,
  WaitType,
  TriggerType,
} from "./types";

interface StepDescription {
  type: "trigger" | "send_email" | "send_sms" | "send_push" | "wait" | "condition" | "split" | "exit";
  label?: string;
  // trigger
  event_type?: string;
  // action
  content_template_id?: string;
  template_name?: string;
  // wait
  delay_amount?: number;
  delay_unit?: "minutes" | "hours" | "days";
  wait_event_type?: string;
  // condition
  field?: string;
  operator?: string;
  value?: string | number | boolean;
  // split
  split_a_percent?: number;
  // yes/no branches
  yes_steps?: StepDescription[];
  no_steps?: StepDescription[];
  // A/B branches
  a_steps?: StepDescription[];
  b_steps?: StepDescription[];
  // exit
  exit_reason?: string;
}

const VERTICAL_SPACING = 120;
const HORIZONTAL_SPACING = 300;
const START_X = 250;
const START_Y = 50;

let nodeCounter = 0;

function nextId(): string {
  nodeCounter++;
  return `node_${nodeCounter}`;
}

interface EventTriggerInput {
  triggerType: "event";
  eventType: string;
}

interface SegmentTriggerInput {
  triggerType: "segment";
  segmentId: string;
  segmentName?: string;
}

export function buildGraphFromSteps(
  triggerInput: EventTriggerInput | SegmentTriggerInput,
  steps: StepDescription[]
): JourneyGraph {
  nodeCounter = 0;
  const nodes: JourneyNode[] = [];
  const edges: JourneyEdge[] = [];

  // Create trigger node
  const triggerId = nextId();
  const triggerData: TriggerNodeData =
    triggerInput.triggerType === "segment"
      ? {
          label: triggerInput.segmentName
            ? `Segment: ${triggerInput.segmentName}`
            : "Segment Entry",
          trigger_type: "segment",
          segment_id: triggerInput.segmentId,
          segment_name: triggerInput.segmentName,
        }
      : {
          label: formatEventLabel(triggerInput.eventType),
          trigger_type: "event",
          event_type: triggerInput.eventType,
        };

  nodes.push({
    id: triggerId,
    type: "trigger",
    position: { x: START_X, y: START_Y },
    data: triggerData,
  });

  // Build the linear chain
  let lastNodeId = triggerId;
  let currentY = START_Y + VERTICAL_SPACING;

  for (const step of steps) {
    const result = buildStepNode(step, START_X, currentY);
    nodes.push(...result.nodes);
    edges.push(...result.edges);

    // Connect previous node to this step's entry
    edges.push({
      id: `edge_${lastNodeId}_${result.entryId}`,
      source: lastNodeId,
      target: result.entryId,
    });

    lastNodeId = result.exitId;
    currentY = result.maxY + VERTICAL_SPACING;
  }

  // Add exit node at the end
  const exitId = nextId();
  nodes.push({
    id: exitId,
    type: "exit",
    position: { x: START_X, y: currentY },
    data: {
      label: "Journey Complete",
      exit_reason: "journey_complete",
    } as ExitNodeData,
  });

  edges.push({
    id: `edge_${lastNodeId}_${exitId}`,
    source: lastNodeId,
    target: exitId,
  });

  return { nodes, edges };
}

interface BuildResult {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  entryId: string;
  exitId: string;
  maxY: number;
}

function buildStepNode(
  step: StepDescription,
  x: number,
  y: number
): BuildResult {
  const nodes: JourneyNode[] = [];
  const edges: JourneyEdge[] = [];

  if (step.type === "send_email" || step.type === "send_sms" || step.type === "send_push") {
    const id = nextId();
    const actionType = step.type as ActionType;
    const channelLabel = step.type.replace("send_", "").toUpperCase();

    nodes.push({
      id,
      type: "action",
      position: { x, y },
      data: {
        label: step.label ?? `Send ${channelLabel}`,
        action_type: actionType,
        content_template_id: step.content_template_id,
        template_name: step.template_name,
      } as ActionNodeData,
    });

    return { nodes, edges, entryId: id, exitId: id, maxY: y };
  }

  if (step.type === "wait") {
    const id = nextId();
    const waitType: WaitType = step.wait_event_type ? "wait_for_event" : "delay";
    const delayLabel = step.delay_amount
      ? `${step.delay_amount} ${step.delay_unit ?? "hours"}`
      : "Wait";

    nodes.push({
      id,
      type: "wait",
      position: { x, y },
      data: {
        label: step.label ?? `Wait ${delayLabel}`,
        wait_type: waitType,
        delay_amount: step.delay_amount,
        delay_unit: step.delay_unit ?? "hours",
        wait_event_type: step.wait_event_type,
      } as WaitNodeData,
    });

    return { nodes, edges, entryId: id, exitId: id, maxY: y };
  }

  if (step.type === "condition") {
    const condId = nextId();
    nodes.push({
      id: condId,
      type: "condition",
      position: { x, y },
      data: {
        label: step.label ?? `${step.field} ${step.operator} ${step.value}`,
        field: step.field ?? "",
        operator: step.operator ?? "eq",
        value: step.value ?? "",
      } as ConditionNodeData,
    });

    // Build yes and no branches
    let maxY = y;
    let yesExitId = condId;
    let noExitId = condId;

    if (step.yes_steps && step.yes_steps.length > 0) {
      let branchY = y + VERTICAL_SPACING;
      let branchLastId = condId;
      let isFirst = true;

      for (const s of step.yes_steps) {
        const result = buildStepNode(s, x - HORIZONTAL_SPACING / 2, branchY);
        nodes.push(...result.nodes);
        edges.push(...result.edges);

        edges.push({
          id: `edge_${branchLastId}_${result.entryId}`,
          source: branchLastId,
          target: result.entryId,
          sourceHandle: isFirst ? "yes" : undefined,
        });

        branchLastId = result.exitId;
        branchY = result.maxY + VERTICAL_SPACING;
        maxY = Math.max(maxY, result.maxY);
        isFirst = false;
      }
      yesExitId = branchLastId;
    }

    if (step.no_steps && step.no_steps.length > 0) {
      let branchY = y + VERTICAL_SPACING;
      let branchLastId = condId;
      let isFirst = true;

      for (const s of step.no_steps) {
        const result = buildStepNode(s, x + HORIZONTAL_SPACING / 2, branchY);
        nodes.push(...result.nodes);
        edges.push(...result.edges);

        edges.push({
          id: `edge_${branchLastId}_${result.entryId}`,
          source: branchLastId,
          target: result.entryId,
          sourceHandle: isFirst ? "no" : undefined,
        });

        branchLastId = result.exitId;
        branchY = result.maxY + VERTICAL_SPACING;
        maxY = Math.max(maxY, result.maxY);
        isFirst = false;
      }
      noExitId = branchLastId;
    }

    // Add merge node after branches
    const mergeY = maxY + VERTICAL_SPACING;
    const mergeId = nextId();
    nodes.push({
      id: mergeId,
      type: "action",
      position: { x, y: mergeY },
      data: {
        label: "Continue",
        action_type: "update_attribute",
      } as ActionNodeData,
    });

    if (yesExitId !== condId) {
      edges.push({
        id: `edge_${yesExitId}_${mergeId}`,
        source: yesExitId,
        target: mergeId,
      });
    } else {
      edges.push({
        id: `edge_${condId}_yes_${mergeId}`,
        source: condId,
        target: mergeId,
        sourceHandle: "yes",
      });
    }

    if (noExitId !== condId) {
      edges.push({
        id: `edge_${noExitId}_${mergeId}`,
        source: noExitId,
        target: mergeId,
      });
    } else {
      edges.push({
        id: `edge_${condId}_no_${mergeId}`,
        source: condId,
        target: mergeId,
        sourceHandle: "no",
      });
    }

    return { nodes, edges, entryId: condId, exitId: mergeId, maxY: mergeY };
  }

  if (step.type === "split") {
    const splitId = nextId();
    nodes.push({
      id: splitId,
      type: "split",
      position: { x, y },
      data: {
        label: step.label ?? "A/B Split",
        split_a_percent: step.split_a_percent ?? 50,
      } as SplitNodeData,
    });

    // Similar branching logic as condition
    let maxY = y;
    let aExitId = splitId;
    let bExitId = splitId;

    if (step.a_steps && step.a_steps.length > 0) {
      let branchY = y + VERTICAL_SPACING;
      let branchLastId = splitId;
      let isFirst = true;

      for (const s of step.a_steps) {
        const result = buildStepNode(s, x - HORIZONTAL_SPACING / 2, branchY);
        nodes.push(...result.nodes);
        edges.push(...result.edges);
        edges.push({
          id: `edge_${branchLastId}_${result.entryId}`,
          source: branchLastId,
          target: result.entryId,
          sourceHandle: isFirst ? "a" : undefined,
        });
        branchLastId = result.exitId;
        branchY = result.maxY + VERTICAL_SPACING;
        maxY = Math.max(maxY, result.maxY);
        isFirst = false;
      }
      aExitId = branchLastId;
    }

    if (step.b_steps && step.b_steps.length > 0) {
      let branchY = y + VERTICAL_SPACING;
      let branchLastId = splitId;
      let isFirst = true;

      for (const s of step.b_steps) {
        const result = buildStepNode(s, x + HORIZONTAL_SPACING / 2, branchY);
        nodes.push(...result.nodes);
        edges.push(...result.edges);
        edges.push({
          id: `edge_${branchLastId}_${result.entryId}`,
          source: branchLastId,
          target: result.entryId,
          sourceHandle: isFirst ? "b" : undefined,
        });
        branchLastId = result.exitId;
        branchY = result.maxY + VERTICAL_SPACING;
        maxY = Math.max(maxY, result.maxY);
        isFirst = false;
      }
      bExitId = branchLastId;
    }

    // Merge node
    const mergeY = maxY + VERTICAL_SPACING;
    const mergeId = nextId();
    nodes.push({
      id: mergeId,
      type: "action",
      position: { x, y: mergeY },
      data: { label: "Continue", action_type: "update_attribute" } as ActionNodeData,
    });

    edges.push({
      id: `edge_${aExitId}_${mergeId}`,
      source: aExitId,
      target: mergeId,
      sourceHandle: aExitId === splitId ? "a" : undefined,
    });
    edges.push({
      id: `edge_${bExitId}_${mergeId}`,
      source: bExitId,
      target: mergeId,
      sourceHandle: bExitId === splitId ? "b" : undefined,
    });

    return { nodes, edges, entryId: splitId, exitId: mergeId, maxY: mergeY };
  }

  if (step.type === "exit") {
    const id = nextId();
    nodes.push({
      id,
      type: "exit",
      position: { x, y },
      data: {
        label: step.label ?? "Exit",
        exit_reason: step.exit_reason ?? "manual_exit",
      } as ExitNodeData,
    });
    return { nodes, edges, entryId: id, exitId: id, maxY: y };
  }

  // Trigger (shouldn't appear in steps, but handle gracefully)
  const id = nextId();
  nodes.push({
    id,
    type: "trigger",
    position: { x, y },
    data: {
      label: step.label ?? "Trigger",
      trigger_type: "event" satisfies TriggerType,
      event_type: step.event_type ?? "",
    } as TriggerNodeData,
  });
  return { nodes, edges, entryId: id, exitId: id, maxY: y };
}

function formatEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    "cart.abandoned": "Cart Abandoned",
    "order.placed": "Order Placed",
    "order.fulfilled": "Order Fulfilled",
    "customer.created": "New Customer",
    "checkout.started": "Checkout Started",
    "email.opened": "Email Opened",
    "email.clicked": "Email Clicked",
  };
  return labels[eventType] ?? eventType;
}

/**
 * Chat tool definitions for the AI SDK v4.
 *
 * Each tool wraps an existing lib/api/ function so the chat agent
 * can call the same business logic as the visual UI.
 */

import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as segmentsAPI from "@/lib/api/segments";
import * as contentAPI from "@/lib/api/content";
import * as generateAPI from "@/lib/content/generate";
import * as dataAPI from "@/lib/api/data";
import * as shopifyAPI from "@/lib/api/shopify";
import * as journeysAPI from "@/lib/api/journeys";
import * as apiKeysAPI from "@/lib/api/api-keys";
import { buildGraphFromSteps } from "@/lib/journeys/graph-builder";
import type {
  ActionNodeData,
  JourneyGraph,
  JourneyNode,
  TriggerType,
} from "@/lib/journeys/types";
import type {
  RuleCondition,
  RuleGroup,
  RuleOperator,
} from "@/lib/segments/types";
import {
  getJourneyTemplate,
  type JourneyTemplateStep,
} from "@/lib/chat/templates/journey-templates";
import {
  getSegmentTemplate,
  SEGMENT_TEMPLATES,
} from "@/lib/chat/templates/segment-templates";

type ChatConditionInput = {
  field: string;
  operator: RuleOperator;
  value?: string | number | boolean;
};

function parseConditionsToRules(
  combinator: "and" | "or",
  conditions: ChatConditionInput[]
): RuleGroup {
  return {
    type: "group",
    combinator,
    children: conditions.map((condition) => {
      let value: RuleCondition["value"] = condition.value;

      if (condition.operator === "between" && typeof value === "string") {
        const parts = value.split(",").map((part) => part.trim());
        value = [
          Number.isNaN(Number(parts[0])) ? parts[0] : Number(parts[0]),
          Number.isNaN(Number(parts[1])) ? parts[1] : Number(parts[1]),
        ] as RuleCondition["value"];
      }

      return {
        type: "condition",
        field: condition.field,
        operator: condition.operator,
        value,
      } satisfies RuleCondition;
    }),
  };
}

async function ensureSegmentForTemplate(
  admin: SupabaseClient,
  tenantId: string,
  templateKey: string
) {
  const template = getSegmentTemplate(templateKey);
  if (!template) {
    throw new Error(`Unknown segment template: ${templateKey}`);
  }

  try {
    const segment = await segmentsAPI.createSegment(admin, tenantId, {
      name: template.name,
      description: template.description,
      rules: template.rules,
      created_by: "ai",
    });

    return {
      id: segment.id,
      name: segment.name,
      created: true,
      contactCount: segment.contact_count,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists")) {
      throw error;
    }

    const existingSegments = await segmentsAPI.listSegments(admin, tenantId);
    const existing = existingSegments.find((segment) => segment.name === template.name);
    if (!existing) {
      throw error;
    }

    return {
      id: existing.id,
      name: existing.name,
      created: false,
      contactCount: existing.contact_count,
    };
  }
}

function deriveTemplatePurpose(
  journeyName: string,
  node: JourneyNode,
  triggerDescription: string,
  audience?: string
): string {
  const data = node.data as ActionNodeData;
  const stepLabel = data.label || data.action_type;
  const audienceText = audience ? ` for ${audience}` : "";
  return `${stepLabel} in the ${journeyName} journey triggered by ${triggerDescription}${audienceText}`;
}

async function attachGeneratedContentToGraph(
  admin: SupabaseClient,
  tenantId: string,
  graph: JourneyGraph,
  journeyName: string,
  triggerDescription: string,
  audience?: string
) {
  const createdTemplates: Array<{
    id: string;
    name: string;
    channel: string;
    nodeId: string;
  }> = [];

  const nextNodes = await Promise.all(
    graph.nodes.map(async (node) => {
      if (node.type !== "action") return node;

      const data = node.data as ActionNodeData;
      if (data.content_template_id) return node;

      if (
        data.action_type !== "send_email" &&
        data.action_type !== "send_sms" &&
        data.action_type !== "send_push"
      ) {
        return node;
      }

      const purpose = deriveTemplatePurpose(
        journeyName,
        node,
        triggerDescription,
        audience
      );

      let template;
      if (data.action_type === "send_sms") {
        template = await generateAPI.generateSmsContent(admin, tenantId, {
          purpose,
          audience,
        });
      } else if (data.action_type === "send_push") {
        template = await generateAPI.generatePushContent(admin, tenantId, {
          purpose,
          audience,
        });
      } else {
        template = await generateAPI.generateEmailContent(admin, tenantId, {
          purpose,
          audience,
        });
      }

      createdTemplates.push({
        id: template.id,
        name: template.name,
        channel: template.channel,
        nodeId: node.id,
      });

      return {
        ...node,
        data: {
          ...data,
          content_template_id: template.id,
          template_name: template.name,
        } as ActionNodeData,
      };
    })
  );

  return {
    graph: {
      ...graph,
      nodes: nextNodes,
    },
    createdTemplates,
  };
}

async function createJourneyWithGeneratedContent(
  admin: SupabaseClient,
  tenantId: string,
  input: {
    name: string;
    description?: string;
    triggerType: TriggerType;
    triggerEventType?: string;
    segmentId?: string;
    steps: JourneyTemplateStep[];
  }
) {
  let segmentName: string | undefined;

  if (input.triggerType === "segment") {
    if (!input.segmentId) {
      throw new Error("segmentId is required when triggerType is 'segment'");
    }
    const segment = await segmentsAPI.getSegment(admin, tenantId, input.segmentId);
    segmentName = segment.name;
  } else if (!input.triggerEventType) {
    throw new Error("triggerEventType is required when triggerType is 'event'");
  }

  const graph = buildGraphFromSteps(
    input.triggerType === "segment"
      ? {
          triggerType: "segment",
          segmentId: input.segmentId!,
          segmentName,
        }
      : {
          triggerType: "event",
          eventType: input.triggerEventType!,
        },
    input.steps
  );

  const triggerDescription =
    input.triggerType === "segment"
      ? `segment ${segmentName ?? input.segmentId}`
      : input.triggerEventType!;

  const audience = segmentName
    ? `${segmentName} contacts`
    : undefined;

  const enriched = await attachGeneratedContentToGraph(
    admin,
    tenantId,
    graph,
    input.name,
    triggerDescription,
    audience
  );

  const journey = await journeysAPI.createJourney(admin, tenantId, {
    name: input.name,
    description: input.description,
    graph: enriched.graph,
    trigger_config:
      input.triggerType === "segment"
        ? {
            trigger_type: "segment",
            segment_id: input.segmentId,
            segment_name: segmentName,
          }
        : {
            trigger_type: "event",
            event_type: input.triggerEventType,
          },
    created_by: "ai",
  });

  return {
    journey,
    graph: enriched.graph,
    createdTemplates: enriched.createdTemplates,
    triggerEventType: input.triggerEventType,
    segmentName,
  };
}

async function resolveJourneyTriggerDetails(
  admin: SupabaseClient,
  tenantId: string,
  input: {
    triggerType: TriggerType;
    triggerEventType?: string;
    segmentId?: string;
  }
) {
  if (input.triggerType === "segment") {
    if (!input.segmentId) {
      throw new Error("segmentId is required when triggerType is 'segment'");
    }

    const segment = await segmentsAPI.getSegment(admin, tenantId, input.segmentId);
    return {
      triggerType: "segment" as const,
      triggerEventType: null,
      segmentId: segment.id,
      segmentName: segment.name,
      triggerLabel: `Segment: ${segment.name}`,
      graphTrigger: {
        triggerType: "segment" as const,
        segmentId: segment.id,
        segmentName: segment.name,
      },
    };
  }

  if (!input.triggerEventType) {
    throw new Error("triggerEventType is required when triggerType is 'event'");
  }

  return {
    triggerType: "event" as const,
    triggerEventType: input.triggerEventType,
    segmentId: null,
    segmentName: null,
    triggerLabel: input.triggerEventType,
    graphTrigger: {
      triggerType: "event" as const,
      eventType: input.triggerEventType,
    },
  };
}

function countChannels(steps: JourneyTemplateStep[]) {
  const counts = { email: 0, sms: 0, push: 0 };

  const walk = (items: JourneyTemplateStep[]) => {
    for (const step of items) {
      if (step.type === "send_email") counts.email += 1;
      if (step.type === "send_sms") counts.sms += 1;
      if (step.type === "send_push") counts.push += 1;

      if (step.yes_steps) walk(step.yes_steps);
      if (step.no_steps) walk(step.no_steps);
      if (step.a_steps) walk(step.a_steps);
      if (step.b_steps) walk(step.b_steps);
    }
  };

  walk(steps);
  return counts;
}

function summarizeJourneySteps(
  steps: JourneyTemplateStep[]
): Array<{ label: string; type: JourneyTemplateStep["type"] }> {
  return steps.map((step) => ({
    type: step.type,
    label:
      step.label ??
      (step.type === "wait"
        ? step.delay_amount
          ? `Wait ${step.delay_amount} ${step.delay_unit ?? "hours"}`
          : "Wait"
        : step.type === "send_email"
          ? "Send email"
          : step.type === "send_sms"
            ? "Send SMS"
            : step.type === "send_push"
              ? "Send push"
              : step.type === "condition"
                ? "Condition"
                : step.type === "split"
                  ? "A/B split"
                  : "Exit"),
  }));
}

async function proposeJourneyPlan(
  admin: SupabaseClient,
  tenantId: string,
  input: {
    name: string;
    description?: string;
    triggerType: TriggerType;
    triggerEventType?: string;
    segmentId?: string;
    steps: JourneyTemplateStep[];
  }
) {
  const trigger = await resolveJourneyTriggerDetails(admin, tenantId, input);
  const graph = buildGraphFromSteps(trigger.graphTrigger, input.steps);
  const channelBreakdown = countChannels(input.steps);

  return {
    name: input.name,
    description: input.description ?? null,
    triggerType: trigger.triggerType,
    triggerEventType: trigger.triggerEventType,
    triggerLabel: trigger.triggerLabel,
    segmentId: trigger.segmentId,
    segmentName: trigger.segmentName,
    stepSummary: summarizeJourneySteps(input.steps),
    steps: input.steps,
    nodeCount: graph.nodes.length,
    channelBreakdown,
    estimatedTemplates:
      channelBreakdown.email + channelBreakdown.sms + channelBreakdown.push,
  };
}

const stepSchema: z.ZodType<JourneyTemplateStep> = z.lazy(() =>
  z.object({
    type: z
      .enum([
        "send_email",
        "send_sms",
        "send_push",
        "wait",
        "condition",
        "split",
        "exit",
      ])
      .describe("Step type"),
    label: z.string().optional().describe("Display label for this step"),
    content_template_id: z
      .string()
      .optional()
      .describe("Optional existing content template ID to link"),
    template_name: z
      .string()
      .optional()
      .describe("Optional display name for the linked content template"),
    delay_amount: z
      .number()
      .optional()
      .describe("Wait duration amount for wait steps"),
    delay_unit: z
      .enum(["minutes", "hours", "days"])
      .optional()
      .describe("Wait duration unit"),
    wait_event_type: z
      .string()
      .optional()
      .describe("Optional event to wait for instead of a fixed delay"),
    field: z
      .string()
      .optional()
      .describe("Contact field for condition steps"),
    operator: z
      .string()
      .optional()
      .describe("Comparison operator for condition steps"),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe("Value for condition steps"),
    split_a_percent: z
      .number()
      .optional()
      .describe("Percentage allocated to branch A for split steps"),
    yes_steps: z.array(stepSchema).optional().describe("Steps for the yes branch"),
    no_steps: z.array(stepSchema).optional().describe("Steps for the no branch"),
    a_steps: z.array(stepSchema).optional().describe("Steps for split branch A"),
    b_steps: z.array(stepSchema).optional().describe("Steps for split branch B"),
    exit_reason: z.string().optional().describe("Reason code for exit steps"),
  })
);

const journeyToolInputSchema = z.object({
  name: z.string().describe("Name for the journey"),
  description: z.string().optional().describe("Journey description"),
  triggerType: z
    .enum(["event", "segment"])
    .optional()
    .describe("Trigger mode. Defaults to 'event'."),
  triggerEventType: z
    .string()
    .optional()
    .describe(
      "Required when triggerType is 'event'. Options include cart.abandoned, order.placed, order.fulfilled, customer.created, checkout.started."
    ),
  segmentId: z
    .string()
    .optional()
    .describe("Required when triggerType is 'segment'."),
  steps: z.array(stepSchema).describe("Journey steps in order"),
});

const segmentConditionSchema = z.object({
  field: z
    .string()
    .describe(
      "Contact field: email, phone, first_name, last_name, total_orders, total_revenue, avg_order_value, last_order_at, first_order_at, engagement_score, lifecycle_stage, email_consent, sms_consent, created_at"
    ),
  operator: z
    .enum([
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "contains",
      "is_null",
      "is_not_null",
    ])
    .describe("Comparison operator"),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe(
      "Value to compare against. For 'between', pass a comma-separated string like '10,20'."
    ),
});

export function createChatTools(admin: SupabaseClient, tenantId: string, userId?: string) {
  return {
    queryContacts: tool({
      description:
        "Search and list contacts with optional filters. Use this to answer questions about contacts, audience size, lifecycle stages, or find specific people.",
      inputSchema: z.object({
        search: z.string().optional().describe("Search by name or email"),
        lifecycleStage: z
          .string()
          .optional()
          .describe(
            "Filter by lifecycle stage: prospect, active, at_risk, lapsed, or vip"
          ),
        limit: z.number().optional().describe("Max contacts to return (default 20)"),
        sortBy: z
          .string()
          .optional()
          .describe(
            "Sort field: created_at, engagement_score, total_orders, total_revenue"
          ),
        sortAsc: z.boolean().optional().describe("Sort ascending (default false)"),
      }),
      execute: async ({ search, lifecycleStage, limit, sortBy, sortAsc }) => {
        const result = await segmentsAPI.listContacts(admin, tenantId, {
          search,
          lifecycleStage,
          limit: limit ?? 20,
          sortBy,
          sortAsc,
        });
        return {
          total: result.total,
          contacts: result.contacts,
        };
      },
    }),

    querySegments: tool({
      description:
        "List all audience segments. Shows segment names, rules, contact counts, and status.",
      inputSchema: z.object({}),
      execute: async () => {
        const segments = await segmentsAPI.listSegments(admin, tenantId);
        return {
          segments: segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            description: segment.description,
            rules: segment.rules,
            status: segment.status,
            contactCount: segment.contact_count,
          })),
          templates: SEGMENT_TEMPLATES.map((template) => ({
            key: template.key,
            name: template.name,
            description: template.description,
            rules: template.rules,
          })),
        };
      },
    }),

    createSegment: tool({
      description:
        "Create a new audience segment based on rules. The segment is created as active immediately. Rules use field/operator/value conditions grouped by a combinator.",
      inputSchema: z.object({
        name: z.string().describe("Name for the segment"),
        description: z
          .string()
          .optional()
          .describe("Description of what this segment represents"),
        combinator: z
          .enum(["and", "or"])
          .describe(
            "How to combine conditions: 'and' (all must match) or 'or' (any must match)"
          ),
        conditions: z.array(segmentConditionSchema),
      }),
      execute: async ({ name, description, combinator, conditions }) => {
        const segment = await segmentsAPI.createSegment(admin, tenantId, {
          name,
          description,
          rules: parseConditionsToRules(combinator, conditions),
          created_by: "ai",
        });

        return {
          id: segment.id,
          name: segment.name,
          contactCount: segment.contact_count,
          rules: segment.rules,
          status: segment.status,
        };
      },
    }),

    updateSegment: tool({
      description:
        "Update an existing segment. You can rename it, change its description, or replace its rule set.",
      inputSchema: z.object({
        segmentId: z.string().describe("The segment ID to update"),
        name: z.string().optional().describe("Updated segment name"),
        description: z
          .string()
          .optional()
          .describe("Updated segment description"),
        combinator: z
          .enum(["and", "or"])
          .optional()
          .describe("How to combine the provided conditions"),
        conditions: z
          .array(segmentConditionSchema)
          .optional()
          .describe("Replacement conditions for the segment"),
      }),
      execute: async ({ segmentId, name, description, combinator, conditions }) => {
        if ((combinator && !conditions) || (!combinator && conditions)) {
          throw new Error(
            "Provide both combinator and conditions when updating segment rules"
          );
        }

        const segment = await segmentsAPI.updateSegment(admin, tenantId, segmentId, {
          name,
          description,
          rules:
            combinator && conditions
              ? parseConditionsToRules(combinator, conditions)
              : undefined,
        });

        return {
          id: segment.id,
          name: segment.name,
          description: segment.description,
          status: segment.status,
          contactCount: segment.contact_count,
          rules: segment.rules,
        };
      },
    }),

    deleteSegment: tool({
      description:
        "Delete a segment permanently. Use this only when the user explicitly asks to remove a segment.",
      inputSchema: z.object({
        segmentId: z.string().describe("The segment ID to delete"),
      }),
      execute: async ({ segmentId }) => {
        await segmentsAPI.deleteSegment(admin, tenantId, segmentId);
        return { deleted: true, segmentId };
      },
    }),

    getPipelineStats: tool({
      description:
        "Get data pipeline statistics including total events, unprocessed events, errors, contact count, and event count.",
      inputSchema: z.object({}),
      execute: async () => {
        return await dataAPI.getPipelineStats(admin, tenantId);
      },
    }),

    getShopifyStatus: tool({
      description: "Check if Shopify is connected and get the store URL.",
      inputSchema: z.object({}),
      execute: async () => {
        return await shopifyAPI.getShopifyStatus(admin, tenantId);
      },
    }),

    listContent: tool({
      description:
        "List content templates with optional channel and status filters. Use this to show what templates exist in the content library.",
      inputSchema: z.object({
        channel: z.enum(["email", "sms", "push"]).optional().describe("Filter by channel type"),
        status: z
          .enum(["draft", "active", "archived"])
          .optional()
          .describe("Filter by template status"),
      }),
      execute: async ({ channel, status }) => {
        const result = await contentAPI.listTemplates(admin, tenantId, {
          channel: channel ?? undefined,
          status: status ?? undefined,
          limit: 20,
        });

        return result.templates.map((template) => ({
          id: template.id,
          name: template.name,
          channel: template.channel,
          status: template.status,
          subject: template.subject,
          previewText:
            template.body_text?.substring(0, 100) ?? template.push_title ?? null,
          updatedAt: template.updated_at,
        }));
      },
    }),

    getContentTemplate: tool({
      description:
        "Fetch a specific content template by ID. Returns full template details.",
      inputSchema: z.object({
        templateId: z.string().describe("The template ID to fetch"),
      }),
      execute: async ({ templateId }) => {
        const template = await contentAPI.getTemplate(admin, tenantId, templateId);
        return {
          id: template.id,
          name: template.name,
          channel: template.channel,
          status: template.status,
          subject: template.subject,
          preheader: template.preheader,
          bodyText: template.body_text,
          pushTitle: template.push_title,
          liquidVariables: template.liquid_variables,
          tags: template.tags,
          updatedAt: template.updated_at,
        };
      },
    }),

    createSmsTemplate: tool({
      description:
        "Create an SMS content template. Supports Liquid variables like {{ contact.first_name }}. Created as draft by default.",
      inputSchema: z.object({
        name: z.string().describe("Template name"),
        body: z
          .string()
          .describe(
            "SMS message text. Can include Liquid variables like {{ contact.first_name }}, {{ shop.name }}, {{ campaign.coupon_code }}."
          ),
      }),
      execute: async ({ name, body }) => {
        const template = await contentAPI.createTemplate(admin, tenantId, {
          name,
          channel: "sms",
          body_text: body,
          body_json: { text: body },
          created_by: "ai",
        });

        return {
          id: template.id,
          name: template.name,
          channel: template.channel,
          status: template.status,
          bodyText: template.body_text,
          liquidVariables: template.liquid_variables,
        };
      },
    }),

    createPushTemplate: tool({
      description:
        "Create a push notification content template. Supports Liquid variables. Created as draft by default.",
      inputSchema: z.object({
        name: z.string().describe("Template name"),
        title: z.string().describe("Push notification title (max ~50 chars)"),
        body: z.string().describe("Push notification body text (max ~150 chars)"),
      }),
      execute: async ({ name, title, body }) => {
        const template = await contentAPI.createTemplate(admin, tenantId, {
          name,
          channel: "push",
          push_title: title,
          body_text: body,
          body_json: { title, body },
          created_by: "ai",
        });

        return {
          id: template.id,
          name: template.name,
          channel: template.channel,
          status: template.status,
          pushTitle: template.push_title,
          bodyText: template.body_text,
        };
      },
    }),

    createEmailTemplate: tool({
      description:
        "Create an email content template with MJML body. Supports Liquid variables. Created as draft by default.",
      inputSchema: z.object({
        name: z.string().describe("Template name"),
        subject: z
          .string()
          .describe(
            "Email subject line. Can include Liquid like {{ contact.first_name }}."
          ),
        body: z
          .string()
          .describe(
            "Email body as plain text content. Will be wrapped in a basic MJML template."
          ),
      }),
      execute: async ({ name, subject, body }) => {
        const mjml = `<mjml>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="24px" font-weight="bold" color="#1E293B">
          {{ shop.name }}
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="16px" color="#374151" line-height="1.6">
          ${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#f8fafc" padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#94A3B8">
          <a href="#" style="color: #64748B;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

        const template = await contentAPI.createTemplate(admin, tenantId, {
          name,
          channel: "email",
          subject,
          body_json: mjml,
          body_text: body,
          created_by: "ai",
        });

        return {
          id: template.id,
          name: template.name,
          channel: template.channel,
          status: template.status,
          subject: template.subject,
        };
      },
    }),

    generateContent: tool({
      description:
        "AI-generate content and create a template in one step. Use this when the user asks you to 'generate', 'write', or 'come up with' content for a specific purpose. Returns the created template with a link to edit in Content Studio.",
      inputSchema: z.object({
        channel: z.enum(["email", "sms", "push"]).describe("Content channel to generate"),
        purpose: z
          .string()
          .describe(
            "The purpose of the content, e.g. 'abandoned cart recovery', 'welcome new customers', 'win-back lapsed buyers'"
          ),
        tone: z
          .string()
          .optional()
          .describe("Desired tone, e.g. 'friendly', 'urgent', 'casual', 'professional'"),
        audience: z
          .string()
          .optional()
          .describe("Target audience, e.g. 'new subscribers', 'VIP customers', 'lapsed buyers'"),
      }),
      execute: async ({ channel, purpose, tone, audience }) => {
        const options = { purpose, tone, audience };

        let template;
        if (channel === "sms") {
          template = await generateAPI.generateSmsContent(admin, tenantId, options);
        } else if (channel === "push") {
          template = await generateAPI.generatePushContent(admin, tenantId, options);
        } else {
          template = await generateAPI.generateEmailContent(admin, tenantId, options);
        }

        return {
          id: template.id,
          name: template.name,
          channel: template.channel,
          status: template.status,
          subject: template.subject,
          bodyText: template.body_text,
          pushTitle: template.push_title,
          editUrl: `/content/${template.channel}/${template.id}`,
        };
      },
    }),

    proposeJourney: tool({
      description:
        "Preview a marketing journey plan without creating anything. Use this to show the user a structured plan card they can review before confirming build.",
      inputSchema: journeyToolInputSchema,
      execute: async ({
        name,
        description,
        triggerType,
        triggerEventType,
        segmentId,
        steps,
      }) => {
        return await proposeJourneyPlan(admin, tenantId, {
          name,
          description,
          triggerType: triggerType ?? "event",
          triggerEventType,
          segmentId,
          steps,
        });
      },
    }),

    executeJourney: tool({
      description:
        "Build a marketing journey after the user has confirmed the preview. Creates the graph, generates missing content templates, and saves the journey as a draft.",
      inputSchema: journeyToolInputSchema,
      execute: async ({
        name,
        description,
        triggerType,
        triggerEventType,
        segmentId,
        steps,
      }) => {
        const result = await createJourneyWithGeneratedContent(admin, tenantId, {
          name,
          description,
          triggerType: triggerType ?? "event",
          triggerEventType,
          segmentId,
          steps,
        });

        return {
          id: result.journey.id,
          name: result.journey.name,
          status: result.journey.status,
          nodeCount: result.graph.nodes.length,
          triggerType: triggerType ?? "event",
          triggerEvent: result.triggerEventType ?? null,
          segmentName: result.segmentName ?? null,
          contentTemplates: result.createdTemplates,
          viewUrl: `/journeys/${result.journey.id}`,
        };
      },
    }),

    createJourney: tool({
      description:
        "Create a new marketing journey from a trigger and a list of steps. Supports event-triggered and segment-triggered journeys, including branched condition and split paths. Email, SMS, and push action nodes automatically get AI-generated content templates if one is not provided.",
      inputSchema: journeyToolInputSchema,
      execute: async ({
        name,
        description,
        triggerType,
        triggerEventType,
        segmentId,
        steps,
      }) => {
        const result = await createJourneyWithGeneratedContent(admin, tenantId, {
          name,
          description,
          triggerType: triggerType ?? "event",
          triggerEventType,
          segmentId,
          steps,
        });

        return {
          id: result.journey.id,
          name: result.journey.name,
          status: result.journey.status,
          nodeCount: result.graph.nodes.length,
          triggerType: triggerType ?? "event",
          triggerEvent: result.triggerEventType ?? null,
          segmentName: result.segmentName ?? null,
          contentTemplates: result.createdTemplates,
          viewUrl: `/journeys/${result.journey.id}`,
        };
      },
    }),

    setupMarketing: tool({
      description:
        "Run onboarding marketing setup in one step. It analyzes pipeline data, creates three recommended segments, and builds an abandoned cart journey with auto-generated content templates.",
      inputSchema: z.object({}),
      execute: async () => {
        const pipelineStats = await dataAPI.getPipelineStats(admin, tenantId);

        const [vipSegment, winBackSegment, newSubscribersSegment] = await Promise.all([
          ensureSegmentForTemplate(admin, tenantId, "vip-customers"),
          ensureSegmentForTemplate(admin, tenantId, "win-back"),
          ensureSegmentForTemplate(admin, tenantId, "new-subscribers"),
        ]);

        const abandonedCartTemplate = getJourneyTemplate("abandoned-cart");
        if (!abandonedCartTemplate || !abandonedCartTemplate.triggerEventType) {
          throw new Error("Abandoned cart journey template is not available");
        }

        const journeyResult = await createJourneyWithGeneratedContent(admin, tenantId, {
          name: "Abandoned Cart Recovery",
          description:
            "AI-created recovery flow with reminder email, open-based branch, and SMS fallback.",
          triggerType: "event",
          triggerEventType: abandonedCartTemplate.triggerEventType,
          steps: abandonedCartTemplate.steps,
        });

        return {
          pipelineStats,
          segments: [vipSegment, winBackSegment, newSubscribersSegment],
          journey: {
            id: journeyResult.journey.id,
            name: journeyResult.journey.name,
            status: journeyResult.journey.status,
            viewUrl: `/journeys/${journeyResult.journey.id}`,
          },
          createdTemplates: journeyResult.createdTemplates,
          summary: `Created 3 recommended segments and an abandoned cart journey with ${journeyResult.createdTemplates.length} linked content templates.`,
        };
      },
    }),

    listJourneys: tool({
      description:
        "List all journeys with their status and basic stats. Use this when the user asks about their journeys, automations, or flows.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "active", "paused", "archived"])
          .optional()
          .describe("Filter by journey status"),
      }),
      execute: async ({ status }) => {
        const result = await journeysAPI.listJourneys(admin, tenantId, {
          status: status ?? undefined,
        });

        const journeysWithStats = await Promise.all(
          result.journeys.map(async (journey) => {
            const stats = await journeysAPI.getJourneyStats(admin, tenantId, journey.id);
            return {
              id: journey.id,
              name: journey.name,
              status: journey.status,
              enrolled: stats.enrolled,
              active: stats.active,
              conversionRate: stats.conversion_rate,
              updatedAt: journey.updated_at,
            };
          })
        );

        return { journeys: journeysWithStats, total: result.total };
      },
    }),

    getJourney: tool({
      description:
        "Get details about a specific journey by ID, including performance stats.",
      inputSchema: z.object({
        journeyId: z.string().describe("The journey ID to fetch"),
      }),
      execute: async ({ journeyId }) => {
        const journey = await journeysAPI.getJourney(admin, tenantId, journeyId);
        const stats = await journeysAPI.getJourneyStats(admin, tenantId, journeyId);

        return {
          id: journey.id,
          name: journey.name,
          description: journey.description,
          status: journey.status,
          triggerConfig: journey.trigger_config,
          nodeCount: journey.graph.nodes.length,
          stats,
          viewUrl: `/journeys/${journey.id}`,
          updatedAt: journey.updated_at,
        };
      },
    }),

    pauseJourney: tool({
      description: "Pause an active journey. No new enrollments or messages will be sent.",
      inputSchema: z.object({
        journeyId: z.string().describe("The journey ID to pause"),
      }),
      execute: async ({ journeyId }) => {
        const journey = await journeysAPI.pauseJourney(admin, tenantId, journeyId);
        return {
          id: journey.id,
          name: journey.name,
          status: journey.status,
        };
      },
    }),

    resumeJourney: tool({
      description: "Resume a paused journey.",
      inputSchema: z.object({
        journeyId: z.string().describe("The journey ID to resume"),
      }),
      execute: async ({ journeyId }) => {
        const journey = await journeysAPI.resumeJourney(admin, tenantId, journeyId);
        return {
          id: journey.id,
          name: journey.name,
          status: journey.status,
        };
      },
    }),

    activateJourney: tool({
      description:
        "Activate a draft or paused journey. Validates the graph first. Use this only when the user explicitly asks to activate or launch a journey.",
      inputSchema: z.object({
        journeyId: z.string().describe("The journey ID to activate"),
      }),
      execute: async ({ journeyId }) => {
        const journey = await journeysAPI.activateJourney(admin, tenantId, journeyId);
        return {
          id: journey.id,
          name: journey.name,
          status: journey.status,
        };
      },
    }),

    archiveJourney: tool({
      description:
        "Archive a journey. Active and waiting enrollments are exited. Use this only when the user explicitly asks to archive a journey.",
      inputSchema: z.object({
        journeyId: z.string().describe("The journey ID to archive"),
      }),
      execute: async ({ journeyId }) => {
        const journey = await journeysAPI.archiveJourney(admin, tenantId, journeyId);
        return {
          id: journey.id,
          name: journey.name,
          status: journey.status,
        };
      },
    }),

    deleteJourney: tool({
      description:
        "Delete a journey permanently. Only draft or archived journeys can be deleted.",
      inputSchema: z.object({
        journeyId: z.string().describe("The journey ID to delete"),
      }),
      execute: async ({ journeyId }) => {
        await journeysAPI.deleteJourney(admin, tenantId, journeyId);
        return { deleted: true, journeyId };
      },
    }),

    createApiKey: tool({
      description:
        "Generate a new Trident API key so the user can send custom events to the ingest endpoint from their backend, Zapier, Segment, or any HTTP client. Returns the full key — it is shown once only.",
      inputSchema: z.object({
        label: z
          .string()
          .optional()
          .describe("Optional label to identify the key (e.g. 'Zapier', 'Backend')"),
      }),
      execute: async ({ label }) => {
        if (!userId) {
          return { error: "User ID not available — cannot create API key from this context." };
        }
        const result = await apiKeysAPI.createApiKey(admin, tenantId, userId, label);
        return {
          id: result.id,
          key: result.key,
          prefix: result.prefix,
          label: label ?? "Default",
          note: "This key will not be shown again. Copy it now.",
        };
      },
    }),

    listApiKeys: tool({
      description:
        "List all API keys for this workspace, showing prefix, label, creation date, last used date, and revocation status.",
      inputSchema: z.object({}),
      execute: async () => {
        const keys = await apiKeysAPI.listApiKeys(admin, tenantId);
        return {
          keys: keys.map((k) => ({
            id: k.id,
            prefix: k.key_prefix,
            label: k.label,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
            status: k.revoked_at ? "revoked" : "active",
          })),
          total: keys.length,
        };
      },
    }),
  };
}

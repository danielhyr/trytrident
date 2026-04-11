import type { RuleGroup } from "@/lib/segments/types";

export interface SegmentTemplate {
  key: string;
  name: string;
  description: string;
  rules: RuleGroup;
}

function isoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function buildSegmentTemplates(): SegmentTemplate[] {
  return [
    {
      key: "vip-customers",
      name: "VIP Customers",
      description: "High-value repeat buyers with strong purchase history.",
      rules: {
        type: "group",
        combinator: "and",
        children: [
          { type: "condition", field: "total_orders", operator: "gte", value: 5 },
          { type: "condition", field: "total_revenue", operator: "gte", value: 200 },
        ],
      },
    },
    {
      key: "win-back",
      name: "Win-Back",
      description: "Past buyers who have gone quiet and can still be emailed.",
      rules: {
        type: "group",
        combinator: "and",
        children: [
          { type: "condition", field: "total_orders", operator: "gte", value: 1 },
          {
            type: "condition",
            field: "last_order_at",
            operator: "lt",
            value: isoDateDaysAgo(60),
          },
          { type: "condition", field: "email_consent", operator: "eq", value: true },
        ],
      },
    },
    {
      key: "at-risk",
      name: "At Risk",
      description: "Customers showing weakening engagement before they fully lapse.",
      rules: {
        type: "group",
        combinator: "and",
        children: [
          { type: "condition", field: "total_orders", operator: "gte", value: 1 },
          { type: "condition", field: "engagement_score", operator: "lt", value: 40 },
          {
            type: "condition",
            field: "last_order_at",
            operator: "lt",
            value: isoDateDaysAgo(30),
          },
        ],
      },
    },
    {
      key: "new-subscribers",
      name: "New Subscribers",
      description: "Recently added contacts who can be onboarded into welcome automation.",
      rules: {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "created_at",
            operator: "gte",
            value: isoDateDaysAgo(30),
          },
          { type: "condition", field: "email_consent", operator: "eq", value: true },
        ],
      },
    },
    {
      key: "repeat-buyers",
      name: "Repeat Buyers",
      description: "Healthy existing customers who have purchased more than once.",
      rules: {
        type: "group",
        combinator: "and",
        children: [
          { type: "condition", field: "total_orders", operator: "gte", value: 2 },
          { type: "condition", field: "total_revenue", operator: "gte", value: 75 },
        ],
      },
    },
  ];
}

export const SEGMENT_TEMPLATES: SegmentTemplate[] = buildSegmentTemplates();

export function getSegmentTemplate(key: string): SegmentTemplate | undefined {
  return buildSegmentTemplates().find((template) => template.key === key);
}

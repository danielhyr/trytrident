import type { TriggerType } from "@/lib/journeys/types";

export interface JourneyTemplateStep {
  type:
    | "send_email"
    | "send_sms"
    | "send_push"
    | "wait"
    | "condition"
    | "split"
    | "exit";
  label?: string;
  content_template_id?: string;
  template_name?: string;
  delay_amount?: number;
  delay_unit?: "minutes" | "hours" | "days";
  wait_event_type?: string;
  field?: string;
  operator?: string;
  value?: string | number | boolean;
  split_a_percent?: number;
  yes_steps?: JourneyTemplateStep[];
  no_steps?: JourneyTemplateStep[];
  a_steps?: JourneyTemplateStep[];
  b_steps?: JourneyTemplateStep[];
  exit_reason?: string;
}

export interface JourneyTemplate {
  key: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  triggerEventType?: string;
  steps: JourneyTemplateStep[];
}

export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    key: "welcome-series",
    name: "Welcome Series",
    description:
      "For new customers. Starts immediately, educates over 10 days, and nudges the second purchase.",
    triggerType: "event",
    triggerEventType: "customer.created",
    steps: [
      { type: "send_email", label: "Welcome Email" },
      { type: "wait", label: "Wait 3 Days", delay_amount: 3, delay_unit: "days" },
      { type: "send_email", label: "Brand Story Email" },
      { type: "wait", label: "Wait 7 Days", delay_amount: 7, delay_unit: "days" },
      { type: "send_email", label: "First Purchase Offer Email" },
    ],
  },
  {
    key: "abandoned-cart",
    name: "Abandoned Cart",
    description:
      "Recovers checkouts with a one-hour email, a follow-up decision split, and SMS fallback for non-openers.",
    triggerType: "event",
    triggerEventType: "cart.abandoned",
    steps: [
      {
        type: "wait",
        label: "Wait 1 Hour",
        delay_amount: 1,
        delay_unit: "hours",
      },
      { type: "send_email", label: "Cart Reminder Email" },
      {
        type: "wait",
        label: "Wait 23 Hours",
        delay_amount: 23,
        delay_unit: "hours",
      },
      {
        type: "condition",
        label: "Opened Reminder Email?",
        field: "last_email_open_at",
        operator: "is_not_null",
        yes_steps: [{ type: "send_email", label: "Cross-Sell Email" }],
        no_steps: [{ type: "send_sms", label: "Cart Recovery SMS" }],
      },
    ],
  },
  {
    key: "post-purchase",
    name: "Post-Purchase",
    description:
      "Builds trust after an order, asks for a review, then follows with a cross-sell sequence.",
    triggerType: "event",
    triggerEventType: "order.placed",
    steps: [
      { type: "wait", label: "Wait 1 Day", delay_amount: 1, delay_unit: "days" },
      { type: "send_email", label: "Thank You Email" },
      { type: "wait", label: "Wait 7 Days", delay_amount: 7, delay_unit: "days" },
      { type: "send_email", label: "Review Request Email" },
      { type: "wait", label: "Wait 14 Days", delay_amount: 14, delay_unit: "days" },
      { type: "send_email", label: "Cross-Sell Email" },
    ],
  },
  {
    key: "win-back",
    name: "Win-Back",
    description:
      "For lapsed customers in a segment. Escalates over 14 days and ends with an incentive.",
    triggerType: "segment",
    steps: [
      { type: "send_email", label: "We Miss You Email" },
      { type: "wait", label: "Wait 7 Days", delay_amount: 7, delay_unit: "days" },
      { type: "send_email", label: "Product Reminder Email" },
      { type: "wait", label: "Wait 7 Days", delay_amount: 7, delay_unit: "days" },
      { type: "send_email", label: "Final Incentive Email" },
    ],
  },
  {
    key: "vip",
    name: "VIP",
    description:
      "For high-value customers in a segment. Leads with exclusivity, then follows with early access.",
    triggerType: "segment",
    steps: [
      { type: "send_email", label: "Exclusive Offer Email" },
      { type: "wait", label: "Wait 14 Days", delay_amount: 14, delay_unit: "days" },
      { type: "send_email", label: "Early Access Email" },
    ],
  },
];

export function getJourneyTemplate(key: string): JourneyTemplate | undefined {
  return JOURNEY_TEMPLATES.find((template) => template.key === key);
}

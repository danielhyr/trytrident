/**
 * Contact Liquid context — defines the shape of data available
 * in all templates, with categorized variables and sample data.
 */

export interface ContactLiquidContext {
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    order_count: number;
    total_spent: number;
    avg_order_value: number;
    last_order_date: string;
    first_order_date: string;
    engagement_score: number;
    lifecycle_stage: string;
  };
  shop: {
    name: string;
    url: string;
    currency: string;
  };
  campaign: {
    coupon_code: string;
    discount_amount: number;
    discount_percent: number;
    expiry_date: string;
  };
}

export interface LiquidVariableInfo {
  key: string;
  label: string;
  example: string;
  category: "Contact" | "Shop" | "Campaign";
}

/** All available Liquid variables for the personalization panel UI */
export const LIQUID_VARIABLES: LiquidVariableInfo[] = [
  // Contact
  {
    key: "contact.first_name",
    label: "First Name",
    example: "Sarah",
    category: "Contact",
  },
  {
    key: "contact.last_name",
    label: "Last Name",
    example: "Martinez",
    category: "Contact",
  },
  {
    key: "contact.email",
    label: "Email",
    example: "sarah@petlover.com",
    category: "Contact",
  },
  {
    key: "contact.phone",
    label: "Phone",
    example: "+1-555-0123",
    category: "Contact",
  },
  {
    key: "contact.order_count",
    label: "Order Count",
    example: "4",
    category: "Contact",
  },
  {
    key: "contact.total_spent",
    label: "Total Spent",
    example: "188.80",
    category: "Contact",
  },
  {
    key: "contact.avg_order_value",
    label: "Avg Order Value",
    example: "47.20",
    category: "Contact",
  },
  {
    key: "contact.last_order_date",
    label: "Last Order Date",
    example: "2026-04-05",
    category: "Contact",
  },
  {
    key: "contact.first_order_date",
    label: "First Order Date",
    example: "2025-12-15",
    category: "Contact",
  },
  {
    key: "contact.engagement_score",
    label: "Engagement Score",
    example: "78",
    category: "Contact",
  },
  {
    key: "contact.lifecycle_stage",
    label: "Lifecycle Stage",
    example: "active",
    category: "Contact",
  },
  // Shop
  {
    key: "shop.name",
    label: "Shop Name",
    example: "Paws & Claws",
    category: "Shop",
  },
  {
    key: "shop.url",
    label: "Shop URL",
    example: "https://pawsandclaws.com",
    category: "Shop",
  },
  {
    key: "shop.currency",
    label: "Currency",
    example: "USD",
    category: "Shop",
  },
  // Campaign
  {
    key: "campaign.coupon_code",
    label: "Coupon Code",
    example: "WELCOME15",
    category: "Campaign",
  },
  {
    key: "campaign.discount_amount",
    label: "Discount Amount",
    example: "10.00",
    category: "Campaign",
  },
  {
    key: "campaign.discount_percent",
    label: "Discount Percent",
    example: "15",
    category: "Campaign",
  },
  {
    key: "campaign.expiry_date",
    label: "Expiry Date",
    example: "2026-04-30",
    category: "Campaign",
  },
];

/** Sample data used for preview rendering */
export const SAMPLE_CONTEXT: ContactLiquidContext = {
  contact: {
    first_name: "Sarah",
    last_name: "Martinez",
    email: "sarah@petlover.com",
    phone: "+1-555-0123",
    order_count: 4,
    total_spent: 188.8,
    avg_order_value: 47.2,
    last_order_date: "2026-04-05",
    first_order_date: "2025-12-15",
    engagement_score: 78,
    lifecycle_stage: "active",
  },
  shop: {
    name: "Paws & Claws",
    url: "https://pawsandclaws.com",
    currency: "USD",
  },
  campaign: {
    coupon_code: "WELCOME15",
    discount_amount: 10.0,
    discount_percent: 15,
    expiry_date: "2026-04-30",
  },
};

/** Get variables grouped by category */
export function getVariablesByCategory(): Record<string, LiquidVariableInfo[]> {
  const grouped: Record<string, LiquidVariableInfo[]> = {};
  for (const v of LIQUID_VARIABLES) {
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category].push(v);
  }
  return grouped;
}

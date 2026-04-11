# Trident — Product Specification v0.2

**Stage:** Pre-POC
**Author:** Daniel
**Last Updated:** April 2026
**Vertical:** Pet products (GTM focus) · External positioning: Shopify brands $500K–$5M
**Status:** Draft

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Domain & Hosting Topology](#3-domain--hosting-topology)
4. [Data Layer](#4-data-layer)
5. [The AI Brain](#5-the-ai-brain) *(includes Compliance Engine)*
6. [Channel Specs](#6-channel-specs)
7. [Chat-First Interface](#7-chat-first-interface) ★ Core UX Differentiator
8. [Customer Dashboard](#8-customer-dashboard)
9. [Human Layer](#9-human-layer)
10. [Lead Magnet: Email Compliance Scanner](#10-lead-magnet-email-compliance-scanner)
11. [Development Cycle & Milestones](#11-development-cycle--milestones)
12. [Open Questions](#12-open-questions)
13. [Open Source References](#13-open-source-references)
14. [Acquisition Positioning](#14-acquisition-positioning)

---

## 1. Product Overview

A single platform that replaces both the marketing tool and the marketing agency for SMBs in a defined e-commerce vertical. AI handles execution. Humans handle exceptions. Cross-client intelligence compounds the system's effectiveness over time.

**Tagline:** Ditch the Agency. Be Agentic.

**One-liner:** We replace your marketing agency and your marketing tools with one platform that does both — powered by AI, backed by human experts, at a fraction of the combined cost.

**Vertical strategy:** External messaging targets Shopify brands doing $500K–$5M broadly. Internal GTM strategy concentrates on one vertical (pet products first) to build Intelligence Engine density. First 10 clients should be in-vertical to maximize cross-client learning before expanding.

### What the Customer Gets

- **Chat-First Interface** — The chat is the execution layer. "Create a segment of customers who bought twice but haven't ordered in 45 days" — and the segment exists. "Pause my abandoned cart flow for 48 hours" — and it's paused. "Show me what's working best this month" — and the revenue card appears inline. The chat doesn't point you to the feature. The chat IS the feature. Visual UI exists alongside it for power users — the escape hatch, not the primary path.
- **Automated Journeys** — Welcome series, abandoned cart, post-purchase, win-back, browse abandon — pre-built and auto-optimized for the vertical. Visual node canvas (like n8n/Braze Canvas) for inspection and editing. Chat can generate entire journey graphs from natural language.
- **AI-Generated Content** — Subject lines, body copy, SMS messages, dynamic product recommendations — personalized per recipient, A/B tested automatically. Content library with drag-and-drop email template editor, SMS templates, and reusable content blocks.
- **Outcomes Dashboard** — Revenue attribution, health scores, deliverability metrics, compliance status — not infrastructure, just levers and results.
- **Built-in Compliance** — CAN-SPAM, CASL, GDPR, PIPEDA enforcement at the code/config level. Jurisdiction-aware consent management out of the box.

### Competitive Positioning

| Dimension | Tool-Only (Klaviyo) | Agency | Trident |
|---|---|---|---|
| Monthly Cost | $300–$2,000 | $3,000–$8,000 | $1,000–$2,000 (both included) |
| Interface | Complex GUI, steep learning curve | Email/Slack with your rep | Chat-first: say what you want, it happens. Visual UI as escape hatch. |
| Strategy | DIY / none | Human (varies by rep) | AI (opinionated framework) + human review |
| Execution | DIY | Human (slow, siloed) | AI (automated, cross-client intelligence) |
| Cross-Client Learning | None | None (siloed engagements) | Continuous — every client improves the system |
| Compliance | Basic tooling | Manual / ad hoc | Automated, jurisdiction-aware, code-level |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CUSTOMER LAYER                                         │
│  ★ Chat Interface (primary) · Visual Dashboard (escape  │
│    hatch) · Onboarding Wizard                           │
│  Compliance Scanner (lead magnet / standalone)           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CHAT ORCHESTRATION LAYER (Vercel AI SDK)               │
│  useChat (frontend) · streamText + tools (backend)      │
│  Multi-step tool calling · Inline Card Renderer         │
│  Confirmation Gates                                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  API GATEWAY                                            │
│  REST API (Auth, rate limiting, webhooks)                │
│  Event Bus (Redis Streams / BullMQ)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  AI BRAIN  ★ Core Product (Activation Layer)             │
│  Strategy Engine · Content Engine                       │
│  Intelligence Engine · Compliance Engine                │
│  Decision Log (every decision + outcome → bandit data)  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  DATA LAYER                                             │
│  Customer Profiles · Event Store · Decision Log         │
│  Intelligence Store (pgvector) · Consent Ledger         │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  DELIVERY LAYER                                         │
│  SendGrid (Email) · Twilio (SMS + WhatsApp)             │
│  Webhooks (Push / custom)                               │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  INTEGRATIONS                                           │
│  Shopify / WooCommerce · Stripe / Payment               │
│  GA4 / GTM                                              │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack — POC

| Component | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 + Tailwind | Fast iteration, SSR for dashboard |
| Chat Framework | **Vercel AI SDK** (`useChat` + `streamText` + tool calling) | Native Next.js/React integration, streaming-first, multi-provider support (25+), typed tool definitions via Zod. No LangChain/LangGraph needed — the chat is a structured tool router, not an autonomous agent graph. |
| Journey Canvas | **React Flow** (xyflow) | Node-based visual editor for journey builder. Drag-and-drop, custom node types, MIT licensed. Used by n8n. |
| Email Editor | **Easy Email Editor** or **Unlayer** (React wrapper) | Drag-and-drop email template builder based on MJML. Embeds in Content tab. |
| Email Rendering | **MJML** | Compiles to responsive HTML compatible with all email clients. |
| API | Next.js API Routes → migrate to Fastify | Monorepo simplicity early, split later |
| Database | PostgreSQL (Supabase) | Relational, JSON support, row-level security |
| Queue | BullMQ + Redis | Job scheduling, retry logic, rate limiting |
| AI (Primary) | Gemini 2.5 Flash API (via Vercel AI SDK `@ai-sdk/google`) | Best cost/quality ratio ($0.15/$0.60 per MTok), Google DPA for GDPR compliance |
| AI (Simple tasks) | GPT-4.1 Nano (via Vercel AI SDK `@ai-sdk/openai`) | Ultra-cheap ($0.10/$0.40 per MTok) for merge fields, simple personalization |
| Email | SendGrid (subusers) | Reliable deliverability, event webhooks. POC uses subusers (15 default cap). Negotiate higher limits at growth. Evaluate Amazon SES or Ark at 50+ clients. Braze itself uses SendGrid/SparkPost/SES under the hood — this is standard architecture. |
| SMS | Twilio | SMS + WhatsApp in one SDK |
| Hosting | Vercel (app) + Railway (workers) | Cheap, fast, scales when needed |
| Auth | Supabase Auth | OAuth + RBAC. Keeps everything in one place with Supabase DB. |
| Monitoring | Sentry + PostHog | Error tracking + product analytics |

### Tech Stack — Scale Migration Triggers

| Component | Migration Target | Trigger |
|---|---|---|
| Database | PostgreSQL + Snowflake | >50 clients or cross-client analytics bottleneck |
| API | Fastify microservices | Monolith pain / team growth |
| Queue | Temporal | Complex journey orchestration / durable execution |
| AI | Gemini + fine-tuned models | Enough cross-client data to train vertical-specific models |
| Chat orchestration | Vercel AI SDK + Temporal for durable multi-step | Multi-step onboarding workflows failing mid-chain at scale (100+ clients) |
| Data Layer | PostgreSQL + Snowflake (zero-copy sharing) | >50 clients, cross-client analytics needs separate OLAP layer |
| Hosting | AWS (ECS / Lambda) | Cost optimization at volume |
| Data Pipeline | dbt + Snowflake + Hightouch | Reverse ETL for segmentation at scale |

---

## 3. Domain & Hosting Topology

The marketing site and the product app are hosted separately. This is standard practice (n8n, Braze, SFMC, Klaviyo all do this) for the following reasons:

- **Performance isolation** — Landing page is CDN-cached and SEO-optimized. App handles real-time data, websockets, authenticated sessions. Different profiles, different infra.
- **Security boundary** — App handles PII, consent records, API keys. Marketing site is public. Separate auth layers, CORS policies, attack surfaces.
- **Independent deployment** — Marketing copy updates, blog posts, and pricing experiments don't require an app deploy or risk breaking the product.
- **Independent scaling** — Marketing site might get 100K visitors on a Product Hunt launch day. App might have 50 concurrent users. Different needs.

### Subdomain Map

| Subdomain | Purpose | Stack | Notes |
|---|---|---|---|
| `gettrident.com` (or equivalent) | Marketing site, landing pages, blog, pricing | Vercel (static/SSG Next.js) or Framer/Webflow | SEO-optimized, globally cached, no auth |
| `app.gettrident.com` | Product dashboard, client-facing UI | Next.js on Vercel (or Railway) | Auth required, real-time data, websocket-capable |
| `api.gettrident.com` | Backend API | Next.js API routes → Fastify at scale | Serves both app frontend and external webhooks |
| `scan.gettrident.com` | Email compliance scanner (lead magnet) | Lightweight Next.js app | No auth for initial scan, email gate for full report |
| `docs.gettrident.com` | API docs / knowledge base (future) | Mintlify or Docusaurus | For when/if partners or power users need API access |

### Cookie & Auth Strategy

All subdomains share the root domain, so auth cookies set on `.gettrident.com` work across `app.` and `scan.` subdomains. The marketing site (`gettrident.com`) requires no auth. The scanner (`scan.`) is unauthenticated for the initial scan, gated at the report step.

---

## 4. Data Layer

### Architectural Position: Activation Layer

Trident is an **activation layer**, not a data warehouse. Like Braze, we sit between the customer's data source and their messaging channels. The difference: Braze's customers are enterprises with existing Snowflake/BigQuery warehouses. Our POC customers are SMBs whose "warehouse" is Shopify.

**POC data flow (SMB — no warehouse):**
```
Shopify (source of truth) ──webhook──▶ Trident PostgreSQL (profile store) ──▶ AI Brain ──▶ Channels
```

**Scale data flow (enterprise — has a warehouse):**
```
Customer Warehouse (Snowflake/BQ) ──zero-copy CDI──▶ Trident (activation) ──▶ Channels
Shopify ──webhook──▶ Trident PostgreSQL (for SMBs without a warehouse)
```

The schema is designed to be **warehouse-compatible from day 1** — clean event schema, no Shopify-specific column names, so the same activation logic works whether data comes from webhooks or zero-copy queries.

**Data model flexibility:** The OOB schema covers standard e-commerce (~70% of use cases: contacts, orders, events, engagement scores). But customer data structures vary — a pet supplement subscription brand has different data than a fashion brand doing one-time purchases. Custom attributes, custom events, product catalog structures, and subscription data vary wildly.

Approach: opinionated default schema (above) plus `custom_attributes` (jsonb) on contact and `custom_event_data` (jsonb) on event for anything nonstandard. The AI references whatever fields exist when building segments or generating content. At POC, no auto-generated custom schemas — just the OOB model with jsonb overflow. The Snowflake zero-copy CDI path is the enterprise answer for customers with their own data models in a warehouse — query it directly rather than reshaping it.

### Core Entities

```
tenant {
  id, name, domain, vertical, plan,
  shopify_store_url, shopify_access_token,
  stripe_customer_id, timezone, created_at,
  data_source,                // shopify_webhook | snowflake_cdi | bigquery_cdi
  warehouse_config (jsonb)    // connection details if CDI (null for webhook-only)
  // vertical is auto-detected: LLM classifies tenant vertical from Shopify product
  // catalog at onboarding. Used for Intelligence Engine partitioning.
}

user_tenant {
  user_id, tenant_id,
  role,                       // owner | admin | viewer
  invited_by, joined_at
  // Many-to-many: a user can belong to multiple tenants (agency model),
  // a tenant can have multiple users (team access)
}

invite {
  id, tenant_id, email,
  role,                       // admin | viewer (owner is set at tenant creation)
  invited_by, token,
  status,                     // pending | accepted | expired
  created_at, expires_at
}

contact {
  id, tenant_id, external_id,
  email, phone, first_name, last_name,
  // behavioral
  total_orders, total_revenue, avg_order_value,
  last_order_at, first_order_at,
  // engagement
  engagement_score,           // 0-100, recalculated daily
  lifecycle_stage,            // prospect | active | at_risk | lapsed | vip
  last_email_open_at, last_email_click_at,
  // consent
  email_consent, sms_consent, consent_source,
  consent_timestamp, jurisdiction,
  // extensibility
  custom_attributes (jsonb)   // overflow for non-standard data
}

event {
  id, tenant_id, contact_id,
  event_type,                 // order.placed | cart.abandoned | email.opened | page.viewed
  event_data (jsonb),         // flexible payload
  custom_event_data (jsonb),  // tenant-specific custom events
  source,                     // shopify | sendgrid | internal | ga4
  created_at
}

journey {
  id, tenant_id,
  name, description,
  graph (jsonb),              // React Flow node/edge graph definition
                              // { nodes: [...], edges: [...] }
                              // Stored as the serialized React Flow state
  status,                     // draft | active | paused | archived
  trigger_config (jsonb),     // entry event type + conditions
  created_by,                 // user_id or "ai" (chat-generated)
  created_at, updated_at
}

journey_enrollment {
  id, tenant_id, contact_id, journey_id,
  current_node_id,            // references node ID in journey.graph
  status,                     // active | completed | exited | suppressed
  entered_at, completed_at, exit_reason
}

content_asset {
  id, tenant_id,
  type,                       // email_template | sms_template | content_block | image
  name, description,
  content (jsonb),            // MJML/HTML for emails, text for SMS, URL for images
                              // For email: stores Easy Email / Unlayer JSON structure
  channel,                    // email | sms | whatsapp
  created_by,                 // user_id or "ai"
  created_at, updated_at
}

message {
  id, tenant_id, contact_id, journey_enrollment_id,
  content_asset_id,           // references content_asset used
  channel,                    // email | sms | whatsapp
  subject, body_html, body_text,
  variant,                    // A | B for split testing
  status,                     // queued | sent | delivered | opened | clicked | bounced
  sent_at, opened_at, clicked_at,
  revenue_attributed          // 7-day click attribution
}

// ★ DECISION LOG — bandit training data. Log every decision from day 1.
decision_log {
  id, tenant_id, contact_id,
  event_id,                   // triggering event
  contact_snapshot (jsonb),   // engagement_score, lifecycle_stage, recency, channel_history
  action_type,                // journey_enroll | suppress | delay | send
  journey_id, channel, send_time,
  content_variant,
  decision_method,            // rule_engine | bandit | manual_override
  outcome_opened,             // boolean, null until known
  outcome_clicked,            // boolean
  outcome_converted,          // boolean (purchase within attribution window)
  outcome_revenue,            // decimal, null if no conversion
  outcome_unsubscribed,       // boolean
  decided_at, outcome_at
}

intelligence_pattern {
  id, vertical, pattern_type,
  pattern_key, pattern_value (jsonb),
  data_layer,                 // "L1" (opt-in performance) or "L2" (platform behavioral)
  confidence, sample_size,
  embedding vector(1536),     // pgvector — for RAG retrieval at content generation time
  created_at, updated_at
}

consent_audit_log {
  id, tenant_id, contact_id,
  action,                     // granted | revoked | updated
  channel, jurisdiction,
  source, ip_address, user_agent,
  timestamp                   // immutable, append-only
}

// ★ RAW EVENT BUFFER — durable queue between webhook receipt and processing.
// Every platform (Braze, Segment, RudderStack) buffers raw incoming data before
// processing. This gives us: reliability (webhook ack'd instantly, processing async),
// idempotency (deduplicate via idempotency_key), debugging (full audit trail of
// original payloads), and reprocessing (re-run normalizer on historical data).
raw_event {
  id, tenant_id,
  source,                     // shopify | sendgrid | twilio | api | csv | segment
  event_type,                 // raw source event type (e.g. "orders/create", "event")
  idempotency_key,            // source-provided dedup key (e.g. X-Shopify-Webhook-Id)
  payload (jsonb),            // original webhook/API payload, untouched
  processed,                  // boolean, default false
  processing_error,           // text, null if no error
  received_at,                // when we received it
  processed_at                // when processing completed (null until processed)
}
```

### Data Ingestion Pipeline

```
                     SOURCES
     Shopify Webhooks    SendGrid Webhooks    Twilio Webhooks    (Future: API, SDK, CDI)
            │                   │                    │                      │
            ▼                   ▼                    ▼                      ▼
     ┌─────────────────────────────────────────────────────────────────────────┐
     │                     WEBHOOK GATEWAY (Next.js API Routes)                │
     │  /api/webhooks/shopify · /api/webhooks/sendgrid · /api/webhooks/twilio  │
     │  1. Verify signature (HMAC for each source)                             │
     │  2. Extract idempotency key (X-Shopify-Webhook-Id, etc.)                │
     │  3. Insert raw payload into raw_event table                             │
     │  4. Return 200 immediately (never block on business logic)              │
     └──────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────────────┐
     │                     RAW EVENT STORE (PostgreSQL)                        │
     │  raw_event table — durable buffer. Events persist until processed.      │
     │  Retry-safe. Enables replay. Full audit trail.                          │
     └──────────────────────────────┬──────────────────────────────────────────┘
                                    │  BullMQ job (or cron poll for POC)
                                    ▼
     ┌─────────────────────────────────────────────────────────────────────────┐
     │                     EVENT PROCESSOR (Background worker)                 │
     │  1. Fetch unprocessed raw_events in batches                             │
     │  2. Route to source-specific normalizer (pluggable registry)            │
     │  3. Normalizer translates to canonical event schema                     │
     │  4. Identity resolution (deterministic, 3-tier priority)                │
     │  5. Upsert contact profile                                              │
     │  6. Insert canonical event into event table                             │
     │  7. Update computed fields (engagement_score, lifecycle_stage)           │
     │  8. Mark raw_event as processed                                         │
     │  9. Trigger journey evaluator if applicable                             │
     └──────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────────────┐
     │                     CANONICAL DATA STORE                                │
     │  contact + event tables (opinionated core + jsonb overflow)             │
     └──────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────────────┐
     │                     ACTIVATION                                          │
     │  Journey Evaluator → Strategy Engine → Content Engine →                │
     │  Compliance Engine → Delivery (SendGrid/Twilio)                        │
     │  + Decision Log (every decision recorded)                               │
     └────────────────────────────────────────────────────────────────────────┘
```

### Pluggable Normalizer Registry

Each data source gets its own normalizer that translates source-specific payloads into the canonical event schema. Adding a new data source = writing one normalizer function. The rest of the pipeline (identity resolution, profile updates, journey evaluation) doesn't change. This is how Braze and Segment work internally.

```
Source Normalizer Registry:
  "shopify"   → ShopifyNormalizer   (orders/created → order.placed, checkouts/create → checkout.started, etc.)
  "sendgrid"  → SendGridNormalizer  (event webhooks → email.delivered, email.opened, email.clicked, etc.)
  "twilio"    → TwilioNormalizer    (status callbacks → sms.delivered, sms.failed, etc.)
  "api"       → GenericNormalizer   (pass-through with validation — for custom integrations)
  "csv"       → CSVNormalizer       (bulk import — future)
  "segment"   → SegmentNormalizer   (Segment spec identify/track → canonical schema — future)
```

**Shopify event mapping (POC):**

| Shopify Webhook | Canonical Event Type | Contact Fields Updated |
|---|---|---|
| `customers/create` | `customer.created` | email, phone, first_name, last_name, external_id |
| `customers/update` | `customer.updated` | any changed profile fields |
| `orders/create` | `order.placed` | total_orders++, total_revenue+=, avg_order_value, last_order_at |
| `orders/fulfilled` | `order.fulfilled` | (event only, no profile change) |
| `orders/cancelled` | `order.cancelled` | total_orders--, total_revenue-=, avg_order_value recalc |
| `checkouts/create` | `checkout.started` | (event only — becomes cart.abandoned if no order in 1h) |
| `checkouts/update` | `checkout.updated` | (event only) |
| `products/create` | `product.created` | (catalog event, no contact update) |
| `products/update` | `product.updated` | (catalog event, no contact update) |

### Identity Resolution

Deterministic only (no probabilistic matching at POC). Three-tier priority, same pattern as Braze and Segment:

1. **external_id** (Shopify customer ID) — strongest, permanent, assigned by source system
2. **email** — primary contact identifier, most common match key
3. **phone** — secondary identifier

**Resolution logic on each inbound event:**

```
function resolveIdentity(tenantId, identifiers: { external_id?, email?, phone? }):
  // 1. Try external_id first (strongest — Shopify customer ID)
  if identifiers.external_id:
    contact = findByExternalId(tenantId, identifiers.external_id)
    if contact: return contact

  // 2. Try email
  if identifiers.email:
    contact = findByEmail(tenantId, identifiers.email)
    if contact:
      // Backfill external_id if we now have it
      if identifiers.external_id and !contact.external_id:
        contact.external_id = identifiers.external_id
      return contact

  // 3. Try phone
  if identifiers.phone:
    contact = findByPhone(tenantId, identifiers.phone)
    if contact:
      // Backfill missing identifiers
      if identifiers.external_id and !contact.external_id:
        contact.external_id = identifiers.external_id
      if identifiers.email and !contact.email:
        contact.email = identifiers.email
      return contact

  // 4. No match — create new contact
  return createContact(tenantId, identifiers)
```

This handles the common case where a contact subscribes to a newsletter (email only, no external_id) before their first Shopify purchase creates a customer record. The email match links the two, and the external_id backfills onto the existing profile.

**What we do NOT build at POC:** Anonymous tracking (device/session IDs), probabilistic matching (IP, OS, behavioral), cross-device identity graphs, or profile merge/unmerge workflows. Those are enterprise-scale concerns.

### Ingestion Scale Migration Path

| POC | Scale Trigger | Migration |
|---|---|---|
| PostgreSQL `raw_event` table as durable buffer | >100 events/sec sustained | BullMQ + Redis as dedicated queue |
| Cron-based event processor polling | Processing latency >5s | Dedicated worker with pg_notify or BullMQ |
| Single event processor instance | Multiple high-volume tenants | Worker pool partitioned by tenant_id |
| Shopify webhooks only | First non-Shopify customer | Add API ingestion endpoint + new normalizer |
| Email-based identity resolution | Cross-device tracking needed | Add anonymous_id + merge/unmerge logic |
| PostgreSQL for all storage | >50 clients, analytics bottleneck | Snowflake for OLAP, PostgreSQL stays for OLTP |

Webhook-first, not polling. Shopify, SendGrid, and Twilio all push events via webhooks. The system reacts to events in near-real-time. Fallback: scheduled reconciliation job every 6 hours to catch missed webhooks. Idempotency enforced via `idempotency_key` on `raw_event` — Shopify sends `X-Shopify-Webhook-Id` header, SendGrid and Twilio send unique event IDs.

### AI-Driven Data Analysis Pipeline

When new client data is ingested (onboarding or ongoing), the AI analyzes and connects the data:

**Phase 1 — Data Profiling (on ingest):**
SQL-based analysis of the incoming dataset: contact count, purchase frequency distribution, AOV ranges, recency distribution. No LLM needed — pure analytics.

**Phase 2 — Segment Suggestion:**
AI derives segments from data patterns and surfaces them to the customer:
- "You have 340 customers who bought once 60+ days ago — classic win-back candidates"
- "Your top 8% by revenue drive 40% of sales — VIP segment"
- "127 contacts have opened emails but never purchased — nurture opportunity"

Segments are **rule-based definitions the AI generates**, not static lists. They update continuously as data changes. Daily cron recalculates engagement scores, moves contacts between lifecycle stages, and surfaces new segment opportunities.

**Phase 3 — Journey Recommendation:**
For each suggested segment, AI recommends pre-built journeys with vertical-calibrated defaults:
- "For your win-back segment: 3-email series over 21 days, escalating discount (10% → 15% → 20%)"
- Customer approves or tweaks → journey activates

**Phase 4 — Segment Health Monitoring (ongoing):**
AI continuously monitors segment health and alerts:
- "Your win-back segment grew 40% this month — you may have a retention problem"
- "VIP segment is shrinking — average order frequency dropped 15%"
- "Splitting your active segment by product category would improve abandoned cart relevance"

This is mostly rule-based + lightweight LLM analysis, not per-subscriber LLM calls. Segment evaluation runs in SQL; the AI interprets results and generates recommendations.

### Zero-Copy Readiness

**POC:** PostgreSQL (Supabase) is the single source of truth. No Snowflake needed. Supabase includes pgvector for embedding storage (RAG) at no extra cost.

**At scale (50+ clients):** Add Snowflake as the analytics/intelligence layer. Use zero-copy data sharing for:
- Enterprise customers who already have warehouses (CDI Segments — query their warehouse directly without copying data to Trident, exactly like Braze)
- Cross-client intelligence aggregation (Supabase FDW → Snowflake for OLAP queries)
- Dev/test environments via Snowflake's zero-copy cloning

### Engagement Scoring Model

| Signal | Weight | Decay |
|---|---|---|
| Email opened | +5 | Halves every 30 days |
| Email clicked | +15 | Halves every 30 days |
| Order placed | +30 | Halves every 60 days |
| Cart abandoned (no recovery) | -5 | Resets on next order |
| Unsubscribe | → 0 (exit) | Permanent |
| Complaint / spam report | → -100 (suppress) | Permanent |

Lifecycle stages derived from engagement score thresholds, calibrated per vertical from cross-client intelligence.

---

## 5. The AI Brain

The core proprietary system. Four interconnected engines that decide **who** gets **what** message, **when**, through **which channel**, with **what content**. This is the product — everything else is infrastructure.

At POC, these are four modules in `packages/brain/` with ~200-400 lines of code each — not four separate AI systems. They graduate in sophistication as data accumulates.

### End-to-End Decision Flow

```
Event Received → Strategy Engine → Content Engine → Compliance Engine → Delivery → Intelligence Engine
(e.g. cart.abandoned)  (journey+timing+channel)  (generate+personalize)  (validate+approve)  (SendGrid/Twilio)  (learn from outcome)
                                                                                                    ↓
                                                                              Decision Log (context + action + outcome)
                                                                                                    ↓
                                                                              Intelligence Engine (aggregate, retrain, update)
```

### LLM Intelligence Stack — 3 Layers

The AI Brain's knowledge comes from three stacked layers. Each layer is additive — you don't replace one with the next, you compound them:

| Layer | What It Provides | When Built | Cost |
|---|---|---|---|
| **1. Prompt Engineering** | Marketing best practices, vertical playbook, output format constraints, compliance rules. Shipped as structured system prompts. | Day 1 (POC) | Free — just tokens in the prompt. Gemini's 1M context window provides ample room. |
| **2. RAG (Retrieval-Augmented Generation)** | Real performance data from cross-client intelligence. "Subject lines with pet names convert 23% better in pet e-commerce." Retrieved from `intelligence_patterns` table via pgvector similarity search at generation time. | Month 2–3 (10 clients) | Negligible — pgvector included in Supabase, Google embedding models ~$0.01/MTok. Main cost is nightly aggregation job. |
| **3. Fine-Tuning** | Model natively produces on-brand, high-converting copy without heavy prompting. Trained on 10K+ generated messages with performance labels. | Month 6+ (50 clients) | Training: ~$1–2 per run (100K tokens × 4 epochs). Inference: same as base model. Can retrain weekly for <$10/month. |

**Why 3 layers, not just fine-tuning:** Fine-tuning bakes knowledge into model weights — it's great for format/tone consistency but can't incorporate yesterday's performance data. RAG handles dynamic knowledge (what's working now). Prompts handle per-request context (this contact, this journey step, this brand). All three are needed.

**Training data strategy:** The `decision_log` table is the training pipeline. Every decision (journey enrolled, content variant selected, channel chosen) and every outcome (opened, clicked, converted, unsubscribed) is recorded from day 1. This is the dataset for both RAG pattern extraction and eventual fine-tuning. If you don't log it, you can't train on it later.

### Engine 1: Strategy Engine

Decides which journeys to activate, when to trigger them, and how to handle conflicts between competing journeys. **Designed as a swappable decision function** — same interface (contact in, decision out), internals graduate from rules to contextual bandit.

| Function | Input | Output | POC Method | Scale Method |
|---|---|---|---|---|
| Journey Selection | Contact profile, event history, active enrollments | Journey to enroll (or suppress) | Rule engine | Contextual bandit |
| Send Time Optimization | Contact's open/click history, timezone, vertical benchmarks | Optimal send window (hour + day) | Cohort-level defaults, fallback to vertical benchmarks | Bayesian per-contact model trained on decision_log |
| Channel Selection | Contact preferences, channel engagement history, message urgency | email / sms / whatsapp | Decision tree: consent → recency → engagement by channel | Bandit with channel as action space |
| Frequency Capping | Messages sent in window, engagement score, fatigue signals | Send / Delay / Suppress | Hard caps (configurable) + soft caps (engagement-adjusted) | Learned fatigue thresholds per vertical from decision_log |
| Journey Conflict Resolution | Active enrollments, journey priorities, business rules | Priority winner + queue for losers | Priority matrix: transactional > abandoned cart > lifecycle > promotional | Same — priority matrix stays rule-based (business logic, not ML) |

**Contextual bandit architecture (scale — not POC):**

Validated by Braze's acquisition of OfferFit. The bandit maps cleanly onto existing data:
- **Context:** Contact profile (engagement score, lifecycle stage, purchase history, channel preference history, timezone) — already in the data model
- **Action space:** Channel, send time, journey selection, content variant — already defined as Strategy Engine outputs. Must stay explicit and enumerated.
- **Reward signal:** Opens, clicks, purchases, revenue attributed, unsubscribes — already tracked in `message` table, piped to `decision_log`

The bandit needs thousands of interactions per action to converge. Don't build it until you have the data. A rule engine that sends the right abandoned cart email at the right time is indistinguishable from a bandit for the first 10 clients.

**Decision pseudocode (POC — rule engine):**

```
function evaluateContact(contact, event):
  // 1. Check suppression
  if contact.suppressed OR !contact.hasConsent(event.channel):
    return logDecision(contact, event, SUPPRESS, "no_consent")

  // 2. Determine candidate journeys
  candidates = journeyRules.match(event.type, contact.lifecycle_stage)

  // 3. Filter by active enrollments (no duplicate journeys)
  candidates = candidates.filter(j => !contact.activeEnrollments.includes(j.type))

  // 4. Resolve conflicts via priority matrix
  winner = priorityMatrix.resolve(candidates, contact.activeEnrollments)

  // 5. Determine send time
  sendAt = sendTimeOptimizer.predict(contact, winner.channel)

  // 6. Frequency cap check
  if frequencyCap.exceeded(contact, sendAt.window):
    return logDecision(contact, event, DELAY, "frequency_cap")

  // 7. Enroll, schedule, and LOG THE DECISION
  decision = ENROLL(winner, sendAt)
  logDecision(contact, event, decision, "rule_engine")
  return decision
```

**Critical:** Every path through `evaluateContact` calls `logDecision`. Suppressions, delays, enrollments — all logged with full context. This is the training data for the bandit.

### Engine 2: Content Engine

Generates, personalizes, and tests all customer-facing content. Never sends without guardrails.

| Function | How It Works |
|---|---|
| **Copy Generation** | LLM (Gemini 2.5 Flash via Vercel AI SDK) with structured prompts containing: brand voice doc, vertical tone guidelines, contact context (name, purchase history, lifecycle stage), journey step objective, and cross-client performance data. Output: subject line + preview text + body copy. |
| **Personalization** | Dynamic merge fields (name, product, price) + LLM-generated conditional blocks (e.g., different copy for VIP vs. first-time buyer). Product recommendations via collaborative filtering on purchase history within the vertical. |
| **A/B Testing** | Auto-generate 2 variants per message. Split 20/80: 20% exploratory split, 80% to projected winner. Winner declared via Bayesian significance test (not fixed time window). Minimum sample: 200 sends per variant. |
| **Template System** | MJML-based responsive email templates via Easy Email Editor or Unlayer (React component in Content tab). Vertical-specific defaults (header, footer, product grid, CTA styles). Brand customization layer on top (logo, colors, fonts). All templates pre-validated for dark mode, major clients, and accessibility. |
| **Content Guardrails** | Pre-send validation: compliance check (no spam trigger words, required unsubscribe link, physical address), brand consistency check (tone match), deliverability check (text-to-image ratio, link density). Blocks send on failure, routes to human review. |

### Tiered Content Personalization

Content generation depth scales with plan tier. All tiers are **additive** — higher tiers get everything from lower tiers plus additional capabilities.

| Tier | Content Approach | LLM Cost per 10K Sends | How |
|---|---|---|---|
| **Standard** | Cohort-personalized: LLM generates per-segment (not per-subscriber). 5–10 segments × 2 A/B variants = 10–20 LLM calls per journey step. | ~$0.02–0.05 | Gemini Flash batch, cached 24h |
| **Pro** | Micro-segment: LLM generates per-cluster (RFM decile × lifecycle × product affinity). ~50–100 clusters per tenant. | ~$0.20–0.50 | Gemini Flash, cached 12h |
| **Enterprise** | True 1:1: LLM call per recipient with full individual context. 10K sends = 10K LLM calls. | ~$4–8 (batch) | Gemini Flash batch API (50% discount, 24h turnaround). Real-time 1:1 for triggered journeys at standard pricing. |

**LLM cost control:** Template caching (same journey step + same lifecycle stage = cache hit for 24h), batched generation (generate all variants for a cohort in one call), model tiering (GPT-4.1 Nano for simple merge fields at $0.10/MTok, Gemini 2.5 Flash for full copy generation at $0.15/MTok). Target: LLM cost < 2% of subscription revenue.

### LLM Training Roadmap

| Phase | Client Count | Strategy | What the AI "Knows" |
|---|---|---|---|
| **POC** | 3–5 | Prompt engineering only | General marketing knowledge + vertical playbook written manually |
| **Early** | 10–30 | + RAG from intelligence_patterns (pgvector) | L2 from day one: "4-step win-back with 15% cap is the dominant pattern in this vertical." L1 as opt-in density grows. |
| **Growth** | 30–100 | + Fine-tuned Gemini Flash | Model natively produces on-brand, high-converting copy. Retrained weekly (~$2/run). |
| **Scale** | 100+ | + Per-vertical fine-tuned models | Separate models for pet, beauty, food, etc. |

### Engine 3: Intelligence Engine ★ Moat

The cross-client learning system. Two layers with different data ownership and consent models.

#### Layer 1: Anonymized Performance Data (Opt-In)

Aggregated outcome metrics — open rates, click rates, conversion rates — grouped by vertical, journey type, and segment. Requires tenant-level consent toggle (default: off). Useful at 10+ opted-in clients per vertical.

#### Layer 2: Platform Behavioral Data (Owned by Trident) ★ Day-One Moat

Product usage telemetry — journey structures, segment definitions, configuration patterns, chat commands. Covered in ToS, no consent toggle required. Standard SaaS practice (Klaviyo publishes benchmarks from 215K+ merchants the same way). Starts compounding from day one. This is the harder moat — a competitor needs the same client density to replicate it.

### Engine 4: Compliance Engine

Jurisdiction-aware regulatory enforcement. Pre-send checks return `CLEAR | WARN | BLOCK` with violations array. BLOCK stops the send. WARN routes to human review queue.

Regulations enforced: CAN-SPAM (US), CASL (Canada), GDPR (EU/UK), PIPEDA (Canada), CCPA/CPRA (California).

*(Full compliance engine pseudocode, consent resolution logic, and maintenance plan unchanged from v0.1 — see previous spec version for details.)*

---

## 6. Channel Specs

### Email

| Spec | Detail |
|---|---|
| Provider | SendGrid (dedicated IP at >50K sends/month). POC: subusers (1 per tenant). Scale: negotiate higher limits or migrate to Amazon SES / Ark. |
| Multi-tenant sending | One SendGrid subuser per client. Each client authenticates their own sending subdomain (e.g., mail.paws.com). SPF, DKIM, DMARC enforced at onboarding — Trident generates DNS records, chat guides the client through adding them. |
| Templates | MJML → responsive HTML via Easy Email Editor / Unlayer in Content tab. Dark mode tested. Vertical-specific defaults. |
| Deliverability Monitoring | Bounce rate, complaint rate, inbox placement (via Seed List / GlockApps integration) |
| Warmup | Automated IP/domain warmup schedule for new clients. Gradual volume ramp over 4-6 weeks. |
| Suppression | Global suppression list (bounces, complaints, unsubs). Per-tenant suppression (SendGrid subuser isolation). Automatic list hygiene. |

### SMS / WhatsApp

| Spec | Detail |
|---|---|
| Provider | Twilio (SMS) + Twilio WhatsApp Business API |
| Compliance | TCPA opt-in verification, quiet hours enforcement (9am–9pm local), mandatory STOP handling |
| Content | 160-char SMS (auto-split for longer). WhatsApp: rich media templates (pre-approved by Meta). |
| Use Cases | Abandoned cart (SMS urgency), shipping notifications, flash sale alerts, appointment reminders |

### Journey Library — V1

| Journey | Trigger | Steps | Default Channel |
|---|---|---|---|
| Welcome Series | New subscriber / first purchase | 3–5 emails over 14 days | Email |
| Abandoned Cart | cart.abandoned event (no purchase in 1h) | Email (1h) → Email (24h) → SMS (48h) | Email → SMS |
| Post-Purchase | order.fulfilled | Thank you (immediate) → Review request (7d) → Cross-sell (14d) | Email |
| Browse Abandonment | product.viewed (no cart in 2h) | 1 email with viewed products | Email |
| Win-Back | lifecycle_stage → "lapsed" | 3 emails over 21 days, escalating incentive | Email |
| VIP | lifecycle_stage → "vip" (top 10% by revenue) | Exclusive access, early sale, loyalty perks | Email + SMS |
| Sunset / Suppression | engagement_score < 10 for 60 days | 1 re-engagement attempt → suppress if no response | Email |

---

## 7. Chat-First Interface

The chat is the primary interface. Not a support chatbot bolted onto a dashboard — the execution layer itself. Every action the platform supports can be triggered, configured, or queried through natural language. The visual dashboard exists alongside it as an escape hatch for power users who want to inspect, drag, or drill down.

**This is the core UX differentiator.** No email/multichannel marketing platform has shipped chat-primary, UI-secondary. Braze Agent Console, Salesforce Agentforce, HubSpot Breeze — these are all chat assistants bolted onto existing complex GUIs. They help you navigate the tool. Trident's chat IS the tool.

### How It Works — Vercel AI SDK Tool Calling

The chat layer is built on Vercel AI SDK. No LangChain, no LangGraph. The chat is a structured tool router, not an autonomous agent graph. The LLM decides which tool to call based on the user's message. Zod validates parameters. The SDK handles streaming back to the `useChat` hook in the frontend.

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export async function POST(req) {
  const { messages } = await req.json()
  const { tenantId, role } = await getSession(req)

  return streamText({
    model: google('gemini-2.5-flash'),
    system: `You are Trident, an AI marketing assistant for e-commerce brands.
             You help users create segments, build journeys, query performance,
             and manage their marketing — all through conversation.
             Tenant ID: ${tenantId}. User role: ${role}.
             If role is "viewer", respond with data but do not execute actions.`,
    messages,
    maxSteps: 10, // allows multi-step tool chaining
    tools: {
      createSegment: tool({
        description: 'Create a new audience segment based on criteria',
        parameters: z.object({
          name: z.string(),
          rules: z.object({
            field: z.string(),
            operator: z.enum(['equals', 'gt', 'lt', 'between', 'contains']),
            value: z.any(),
          }).array()
        }),
        execute: async ({ name, rules }) => {
          return await tridentAPI.segments.create(tenantId, { name, rules })
        }
      }),
      createJourney: tool({
        description: 'Create a marketing journey from a description',
        parameters: z.object({
          name: z.string(),
          description: z.string(),
          steps: z.object({
            type: z.enum(['trigger', 'action', 'wait', 'condition', 'split', 'exit']),
            config: z.any(),
          }).array()
        }),
        execute: async ({ name, description, steps }) => {
          // Converts step descriptions → React Flow graph (nodes + edges)
          // Saves as draft — never auto-activates
          return await tridentAPI.journeys.create(tenantId, {
            name, description, steps, status: 'draft'
          })
        }
      }),
      queryRevenue: tool({
        description: 'Get revenue attribution data for a time period',
        parameters: z.object({
          timeRange: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'last_month']),
        }),
        execute: async ({ timeRange }) => {
          return await tridentAPI.analytics.revenue(tenantId, timeRange)
        }
      }),
      pauseJourney: tool({
        description: 'Pause an active journey, optionally for a specific duration',
        parameters: z.object({
          journeyId: z.string(),
          durationHours: z.number().optional()
        }),
        execute: async ({ journeyId, durationHours }) => {
          return await tridentAPI.journeys.pause(tenantId, journeyId, durationHours)
        }
      }),
      profileData: tool({
        description: 'Analyze store data and return profiling summary',
        parameters: z.object({}),
        execute: async () => {
          return await tridentAPI.analytics.profileData(tenantId)
        }
      }),
      getHealthScore: tool({
        description: 'Get overall marketing health score and sub-scores',
        parameters: z.object({}),
        execute: async () => {
          return await tridentAPI.analytics.healthScore(tenantId)
        }
      }),
      updateConfig: tool({
        description: 'Update tenant configuration (frequency caps, discount depth, etc.)',
        parameters: z.object({
          key: z.string(),
          value: z.any(),
        }),
        execute: async ({ key, value }) => {
          return await tridentAPI.config.update(tenantId, key, value)
        }
      }),
      // ... additional tools as features are built
    }
  })
}
```

**Key architectural points:**

- **Tools ARE the internal API.** The same `tridentAPI.segments.create()` function that the visual Audience UI calls directly is the same function the chat tool calls. One API, two interfaces.
- **Multi-step tool chaining** via `maxSteps: 10`. User says "Set up my store's marketing" → LLM calls `profileData`, then `createSegment` (5x), then `createJourney` (3x), then streams back a summary. All in one turn, all in draft/inactive state.
- **Role enforcement** in the system prompt. Viewer role gets data but no execution.
- **Confirmation gates** are UI patterns, not framework features. For destructive actions, the tool returns a "pending confirmation" state. The frontend renders a confirmation card. User clicks confirm. Follow-up message triggers execution.
- **Multi-turn iteration** is just conversation. User says "build me a win-back flow," AI generates it, user says "actually make it 4 steps and add SMS," AI updates. The `useChat` hook sends full message history — the LLM sees what it built before and modifies accordingly. No state machine needed.
- **Model switching** is one line. `google('gemini-2.5-flash')` → `openai('gpt-4.1-mini')` for fallback. Vercel AI SDK's unified interface handles provider differences.

### Internal API Layer (`lib/api/`)

The `tridentAPI` from the tool examples above is implemented as plain functions in `lib/api/`. Each function takes `(admin: SupabaseClient, tenantId: string, ...params)` and returns typed results. No cookies, no auth context, no Next.js coupling. This is how both interfaces call the same business logic:

```
lib/api/data.ts          ← Pure functions: (admin, tenantId) → result
lib/api/shopify.ts       ← Pure functions: (admin, tenantId) → result
lib/api/segments.ts      ← (future) createSegment, evaluateSegment, etc.
lib/api/journeys.ts      ← (future) createJourney, pauseJourney, etc.
lib/api/queries.ts       ← (future) getRevenue, getHealthScore, etc.

app/actions/data.ts      ← Server actions: resolveAuthContext() + call lib/api/
app/api/chat/route.ts    ← Chat tools: auth from request + call same lib/api/
```

Auth context resolution is different per caller:
- **Server actions** use `lib/auth/context.ts` → `resolveAuthContext()` (reads cookies)
- **Chat route** resolves auth from the chat request, then passes `(admin, tenantId)` to `lib/api/` functions directly
- **Cron/webhook routes** use `createAdminClient()` directly (no user auth needed)

Every new feature should follow this pattern: write the business logic in `lib/api/`, wrap it in a server action for the visual UI, and it's automatically ready to be a chat tool.

### Intent Categories & Examples

| Category | Example Input | What Happens | Inline Response |
|---|---|---|---|
| **Create** | "Create a segment of customers who bought twice but haven't ordered in 45 days" | `createSegment` tool called | Segment card: name, rule logic, contact count, "Activate" button |
| **Create (journey)** | "Build a win-back flow: email day 1, wait 7 days, if no open send SMS, if opened send cross-sell" | `createJourney` tool called → React Flow graph generated | Journey card: node preview, "View in Canvas" link, "Activate" button |
| **Modify** | "Pause my abandoned cart flow for the next 48 hours" | `pauseJourney` tool called | Confirmation card: journey name, pause duration, resume time, "Undo" |
| **Query** | "Show me what's working best this month" | `queryRevenue` tool called | Revenue card: ranked journeys by revenue, sparklines |
| **Analyze** | "Why did my open rates drop last week?" | Multiple tools: deliverability data + send volume + content analysis | Analysis card: root cause summary, metrics, recommended actions |
| **Configure** | "Set my max discount to 15% for win-back flows" | `updateConfig` tool called | Confirmation card: old → new value, affected journeys |
| **Multi-step** | "Analyze my store and set up everything I need" | `profileData` → `createSegment` (×5) → `createJourney` (×3) | Summary card: everything created (all draft), "Review & Activate" |

### Confirmation Gates

| Action Type | Confirmation Required | Example |
|---|---|---|
| **Read-only** (queries, reports) | No — execute immediately | "Show me this month's revenue" |
| **Reversible config** (pause, frequency change) | Soft confirm — inline "Undo" for 30s | "Pause win-back flow" |
| **Create** (new segment, new journey) | Created as **draft** — user reviews and clicks "Activate" | "Create a segment of lapsed VIPs" |
| **Destructive** (delete segment, remove contacts) | Hard confirm — explicit "Yes, delete" required | "Delete the browse abandonment journey" |
| **Activation** (make journey live, start sending) | Always requires explicit confirmation — AI never auto-activates | "Activate the win-back journey" |

### Inline Cards

Cards are React components rendered inline in chat — same components used in the visual dashboard.

| Card Type | Contains | Interactive? |
|---|---|---|
| **Segment Card** | Name, rule logic, contact count, lifecycle distribution | Click → opens Audience view with segment selected |
| **Journey Card** | Journey name, status, node graph preview, performance summary | Click → opens Journey canvas with journey loaded |
| **Revenue Card** | Attributed revenue, breakdown by journey/channel, trend sparkline | Click → expands detailed attribution |
| **Health Card** | Overall health score, sub-scores | Click into any sub-score for details |
| **Action Confirmation** | What was changed, old → new values, undo button | Undo within 30s window |
| **Content Card** | Email/SMS preview, A/B variants | Click → opens in Content editor |

### Chat ↔ Visual UI Sync

The chat and visual UI are two views of the same state. Both read from and write to the same API. WebSocket keeps them in sync.

- User creates a segment via chat → segment appears in the Audience view
- User describes a journey in chat → React Flow canvas populates with connected nodes
- User drags a node in the journey canvas → chat history shows "Journey updated: added 7-day delay before step 3"
- User opens the dashboard → can ask "Why is abandoned cart revenue down?" in the chat companion panel

### Sidebar Navigation

The sidebar is a persistent panel on the left with five icon tabs at the top: **Chat**, **Journeys**, **Audience**, **Content**, **Data**. Settings is accessible via a gear icon in the header. Support is handled by a help chatbot in the top bar, not a nav item.

| Tab | What It Opens |
|---|---|
| **Chat** | Chat view (full-width, default landing) |
| **Journeys** | Visual node canvas (React Flow) — journey builder with drag-and-drop nodes, conditions, splits |
| **Audience** | Segments and contacts |
| **Content** | Content library — email templates (Easy Email/Unlayer editor), SMS templates, reusable content blocks, image assets |
| **Data** | Connected sources, sync status, data health, DNS verification status |

Below the tabs: New Chat button + scrollable list of recent chat sessions. Profile button pinned at the bottom (avatar, name, role — opens account menu, team invites, logout).

**Layout behavior:**
- Chat is the default landing page and displays **full-width**
- Clicking into Journeys, Audience, Content, or Data opens that view in the main area with chat **collapsed to a companion side panel**
- Chat never fully disappears — always accessible as a companion
- No hard mode toggle — navigation-driven layout shifts
- Settings via gear icon in header, not a nav item

**Suggested prompt chips** appear in the chat input area when idle:
- "How's my abandoned cart doing?"
- "Show me this week's revenue"
- "What should I focus on?"

### Journey Builder — Visual Node Canvas

The journey builder is a real visual canvas built on **React Flow** (xyflow). Users can drag nodes, connect them, add conditions and splits. **The differentiator isn't that you skip the visual builder — it's that the chat can generate the entire node graph from a natural language description.**

Example: "Build a win-back flow: email on day 1, wait 7 days, if no open send SMS, if opened send cross-sell email" → the visual canvas populates with those nodes connected. The user can then inspect, tweak, drag things around. Chat builds it, canvas lets you see and refine it.

**Node types:**
- **Trigger** — entry event (cart.abandoned, lifecycle_stage change, custom event)
- **Action** — send email, send SMS, send WhatsApp, update contact attribute
- **Wait** — time delay (hours, days) or wait-for-event
- **Condition** — if/else split based on contact attribute, event, or engagement
- **Split** — A/B test split (percentage-based)
- **Exit** — journey completion or timeout

Journey graph is stored in the `journey.graph` field as serialized React Flow state (`{ nodes: [...], edges: [...] }`).

---

## 8. Customer Dashboard

The dashboard is a single overview page with inline summary cards — **not** separate nav pages. Revenue, Deliverability, Compliance, and Experiments are cards within the dashboard, or summoned by the chat. This reinforces chat-first: the SMB owner asks about deliverability rather than navigating to a tab.

| Card | What It Shows | Interaction |
|---|---|---|
| **Health Score** | Single 0-100 score combining deliverability, engagement, revenue, compliance. | Click to expand sub-scores inline |
| **Revenue** | Revenue attributed to marketing (7-day click model). Breakdown by journey/channel. | Click to expand detailed attribution |
| **Audience** | List size, growth rate, lifecycle stage distribution. | Click to navigate to Audience view |
| **Deliverability** | Inbox placement rate, bounce rate, complaint rate, domain reputation. | Click to expand details inline |
| **Compliance** | Consent coverage %, blocked messages, regulation scorecard. | Click to expand details inline |
| **Experiments** | Active A/B tests, winners, projected revenue lift. | Click to expand, [Apply Winner] inline |

Each card has an [Ask AI] action → opens chat companion panel pre-filled with context.

### Customer Controls (Levers)

| Lever | What It Controls | Default |
|---|---|---|
| Brand Voice | Tone slider (formal ↔ casual), upload brand guidelines doc | Vertical default |
| Frequency | Max emails/week, max SMS/week | AI-optimized per vertical |
| Discount Depth | Max discount % for automated win-back | 10% |
| Channel Mix | Enable/disable SMS, WhatsApp | Email only (opt-in for SMS) |
| Pause | Pause all automated sends | Active |
| Exclusions | Exclude specific contacts or segments from automation | None |

---

## 9. Human Layer

Humans are exception handlers, not builders. The system does the work.

### Multi-User Access

| Role | Capabilities |
|---|---|
| **Owner** | Full access. Billing, team management, destructive actions. One per tenant. |
| **Admin** | Can execute all chat commands, create/modify journeys, segments, and settings. Cannot manage billing or delete the tenant. |
| **Viewer** | Can query chat for data and reports. Chat will NOT execute actions — responds: "You'll need an admin to make this change." |

The `user_tenant` junction table supports many-to-many: a user can belong to multiple tenants (agency model — with tenant switcher in header), and a tenant can have multiple users (team access).

### Human Intervention Triggers

| Trigger | What Happens | SLA |
|---|---|---|
| Compliance WARN | Review flagged message, approve or modify | 4 hours |
| Deliverability alert (complaint rate > 0.1%) | Investigate root cause, adjust sending | Same business day |
| New client onboarding | Review brand voice, approve initial config, verify DNS | 48 hours |
| Content escalation | LLM content fails brand consistency check | Next business day |
| Architecture decision | Custom integration, edge case handling | Scoped per request |
| Client request (strategic) | Campaign strategy consultation, quarterly review | Scheduled |

### Target Ratios

| Phase | Clients | Humans | Ratio |
|---|---|---|---|
| POC | 3–5 | 1 (founder) | 1:5 |
| Early | 10–30 | 2 | 1:15 |
| Growth | 30–100 | 3–4 | 1:30 |
| Scale | 100–500 | 8–12 | 1:50 |

> **Validation needed:** The 1:30–1:50 ratio is the thesis, not a fact. Track from day 1: interventions per client per week, time per intervention, category distribution.

---

## 10. Lead Magnet: Email Compliance Scanner

**Input:** Paste raw email HTML (or connect account — future)

**What it checks:**
- **Compliance:** CAN-SPAM, CASL, GDPR markers (unsubscribe link, physical address, sender ID)
- **Deliverability:** SPF/DKIM/DMARC, text-to-image ratio, link density, spam trigger words
- **Performance:** Mobile responsiveness, dark mode compatibility, accessibility

**Output:** Score (0-100) with breakdown by category. Specific issues with severity. Benchmark comparison against vertical average.

**Funnel:**
```
User scans email → Gets score + issues → Email gate for full report → Nurture sequence → Platform demo
(free, no signup)    (immediate value)     (capture lead)              ("here's what we'd fix")   (show the full engine)
```

**R&D feedback loop:** Every scan reveals common failures in the target vertical → feeds platform's opinionated defaults.

**Hosting:** `scan.gettrident.com`. Lightweight Next.js app. No auth for initial scan. Email gate at report download.

---

## 11. Development Cycle & Milestones

### Phase 0 — Foundation (Week 1–2)

- [ ] Supabase Auth with Google OAuth + email/password
- [ ] Tenant creation on signup (database trigger)
- [ ] `user_tenant` junction table with roles (owner, admin, viewer)
- [ ] RLS policies on tenant table (template for all future tables)
- [ ] Onboarding shell — "Connect your Shopify store" screen (stubbed)
- [ ] App shell — sidebar with 5 icon tabs (Chat, Journeys, Audience, Content, Data), layout switching, chat input area

### Phase 1 — Data Pipe (Week 3–4)

- [ ] Shopify OAuth flow to connect a store
- [ ] Receive webhooks (orders, carts, customers)
- [ ] Event normalizer writing to PostgreSQL
- [ ] Contact profile creation and updates
- [ ] Engagement scoring (daily cron)
- [ ] Vertical auto-detection from Shopify product catalog (LLM classification)
- [ ] Chat responds to "how many contacts do I have?" with real data

### Phase 2 — First Journey End-to-End (Week 5–7)

- [ ] Abandoned cart journey: event trigger → Strategy Engine (rule engine) → Content Engine (Gemini via Vercel AI SDK) → Compliance Engine (validation) → SendGrid sends → webhook delivery status
- [ ] Decision log records every decision with full context
- [ ] SendGrid subuser creation per tenant, DNS record generation
- [ ] Chat-guided domain verification ("Add these DNS records to your domain")
- [ ] Content generated via `streamText` with brand context + vertical playbook prompt

### Phase 3 — Chat Interface (Week 8–10)

- [ ] Vercel AI SDK `useChat` hook on frontend
- [ ] `streamText` + typed tools on backend (segment creation, journey queries, revenue queries, config changes)
- [ ] Multi-step tool chaining (`maxSteps: 10`) for "set up my marketing" flows
- [ ] Inline card rendering (Segment Card, Journey Card, Revenue Card, Health Card)
- [ ] Suggested prompt chips
- [ ] Confirmation gates (draft creation, undo for reversible actions, hard confirm for destructive)
- [ ] Role-based execution (viewer gets data only, admin can execute)

### Phase 4 — Visual UI (Week 11–13)

- [ ] Journey node canvas using React Flow — custom node types (Trigger, Action, Wait, Condition, Split, Exit)
- [ ] Journey graph stored in `journey.graph` as serialized React Flow state
- [ ] Chat-generated journeys populate the canvas — user can inspect and tweak visually
- [ ] Audience view — segment list, contact browser, lifecycle distribution
- [ ] Content library — email template editor (Easy Email or Unlayer), SMS templates, image asset management
- [ ] Data view — connected sources, sync status, last event timestamp, DNS verification status
- [ ] Dashboard overview — health score, revenue, deliverability, compliance, experiments cards
- [ ] Chat companion panel when in visual views (collapsed sidebar)
- [ ] Bidirectional sync: visual changes reflected in chat history and vice versa

### Phase 5 — Scanner + Landing Page (Week 14–15)

- [ ] Email compliance scanner at `scan.gettrident.com`
- [ ] HTML paste input, compliance/deliverability/performance scoring
- [ ] Email gate for full report (lead capture)
- [ ] Marketing landing page at `gettrident.com` — "Ditch the Agency. Be Agentic." + scanner CTA
- [ ] Nurture sequence for scanner leads (built on Trident itself — dog-fooding)

### Phase 6 — Design Partners (Week 16+)

- [ ] Onboard 3 Shopify stores (target: pet product brands $500K–$5M)
- [ ] Run live traffic through abandoned cart journey
- [ ] Collect feedback on chat UX, journey quality, content quality
- [ ] Track human intervention frequency — validate 1:human ratio thesis
- [ ] Track L2 platform behavioral data from day one
- [ ] Iterate based on real usage patterns

---

## 12. Open Questions

| Question | Status | Resolution |
|---|---|---|
| Which vertical? | **Resolved** | Pet products for GTM density. External positioning: Shopify brands $500K–$5M. |
| AI framework? | **Resolved** | Vercel AI SDK for chat orchestration. No LangChain/LangGraph — the chat is a tool router, not an autonomous agent graph. Multi-step tool chaining via `maxSteps`. Scale path: add Temporal for durable execution if long chains fail at 100+ clients. |
| LLM cost at scale? | **Resolved** | Gemini 2.5 Flash at $0.15/$0.60 per MTok. LLM cost < 2% of sub revenue. Multi-model fallback via Vercel AI SDK's unified provider interface. |
| Sending infrastructure? | **Partially resolved** | POC: SendGrid subusers (15 default cap, one per tenant). Growth: negotiate higher limits. Scale: evaluate Amazon SES or Ark at 50+ clients. |
| Domain name? | **Open** | Secure gettrident.com or equivalent ASAP. |
| Shared IP vs. dedicated IP? | **Open** | Start shared, migrate to dedicated at >50K monthly sends per client. |
| Revenue attribution model? | **Open** | Start with 7-day click (industry standard). Add view-through as optional. |
| Co-founder? | **Open** | Ideal: sales-oriented, can close design partners while you build. |
| Moonlighting vs. full-time? | **Open** | Build to 3 paying clients while employed. Quit when MRR > $3K and pipeline > $10K. |

---

## 13. Open Source References

| Component | Project | How to Use It |
|---|---|---|
| **Journey visual canvas** | React Flow (xyflow) — github.com/xyflow/xyflow | Build on top of it. Custom node types for email, SMS, wait, condition, split. Next.js workflow editor template available as starting point. |
| **Full platform architecture** | Laudspeaker — github.com/laudspeaker/laudspeaker | Study, don't fork. Learn journey state machines, event pipeline, channel abstractions. TypeScript, Nest.js, React, PostgreSQL, BullMQ — almost identical stack. YC-backed. |
| **Email template editor** | Easy Email Editor — github.com/zalify/easy-email-editor | Embed in Content tab. React + MJML drag-and-drop editor. |
| **Email template editor (alt)** | Unlayer — github.com/unlayer/react-email-editor | More polished alternative. Free tier for low volume. |
| **Email rendering** | MJML — github.com/mjmlio/mjml | Compile email templates to responsive HTML for all clients. |
| **Chat UI** | Vercel AI SDK — ai-sdk.dev | `useChat` hook, `streamText`, typed tool calling, multi-provider support. The entire chat orchestration layer. |

**What you won't find in open source:** The chat-first execution interface and the Intelligence Engine. These are the differentiators. Everything else has solid foundations to build on.

---

## 14. Acquisition Positioning

Building deep on Shopify maximizes the surface area of potential acquirers. Natural acquirer landscape: **Shopify** (most natural — adds marketing execution to their ecosystem), **Klaviyo** (fills their SMB gap where customers churn due to complexity), **Intuit/Mailchimp** (stops the bleeding in e-commerce market share loss), **HubSpot** (down-market play to compete with Klaviyo in e-commerce). The architecture decisions — Shopify-first integration, activation layer positioning, cross-client intelligence — all serve this exit path by making Trident a clean acquisition target for any platform wanting AI-native e-commerce marketing.

---

*End of spec. This document should be treated as a living artifact — update as decisions are made, assumptions are validated, and the vertical is defined.*
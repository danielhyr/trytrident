# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@references.md
@specs.md
@ux-strategy.md

---

## Skill: Universal Full-Stack Web App Builder (Advanced Auto-Execution Mode)

You are an expert full-stack developer tasked with building a complete, production-ready full-stack web application. The application is **Trident** — an agentic marketing platform for Shopify brands. All product context lives in the referenced docs above:

- **specs.md** — product spec, system architecture, data layer, AI brain, channel specs, chat-first interface, compliance engine
- **ux-strategy.md** — north star vision, competitive landscape, complete page map, UX flows, design principles
- **references.md** — open source references for each major feature (React Flow for journeys, Laudspeaker for architecture patterns, Easy Email / Unlayer for email builder, MJML for rendering)

### Process

Follow this exact process without deviation:

1. **Analyze Requirements:** Extract and expand all features from specs.md and ux-strategy.md — core CRUD, auth, real-time chat, journey builder, audience segmentation, content editor, data integrations, admin panels, compliance engine. Add production essentials: responsive design, accessibility (ARIA, WCAG), security (input validation, CSP, rate limiting), error handling, logging, monitoring hooks.

2. **Use the Established Tech Stack:** This project already has a stack — respect it and extend it:
   - **Frontend:** Next.js 16 App Router + TypeScript + Tailwind CSS v4 (no component library — raw HTML + Tailwind)
   - **Backend:** Next.js API routes / Server Actions (expand to NestJS or separate backend when complexity requires)
   - **Database:** Supabase (hosted PostgreSQL + Auth + RLS). SQL migrations as single schema source of truth. No Prisma — use `supabase gen types typescript` for type-safe queries. Add pgvector for Intelligence Engine embeddings.
   - **Queue/Events:** BullMQ + Redis Streams
   - **Auth:** Supabase Auth (email/password + Google OAuth, Shopify OAuth for onboarding)
   - **Real-time:** Socket.io or Supabase Realtime
   - **Email:** SendGrid (delivery) + MJML (rendering) + visual editor (Easy Email or Unlayer)
   - **SMS:** Twilio
   - **Journey Canvas:** React Flow (xyflow)
   - **Testing:** Playwright for E2E
   - **Deploy:** Vercel (frontend) + Render/Railway (backend services)

3. **Create Detailed Phase Plan:** Define 14-18 sequential phases specific to Trident, each with:
   - Clear sub-steps and deliverables
   - Key files to create/modify
   - Git commit message
   - E2E testing goals using Playwright
   - Performance/security checkpoints

   **Phase roadmap (see devcycle.md for current status and detailed next steps):**
   - Phase 0: Auth foundation + multi-tenancy — **DONE**
   - Phase 1: Data pipe (Shopify webhooks, ingestion pipeline, historical import) — **DONE**
   - Phase 1.5: Segments & Audience (segment table, recursive rule evaluator, CRUD API, Audience page, engagement scoring) — **DONE**
   - Phase 3: Chat interface (Vercel AI SDK v4, Gemini 2.5 Flash, tool calling, conversation persistence) — **DONE**
   - Content Studio: content_template/version/asset tables, MJML email editor, SMS/push composers, Liquid engine, AI content generation, chat tools, Supabase Storage asset uploads — **DONE**
   - Phase 2: First journey end-to-end — **DONE** (engine + canvas + SendGrid delivery + identity-aware events)
   - Phase 4: Visual UI + Analytics + Settings (dashboard with health/revenue/deliverability/compliance cards, journey analytics on canvas, settings: email/brand/channels/team/automation, chat companion panel, Cmd+K) — **UP NEXT** (MVP completion gate)
   - Phase 5: Scanner + landing page
   - Phase 6: Design partners

4. **Execute Phases:** Begin Phase 1 and work silently through every phase in strict order. For each phase:
   - Write full code for all new/changed files (TypeScript, proper types, Zod validation)
   - Implement production quality: loading states, error boundaries, accessibility, tests
   - End each phase with a git commit and Playwright test results where applicable
   - Reference specs.md, ux-strategy.md, and references.md for feature details and architecture patterns

### Mandatory Rules

- **Consult the docs:** Before building any major feature, re-read the relevant section of specs.md, ux-strategy.md, or references.md. The product is precisely defined — don't invent features that contradict the spec.
- **Chat-first is the differentiator.** The chat interface is NOT a sidebar widget — it IS the primary execution layer. Build it as the core UX, not an afterthought. Visual UI is the escape hatch.
- **Follow the design system.** All tokens are in `app/globals.css` via Tailwind v4's `@theme inline`. Use the established color tokens, font families, and patterns documented below.
- **Use best practices:** Clean architecture, DRY, env vars, linting (ESLint/Prettier), TypeScript strict mode.
- **Never ask questions during execution.** Work silently until the phase is complete, then report results.
- **Test everything.** Every major phase ends with Playwright tests verifying the new functionality in an integrated environment.
- **Update devcycle.md after every iteration.** At the end of each work session or phase completion, update `devcycle.md` with: what was accomplished, what changed, where development currently stands, and what the next steps are. This file is the living record of build progress — keep it accurate so any future session can pick up exactly where the last one left off.

---

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build + TypeScript check
npm run start    # serve production build
```

No test runner or linter is configured yet.

## Architecture

**Next.js 16.2.3 App Router** with TypeScript and Tailwind CSS v4. No component library — all UI is raw HTML + Tailwind.

### Internal API pattern (critical — agent-readiness)

Every feature MUST follow this pattern so the chat agent can call the same business logic as the visual UI:

```
lib/api/*.ts             ← Pure business logic: (admin, tenantId, ...params) → typed result
                           No cookies, no auth context, no Next.js coupling.
app/actions/*.ts         ← Server actions: resolveAuthContext() + call lib/api/
app/api/chat/route.ts    ← Chat tools: auth from request + call same lib/api/
```

- **`lib/api/`** functions take `(admin: SupabaseClient, tenantId: string, ...params)` and return structured data. These are the "tridentAPI" from specs.md.
- **`app/actions/`** are thin wrappers: call `resolveAuthContext()` from `lib/auth/context.ts` (cookie-based), then delegate to `lib/api/`.
- **`app/api/chat/`** tools will resolve auth from the chat request, then call the same `lib/api/` functions.
- **Never put business logic directly in a server action or API route.** Extract it to `lib/api/` first.

Existing `lib/api/` functions:
- `lib/api/data.ts` — `runEventProcessing()`, `runHistoricalImport()`, `getPipelineStats()`
- `lib/api/shopify.ts` — `getShopifyStatus()`, `disconnectShopifyStore()`
- `lib/api/segments.ts` — `createSegment()`, `getSegment()`, `listSegments()`, `updateSegment()`, `deleteSegment()`, `evaluateSegmentRules()`, `refreshSegmentCounts()`, `listContacts()`
- `lib/api/engagement.ts` — `recalculateEngagement()`
- `lib/api/chat.ts` — `createConversation()`, `listConversations()`, `getConversation()`, `getMessages()`, `saveMessage()`, `updateConversationTitle()`, `deleteConversation()`
- `lib/api/content.ts` — `listTemplates()`, `getTemplate()`, `createTemplate()`, `updateTemplate()`, `duplicateTemplate()`, `archiveTemplate()`, `deleteTemplate()`, `listAssets()`, `createAsset()`, `deleteAsset()`
- `lib/api/journeys.ts` — `createJourney()`, `getJourney()`, `listJourneys()`, `updateJourney()`, `deleteJourney()`, `duplicateJourney()`, `activateJourney(schedule?)`, `pauseJourney()`, `resumeJourney()`, `archiveJourney()`, `getJourneyStats()`, `enrollContact()`, `getEnrollments()`, `validateJourneyGraph()`, `getNextNodes()`

### Chat architecture

The chat is the primary execution layer (specs.md §7). Built on Vercel AI SDK v4 with Gemini 2.5 Flash.

- `lib/chat/tools.ts` — `createChatTools(admin, tenantId)` returns tools for `streamText`. Each tool wraps a `lib/api/` function. Schemas must be Gemini-compatible (no `z.tuple()`). Includes content tools: `listContent`, `getContentTemplate`, `createSmsTemplate`, `createPushTemplate`, `createEmailTemplate`, `generateContent` (AI-powered generation via Gemini Flash).
- `lib/chat/system-prompt.ts` — `buildSystemPrompt({ tenantId, role, userName })` builds the persona prompt.
- `app/api/chat/route.ts` — POST: streaming chat endpoint. Uses `convertToModelMessages()` (v4 requirement), `stopWhen: stepCountIs(5)` for multi-step tool calls.
- `app/api/chat/messages/route.ts` — GET: load conversation messages in v4 UIMessage parts-based format.
- `app/api/chat/conversations/route.ts` — GET: list recent conversations. DELETE: delete a conversation (ownership-verified).
- AI SDK v4 key patterns: messages use `parts: [{ type: "text", text }]` not `content` string; `sendMessage({ text }, { body: { conversationId } })` for per-request body; `DefaultChatTransport` body captures stale closures so dynamic values go in sendMessage.

### Data ingestion pipeline

```
Shopify ──webhook──► POST /api/webhooks/shopify ──► raw_event (buffer)
        ──import──► "Import Historical Data"   ──► raw_event (buffer)
                                                         │
                                                    Process Now / cron
                                                         │
                                              Normalizer (lib/ingestion/normalizers/)
                                                         │
                                              Identity Resolution (external_id > email > phone)
                                                         │
                                              contact (upsert) + event (append)
```

Key files:
- `lib/ingestion/types.ts` — shared types (DataSource, CanonicalEventType, Normalizer interface)
- `lib/ingestion/normalizers/registry.ts` — pluggable normalizer map
- `lib/ingestion/normalizers/shopify.ts` — maps 7 Shopify topics to canonical events
- `lib/ingestion/identity.ts` — 3-tier identity resolution with backfill. Returns `{ contact, created, updated }` with change detection (compares incoming values against stored row).
- `lib/ingestion/processor.ts` — batch processor: normalize → resolve → upsert → determine canonical event type → insert event → evaluate journey triggers → mark processed
- `lib/shopify/historical-import.ts` — REST API pagination import

**Identity-aware canonical events:** For customer events, the processor overrides the Shopify event type based on what happened in Trident's contact table:
- Shopify `customers/create` + new contact → `customer.created`
- Shopify `customers/create` + existing contact + fields changed → `customer.updated`
- Shopify `customers/create` + existing contact + no changes → no event (skipped)
This prevents `customer.created` journey triggers from firing on webhook retries or duplicate events.

Adding a new data source = one normalizer file + one line in registry. Pipeline unchanged.

### Journey engine

Two entry paths into journeys:
1. **Event-based** — `evaluateTriggersForEvent()` called after each canonical event insert, matches active journeys by event_type
2. **Segment-based** — `enrollSegmentContacts()` batch-enrolls contacts from a segment, triggered at activation (send now) or by cron (scheduled)

Key files:
- `lib/journeys/types.ts` — Journey, JourneyEnrollment, Message, JourneyGraph, node data interfaces, TriggerConfig (supports event + segment + scheduling)
- `lib/journeys/engine.ts` — `evaluateTriggersForEvent()`, `enrollSegmentContacts()`, `advanceEnrollment()` (state machine), `processWaitingEnrollments()` (cron, also handles scheduled segment sends)
- `lib/journeys/compliance.ts` — `checkCompliance()` pre-send validation (consent, suppression, frequency cap)
- `lib/journeys/decision-logger.ts` — `logDecision()` records every engine decision with contact snapshot
- `lib/api/journeys.ts` — CRUD, status transitions (activate/pause/resume/archive), graph validation, enrollment management
- `lib/sendgrid/sender.ts` — `sendJourneyEmail()` (direct send), `processQueuedMessage()` (single queued message: fetch context → render Liquid → compile MJML → send via SendGrid → update row), `processQueuedMessages()` (batch drain with retry logic, max 3 attempts)
- `lib/sendgrid/client.ts` — low-level SendGrid v3 API wrapper using fetch, returns messageId from X-Message-Id header
- `app/api/webhooks/sendgrid/route.ts` — delivery/open/click/bounce/complaint event handler, updates message + contact + decision_log
- `app/api/internal/process-journeys/` — cron endpoint calling `processWaitingEnrollments()` then `processQueuedMessages()` (enrollments may queue messages, then delivery drains them)

Canvas UI:
- `components/journeys/nodes/` — trigger-node (Entry), action-node, wait-node, condition-node, split-node, exit-node
- `components/journeys/node-config-panel.tsx` — config panel with entry type toggle (Event/Segment), template picker, segment picker. Entry config locks after activation.
- `components/journeys/schedule-modal.tsx` — send now vs schedule for later (date/time/timezone)
- `components/journeys/journey-top-bar.tsx` — save/activate (draft only)/pause/resume
- `components/journeys/node-palette.tsx` — bottom bar for adding nodes (Entry, Email, SMS, Push, Update, Wait, Condition, Split, Exit)

### Route structure

- `app/layout.tsx` — root layout: loads Google Fonts (Sora, DM Sans, IBM Plex Mono), sets font CSS variables on `<html>`
- `app/(app)/layout.tsx` — authenticated shell: `Sidebar` (left) + column of `Topbar` + `<main>` (right, flex-1)
- `app/(app)/page.tsx` — redirects to `/chat`
- `app/(app)/data/page.tsx` — **fully built**: Shopify connect/disconnect, pipeline stats, import, process, event table
- `app/(app)/chat/page.tsx` — **fully built**: chat UI with `useChat`, conversation history, streaming, tool calling
- `app/(app)/audience/page.tsx` — **fully built**: segments list, contact list, lifecycle distribution, rule builder
- `app/(app)/content/page.tsx` — **fully built**: content library with template cards + image assets, channel/status filters, search, Create New dropdown
- `app/(app)/content/sms/` — SMS editor: textarea + character counter + phone mockup preview + Liquid rendering
- `app/(app)/content/push/` — Push editor: title/body inputs + iOS/Android mockup previews
- `app/(app)/content/email/` — Email editor: MJML code editor + live HTML preview in iframe + block inserter + mobile/desktop toggle + auto-save
- `app/api/content/assets/upload/` — POST: multipart file upload to Supabase Storage (`content-assets` bucket), tenant-isolated paths
- `app/api/content/preview/` — POST: server-side Liquid rendering with sample data
- `app/(app)/journeys/page.tsx` — **fully built**: journey list with status tabs, stats, create/duplicate/archive/delete
- `app/(app)/journeys/[id]/page.tsx` — **fully built**: journey canvas (React Flow) with custom nodes, config panel, node palette, stats bar, top bar with save/activate/pause/resume
- `app/(app)/journeys/new/page.tsx` — create new journey and redirect to canvas
- Routes: `/dashboard`, `/settings` — placeholder pages
- `app/auth/shopify/` — Shopify OAuth initiate + callback (split-domain: localhost user, ngrok for Shopify)
- `app/api/chat/route.ts` — streaming chat POST (Gemini 2.5 Flash + tools)
- `app/api/chat/messages/route.ts` — GET conversation messages
- `app/api/chat/conversations/route.ts` — GET list / DELETE conversation
- `app/api/webhooks/shopify/` — webhook handler (HMAC verification, raw_event insert)
- `app/api/internal/process/` — cron-triggered event processing (CRON_SECRET auth)

### Shell components

- `components/shell/sidebar.tsx` — **client component** (needs `usePathname`). Fixed 220px, collapsible to 56px. Structure: logo → New Chat button → nav links → separator → recent chats list (dynamic, server-fetched via layout.tsx, with hover-to-delete) → pinned profile button with dropdown menu.
- `components/shell/topbar.tsx` — server component, 56px height. Shows tenant name + health badge only.

### Design system

All tokens are in `app/globals.css` via Tailwind v4's `@theme inline` block — no `tailwind.config`. Key tokens:

| Token | Value | Use |
|---|---|---|
| `bg-bg` | `#0F172A` | page background |
| `bg-bg-sidebar` | `#0B1120` | sidebar |
| `bg-surface` | `#1E293B` | cards |
| `text-accent` / `bg-accent` | `#0ACDBC` | teal, primary accent |
| `bg-dot-grid` | CSS class | light dotted main content area |

The main content area (`<main>`) uses `.bg-dot-grid` — a light grey (`#C8CDD5`) background with a subtle dot radial-gradient pattern. Sidebar and topbar stay dark.

Active nav items use `border-l-2 border-accent bg-accent-muted text-accent`.

Font families map to CSS variables set by `next/font/google`: `--font-sora` -> headlines (`font-headline`), `--font-dm-sans` -> body (`font-body`), `--font-ibm-plex-mono` -> data/labels (`font-data`).

### Path alias

`@/` maps to the repo root (e.g. `@/components/shell/sidebar`).

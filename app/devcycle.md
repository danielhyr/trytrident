## Current Status

**Phase:** Phase 2 — Journey Engine (DONE), Chat Agent Tooling Expansion (DONE)
**Last Updated:** 2026-04-11
**Build Status:** TypeScript clean (`npx tsc --noEmit`); `npm run build` blocked in sandbox by Google Fonts fetch for `next/font`

---

### Completed

**Chat Agent Tooling: Full Coverage + Templates** — DONE (2026-04-11)

- **Journey templates** — new `lib/chat/templates/journey-templates.ts` defines five opinionated templates the chat can recommend and instantiate: Welcome Series, Abandoned Cart, Post-Purchase, Win-Back, and VIP. Templates support linear steps plus branched `condition` paths for flows like abandoned cart recovery.
- **Segment templates** — new `lib/chat/templates/segment-templates.ts` defines five starter segments: VIP Customers, Win-Back, At Risk, New Subscribers, and Repeat Buyers. Date-based presets are generated relative to the current date at runtime so they do not drift stale.
- **createJourney upgraded** — chat journey creation now supports:
  - Event-triggered and segment-triggered journeys (`triggerType`, `segmentId`)
  - Recursive branched step definitions (`yes_steps`, `no_steps`, `a_steps`, `b_steps`)
  - Automatic AI content generation and linking for `send_email`, `send_sms`, and `send_push` action nodes that do not already reference a template
- **New orchestration tool** — `setupMarketing` analyzes data pipeline stats, creates three recommended starter segments (VIP, Win-Back, New Subscribers), and creates an abandoned cart journey with linked generated content templates in one tool call.
- **Missing CRUD tools added to chat** — `archiveJourney`, `deleteJourney`, `updateSegment`, and `deleteSegment` are now exposed through `lib/chat/tools.ts`, matching existing `lib/api/` capabilities.
- **Graph builder support for segment entry** — `lib/journeys/graph-builder.ts` now builds trigger nodes for both event-based and segment-based journeys, carrying `trigger_type`, `segment_id`, and `segment_name` into the canvas graph.
- **System prompt expanded** — `lib/chat/system-prompt.ts` now teaches the assistant to:
  - Recommend prebuilt journey and segment templates before jumping into custom flows
  - Use `setupMarketing` for broad onboarding requests like "set up my marketing"
  - Chain actions across segments, journeys, and content rather than treating them as isolated steps
- **Verification**
  - `npx tsc --noEmit` passes
  - `npm run build` is blocked in this sandbox because `next/font` cannot fetch Google Fonts; no application type errors were surfaced before that network failure

**Phase 2: Journey Engine — Message Delivery Worker + Identity-Aware Events** — DONE (2026-04-10)

- **Message delivery worker** — closes the SendGrid delivery loop. The engine inserts `message` rows with `status: "queued"` when processing `send_email` action nodes. The new `processQueuedMessages()` function drains the queue: fetches queued rows, renders Liquid templates (subject + body), compiles MJML if present, sends via SendGrid API, updates message to `status: "sent"` with `provider_message_id` and `sent_at`. Retry logic: up to 3 attempts with `error_message` tracking per message. Failed messages marked `status: "failed"`.
- **Cron integration** — `processQueuedMessages()` wired into the existing `process-journeys` cron endpoint after `processWaitingEnrollments()`. Natural ordering: enrollments may queue new messages, then delivery drains them. Same cron, same endpoint, no new infrastructure.
- **Migration `008_message_delivery.sql`** — adds `retry_count` (integer, default 0) and `error_message` (text) columns to `message` table. Partial index `message_queued_idx` on `(created_at ASC) WHERE status = 'queued'` for efficient queue polling.
- **Identity-aware canonical events** — the processor no longer blindly trusts Shopify's event type for customer events. Instead, it determines the canonical event type based on what actually happened in Trident's contact table:
  - Shopify `customers/create` + new contact created → `customer.created`
  - Shopify `customers/create` + existing contact + fields changed → `customer.updated`
  - Shopify `customers/create` + existing contact + no changes → **no event emitted** (skipped)
  - This prevents journeys triggered on `customer.created` from firing for existing customers when Shopify retries webhooks or sends duplicate `customers/create` events.
- **Change detection in identity resolution** — `resolveContact()` now returns `{ contact, created, updated }`. `backfillAndUpdate()` compares incoming field values against the stored contact row and only writes + returns `true` if values actually differ. Full contact row is fetched (`select("*")`) to enable comparison.
- **E2E verified** — full delivery loop tested end-to-end: Shopify webhook simulation → raw_event → event processing → identity resolution → journey trigger evaluation → contact enrollment → compliance check → message queued → cron drains queue → Liquid rendering (personalized subject: "We Miss You, Daniel!") → SendGrid API → email delivered to real inbox. Also verified: compliance engine correctly blocks sends for contacts without `email_consent`.
- Files changed: `supabase/migrations/008_message_delivery.sql` (new), `lib/journeys/types.ts`, `lib/sendgrid/sender.ts`, `app/api/internal/process-journeys/route.ts`, `lib/ingestion/identity.ts`, `lib/ingestion/processor.ts`

**Phase 2: Journey Engine — Segment-Based Triggers + Scheduled Send** — DONE (2026-04-10)

- **Segment-based entry** — journeys can now be triggered by a segment (batch-enroll all matching contacts) in addition to Shopify events. Entry node config panel has "Entry Type" dropdown: Event or Segment. Segment mode shows a segment picker populated from `fetchSegments()`.
- **Scheduled activation** — segment-triggered journeys can be scheduled for later. When activating a segment journey, a schedule modal appears with "Send Now" or "Schedule for Later" (date/time/timezone picker). Scheduled sends are picked up by the existing `processWaitingEnrollments` cron.
- **Segment enrollment engine** (`lib/journeys/engine.ts` → `enrollSegmentContacts()`) — paginates through segment contacts via `evaluateRules()`, respects `entry_limit` and `re_entry_allowed`, enrolls each contact, logs decisions, advances past entry node. Tracks enrollment progress in `trigger_config.enrollment_status` (pending/completed/failed).
- **Entry node rename** — "Trigger" renamed to "Entry" across all UI: node palette, trigger-node component, config panel header, NODE_TYPE_CONFIG. The underlying `NodeType` is still `"trigger"` (no DB migration). Node displays Zap icon for event entries, Users icon for segment entries.
- **Activation flow cleanup** — "Activate" button only shows for draft journeys. Paused journeys show Save + Resume only.
- **Entry config locking** — once a journey has been activated, the entry type and its configuration (event type or segment) become read-only. Shown as static text with "Entry cannot be changed after activation." message.
- **Dirty state fix** — React Flow's `onNodesChange` no longer marks the canvas dirty for `dimensions` change events (fired on mount when nodes get measured). Fixes false "Unsaved changes" indicator on page load.
- **Type extensions** — `TriggerType` (`"event" | "segment"`), `TriggerConfig` extended with `trigger_type`, `segment_id`, `segment_name`, `scheduled_for`, `scheduled_timezone`, `enrollment_status`. `TriggerNodeData` extended with `trigger_type`, `segment_id`, `segment_name`.
- **Guard in event evaluator** — `evaluateTriggersForEvent()` skips journeys with `trigger_type === "segment"` so they don't fire on every Shopify event.
- **API layer** — `activateJourney()` accepts optional `schedule` param. `validateJourneyGraph()` validates event triggers have `event_type` and segment triggers have `segment_id`.
- **Server actions** — `activateJourney()` passes schedule through. New `fetchSegments()` action in `app/actions/segments.ts`.
- **New component** — `components/journeys/schedule-modal.tsx`: date/time/timezone picker modal with common US/EU timezones.
- **No database migration** — all scheduling/segment fields stored in existing JSONB `trigger_config` column.
- Files changed: `lib/journeys/types.ts`, `lib/journeys/engine.ts`, `lib/api/journeys.ts`, `app/actions/journeys.ts`, `app/actions/segments.ts`, `components/journeys/nodes/trigger-node.tsx`, `components/journeys/node-config-panel.tsx`, `components/journeys/node-palette.tsx`, `components/journeys/journey-top-bar.tsx`, `app/(app)/journeys/[id]/journey-canvas.tsx`, `components/journeys/schedule-modal.tsx` (new)


**Content Studio** — DONE

- Database migration `006_content_studio.sql` — `content_template` table (channel email/sms/push, status draft/active/archived, subject, preheader, body_json/body_html/body_text, push fields, liquid_variables array, tags array), `content_template_version` table (snapshot jsonb, version_number, change_summary), `content_asset` table (file_path, public_url, mime_type, dimensions). RLS: members SELECT, admins INSERT/UPDATE/DELETE. Indexes on (tenant_id, channel, status) and (tenant_id, updated_at desc). Reuses `set_updated_at()` trigger.
- Content types (`lib/content/types.ts`) — ContentTemplate, ContentTemplateVersion, ContentAsset interfaces, ContentChannel, TemplateStatus types, CHANNEL_CONFIG (color/icon per channel), STATUS_CONFIG
- Content API (`lib/api/content.ts`) — agent-ready pure functions: listTemplates (channel/status/search/tags filters with pagination), getTemplate, createTemplate (auto-extracts Liquid variables), updateTemplate (auto-creates version snapshot on body change), duplicateTemplate (clone with "(Copy)" suffix), archiveTemplate, deleteTemplate, listAssets, createAsset, deleteAsset
- Server actions (`app/actions/content.ts`) — thin wrappers: createTemplate, updateTemplate, duplicateTemplate, archiveTemplate, deleteTemplate, fetchTemplates, fetchTemplate, createAsset, deleteAsset
- Liquid engine (`lib/liquid/engine.ts`) — singleton LiquidJS engine with custom filters (money, date_format, truncate_words, default), renderLiquid(), validateLiquid(), extractLiquidVariables()
- Liquid contact context (`lib/liquid/contact-context.ts`) — ContactLiquidContext type, LIQUID_VARIABLES constant (17 variables across Contact/Shop/Campaign categories with labels + examples), SAMPLE_CONTEXT for preview rendering, getVariablesByCategory()
- Content Library page (`app/(app)/content/page.tsx`) — server component replacing placeholder, fetches templates + channel counts. Client component `content-library.tsx` with: "Create New" dropdown (Email/SMS/Push), channel filter pills with counts, status filters (All/Draft/Active/Archived), search, responsive template card grid, duplicate/archive/delete actions
- SMS editor (`app/(app)/content/sms/sms-editor.tsx`) — two-column layout (60/40): left has textarea with character counter (160-char segments, green/yellow/red), "Insert Variable" button → PersonalizationPanel, compliance footer preview; right has iPhone mockup with live SMS bubble, debounced 300ms Liquid preview with sample data. New + edit pages at `/content/sms/new` and `/content/sms/[id]`
- Push editor (`app/(app)/content/push/push-editor.tsx`) — two-column layout: left has title input (50 char counter), body textarea (150 char counter), image URL input, click action URL; right has stacked iOS + Android push notification mockups with live Liquid preview. New + edit pages.
- Email editor (`app/(app)/content/email/email-editor.tsx`) — MJML code editor with live preview. Subject + preheader bar. Split-pane: left is dark-themed MJML code textarea with block inserter dropdown (6 predefined blocks: header, text, CTA, product grid, footer, spacer) and variable insertion; right is sandboxed iframe with rendered HTML preview, mobile/desktop toggle. Auto-save every 30s. On save: compile MJML → HTML, extract Liquid variables, store both body_json (MJML source) and body_html. Uses mjml-browser for client-side compilation.
- Shared components: `composer-top-bar.tsx` (back button, inline-editable name, status badge, Save Draft / Save & Activate), `personalization-panel.tsx` (slide-out panel with searchable categorized variable list, click-to-insert), `character-counter.tsx` (SMS segments with color coding), `phone-mockup.tsx` (iPhone frame + SmsBubble), `push-mockup.tsx` (iOS lock screen + Android notification shade previews), `channel-icon.tsx` (Mail/MessageSquare/Bell with channel color), `status-badge.tsx` (draft/active/archived with color dot), `template-card.tsx` (card for library grid with preview text, time ago, variable count, hover actions)
- Asset picker (`components/content/asset-picker.tsx`) — modal with drag-and-drop upload zone, image preview grid with dimensions + file size, click to select → returns public URL, delete with confirmation
- Preview service (`lib/content/preview.ts`) — previewSms, previewPush, previewEmail using renderLiquid with SAMPLE_CONTEXT. POST API endpoint at `/api/content/preview`
- Chat integration — 6 new tools in `lib/chat/tools.ts`: listContent (channel/status filter), getContentTemplate (by ID), createSmsTemplate, createPushTemplate, createEmailTemplate (wraps in MJML), generateContent (AI-generates content via Gemini Flash and creates template in one step). System prompt updated with content capabilities, Liquid variable reference, and generation guidance.
- AI content generation (`lib/content/generate.ts`) — generateSmsContent, generatePushContent, generateEmailContent using `generateObject` from AI SDK with Zod output schemas. Gemini Flash generates copy with Liquid personalization, creates template in one step. Chat tool `generateContent` exposes this to the chat agent.

**Phase 3: Chat Interface** — DONE

- Database migration `005_chat.sql` — `chat_conversation` table (tenant_id, user_id, title, timestamps) and `chat_message` table (conversation_id, role, content, tool_invocations jsonb). Indexes on (tenant_id, user_id, updated_at desc) and (conversation_id, created_at asc). RLS policies for user-scoped access. ON DELETE CASCADE from conversation to messages. `set_updated_at()` trigger.
- Chat business logic (`lib/api/chat.ts`) — agent-ready pure functions: createConversation, listConversations, getConversation, getMessages, saveMessage (touches conversation updated_at), updateConversationTitle, deleteConversation
- Chat tools (`lib/chat/tools.ts`) — `createChatTools(admin, tenantId)` returns tools for AI SDK `streamText`: queryContacts (wraps segments.listContacts), querySegments (wraps segments.listSegments), createSegment (wraps segments.createSegment with rule builder), getPipelineStats (wraps data.getPipelineStats), getShopifyStatus (wraps shopify.getShopifyStatus). Gemini-compatible schemas (no z.tuple).
- System prompt (`lib/chat/system-prompt.ts`) — builds persona prompt with tenant context, role, available tools description, Trident brand voice
- Streaming chat endpoint (`app/api/chat/route.ts`) — POST: auth → parse messages → resolve/create conversation → save user message (v4 parts extraction) → `streamText` with Gemini 2.5 Flash via `@ai-sdk/google`, `convertToModelMessages()`, `stopWhen: stepCountIs(5)` → `onFinish`: save assistant message + auto-title on first exchange → `toUIMessageStreamResponse()` with X-Conversation-Id header
- Messages endpoint (`app/api/chat/messages/route.ts`) — GET: auth → verify conversation ownership → return messages in v4 UIMessage parts-based format
- Conversations endpoint (`app/api/chat/conversations/route.ts`) — GET: list recent conversations for sidebar. DELETE: verify ownership → delete conversation
- Chat UI (`app/(app)/chat/page.tsx`) — `useChat` with `DefaultChatTransport`, conversation ID from URL search params, initial message loading for existing conversations, `setMessages` sync on navigation, auto-scroll, suggestion chips for empty state, streaming "Thinking..." indicator
- Message bubble component (`components/chat/message-bubble.tsx`) — user messages right-aligned with accent bg, assistant messages left-aligned, tool invocation display
- Chat input component (`components/chat/chat-input.tsx`) — auto-growing textarea, Enter to send, Shift+Enter for newline, disabled during streaming
- Chat suggestions component (`components/chat/chat-suggestions.tsx`) — prompt chips shown on empty conversation: "How many contacts do I have?", "Show me my segments", "What's my pipeline status?", "Create a VIP segment"
- Sidebar integration — dynamic recent conversations fetched server-side in layout.tsx, passed to Sidebar component. Active conversation highlighting. Delete conversation on hover (trash icon) with API call + router.refresh(). Navigation to `/chat` on active conversation deletion.
- Conversation history — clicking sidebar conversations loads messages via `/api/chat/messages`, syncs into `useChat` state
- Key v4 migration details: `convertToModelMessages()` required for UIMessage→ModelMessage conversion, parts-based message format (`[{ type: "text", text }]` not `content` string), `sendMessage({ text }, { body: { conversationId } })` for per-request body values (not transport-level body which captures stale closures)

**Phase 1.5: Segments & Audience** — DONE

- Database migration `004_segments.sql` — `segment` table with rules (jsonb), contact_count cache, status (active/archived), RLS policies (members read, admins write), unique name index per tenant, updated_at trigger
- Segment types (`lib/segments/types.ts`) — Recursive rule tree: `RuleGroup` (combinator + `RuleNode[]` children) where each node is a `RuleCondition` or nested `RuleGroup`. 10 operators. `normalizeRulesConfig()` handles legacy flat arrays and v2 format. CONTACT_FIELDS metadata with categories.
- Rule evaluator (`lib/segments/evaluator.ts`) — Recursive: converts rule tree into PostgREST nested `and()/or()` filter strings for arbitrary AND/OR nesting depth. Supports all contact columns + custom_attributes jsonb paths. Count-only and paginated modes.
- Segment API (`lib/api/segments.ts`) — agent-ready pure functions: createSegment, getSegment, listSegments, updateSegment, deleteSegment, evaluateSegmentRules, refreshSegmentCounts, listContacts (paginated, searchable, filterable, sortable)
- Engagement scoring (`lib/api/engagement.ts`) — recalculateEngagement: decayed score per signal (order +30/60d, open +5/30d, click +15/30d, cart abandon -5), lifecycle stage derivation (vip/active/at_risk/lapsed/prospect), suppression for unsub/complaint
- Server actions (`app/actions/segments.ts`) — thin wrappers: createSegment, updateSegment, deleteSegment, previewSegmentRules, fetchContacts, triggerRefreshCounts, triggerEngagementRecalculation
- Audience page UI (`app/(app)/audience/page.tsx`) — server component: fetches segments, contacts, lifecycle counts in parallel
- Audience tabs (`audience/audience-tabs.tsx`) — client component: Segments/Contacts tab switching, selected segment state management
- Segment list (`audience/segment-list.tsx`) — table with name, count, status, created date. Inline create form with rule builder. Empty state. Archived segments collapsible section.
- Rule builder (`audience/rule-builder.tsx`) — SFMC-style interactive builder: drag-and-drop reorder (@dnd-kit), nestable AND/OR groups with combinator toggle on right edge, "group with above" to pair conditions, ungroup to dissolve, live plain-English filter summary. Field dropdowns grouped by category, type-aware value inputs, Preview Count button.
- Segment detail (`audience/segment-detail.tsx`) — recursive read-only rule display with nested AND/OR badges, population count (full-width bar above rules), inline rule editing via RuleBuilder, sample contacts table (top 10 by engagement score), inline edit (name/description), delete with confirmation gate
- Contact list (`audience/contact-list.tsx`) — lifecycle distribution bar (clickable chips filter table), search by name/email, sortable columns, pagination (50/page), links to contact detail
- Contact detail page (`audience/[id]/page.tsx`) — profile + purchase history cards, engagement timeline (last 50 events with type-colored badges), active segments (dynamically evaluated), consent record

**Phase 1: Data Pipe (Shopify Integration)** — DONE

- Shopify OAuth flow: initiate (`/auth/shopify`), callback (`/auth/shopify/callback`), disconnect (`app/actions/shopify.ts`)
- Split-domain OAuth architecture: user browses on localhost, Shopify callbacks hit ngrok URL, callback redirects back to localhost
- Shopify webhook registration on OAuth completion — 7 topics: customers/create, customers/update, orders/create, orders/fulfilled, orders/cancelled, checkouts/create, checkouts/update (`lib/shopify/webhooks.ts`)
- Webhook handler (`/api/webhooks/shopify`) — HMAC-SHA256 verification, idempotent insert into `raw_event`, instant 200 response
- Data ingestion pipeline types (`lib/ingestion/types.ts`) — DataSource, CanonicalEventType, RawEventRow, NormalizeResult, Normalizer interface, ProcessingStats
- Pluggable normalizer registry (`lib/ingestion/normalizers/registry.ts`) with Shopify normalizer (`lib/ingestion/normalizers/shopify.ts`)
- Shopify normalizer maps 7 webhook topics to canonical events with contact identifiers, profile updates, and order deltas
- Three-tier deterministic identity resolution (`lib/ingestion/identity.ts`) — external_id > email > phone, with backfill of missing identifiers. Returns `{ contact, created, updated }` — change detection compares incoming values against stored contact row.
- Event processor (`lib/ingestion/processor.ts`) — batch processing: normalize → resolve identity → apply contact updates → apply order deltas → determine canonical event type (identity-aware for customer events) → insert canonical event → evaluate journey triggers → mark processed. Per-event error handling.
- Supabase admin client (`lib/supabase/admin.ts`) — service-role client bypassing RLS for webhooks and background jobs
- Cron-triggered processing endpoint (`/api/internal/process`) — auth via CRON_SECRET Bearer token
- Server action `triggerProcessing()` for authenticated manual processing from UI
- **Historical data import** (`lib/shopify/historical-import.ts`) — fetches all customers and orders from Shopify REST Admin API using cursor-based pagination (Link header), inserts as raw_events with idempotency keys. Handles rate limiting (429 retry), per-record error isolation.
- Server action `triggerHistoricalImport()` for authenticated import from UI
- Data page UI (`/data`) with: ShopifyConnect card (connect/disconnect with confirmation gate), pipeline stat cards (raw events, unprocessed, errors, contacts, canonical events), Import Historical Data button, Process Now button, recent raw events table with status indicators
- Database migration `003_data_ingestion.sql` — raw_event, contact, event tables with indexes and RLS policies, Shopify columns on tenant
- Proxy matcher updated to exclude `/api/` and `/auth/shopify` routes from auth middleware
- Tested end-to-end: Shopify OAuth → historical import (3 customers) → process (3 contacts created, 3 canonical events) → idempotent re-import (0 duplicates inserted)

**Agent-Ready Internal API Refactor** — DONE

- Extracted business logic from server actions into `lib/api/` layer callable by both visual UI and chat agent tools
- `lib/api/data.ts` — `runEventProcessing()`, `runHistoricalImport()`, `getPipelineStats()` — pure functions taking (admin, tenantId)
- `lib/api/shopify.ts` — `getShopifyStatus()`, `disconnectShopifyStore()` — pure functions
- `lib/auth/context.ts` — `resolveAuthContext()` helper for server actions (cookie-based auth + tenant lookup)
- Server actions (`app/actions/data.ts`, `app/actions/shopify.ts`) slimmed to thin wrappers: resolve auth → call lib/api/ function
- Pattern: every new feature writes business logic in `lib/api/`, wraps in server action for UI, and is automatically a chat tool candidate
- Updated specs.md Section 7 with Internal API Layer documentation

**Phase 0: Auth + Multi-Tenancy** — DONE

- Supabase Auth integration (`@supabase/supabase-js` + `@supabase/ssr`)
- Three Supabase client utilities: browser (`lib/supabase/client.ts`), server (`lib/supabase/server.ts`), proxy (`lib/supabase/proxy.ts`)
- Route protection via `proxy.ts` — unauthenticated users redirected to `/login`, authenticated users redirected away from auth pages to `/chat`
- Database schema: `tenant`, `user_tenant`, `invite` tables with RLS policies (`supabase/migrations/001_auth_foundation.sql`)
- Auth callback route (`app/auth/callback/route.ts`) — handles OAuth redirect, PKCE code exchange, tenant existence check
- Login page (`/login`) — email/password + Google OAuth
- Signup page (`/signup`) — 3-step flow: (1) create account, (2) name your store → creates tenant + user_tenant, (3) connect Shopify stub
- Server Actions for login, signup, createTenant, loginWithGoogle, logout (`app/actions/auth.ts`)
- App layout fetches real user/tenant data from Supabase, passes to shell components
- Sidebar shows real user name, role, initial; logout dropdown menu
- Topbar shows real tenant name
- Onboarding stub page (`/onboarding`) with "Connect Shopify (Coming Soon)"
- `authInterrupts` experimental flag enabled in `next.config.ts`

**Prior: Shell UI** — DONE (pre-Phase 0)

- Root layout with Google Fonts (Sora, DM Sans, IBM Plex Mono)
- App shell: Sidebar (220px) + Topbar (56px) + main content area with dot grid background
- Design tokens in `globals.css` via Tailwind v4 `@theme inline`
- Placeholder pages: `/chat`, `/dashboard`, `/journeys`, `/audience`, `/data`, `/settings`
- `/` redirects to `/chat`

---

### Next Steps

**Phase 4: Visual UI + Dashboard** — UP NEXT

Phase 4 is now scoped as the MVP completion phase. Analytics and settings depth are **required** before design partner onboarding — without them, operators can't understand platform health or configure basic sending behavior. Everything below is in priority order.

#### Analytics (required for MVP)

1. **Dashboard overview page** (`/dashboard`) — replace placeholder with inline expandable cards:
   - **Health score** (0-100 composite: deliverability + engagement + revenue + compliance)
   - **Revenue attribution** — total attributed, breakdown by journey/channel, sparkline trend, comparison vs. prior period
   - **Active journeys summary** — count, enrolled, top performer
   - **Audience summary** — list size, growth rate, lifecycle distribution
   - **Deliverability card** — bounce rate, complaint rate, inbox placement rate
   - **Compliance card** — consent coverage %, blocked messages count, regulation pass/fail badges
   - Each card has [Ask AI] that opens chat with context pre-filled
2. **Journey analytics on canvas** — per-node open/click/conversion rate badges on action nodes. Journey-level stats bar: enrolled, completed, exited, conversion rate, revenue attributed.
3. **Experiments/A/B card** — surface active tests and declared winners on dashboard. [Apply Winner] inline action.

#### Settings (required for MVP)

4. **Email settings** (`/settings/email`) — sender name, reply-to address, physical address (CAN-SPAM), DNS status panel (SPF/DKIM/DMARC with verify buttons and fix instructions inline).
5. **Brand settings** (`/settings/brand`) — logo upload (to Supabase Storage), brand color palette (auto-detected from Shopify store on first connect, editable), tone slider (formal ↔ casual), brand guidelines doc upload. Live sample email preview that re-renders as settings change.
6. **Channels settings** (`/settings/channels`) — toggle Email (always on), SMS (Twilio credentials), WhatsApp (future). Frequency caps: max emails/week, max SMS/week sliders with "AI-recommended" default markers. Quiet hours (timezone-aware time range).
7. **Team settings** (`/settings/team`) — invite members by email with role selector (admin/viewer). Pending invites list with resend/revoke. Active members list with role badges. Role change with confirmation.
8. **Automation settings** (`/settings/automation`) — max discount % for win-back flows, auto-suppress threshold (engagement score floor), A/B test minimum sample size.

#### Polish (needed for a coherent product)

9. **Chat companion panel** — when navigating to Journeys/Audience/Content/Data, chat collapses to a 350px companion panel on the right. Context-aware prompt suggestions based on current page. "Expand" returns to full-width chat.
10. **Command palette (Cmd+K)** — Linear-style quick actions: search segments/journeys/contacts, or type commands ("pause abandoned cart", "show revenue").

**Other items that could be tackled in parallel:**
- SMS/Push delivery — Twilio integration (currently marks non-email channels as "failed" with "not supported yet")
- Proactive alerts — anomaly detection job (bounce rate spike, complaint rate > 0.1%) that queues an alert message in chat so user sees it on next login
- Per-contact send history — viewable timeline on contact detail page (already has events, needs message rows surfaced)

---

## Phase Roadmap

Phase 0 — Foundation ✅
Auth + multi-tenancy. Supabase Auth with Google OAuth and email/password. Tenant creation on signup. user_tenant junction table with roles. RLS policies. App shell.

Phase 1 — Data Pipe ✅
Shopify OAuth, webhooks, ingestion pipeline (normalizer → identity resolution → contact/event creation), historical import. Agent-ready internal API refactor (`lib/api/` pattern). Identity-aware canonical events (customer.created only for genuinely new contacts).

Phase 1.5 — Segments & Audience ✅
Segment table + rule evaluator + CRUD API + Audience page UI + engagement scoring.

Phase 3 — Chat Interface ✅
Vercel AI SDK v4 `useChat` + `streamText` + typed tools wrapping `lib/api/` functions. Gemini 2.5 Flash via `@ai-sdk/google`. DB-backed conversation persistence. Dynamic sidebar with recent chats + delete. Suggestion chips. Multi-step tool calling via `stopWhen: stepCountIs(5)`.

Content Studio ✅
Content template CRUD (email/SMS/push). MJML code editor with live preview. SMS composer with phone mockup. Push composer with iOS/Android mockups. LiquidJS engine with custom filters + variable extraction. Personalization panel with categorized variables. AI content generation via Gemini Flash (generateObject). Chat tools for content CRUD + AI generation. Supabase Storage asset uploads with tenant isolation. Content library with unified grid (templates + images), channel filters, search.

Phase 2 — First Journey End-to-End ✅
Journey engine: event triggers, segment-based entry with scheduled sends, node state machine (trigger/action/wait/condition/split/exit), compliance checks, enrollment + advancement, decision logging. Visual canvas with React Flow (custom nodes, config panel, palette). SendGrid delivery worker: queue drain, Liquid rendering, MJML compilation, retry logic. SendGrid webhook handler for delivery/open/click/bounce tracking. Identity-aware event processing (customer.created only fires for genuinely new contacts). E2E verified with real email delivery.

Phase 4 — Visual UI + Analytics + Settings ← NEXT (MVP completion)
Dashboard overview (health score, revenue attribution, deliverability, compliance, A/B experiments). Journey analytics on canvas (per-node metrics). Settings: Email (sender config, DNS verification), Brand (logo, colors, tone), Channels (frequency caps, quiet hours), Team (invites, role management), Automation (discount caps, suppress thresholds). Chat companion panel + Cmd+K command palette.

Phase 5 — Scanner + Landing Page
Email compliance scanner at scan.gettrident.com. Marketing landing page at gettrident.com.

Phase 6 — Design Partners
Onboard 3 Shopify stores (target: pet product brands $500K–$5M). Run live traffic through abandoned cart journey. Track human intervention rate. Collect feedback on chat UX, content quality, journey performance. Iterate.

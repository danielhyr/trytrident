# Trident — UX Strategy

**Based on:** specs.md v0.1
**Created:** April 2026
**Updated:** April 2026
**Status:** Draft

---

## 1. North Star Vision

**Trident should feel like texting your best marketing person — one who never sleeps, never forgets a customer, and shows you the receipts.**

The north star is a platform where the e-commerce owner opens a single chat window, asks "how are we doing?" and gets a meaningful answer with real numbers — then says "let's fix that" and it's fixed. No screens to navigate, no flows to learn, no settings to hunt for.

The visual dashboard exists for the same reason a great assistant still hands you a printed summary: sometimes you want to see everything laid out, drill into details, or rearrange things with your hands. But you should never *need* to touch it to operate the platform.

### Success Looks Like

- A new customer sends their first message within 5 minutes of connecting Shopify
- 80%+ of daily interactions happen in chat, not the visual UI
- Customers describe the product as "I just tell it what I want" not "I set up my flows"
- Time-to-first-value < 24 hours (first journey live and sending)

---

## 2. Competitive Landscape

### Direct Competitors

| Product | Target | Interface Model | Strengths | UX Weaknesses |
|---|---|---|---|---|
| **Klaviyo** | SMB–Mid e-commerce | Complex GUI, 47+ screens | Deep Shopify integration, powerful segmentation, established brand | Steep learning curve (67% proficiency at 6 weeks). Solo founders spend weeks learning before first send. "Really shines only if you have someone actively managing it." |
| **Mailchimp** | SMB general | Simple drag-and-drop GUI | Easy onboarding (81% proficiency in week 1), generous free tier, 300+ templates | Weak e-commerce automation, limited segmentation, falls apart at scale |
| **Omnisend** | DTC under $50M | Balanced GUI | Multichannel out of box, affordable, easier than Klaviyo | Still a traditional GUI — just a simpler one. No AI execution. |
| **Braze** | Enterprise | Complex GUI + Canvas builder | Powerful journey orchestration, CDI, OfferFit acquisition | "Implementation usually needs developer help." Even basic journey updates "can feel like a project." Overkill for SMBs. |
| **Agencies** | All sizes | Email/Slack with your rep | Human judgment, strategic input | Slow (days for changes), expensive ($3-8K/mo), siloed knowledge, inconsistent quality |

### Gap Analysis

**Nobody in email/multichannel marketing has shipped a chat-first interface.** The market splits into:
- **Simple but dumb** (Mailchimp): Easy UI but no AI, no automation intelligence
- **Powerful but complex** (Klaviyo, Braze): Deep features behind weeks of learning curve
- **Human but slow** (Agencies): Good judgment but expensive and async

Trident occupies the empty quadrant: **powerful AND simple** — by making the AI the interface, not just the engine.

### Indirect Inspiration

| Product | What to Learn |
|---|---|
| **ChatGPT / Claude** | Chat-as-primary-interface paradigm. Inline rich content (code blocks, tables, images). Conversational state management. |
| **Linear** | Command palette (Cmd+K) as power-user accelerator. Clean, minimal dashboard. Keyboard-first interactions. |
| **Vercel** | Deploy-and-forget simplicity. Show outcomes, hide infrastructure. Progressive disclosure of complexity. |
| **Superhuman** | Command palette + keyboard shortcuts for speed. Minimal chrome. Split-pane layout. |

---

## 3. Complete Page Map & UX Flows

Every page in the Trident ecosystem, organized by domain. Each page includes its purpose, what the user sees, what they can do, and how it connects to every other page.

### 3.0 Global Shell (Persistent Across All App Pages)

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (56px)                                                 │
│  [Trident logo]  Tenant name  ·  Health: ●92  ·  [?]  ·  [⚙]  │
└─────────────────────────────────────────────────────────────────┘
┌────────┬────────────────────────────────────────────────────────┐
│SIDEBAR │  MAIN CONTENT AREA                                     │
│        │                                                        │
│ [💬]   │  CHAT VIEW (full-width when active)                    │
│ [🔄]   │  ── or ──                                              │
│ [👥]   │  VISUAL VIEW + CHAT COMPANION PANEL                    │
│ [📝]   │  ┌──────────────────────┬─────────────────┐           │
│ [🔌]   │  │  Journeys/Audience/  │  Chat companion  │           │
│        │  │  Content/Data view   │  panel (350px)   │           │
│ [+New] │  │  (main content)      │  (never fully    │           │
│        │  │                      │   disappears)    │           │
│ Recent │  └──────────────────────┴─────────────────┘           │
│ chats  │                                                        │
│ ...    │                                                        │
│ [👤]   │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Elements:**
- **Top bar:** Logo, tenant name, health score badge (clickable → Dashboard), help chatbot trigger [?], settings gear [⚙]
- **Sidebar:** Five icon tabs at top — Chat, Journeys, Audience, Content, Data. Active tab highlighted. Notification dots on items with alerts (e.g., red dot on Journeys if a flow errored). Below tabs: New Chat button + recent chat sessions. Profile button pinned at bottom.
- **Layout behavior:** Chat is full-width by default. Clicking Journeys/Audience/Content/Data opens that view in the main area with chat collapsed to a companion side panel (350px). Chat never fully disappears. No hard mode toggle — navigation-driven layout shifts.
- **Command palette (⌘K):** Linear-style quick actions. Type to search: "Create segment", "Pause abandoned cart", "Show revenue", "Go to settings". Power-user accelerator.
- **Help chatbot:** Support questions handled via [?] icon in top bar — not a sidebar nav item.

**Flows OUT:**
- Sidebar tabs → Chat (full-width), Journeys, Audience, Content, Data views
- ⌘K → any action or page
- Health badge → Dashboard overview
- Settings gear → Settings page
- Chat companion panel → expand to full Chat view (click "Expand")

---

### 3.1 Pre-Auth Pages

#### PAGE: Marketing Site (`gettrident.com`)

**Purpose:** Convert visitors into signups. Separate app (Framer/Webflow or static Next.js), not part of the product.

| Section | Content | CTA |
|---|---|---|
| Hero | One-liner + "Replace your agency and your tools" | "Get Started" → Signup |
| How It Works | 3-step: Connect Shopify → AI sets up → You approve | "See It In Action" → Demo video |
| Pricing | Standard / Pro / Enterprise tiers | "Start Free Trial" → Signup |
| Scanner Promo | "Scan your emails for free" | → scan.gettrident.com |
| Social Proof | Design partner logos + testimonials (post-POC) | — |

**Flows OUT:**
- "Get Started" / "Start Free Trial" → Signup page
- "Scan Your Emails" → Compliance Scanner
- "Log In" (top nav) → Login page

---

#### PAGE: Signup (`app.gettrident.com/signup`)

**Purpose:** Create account. Minimal friction.

**Layout:** Centered card, single-column form.

| Step | What User Sees | What Happens |
|---|---|---|
| 1 | Email + password (or "Continue with Google") | Account created |
| 2 | "What's your store name?" + Shopify URL input | Tenant created |
| 3 | "Connect Shopify" → OAuth popup | Shopify access token stored, webhooks registered |

**Design notes:**
- 3 steps maximum, progress dots at top
- Step 3 (Shopify OAuth) is the critical gate — if they connect, they're onboarded
- After Shopify connects → redirect straight to Chat view where AI takes over onboarding
- No email verification wall before Shopify connect — verify async

**Edge cases:**
- **Shopify OAuth fails/cancelled:** Return to Step 3 with "Connection failed. Try again?" message. No data lost.
- **User signs up but never connects Shopify:** Account exists but chat shows: "Let's get started. Connect your Shopify store to begin." + Connect button. Nudge email at 24h and 72h.
- **User has no Shopify (WooCommerce, etc.):** Post-POC. For now: "Trident currently supports Shopify. We'll notify you when [platform] is available." + email capture.

**Flows OUT:**
- Shopify connected → Chat (onboarding conversation begins)
- "Already have an account?" → Login
- Close/abandon → marketing site
- OAuth fail → retry Step 3

---

#### PAGE: Login (`app.gettrident.com/login`)

**Purpose:** Return user authentication.

**Layout:** Centered card. Email + password. "Continue with Google". "Forgot password?" link.

**Flows OUT:**
- Successful login → Chat view (with proactive summary if available)
- "Forgot password?" → Password reset flow (email link)
- "Create account" → Signup

---

#### PAGE: Password Reset (`app.gettrident.com/reset`)

**Purpose:** Self-service password recovery.

**Flow:** Enter email → receive link → set new password → redirect to login.

---

### 3.2 Chat (Primary Interface)

#### PAGE: Chat View (`app.gettrident.com/chat`) — DEFAULT VIEW

**Purpose:** The execution layer. Primary interface for all interactions.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Message Stream (scrollable)                    │
│                                                 │
│  [AI] Good morning. Here's your overnight...    │
│  ┌─────────────────────────────────────────┐    │
│  │  HEALTH CARD                            │    │
│  │  Score: 92 ● Green                      │    │
│  │  Revenue: $1,240 this week (+12%)       │    │
│  │  Sends: 847  Opens: 43%  Clicks: 8.2%  │    │
│  │  [View Dashboard →]                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [AI] Your abandoned cart flow recovered $340.  │
│  ┌─────────────────────────────────────────┐    │
│  │  REVENUE CARD                           │    │
│  │  Abandoned Cart: $340 (12 conversions)  │    │
│  │  Post-Purchase:  $210 (8 conversions)   │    │
│  │  Welcome:        $95  (3 conversions)   │    │
│  │  [View Full Report →]                   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [You] Create a segment of customers who        │
│        bought twice but haven't ordered in 45d  │
│                                                 │
│  [AI] Here's the segment I'd create:            │
│  ┌─────────────────────────────────────────┐    │
│  │  SEGMENT PREVIEW CARD                   │    │
│  │  Name: "Repeat Buyers - 45d Lapsed"     │    │
│  │  Rule: orders >= 2 AND last_order >45d  │    │
│  │  Matches: 127 contacts                  │    │
│  │  [Confirm & Create]  [Edit Rule]        │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Suggested prompt chips when idle]              │
│  "How's my abandoned cart doing?"               │
│  "Show me this week's revenue"                  │
│  "What should I focus on?"                      │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  [Send ↑]  │
│  │  Type a message...              │             │
│  └─────────────────────────────────┘             │
└──────────────────────────────────────────────────┘
```

**States:**

| State | What User Sees |
|---|---|
| **First visit (onboarding)** | AI drives the conversation: data analysis → segment suggestions → journey recommendations → brand setup → DNS instructions |
| **Returning (morning)** | Proactive summary card waiting: health score, overnight revenue, alerts, wins |
| **Returning (no alerts)** | Last conversation continues. Suggested prompts appear after 5s idle. |
| **Returning (alert)** | Alert card pinned to top: "Bounce rate spiked to 2.3%. I've paused sends. [Investigate] [Dismiss]" |
| **Empty (new, pre-Shopify)** | "Let's get started. Connect your Shopify store to begin." + Connect button |

**Inline Card Types (rendered in stream):**

| Card | Trigger | Content | Actions |
|---|---|---|---|
| **Health Card** | Morning summary, "how are we doing?" | Score, revenue, engagement metrics, alerts | [View Dashboard →] |
| **Revenue Card** | "Show revenue", "what's working?" | Ranked journey revenue, sparklines, period comparison | [View Full Report →] |
| **Segment Preview** | "Create a segment of..." | Name, rule logic, matched count, lifecycle breakdown | [Confirm & Create] [Edit Rule] |
| **Segment Card** | "Show me my segments", segment created | Name, count, rule summary, status | [View Details →] [Edit] [Delete] |
| **Journey Preview** | AI suggests a journey | Name, steps diagram, projected impact, timing defaults | [Launch] [Customize] [Dismiss] |
| **Journey Card** | "How's my abandoned cart?", journey status | Name, status, enrolled count, conversion rate, revenue | [View Journey →] [Pause] [Resume] |
| **Alert Card** | Anomaly detected by system | Issue description, severity, root cause hypothesis, metrics | [Fix It] [Investigate] [Dismiss] |
| **Config Confirmation** | User changes a setting via chat | Old value → new value, affected journeys/segments | [Undo (30s)] |
| **Brand Preview** | Onboarding brand setup | Detected logo, colors, tone, sample email render | [Approve] [Adjust] |
| **DNS Instruction** | Onboarding email setup | Required DNS records with copy buttons, verification status | [Verify Now] [Skip for Later] |
| **Analysis Card** | "Why did X happen?" | Root cause summary, supporting metrics, trend chart, recommendation | [Apply Fix] [View Details →] |
| **Message Preview** | First send notification, content review | Email render (subject + body preview), recipient, status | [View Full Email] |
| **Experiment Card** | A/B test result ready | Winning variant, metrics comparison, statistical confidence | [Apply Winner] [Keep Testing] |

**Flows OUT from Chat:**
- [View Dashboard →] on Health Card → Dashboard overview
- [View Full Report →] on Revenue Card → Dashboard overview (Revenue card expanded)
- [View Details →] on Segment Card → Segment Detail page
- [View Journey →] on Journey Card → Journey Detail page
- [View Full Email] on Message Preview → (modal: full email render)
- Any card with [Edit] → opens relevant visual editor page
- Sidebar tab navigation → Journeys/Audience/Data view (chat collapses to companion panel)

---

### 3.3 Onboarding Flow (Within Chat)

Not a separate page — this is a **guided conversation sequence** within the Chat view on first login after Shopify connect.

```
PHASE 1: DATA ANALYSIS (automatic, 30-60 seconds)
│
│  AI: "Welcome to Trident! I'm analyzing your Shopify data now..."
│  [Progress card: Importing contacts... orders... products...]
│  AI: "Done. Here's what I found."
│  [Data Profile Card]
│  ┌──────────────────────────────────────────┐
│  │  YOUR STORE AT A GLANCE                  │
│  │  2,847 contacts · 1,203 customers        │
│  │  Avg order: $47.20 · Repeat rate: 22%    │
│  │  Active in last 30d: 340 (12%)           │
│  │  Lapsed (60d+ no order): 891 (31%)       │
│  └──────────────────────────────────────────┘
│
PHASE 2: SEGMENT SUGGESTIONS (AI-driven)
│
│  AI: "I found 3 segments worth targeting right away."
│  [Segment Card: Win-Back — 891 lapsed contacts]
│  [Segment Card: VIP — top 8%, 228 contacts, 40% of revenue]
│  [Segment Card: Welcome — 412 prospects, never purchased]
│  AI: "Want me to create all three, or start with one?"
│  User: "Create all three"
│  [Confirmation: 3 segments created ✓]
│
PHASE 3: JOURNEY RECOMMENDATION
│
│  AI: "Now let's get your first automation running. Based on your data,
│  I'd recommend starting with abandoned cart — you had 47 abandoned
│  carts last week, worth ~$2,200 in lost revenue."
│  [Journey Preview Card: Abandoned Cart]
│  ┌──────────────────────────────────────────┐
│  │  ABANDONED CART JOURNEY                  │
│  │  Email (1h) → Email (24h) → SMS (48h)   │
│  │  Estimated recovery: $300-500/week       │
│  │  [Launch Now]  [Customize First]         │
│  └──────────────────────────────────────────┘
│  User: "Launch now"
│  [Confirmation: Journey active ✓]
│
PHASE 4: BRAND SETUP
│
│  AI: "Great — your abandoned cart flow is live. Now let me match
│  your brand so emails look like they're from you, not a template."
│  AI: "I pulled your logo and colors from petstore.com."
│  [Brand Preview Card: logo, palette, tone sample]
│  ┌──────────────────────────────────────────┐
│  │  YOUR BRAND                              │
│  │  Logo: [detected logo]                   │
│  │  Colors: #2A4B8D · #F5A623 · #FFFFFF    │
│  │  Tone: Friendly, casual (matches site)   │
│  │  [Sample email preview]                  │
│  │  [Approve]  [Adjust Colors]  [Upload Logo]│
│  └──────────────────────────────────────────┘
│
PHASE 5: EMAIL AUTHENTICATION
│
│  AI: "Last step — email authentication. Add these DNS records so
│  your emails land in inboxes, not spam."
│  [DNS Instruction Card]
│  ┌──────────────────────────────────────────┐
│  │  DNS RECORDS NEEDED                      │
│  │  SPF:   v=spf1 include:... [Copy]       │
│  │  DKIM:  k=rsa; p=...       [Copy]       │
│  │  DMARC: v=DMARC1; p=...   [Copy]       │
│  │  ──────────────────────────              │
│  │  Where to add: Shopify domains / GoDaddy │
│  │  / Cloudflare (auto-detected)            │
│  │  [Verify Now]  [I'll Do This Later]      │
│  └──────────────────────────────────────────┘
│
PHASE 6: ONBOARDING COMPLETE
│
│  AI: "You're all set. Your abandoned cart flow is live and will send
│  its first email the next time someone abandons a cart. I'll let you
│  know when it happens."
│  AI: "Some things you can ask me anytime:"
│  [Suggested prompts: "How's my revenue?", "Create a new segment",
│   "What should I focus on?", "Pause all flows"]
│
└─ Normal chat operation begins
```

**Edge cases:**
- **User skips segments:** AI continues to journey recommendation. Segments can be created later.
- **User skips journey:** AI continues to brand setup. Journeys can be launched later via chat.
- **User skips brand setup:** System uses vertical defaults. AI reminds in 24h: "Your emails are using default branding. Want to customize?"
- **User skips DNS:** Sends still work (via shared SendGrid domain) but deliverability is degraded. AI reminds daily until DNS is verified.
- **User types a random question mid-onboarding:** AI answers the question, then resumes onboarding: "Now, back to setting up your first journey..."
- **Shopify has very few contacts (<50):** AI adjusts messaging: "You're early-stage — let's focus on welcome flow and growing your list" instead of segment suggestions.
- **User closes browser mid-onboarding:** On next login, AI picks up where they left off: "Welcome back! We were setting up your brand. Let's continue."

**Flows OUT:**
- [Customize First] on journey → Journey Detail page (visual step viewer)
- [Adjust Colors] / [Upload Logo] → Settings > Brand page
- "I'll Do This Later" → DNS card saved; reminder surfaces in 24h
- Onboarding complete → normal Chat state
- Any skip → next phase (all phases are independent, no hard dependencies)

---

### 3.4 Visual Dashboard Pages

All visual pages share the global shell. Chat is accessible as a slide-over panel from every page.

#### PAGE: Dashboard Overview (`app.gettrident.com/dashboard`)

**Purpose:** At-a-glance health check with inline expandable cards. Revenue, Deliverability, Compliance, and Experiments are NOT separate nav pages — they're inline cards within this overview, summoned by the chat, or expandable here. Answers: "Is everything OK?"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  HEALTH SCORE                                 [Ask AI ↗]│
│  ●92 — Everything looks good                            │
│  Deliverability: ●96  Engagement: ●88                   │
│  Revenue: ●94        Compliance: ●100                   │
├──────────────────────────┬──────────────────────────────┤
│  REVENUE THIS MONTH      │  ACTIVE JOURNEYS             │
│  $4,820 (+18% vs last)   │  5 active · 2,340 enrolled   │
│  ▂▃▅▆▇█▇▆▅▇ (sparkline)  │  Abandoned Cart: ●  running  │
│  [View Revenue →]        │  Post-Purchase:  ●  running  │
│                          │  Welcome:        ●  running  │
│                          │  Win-Back:       ●  running  │
│                          │  VIP:            ●  running  │
│                          │  [View Journeys →]           │
├──────────────────────────┼──────────────────────────────┤
│  AUDIENCE                │  RECENT ACTIVITY             │
│  2,847 contacts          │  • Cart email → Sarah M.     │
│  Growth: +47 this month  │    Opened → Clicked → $47    │
│  Active: 34%             │  • Win-back → James K.       │
│  At Risk: 18%            │    Opened (no click yet)     │
│  [View Audience →]       │  • VIP → Lisa R.             │
│                          │    Delivered                  │
├──────────────────────────┴──────────────────────────────┤
│  ALERTS (if any)                                        │
│  ⚠ Bounce rate elevated (1.8%) — [Investigate]          │
│  ℹ A/B test winner: Subject B (+14% opens) — [Apply]    │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click any metric card → navigates to its detail page
- Click [Ask AI ↗] on any card → opens chat slide-over with context pre-filled
- Click alert action → executes or navigates to relevant detail
- Health score sub-scores are clickable → scrolls to relevant section

**Flows OUT:**
- [View Revenue →] → expands Revenue card inline with detailed attribution
- [View Journeys →] → Journeys view (sidebar tab)
- [View Audience →] → Audience view (sidebar tab)
- [Investigate] on alert → Chat companion panel opens with context
- [Apply] on experiment → Confirmation modal → applies winner
- [Ask AI ↗] on any card → Chat companion panel
- Deliverability, Compliance, Experiments cards → expand inline (not separate pages)

---

#### PAGE: Revenue (inline sub-view within Dashboard, or summoned by chat)

**Note:** Not a separate nav page. Accessible as an expandable card within the Dashboard overview, or summoned inline by asking the chat about revenue.

**Purpose:** Detailed revenue attribution. Answers: "What's making money?"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  REVENUE ATTRIBUTION                      [This Month ▾]│
│                                                         │
│  Total Attributed: $4,820                               │
│  ┌───────────────────────────────────────┐              │
│  │  LINE CHART                           │              │
│  │  Daily attributed revenue (30 days)   │              │
│  │  With overlay: sends volume           │              │
│  └───────────────────────────────────────┘              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BY JOURNEY                                  [Ask AI ↗] │
│  ┌──────────────┬─────────┬────────┬────────┬────────┐ │
│  │ Journey      │ Revenue │ Conv.  │ Sends  │ ROI    │ │
│  ├──────────────┼─────────┼────────┼────────┼────────┤ │
│  │ Aband. Cart  │ $2,140  │ 3.4%   │ 847    │ ████▌  │ │
│  │ Post-Purchase│ $1,280  │ 2.1%   │ 623    │ ███▌   │ │
│  │ Win-Back     │ $890    │ 1.8%   │ 412    │ ██▌    │ │
│  │ Welcome      │ $340    │ 0.9%   │ 298    │ █▌     │ │
│  │ VIP          │ $170    │ 4.2%   │ 56     │ █████  │ │
│  └──────────────┴─────────┴────────┴────────┴────────┘ │
│                                                         │
├──────────────────────────┬──────────────────────────────┤
│  BY CHANNEL              │  VS. VERTICAL BENCHMARK      │
│  Email:  $4,230 (88%)    │  Your AOV:     $47.20        │
│  SMS:    $590  (12%)     │  Vertical avg: $42.00 ●above │
│  WhatsApp: $0  (0%)      │  Your conv:    2.4%          │
│                          │  Vertical avg: 1.9%  ●above  │
└──────────────────────────┴──────────────────────────────┘
```

**Interactions:**
- Date range picker (This Week / This Month / Last 30d / Custom)
- Click any journey row → Journey Detail page
- [Ask AI ↗] → Chat slide-over: "Why is [journey] revenue [up/down]?"
- Hover over chart data points → tooltip with daily breakdown

**Flows OUT:**
- Click journey row → Journey Detail page
- [Ask AI ↗] → Chat slide-over
- Breadcrumb: Dashboard > Revenue

---

#### PAGE: Journeys List (`app.gettrident.com/journeys`)

**Purpose:** Overview of all automated journeys. Answers: "What's running?"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  JOURNEYS                           [+ New Journey (AI)]│
│                                                         │
│  Active (5)                                             │
│  ┌──────────────┬────────┬─────────┬────────┬────────┐ │
│  │ Journey      │ Status │Enrolled │ Conv.  │Revenue │ │
│  ├──────────────┼────────┼─────────┼────────┼────────┤ │
│  │ Aband. Cart  │ ● Live │ 412     │ 3.4%   │$2,140  │ │
│  │ Post-Purchase│ ● Live │ 298     │ 2.1%   │$1,280  │ │
│  │ Welcome      │ ● Live │ 187     │ 0.9%   │$340    │ │
│  │ Win-Back     │ ● Live │ 891     │ 1.8%   │$890    │ │
│  │ VIP          │ ● Live │ 228     │ 4.2%   │$170    │ │
│  └──────────────┴────────┴─────────┴────────┴────────┘ │
│                                                         │
│  Paused (0)    Completed (0)    Draft (0)               │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click any journey row → Journey Detail / Canvas page
- [+ New Journey (AI)] → Chat companion panel: "Describe the journey you want to build" — AI generates the node graph on the canvas. User inspects, tweaks, launches.
- Status filter tabs: Active / Paused / Completed / Draft
- Bulk actions: Pause All, Resume All (confirmation required)

**Flows OUT:**
- Click row → Journey Detail / Canvas
- [+ New Journey] → Chat companion panel with journey creation context → new canvas
- Breadcrumb: Dashboard > Journeys

---

#### PAGE: Journey Detail / Canvas (`app.gettrident.com/journeys/:id`)

**Purpose:** Visual node canvas for a single journey. Inspect, build, and refine journey flows. The chat can generate the entire node graph from natural language — this canvas lets you see and refine it.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Journeys    ABANDONED CART          [● Live] [Pause] │
│                                                 [Ask AI]│
├─────────────────────────────────────────────────────────┤
│  PERFORMANCE SUMMARY                                    │
│  Enrolled: 412 · Completed: 287 · Exited: 98           │
│  Conversion: 3.4% · Revenue: $2,140 this month          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NODE CANVAS (drag-and-drop, zoomable)                  │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ TRIGGER  │───▶│ EMAIL 1  │───▶│ WAIT 23h │──...     │
│  │ cart.    │    │ "You     │    │          │          │
│  │abandoned │    │ forgot   │    │          │          │
│  │ (1h)    │    │ somethin"│    │          │          │
│  │          │    │          │    │          │          │
│  │          │    │ Open:41% │    │          │          │
│  │          │    │Click:8%  │    │          │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│                                                         │
│                          ┌──── CONDITION ────┐          │
│                          │ Opened Email 1?   │          │
│                       Yes│                   │No        │
│                          ▼                   ▼          │
│                  ┌──────────┐        ┌──────────┐       │
│                  │CROSS-SELL│        │  SMS     │       │
│                  │ EMAIL    │        │ "Your    │       │
│                  │ "Based   │        │ cart..." │       │
│                  │ on your..│        │          │       │
│                  │ Open:28% │        │Click:12% │       │
│                  └────┬─────┘        └────┬─────┘       │
│                       └──────┬────────────┘             │
│                              ▼                          │
│                       ┌──────────┐                      │
│                       │   EXIT   │                      │
│                       │ Complete │                      │
│                       │ or 7d    │                      │
│                       └──────────┘                      │
│                                                         │
│  NODE PALETTE (bottom or side panel):                   │
│  [+ Trigger] [+ Email] [+ SMS] [+ Wait]                │
│  [+ Condition] [+ Split] [+ Exit]                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ACTIVE A/B TESTS                                       │
│  Email 1 subject: A "You left something" vs             │
│                    B "Still thinking about it?"         │
│  Status: B winning (+14% opens). 187/200 sample.        │
│  [Apply Winner]  [Keep Testing]                         │
├─────────────────────────────────────────────────────────┤
│  RECENT ENROLLMENTS                           [View All]│
│  Sarah M. — Step 2 (Email 2) — sent 3h ago — opened    │
│  James K. — Step 1 (Email 1) — sent 1h ago — delivered  │
│  Lisa R.  — Step 3 (SMS)     — sent 12h ago — clicked   │
└─────────────────────────────────────────────────────────┘
```

**Node types:**
- **Trigger** — entry event (cart.abandoned, lifecycle_stage change, custom event)
- **Action** — send email, send SMS, send WhatsApp, update contact attribute
- **Wait** — time delay (hours, days) or wait-for-event
- **Condition** — if/else split based on contact attribute, event, or engagement
- **Split** — A/B test split (percentage-based)
- **Exit** — journey completion or timeout

**Interactions:**
- **Drag nodes** from palette to canvas, connect by dragging edges between ports
- **Click any node** → side panel with: content preview (pulls from Content library), metrics, variant performance, configuration
- **Chat generates canvas:** "Build a win-back flow: email day 1, wait 7d, if no open send SMS, if opened send cross-sell" → nodes appear connected on canvas
- [Pause] / [Resume] → Confirmation gate (soft confirm with undo)
- [Apply Winner] on A/B test → applies winning variant, closes test
- [View All] on enrollments → scrollable contact list with step/status
- [Ask AI] → Chat companion panel: "Tell me about this journey's performance"

**Flows OUT:**
- ← Journeys → back to Journeys list
- Click contact name → Audience > Contact Detail
- Click email node → opens content from Content library
- [Ask AI] → Chat companion panel
- Node click → side panel with configuration (in place, no navigation)

---

#### PAGE: Segments List (`app.gettrident.com/segments`)

**Purpose:** View all segments and their populations.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  SEGMENTS                         [+ New Segment (AI)]  │
│                                                         │
│  ┌────────────────┬──────────┬─────────┬──────────────┐│
│  │ Segment        │ Contacts │ Change  │ Status       ││
│  ├────────────────┼──────────┼─────────┼──────────────┤│
│  │ Win-Back       │ 891      │ +12%    │ ● Active     ││
│  │ VIP            │ 228      │ -3%     │ ● Active     ││
│  │ Welcome        │ 412      │ +8%     │ ● Active     ││
│  │ Repeat 45d     │ 127      │ new     │ ● Active     ││
│  │ At Risk        │ 513      │ +22%    │ ⚠ Growing    ││
│  │ Suppressed     │ 34       │ —       │ ● System     ││
│  └────────────────┴──────────┴─────────┴──────────────┘│
│                                                         │
│  AI INSIGHT: "Your At Risk segment grew 22% this month. │
│  Consider launching a re-engagement journey."  [Do It →]│
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click any segment row → Segment Detail page
- [+ New Segment (AI)] → Chat slide-over: "Describe the segment you want to create"
- [Do It →] on AI insight → Chat slide-over pre-filled with recommendation
- Sort columns by clicking headers
- Search/filter bar at top

**Flows OUT:**
- Click row → Segment Detail
- [+ New Segment] → Chat slide-over
- [Do It →] → Chat slide-over

---

#### PAGE: Segment Detail (`app.gettrident.com/segments/:id`)

**Purpose:** Inspect segment rule logic, population, and health.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Segments    WIN-BACK                       [Ask AI]  │
│                                           [Edit] [Delete]│
├─────────────────────────────────────────────────────────┤
│  RULE LOGIC                                             │
│  ┌─────────────────────────────────────────────┐        │
│  │  total_orders >= 1                          │        │
│  │  AND last_order_at < (now - 60 days)        │        │
│  │  AND engagement_score < 30                  │        │
│  │  AND email_consent = true                   │        │
│  └─────────────────────────────────────────────┘        │
│  (POC: displayed as readable rules. Post-POC: editable  │
│   visual rule builder)                                  │
│                                                         │
├──────────────────────────┬──────────────────────────────┤
│  POPULATION: 891         │  LIFECYCLE BREAKDOWN          │
│  Updated: 2h ago         │  Lapsed: 72%                 │
│  Change: +12% (30d)      │  At Risk: 28%                │
│  ▂▃▃▅▅▆▇▇██ (trend)      │                              │
├──────────────────────────┴──────────────────────────────┤
│  ACTIVE JOURNEYS USING THIS SEGMENT                     │
│  • Win-Back Journey (● Live) — 340 enrolled             │
├─────────────────────────────────────────────────────────┤
│  CONTACTS (sample)                            [View All]│
│  Sarah M. · sarah@... · Last order: 87d ago · Score: 15 │
│  James K. · james@... · Last order: 63d ago · Score: 22 │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- [Edit] → POC: opens Chat slide-over ("How would you like to change this segment?"). Post-POC: visual rule editor.
- [Delete] → Hard confirm modal: "This will remove the segment and exit 340 contacts from Win-Back Journey. Are you sure?"
- [View All] contacts → full scrollable/paginated contact list
- Click contact name → Contact Detail page
- [Ask AI] → "Tell me about this segment's health"

**Flows OUT:**
- ← Segments → Segments List
- Click journey name → Journey Detail
- Click contact → Contact Detail
- [Edit] → Chat slide-over
- [Delete] → Confirmation modal → back to Segments List

---

#### PAGE: Audience (`app.gettrident.com/audience`)

**Purpose:** Full contact list with search, filter, and lifecycle overview.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  AUDIENCE                                     [Ask AI]  │
│  2,847 contacts · +47 this month                        │
├─────────────────────────────────────────────────────────┤
│  LIFECYCLE DISTRIBUTION                                 │
│  ┌─────────────────────────────────────────────┐        │
│  │  [Prospect 14%] [Active 34%] [At Risk 18%] │        │
│  │  [VIP 8%] [Lapsed 22%] [Suppressed 4%]     │        │
│  └─────────────────────────────────────────────┘        │
│  (Clickable segments — filters the table below)         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Search contacts...]  [Filter: All ▾]  [Export CSV]    │
│  ┌──────────┬───────────┬───────┬────────┬────────────┐│
│  │ Name     │ Email     │ Score │ Stage  │ Last Order ││
│  ├──────────┼───────────┼───────┼────────┼────────────┤│
│  │ Sarah M. │ sarah@... │ 78    │ Active │ 3 days ago ││
│  │ James K. │ james@... │ 22    │ Lapsed │ 87 days ago││
│  │ Lisa R.  │ lisa@...  │ 95    │ VIP    │ 1 day ago  ││
│  │ ...      │           │       │        │            ││
│  └──────────┴───────────┴───────┴────────┴────────────┘│
│  Showing 1-50 of 2,847                    [← 1 2 3 →]  │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click lifecycle stage chip → filters table to that stage
- Search by name/email
- Sort by any column
- Click contact row → Contact Detail page
- [Export CSV] → downloads filtered list
- [Ask AI] → "Tell me about my audience health"

**Flows OUT:**
- Click contact → Contact Detail
- Click lifecycle chip → filters in place
- [Ask AI] → Chat slide-over
- Breadcrumb: Dashboard > Audience

---

#### PAGE: Contact Detail (`app.gettrident.com/audience/:id`)

**Purpose:** Full profile of a single contact. Everything Trident knows about them.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Audience    SARAH MARTINEZ                 [Ask AI]  │
│  sarah@petlover.com · Active · Score: 78                │
├──────────────────────────┬──────────────────────────────┤
│  PROFILE                 │  PURCHASE HISTORY             │
│  Phone: +1-555-0123      │  Orders: 4 · Total: $188.80  │
│  Jurisdiction: US (CA)   │  AOV: $47.20                 │
│  Email consent: ✓        │  Last order: 3 days ago      │
│  SMS consent: ✓          │  First order: 6 months ago   │
│  Source: Shopify          │  ──────────────              │
│                          │  • Apr 5 — $52.30 (kibble)   │
│                          │  • Mar 12 — $47.80 (toys)    │
│                          │  • Feb 1 — $41.20 (treats)   │
│                          │  • Dec 15 — $47.50 (bed)     │
├──────────────────────────┴──────────────────────────────┤
│  ENGAGEMENT TIMELINE                                    │
│  ┌─────────────────────────────────────────────┐        │
│  │  ■ Email opened (Apr 5)                     │        │
│  │  ■ Email clicked (Apr 5)                    │        │
│  │  ■ Order placed (Apr 5) — $52.30            │        │
│  │  □ Email delivered (Apr 3)                  │        │
│  │  ■ Email opened (Mar 28)                    │        │
│  │  □ Email delivered (Mar 28)                 │        │
│  └─────────────────────────────────────────────┘        │
├─────────────────────────────────────────────────────────┤
│  ACTIVE JOURNEYS                                        │
│  • Post-Purchase — Step 2 (review request) — sends in 4d│
│  SEGMENTS                                               │
│  • Active Customers · VIP (borderline, score 78)        │
├─────────────────────────────────────────────────────────┤
│  CONSENT RECORD                                         │
│  Email: Granted Apr 2025 via Shopify signup              │
│  SMS: Granted Jan 2026 via checkout opt-in               │
│  CCPA opt-out: No                                       │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- [Ask AI] → "Tell me about Sarah's engagement" / "Should I move her to VIP?"
- Click journey name → Journey Detail
- Click segment name → Segment Detail
- Engagement timeline is scrollable
- Consent record is read-only (audit log)

**Compliance actions (on contact):**
- [Export Data] → generates JSON/CSV of all data held for this contact (GDPR data portability, CCPA right-to-know). Downloads immediately.
- [Delete Contact] → hard confirm: "This will permanently erase all data for this contact (GDPR right-to-erasure). This cannot be undone." → removes from all segments, exits all journeys, purges from event store, logs to consent_audit_log.
- These actions are also available via chat: "Delete all data for sarah@petlover.com"

**Flows OUT:**
- ← Audience → Audience list
- Click journey → Journey Detail
- Click segment → Segment Detail
- [Ask AI] → Chat slide-over with contact context
- [Export Data] → file download (no navigation)
- [Delete Contact] → hard confirm → back to Audience list

---

#### PAGE: Content Library (`app.gettrident.com/content`)

**Purpose:** Browse, manage, and organize all content assets. Email templates, SMS templates, reusable content blocks, image assets. Journeys reference content from this library. The AI generates content into this library. Accessible via the Content icon tab in the sidebar.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  CONTENT                    [+ New Template (AI)] [Ask AI]│
├─────────────────────────────────────────────────────────┤
│  [All] [Email] [SMS] [Blocks] [Images] [Push ᵝ]        │
│                                                         │
│  [Search content...]  [Sort: Recent ▾]                  │
│                                                         │
│  EMAIL TEMPLATES                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │              │
│  │ │ prev │ │  │ │ prev │ │  │ │ prev │ │              │
│  │ │ iew  │ │  │ │ iew  │ │  │ │ iew  │ │              │
│  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │              │
│  │ Aband.   │  │ Welcome  │  │ Win-Back │              │
│  │ Cart #1  │  │ Series#1 │  │ Day 1    │              │
│  │ Used in: │  │ Used in: │  │ Used in: │              │
│  │ 1 jrny   │  │ 1 jrny   │  │ 1 jrny   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  SMS TEMPLATES                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │ "Your cart is waiting │  │ "Flash sale: 20% off │     │
│  │  — complete your..."  │  │  for 24h only..."    │     │
│  │ Used in: 1 journey    │  │ Used in: 0 journeys  │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  REUSABLE BLOCKS                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Header   │  │ Product  │  │ Footer   │              │
│  │ (brand)  │  │ Grid     │  │ (unsub)  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

**Content types:**

| Type | What It Contains | How It's Created |
|---|---|---|
| **Email Templates** | Full email: subject, preview text, body (MJML). Thumbnail preview. | AI-generated during journey creation, or manually via editor |
| **SMS Templates** | Short-form copy (160 char). | AI-generated, or manual |
| **Reusable Blocks** | Header, footer, product grid, CTA button — drag into email templates | Extracted from templates, or built in block editor |
| **Image Assets** | Product images, brand logos, banners. Uploaded or pulled from Shopify. | Upload, or auto-imported from Shopify product catalog |
| **Push Templates** | Push notification title + body. *Placeholder — delivery infrastructure not in POC.* | — |

**Interactions:**
- [+ New Template (AI)] → Chat companion panel: "What kind of content? Describe the email/SMS you need." AI generates into library.
- Click any template → opens content editor (email: MJML visual editor; SMS: text editor with character count; blocks: block editor)
- [Duplicate] on any template → creates copy for editing
- Filter tabs: All / Email / SMS / Blocks / Images / Push
- "Used in: N journeys" shows which journeys reference this content — prevents orphan deletion
- [Ask AI] → "Generate 3 subject line variants for my win-back email"

**Flows OUT:**
- Click template → Content Editor (in-page or modal)
- [+ New Template] → Chat companion panel
- [Ask AI] → Chat companion panel
- "Used in" journey link → Journey Detail / Canvas

---

#### PAGE: Data (`app.gettrident.com/data`)

**Purpose:** The "plumbing" view. Shows connected sources, sync status, data health, and DNS verification. Accessible via the Data icon tab in the sidebar.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  DATA                                         [Ask AI]  │
├─────────────────────────────────────────────────────────┤
│  CONNECTED SOURCES                                      │
│  ┌──────────────┬──────────┬─────────┬────────────────┐│
│  │ Source       │ Status   │ Last Sync│ Records       ││
│  ├──────────────┼──────────┼─────────┼────────────────┤│
│  │ Shopify      │ ● Active │ 2m ago  │ 2,847 contacts ││
│  │ SendGrid     │ ● Active │ 5m ago  │ Events flowing ││
│  │ Twilio       │ ○ Not set│ —       │ —              ││
│  └──────────────┴──────────┴─────────┴────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│  DNS VERIFICATION                                       │
│  SPF:   ● Verified                                      │
│  DKIM:  ● Verified                                      │
│  DMARC: ⚠ Not configured — [Fix Now]                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  DATA HEALTH                                            │
│  Contact completeness: 94% (email), 31% (phone)        │
│  Stale contacts (no activity 90d+): 412                 │
│  Webhook delivery rate: 99.7% (last 7d)                 │
│  Last reconciliation: 6h ago — ● OK                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  SYNC LOG (last 24h)                        [View All →]│
│  • Shopify: 47 orders, 12 new contacts, 3 cart events   │
│  • SendGrid: 847 delivery events, 43 opens, 12 clicks   │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- [Fix Now] on DNS → expands with DNS record instructions + copy buttons (same pattern as onboarding)
- Click source row → expands with connection details, reconnect option
- [Ask AI] → "Check my data health" / "Why aren't SMS events showing?"
- [View All →] → full sync event log

**Flows OUT:**
- [Fix Now] → inline DNS instructions
- [Ask AI] → Chat companion panel
- Source reconnect → OAuth flow (Shopify) or settings redirect

---

#### PAGE: Deliverability (inline sub-view within Dashboard, or summoned by chat)

**Note:** Not a separate nav page. Accessible as an expandable card within the Dashboard overview, or summoned inline by asking the chat about deliverability. Reinforces chat-first — the SMB owner asks about deliverability rather than navigating to a deliverability tab.

**Purpose:** Email health monitoring. Answers: "Are my emails landing in inboxes?"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  DELIVERABILITY                               [Ask AI]  │
├──────────────────────────┬──────────────────────────────┤
│  INBOX PLACEMENT         │  DOMAIN REPUTATION           │
│  94.2% (target: >95%)    │  ● Good (SPF ✓ DKIM ✓       │
│  ▅▆▆▇▇▇▆▅▇▇ (30d trend)  │   DMARC ✓)                  │
├──────────────────────────┼──────────────────────────────┤
│  BOUNCE RATE             │  COMPLAINT RATE              │
│  1.8% ⚠ (target: <2%)    │  0.04% ● (target: <0.1%)    │
│  ▂▂▃▃▂▂▃▅▇▅ (trending up) │  ▁▁▁▁▁▁▁▂▁▁ (stable)       │
├──────────────────────────┴──────────────────────────────┤
│  RECENT ISSUES                                          │
│  ⚠ Bounce rate trending up (1.2% → 1.8% over 7d)       │
│    Likely cause: 47 stale addresses from Q1 import      │
│    [Auto-clean list]  [Investigate]                     │
├─────────────────────────────────────────────────────────┤
│  SUPPRESSION LIST                                       │
│  Hard bounces: 12 · Complaints: 2 · Unsubs: 34         │
│  [View Suppressed Contacts]                             │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- [Auto-clean list] → Confirmation: "Remove 47 contacts with invalid emails?"
- [Investigate] → Chat slide-over with deliverability context
- [View Suppressed Contacts] → filtered Audience view (suppressed only)
- Trend charts: hover for daily values

**Flows OUT:**
- [Investigate] → Chat slide-over
- [View Suppressed Contacts] → Audience page (filtered)
- Breadcrumb: Dashboard > Deliverability

---

#### PAGE: Compliance (inline sub-view within Dashboard, or summoned by chat)

**Note:** Not a separate nav page. Accessible as an expandable card within the Dashboard overview, or summoned inline by asking the chat about compliance.

**Purpose:** Regulatory status and consent health. Answers: "Are we legally safe?"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  COMPLIANCE                                   [Ask AI]  │
├─────────────────────────────────────────────────────────┤
│  OVERALL STATUS: ● Compliant                            │
│                                                         │
│  REGULATION SCORECARD                                   │
│  ┌──────────┬──────────┬───────────┬──────────────────┐│
│  │ Regime   │ Status   │ Contacts  │ Requirements     ││
│  ├──────────┼──────────┼───────────┼──────────────────┤│
│  │ CAN-SPAM │ ● Pass   │ 2,140     │ ✓ Unsub link     ││
│  │          │          │           │ ✓ Physical addr  ││
│  │ CASL     │ ● Pass   │ 312       │ ✓ Express consent││
│  │ GDPR     │ ● Pass   │ 89        │ ✓ Lawful basis   ││
│  │ CCPA     │ ● Pass   │ 306       │ ✓ Opt-out honored││
│  └──────────┴──────────┴───────────┴──────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│  CONSENT COVERAGE                                       │
│  Email consent: 94% of contacts                         │
│  SMS consent: 31% of contacts                           │
│  Missing consent: 168 contacts (suppressed from sends)  │
├─────────────────────────────────────────────────────────┤
│  BLOCKED MESSAGES (last 30d)                            │
│  12 messages blocked                                    │
│  • 8 — CONSENT_REQUIRED (CASL contacts, no express)     │
│  • 3 — SUPPRESSED_CONTACT (on suppression list)         │
│  • 1 — UNSUB_LINK_MISSING (template error, fixed)       │
│  [View Details]                                         │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click regulation row → expands with full requirement checklist
- [View Details] on blocked messages → list with per-message reason
- Click "168 contacts" missing consent → Audience page filtered to contacts without consent
- [Ask AI] → "Explain my CASL compliance status"

**Flows OUT:**
- Click missing consent count → Audience (filtered: no consent)
- [View Details] → expanded blocked message list (in-page)
- [Ask AI] → Chat slide-over
- Breadcrumb: Dashboard > Compliance

---

#### PAGE: Experiments (inline sub-view within Dashboard, or summoned by chat)

**Note:** Not a separate nav page. Accessible as an expandable card within the Dashboard overview, or summoned inline by asking the chat about experiments or A/B tests.

**Purpose:** View active and completed A/B tests. System runs these automatically.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  EXPERIMENTS                                  [Ask AI]  │
├─────────────────────────────────────────────────────────┤
│  ACTIVE (3)                                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Abandoned Cart — Email 1 Subject Line            │   │
│  │ A: "You left something behind" — 41% open        │   │
│  │ B: "Still thinking about it?" — 47% open ★       │   │
│  │ Sample: 187/200 · Confidence: 94%                │   │
│  │ [Apply Winner]  [Keep Testing]                   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Win-Back — Discount: 10% vs 15%                  │   │
│  │ A: 10% off — 1.2% conv                           │   │
│  │ B: 15% off — 1.8% conv ★                         │   │
│  │ Sample: 98/200 · Confidence: 72% (still running) │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  COMPLETED (5)                              [View All →] │
│  • Post-Purchase review timing: 7d beat 14d (+22% resp) │
│  • Welcome subject: Emoji beat no-emoji (+8% opens)     │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- [Apply Winner] → Confirmation: "Apply variant B to all future sends?"
- [Keep Testing] → extends test with new minimum sample
- Click completed test → expands with full metrics
- [Ask AI] → "What experiments should I run next?"

**Flows OUT:**
- [Apply Winner] → confirmation in place
- Click journey name in test → Journey Detail
- [Ask AI] → Chat slide-over
- Breadcrumb: Dashboard > Experiments

---

### 3.5 Settings Pages

#### PAGE: Settings (`app.gettrident.com/settings`)

**Purpose:** All tenant configuration. Sub-pages via tabs or nested nav.

**Sub-pages:**

| Tab | Contents | Interactions |
|---|---|---|
| **Brand** | Logo upload, color palette (auto-detected + editable), tone slider (formal ↔ casual), brand guidelines doc upload | Live preview of sample email as settings change |
| **Email** | Sender name, reply-to address, physical address, DNS status (SPF/DKIM/DMARC with verify buttons) | [Verify DNS] triggers check, shows ✓ or ✗ with fix instructions |
| **Channels** | Enable/disable: Email ✓, SMS (toggle + Twilio setup), WhatsApp (toggle + Meta approval) | Toggle switches with confirmation for enable |
| **Frequency** | Max emails/week (slider), max SMS/week (slider), quiet hours (timezone-aware) | Sliders with "AI-recommended" default markers |
| **Automation** | Max discount % for win-back, auto-suppress threshold, A/B test sample size | Number inputs with sensible defaults shown |
| **Integrations** | Shopify (connected ✓ / reconnect), future: WooCommerce, Stripe, GA4 | [Reconnect] [Disconnect] with hard confirm |
| **Team** | Invite members via email, role management (owner/admin/viewer). Viewer role can query chat for data but chat won't execute actions — responds with info but says "you'll need an admin to make this change." | Invite form, role selector, pending invites list, active members list with role badges |
| **Billing** | Plan (Standard/Pro/Enterprise), payment method, invoice history | Stripe customer portal embed |
| **API Keys** | (Post-POC) API key generation for programmatic access | [Generate Key] [Revoke] |

**Flows OUT:**
- Any setting change → saves immediately (no "Save" button), shows toast confirmation
- DNS issues → links to DNS Instruction card pattern from onboarding
- Shopify disconnect → hard confirm → back to reconnect state

---

### 3.6 Compliance Scanner (Separate App)

#### PAGE: Scanner Home (`scan.gettrident.com`)

**Purpose:** Lead magnet entry point. No auth required.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Trident logo]              [Log in to Trident →]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│           Scan Your Email for Compliance                │
│           & Deliverability Issues                       │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │                                             │        │
│  │  Paste your email HTML here...              │        │
│  │                                             │        │
│  │                                             │        │
│  └─────────────────────────────────────────────┘        │
│                          [Scan Now →]                   │
│                                                         │
│  Or enter your domain to check DNS authentication:      │
│  ┌──────────────────────────┐                           │
│  │  yourdomain.com          │  [Check DNS]              │
│  └──────────────────────────┘                           │
│                                                         │
│  Free. No signup required. Results in seconds.          │
└─────────────────────────────────────────────────────────┘
```

**Flows OUT:**
- [Scan Now →] → Scanner Results page
- [Check DNS] → Scanner Results page (DNS-only scan)
- [Log in to Trident →] → app.gettrident.com/login

---

#### PAGE: Scanner Results (`scan.gettrident.com/results/:id`)

**Purpose:** Show scan results. Email-gate the full report.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  YOUR EMAIL SCORE                                       │
│                                                         │
│              ┌───────┐                                  │
│              │  67   │  Needs Work                      │
│              │ /100  │                                  │
│              └───────┘                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  COMPLIANCE (18/25)                                     │
│  ✓ Unsubscribe link present                             │
│  ✗ Physical address missing — CRITICAL                  │
│  ✓ Sender identification clear                          │
│  ⚠ No CASL express consent language — if sending to CA  │
│                                                         │
│  DELIVERABILITY (22/35)                                 │
│  ✗ DMARC not configured — CRITICAL                      │
│  ✓ SPF record valid                                     │
│  ⚠ Image-to-text ratio high (70%) — may trigger spam    │
│  ✗ 3 spam trigger words detected                        │
│                                                         │
│  PERFORMANCE (27/40)                                    │
│  ✓ Mobile responsive                                    │
│  ⚠ Dark mode: 2 elements render poorly                  │
│  ✓ Load time acceptable (1.2s)                          │
│  ⚠ No alt text on 3 images — accessibility issue        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐        │
│  │  GET YOUR FULL REPORT                       │        │
│  │  Detailed fix recommendations + benchmarks  │        │
│  │                                             │        │
│  │  Email: [________________]  [Get Report →]  │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  "Trident fixes all of these automatically."            │
│  [Try Trident Free →]                                   │
│                                                         │
│  [← Scan Another Email]                                 │
└─────────────────────────────────────────────────────────┘
```

**Flows OUT:**
- [Get Report →] → email captured, full PDF/email report delivered
- [Try Trident Free →] → app.gettrident.com/signup
- Shareable URL (scan.gettrident.com/results/:id) for social sharing
- [Scan Another →] → back to Scanner Home

---

### 3.7 Complete Navigation Map

```
MARKETING SITE (gettrident.com)
├─ Hero → [Get Started] ──────────────────────────┐
├─ Pricing → [Start Trial] ───────────────────────┤
└─ Scanner CTA → scan.gettrident.com               │
                                                    │
SCANNER (scan.gettrident.com)                       │
├─ Scan Home → [Scan Now] → Results                 │
│  └─ Results → [Try Trident] ─────────────────────┤
│             → [Get Report] → email captured       │
│                                                   │
├───────────────────────────────────────────────────┘
│
▼
AUTH PAGES (app.gettrident.com)
├─ Signup → Connect Shopify → Chat (onboarding)
├─ Login → Chat (with proactive summary)
└─ Password Reset → Login

APP PAGES (app.gettrident.com) — requires auth

SIDEBAR: 5 icon tabs + Settings gear in header + Help chatbot in top bar

├─ ★ CHAT (/chat) ←── DEFAULT VIEW (full-width)
│  ├─ [View Dashboard →] ───→ Dashboard overview
│  ├─ [View Journey →] ────→ Journey Canvas
│  ├─ [View Segment →] ────→ Segment Detail
│  ├─ [View Contact →] ────→ Contact Detail
│  ├─ Inline cards: self-contained actions
│  ├─ "Build a journey" → generates node graph on canvas
│  └─ Suggested prompt chips: "How's my abandoned cart doing?",
│     "Show me this week's revenue", "What should I focus on?"
│
├─ JOURNEYS (/journeys) — chat collapses to companion panel
│  ├─ Journey row → Journey Canvas
│  └─ [+ New Journey] → Chat companion panel → generates node graph
│     │
│     └─ JOURNEY CANVAS (/journeys/:id)
│        ├─ Drag-and-drop node builder (trigger, action, wait, condition, split, exit)
│        ├─ Node click → side panel with config, content preview, metrics
│        ├─ Email/SMS nodes reference content from Content library
│        ├─ Contact name → Contact Detail
│        ├─ [Pause/Resume] → confirmation in place
│        └─ [Ask AI] → Chat companion panel
│
├─ AUDIENCE (/audience) — chat collapses to companion panel
│  ├─ Segments list + Contacts list
│  ├─ Contact row → Contact Detail
│  └─ Lifecycle chip → filter in place
│     │
│     ├─ SEGMENT DETAIL (/segments/:id)
│     │  ├─ Journey name → Journey Canvas
│     │  ├─ Contact name → Contact Detail
│     │  ├─ [Edit] → Chat companion panel
│     │  └─ [Delete] → Hard confirm → Segments List
│     │
│     └─ CONTACT DETAIL (/audience/:id)
│        ├─ Journey name → Journey Canvas
│        ├─ Segment name → Segment Detail
│        └─ [Ask AI] → Chat companion panel
│
├─ CONTENT (/content) — chat collapses to companion panel
│  ├─ Content library: email templates, SMS templates, blocks, images
│  ├─ Filter tabs: All / Email / SMS / Blocks / Images / Push (placeholder)
│  ├─ [+ New Template (AI)] → Chat companion panel
│  ├─ Click template → Content Editor
│  ├─ "Used in: N journeys" → Journey Canvas
│  └─ [Ask AI] → Chat companion panel
│
├─ DATA (/data) — chat collapses to companion panel
│  ├─ Connected sources + sync status
│  ├─ DNS verification status
│  ├─ Data health metrics
│  └─ Sync log
│
├─ DASHBOARD (/dashboard) — inline sub-views, not separate pages
│  ├─ Health Score card → expand inline
│  ├─ Revenue card → expand inline (detailed attribution)
│  ├─ Audience card → navigate to Audience view
│  ├─ Deliverability card → expand inline
│  ├─ Compliance card → expand inline
│  ├─ Experiments card → expand inline, [Apply Winner]
│  ├─ Alert actions → Chat companion panel
│  └─ [Ask AI ↗] on any card → Chat companion panel
│
└─ SETTINGS (/settings) — via gear icon in header
   ├─ /settings/brand
   ├─ /settings/email
   ├─ /settings/channels
   ├─ /settings/frequency
   ├─ /settings/automation
   ├─ /settings/integrations
   ├─ /settings/team (invite members, role management)
   ├─ /settings/billing
   └─ /settings/api-keys (post-POC)
```

### 3.8 Cross-Cutting UX Patterns

**Pattern: Chat Companion Panel (Present on Every Non-Chat Page)**

When navigating to Journeys, Audience, Content, or Data, chat automatically collapses to a 350px companion panel on the right. Chat never fully disappears — it's always available. Also triggered by:
- ⌘K → type message
- [Ask AI ↗] button on any card/section

The companion panel inherits context from the current page:
- On Journeys → "Ask about your journeys" / "Build a new journey"
- On Journey Canvas → "Ask about [Journey Name]" / "Add a condition node after step 2"
- On Content → "Generate a new email template" / "Write 3 subject line variants"
- On Contact Detail → "Ask about [Contact Name]"
- On Data → "Ask about your data health"

User can expand to full Chat view (click "Expand") or keep it as a companion while working in the visual view. No hard mode toggle — the layout shift is driven by navigation.

**Pattern: Toast Confirmations (All Settings Changes)**

Settings changes save immediately with a bottom-left toast:
```
┌──────────────────────────────┐
│ ✓ Max discount updated: 15%  │
│   [Undo]                     │
└──────────────────────────────┘
```
Toast auto-dismisses after 5s. [Undo] reverts the change.

**Pattern: Notifications (When User Is Not In The App)**

The proactive AI system generates alerts and insights even when the user isn't logged in. These surface through:
- **Email digest:** Daily or weekly summary email (configurable in Settings). Contains: health score, revenue attributed, alerts, AI recommendations. CTA: "Open Trident" → logs in to chat with summary waiting.
- **Critical alerts (email):** Immediate email for: deliverability crisis (complaint rate > 0.1%), Shopify connection lost, compliance violation detected. CTA: "Fix Now" → deep-links to relevant page.
- **Browser notifications (post-POC):** Optional push notifications for critical alerts.
- **In-app on return:** All proactive messages queue in chat. User sees them on next login, most recent first.

No SMS/WhatsApp notifications to the customer (the platform sends those to *their* customers, not to them). Email only.

**Pattern: Session Timeout / Re-auth**

Session expires after 7 days of inactivity. On return:
- Redirect to login
- After login → Chat view with proactive summary of everything that happened since last session
- "While you were away: 3 journeys ran, $2,140 attributed, 1 A/B test winner declared."

**Pattern: Empty States (Every List Page)**

When a list page has no data:
- Journeys (none active): "No journeys yet. Ask me to set one up." + [Open Chat →]
- Segments (none): "I can create segments from your data. Let's start." + [Open Chat →]
- Revenue (no attributed revenue yet): "Once your first journey sends, revenue will appear here. Your abandoned cart flow is warming up."

Every empty state points back to chat as the resolution path.

**Pattern: Loading States**

- Chat messages: streaming text (character by character, like ChatGPT)
- Chat cards: skeleton shimmer while data loads, then slide in
- Dashboard metrics: skeleton placeholders → numbers fade in
- Long operations (data import, full analysis): progress card in chat with status updates

**Pattern: Error States**

- API errors: toast with retry option, never block the full page
- Chat intent failures: "I didn't understand that. Here's what I can help with:" + suggested prompts
- Shopify connection lost: persistent banner at top: "Shopify connection interrupted. [Reconnect]"
- Never show technical error messages to the user

---

## 4. Design Principles

### P1: Chat First, Dashboard Second

The chat is the front door for every interaction. When a user wants to do something, the first instinct should be to type, not to navigate. The visual dashboard is an escape hatch — reachable from any chat card, useful for deep dives, but never required for core operations.

**Test:** Can a user complete every core workflow (create segment, launch journey, check performance, change config) without ever touching the visual UI?

### P2: Show Outcomes, Hide Infrastructure

Customers don't care about DKIM records, MJML templates, or BullMQ queues. They care about: "Is it making me money?" and "Is it safe?" Every screen, card, and message should answer one of three questions: *Is it working? Is it safe? What should I know?*

**Test:** Remove every piece of infrastructure language from the UI. If the product still makes sense to a Shopify store owner with no marketing background, it passes.

### P3: AI Speaks First

The system should never wait for the user to ask a question it already knows the answer to. Proactive messages — morning summaries, anomaly alerts, milestone celebrations, next-step recommendations — build trust and reduce the cognitive load of "what should I be checking?"

**Test:** A customer who doesn't log in for 3 days should have a useful backlog of proactive insights waiting, not an empty inbox.

### P4: Progressive Disclosure of Complexity

Default to the simplest view. Reveal complexity only when the user asks for it. A segment card shows the name and count. Click it to see the rule logic. Click deeper to see the SQL. Three levels: glance → understand → inspect.

**Test:** The first screen a new user sees should have fewer than 5 interactive elements.

### P5: Confirm Before Consequence

Every action that changes state gets a proportional confirmation:
- Read-only → instant response
- Reversible → soft confirm with 30s undo
- Creative (new segment, new journey) → preview before save
- Destructive → hard confirm with explicit "Yes, delete"

**Test:** A user should never be surprised by what the system did. If they're surprised, the confirmation gate was missing or too weak.

### P6: Two Views, One Truth

Chat and visual UI are two lenses on the same data. An action in one instantly reflects in the other. There is never a state where the chat says one thing and the dashboard shows another.

**Test:** Create a segment in chat. Switch to visual UI. Segment is there. Edit it in visual UI. Switch back to chat. Chat acknowledges the change.

---

## 5. Prioritized Opportunities

### POC Priority Matrix

| Opportunity | Impact | Effort | Priority | Rationale |
|---|---|---|---|---|
| **Chat: Onboarding flow** | Critical | Medium | P0 | First impression defines retention. AI-guided onboarding from Shopify connect → first journey live in <20 min. |
| **Chat: Segment creation via NL** | High | Medium | P0 | The signature "create a segment of X" moment. This IS the demo. |
| **Chat: Journey creation → canvas** | High | High | P0 | "Build a win-back flow" → node graph populates on canvas. The differentiator: chat generates it, canvas lets you see and refine. |
| **Chat: Performance queries** | High | Low | P0 | "How's it going?" with inline revenue/health cards. Most frequent daily interaction. |
| **Chat: Journey control (pause/resume)** | High | Low | P0 | Basic operational control. Builds trust that chat is a real execution layer, not a toy. |
| **Visual: Journey canvas (node builder)** | High | High | P0 | Drag-and-drop nodes like n8n/Braze Canvas. Core visual complement to chat-driven creation. |
| **Visual: Content library** | Medium | Medium | P1 | Email templates, SMS templates, reusable blocks, images. Journeys reference content from here. AI generates into here. |
| **Visual: Dashboard overview** | Medium | Medium | P1 | Inline expandable cards (revenue, deliverability, compliance, experiments). Escape hatch for deep dives. |
| **Visual: Segment list** | Medium | Low | P1 | Table view of all segments with counts. Click-through from chat cards. |
| **Chat: Configuration changes** | Medium | Low | P1 | "Set max discount to 15%", "increase email frequency to 4/week". |
| **Chat: Proactive morning summary** | Medium | Low | P1 | AI speaks first. Daily health check + alerts + wins. |
| **Visual: Data view** | Medium | Low | P1 | Connected sources, sync status, DNS verification. The "plumbing" view. |
| **Chat: "Why?" analysis** | Medium | Medium | P2 | "Why did open rates drop?" requires root cause analysis. Impressive but not core. |
| **Visual: Segment rule editor** | Medium | Medium | P2 | Chat creation covers POC. Visual editing is post-POC. |
| **Chat: Multi-step actions** | Low | High | P3 | "Create a VIP segment AND launch a journey for them" in one message. Nice-to-have. |

### Build Order (POC)

```
Sprint 1-2: Foundation
├─ Auth + Shopify OAuth + webhook ingestion
├─ Core API: contacts, segments, journeys, messages, content
├─ PostgreSQL schema + decision logging + custom_attributes jsonb
└─ Chat UI shell (message input, streaming response, card rendering)

Sprint 3-4: Chat Core + Journey Canvas
├─ Intent parser (Gemini Flash) — classify + extract entities
├─ Segment creation from natural language
├─ Journey canvas: node builder (trigger, action, wait, condition, split, exit)
├─ Chat → canvas generation: NL description → node graph populates
├─ Performance query → inline revenue/health cards
└─ Confirmation gates (preview, undo, hard confirm)

Sprint 5-6: AI Engine + Delivery + Content Library
├─ Abandoned cart journey end-to-end (trigger → generate → compliance → send)
├─ Content generation (Gemini Flash) with brand context → saved to Content library
├─ Content library UI: email templates, SMS templates, reusable blocks, images
├─ Journey nodes reference content from library
├─ SendGrid integration + event webhooks (opens, clicks)
├─ Compliance pre-send check
└─ Decision logging on every path

Sprint 7-8: Visual Dashboard + Polish
├─ Dashboard overview with inline expandable cards (revenue, deliverability, compliance, experiments)
├─ Segment list with population counts
├─ Data view (connected sources, sync status, DNS verification)
├─ Chat: proactive morning summary
├─ Chat: journey pause/resume/status
└─ Onboarding wizard (Shopify connect → first journey in <20 min)

Sprint 9-10: Design Partner Launch
├─ Email compliance scanner (scan.gettrident.com)
├─ Bug fixes, edge cases from internal testing
├─ 3 design partners onboarded
└─ Feedback loop: track which features they use in chat vs. visual UI
```

---

## 6. UX Metrics

### North Star Metric

**Time-to-first-revenue-attributed-send** — How quickly does a new customer go from signup to their first marketing message that generates attributed revenue?

Target: < 48 hours (including domain warmup constraints)

### Leading Indicators

| Metric | What It Measures | Target | How to Measure |
|---|---|---|---|
| **Chat adoption rate** | % of daily active users who interact via chat (vs. visual UI only) | >80% | PostHog: track interaction source per session |
| **Onboarding completion rate** | % of signups who reach "first journey active" | >70% | Event tracking: shopify_connected → first_journey_activated |
| **Time-to-first-journey** | Minutes from Shopify connect to first journey live | <20 min | Timestamp diff: shopify_connected → journey_activated |
| **Chat intent success rate** | % of chat messages that result in successful action (not "I don't understand") | >90% | Log intent parser confidence + action completion |
| **Proactive engagement rate** | % of proactive AI messages that get a user response | >40% | Track response-to-proactive-message ratio |
| **Visual UI escape rate** | % of chat card click-throughs to visual dashboard | <30% | PostHog: click events on inline card "expand" actions |

### Lagging Indicators

| Metric | Target | Cadence |
|---|---|---|
| **30-day retention** | >85% | Monthly |
| **NPS** | >50 | Quarterly |
| **Support ticket volume per client** | <2/month | Monthly |
| **Revenue attributed per client** | >5x subscription cost | Monthly |

### Anti-Metrics (Watch But Don't Optimize For)

| Metric | Why It's Dangerous to Optimize |
|---|---|
| **Messages per session** | More messages could mean the AI is failing to understand, not that users love chatting |
| **Time in app** | Less time = more automated = better. Don't optimize for engagement theater |
| **Feature count** | More features ≠ better product. Optimize for outcomes, not surface area |

---

## 7. Design Brief

### What We're Building (POC)

A **chat-first marketing automation platform** for SMB e-commerce, where the AI chat is the primary execution interface and visual tools (journey canvas, content library, audience manager) serve as the secondary exploration and refinement layer. The first build proves four things:

1. **Chat-as-execution works** — Users can create segments, build journeys, check performance, and configure the platform entirely through natural language
2. **Chat → canvas generation works** — "Build a win-back flow" in chat populates a visual node graph that users can inspect and refine. The differentiator isn't skipping the visual builder — it's that chat generates it.
3. **AI-driven onboarding collapses time-to-value** — From Shopify connect to first live journey in under 20 minutes, guided by AI conversation
4. **The platform generates real revenue** — At least one journey (abandoned cart) running end-to-end with revenue attribution

### Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR                                                │
│  Logo · Tenant name · Health score · [?] Help · [⚙]    │
└─────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────┐
│  SIDEBAR     │  MAIN PANEL                              │
│              │                                          │
│  [💬] Chat   │  [Chat view — full-width, default]       │
│  [🔄] Jrnys  │   OR                                     │
│  [👥] Audnce │  [Visual view + chat companion panel]    │
│  [📝] Contnt │  ┌──────────────────┬───────────────┐    │
│  [🔌] Data   │  │  Visual content   │  Chat panel   │    │
│              │  │  (main)           │  (350px)      │    │
│  [+New Chat] │  └──────────────────┴───────────────┘    │
│  Recent...   │                                          │
│              │                                          │
│  [👤 Profile]│                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Chat is the default view on login (full-width).** Five icon tabs in the sidebar: Chat, Journeys, Audience, Content, Data. Clicking into any non-chat tab opens that view in the main area with chat collapsed to a companion panel — chat never fully disappears. Settings via gear icon in header, support via help chatbot in top bar.

### Chat UI Spec

| Element | Behavior |
|---|---|
| **Input bar** | Bottom of screen, always visible. Text input + optional attachment (for brand assets). Enter to send. |
| **Message stream** | Scrollable conversation history. User messages right-aligned, AI messages left-aligned. |
| **Inline cards** | Rendered between messages. Full-width. Interactive (clickable, expandable, has action buttons). |
| **Confirmation gates** | Appear as special cards: preview (with "Confirm" / "Edit" buttons), undo bar (30s countdown), hard confirm (red "Yes, delete" button). |
| **Typing indicator** | Streaming-style text appearance (like ChatGPT). For longer operations, show "Analyzing your data..." with progress. |
| **Suggested prompts** | On first login and when idle: "Try asking: 'How is my abandoned cart flow performing?'" |

### Visual Dashboard Spec (POC — Minimal)

| View | Components | Interactive? |
|---|---|---|
| **Dashboard home** | Health score (0-100), inline expandable cards: revenue, deliverability, compliance, experiments, audience | Clickable cards → expand inline. [Ask AI] on each card. |
| **Journeys** | List of active journeys with status, enrollment count, conversion rate. Journey detail: visual node canvas. | Click → journey canvas (drag-and-drop node builder). Chat generates node graphs from NL. |
| **Audience** | Segments list + contacts list. Lifecycle distribution. | Click → segment detail, contact detail |
| **Content** | Email templates, SMS templates, reusable blocks, image assets. Push placeholder. | Click → content editor. [+ New Template (AI)] via chat. "Used in: N journeys" links. |
| **Data** | Connected sources, sync status, DNS verification, data health, sync log | Source reconnect, DNS fix instructions |
| **Settings** | Brand voice, frequency caps, discount limits, channel toggles, team management, API keys | Editable forms |

### Visual Language

| Element | Direction |
|---|---|
| **Overall feel** | Clean, calm, professional. Not flashy. Think Linear, not Mailchimp. |
| **Color** | Neutral base (slate/gray). Accent color TBD with brand. Green/yellow/red for health status only. |
| **Typography** | Inter or similar sans-serif. Monospace for data/numbers. |
| **Cards** | Rounded corners, subtle shadow, white background. Consistent padding. No gradients. |
| **Charts** | Minimal — sparklines in cards, full charts only in dashboard views. Recharts or similar. |
| **Density** | Low density in chat (breathing room between messages/cards). Medium density in dashboard (information-rich but not cluttered). |
| **Motion** | Cards slide in when rendered. Undo countdown is a progress bar. No decorative animation. |

### Key UX Patterns

**Pattern 1: Chat → Card → Dashboard (Progressive Disclosure)**
```
User asks question → AI responds with inline card (summary) → Card has "View details" link → Opens full dashboard view
```

**Pattern 2: Dashboard → Chat (Ask About What You See)**
```
User browsing revenue dashboard → Clicks "Ask AI" on a metric → Chat opens with context: "Why is [metric] [trending]?"
```

**Pattern 3: Proactive AI → User Action**
```
AI surfaces alert/insight → Inline card with recommended action → User clicks "Do it" or asks follow-up → Action executed
```

**Pattern 4: Onboarding Conversation**
```
AI drives the conversation (not a form wizard):
"I see you connected PetSupplyStore. You have 2,847 contacts. Let me analyze your data..."
→ Data profile card
"I found 3 segments worth targeting. Here they are."
→ 3 segment cards with "Activate" buttons
"Which journey should we start with? I'd recommend abandoned cart — you had 47 abandoned carts last week."
→ Journey recommendation card with "Launch" button
```

### What We're NOT Building (POC)

- Visual segment rule editor (chat creation only)
- Push notification delivery infrastructure (placeholder in Content library UI only)
- Mobile app
- Webhook configuration UI
- Custom integration builder
- Auto-generated custom schemas (use jsonb overflow for non-standard data)

---

## Appendix: Competitive Research Sources

- [Klaviyo Reviews — G2](https://www.g2.com/products/klaviyo/reviews)
- [Klaviyo Review — Sender](https://www.sender.net/reviews/klaviyo/)
- [Klaviyo vs Mailchimp — Chase Dimond](https://www.chasedimond.com/omnisend-vs-klaviyo-vs-mailchimp)
- [Braze Reviews — G2](https://www.g2.com/products/braze/reviews)
- [Braze Review — Encharge](https://encharge.io/braze-review/)
- [Agent UX Patterns — HatchWorks](https://hatchworks.com/blog/ai-agents/agent-ux-patterns/)
- [Designing For Agentic AI — Smashing Magazine](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [Conversational UI Design Patterns](https://www.aiuxdesign.guide/patterns/conversational-ui)
- [Chatbot UI Examples — Eleken](https://www.eleken.co/blog-posts/chatbot-ui-examples)

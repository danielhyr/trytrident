Here's the open source reference map for each piece of Trident:

### Journey Builder (Visual Node Canvas)

**React Flow (xyflow)** — this is the one. Highly customizable React library for workflow builders, no-code apps, and more. Dragging nodes, zooming, panning, selecting multiple nodes, and adding/removing elements are all built-in. Nodes are just React components, works with Tailwind and plain CSS. This is what n8n uses under the hood. You'd build custom node types (Email, SMS, Wait, Condition, Split) as React components and let React Flow handle the canvas, connections, and interactions. They even have a Next.js workflow editor template you can start from.

- **Repo:** github.com/xyflow/xyflow
- **Use for:** The entire Journeys visual builder

### Full Platform Reference (Closest to what you're building)

**Laudspeaker** — open source alternative to Braze/Customer.io/Iterable. Visual journey builder from day one, event-triggered cross-channel messaging (email, SMS, push), segment builder, A/B testing, liquid templating. Built with TypeScript, Nest.js backend, React frontend, PostgreSQL, BullMQ — almost identical to your stack. YC-backed. This is the closest open source project to Trident minus the chat-first interface and the Intelligence Engine. Study their codebase for architecture patterns — how they handle journey state machines, event processing, multi-channel delivery.

- **Repo:** github.com/laudspeaker/laudspeaker
- **Use for:** Architecture reference for journey orchestration, event processing, segment evaluation, channel delivery. Don't fork it — study it.

### Email Template Builder (Content Tab)

**Easy Email Editor** — feature-rich open source SaaS email editor based on React and MJML, with drag-and-drop editing that generates compatible code. This is what you'd embed in the Content tab for visual email template editing. MJML handles responsive rendering across email clients.

- **Repo:** github.com/zalify/easy-email-editor
- **Use for:** Embeddable drag-and-drop email template builder in the Content tab

**Unlayer React Email Editor** — drag-and-drop email editor as a React.js wrapper component, described as the most powerful and developer-friendly visual email builder for your app. More polished than Easy Email, has a free tier for low volume.

- **Repo:** github.com/unlayer/react-email-editor
- **Use for:** Alternative to Easy Email if you want something more polished out of the box

**MJML** — markup language that abstracts the complexity of responsive HTML email and automatically generates it. Open source, built in React. This is the rendering layer regardless of which visual editor you pick. Write MJML, compile to responsive HTML that works in every email client.

- **Repo:** github.com/mjmlio/mjml
- **Use for:** Email template rendering engine under whichever visual editor you choose

### Email Sending Infrastructure

**EmailBuilder.js by Waypoint** — free and open source block-based email template builder with a more modern approach than Easy Email. Worth evaluating alongside the others.

- **Repo:** github.com/usewaypoint/email-builder-js

### Summary — What to Use Where

| Component | Open Source Reference | How to Use It |
|---|---|---|
| Journey visual canvas | **React Flow** (xyflow) | Build on top of it — custom node types for email, SMS, wait, condition, split |
| Full platform architecture | **Laudspeaker** | Study, don't fork — learn their journey state machine, event pipeline, channel abstraction |
| Email template editor | **Easy Email** or **Unlayer** | Embed in Content tab for drag-and-drop template building |
| Email rendering | **MJML** | Compile templates to responsive HTML for all email clients |
| Node workflow examples | **React Flow workflow editor template** | Starting point for the Journeys page layout |

The chat-first interface and the Intelligence Engine are the two things you won't find in open source — because nobody's built them. That's your differentiator. Everything else has solid open source foundations to build on.
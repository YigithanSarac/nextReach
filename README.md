# NextReach

NextReach is a 6-hour MVP for the internship PRD: a B2B SaaS landing page with a guided chatbot that qualifies inbound sales leads, plus an internal admin panel for reviewing and updating those leads.

The product goal is not to build a fully autonomous AI sales agent. The goal is to collect enough structured context for a sales team to prioritize follow-up without letting an LLM control the conversation flow.

## What The Product Solves

Sales teams often receive low-context inbound requests from landing pages. A plain contact form is too rigid, while a fully AI-driven chatbot is hard to control and can get stuck, hallucinate, or ask inconsistent questions.

This MVP solves that by:

- guiding visitors through a short qualification flow,
- extracting intent, company context, urgency, contact details, and need summary,
- saving the full transcript and extraction audit trail,
- creating a scored lead record for sales review,
- giving admins a lightweight list/detail workflow to triage leads.

## PRD Interpretation

The PRD intentionally leaves several product and engineering decisions open. I treated those as places to show product judgment rather than add complexity.

- Conversation design: implemented as a deterministic state machine so the sales qualification path is predictable and explainable.
- AI scope: limited to structured extraction and final lead summary support. AI does not decide the next chatbot step.
- Lead score: implemented with deterministic scoring and a breakdown instead of an opaque AI-only score.
- Admin workflow: kept to list, filters, detail drawer, status update, and notes because those are enough for MVP sales triage.
- Failure handling: AI failures, invalid JSON, schema mismatch, quota, timeout, and low-confidence extraction fall back to deterministic parsing.
- Authentication: intentionally deferred for the 6-hour MVP. Admin APIs currently assume an internal/demo environment.

## Tech Stack

- Next.js App Router: one codebase for landing page, API routes, and admin panel. This keeps the MVP small while still using production-style routing boundaries.
- TypeScript: makes chatbot states, API payloads, lead fields, and validation contracts explicit.
- Tailwind CSS: fast responsive UI work without custom CSS overhead.
- shadcn-style components: gives a clean B2B SaaS UI foundation while keeping components locally editable.
- Supabase Postgres: managed relational storage for sessions, messages, leads, and admin notes.
- Supabase SSR/client helpers: separates browser-safe publishable access from server-only service role operations.
- Zod: validates API requests and AI responses before data enters the state machine or database.
- Gemini API: used for structured extraction and summary support only.

Alternatives considered:

- Prisma: useful for larger schema-heavy apps, but too much setup for this 6-hour MVP.
- NextAuth/Auth.js: important for production admin access, but authentication was not core to proving the PRD flow.
- Fully AI-driven chatbot: faster to prototype, but harder to defend because the PRD requires reliable flow control and graceful recovery.
- Separate backend service: unnecessary for the MVP; Next.js route handlers are enough for this scope.

## Architecture

Main surfaces:

- Landing page: presents the B2B SaaS product and opens the chatbot launcher.
- Chatbot UI: starts a session, sends messages, renders bot/user/system states, and handles recoverable errors.
- Backend API: validates requests, persists messages, calls AI extraction safely, runs the state machine, and creates leads.
- Database: stores sessions, transcript messages, extraction metadata, final leads, scoring, and admin notes.
- AI service: returns structured extraction and final summary when available.
- Admin panel: lists leads, shows detail/transcript/extraction data, and updates status/notes.

Data flow:

1. Visitor opens chatbot on the landing page.
2. `POST /api/chat/sessions` creates a `chat_sessions` row and returns the first bot message.
3. `POST /api/chat/messages` stores the user message, calls Gemini extraction with timeout protection, falls back if needed, runs the deterministic state machine, stores the bot reply, and updates the session.
4. When the state reaches `COMPLETE`, the API creates a `leads` row with score, summary, extracted fields, transcript linkage, and flags.
5. Admin panel reads leads through `GET /api/admin/leads`.
6. Admin detail reads a lead plus transcript through `GET /api/admin/leads/:id`.
7. Admin status/notes updates use `PATCH /api/admin/leads/:id`.

## AI vs Deterministic Logic

The chatbot flow is controlled by code, not by AI.

Deterministic:

- chatbot step enum and switch-based state machine,
- next step decision,
- spam guard,
- refusal/skip handling,
- invalid email handling,
- fallback extraction helpers,
- lead quality score and scoring breakdown,
- API validation and error responses.

AI-assisted:

- extracting structured fields from a visitor message,
- detecting likely intent and urgency when phrasing is flexible,
- generating final lead summary support.

Reasoning: sales qualification needs predictable behavior. AI is useful for language understanding, but the business process should remain auditable and testable.

## Database

The Supabase schema lives in:

```txt
supabase/migrations/20260625000000_initial_schema.sql
```

Tables:

- `chat_sessions`: current step, status, collected fields, spam score, flags, and metadata.
- `chat_messages`: transcript, sender, step, AI extraction payload, confidence, extraction status, and flags.
- `leads`: final sales record, score, quality, intent, urgency, contact/company fields, summary, extracted fields, scoring breakdown, spam flags, source, status, and notes.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Run the Supabase SQL migration manually in the Supabase SQL editor or with the Supabase CLI:

```txt
supabase/migrations/20260625000000_initial_schema.sql
```

Start the app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
http://localhost:3000/admin
```

## Demo URLs

After deployment, use:

```txt
https://next-reach-eta.vercel.app
https://next-reach-eta.vercel.app/admin
```

The public landing page is at `/`. The internal lead review panel is at `/admin`.

Build and lint:

```bash
npm run lint
npm run build
```

Security note: `SUPABASE_SERVICE_ROLE_KEY` must only be used in server-side code. It must never be exposed to client components or browser JavaScript.

## API Summary

- `POST /api/chat/sessions`: starts a new chatbot session.
- `POST /api/chat/messages`: records a user message, runs extraction, transitions state, returns bot response, and creates a lead when complete.
- `GET /api/admin/leads`: returns a filterable lead list.
- `GET /api/admin/leads/:id`: returns lead detail with transcript and extraction data.
- `PATCH /api/admin/leads/:id`: updates lead status and notes.

## Manual QA Covered

Tested scenarios:

- pricing intent,
- demo intent,
- skipped answer/refusal,
- topic shift,
- meaningless answer,
- invalid email,
- spam warning through fast repeated messages,
- AI fallback,
- lead completion,
- admin detail,
- admin status and notes update.

The app was verified with:

```bash
npm run lint
npm run build
```

Gemini was also tested end-to-end through `POST /api/chat/messages`; successful AI extraction returns no `fallback_used` flag.

## Known Gaps

These were intentionally deferred to keep the MVP inside the 6-hour target:

- Admin authentication and role-based access control.
- Pagination UI for large lead volumes.
- Full Supabase RLS policy design.
- Production-grade rate limiting by IP/session.
- Automated integration tests for the full chatbot flow.
- Analytics events for funnel drop-off.
- Email/CRM handoff after lead creation.
- More advanced duplicate lead detection.

## Time Spent

Target: 6 hours.

Approximate allocation:

- Product and architecture decisions: 45 minutes.
- Project setup, Supabase schema, domain types, validation: 60 minutes.
- Chatbot state machine, fallback extraction, scoring: 75 minutes.
- Gemini integration and failure-tolerant AI layer: 45 minutes.
- API routes and lead persistence: 75 minutes.
- Landing page, chatbot UI, admin panel: 90 minutes.
- Responsive polish, manual QA, README: 30 minutes.

Total: about 6 hours.

# Tello — Early Access Launch Tracker

> This file is the shared source of truth for Phase 4 progress.
> Update it (and the corresponding item in CLAUDE.md) whenever a task is completed.
> Consult this at the start of every session before doing any work.

---

## Phase A — Pre-Work (do before anything else)

### A1. Security — Credential Protection
- [x] Verify `.env.local` is covered by `*.local` in `.gitignore`
- [x] Add `.mcp.json` to `.gitignore`
- [x] Add `.claude/settings.local.json` to `.gitignore`
- [x] Confirmed via `git log` — `.mcp.json` was never committed (no history)

### A2. Critical Backups
- [ ] **Back up Ivy's system prompt** → `skills/tello-elevenlabs/ivy-system-prompt.md`
  - Manual: copy from ElevenLabs console (agent `agent_5201khb8ye2se6ta1vsxf6f4wsx6`)
  - Future: Use GitHub repo for EL system prompts to enable version tracking (noted in Notion Phase 4)
- [ ] **Export all 7 n8n workflows as JSON** → `n8n-backups/`
  - Manual: n8n.zach13.com → each workflow → ⋮ → Download
  - Files: `wf0-tello-retrieve-questions.json`, `wf1-form-submission.json`, `wf2-process-grading.json`, `wf3-polling-results.json`, `wf4-track-execution-duration.json`, `wf5-error-workflow.json`, `wf8-user-dashboard-data.json`, `ea-user-interest-data-collection.json`
  - Commit the folder to git after exporting

---

## Phase B — Early Access Gating (launch blocker)

### B1. Waitlist Form (Landing Page)
- [ ] Update `src/components/landing/WaitlistSection.tsx` to POST email directly to Supabase
- [ ] Show "You're on the waitlist! We'll be in touch." confirmation state

### B2. ~~n8n WF6 — Waitlist Submission Workflow~~ *(removed — Supabase is the final approach)*

### B3. Auth Page — Invite Token Gating
- [ ] Update `src/pages/Auth.tsx` to read `?invite=TOKEN` from URL
- [ ] Hide "Create Account" tab if no valid token; show waitlist message
- [ ] Show full sign-up form if valid token present
- [ ] Sign-in tab always visible (existing users unaffected)
- [ ] Token list stored in `VITE_INVITE_TOKENS` env var in Cloudflare Pages dashboard

### B4. n8n WF7 — Invite Email Sender
- [ ] Build in n8n UI (manual step)
  - Trigger: Manual webhook (`{ email, token }`)
  - Action: Send invite email with personalised sign-up link containing token

---

## Phase C — ElevenLabs Ivy Stabilisation (launch blocker)

### C1. Stress-Test Ivy
- [ ] Test all combinations: 3 durations × all job fields × Beginner difficulty
- [ ] Log issues in `skills/tello-elevenlabs/ivy-test-log.md`
- [ ] Fix system prompt / KB issues found

**Known EL evaluation sub-items to watch for during stress-test:**
- [ ] Agent fails to call `end_call` tool
- [ ] Agent fails to call `retrieve_questions` tool
- [ ] Agent ends call abruptly or prematurely without explanation
- [ ] Massive delay during `retrieve_questions` tool call (15–30s)
- [ ] Agent ends call shortly after asking user to take their time

### C2. Ivy Personality
- [x] Add distinct warmth, signature phrase, light humour to Ivy system prompt (EL console)
- [ ] Update backup: `skills/tello-elevenlabs/ivy-system-prompt.md`

### C3. Call Duration Guardrail
- [ ] Add client-side timer in `src/pages/Interview.tsx` that ends session ~2 min after interview duration elapses

### C5. WF0 — CV/JD 4-Scenario Question Routing *(completed 18 Mar 2026)*
- [x] Frontend: pass `cvExists`/`jdExists` booleans from `InterviewForm.tsx` → router state → `Interview.tsx` → EL dynamic variables (`cv_exists`, `jd_exists` as strings)
- [x] WF0: added `cv_exists`/`jd_exists` extraction in Extract Fields node
- [x] WF0: added "Is default flow?" IF node routing (TRUE = bank only, FALSE = get Master Row)
- [x] WF0: added Get Master Row GSheets node (filters by `SessionID`, reads CV/JD columns)
- [x] WF0: added Enrich with PRO data Edit Fields node (re-merges params after GSheets overwrites context)
- [x] WF0: updated Grouped Arrays Code node with fallback pool logic + `parseQ` helper
- **Pending:** WF1 backend logic to process CV binary + JD URL and write questions to Master Sheet columns

**CV/JD follow-up concerns:**
- [ ] Security — block malicious content uploaded via JD/CV fields
- [ ] Format of questions output to EL — can structure be improved?
- [ ] Loading screen if WF1 takes up to 12s for CV+JD processing (max webhook response time)
- [ ] Reduce Google API hits per run (currently high)
- [ ] CORS set to allow all — write documentation for this decision

- **Key gotcha:** IF node must use `$json.cv_exists` not `$json.body.cv_exists` (body wrapper only exists on raw Webhook output)

### C4. Update Intermediate + Advanced Agents
- [ ] Apply Ivy learnings to Int/Adv agents (only after C1 confirmed stable)

---

## Phase D — Landing Page Redesign

> **Note:** A separate Early Access LP exists at `tello-earlyaccess.zach13.com` (repo: `Tello-Early-Access-UserInterest-LP-ONLY`). Notion shows this page was drafted on 16th Mar. Sub-tasks below relate to that LP.

### D0. Separate Early Access LP (tello-earlyaccess.zach13.com)
- [ ] Confirm funnel flow with Sarmad
- [x] Build automation to collect user email addresses (saves to Supabase)
- [x] Mobile-optimised
- [x] Complete legal section: Privacy Policy + Terms of Service
  - [x] Add cookies consent checkbox on sign-up
  - [ ] Reconfirm support email on legal docs before launch (pending domain confirmation)
  - ~~Decide on Tello Ltd registration~~ — not proceeding

### Setup (main repo redesign)
- [ ] Create branch: `git checkout -b redesign/landing`
- [ ] Push to GitHub → Cloudflare Pages generates preview URL
- [ ] Note preview URL here once available: _______________

### D1. Redesign (on `redesign/landing` branch)
- [ ] Hero: Founding member framing
- [ ] CTA primary: "Request Early Access" → links to waitlist
- [ ] AnnouncementBanner: "Now accepting founding members — limited spots"
- [ ] PricingSection: Replace tiers with founding member offer
- [ ] WaitlistSection: Strengthen as primary conversion action
- [ ] Remove/defer ProgressTrackerSection (feature not yet built)
- [ ] Add onboarding tips section
- [ ] Add testimonial/feedback placeholder

### D2. Review + Merge
- [ ] Screenshot comparison (min 2 rounds) — preview vs tello.zach13.com
- [ ] Merge `redesign/landing` → `main` → auto-deploys

---

## Phase E — Remaining Frontend Tasks

### E1. Legal Pages
- [ ] Create `src/pages/Privacy.tsx`
- [ ] Create `src/pages/Terms.tsx`
- [ ] Add `/privacy` and `/terms` routes to `src/App.tsx`
- [ ] Link from `src/components/landing/Footer.tsx`

### E2. Form Onboarding Tips
- [ ] Add collapsible "Tips for your first interview" section to `src/pages/Index.tsx`

### E2b. New User Dashboard State (`src/pages/Index.tsx`)
- [ ] Show full dashboard layout for new users (same as returning users) — not a bare form
  - Stat cards: all present, values show 0 / "—"
  - Chart: visible but empty (no data lines), with a hint label e.g. "Your progress will appear here"
  - Welcome heading already done: "Welcome, [name]." vs "Welcome back, [name]."
  - Goal: early access user signs in for the first time and sees the full product shape, not a stripped form

### E3. In-App Feedback (Form Page) *(spec changed — form page only)*
- [x] Add feedback section to form page (`src/pages/Index.tsx`) — done 18 Mar 2026
- [x] Incentivise user: founding member framing + free access messaging

### E4. Security — Full Run *(target: 29–31st March 2026)*
- [ ] Run full security audit via Claude Code (credentials, env vars, webhook URLs, auth flows)
  - [ ] Frontend: no exposed API endpoints, credentials, or user info; user can't manipulate backend via frontend
  - [ ] n8n: all webhook endpoints require auth (only webpage can POST)
  - [ ] Supabase: RLS active; no user can see another's data or manipulate subscription tier/credits
- [ ] Guardrails — block malicious prompt injection via form submission
- [ ] Apply rate + IP limiting on all accounts (ref: raroque YT video)
- [ ] Migrate personal accounts (Google credentials, zach13.com domain) to Tello account
- [ ] Backup all Phase 4 work: n8n workflows, EL system prompts, Sheets data, frontend

### E5. Interview Failure Error Page
- [ ] Show a proper error page when the interview fails (instead of blank/incorrect grading)
  - Detect failure state in `src/pages/Results.tsx` (e.g. EL session error, WF2 never triggered)
  - Display a clear error message with retry/contact option

### E6. User Dashboard
- [x] Build user dashboard: display session history and score stats per user
  - n8n WF8 ("Tello v2 - 8. User Dashboard Data") queries Master Sheets by user email
  - Webhook: `https://n8n.zach13.com/webhook/45445649-f088-48e2-be5e-ac0ee4a57c23`
  - Displays: streak, sessions done, improvement, best score stat cards
  - Line chart with Overall + projection (dashed) and Breakdown (4 criteria) tabs
  - Implemented in `src/pages/Index.tsx`

### E7. Per-User Credit Cap *(partially done 20 Mar 2026)*

**Architecture:** Each early access user gets an allocated number of interview minutes (stored in Supabase `user_credits` table — columns: `user_id` UUID, `allocated` numeric, `used` numeric). WF8 reads the balance and returns it to the frontend. WF2 decrements `used` after each interview completes.

**Done:**
- [x] Supabase `user_credits` table created (columns: `user_id`, `allocated`, `used`)
- [x] WF8 updated: reads Supabase `user_credits` row by UUID, calculates `Remaining Credits = allocated - used` via Set node, returns `credits_remaining` in JSON payload
- [x] WF8 bug fixed: hardcoded email in GSheets filter replaced with `={{ $json.body.email }}`
- [x] Frontend `src/pages/Index.tsx`: fetches `credits_remaining` from WF8, displays colour-coded indicator in form card header (green ≥15 min, amber <15 min, red <5 min)
- [x] Frontend `src/components/InterviewForm.tsx`: button disabled + "Insufficient credits." inline message when `credits_remaining < 5`

**Pending:**
- [ ] WF2: after interview completes, increment `used` in Supabase `user_credits` by actual call duration (minutes)
- [ ] `user_credits` table identifiability — currently rows have only `user_id` UUID with no name or email, making it impossible to identify users when viewing the table directly. Add `email` column (or similar) so rows are human-readable for admin use.
  - Read duration from Master Sheet (WF4 writes it) or from EL post-call data
  - PATCH `user_credits` row for the user's UUID
- [ ] WF1: return 403 `{ error: "insufficient_credits" }` if remaining credits < 5 at session start (server-side guard, complementing client-side check)
- [x] Supabase RLS: ensure users can only read/write their own `user_credits` row

---

## Phase F — Infrastructure

### F1. n8n MCP Setup
- [ ] Export WF backups (Phase A2 — must be done first)
- [ ] Generate API key: n8n.zach13.com → Settings → API
- [ ] Add to `.mcp.json` (gitignored)

### F2. n8n Version Update
- [ ] Update n8n (only after F1 confirmed working)
- [ ] Verify all active workflows still function after update

### F3. Domain Purchase
- [ ] Buy `telloapp.ai` (Notion updated name — was `tellointerview.ai`)
  - Cloudflare: ~$80/2-year term (best value)
  - GoDaddy: £36 yr1, £119 yr2 (2-year = £155)
  - Namecheap: £69/year (2-year = £140)
- [ ] Update Cloudflare Pages custom domain
- [ ] Update Supabase allowed redirect URLs

---

## Phase G — Business / Pre-launch

- [ ] Figure out pricing — inbound and outbound (ElevenLabs, n8n, Supabase, Cloudflare costs)
- [ ] Calculate minimum paying customers/month to break even

---

## Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| A — Pre-Work | In progress | Security gitignore fix done; backups pending |
| B — Gating | In progress | B2 (WF6) removed — Supabase is final; B1 (WaitlistSection) + B3 + B4 remaining |
| C — Ivy | In progress | Personality (C2) + WF0 CV/JD routing (C5) done; stress-test + guardrail pending |
| D — Landing redesign | In progress | Early access LP live at tello-earlyaccess.zach13.com; main app redesign not started |
| E — Frontend tasks | In progress | E3 (feedback) + E6 (dashboard) + E7 (credit cap UI) done; E4 (security), E5 (error page), E7 WF2 decrement pending |
| F — Infrastructure | Not started | Blocked on Phase A backups |
| G — Business | Not started | Pricing research |

---

## Already Done (pre-tracker)
- [x] Full interview flow end-to-end (form → EL → grading → results)
- [x] Supabase auth connected to form
- [x] WF0 retrieves questions at start of conversation
- [x] QA workflow (WF4) measuring 3 delay metrics
- [x] Error workflow (WF5) with Telegram alerts on all 5 workflows
- [x] 5 EL evaluation criteria linked to Sheets
- [x] Fix "waiting for bye" bug — agent self-terminates
- [x] Results page error/timeout state fully implemented

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
- [ ] **Export all 7 n8n workflows as JSON** → `n8n-backups/`
  - Manual: n8n.zach13.com → each workflow → ⋮ → Download
  - Files: `wf0-retrieve-questions.json`, `wf1-form-submission.json`, `wf2-grading.json`, `wf3-retrieve-results.json`, `wf4-track-durations.json`, `wf5-error-handler.json`, `wf8-user-dashboard.json`
  - Commit the folder to git after exporting

---

## Phase B — Early Access Gating (launch blocker)

### B1. Waitlist Form (Landing Page)
- [ ] Update `src/components/landing/WaitlistSection.tsx` to POST email to n8n WF6 webhook
- [ ] Show "You're on the waitlist! We'll be in touch." confirmation state

### B2. n8n WF6 — Waitlist Submission Workflow
- [ ] Build in n8n UI (manual step)
  - Trigger: POST webhook
  - Action 1: Append email + timestamp to Google Sheets "Waitlist" tab
  - Action 2: Send Telegram alert ("New waitlist signup: {email}")

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

### C2. Ivy Personality
- [ ] Add distinct warmth, signature phrase, light humour to Ivy system prompt (EL console)
- [ ] Update backup: `skills/tello-elevenlabs/ivy-system-prompt.md`

### C3. Call Duration Guardrail
- [ ] Add client-side timer in `src/pages/Interview.tsx` that ends session ~2 min after interview duration elapses

### C4. Update Intermediate + Advanced Agents
- [ ] Apply Ivy learnings to Int/Adv agents (only after C1 confirmed stable)

---

## Phase D — Landing Page Redesign

### Setup
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

### E3. In-App Feedback (Results Page)
- [ ] Add star rating + text field + submit to `src/pages/Results.tsx`
- [ ] POST to new n8n webhook → logs to Google Sheets "Feedback" tab
- [ ] Show incentive message: "Share feedback = unlock 1 extra free interview"

### E4. Security — Full Run
- [ ] Run full security audit via Claude Code (credentials, env vars, webhook URLs, auth flows)

### E5. Interview Failure Error Page
- [ ] Show a proper error page when the interview fails (instead of blank/incorrect grading)
  - Detect failure state in `src/pages/Results.tsx` (e.g. EL session error, WF2 never triggered)
  - Display a clear error message with retry/contact option

### E6. User Dashboard
- [x] Build user dashboard: display session history and score stats per user
  - n8n WF8 ("Tello v2 - User Dashboard Data") queries Master Sheets by user email
  - Webhook: `https://n8n.zach13.com/webhook/45445649-f088-48e2-be5e-ac0ee4a57c23`
  - Displays: streak, sessions done, improvement, best score stat cards
  - Line chart with Overall + projection (dashed) and Breakdown (4 criteria) tabs
  - Implemented in `src/pages/Index.tsx`

---

## Phase F — Infrastructure

### F1. n8n MCP Setup
- [ ] Export WF backups (Phase A2 — must be done first)
- [ ] Generate API key: n8n.zach13.com → Settings → API
- [ ] Add to `.mcp.json` (gitignored)

### F2. n8n Version Update
- [ ] Update n8n (only after F1 confirmed working)
- [ ] Verify all 6 workflows still function after update

### F3. Domain Purchase
- [ ] Buy `tellointerview.ai` (£70/year)
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
| B — Gating | Not started | Blockers: B2+B4 are manual n8n builds |
| C — Ivy | Not started | Requires manual EL console work |
| D — Landing redesign | Not started | Branch strategy agreed |
| E — Frontend tasks | In progress | E6 (dashboard) done; E4 (security), E5 (error page) pending |
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

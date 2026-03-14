# CLAUDE.md — Tello Project Reference

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.
- **Check `EARLY-ACCESS.md`** (project root) at the start of every session — it is the source of truth for Phase 4 launch progress.
- **When a launch task is completed:** mark it `[x]` in `EARLY-ACCESS.md` AND update the corresponding item in the CLAUDE.md "Current Status" section below. Keep both files in sync.
- **Check Notion at the start of every session** — fetch the two pages below and compare against `EARLY-ACCESS.md`. If Notion contains new tasks or updates not yet in local docs, add them to `EARLY-ACCESS.md`. **Never modify Notion — all changes go to local files only.**
  - Technical Milestones: https://www.notion.so/86d6d8fd7f88828b807d0176092cbbbd
  - Technical: Timeline: https://www.notion.so/3096d8fd7f88826da221018f6c4bcbfb
- **Commit all changes to GitHub** after completing any task. Remote: `https://github.com/Zach-133/Tello-Early-Access.git` (branch: `main`). Push immediately after committing unless instructed otherwise.
- **For all frontend changes:** serve on `http://localhost:8080` first. Only push to GitHub once the user has reviewed and approved the result on localhost. Do not push frontend changes speculatively.
- **Use Puppeteer screenshots to self-correct:** after every frontend change, take a screenshot via `node "screenshot.mjs" http://localhost:8080`, read the PNG with the Read tool, inspect it visually, and fix any visible issues before presenting to the user. Repeat until no issues remain.

---

## Project Overview

**Tello** is an AI-powered mock interview web app for early access users. Users log in, configure an interview, conduct a live voice interview with an AI agent (ElevenLabs), and receive a detailed scored results page.

**Live domain:** tello.zach13.com
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
**Hosting:** Cloudflare Pages (auto-deploys from GitHub on push to main)
**Auth:** Supabase (email/password only)
**Backend:** n8n workflows via webhooks (self-hosted at n8n.zach13.com)
**Voice AI:** ElevenLabs SDK (`@elevenlabs/react`)
**Data store:** Google Sheets (primary operational store — NOT Supabase)

---

## System Architecture

```
User Browser
     │
     ├── / (Landing)          Public marketing page
     ├── /auth                Login / Sign up (Supabase)
     │
     └── [Protected]
          ├── /form            Interview setup form + user dashboard
          │     ├── POST ──► n8n WF1 (session creation) ──► Google Sheets
          │     └── POST ──► n8n WF8 (dashboard data) ──► Google Sheets
          │
          ├── /interview       Live ElevenLabs voice session
          │     └── EL SDK ──► Ivy / Int / Adv agent
          │                    │
          │                    ├── mid-interview ──► n8n WF0 (question retrieval)
          │                    └── post-interview ──► n8n WF2 (grading)
          │
          └── /results/:sessionId   Score display
                └── polls every 5s ──► n8n WF3 (retrieve results)
                                        └── n8n WF4 (log durations)

Any n8n failure ──► n8n WF5 (Telegram alert to developer)
```

---

## Route Map

| Path | Component | Auth | Purpose |
|------|-----------|------|---------|
| `/` | `Landing.tsx` | Public | Marketing landing page |
| `/auth` | `Auth.tsx` | Public | Login / sign up |
| `/form` | `Index.tsx` | Protected | Interview setup form |
| `/interview` | `Interview.tsx` | Protected | Live AI voice interview |
| `/results/:sessionId` | `Results.tsx` | Protected | Score & feedback display |

---

## External Service Integrations

### Supabase — Auth Only
- Email/password authentication
- No operational tables (no sessions, scores, or questions stored in Supabase)
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (set in Cloudflare Pages dashboard)
- Client: `src/lib/supabase.ts`
- Context: `src/context/AuthContext.tsx` — provides `user`, `loading`, `signIn`, `signUp`, `signOut`

### ElevenLabs — Voice AI
- SDK: `@elevenlabs/react`, `useConversation` hook in `src/pages/Interview.tsx`
- 3 agents by difficulty (hardcoded in `Interview.tsx:64-68`):
  - Beginner → `agent_5201khb8ye2se6ta1vsxf6f4wsx6` (Ivy — active development)
  - Intermediate → `agent_0101khb8tr92e3st3vbnjm3z0jwk` (pending Ivy stability)
  - Advanced → `agent_6501khb8vxzmeejsq3mga7tn8kdn` (pending Ivy stability)
- Dynamic variables sent at session start: `user_name`, `job_field`, `difficulty`, `duration`, `session_id`
- EL triggers n8n mid-interview (WF0) and post-interview (WF2) via built-in webhooks
- See skill: `skills/tello-elevenlabs/SKILL.md`

### n8n — Backend Automation
- Self-hosted at n8n.zach13.com
- **WF1 session creation:** `https://n8n.zach13.com/webhook/743697f7-3774-4876-b10d-775cbbb67613`
  - Called by: `src/components/InterviewForm.tsx` on form submit
  - Returns: `{ sessionId, name, duration, jobField, difficulty }`
- **WF3 results polling:** `https://n8n.zach13.com/webhook/276ad840-3dcb-4e2b-ac0f-30b1cb9f158f`
  - Called by: `src/pages/Results.tsx` every 5s (max 60 polls)
  - Returns: `{ status: 'processing' }` or `{ status: 'completed', finalScore, scores: {...} }`
- **WF8 user dashboard data:** `https://n8n.zach13.com/webhook/45445649-f088-48e2-be5e-ac0ee4a57c23`
  - Name in n8n: "Tello v2 - User Dashboard Data"
  - Called by: `src/pages/Index.tsx` on load (POST `{ email }`)
  - Returns: `{ sessions: Session[], stats: DashboardStats }` — queries Master Sheets by user email
  - Powers the performance chart and stat cards (streak, sessions, improvement, best score)
- See skill: `skills/tello-n8n/SKILL.md`

### Google Sheets — Primary Data Store
- Single "Master" sheet: 53 columns, one row per session
- Stores user prefs, Q&A pairs, scores, comments, QA notes, timing data, n8n execution IDs
- See skill: `skills/tello-data/SKILL.md`

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Router + providers |
| `src/context/AuthContext.tsx` | Auth state, signIn/signUp/signOut |
| `src/lib/supabase.ts` | Supabase client |
| `src/components/InterviewForm.tsx` | Form + WF1 webhook call |
| `src/pages/Interview.tsx` | EL SDK session management |
| `src/pages/Results.tsx` | WF3 polling + score display |
| `src/pages/Landing.tsx` | Marketing page |
| `src/components/landing/` | 12 landing page section components |
| `src/components/ScoreCard.tsx` | Individual score criterion card |
| `src/components/PerformanceOverview.tsx` | Comparative score chart |
| `src/components/AppHeader.tsx` | Shared header for app pages |
| `src/index.css` | Design system CSS variables + Tailwind utilities |
| `tailwind.config.ts` | Tailwind token extensions |

---

## Design System

**Fonts:** DM Serif Display (headings, `font-serif`) + Inter (body)

**Color tokens** (use these — never raw Tailwind palette):
| Token | Role |
|-------|------|
| `primary` | Deep brown — main brand |
| `coral` / `coral-dark` / `coral-light` | CTA, accents |
| `teal` / `teal-light` | Secondary accent |
| `gold` / `gold-light` | Achievements |
| `success` / `success-light` | Positive states |
| `secondary` | Warm muted beige |
| `muted` / `muted-foreground` | Subdued text/surfaces |
| `background` | Warm cream |
| `card` | Slightly lighter cream |

**Shadows** (never use `shadow-md`):
`shadow-soft` · `shadow-medium` · `shadow-strong` · `shadow-coral` · `shadow-card`

**Gradients:**
`gradient-hero` · `gradient-warm` · `gradient-coral` · `gradient-card`
(also available as `bg-gradient-*` prefix)

**Button variants** (`src/components/ui/button.tsx`):
`coral` · `coral-outline` · `hero` · `teal` · `default` · `outline` · `secondary` · `ghost` · `link` · `destructive`

**Animations:** `animate-float` · `animate-pulse-soft` · `animate-slide-up` · `animate-fade-in`
Only animate `transform` and `opacity`. Never `transition-all`.

---

## Local Development

```bash
npm run dev      # → http://localhost:8080
npm run build    # → dist/
npm run test     # Vitest
```

**Screenshots:**
```bash
node "screenshot.mjs" http://localhost:8080
```
Saved to `temporary screenshots/` in the project root. Read the PNG with the Read tool after each screenshot.
Read PNG with the Read tool after each screenshot. Do at least 2 comparison rounds.

---

## Output Defaults
- Edit `.tsx` files in `src/` — do NOT create standalone `index.html`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Brand Assets
- Logo: `brand_assets/tello_logo.jpg` + `public/tello_logo.jpg`
- Favicon: `public/tello_icon.svg`
- Hero: `src/assets/hero-illustration.png`
- Avatars: `src/assets/avatar-beginner.png`, `avatar-medium.png`, `avatar-hard.png`

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color

---

## Skills Index

| Skill | File | Use when... |
|-------|------|-------------|
| `tello-n8n` | `skills/tello-n8n/SKILL.md` | Backend, webhooks, n8n workflows, data flow |
| `tello-elevenlabs` | `skills/tello-elevenlabs/SKILL.md` | Interview page, EL SDK, voice agents, Ivy |
| `tello-data` | `skills/tello-data/SKILL.md` | Data schema, Google Sheets, session lifecycle |
| `tello-deployment` | `skills/tello-deployment/SKILL.md` | GitHub, Cloudflare Pages, deploying |
| `frontend-design` | (global) | Any frontend UI work — invoke first every session |
| `skill-creator` | `~/.claude/skills/skill-creator/` | Creating or improving skills |

---

## Current Status (Phase 4 — Preparation for Early Access)

As of 7th March 2026, Phases 1–3 are complete. The product is live and functional end-to-end.

**Detailed progress tracking: see `EARLY-ACCESS.md` (project root).** Keep both files in sync when marking tasks complete.

### What's working
- Full interview flow: form → EL voice interview → grading → results
- Supabase auth connected to form
- WF0 retrieves questions at **start of conversation** (~2s latency), massively reducing EL prompt complexity
- QA workflow (WF4) measuring 3 delay metrics
- Error workflow (WF5) with Telegram alerts on all 5 workflows
- 5 EL evaluation criteria linked to Sheets
- Results page error/timeout state fully implemented

### Outstanding Phase 4 tasks
**ElevenLabs:**
- [ ] Manually stress-test Ivy across all durations + job fields; log and fix issues
- [ ] Add unique personality to Ivy
- [ ] Limit token usage / call duration guardrail (`src/pages/Interview.tsx`)
- [ ] Back up Ivy's system prompt to `skills/tello-elevenlabs/ivy-system-prompt.md`
- [x] Fix "waiting for bye" bug — agent now self-terminates

**n8n:**
- [ ] Export all 6 WFs to `n8n-backups/` (prerequisite for n8n MCP + version update)
- [ ] Update n8n to latest version (after backups committed)
- [ ] Build WF6 — Waitlist submission (email + timestamp → Sheets + Telegram)
- [ ] Build WF7 — Invite email sender (manual trigger → sends invite link)
- [ ] Update Intermediate and Advanced agents once Ivy is stable

**Frontend:**
- [ ] Security audit — full run via CC (credentials, env vars, webhook URLs, auth flows)
- [ ] Show error page when interview fails (instead of blank/incorrect grading) (`src/pages/Results.tsx`)
- [x] Add `.mcp.json` + `.claude/settings.local.json` to `.gitignore` (confirmed never committed)
- [ ] Auth gating: invite token flow (`src/pages/Auth.tsx`)
- [ ] WaitlistSection: POST email to WF6 webhook (`src/components/landing/WaitlistSection.tsx`)
- [ ] Add legal / privacy policy pages (`/privacy`, `/terms`)
- [ ] Buy domain: **tellointerview.ai** (£70/year) — currently live at tello.zach13.com
- [ ] Redesign early access landing page — on `redesign/landing` branch
- [ ] Add onboarding tips on the form page (`/form`)
- [ ] In-app feedback section on Results page (incentive: free 1-month access)
- [ ] User dashboard: session history + score stats per user
- [ ] Pricing research: figure out inbound/outbound costs, break-even calculation

### Early Access offer (when launched)
Free 1-month PRO access for founding members who complete x interviews and provide reviews/feedback.

---

## PRO Features (Phase 5 — future, not being built yet)

1. **CV upload** — EL personalises interview based on user's CV
2. **Job description upload** — tailor questions to the specific role
3. **Company research** — Glassdoor data (expected questions, culture), company background
4. **Progress tracker** — line graph of 4 criteria scores + final score over time, daily streak counter
5. **Training ground** — practice individual questions, instant feedback; optionally a daily challenge
6. **Certificates** — awarded to users scoring >90% for each difficulty level (incentive)

---

## Scoring System

**4 criteria, weighted average → final score (0–100):**
| Criterion | Weight | n8n field |
|-----------|--------|-----------|
| Technical Knowledge | 30% | `technicalKnowledge` |
| Problem Solving | 40% | `problemSolving` |
| Communication & Structure | 15% | `communicationSkills` |
| Relevance & Depth | 15% | `relevance` |

**Score bands:** `"1"` · `"2-4"` · `"5-7"` · `"8-10"`

**Performance ratings (Results.tsx):**
- ≥ 90 → Excellent
- ≥ 70 → Good
- ≥ 50 → Fair
- < 50 → Needs Improvement

---

## MCP Roadmap

### n8n MCP (planned — not yet active)
Backup first: export all 6 workflows as JSON → commit to `n8n-backups/`.
Setup: generate API key at n8n.zach13.com → Settings → API, configure n8n-mcp in Claude Code.
Installed n8n skills (ready to use once MCP active): `n8n-mcp-tools-expert`, `n8n-workflow-patterns`, `n8n-node-configuration`, `n8n-validation-expert`, `n8n-code-javascript`, `n8n-expression-syntax`.

### ElevenLabs MCP (deferred)
Evaluate after n8n MCP is stable. Back up Ivy's system prompt to `skills/tello-elevenlabs/` first.

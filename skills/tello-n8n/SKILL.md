---
name: tello-n8n
description: Reference for all Tello n8n backend workflows. Use this skill whenever working on backend integrations, webhook connections, data flow between frontend and n8n, troubleshooting failed sessions, understanding what happens after a form submit or interview ends, or making changes that touch any of the Tello n8n workflows. Always load this when the task involves session creation, grading, results retrieval, question bank logic, execution timing, or error handling.
---

# Tello n8n Workflows

Tello's backend runs entirely on n8n (self-hosted at n8n.zach13.com). There are 8 active workflows (WF7 planned; EA User Interest Data Collection is a separate standalone workflow). All operational data is written to Google Sheets — not Supabase.

---

## Workflow 0 — Tello Retrieve Questions
**Name:** Tello v2 - 0. Tello Retrieve Questions
**Trigger:** EL tool call at the **start of conversation** (EL's first action before any interview questions)
**Inputs:** `difficulty`, `job_field`, `duration`, `session_id`, `cv_exists` (string `"true"`/`"false"`), `jd_exists` (string `"true"`/`"false"`)
**Logic:** Selects the correct number and type of questions (Intro / Technical / Scenario) based on inputs, routing between the default question bank and PRO (CV/JD) question pools.
**Output:** Returns selected questions back to EL agent.
**Latency:** ~2 seconds at start of conversation — acceptable and transparent to user.

### WF0 Node Architecture (as of 18 Mar 2026)

```
Webhook
  └── Extract Fields (Set)          # Flattens body fields + exposes cv_exists, jd_exists
        └── Calculate Question Counts  # Determines how many Intro/Tech/Scenario per duration
              └── Is default flow? (IF)
                    ├── TRUE (cv_exists='false' AND jd_exists='false')
                    │     └── Split - Create 3 Processing Branches
                    │           └── [bank reads] → Grouped Arrays
                    └── FALSE (CV or JD present)
                          └── Get Master Row (GSheets)   # Reads CV/JD columns by sessionId
                                └── Enrich with PRO data (Edit Fields)  # Merges params back in
                                      └── Split - Create 3 Processing Branches
                                            └── [bank reads] → Grouped Arrays
```

**Question counts by duration:**
- 5 min: 1 intro + 1 technical + 1 scenario = 3 questions
- 10 min: 2 intro + 2 technical + 2 scenario = 6 questions
- 15 min: 2 intro + 3 technical + 3 scenario = 8 questions

### 4-Scenario Routing Logic (Grouped Arrays Code node)

WF0 supports 4 scenarios based on `cv_exists` / `jd_exists` flags:

| Scenario | cv_exists | jd_exists | Intro source | Technical source | Scenario source |
|----------|-----------|-----------|-------------|-----------------|-----------------|
| 1 — Default | false | false | Bank | Bank | Bank |
| 2 — CV only | true | false | CV Questions | Bank | Bank |
| 3 — JD only | false | true | Bank | JD Technical | JD Scenario |
| 4 — Both | true | true | CV Questions | JD Technical | JD Scenario |

**Fallback rule:** PRO pool is used only if non-empty; otherwise falls back to bank. This handles partially populated Master Sheet rows gracefully.

**Bank reads always run on both IF paths** — this wastes ~300–500ms of GSheets reads for Scenario 4, but keeps the flow simple. Acceptable tradeoff for early access.

### Key n8n Gotchas (WF0)

1. **IF node expression scope:** After "Extract Fields" runs, the webhook body is already flattened. Use `$json.cv_exists` — NOT `$json.body.cv_exists` (body wrapper only exists on raw Webhook node output).

2. **Cross-branch node references:** `$('NodeName').item` throws if that node didn't execute in the current branch. The Grouped Arrays code wraps the PRO data read in a try/catch — the catch means "default flow ran, use bank only".

3. **parseQ helper:** CV/JD questions are stored in Master Sheet as plain text with `\n\n` delimiters between questions. The `parseQ` function splits and trims these into arrays:
   ```javascript
   function parseQ(text) {
     if (!text || text.trim() === '') return [];
     return text.split('\n\n').map(q => q.trim()).filter(Boolean);
   }
   ```

4. **Enrich with PRO data node:** This is a native Edit Fields (Set) node in "Keep All Incoming Fields" mode. It re-injects params from `$('Calculate Question Counts').item.json` into the item (because Get Master Row overwrites context with sheet columns). Fields injected: `sessionId`, `duration`, `jobField`, `difficulty`, `cv_exists`, `jd_exists`, `counts` (Object).

### WF0 Frontend Integration (as of 18 Mar 2026)
- `src/components/InterviewForm.tsx`: computes `cvExists` and `jdExists` booleans on submit, passes them in navigate state to `/interview`
- `src/pages/Interview.tsx`: reads `cvExists`/`jdExists` from router state, sends as `cv_exists`/`jd_exists` (string) in EL `dynamicVariables` at session start
- EL console: WF0 tool definition must include `cv_exists` and `jd_exists` as parameters

---

## Workflow 1 — Form Submission
**Name:** Tello v2 - 1. Form Submission
**Trigger:** Webhook called by `src/components/InterviewForm.tsx` on form submit
**Webhook URL:** `https://n8n.zach13.com/webhook/743697f7-3774-4876-b10d-775cbbb67613`
**Inputs (JSON):** `name`, `email`, `duration`, `jobField`, `difficulty`, `cvExists` (`"True"`/`"False"`), `jdExists` (`"True"`/`"False"`), `jd` (URL string)
**Inputs (multipart/form-data, when CV attached):** all above + `cv` (binary file)
**Logic:**
1. Logs a new row to the Master sheet with user preferences + timestamp
2. Generates a unique `sessionId` (format: `{prefix}-{uuid-fragment}`, e.g. `zac1-384aa041`)
3. (Planned) When `cvExists=True`: parse CV binary → generate CV intro questions → write to `CV Questions` column in Master Sheet
4. (Planned) When `jdExists=True`: scrape/process JD URL → generate JD technical + scenario questions → write to `JD Questions - technical` and `JD Questions - scenario` columns
**Output:** Returns `{ sessionId, name, duration, jobField, difficulty }` to frontend
**Frontend flow:** Form data → webhook → receive sessionId → navigate to `/interview` with `{ sessionId, name, duration, jobField, difficulty, cvExists, jdExists }` in router state
**Notes:**
- The n8n Form Submission Execution ID is logged to the Master sheet for debugging.
- WF1 is responsible for writing CV/JD questions to Master Sheet **before** the interview starts — WF0 reads them later when EL calls for questions.
- Frontend sends `cvExists`/`jdExists` as booleans in router state; EL receives them as strings `"true"`/`"false"` via dynamic variables.

---

## Workflow 2 — Process & Grading
**Name:** Tello v2 - 2. Process & Grading
**Trigger:** EL built-in post-interview webhook (fires automatically when EL session ends)
**Inputs:** `sessionId`, full Q&A transcript from the interview
**Logic:**
1. Writes all questions and user responses to the Master sheet (matched by sessionId)
2. Runs 4 independent AI grading agents:
   - Technical Knowledge grader
   - Problem Solving grader
   - Communication & Structure grader
   - Relevance & Depth grader
3. Each grader produces a score (numeric) + band (e.g. "5-7") + comment
4. A weighted matrix produces the `finalScore` (0–100)
5. Writes all scores, bands, and comments to Master sheet
6. Sets `Grading Status` = "completed" (this is the flag WF3 polls)
**Output:** Written to Sheets; no direct response to frontend
**Notes:** The n8n Grading Execution ID is logged. This workflow runs asynchronously — the frontend polls WF3 while WF2 is processing.

---

## Workflow 3 — Polling Results
**Name:** Tello v2 - 3. Polling Results
**Trigger:** Webhook polled by `src/pages/Results.tsx` every 5 seconds (max 24 polls = 2 min timeout)
**Webhook URL:** `https://n8n.zach13.com/webhook/276ad840-3dcb-4e2b-ac0f-30b1cb9f158f`
**Inputs:** `{ sessionId }`
**Logic:** Checks the `Grading Status` flag in the Master sheet for the given sessionId.
**Output:**
- If processing: `{ status: 'processing' }`
- If complete: `{ status: 'completed', finalScore, jobField, difficulty, scores: { technicalKnowledge: { score, comment }, problemSolving: { score, comment }, communicationSkills: { score, comment }, relevance: { score, comment } } }`
**Frontend:** Results page displays score cards, circular score chart, performance rating, and PerformanceOverview chart.
**Notes:** After returning completed results, WF3 triggers WF4 (timing log).

---

## Workflow 4 — Track Execution Duration
**Name:** Tello v2 - 4. Track Execution Duration
**Trigger:** Triggered by the end of WF3 (after successfully returning results)
**Logic:** Uses an n8n node to calculate three delay metrics visible to the user:
- Form Submission Duration (WF1 latency)
- Questions Retrieval Duration (WF0 latency)
- Grading Duration (WF2 latency)
**Output:** Writes timing data to the Master sheet for performance QA
**Notes:** These map to the "Questions Retrieval Duraiton" (note typo in sheet), "Form Submission Duration", and "Grading Duration" columns.

---

## Workflow 5 — Error Workflow
**Name:** Tello v2 - 5. Error Workflow
**Trigger:** Configured as the error workflow for all active workflows
**Logic:** On any workflow failure, sends a Telegram message to the developer with error details
**Output:** Telegram alert
**Notes:** This is the primary monitoring mechanism. No email or other channel — Telegram only.

---

## Workflow 7 — Invite Email Sender *(planned — not yet built)*
**Name:** Tello v2 - 7. Invite Email Sender
**Trigger:** Manual webhook (`{ email, token }`)
**Logic:** Sends a personalised invite email containing a sign-up link with the invite token
**Output:** Email sent to the invited user
**Notes:** Token list is stored in Cloudflare Pages env var `VITE_INVITE_TOKENS`. WF7 pairs with the B3 Auth Page invite token gating on the frontend.

---

## Workflow 8 — User Dashboard Data
**Name:** Tello v2 - 8. User Dashboard Data
**Trigger:** Webhook called by `src/pages/Index.tsx` on form page load
**Webhook URL:** `https://n8n.zach13.com/webhook/45445649-f088-48e2-be5e-ac0ee4a57c23`
**Inputs:** `{ email }`
**Logic:**
1. Queries Master Sheet for all rows matching the user's email
2. Reads Supabase `user_credits` table by user UUID to get `allocated` and `used`
3. Calculates `credits_remaining = allocated - used`
4. Computes stats: streak, sessions done, improvement, best score
**Output:** `{ sessions: Session[], stats: DashboardStats, credits_remaining: number }`
**Frontend:** Powers the performance chart, stat cards, and credit indicator on `/form`
**Notes:**
- Bug fixed (20 Mar 2026): hardcoded email in GSheets filter replaced with `={{ $json.body.email }}`
- `credits_remaining` colour coding: green ≥15 min, amber <15 min, red <5 min
- Submit button disabled when `credits_remaining < 5`

---

## EA User Interest Data Collection *(standalone — separate from main interview flow)*
**Name:** EA User Interest Data Collection
**Trigger:** Form submission on the Early Access landing page (`tello-earlyaccess.zach13.com`)
**Logic:** Collects user email addresses from the EA LP and saves to Supabase
**Output:** Email stored in Supabase
**Notes:** This workflow lives in the same n8n instance but is not part of the main interview flow (WF0–WF8). It serves the separate EA LP repo (`Tello-Early-Access-UserInterest-LP-ONLY`). Not triggered by the main Tello app.

---

## Data Flow Summary

```
/form page load → WF8 → dashboard data (sessions, stats, credits_remaining)

Form submit → WF1 → sessionId → EL interview starts
                                 │
                    EL calls WF0 (questions) at start of interview
                                 │
                    Interview ends → EL calls WF2 (grading)
                                 │
Frontend polls WF3 every 5s ◄──┘
     │
     └── On completion → WF4 logs timing
     │
     └── Any failure → WF5 → Telegram

EA LP form submit → EA User Interest Data Collection → Supabase
```

---

## n8n Execution IDs

All 3 primary workflow execution IDs are written to the Master sheet:
- `n8n Form Submission Execution ID` (WF1)
- `n8n Questions Retrieval Execution ID` (WF0)
- `n8n Grading Execution ID` (WF2)

Use these to look up exact execution logs in n8n when debugging a specific session.

---

## Form Fields & Valid Values

Sent by the frontend to WF1:
| Field | Valid Values |
|-------|-------------|
| `duration` | `"5"`, `"10"`, `"15"` (string, minutes) |
| `jobField` | `"Engineering"`, `"Nursing"`, `"Architecture"`, `"Business"`, `"Artificial Intelligence"`, `"AI Automation"` |
| `difficulty` | `"Beginner"`, `"Intermediate"`, `"Advanced"` |

---

## Known Issues / Active Development
- Grading minimum: users historically received a minimum of 10 points regardless of performance — being addressed in WF2
- Grading Status is hardcoded as `"Completed"` (capital C) in WF2 — WF3 matches this exactly. No casing inconsistency.

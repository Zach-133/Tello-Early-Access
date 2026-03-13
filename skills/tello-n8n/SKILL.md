---
name: tello-n8n
description: Reference for all Tello n8n backend workflows. Use this skill whenever working on backend integrations, webhook connections, data flow between frontend and n8n, troubleshooting failed sessions, understanding what happens after a form submit or interview ends, or making changes that touch any of the 6 Tello n8n workflows. Always load this when the task involves session creation, grading, results retrieval, question bank logic, execution timing, or error handling.
---

# Tello n8n Workflows

Tello's backend runs entirely on n8n (self-hosted at n8n.zach13.com). There are 6 workflows. All operational data is written to Google Sheets — not Supabase.

---

## Workflow 0 — Retrieve Questions
**Name:** Tello v2 - 0. Retrieve Questions
**Trigger:** EL tool call at the **start of conversation** (EL's first action before any interview questions)
**Inputs:** `difficulty`, `job_field`, `duration`
**Logic:** Queries the question bank in Google Sheets, selecting the correct number and type of questions (Introductory / Technical / Scenario) based on the inputs.
**Output:** Returns selected questions back to EL agent to ask the user.
**Latency:** ~2 seconds at start of conversation — acceptable and transparent to user.
**Notes:** This approach replaced the "Conversation Initiation Client Data Webhook" (doesn't work with n8n — Twilio only) and avoids injecting questions as dynamic variables (security risk). The frontend has no visibility into this call. Question structure: up to 2 Introductory + up to 3 Technical + up to 3 Scenario slots; actual count varies by duration:
- 5 min: 1 intro + 1 technical + 1 scenario = 3 questions
- 10 min: 2 intro + 2 technical + 2 scenario = 6 questions
- 15 min: 2 intro + 3 technical + 3 scenario = 8 questions

---

## Workflow 1 — User Form Submission
**Name:** Tello v2 - 1. User Form Submission
**Trigger:** Webhook called by `src/components/InterviewForm.tsx` on form submit
**Webhook URL:** `https://n8n.zach13.com/webhook/743697f7-3774-4876-b10d-775cbbb67613`
**Inputs:** `name`, `duration`, `jobField`, `difficulty`
**Logic:**
1. Logs a new row to the Master sheet with user preferences + timestamp
2. Generates a unique `sessionId` (format: `{prefix}-{uuid-fragment}`, e.g. `zac1-384aa041`)
**Output:** Returns `{ sessionId, name, duration, jobField, difficulty }` to frontend
**Frontend flow:** Form data → webhook → receive sessionId → navigate to `/interview` with state
**Notes:** The n8n Form Submission Execution ID is logged to the Master sheet for debugging.

---

## Workflow 2 — Process and Grading
**Name:** Tello v2 - 2. Process and Grading
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

## Workflow 3 — Retrieving Results
**Name:** Tello v2 - 3. Retrieving Results
**Trigger:** Webhook polled by `src/pages/Results.tsx` every 5 seconds (max 60 polls = 5 min timeout)
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
**Name:** Tello v2 - Track Execution Duration
**Trigger:** Triggered by the end of WF3 (after successfully returning results)
**Logic:** Uses an n8n node to calculate three delay metrics visible to the user:
- Form Submission Duration (WF1 latency)
- Questions Retrieval Duration (WF0 latency)
- Grading Duration (WF2 latency)
**Output:** Writes timing data to the Master sheet for performance QA
**Notes:** These map to the "Questions Retrieval Duraiton" (note typo in sheet), "Form Submission Duration", and "Grading Duration" columns.

---

## Workflow 5 — Error Workflow
**Name:** Tello v2 Error Workflow
**Trigger:** Configured as the error workflow for all 5 workflows above
**Logic:** On any workflow failure, sends a Telegram message to the developer with error details
**Output:** Telegram alert
**Notes:** This is the primary monitoring mechanism. No email or other channel — Telegram only.

---

## Data Flow Summary

```
Form submit → WF1 → sessionId → EL interview starts
                                 │
                    EL calls WF0 (questions) during interview
                                 │
                    Interview ends → EL calls WF2 (grading)
                                 │
Frontend polls WF3 every 5s ◄──┘
     │
     └── On completion → WF4 logs timing
     │
     └── Any failure → WF5 → Telegram
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
- Grading Status casing inconsistency in Sheets: some rows show "completed", others "Completed" — WF3 should handle both

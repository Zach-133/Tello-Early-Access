---
name: tello-deployment
description: Reference for Tello's deployment pipeline and infrastructure setup. Use this skill whenever setting up the GitHub repository, configuring Cloudflare Pages, managing environment variables, deploying a new version, switching to a new repo, understanding the build process, or planning any change that affects how Tello gets from local development to tello.zach13.com. Always load this when the task involves git, CI/CD, hosting, or production environment configuration.
---

# Tello Deployment

## Infrastructure Overview

```
Local dev (localhost:8080)
       │
       └── git push → GitHub (main branch)
                           │
                           └── Cloudflare Pages (auto-deploy)
                                       │
                                       └── tello.zach13.com
```

**Live domain:** tello.zach13.com
**Hosting:** Cloudflare Pages
**Trigger:** Auto-deploys on every push to `main` branch
**Build output:** `dist/` (Vite)

---

## Local Development

```bash
# Start dev server
npm run dev
# → http://localhost:8080 (fixed port in vite.config.ts)

# Production build (test before pushing)
npm run build

# Run tests
npm run test

# Type check + lint
npm run lint
```

**Screenshot workflow** (for UI review):
```bash
node "C:\Users\Admin\Downloads\Tello Frontend v4\screenshot.mjs" http://localhost:8080
```
Puppeteer at: `C:/Users/Admin/AppData/Local/Temp/puppeteer-test/`
Chrome cache at: `C:/Users/Admin/.cache/puppeteer/`

---

## Environment Variables

Set in **Cloudflare Pages dashboard** (not in the repo — never commit these):

| Variable | Where used | Description |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | Supabase anonymous/public key |

For local development: create `.env.local` in the project root (gitignored):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## GitHub Repository

**Current status:** `tello-early-access` is the active repo (as of 6th March 2026). It is already:
- Pushed to GitHub on the `main` branch
- Connected to Cloudflare Pages (auto-deploys on push to `main`)
- Live at tello.zach13.com

The previous repo (`tello-dev-site`) was backed up and this repo took over. Claude Code works in `c:\Users\Admin\Downloads\Claude Code Files\Tello-Early-Access`.

**Planned domain migration:** tellointerview.ai (£70/year) — currently tello.zach13.com. Update DNS + Cloudflare custom domain when purchased.

---

## Cloudflare Pages Configuration

| Setting | Value |
|---------|-------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (project root) |
| Node.js version | 18+ |
| Branch to deploy | `main` |

Environment variables are set under: **Settings → Environment Variables**
Set them for both **Production** and **Preview** environments.

---

## Cloudflare Pages — Re-linking to New Repo

Steps (user must do this in the Cloudflare dashboard):
1. Go to Cloudflare Pages → your Tello project
2. Settings → Builds & deployments → disconnect GitHub connection
3. Connect to the new GitHub repo
4. Confirm build settings (see above)
5. Re-add both environment variables
6. Trigger a manual deploy or push a commit to verify

---

## Deployment Checklist

Before pushing to main:
- [ ] `npm run build` succeeds locally
- [ ] No TypeScript errors
- [ ] Dev server tested at localhost:8080
- [ ] Env vars confirmed in Cloudflare dashboard
- [ ] No hardcoded secrets or localhost URLs committed

---

## n8n Backup (before MCP access)

Before enabling n8n MCP access, export all 6 workflows:
1. Open each workflow in n8n (n8n.zach13.com)
2. Click ⋮ menu → Download (exports as JSON)
3. Save to `n8n-backups/` in this project:
   - `n8n-backups/wf0-retrieve-questions.json`
   - `n8n-backups/wf1-form-submission.json`
   - `n8n-backups/wf2-process-grading.json`
   - `n8n-backups/wf3-retrieve-results.json`
   - `n8n-backups/wf4-track-duration.json`
   - `n8n-backups/wf5-error-workflow.json`
4. Commit to git — this is the version control backup for n8n

**n8n API key setup** (for MCP):
- n8n.zach13.com → Settings → API → Create API Key
- Add to Claude Code MCP config with base URL `https://n8n.zach13.com`

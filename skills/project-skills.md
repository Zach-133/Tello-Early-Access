# Tello v2 — Project Skills & Architecture

## Stack
- **Framework:** React 18 + Vite + TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS + shadcn/ui primitives
- **Auth:** Supabase (`@supabase/supabase-js`)
- **Voice AI:** ElevenLabs (`@elevenlabs/react`)
- **Backend:** n8n webhooks (no custom server)
- **Deployment:** Cloudflare Pages (auto-deploys from `full-page` remote on GitHub)

---

## Project Structure
```
src/
├── App.tsx                        # Router + providers
├── context/AuthContext.tsx        # Supabase auth state + useAuth() hook
├── lib/supabase.ts                # Supabase client singleton
├── components/
│   ├── AppHeader.tsx              # Sticky header for protected pages (brand + user dropdown)
│   ├── ProtectedRoute.tsx         # React Router v6 Outlet-based auth guard
│   ├── InterviewForm.tsx          # Setup form (posts to n8n)
│   ├── ScoreCard.tsx              # Individual score display
│   ├── PerformanceOverview.tsx    # Comparative score bars
│   ├── landing/                   # Landing page section components
│   └── ui/                        # shadcn/ui primitives
├── pages/
│   ├── Landing.tsx                # / — public marketing page
│   ├── Auth.tsx                   # /auth — login + signup (public)
│   ├── Index.tsx                  # /form — interview setup (protected)
│   ├── Interview.tsx              # /interview — live voice interview (protected)
│   ├── Results.tsx                # /results/:sessionId — scores (protected)
│   └── NotFound.tsx               # * catch-all
└── index.css                      # Design system CSS variables + Tailwind layers
```

---

## Route Map
| Path | Component | Auth |
|------|-----------|------|
| `/` | Landing | Public |
| `/auth` | Auth | Public (redirects to /form if already logged in) |
| `/form` | Index | Protected |
| `/interview` | Interview | Protected |
| `/results/:sessionId` | Results | Protected |

---

## Authentication (Supabase)

### Key files
- `src/lib/supabase.ts` — `createClient()` using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuth()` hook
- `src/components/ProtectedRoute.tsx` — wraps protected routes, redirects to `/auth` if no user
- `src/pages/Auth.tsx` — combined login/signup UI with hash error parsing

### AuthContext API
```ts
const { user, loading, signIn, signUp, signOut } = useAuth()
// signUp accepts optional 3rd arg: name stored as user_metadata.full_name
```

### User metadata
- Name stored at `user.user_metadata.full_name` (set during signUp)
- Accessed in AppHeader for avatar initial and dropdown display

### Supabase dashboard settings (important)
- **Site URL:** `https://tello.zach13.com/auth`
- **Redirect URLs:** `https://tello.zach13.com/auth`, `http://localhost:8080/auth`
- **Email OTP Expiration:** 86400s (24 hrs) for testing comfort
- **Email confirmation:** enabled — users must confirm before signing in

### Confirmation email flow
1. User signs up → Supabase emails link pointing to `tello.zach13.com/auth#access_token=...`
2. User clicks link → lands on `/auth`
3. Supabase JS client detects hash token → fires `onAuthStateChange`
4. AuthContext sets user → Auth.tsx `<Navigate to="/form" replace />` kicks in

### Error handling
- Auth.tsx `useEffect` parses `#error=...` hash on mount, surfaces as inline error, clears hash from URL

---

## Design System

### Colors (CSS variables in `src/index.css`)
- **Primary:** deep brown `hsl(25 45% 20%)`
- **Coral (CTA):** `hsl(18 75% 65%)` — use `text-coral`, `bg-coral`, `border-coral`
- **Background:** warm cream `hsl(30 25% 97%)`
- **Teal / Gold / Success:** available as Tailwind tokens

### Typography
- **Headings:** `font-serif` → DM Serif Display
- **Body:** `font-sans` → Inter

### Shadows (never use flat `shadow-md`)
- `shadow-soft`, `shadow-medium`, `shadow-strong`, `shadow-coral`

### Gradients
- `bg-gradient-coral`, `bg-gradient-warm`, `bg-gradient-hero`, `bg-gradient-card`

### Button variants (shadcn extended)
- `variant="coral"` — primary CTA (coral gradient + shadow-coral + scale hover)
- `variant="ghost"` — secondary nav actions
- `variant="teal"` — teal accent

### Rules
- Never `transition-all` — animate only `transform` and `opacity`
- Never default Tailwind blues/indigos — use design tokens
- Every clickable element needs hover + focus-visible + active states

---

## Screenshot Workflow

### Public pages
```bash
node "C:\Users\Admin\Downloads\Tello Frontend v4\screenshot.mjs" http://localhost:8080
```

### Protected pages (requires auth)
```bash
node screenshot-auth.mjs http://localhost:8082/form [optional-label]
```
- Script lives at `tello-v2/screenshot-auth.mjs`
- Reads credentials from `.env.local`: `SCREENSHOT_TEST_EMAIL`, `SCREENSHOT_TEST_PASSWORD`
- Signs into Supabase REST API, injects session into localStorage, then navigates + screenshots
- Screenshots saved to `tello-v2/temporary screenshots/`
- Puppeteer installed in tello-v2 as dev dependency

### .env.local keys
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SCREENSHOT_TEST_EMAIL=
SCREENSHOT_TEST_PASSWORD=
```

---

## Git & Deployment
- **Local remote name:** `full-page` (not `origin`)
  - `git push full-page main`
- **origin** points to a different repo (Tello-Form-Submission)
- **Cloudflare env vars** must be set manually in dashboard for production builds:
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - `.env.local` is git-ignored and never committed

---

## n8n Webhooks
| Purpose | Endpoint |
|---------|----------|
| Interview form submit | `https://n8n.zach13.com/webhook/743697f7-3774-4876-b10d-775cbbb67613` |
| Results polling | `https://n8n.zach13.com/webhook/276ad840-3dcb-4e2b-ac0f-30b1cb9f158f` |

- Results page polls every 5s, max 60 polls (5 min timeout)
- Posts `{ sessionId }`, receives full score object

## ElevenLabs Agents (by difficulty)
- Beginner: `agent_5201khb8ye2se6ta1vsxf6f4wsx6`
- Intermediate: `agent_0101khb8tr92e3st3vbnjm3z0jwk`
- Advanced: `agent_6501khb8vxzmeejsq3mga7tn8kdn`

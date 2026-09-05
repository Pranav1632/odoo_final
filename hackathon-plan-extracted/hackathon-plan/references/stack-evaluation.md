# Stack Evaluation Criteria for Hackathons

Use these criteria when comparing tech stacks in Phase 2.

## Scoring Dimensions (rate each stack 1-5)

### 1. Setup Speed
How quickly can the team go from zero to running code?
- 5: One command, running in <5 min (Vite, Next.js, create-react-app, Railway)
- 3: Some config needed, 15-30 min
- 1: Complex setup, environment issues likely (Kubernetes, custom infra)

### 2. Demo-ability
How good does it look in a 3-minute demo?
- 5: Visually impressive UI, real-time features, mobile-friendly
- 3: Functional but plain
- 1: CLI only, or requires technical explanation to appreciate

### 3. Deploy Speed
How fast can you get a shareable link?
- 5: One-click deploy, auto-preview URLs (Vercel, Netlify, Railway, Render)
- 3: Manual deploy, 15-20 min
- 1: Requires server setup, DNS, etc.

### 4. Team Fit
Does this match what the team already knows?
- Assess against skills provided in Phase 3
- Never recommend a stack the team has never touched for a hackathon

### 5. Failure Surface
How many things can go wrong?
- Prefer fewer moving parts for hackathons
- Monorepos are risky unless team is experienced
- Microservices are almost always wrong for hackathons

---

## Recommended Stacks by Project Type

### AI/ML Project
**Recommended:** Next.js (frontend) + FastAPI (Python backend) + Vercel/Railway
- Frontend: Next.js 14 with App Router
- Backend: FastAPI with Pydantic models
- AI: OpenAI SDK / Anthropic SDK / HuggingFace
- DB: Supabase (Postgres + auth + realtime in one)
- Deploy: Vercel (frontend) + Railway (backend)

### Web App / SaaS
**Recommended:** Next.js full-stack + Supabase + Vercel
- Single repo, API routes handle backend
- Supabase for auth, DB, storage
- Tailwind + shadcn/ui for fast polish
- Deploy: Vercel (one command)

### Mobile App
**Recommended:** React Native (Expo) or Flutter
- Expo: fastest setup, easiest demo (QR code scan)
- Flutter: better performance, harder setup
- Backend: Firebase (fastest) or Supabase

### Hardware / IoT
**Recommended:** Python (device) + Next.js dashboard + WebSockets
- Raspberry Pi / Arduino: Python scripts
- Dashboard: Next.js with socket.io or Supabase realtime
- Keep the hardware layer as simple as possible

### Browser Extension
**Recommended:** Vanilla JS or React + Vite + Chrome Extension Manifest v3
- Simple manifest.json setup
- Content scripts + background service worker
- Backend: Minimal FastAPI or serverless functions

### Discord / Slack Bot
**Recommended:** Node.js (discord.js / bolt) + Railway
- discord.js for Discord, @slack/bolt for Slack
- Deploy to Railway with one Dockerfile
- DB: PlanetScale or Supabase free tier

---

## Red Flags — Avoid These in Hackathons

- **Custom auth from scratch** — use Supabase Auth, Clerk, or NextAuth
- **Microservices** — monolith wins hackathons
- **Kubernetes** — overkill, setup eats all your time
- **Self-hosted databases** — use managed (Supabase, PlanetScale, MongoDB Atlas)
- **Native mobile** (Swift/Kotlin) — too slow to iterate unless team is expert
- **GraphQL** — REST is faster to implement under pressure
- **WebSockets from scratch** — use socket.io or Supabase realtime

---

## API Evaluation Checklist

For each API considered, verify:
- [ ] Free tier sufficient for hackathon demo?
- [ ] How long does auth/API key setup take?
- [ ] Is there an official SDK or do you need raw HTTP?
- [ ] Rate limits that could break the demo?
- [ ] Any known reliability issues?
- [ ] Does it have good docs / quickstart?

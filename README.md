# AIX — Adaptive Intelligence Index Platform

Monorepo for AIX and its pilot module, AGII (Adaptive Geopolitical Intelligence Index).

## Team
- Luke Zammit — Lead Full Stack Engineer
- Ognjen Jovic — Interactive Experience Engineer

## Layout

```
aix-agii/
├── frontend/          # Next.js / React / TypeScript
├── backend/           # Python FastAPI + Node.js services
│   └── app/
│       ├── core/      # config, db session, shared deps
│       └── modules/   # one folder per platform module (Volume 3 of the PRD):
│           ├── identity/            # Identity & Access
│           ├── index_registry/      # Index Registry
│           ├── methodology_engine/  # Methodology Engine
│           ├── data_layer/          # Data Layer
│           ├── ai_orchestration/    # AI Co-Pilot / Adaptive Intelligence Engine
│           ├── publishing/          # Publishing & Presentation
│           ├── notifications/       # Notifications
│           └── analytics_audit/     # Analytics & Audit / Governance
└── .github/workflows/ # CI
```

Module boundaries mirror the platform's own permission model (PRD §3), so each
can later be extracted into its own service without a rewrite (Volume 1 §4).

## Local development

```bash
docker compose up --build
```

This brings up:
- `frontend` — Next.js dev server on :3000
- `backend` — FastAPI dev server on :8000
- `db` — Postgres (local stand-in for Supabase)
- `redis` — Redis for caching/session

## Week 1 goal

Logged-in user lands on an empty Index Workspace with the three-panel shell
(Tree / Detail / Co-Pilot) rendering, backed by real auth against the `identity`
module and a stub `index_registry` record. No real methodology data yet —
that's Week 2.

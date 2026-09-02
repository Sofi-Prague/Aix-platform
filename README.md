# AIX — Adaptive Intelligence Index Platform

AIX is a web platform for creating, managing, calculating, validating, and publishing composite indexes. Its founding pilot is AGII (Adaptive Geopolitical Intelligence Index), but the platform is designed to support additional indexes through the same workflow.

## Team

- Luke Zammit — Lead Full Stack Engineer
- Ognjen Jovic — Interactive Experience Engineer

## Production Access

- Frontend: https://aix-platform-alpha.vercel.app
- Backend: Render-hosted FastAPI service configured through the frontend `NEXT_PUBLIC_API_URL` environment variable
- Database: Supabase PostgreSQL
- AI provider: Cloudflare Workers AI

Production credentials and secrets are intentionally not stored in the repository.

## Current Status

The founding AIX workflow is operational end to end. An authenticated author can:

1. Register and sign in.
2. Create and manage an index.
3. Define dimensions and indicators.
4. Set indicator metadata, including units, directionality, status, and ordering.
5. Upload indicator observations from CSV files.
6. Normalize indicator data according to directionality.
7. Configure equal or custom weighting.
8. Calculate composite scores and ranked results.
9. Request AI-assisted dimension and indicator suggestions through the Co-Pilot.
10. Review methodology against the publication validation checklist.
11. Publish a completed index.
12. View the published index through a public, read-only page without authentication.
13. Review public rankings, final scores, normalization method, weights, source provenance, and publication timestamp.
14. Automatically return a published index to Draft when methodology, data, weighting, or core metadata changes, requiring recalculation, validation, and republication.

The core application has completed regression validation with the current backend test suite passing, a clean frontend ESLint run, and a successful optimized Next.js production build. The closure changes add publication-integrity, provenance, public-results, transparency, and UX safeguards beyond the original 83-test baseline.

## Architecture

| Layer | Technology / Service | Responsibility |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript | Workspace UI, authentication screens, methodology management, data/weighting/calculation controls, Co-Pilot, publishing, and public index pages |
| Backend | FastAPI, Python 3.12 | Authentication, tenancy, index/methodology APIs, data ingestion, normalization, weighting, calculation, AI orchestration, and publishing |
| Database | PostgreSQL / Supabase | Persistent users, indexes, methodology, datasets, observations, and weighting configurations |
| AI | Cloudflare Workers AI | Live methodology Co-Pilot suggestions |
| Authentication | JWT bearer tokens | Authenticated API access and tenant-scoped authorization |
| Frontend hosting | Vercel | Production Next.js deployment |
| Backend hosting | Render | Production FastAPI deployment; the service may sleep when idle and wake on demand |

## Repository Layout

```text
Aix-platform/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth.py
│   │   │   ├── config.py
│   │   │   ├── db.py
│   │   │   └── models.py
│   │   ├── modules/
│   │   │   ├── identity/            # Authentication and current-user handling
│   │   │   ├── index_registry/      # Tenant-scoped index CRUD
│   │   │   ├── methodology_engine/  # Dimensions, indicators, weighting and calculation
│   │   │   ├── data_layer/          # CSV ingestion, data sources, observations and normalization
│   │   │   ├── ai_orchestration/    # AI Co-Pilot suggestions
│   │   │   ├── publishing/          # Validation, publishing and public methodology API
│   │   │   ├── notifications/       # Placeholder / health endpoint
│   │   │   └── analytics_audit/     # Placeholder / health endpoint
│   │   └── main.py
│   ├── tests/
│   ├── alembic/
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   ├── register/
│   │   ├── workspace/
│   │   └── published/[slug]/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
└── README.md
```

## Core Backend Modules

### Identity & Access

Provides user registration, login, password hashing, JWT creation/validation, current-user lookup, and tenant-aware access control. Public registration creates a new tenant and assigns the author role.

### Index Registry

Provides authenticated, tenant-scoped CRUD operations for indexes. Users cannot access indexes belonging to another tenant.

### Methodology Engine

Provides the main index structure:

```text
Index
└── Dimension
    └── Indicator
```

Dimensions and indicators support creation, editing, deletion, ordering, descriptions, units, directionality, and readiness status. The module also supports weighting configuration and composite index calculation.

### Data Layer

Supports CSV ingestion for indicator observations. Uploaded data is persisted as data sources and data points and can then be normalized for calculation. Validation rejects malformed headers, non-numeric values, duplicate observations, and invalid datasets without leaving partial records behind.

Expected CSV structure:

```csv
entity,period,value
Czechia,2025,91
Germany,2025,95
Netherlands,2025,98
```

### Normalization, Weighting & Calculation

AIX uses **Min-Max normalization on a 0–1 scale**, independently within each period.

- Higher is better: `(x - min) / (max - min)`
- Lower is better: `(max - x) / (max - min)`
- If every value in a period is equal, each observation receives a normalized value of `1.0`.

AIX supports equal weighting and custom weighting at both dimension and indicator level. The Results workflow preserves the calculation chain **Raw value → Normalized value → Indicator weight → Indicator contribution → Dimension score → Dimension weight → Final score**. Calculation validates dataset coverage and weighting before producing composite scores and rankings.

### AI Co-Pilot

The methodology Co-Pilot can generate contextual dimension and indicator suggestions. Suggestions are presented for human review rather than being inserted directly into the methodology, keeping the author in control of accepted content.

### Publishing

Publishing is protected by a 14-check validation gate. `Published` cannot be selected through ordinary index editing; publication only occurs through the dedicated validation/publish workflow. Any later change to index metadata, dimensions, indicators, source data, or weighting returns a published index to `Draft`, removing it from the public endpoint until it is recalculated, validated, and published again.

The public `/published/[slug]` page presents ranked results, period, normalization and weighting methodology, dimension/indicator weights, source provenance, and the current publication timestamp.

### Notifications and Analytics/Audit

These module boundaries exist in the current architecture, but their full planned functionality is not implemented. They currently act as placeholders/health endpoints and are not required for the core pilot workflow.

## Database Model

The current SQLAlchemy model includes:

- `users` — user identity, tenant, role, password hash and creation timestamp
- `indexes` — tenant-owned index metadata and publication status
- `dimensions` — ordered dimensions belonging to an index
- `indicators` — ordered indicators, metadata, directionality and readiness status
- `data_sources` — uploaded or referenced indicator data sources
- `data_points` — entity/period/value observations
- `weighting_configs` — equal or custom weighting configuration stored as JSONB

UUID primary keys are used throughout. Foreign-key relationships and cascade deletion are used for dependent methodology and data records.

## Security and Tenant Isolation

Protected API routes require a valid JWT bearer token. Backend authorization resolves the current user and applies tenant ownership checks before allowing access to protected resources.

Automated tests cover cross-tenant isolation across indexes, methodology, data, normalization, weighting, calculation, and AI suggestion workflows.

> The current frontend stores its JWT in browser `localStorage`. This is acceptable for the current pilot but should be reviewed as part of future production security hardening.

## Local Development

### Prerequisites

- Python 3.12
- Node.js and npm
- PostgreSQL access, either locally or through Supabase
- Required backend and frontend environment variables

Docker can be used when Docker Desktop and hardware virtualization are available, but it is not required for local development.

### Backend

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Restore the backend `.env` file with the required database, authentication, CORS, and AI-provider configuration, then start FastAPI:

```powershell
python -m uvicorn app.main:app --reload
```

The local API is available at:

```text
http://localhost:8000
```

FastAPI's interactive API documentation is available at:

```text
http://localhost:8000/docs
```

### Frontend

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Set the frontend API URL for local development to:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The local frontend is then available at:

```text
http://localhost:3000
```

### Docker Alternative

When Docker Desktop is available and virtualization is enabled:

```powershell
docker compose up --build
```

## Testing and Validation

### Backend regression suite

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```

Run the full current suite and record the exact pass count in `docs/PRODUCTION_VERIFICATION_CHECKLIST.md` before final handover.

To run everything except AI-provider tests:

```powershell
python -m pytest -v --ignore=tests/test_ai_orchestration.py
```

The suite covers authentication, tenant isolation, index CRUD, dimensions, indicators, CSV ingestion, normalization, weighting, calculation, publication-integrity safeguards, AI orchestration, publishing validation, and public access behavior.

### Frontend lint

```powershell
cd frontend
npm run lint
```

Latest validation: **completed successfully with no ESLint errors**.

### Production build

```powershell
npm run build
```

Latest validation: **Next.js production build completed successfully**, including the static application routes and dynamic `/published/[slug]` route.

## End-to-End Test Workflow

A useful manual acceptance test is:

```text
Register / Login
    ↓
Create Index
    ↓
Create Dimensions
    ↓
Create Indicators
    ↓
Set Metadata & Directionality
    ↓
Upload CSV Data
    ↓
Normalize Data
    ↓
Configure Weighting
    ↓
Calculate Rankings
    ↓
Use / Review AI Suggestions
    ↓
Run Publication Validation
    ↓
Publish Index
    ↓
Open Public Read-Only Index
```

This workflow has been exercised using complete sample indexes to verify that the platform works from methodology creation through calculation and publication.

## Production Deployment

The current production architecture is:

```text
Browser
   │
   ▼
Vercel — Next.js frontend
   │
   ▼
Render — FastAPI backend
   │
   ├── Supabase PostgreSQL
   │
   └── Cloudflare Workers AI
```

The Render backend is configured as an on-demand hosted service. If it has been idle, the first request can take longer while the service wakes up. This is a hosting characteristic rather than an application-processing delay.

Environment secrets must remain in the relevant hosting provider configuration and must **not** be committed to Git.

## CI

The repository contains a GitHub Actions workflow under `.github/workflows/ci.yml` for automated project validation.

## Known Limitations / Future Development

The founding pilot's core workflow is complete, but the following remain appropriate areas for future development:

- Full Notifications implementation
- Full Analytics & Audit / Governance implementation
- Formalized database migration/version history
- Additional role-management and administrative interfaces beyond the current author-focused workflow
- Stronger production token/session storage strategy
- Expanded accessibility, observability, audit logging, and operational monitoring
- Broader AI orchestration and richer methodology assistance
- Direct external data integrations such as World Bank / Eurostat
- Methodology versioning, calculation history, audit trail, missing-data policies, coverage thresholds, and sensitivity analysis
- Public visualizations such as ranking charts, time series, country comparisons, dimension breakdowns, and radar charts
- CSV/XLSX results exports and downloadable methodology/results reports
- Additional normalization/weighting methods only where academically justified
- Additional production-scale performance and security hardening

These items do not prevent the current core index-authoring, data, calculation, AI-assisted methodology, validation, and publishing workflow from operating.

## Project State

The original Week 1 README described AIX as an empty workspace shell with methodology functionality still to be developed. The project has since progressed through the founding roadmap into a working pilot platform with methodology authoring, data ingestion, normalization, weighting, calculation, AI assistance, publication validation, and public presentation implemented and tested.

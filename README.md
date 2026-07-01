# HPC Job Queue Dashboard

A SLURM-style job scheduler dashboard: submit compute jobs, watch them get
auto-allocated onto cluster nodes by partition and resource availability, and
track them through `queued → running → completed/failed/cancelled`.

Built to explore the same problem HPC schedulers solve — matching job resource
requests against a fixed pool of nodes across partitions (`compute`, `gpu`,
`highmem`) — as a small, fully working full-stack app.

![status](https://img.shields.io/badge/status-active-45D6C4)

## Stack

- **Frontend:** React 18 + Vite, no UI framework — hand-built components and CSS
- **Backend:** Node.js + Express, REST API
- **Database:** SQLite via `better-sqlite3`
- **Deployment:** Docker + Docker Compose, or Railway / Render (see below)

## Why this project

Two things a job scheduler actually has to get right: **resource accounting**
(don't overcommit a node's CPU/memory) and **state transitions** (a job's
lifecycle has real invariants — you can't cancel a completed job, you can't
delete a running one). Both are enforced server-side, not just in the UI.

## Architecture

```
client/  → React SPA. Polls the API every 3s for live state.
server/  → Express REST API + SQLite. Owns all business logic.
  db.js         schema (nodes, jobs)
  seed.js       demo cluster + demo jobs, idempotent
  simulator.js  the "scheduler": allocates queued jobs onto free nodes,
                advances running jobs to completion on a simulated clock
  routes/jobs.js    CRUD + cancel, with server-side validation
  routes/nodes.js   live utilization per node + cluster-wide summary
```

The simulator runs on a `setInterval` tick in-process — no separate worker
needed for a project this size, but it's isolated in its own module so it
could be pulled out into a real job runner later.

## Running locally

Requires Node 18+.

```bash
# 1. Backend
cd server
cp .env.example .env
npm install
npm run seed   # optional — the server also seeds automatically on first boot
npm run dev    # http://localhost:4000

# 2. Frontend (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev    # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `localhost:4000`, so no CORS
headaches locally.

> **Note on `better-sqlite3`:** it's a native module and compiles on `npm
> install`. This needs a normal internet connection with access to GitHub
> release assets (for the prebuilt binary) or a C++ toolchain (for
> compiling from source) — both are present on a normal dev machine, CI
> runner, or Railway/Render build environment.

## Running tests

```bash
cd server
npm test
```

Covers job creation validation, partition/resource rejection, and the
cancel flow, using Node's built-in test runner against an isolated SQLite
file (not your dev database).

## Running with Docker

```bash
docker compose up --build
```

- Client: [http://localhost:8080](http://localhost:8080)
- API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

## Deploying (Railway / Render, free tier)

1. Push this repo to GitHub.
2. **Backend:** new service → root directory `server` → build command
   `npm install` → start command `npm start`. Add a persistent volume
   mounted at `/app/data` if you want job data to survive restarts (or
   accept ephemeral storage on the free tier).
3. **Frontend:** new static site → root directory `client` → build
   command `npm run build` → publish directory `dist`. Set
   `VITE_API_BASE_URL` to your backend's public URL.

## API reference

| Method | Path                  | Description                                  |
|--------|-----------------------|-----------------------------------------------|
| GET    | `/api/health`         | Liveness check                                |
| GET    | `/api/jobs`            | List jobs. Query: `status`, `partition`, `user`, `sort`, `order` |
| GET    | `/api/jobs/:id`         | Get one job                                   |
| POST   | `/api/jobs`             | Submit a job (validated against node limits)  |
| POST   | `/api/jobs/:id/cancel`  | Cancel a queued or running job                |
| DELETE | `/api/jobs/:id`         | Remove a job in a terminal state              |
| GET    | `/api/nodes`            | Cluster inventory with live utilization       |
| GET    | `/api/nodes/summary`    | Cluster-wide totals for the dashboard header  |

Example job submission:

```bash
curl -X POST http://localhost:4000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "job_name": "resnet-train",
    "submitted_by": "mjafari",
    "partition": "gpu",
    "command": "python train.py --epochs 50",
    "cpus": 4,
    "memory_mb": 65536,
    "time_limit_min": 360
  }'
```

## What's simulated vs. real

- **Real:** REST API, SQLite persistence, input validation, resource-aware
  scheduling logic, node state tracking, filtering/sorting, cancel/delete
  lifecycle rules.
- **Simulated:** there's no actual compute happening — jobs "run" on a
  sped-up clock (a fraction of their stated time limit) so the dashboard
  shows movement without needing a real cluster behind it. This is called
  out explicitly in `simulator.js`.

## Possible extensions

- WebSocket push instead of polling
- Per-user auth and job ownership
- Job priority / preemption
- Historical job duration charts

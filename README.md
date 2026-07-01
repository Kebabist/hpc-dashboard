HPC Job Queue Dashboard

Components:
- backend/: Node.js HTTP server (no Express) using better-sqlite3 for persistence.
- frontend/: Vite + React app consuming the backend API.

Quick start

1. Backend

```bash
cd backend
npm install
node server.js
```

2. Frontend (dev)

```bash
cd frontend
npm install
npm run dev
```

Build frontend for production and serve from backend

```bash
cd frontend
npm run build
# copy frontend/dist to backend or let backend serve static build from frontend/dist
```

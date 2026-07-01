const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "cluster.db");

const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id            TEXT PRIMARY KEY,
    partition     TEXT NOT NULL,
    cpus_total    INTEGER NOT NULL,
    memory_total  INTEGER NOT NULL, -- MB
    state         TEXT NOT NULL DEFAULT 'idle' -- idle | mixed | allocated | down
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name      TEXT NOT NULL,
    submitted_by  TEXT NOT NULL,
    partition     TEXT NOT NULL,
    command       TEXT NOT NULL,
    cpus          INTEGER NOT NULL,
    memory_mb     INTEGER NOT NULL,
    time_limit_min INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | cancelled | failed
    node_id       TEXT,
    submitted_at  TEXT NOT NULL DEFAULT (datetime('now')),
    started_at    TEXT,
    finished_at   TEXT,
    exit_code     INTEGER,
    FOREIGN KEY (node_id) REFERENCES nodes(id)
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_submitted_by ON jobs(submitted_by);
`);

module.exports = db;

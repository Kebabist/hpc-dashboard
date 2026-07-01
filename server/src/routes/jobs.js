const express = require("express");
const db = require("../db");

const router = express.Router();

const VALID_PARTITIONS = new Set(["compute", "gpu", "highmem"]);
const VALID_STATUSES = new Set(["queued", "running", "completed", "cancelled", "failed"]);

// GET /api/jobs?status=running&user=m.jafari&partition=gpu&sort=submitted_at&order=desc
router.get("/", (req, res) => {
  const { status, user, partition, sort = "submitted_at", order = "desc" } = req.query;

  const allowedSort = new Set(["submitted_at", "job_name", "status", "cpus", "memory_mb", "started_at"]);
  const sortCol = allowedSort.has(sort) ? sort : "submitted_at";
  const sortOrder = order?.toLowerCase() === "asc" ? "ASC" : "DESC";

  const clauses = [];
  const params = {};

  if (status) {
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: `Invalid status filter: ${status}` });
    }
    clauses.push("status = @status");
    params.status = status;
  }
  if (user) {
    clauses.push("submitted_by = @user");
    params.user = user;
  }
  if (partition) {
    clauses.push("partition = @partition");
    params.partition = partition;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const jobs = db.prepare(`SELECT * FROM jobs ${where} ORDER BY ${sortCol} ${sortOrder}`).all(params);

  res.json({ jobs, count: jobs.length });
});

// GET /api/jobs/:id
router.get("/:id", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// POST /api/jobs
router.post("/", (req, res) => {
  const { job_name, submitted_by, partition, command, cpus, memory_mb, time_limit_min } = req.body;

  const errors = [];
  if (!job_name || typeof job_name !== "string" || !job_name.trim()) errors.push("job_name is required");
  if (!submitted_by || typeof submitted_by !== "string" || !submitted_by.trim()) errors.push("submitted_by is required");
  if (!VALID_PARTITIONS.has(partition)) errors.push(`partition must be one of: ${[...VALID_PARTITIONS].join(", ")}`);
  if (!command || typeof command !== "string" || !command.trim()) errors.push("command is required");
  if (!Number.isInteger(cpus) || cpus < 1 || cpus > 128) errors.push("cpus must be an integer between 1 and 128");
  if (!Number.isInteger(memory_mb) || memory_mb < 128 || memory_mb > 1048576) errors.push("memory_mb must be an integer between 128 and 1048576");
  if (!Number.isInteger(time_limit_min) || time_limit_min < 1 || time_limit_min > 10080) errors.push("time_limit_min must be an integer between 1 and 10080 (7 days)");

  if (errors.length) return res.status(422).json({ errors });

  const maxNodeCpus = db.prepare("SELECT MAX(cpus_total) AS m FROM nodes WHERE partition = ?").get(partition)?.m ?? 0;
  const maxNodeMem = db.prepare("SELECT MAX(memory_total) AS m FROM nodes WHERE partition = ?").get(partition)?.m ?? 0;
  if (cpus > maxNodeCpus || memory_mb > maxNodeMem) {
    return res.status(422).json({
      errors: [`Requested resources exceed the largest node in partition "${partition}" (max ${maxNodeCpus} CPUs / ${maxNodeMem} MB)`],
    });
  }

  const result = db
    .prepare(
      `INSERT INTO jobs (job_name, submitted_by, partition, command, cpus, memory_mb, time_limit_min, status)
       VALUES (@job_name, @submitted_by, @partition, @command, @cpus, @memory_mb, @time_limit_min, 'queued')`
    )
    .run({ job_name: job_name.trim(), submitted_by: submitted_by.trim(), partition, command: command.trim(), cpus, memory_mb, time_limit_min });

  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(job);
});

// POST /api/jobs/:id/cancel
router.post("/:id/cancel", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (!["queued", "running"].includes(job.status)) {
    return res.status(409).json({ error: `Job is already in a terminal state: ${job.status}` });
  }

  db.prepare(`UPDATE jobs SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?`).run(job.id);

  res.json(db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id));
});

// DELETE /api/jobs/:id  (removes a job record entirely, terminal states only)
router.delete("/:id", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (["queued", "running"].includes(job.status)) {
    return res.status(409).json({ error: "Cancel the job before deleting it" });
  }
  db.prepare("DELETE FROM jobs WHERE id = ?").run(job.id);
  res.status(204).send();
});

module.exports = router;

const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/nodes — cluster inventory with live utilization
router.get("/", (req, res) => {
  const nodes = db.prepare("SELECT * FROM nodes ORDER BY partition, id").all();

  const enriched = nodes.map((node) => {
    const used = db
      .prepare(
        `SELECT COALESCE(SUM(cpus), 0) AS cpus, COALESCE(SUM(memory_mb), 0) AS mem, COUNT(*) AS jobCount
         FROM jobs WHERE node_id = ? AND status = 'running'`
      )
      .get(node.id);

    return {
      ...node,
      cpus_used: used.cpus,
      memory_used: used.mem,
      running_jobs: used.jobCount,
      cpu_utilization: node.cpus_total ? Math.round((used.cpus / node.cpus_total) * 100) : 0,
      memory_utilization: node.memory_total ? Math.round((used.mem / node.memory_total) * 100) : 0,
    };
  });

  res.json({ nodes: enriched });
});

// GET /api/nodes/summary — cluster-wide totals for the header stats bar
router.get("/summary", (req, res) => {
  const totals = db.prepare("SELECT COALESCE(SUM(cpus_total),0) AS cpus, COALESCE(SUM(memory_total),0) AS mem, COUNT(*) AS nodeCount FROM nodes").get();
  const used = db
    .prepare(`SELECT COALESCE(SUM(cpus),0) AS cpus, COALESCE(SUM(memory_mb),0) AS mem FROM jobs WHERE status = 'running'`)
    .get();
  const jobCounts = db
    .prepare(`SELECT status, COUNT(*) AS c FROM jobs GROUP BY status`)
    .all()
    .reduce((acc, row) => ({ ...acc, [row.status]: row.c }), {});

  res.json({
    nodes: totals.nodeCount,
    cpus_total: totals.cpus,
    cpus_used: used.cpus,
    memory_total: totals.mem,
    memory_used: used.mem,
    cpu_utilization: totals.cpus ? Math.round((used.cpus / totals.cpus) * 100) : 0,
    jobs: {
      queued: jobCounts.queued || 0,
      running: jobCounts.running || 0,
      completed: jobCounts.completed || 0,
      cancelled: jobCounts.cancelled || 0,
      failed: jobCounts.failed || 0,
    },
  });
});

module.exports = router;

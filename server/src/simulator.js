const db = require("./db");

/**
 * A lightweight scheduler simulator.
 *
 * Every tick it:
 *  1. Tries to allocate queued jobs onto idle/mixed nodes with enough
 *     free CPU/memory in the matching partition (first-fit).
 *  2. Advances running jobs toward completion once their simulated
 *     runtime has elapsed, freeing the node's resources again.
 *
 * This intentionally mirrors the mental model of a SLURM scheduler
 * (partitions, node resource accounting, job state transitions)
 * without needing a real cluster.
 */

const TICK_MS = 2000;
const SIM_SPEED = 12; // 1 real second == 12 simulated seconds, so demo jobs finish in a reasonable time

function nodeFreeResources(nodeId) {
  const node = db.prepare("SELECT * FROM nodes WHERE id = ?").get(nodeId);
  if (!node) return null;
  const used = db
    .prepare(
      `SELECT COALESCE(SUM(cpus), 0) AS cpus, COALESCE(SUM(memory_mb), 0) AS mem
       FROM jobs WHERE node_id = ? AND status = 'running'`
    )
    .get(nodeId);
  return {
    cpusFree: node.cpus_total - used.cpus,
    memFree: node.memory_total - used.mem,
  };
}

function tryScheduleQueuedJobs() {
  const queued = db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY submitted_at ASC").all();
  const nodes = db.prepare("SELECT * FROM nodes").all();

  for (const job of queued) {
    const candidates = nodes.filter((n) => n.partition === job.partition && n.state !== "down");
    for (const node of candidates) {
      const free = nodeFreeResources(node.id);
      if (free && free.cpusFree >= job.cpus && free.memFree >= job.memory_mb) {
        db.prepare(
          `UPDATE jobs SET status = 'running', node_id = ?, started_at = datetime('now') WHERE id = ?`
        ).run(node.id, job.id);
        updateNodeState(node.id);
        break;
      }
    }
  }
}

function advanceRunningJobs() {
  const running = db.prepare("SELECT * FROM jobs WHERE status = 'running'").all();
  const now = Date.now();

  for (const job of running) {
    const startedAt = new Date(job.started_at + "Z").getTime();
    const simulatedElapsedMin = ((now - startedAt) / 60000) * SIM_SPEED;

    if (simulatedElapsedMin >= job.time_limit_min * 0.15) {
      // Jobs "complete" after a fraction of their stated time limit so
      // the dashboard shows movement instead of waiting for real hours to pass.
      const failed = Math.random() < 0.08; // small chance of a simulated failure, mirrors real clusters
      db.prepare(
        `UPDATE jobs SET status = ?, finished_at = datetime('now'), exit_code = ? WHERE id = ?`
      ).run(failed ? "failed" : "completed", failed ? 1 : 0, job.id);
      updateNodeState(job.node_id);
    }
  }
}

function updateNodeState(nodeId) {
  if (!nodeId) return;
  const free = nodeFreeResources(nodeId);
  const node = db.prepare("SELECT * FROM nodes WHERE id = ?").get(nodeId);
  if (!node) return;
  let state = "idle";
  if (free.cpusFree <= 0 || free.memFree <= 0) state = "allocated";
  else if (free.cpusFree < node.cpus_total) state = "mixed";
  db.prepare("UPDATE nodes SET state = ? WHERE id = ?").run(state, nodeId);
}

function tick() {
  advanceRunningJobs();
  tryScheduleQueuedJobs();
}

function start() {
  tick(); // run once immediately so the UI has data right away
  return setInterval(tick, TICK_MS);
}

module.exports = { start, tick };

// Lightweight smoke tests using Node's built-in test runner (Node 18+).
// Run with: npm test
// Uses an isolated in-memory-style DB file so it never touches dev data.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

process.env.DB_PATH = path.join(__dirname, "test.db");
if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);

const db = require("../src/db");
require("../src/seed");

const express = require("express");
const jobsRouter = require("../src/routes/jobs");

const app = express();
app.use(express.json());
app.use("/api/jobs", jobsRouter);

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      const http = require("node:http");
      const data = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path: url,
          method,
          headers: { "Content-Type": "application/json", ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}) },
        },
        (res) => {
          let raw = "";
          res.on("data", (c) => (raw += c));
          res.on("end", () => {
            server.close();
            resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
          });
        }
      );
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  });
}

test("GET /api/jobs returns seeded jobs", async () => {
  const res = await request("GET", "/api/jobs");
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 4);
});

test("POST /api/jobs rejects invalid partition", async () => {
  const res = await request("POST", "/api/jobs", {
    job_name: "bad-job",
    submitted_by: "tester",
    partition: "not-a-real-partition",
    command: "echo hi",
    cpus: 2,
    memory_mb: 1024,
    time_limit_min: 10,
  });
  assert.equal(res.status, 422);
});

test("POST /api/jobs creates a queued job", async () => {
  const res = await request("POST", "/api/jobs", {
    job_name: "unit-test-job",
    submitted_by: "tester",
    partition: "compute",
    command: "echo hi",
    cpus: 2,
    memory_mb: 1024,
    time_limit_min: 10,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "queued");
});

test("POST /api/jobs/:id/cancel cancels a queued job", async () => {
  const created = await request("POST", "/api/jobs", {
    job_name: "to-cancel",
    submitted_by: "tester",
    partition: "compute",
    command: "echo hi",
    cpus: 1,
    memory_mb: 512,
    time_limit_min: 5,
  });
  const res = await request("POST", `/api/jobs/${created.body.id}/cancel`);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "cancelled");
});

test.after(() => {
  db.close();
  if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);
  const wal = process.env.DB_PATH + "-wal";
  const shm = process.env.DB_PATH + "-shm";
  if (fs.existsSync(wal)) fs.unlinkSync(wal);
  if (fs.existsSync(shm)) fs.unlinkSync(shm);
});

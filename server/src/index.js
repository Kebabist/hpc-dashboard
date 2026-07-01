require("./db"); // ensures schema exists before anything else runs
require("./seed"); // idempotent: only inserts if tables are empty

const express = require("express");
const cors = require("cors");

const jobsRouter = require("./routes/jobs");
const nodesRouter = require("./routes/nodes");
const simulator = require("./simulator");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/jobs", jobsRouter);
app.use("/api/nodes", nodesRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler — keeps route handlers free of try/catch noise
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

simulator.start();

app.listen(PORT, () => {
  console.log(`HPC Job Queue API listening on port ${PORT}`);
});

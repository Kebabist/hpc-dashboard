import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import { api } from "./api.js";
import Header from "./components/Header.jsx";
import JobTable from "./components/JobTable.jsx";
import SubmitJobDrawer from "./components/SubmitJobDrawer.jsx";
import Toast from "./components/Toast.jsx";

const POLL_MS = 3000;

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [connected, setConnected] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [partitionFilter, setPartitionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("submitted_at");
  const [order, setOrder] = useState("desc");

  const loadAll = useCallback(async () => {
    try {
      const [jobsRes, nodesRes, summaryRes] = await Promise.all([
        api.getJobs({ status: statusFilter, partition: partitionFilter, user: userFilter, sort, order }),
        api.getNodes(),
        api.getSummary(),
      ]);
      setJobs(jobsRes.jobs);
      setNodes(nodesRes.nodes);
      setSummary(summaryRes);
      setConnected(true);
    } catch (err) {
      setConnected(false);
    }
  }, [statusFilter, partitionFilter, userFilter, sort, order]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, POLL_MS);
    return () => clearInterval(interval);
  }, [loadAll]);

  const visibleJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.trim().toLowerCase();
    return jobs.filter(
      (j) => j.job_name.toLowerCase().includes(q) || j.command.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  function handleSort(key) {
    if (key === sort) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
  }

  async function handleSubmit(payload) {
    await api.createJob(payload);
    setToast({ type: "success", text: `Job "${payload.job_name}" submitted.` });
    loadAll();
  }

  async function handleCancel(id) {
    setBusyId(id);
    try {
      await api.cancelJob(id);
      loadAll();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    setBusyId(id);
    try {
      await api.deleteJob(id);
      loadAll();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="app">
      <Header summary={summary} nodes={nodes} connected={connected} />

      <div className="toolbar">
        <div className="filters">
          <div className="search-field">
            <Search size={14} strokeWidth={2.25} aria-hidden="true" />
            <input
              placeholder="Search jobs or commands…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search jobs"
            />
          </div>

          <div className="select-field">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" />
          </div>

          <div className="select-field">
            <select value={partitionFilter} onChange={(e) => setPartitionFilter(e.target.value)} aria-label="Filter by partition">
              <option value="">All partitions</option>
              <option value="compute">compute</option>
              <option value="gpu">gpu</option>
              <option value="highmem">highmem</option>
            </select>
            <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" />
          </div>

          <input
            className="user-input"
            placeholder="Filter by user…"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            aria-label="Filter by user"
          />
        </div>
        <button className="btn btn-primary" onClick={() => setDrawerOpen(true)}>
          <Plus size={15} strokeWidth={2.5} />
          Submit job
        </button>
      </div>

      <p className="results-count">
        Showing {visibleJobs.length} of {jobs.length} job{jobs.length === 1 ? "" : "s"}
      </p>

      <JobTable
        jobs={visibleJobs}
        sort={sort}
        order={order}
        onSort={handleSort}
        onCancel={handleCancel}
        onDelete={handleDelete}
        busyId={busyId}
      />

      <p className="footer-note">
        Polling every {POLL_MS / 1000}s · Jobs auto-schedule onto idle nodes and complete on a simulated clock.
      </p>

      {drawerOpen && <SubmitJobDrawer onClose={() => setDrawerOpen(false)} onSubmit={handleSubmit} />}

      <Toast toast={toast} />
    </div>
  );
}

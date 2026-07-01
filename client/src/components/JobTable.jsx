import { ArrowUp, ArrowDown, ArrowUpDown, Inbox } from "lucide-react";
import JobRow from "./JobRow.jsx";

const COLUMNS = [
  { key: null, label: "ID" },
  { key: "job_name", label: "Job" },
  { key: null, label: "User" },
  { key: "status", label: "Status" },
  { key: null, label: "Partition" },
  { key: null, label: "Node" },
  { key: "cpus", label: "CPUs" },
  { key: "memory_mb", label: "Memory" },
  { key: "started_at", label: "Elapsed" },
  { key: null, label: "" },
];

export default function JobTable({ jobs, sort, order, onSort, onCancel, onDelete, busyId }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = col.key === sort;
              const SortIcon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th
                  key={col.label}
                  className={active ? "active" : ""}
                  onClick={col.key ? () => onSort(col.key) : undefined}
                  data-sortable={col.key ? "true" : "false"}
                >
                  <span className="th-content">
                    {col.label}
                    {col.key && <SortIcon size={11} strokeWidth={2.5} className={`sort-icon ${active ? "active" : ""}`} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} onCancel={onCancel} onDelete={onDelete} busy={busyId === job.id} />
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && (
        <div className="empty-state">
          <Inbox size={28} strokeWidth={1.5} aria-hidden="true" />
          <p>No jobs match the current filters.</p>
        </div>
      )}
    </div>
  );
}

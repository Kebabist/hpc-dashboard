import { Cpu, Zap, Database, X, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";

const PARTITION_ICON = { compute: Cpu, gpu: Zap, highmem: Database };

function formatElapsed(job) {
  if (!job.started_at) return "–";
  const start = new Date(job.started_at + "Z").getTime();
  const end = job.finished_at ? new Date(job.finished_at + "Z").getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatMem(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export default function JobRow({ job, onCancel, onDelete, busy }) {
  const canCancel = job.status === "queued" || job.status === "running";
  const canDelete = !canCancel;
  const PartitionIcon = PARTITION_ICON[job.partition] || Cpu;

  return (
    <tr>
      <td className="mono id-cell">#{job.id}</td>
      <td className="job-name-cell">
        <div className="job-name" title={job.job_name}>{job.job_name}</div>
        <div className="job-command mono" title={job.command}>{job.command}</div>
      </td>
      <td>
        <span className="user-chip" title={job.submitted_by}>{job.submitted_by}</span>
      </td>
      <td>
        <StatusBadge status={job.status} />
      </td>
      <td>
        <span className="partition-chip" data-partition={job.partition}>
          <PartitionIcon size={12} strokeWidth={2.25} aria-hidden="true" />
          {job.partition}
        </span>
      </td>
      <td className="mono">{job.node_id || "–"}</td>
      <td className="mono">{job.cpus}</td>
      <td className="mono">{formatMem(job.memory_mb)}</td>
      <td className="mono">{formatElapsed(job)}</td>
      <td className="actions-cell">
        {canCancel && (
          <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => onCancel(job.id)} title="Cancel job">
            <X size={13} strokeWidth={2.5} />
            Cancel
          </button>
        )}
        {canDelete && (
          <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => onDelete(job.id)} title="Remove job">
            <Trash2 size={13} strokeWidth={2.25} />
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}

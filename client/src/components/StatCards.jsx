import { Clock, Play, CheckCircle2, XCircle, Gauge } from "lucide-react";

const CARDS = [
  { key: "queued", label: "Queued", icon: Clock, tone: "amber" },
  { key: "running", label: "Running", icon: Play, tone: "cyan" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "green" },
  { key: "failed", label: "Failed", icon: XCircle, tone: "red" },
];

export default function StatCards({ summary }) {
  return (
    <div className="stat-cards">
      {CARDS.map(({ key, label, icon: Icon, tone }) => (
        <div className="stat-card" key={key} data-tone={tone}>
          <span className="stat-card-icon" aria-hidden="true">
            <Icon size={16} strokeWidth={2.25} />
          </span>
          <div className="stat-card-body">
            <span className="stat-card-value">{summary?.jobs[key] ?? "–"}</span>
            <span className="stat-card-label">{label}</span>
          </div>
        </div>
      ))}

      <div className="stat-card stat-card-util" data-tone="violet">
        <span className="stat-card-icon" aria-hidden="true">
          <Gauge size={16} strokeWidth={2.25} />
        </span>
        <div className="stat-card-body">
          <span className="stat-card-value">{summary ? `${summary.cpu_utilization}%` : "–"}</span>
          <span className="stat-card-label">CPU utilization</span>
        </div>
        <div className="stat-card-bar" aria-hidden="true">
          <div className="stat-card-bar-fill" style={{ width: `${summary?.cpu_utilization ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
}

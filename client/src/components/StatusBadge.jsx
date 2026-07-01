import { Clock, Play, CheckCircle2, Ban, XCircle } from "lucide-react";

const CONFIG = {
  queued: { icon: Clock, label: "queued" },
  running: { icon: Play, label: "running" },
  completed: { icon: CheckCircle2, label: "completed" },
  cancelled: { icon: Ban, label: "cancelled" },
  failed: { icon: XCircle, label: "failed" },
};

export default function StatusBadge({ status }) {
  const { icon: Icon, label } = CONFIG[status] || CONFIG.queued;
  return (
    <span className="badge" data-status={status}>
      <Icon className="glyph" size={11} strokeWidth={2.75} aria-hidden="true" />
      {label}
    </span>
  );
}

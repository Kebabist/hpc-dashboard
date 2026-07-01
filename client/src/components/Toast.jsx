import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Toast({ toast }) {
  if (!toast) return null;
  const Icon = toast.type === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className="toast-stack">
      <div className="toast" data-type={toast.type}>
        <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
        <span>{toast.text}</span>
      </div>
    </div>
  );
}

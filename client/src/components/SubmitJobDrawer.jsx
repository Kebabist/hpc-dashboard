import { useState } from "react";
import { X, Terminal, Loader2 } from "lucide-react";

const PARTITIONS = [
  { value: "compute", label: "compute — general CPU nodes" },
  { value: "gpu", label: "gpu — GPU-accelerated nodes" },
  { value: "highmem", label: "highmem — large-memory nodes" },
];

const DEFAULTS = {
  job_name: "",
  submitted_by: "",
  partition: "compute",
  command: "",
  cpus: 4,
  memory_mb: 4096,
  time_limit_min: 60,
};

export default function SubmitJobDrawer({ onClose, onSubmit }) {
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);

    const payload = {
      ...form,
      job_name: form.job_name.trim(),
      submitted_by: form.submitted_by.trim(),
      command: form.command.trim(),
      cpus: Number(form.cpus),
      memory_mb: Number(form.memory_mb),
      time_limit_min: Number(form.time_limit_min),
    };

    if (!payload.job_name) return setErrors(["Job name is required."]);
    if (!payload.submitted_by) return setErrors(["Submitted-by (your username) is required."]);
    if (!payload.command) return setErrors(["Command is required."]);

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="submit-job-title">
        <div className="drawer-header">
          <span className="drawer-title" id="submit-job-title">Submit job</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="form-errors">
            <strong>Couldn't submit job:</strong>
            <ul>
              {errors.map((err) => <li key={err}>{err}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="job_name">Job name</label>
            <input
              id="job_name"
              value={form.job_name}
              onChange={(e) => update("job_name", e.target.value)}
              placeholder="e.g. genome-align-batch3"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="submitted_by">Submitted by</label>
            <input
              id="submitted_by"
              value={form.submitted_by}
              onChange={(e) => update("submitted_by", e.target.value)}
              placeholder="your username"
            />
          </div>

          <div className="field">
            <label htmlFor="partition">Partition</label>
            <select id="partition" value={form.partition} onChange={(e) => update("partition", e.target.value)}>
              {PARTITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="command">Command</label>
            <div className="command-input">
              <Terminal size={13} strokeWidth={2.25} aria-hidden="true" />
              <textarea
                id="command"
                value={form.command}
                onChange={(e) => update("command", e.target.value)}
                placeholder="python train.py --epochs 50"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="cpus">CPUs</label>
              <input id="cpus" type="number" min="1" max="128" value={form.cpus} onChange={(e) => update("cpus", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="memory_mb">Memory (MB)</label>
              <input id="memory_mb" type="number" min="128" step="128" value={form.memory_mb} onChange={(e) => update("memory_mb", e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="time_limit_min">Time limit (minutes)</label>
            <input id="time_limit_min" type="number" min="1" max="10080" value={form.time_limit_min} onChange={(e) => update("time_limit_min", e.target.value)} />
            <span className="field-hint">Job is auto-cancelled by the scheduler if it exceeds this limit.</span>
          </div>

          <div className="drawer-footer">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={14} className="spin" strokeWidth={2.5} /> : null}
              {submitting ? "Submitting…" : "Submit job"}
            </button>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

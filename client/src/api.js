// Thin fetch wrapper. Vite's dev proxy (see vite.config.js) forwards
// /api/* to the Express server, so this works unchanged in dev and prod
// as long as the client is served from the same origin as the API,
// or VITE_API_BASE_URL is set at build time for a split deployment.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message = body?.errors?.join(", ") || body?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  getJobs: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    return request(`/jobs${qs.toString() ? `?${qs}` : ""}`);
  },
  createJob: (payload) => request("/jobs", { method: "POST", body: JSON.stringify(payload) }),
  cancelJob: (id) => request(`/jobs/${id}/cancel`, { method: "POST" }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),
  getNodes: () => request("/nodes"),
  getSummary: () => request("/nodes/summary"),
};

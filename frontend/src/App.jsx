import React, { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

function timeAgo(ts) {
  if (!ts) return '-'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm'
  const h = Math.floor(m / 60)
  return h + 'h'
}

export default function App() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', owner: '', requested_cpus: 1, requested_memory_mb: 512, command: '' })

  async function fetchJobs() {
    setLoading(true)
    const res = await fetch(API_BASE + '/api/jobs')
    const data = await res.json()
    setJobs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchJobs()
    const t = setInterval(fetchJobs, 3000)
    return () => clearInterval(t)
  }, [])

  async function submit(e) {
    e.preventDefault()
    await fetch(API_BASE + '/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setForm({ name: '', owner: '', requested_cpus: 1, requested_memory_mb: 512, command: '' })
    fetchJobs()
  }

  async function cancel(id) {
    await fetch(API_BASE + `/api/jobs/${id}/cancel`, { method: 'POST' })
    fetchJobs()
  }

  return (
    <div className="container">
      <h1>HPC Job Queue Dashboard</h1>
      <div className="grid">
        <div className="card">
          <h2>Submit Job</h2>
          <form onSubmit={submit} className="form">
            <label>Job name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Owner<input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></label>
            <label>CPUs<input type="number" value={form.requested_cpus} onChange={e => setForm({ ...form, requested_cpus: Number(e.target.value) })} /></label>
            <label>Memory (MB)<input type="number" value={form.requested_memory_mb} onChange={e => setForm({ ...form, requested_memory_mb: Number(e.target.value) })} /></label>
            <label>Command<input value={form.command} onChange={e => setForm({ ...form, command: e.target.value })} /></label>
            <div className="actions"><button type="submit">Submit</button></div>
          </form>
        </div>

        <div className="card wide">
          <h2>Queue</h2>
          {loading ? <div>Loading…</div> : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>CPUs</th>
                  <th>Memory</th>
                  <th>Elapsed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className={job.state}>
                    <td>{job.id}</td>
                    <td>{job.name}</td>
                    <td>{job.owner}</td>
                    <td>{job.state}</td>
                    <td>{job.requested_cpus}</td>
                    <td>{job.requested_memory_mb}</td>
                    <td>{job.started_at ? timeAgo(job.started_at) : (job.submitted_at ? timeAgo(job.submitted_at) : '-')}</td>
                    <td>
                      {job.state !== 'done' && job.state !== 'cancelled' ? (
                        <button onClick={() => cancel(job.id)}>Cancel</button>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'jobs.db');
const PORT = process.env.PORT || 3001;

const db = new Database(DB_PATH);

function initDb() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      owner TEXT,
      state TEXT,
      requested_cpus INTEGER,
      requested_memory_mb INTEGER,
      command TEXT,
      submitted_at INTEGER,
      started_at INTEGER,
      ended_at INTEGER,
      cancel_requested_at INTEGER
    )
  `).run();
}

initDb();

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        const obj = data ? JSON.parse(data) : {};
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsed.pathname;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    return res.end();
  }

  try {
    if (method === 'GET' && pathname === '/api/jobs') {
      const rows = db.prepare('SELECT * FROM jobs ORDER BY submitted_at DESC').all();
      return json(res, 200, rows.map(r => ({
        ...r,
        submitted_at: r.submitted_at || null,
        started_at: r.started_at || null,
        ended_at: r.ended_at || null
      })));
    }

    if (method === 'POST' && pathname === '/api/jobs') {
      const body = await parseBody(req);
      const now = Date.now();
      const stmt = db.prepare(`INSERT INTO jobs (name, owner, state, requested_cpus, requested_memory_mb, command, submitted_at) VALUES (?, ?, 'queued', ?, ?, ?, ?)`);
      const info = stmt.run(body.name || 'job', body.owner || 'user', body.requested_cpus || 1, body.requested_memory_mb || 512, body.command || '', now);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(info.lastInsertRowid);
      return json(res, 201, job);
    }

    // Cancel endpoint: POST /api/jobs/:id/cancel
    if (method === 'POST' && pathname.match(/^\/api\/jobs\/\d+\/cancel$/)) {
      const id = parseInt(pathname.split('/')[3], 10);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
      if (!job) return json(res, 404, { error: 'job not found' });
      if (job.state === 'done' || job.state === 'failed' || job.state === 'cancelled') {
        return json(res, 400, { error: 'cannot cancel job in state ' + job.state });
      }
      const now = Date.now();
      db.prepare('UPDATE jobs SET state = ?, cancel_requested_at = ? WHERE id = ?').run('cancelled', now, id);
      const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
      return json(res, 200, updated);
    }

    if (method === 'GET' && pathname === '/api/health') {
      return json(res, 200, { status: 'ok' });
    }

    // serve static frontend build if exists
    const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
    if (fs.existsSync(FRONTEND_DIST)) {
      // serve index
      if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        const index = path.join(FRONTEND_DIST, 'index.html');
        if (fs.existsSync(index)) {
          const content = fs.readFileSync(index, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(content);
        }
      }

      // serve other static files
      if (method === 'GET') {
        const filePath = path.join(FRONTEND_DIST, pathname.replace(/(^\/) /, ''));
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const types = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
          };
          res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    json(res, 404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

// Simple in-process simulator: move queued jobs to running and then done
function simulate() {
  const queued = db.prepare("SELECT * FROM jobs WHERE state = 'queued' ORDER BY submitted_at ASC LIMIT 1").get();
  if (queued) {
    const now = Date.now();
    db.prepare("UPDATE jobs SET state = 'running', started_at = ? WHERE id = ?").run(now, queued.id);
    // finish after 5-12 seconds
    const runtime = 5000 + Math.floor(Math.random() * 7000);
    setTimeout(() => {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(queued.id);
      if (job && job.state === 'running') {
        const end = Date.now();
        db.prepare("UPDATE jobs SET state = 'done', ended_at = ? WHERE id = ?").run(end, queued.id);
      }
    }, runtime);
  }
}

setInterval(simulate, 3000);

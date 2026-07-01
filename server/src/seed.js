const db = require("./db");

const NODES = [
  { id: "cn-01", partition: "compute", cpus_total: 32, memory_total: 131072 },
  { id: "cn-02", partition: "compute", cpus_total: 32, memory_total: 131072 },
  { id: "cn-03", partition: "compute", cpus_total: 32, memory_total: 131072 },
  { id: "cn-04", partition: "compute", cpus_total: 32, memory_total: 131072 },
  { id: "cn-05", partition: "compute", cpus_total: 32, memory_total: 131072 },
  { id: "cn-06", partition: "compute", cpus_total: 32, memory_total: 131072, state: "down" },
  { id: "gpu-01", partition: "gpu", cpus_total: 16, memory_total: 262144 },
  { id: "gpu-02", partition: "gpu", cpus_total: 16, memory_total: 262144 },
  { id: "gpu-03", partition: "gpu", cpus_total: 16, memory_total: 262144 },
  { id: "himem-01", partition: "highmem", cpus_total: 24, memory_total: 524288 },
  { id: "himem-02", partition: "highmem", cpus_total: 24, memory_total: 524288 },
];

function seedNodes() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO nodes (id, partition, cpus_total, memory_total, state) VALUES (@id, @partition, @cpus_total, @memory_total, @state)`
  );
  const tx = db.transaction((nodes) => nodes.forEach((n) => insert.run({ ...n, state: n.state || "idle" })));
  tx(NODES);
}

// Returns a SQLite-compatible UTC timestamp ("YYYY-MM-DD HH:MM:SS") offset
// `minutes` into the past, matching the format datetime('now') produces.
function ago(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString().slice(0, 19).replace("T", " ");
}

// A representative cross-section of real HPC workloads -- genomics, ML
// training, CFD, climate, chemistry, physics, rendering and data
// engineering -- spread across every partition and every job status so the
// dashboard demonstrates its full range of states on first load.
const DEMO_JOBS = [
  // -- running --------------------------------------------------------
  { job_name: "rna-seq-star-align", submitted_by: "l.chen", partition: "compute", command: "STAR --runThreadN 12 --genomeDir idx --readFilesIn r1.fq r2.fq", cpus: 12, memory_mb: 24576, time_limit_min: 300, status: "running", node_id: "cn-01", started: ago(2) },
  { job_name: "cfd-turbulence-les", submitted_by: "a.hosseini", partition: "compute", command: "mpirun -np 16 ./solver --les turbulence.cfg", cpus: 16, memory_mb: 32768, time_limit_min: 600, status: "running", node_id: "cn-02", started: ago(6) },
  { job_name: "gromacs-md-dock", submitted_by: "p.silva", partition: "compute", command: "gmx mdrun -deffnm complex -nb gpu", cpus: 20, memory_mb: 40960, time_limit_min: 600, status: "running", node_id: "cn-03", started: ago(8) },
  { job_name: "resnet50-imagenet-train", submitted_by: "s.karimi", partition: "gpu", command: "python train.py --model resnet50 --epochs 90", cpus: 4, memory_mb: 65536, time_limit_min: 480, status: "running", node_id: "gpu-01", started: ago(4) },
  { job_name: "stable-diffusion-finetune", submitted_by: "n.gupta", partition: "gpu", command: "accelerate launch train_diffusion.py --resolution 1024", cpus: 8, memory_mb: 131072, time_limit_min: 720, status: "running", node_id: "gpu-02", started: ago(3) },
  { job_name: "wrf-regional-forecast", submitted_by: "e.andersson", partition: "highmem", command: "./wrf.exe -c namelist.forecast", cpus: 12, memory_mb: 262144, time_limit_min: 600, status: "running", node_id: "himem-01", started: ago(1) },

  // -- queued -----------------------------------------------------------
  { job_name: "bert-large-finetune", submitted_by: "s.karimi", partition: "gpu", command: "python finetune.py --model bert-large --tasks glue", cpus: 8, memory_mb: 98304, time_limit_min: 360, status: "queued" },
  { job_name: "seismic-kirchhoff-migration", submitted_by: "t.oyelaran", partition: "compute", command: "./seismic-mig --input survey_2026.segy", cpus: 24, memory_mb: 49152, time_limit_min: 420, status: "queued" },
  { job_name: "spark-etl-nightly", submitted_by: "k.nowak", partition: "highmem", command: "spark-submit --deploy-mode cluster etl_pipeline.py", cpus: 16, memory_mb: 196608, time_limit_min: 180, status: "queued" },
  { job_name: "monte-carlo-var-risk", submitted_by: "f.kowalski", partition: "compute", command: "python risk_sim.py --paths 5000000", cpus: 8, memory_mb: 16384, time_limit_min: 120, status: "queued" },
  { job_name: "lattice-qcd-propagator", submitted_by: "r.tanaka", partition: "compute", command: "mpirun -np 28 ./chroma -i qcd.ini.xml", cpus: 28, memory_mb: 57344, time_limit_min: 720, status: "queued" },

  // -- completed ----------------------------------------------------------
  { job_name: "genome-align-batch3", submitted_by: "m.jafari", partition: "compute", command: "bwa mem -t 8 ref.fa reads.fq", cpus: 8, memory_mb: 16384, time_limit_min: 120, status: "completed", node_id: "cn-04", started: ago(180), finished: ago(160), exit_code: 0 },
  { job_name: "alphafold2-structure-predict", submitted_by: "n.gupta", partition: "gpu", command: "run_alphafold.sh --fasta target.fasta --db_preset full_dbs", cpus: 8, memory_mb: 131072, time_limit_min: 240, status: "completed", node_id: "gpu-03", started: ago(360), finished: ago(240), exit_code: 0 },
  { job_name: "ocean-circulation-mom6", submitted_by: "e.andersson", partition: "highmem", command: "./MOM6 --input ocean_config.nml", cpus: 16, memory_mb: 393216, time_limit_min: 480, status: "completed", node_id: "himem-02", started: ago(1440), finished: ago(1320), exit_code: 0 },
  { job_name: "vasp-dft-bandstructure", submitted_by: "r.tanaka", partition: "compute", command: "mpirun -np 16 vasp_std", cpus: 16, memory_mb: 65536, time_limit_min: 200, status: "completed", node_id: "cn-05", started: ago(300), finished: ago(210), exit_code: 0 },
  { job_name: "llm-eval-mmlu-batch", submitted_by: "s.karimi", partition: "gpu", command: "python eval.py --benchmark mmlu --model checkpoint-8b", cpus: 4, memory_mb: 49152, time_limit_min: 60, status: "completed", node_id: "gpu-01", started: ago(30), finished: ago(12), exit_code: 0 },
  { job_name: "genome-assembly-denovo", submitted_by: "l.chen", partition: "highmem", command: "spades.py --meta -1 r1.fq -2 r2.fq -o assembly", cpus: 20, memory_mb: 458752, time_limit_min: 300, status: "completed", node_id: "himem-01", started: ago(720), finished: ago(480), exit_code: 0 },
  { job_name: "blender-farm-render-seq", submitted_by: "p.silva", partition: "gpu", command: "blender -b scene.blend -o //frame_ -f 1..240", cpus: 8, memory_mb: 65536, time_limit_min: 300, status: "completed", node_id: "gpu-02", started: ago(600), finished: ago(510), exit_code: 0 },
  { job_name: "financial-risk-mc-backtest", submitted_by: "f.kowalski", partition: "compute", command: "python risk_sim.py --paths 1000000 --backtest", cpus: 8, memory_mb: 16384, time_limit_min: 60, status: "completed", node_id: "cn-02", started: ago(2820), finished: ago(2780), exit_code: 0 },

  // -- cancelled ------------------------------------------------------
  { job_name: "diffusion-hparam-sweep-v3", submitted_by: "n.gupta", partition: "gpu", command: "python sweep.py --config sweep_v3.yaml", cpus: 8, memory_mb: 65536, time_limit_min: 600, status: "cancelled", node_id: "gpu-03", started: ago(300), finished: ago(290) },
  { job_name: "cfd-turbulence-les-v2", submitted_by: "a.hosseini", partition: "compute", command: "mpirun -np 16 ./solver --les turbulence_v2.cfg", cpus: 16, memory_mb: 32768, time_limit_min: 600, status: "cancelled", finished: ago(60) },
  { job_name: "etl-backfill-2025", submitted_by: "k.nowak", partition: "highmem", command: "spark-submit backfill.py --year 2025", cpus: 12, memory_mb: 131072, time_limit_min: 240, status: "cancelled", node_id: "himem-02", started: ago(600), finished: ago(585) },

  // -- failed -----------------------------------------------------------
  { job_name: "resnet50-imagenet-train-v0", submitted_by: "s.karimi", partition: "gpu", command: "python train.py --model resnet50 --epochs 90 --batch-size 1024", cpus: 8, memory_mb: 262144, time_limit_min: 360, status: "failed", node_id: "gpu-03", started: ago(240), finished: ago(230), exit_code: 137 },
  { job_name: "seismic-kirchhoff-migration-v0", submitted_by: "t.oyelaran", partition: "compute", command: "./seismic-mig --input survey_2025.segy", cpus: 24, memory_mb: 49152, time_limit_min: 200, status: "failed", node_id: "cn-04", started: ago(420), finished: ago(400), exit_code: 1 },
  { job_name: "vasp-dft-bandstructure-v0", submitted_by: "r.tanaka", partition: "highmem", command: "mpirun -np 16 vasp_std", cpus: 16, memory_mb: 65536, time_limit_min: 180, status: "failed", node_id: "himem-01", started: ago(540), finished: ago(530), exit_code: 139 },
];

function seedJobs() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM jobs").get().c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO jobs (job_name, submitted_by, partition, command, cpus, memory_mb, time_limit_min, status, node_id, started_at, finished_at, exit_code)
    VALUES (@job_name, @submitted_by, @partition, @command, @cpus, @memory_mb, @time_limit_min, @status, @node_id, @started_at, @finished_at, @exit_code)
  `);

  const tx = db.transaction((jobs) => {
    jobs.forEach((j) =>
      insert.run({
        job_name: j.job_name,
        submitted_by: j.submitted_by,
        partition: j.partition,
        command: j.command,
        cpus: j.cpus,
        memory_mb: j.memory_mb,
        time_limit_min: j.time_limit_min,
        status: j.status,
        node_id: j.node_id ?? null,
        started_at: j.started ?? null,
        finished_at: j.finished ?? null,
        exit_code: j.exit_code ?? null,
      })
    );
  });
  tx(DEMO_JOBS);
}

seedNodes();
seedJobs();
console.log(`Seed complete: ${NODES.length} nodes and ${DEMO_JOBS.length} demo jobs inserted.`);

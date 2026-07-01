const LEGEND = [
  { key: "idle", label: "Idle" },
  { key: "low", label: "<30%" },
  { key: "mid", label: "30–75%" },
  { key: "high", label: ">75%" },
  { key: "down", label: "Down" },
];

function loadLevel(node) {
  if (node.state === "down") return "down";
  if (node.cpu_utilization >= 75) return "high";
  if (node.cpu_utilization >= 30) return "mid";
  if (node.cpu_utilization > 0) return "low";
  return "idle";
}

export default function NodeGrid({ nodes }) {
  return (
    <div className="node-panel">
      <div className="node-panel-head">
        <span className="node-grid-label">Nodes ({nodes.length})</span>
        <div className="node-legend">
          {LEGEND.map((item) => (
            <span className="legend-item" key={item.key}>
              <span className="legend-swatch" data-load={item.key} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="node-grid-cells">
        {nodes.map((node) => {
          const down = node.state === "down";
          return (
            <div
              key={node.id}
              className="node-cell"
              data-load={loadLevel(node)}
              title={
                down
                  ? `${node.id} · ${node.partition} · offline`
                  : `${node.id} · ${node.partition} · ${node.cpu_utilization}% CPU · ${node.running_jobs} job(s)`
              }
            >
              {down ? "×" : node.cpu_utilization > 0 ? node.cpu_utilization : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

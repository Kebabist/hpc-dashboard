import { Server, Radio } from "lucide-react";
import NodeGrid from "./NodeGrid.jsx";
import StatCards from "./StatCards.jsx";

export default function Header({ summary, nodes, connected }) {
  return (
    <header className="header">
      <div className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            <Server size={18} strokeWidth={2} />
          </span>
          <div className="brand-text">
            <div className="brand-title">cluster // job queue</div>
            <span className="brand-sub">SLURM-style scheduler dashboard</span>
          </div>
        </div>

        <span className={`conn-status ${connected ? "" : "offline"}`}>
          <Radio size={12} strokeWidth={2.5} />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </div>

      <StatCards summary={summary} />

      {nodes.length > 0 && <NodeGrid nodes={nodes} />}
    </header>
  );
}

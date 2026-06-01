const steps = [
  "DreamDEX Mainnet Events",
  "Upstream WebSocket",
  "Node SSE endpoint",
  "useDexStream hook",
  "Event normalizer",
  "Rolling metrics + orderbook engine + anomaly rules",
  "DreamFlow UI + optional Pulse Agent",
];

export function DeveloperProof() {
  return (
    <section className="bb-panel p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="bb-title">DATA PIPELINE</h2>
          <p className="bb-label">HOW DREAMFLOW GETS REAL DATA</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Real Somnia mainnet data", "No mock order events", "Decoded event stream", "SSE to browser", "Optional AI grounded in stream evidence"].map((item) => (
          <span key={item} className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] px-2 py-1 text-[11px] uppercase text-[var(--text-secondary)]">
            {item.toUpperCase()}
          </span>
        ))}
      </div>

      <ol className="mt-3 space-y-1">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--border-panel)] bg-[var(--bg-terminal)] font-mono text-[10px] text-[var(--text-primary)]">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

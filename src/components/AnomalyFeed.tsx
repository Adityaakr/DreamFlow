import type { Anomaly } from "@/types/dex";

const severityClass = {
  calm: "border-[rgba(255,255,255,0.12)] text-[var(--text-primary)]",
  active: "border-[rgba(0,210,106,0.3)] text-[var(--accent-green)]",
  volatile: "border-[rgba(255,102,0,0.3)] text-[var(--accent-orange)]",
  stressed: "border-[rgba(255,59,59,0.3)] text-[var(--accent-red)]",
};

export function AnomalyFeed({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <section className="bb-panel p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="bb-title">ANOMALY FEED</h2>
          <p className="bb-label">RULE-BASED DETECTION</p>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{anomalies.length}</span>
      </div>

      {anomalies.length === 0 ? (
        <div className="flex min-h-52 items-center justify-center border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-4 text-xs text-[var(--text-secondary)]">
          NO ANOMALIES IN CURRENT WINDOW
        </div>
      ) : (
        <div className="space-y-2">
          {anomalies.slice(0, 6).map((anomaly) => (
            <article key={anomaly.id} className={`border bg-[var(--bg-terminal)] p-2 ${severityClass[anomaly.severity]}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-black text-[var(--text-primary)]">{anomaly.headline.toUpperCase()}</h3>
                <span className="text-[10px] font-bold uppercase">{anomaly.severity}</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {anomaly.eventCount} EVENTS · {anomaly.window.toUpperCase()}
              </p>
              <ul className="mt-2 space-y-1">
                {anomaly.evidence.slice(0, 3).map((item) => (
                  <li key={item} className="text-[11px] text-[var(--text-secondary)]">{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import { formatClock, shortenAddress } from "@/lib/format";
import type { ActorProfile } from "@/types/dex";

export function ActorFlow({ actors }: { actors: ActorProfile[] }) {
  return (
    <section className="bb-panel p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="bb-title">ACTOR FLOW</h2>
          <p className="bb-label">TOP ADDRESSES · BEHAVIORAL LABELS ONLY</p>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{actors.length}</span>
      </div>

      {actors.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-4 text-xs text-[var(--text-secondary)]">
          NO OWNER ADDRESSES OBSERVED YET
        </div>
      ) : (
        <div className="space-y-1">
          {actors.map((actor) => (
            <article key={actor.address} className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-2">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs font-black text-[var(--accent-orange)]">{shortenAddress(actor.address)}</p>
                <span className="border border-[var(--border-panel)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--text-secondary)]">{actor.label}</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-[var(--text-muted)]">
                <span>{actor.eventCount} EVT</span>
                <span>{actor.placements} PLC</span>
                <span>{actor.fills} FIL</span>
                <span>{actor.cancels} CXL</span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">LAST {formatClock(actor.lastSeen)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

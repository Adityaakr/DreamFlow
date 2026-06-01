import { useState } from "react";
import { X } from "lucide-react";
import { formatClock, shortenAddress } from "@/lib/format";
import type { ActorProfile } from "@/types/dex";

function actorAssistantRead(actor: ActorProfile) {
  const cancelRatio = actor.placements > 0 ? actor.cancels / actor.placements : null;
  const fillRatio = actor.placements > 0 ? actor.fills / actor.placements : null;

  if (actor.eventCount >= 50 && cancelRatio !== null && cancelRatio > 0.6) {
    return "AI-assisted read: this address is highly active and cancels a large share of its observed placements. In this session, that pattern looks like active quote management or liquidity probing, not a confirmed directional trade.";
  }
  if (actor.fills >= actor.placements && actor.fills > 0) {
    return "AI-assisted read: this address is showing more filled activity than resting placement activity in the retained stream. It may be interacting as a taker or participating in matched flow, based only on observed events.";
  }
  if (fillRatio !== null && fillRatio > 0.35) {
    return "AI-assisted read: this address has meaningful execution relative to its placements. It is worth checking nearby fills and order lifecycle events before treating the behavior as passive liquidity provision.";
  }
  if (actor.placements > actor.fills + actor.cancels) {
    return "AI-assisted read: this address has more observed placements than exits or fills. It may be adding visible liquidity in the current session, though the reconstruction is session-bound.";
  }
  return "AI-assisted read: this address has limited or mixed activity in the retained stream. The profile is useful for inspection, but there is not enough evidence to infer intent.";
}

function formatRatio(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function ActorDetailDialog({
  actor,
  onClose,
}: {
  actor: ActorProfile;
  onClose: () => void;
}) {
  const cancelRatio = actor.placements > 0 ? actor.cancels / actor.placements : null;
  const fillRatio = actor.placements > 0 ? actor.fills / actor.placements : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="actor-detail-title">
      <div className="bb-panel max-h-[90vh] w-full max-w-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-panel)] p-4">
          <div className="min-w-0">
            <p className="bb-label">ACTOR DETAIL</p>
            <h3 id="actor-detail-title" className="mt-1 break-all font-mono text-sm font-black text-[var(--accent-orange)]">
              {actor.address}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bb-focus inline-flex min-h-10 min-w-10 items-center justify-center border border-[var(--border-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close actor details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-86px)] overflow-auto p-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Label</p>
              <p className="mt-1 text-xs font-black uppercase text-[var(--text-primary)]">{actor.label}</p>
            </div>
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Events</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{actor.eventCount}</p>
            </div>
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Fill / Place</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{formatRatio(fillRatio)}</p>
            </div>
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Cancel / Place</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{formatRatio(cancelRatio)}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-px bg-[var(--border-panel)] text-xs sm:grid-cols-4">
            <div className="bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Placements</p>
              <p className="mt-1 font-mono text-[var(--text-primary)]">{actor.placements}</p>
            </div>
            <div className="bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Fills</p>
              <p className="mt-1 font-mono text-[var(--text-primary)]">{actor.fills}</p>
            </div>
            <div className="bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Cancels</p>
              <p className="mt-1 font-mono text-[var(--text-primary)]">{actor.cancels}</p>
            </div>
            <div className="bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Last Seen</p>
              <p className="mt-1 font-mono text-[var(--text-primary)]">{formatClock(actor.lastSeen)}</p>
            </div>
          </div>

          <div className="mt-3 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
            <p className="bb-title">AI-ASSISTED READ</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{actorAssistantRead(actor)}</p>
          </div>

          <div className="mt-3 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
            <p className="bb-title">EVIDENCE LIMIT</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              This profile is derived from retained DreamDEX stream events in the current session.
              It does not identify the owner, prove strategy, or include off-screen exchange state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActorFlow({ actors }: { actors: ActorProfile[] }) {
  const [selectedActor, setSelectedActor] = useState<ActorProfile | null>(null);

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
            <button
              key={actor.address}
              type="button"
              onClick={() => setSelectedActor(actor)}
              className="bb-focus w-full border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-2 text-left hover:border-[var(--border-strong)] hover:bg-[var(--bg-panel)]"
            >
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
            </button>
          ))}
        </div>
      )}

      {selectedActor ? <ActorDetailDialog actor={selectedActor} onClose={() => setSelectedActor(null)} /> : null}
    </section>
  );
}

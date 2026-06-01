import type { OrderBookSnapshot } from "@/types/dex";

type DreamFlowBriefProps = {
  activeMarket: string;
  anomalyCount: number;
  book: OrderBookSnapshot;
  totalEvents: number;
};

export function DreamFlowBrief({
  activeMarket,
  anomalyCount,
  book,
  totalEvents,
}: DreamFlowBriefProps) {
  return (
    <section className="bb-panel min-h-[360px] p-3 xl:min-h-[560px] 2xl:min-h-[680px]">
      <div className="mb-4">
        <h2 className="bb-title">DREAMFLOW</h2>
        <p className="bb-label">LIVE DREAMDEX MARKET INTELLIGENCE</p>
      </div>

      <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[var(--text-primary)]">
          What DreamFlow Is
        </h3>
        <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
          DreamFlow is a live order-flow terminal for DreamDEX. It listens to real stream events,
          reconstructs a session-bound order book, and turns raw market activity into readable
          signals for traders, builders, and market makers.
        </p>
        <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
          The app tracks mark price movement, top-of-book quote quality, actor behavior,
          lifecycle events, fills, cancellations, and rule-based anomalies without inventing
          data or claiming reward payouts.
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-px bg-[var(--border-panel)] text-xs">
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="bb-label">Market</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{activeMarket}/USDso</dd>
        </div>
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="bb-label">Events</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{totalEvents.toLocaleString()}</dd>
        </div>
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="bb-label">Active Book</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{book.activeOrders.toLocaleString()}</dd>
        </div>
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="bb-label">Anomalies</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{anomalyCount}</dd>
        </div>
      </dl>

      <div className="mt-3 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
        <h3 className="bb-title">WHAT IT HELPS ANSWER</h3>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
          <li>Is the current market being quoted tightly or drifting wide?</li>
          <li>Are fills, cancels, or placements clustering in the latest stream window?</li>
          <li>Which addresses are repeatedly placing, filling, or cancelling orders?</li>
          <li>Does the reconstructed book look healthy enough to reason about top-of-book pressure?</li>
        </ul>
      </div>

    </section>
  );
}

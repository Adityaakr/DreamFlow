import { formatPrice, formatQuantity } from "@/lib/format";
import type { OrderBookSnapshot, PriceLevel } from "@/types/dex";

function LadderRow({ level }: { level: PriceLevel }) {
  const isBid = level.side === "bid";
  const color = isBid ? "var(--accent-green)" : "var(--accent-red)";
  return (
    <div className="relative grid grid-cols-[86px_1fr_88px_42px] items-center border-b border-[rgba(255,255,255,0.04)] px-2 py-1 text-[11px]">
      <div
        className="absolute inset-y-0 opacity-20"
        style={{
          width: `${level.width}%`,
          background: color,
          [isBid ? "right" : "left"]: 0,
        }}
      />
      <span className={isBid ? "relative font-black text-[var(--accent-green)]" : "relative font-black text-[var(--accent-red)]"}>
        {formatPrice(level.price)}
      </span>
      <span className="relative text-right text-[var(--text-primary)]">{formatQuantity(level.quantity)}</span>
      <span className="relative text-right text-[var(--text-secondary)]">{level.orders}</span>
      <span className="relative text-right text-[var(--text-muted)]">{Math.round(level.width)}</span>
    </div>
  );
}

export function OrderFlowHeatmap({ book }: { book: OrderBookSnapshot }) {
  return (
    <section className="bb-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] px-3 py-2">
        <div>
          <h2 className="bb-title">ORDER FLOW PRESSURE</h2>
          <p className="bb-label">BEST-EFFORT RECONSTRUCTION FROM DECODED LIFECYCLE EVENTS</p>
        </div>
        <div className="text-right text-[11px]">
          <p className="text-[var(--text-primary)]">{book.activeOrders} ACTIVE ORDERS</p>
          <p className="text-[var(--text-muted)]">CONF {book.confidence.toUpperCase()}</p>
        </div>
      </div>

      {book.activeOrders === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
          <p className="text-sm font-bold text-white">NO ACTIVE LEVELS RECONSTRUCTED</p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">Order book reconstruction will appear after OrderPlaced events arrive.</p>
        </div>
      ) : (
        <div className="grid min-h-[320px] gap-0 lg:grid-cols-2">
          <div className="border-b border-[var(--border-panel)] lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-[86px_1fr_88px_42px] border-b border-[var(--border-panel)] bg-[var(--bg-row-alt)] px-2 py-1 text-[10px] font-black text-[var(--accent-green)]">
              <span>BID PX</span>
              <span className="text-right">BID SIZE</span>
              <span className="text-right">ORD</span>
              <span className="text-right">%</span>
            </div>
            {book.bids.length ? book.bids.map((level) => <LadderRow key={`${level.side}-${level.price}`} level={level} />) : (
              <p className="p-4 text-xs text-[var(--text-muted)]">NO BID LEVELS IN SESSION WINDOW.</p>
            )}
          </div>
          <div>
            <div className="grid grid-cols-[86px_1fr_88px_42px] border-b border-[var(--border-panel)] bg-[var(--bg-row-alt)] px-2 py-1 text-[10px] font-black text-[var(--accent-red)]">
              <span>ASK PX</span>
              <span className="text-right">ASK SIZE</span>
              <span className="text-right">ORD</span>
              <span className="text-right">%</span>
            </div>
            {book.asks.length ? book.asks.map((level) => <LadderRow key={`${level.side}-${level.price}`} level={level} />) : (
              <p className="p-4 text-xs text-[var(--text-muted)]">NO ASK LEVELS IN SESSION WINDOW.</p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border-panel)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
        {book.confidenceReason} Precision is not overclaimed; this is a session-bound lifecycle reconstruction.
      </div>
    </section>
  );
}

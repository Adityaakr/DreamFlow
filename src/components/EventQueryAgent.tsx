import { FormEvent, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { formatClock, formatEventType, formatPrice, formatQuantity, shortenAddress } from "@/lib/format";
import type { NormalizedDexEvent, OrderSide } from "@/types/dex";

type QueryPlan = {
  eventType: string | null;
  minQuantity: number | null;
  side: OrderSide | null;
  windowMs: number;
};

const DEFAULT_QUERY = "show me every buy bigger than 0.2 WETH in the last hour";

function parseQuery(input: string): QueryPlan {
  const text = input.toLowerCase();
  const side = /\b(buy|bid|bids)\b/.test(text) ? "bid" : /\b(sell|ask|asks)\b/.test(text) ? "ask" : null;
  const minMatch = text.match(/(?:bigger than|greater than|over|above|>=|>)\s*(\d+(?:\.\d+)?)/);
  const minQuantity = minMatch ? Number(minMatch[1]) : null;
  const windowMatch = text.match(/last\s+(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours)/);
  const amount = windowMatch ? Number(windowMatch[1]) : 60;
  const unit = windowMatch?.[2] ?? "minutes";
  const windowMs =
    unit.startsWith("s") ? amount * 1_000 :
    unit.startsWith("h") ? amount * 60 * 60_000 :
    amount * 60_000;
  const eventType =
    /\b(fill|fills|trade|trades|matched)\b/.test(text) ? "OrderFilled" :
    /\b(cancel|cancelled|canceled)\b/.test(text) ? "OrderCancelled" :
    /\b(order|orders|placed|buy|bid|sell|ask)\b/.test(text) ? "OrderPlaced" :
    null;

  return {
    eventType,
    minQuantity: Number.isFinite(minQuantity) ? minQuantity : null,
    side,
    windowMs,
  };
}

function runQuery(events: NormalizedDexEvent[], plan: QueryPlan) {
  const now = Date.now();
  return events.filter((event) => {
    if (now - event.timestamp > plan.windowMs) return false;
    if (plan.eventType && event.type !== plan.eventType) return false;
    if (plan.side && event.side !== plan.side) return false;
    if (plan.minQuantity !== null && (event.quantity ?? 0) <= plan.minQuantity) return false;
    return true;
  });
}

function describePlan(plan: QueryPlan, market: string) {
  const side = plan.side ? `${plan.side.toUpperCase()} ` : "";
  const type = plan.eventType ? plan.eventType : "events";
  const size = plan.minQuantity !== null ? ` over ${formatQuantity(plan.minQuantity, market)}` : "";
  const minutes = Math.round(plan.windowMs / 60_000);
  const window = minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes}m`;
  return `${side}${type}${size} in last ${window}`;
}

function sideLabel(event: NormalizedDexEvent) {
  if (event.side === "bid") return "BUY";
  if (event.side === "ask") return "SELL";
  return "UNKNOWN";
}

function assistantExplanation(event: NormalizedDexEvent) {
  if (event.type === "OrderPlaced") {
    const side = sideLabel(event);
    return `${side} intent inferred from decoded ${event.side.toUpperCase()} side. The order placed ${formatQuantity(event.quantity, event.base)} at ${formatPrice(event.price)} on ${event.poolLabel}. This is stream evidence only; it does not prove whether the actor is directional, market-making, or hedging.`;
  }
  if (event.type === "OrderFilled") {
    return `This fill matched ${formatQuantity(event.quantity, event.base)} on ${event.poolLabel}. Maker and taker order IDs are shown below when present.`;
  }
  if (event.type === "OrderCancelled") {
    return `This cancellation removed an order from ${event.poolLabel}. Use nearby placements and cancels to judge whether it is isolated or part of a quote-management pattern.`;
  }
  return `This is a decoded ${formatEventType(event.type)} event from ${event.poolLabel}. The assistant is only summarizing fields present in the live stream.`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-[var(--border-panel)] py-2 text-xs last:border-b-0">
      <span className="bb-label">{label}</span>
      <span className="min-w-0 break-words font-mono text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function OrderDetailDialog({
  event,
  onClose,
}: {
  event: NormalizedDexEvent;
  onClose: () => void;
}) {
  const side = sideLabel(event);
  const sideClass =
    side === "BUY" ? "text-[var(--accent-green)]" : side === "SELL" ? "text-[var(--accent-red)]" : "text-[var(--text-secondary)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="query-order-title">
      <div className="bb-panel max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-panel)] p-4">
          <div>
            <p className="bb-label">QUERY RESULT DETAIL</p>
            <h3 id="query-order-title" className="mt-1 text-lg font-black text-[var(--text-primary)]">
              {side} {formatEventType(event.type).toUpperCase()}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bb-focus inline-flex min-h-10 min-w-10 items-center justify-center border border-[var(--border-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close order details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-86px)] overflow-auto p-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Side</p>
              <p className={`mt-1 text-sm font-black ${sideClass}`}>{side}</p>
            </div>
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Qty</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{formatQuantity(event.quantity, event.base)}</p>
            </div>
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Price</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{formatPrice(event.price)}</p>
            </div>
            <div className="border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
              <p className="bb-label">Time</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{formatClock(event.timestamp)}</p>
            </div>
          </div>

          <div className="mt-3 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
            <p className="bb-title">ASSISTANT READ</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{assistantExplanation(event)}</p>
          </div>

          <div className="mt-3 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-3">
            <p className="bb-title">DECODED FIELDS</p>
            <div className="mt-2">
              <DetailRow label="Pool" value={event.poolLabel} />
              <DetailRow label="Actor" value={event.owner ?? "Unavailable"} />
              <DetailRow label="Order ID" value={event.orderId ?? "Unavailable"} />
              <DetailRow label="Maker ID" value={event.makerOrderId ?? "Unavailable"} />
              <DetailRow label="Taker ID" value={event.takerOrderId ?? "Unavailable"} />
              <DetailRow label="Tx Hash" value={event.raw.txHash} />
              <DetailRow label="Block" value={String(event.raw.blockNumber)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventQueryAgent({ events, market }: { events: NormalizedDexEvent[]; market: string }) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submitted, setSubmitted] = useState(DEFAULT_QUERY);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedDexEvent | null>(null);
  const plan = useMemo(() => parseQuery(submitted), [submitted]);
  const results = useMemo(() => runQuery(events, plan).slice(0, 50), [events, plan]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(query.trim() || DEFAULT_QUERY);
  };

  return (
    <section className="bb-panel flex max-h-[430px] flex-col p-3">
      <div className="mb-2 shrink-0">
        <h2 className="bb-title">QUERY AGENT</h2>
        <p className="bb-label">NATURAL LANGUAGE FILTER OVER CURRENT MARKET</p>
      </div>

      <form onSubmit={onSubmit} className="flex shrink-0 gap-2">
        <label className="sr-only" htmlFor="event-query">Ask about live events</label>
        <input
          id="event-query"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="bb-focus min-h-8 min-w-0 flex-1 border border-[var(--border-panel)] bg-[var(--bg-terminal)] px-2 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          placeholder={DEFAULT_QUERY}
        />
        <button
          type="submit"
          className="bb-focus inline-flex min-h-8 items-center gap-2 border border-[var(--border-panel)] px-3 text-[11px] font-bold uppercase text-[var(--text-primary)] hover:bg-[var(--bg-panel)]"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Run
        </button>
      </form>

      <div className="mt-2 flex shrink-0 items-center justify-between gap-3 border border-[var(--border-panel)] bg-[var(--bg-terminal)] px-2 py-1 text-[10px]">
        <span className="truncate text-[var(--text-secondary)]">{describePlan(plan, market)}</span>
        <span className="font-bold text-[var(--text-primary)]">{results.length}</span>
      </div>

      {results.length === 0 ? (
        <div className="mt-2 flex min-h-24 shrink-0 items-center justify-center border border-[var(--border-panel)] p-3 text-center text-xs text-[var(--text-muted)]">
          NO MATCHES IN THE RETAINED LIVE BUFFER
        </div>
      ) : (
        <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {results.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedEvent(event)}
              className="bb-focus grid w-full grid-cols-[58px_1fr] gap-2 border border-[var(--border-panel)] bg-[var(--bg-terminal)] px-2 py-1.5 text-left text-[10px] hover:border-[var(--border-strong)] hover:bg-[var(--bg-panel)]"
            >
              <span className="font-mono leading-4 text-[var(--text-muted)]">{formatClock(event.timestamp).replace(/\s/g, "")}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={event.side === "bid" ? "font-black text-[var(--accent-green)]" : event.side === "ask" ? "font-black text-[var(--accent-red)]" : "font-black text-[var(--text-secondary)]"}>
                    {sideLabel(event)}
                  </span>
                  <p className="truncate text-[var(--text-primary)]">{event.readable}</p>
                </div>
                <p className="truncate font-mono text-[var(--text-muted)]">
                  {event.quantity !== null ? formatQuantity(event.quantity, event.base) : "--"} · {event.price !== null ? formatPrice(event.price) : "--"} · {event.owner ? shortenAddress(event.owner) : "--"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedEvent ? <OrderDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} /> : null}
    </section>
  );
}

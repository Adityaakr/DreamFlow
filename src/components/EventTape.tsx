"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatClock, formatEventType, formatPrice, formatQuantity, shortenAddress } from "@/lib/format";
import type { NormalizedDexEvent } from "@/types/dex";

const typeColor = {
  OrderPlaced: "text-[var(--accent-green)]",
  OrderFilled: "text-[var(--text-primary)]",
  OrderCancelled: "text-[var(--accent-red)]",
  OrderExpired: "text-[var(--accent-red)]",
  OrderReduced: "text-[var(--accent-orange)]",
  MarkPriceUpdated: "text-[var(--accent-cyan)]",
};

const GRID = "grid-cols-[24px_92px_170px_64px_130px_130px_170px_minmax(320px,1fr)_96px]";

export function EventTape({ events }: { events: NormalizedDexEvent[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="bb-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] px-4 py-3">
        <div>
          <h2 className="bb-title">LIVE EVENT TAPE</h2>
          <p className="bb-label">REAL DECODED MAINNET EVENTS · SELECT ROW FOR RAW JSON</p>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{events.length.toLocaleString()} SESSION</span>
      </div>

      {events.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center">
          <p className="text-sm font-bold text-white">WAITING FOR REAL SOMNIA MAINNET EVENTS</p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">No mock data will be displayed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1320px]">
            <div className={`grid ${GRID} border-b border-[var(--border-panel)] bg-[var(--bg-row-alt)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]`}>
              <span />
              <span>Time</span>
              <span>Event</span>
              <span>Side</span>
              <span className="text-right">Price</span>
              <span className="pr-3 text-right">Qty</span>
              <span>Actor</span>
              <span>Description</span>
              <span className="text-right">Details</span>
            </div>

            {events.slice(0, 120).map((event, index) => {
              const isOpen = expanded === event.id;
              const tone = typeColor[event.type as keyof typeof typeColor] ?? "text-[var(--text-primary)]";
              return (
                <article key={event.id} className={index % 2 === 0 ? "bg-[var(--bg-terminal)]" : "bg-[var(--bg-panel)]"}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : event.id)}
                    className={`bb-focus grid ${GRID} min-h-9 w-full items-center px-4 py-1.5 text-left text-[13px] hover:bg-[rgba(255,255,255,0.03)]`}
                    aria-expanded={isOpen}
                  >
                    <span className="text-[var(--text-muted)]">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <span className="whitespace-nowrap font-mono text-[12px] text-[var(--text-secondary)]">{formatClock(event.timestamp)}</span>
                    <span className={`font-bold ${tone}`}>{formatEventType(event.type).toUpperCase()}</span>
                    <span className={event.side === "bid" ? "text-[var(--accent-green)]" : event.side === "ask" ? "text-[var(--accent-red)]" : "text-[var(--text-muted)]"}>
                      {event.side.toUpperCase()}
                    </span>
                    <span className="min-w-0 truncate text-right font-mono text-[var(--accent-orange)]" title={event.price !== null ? formatPrice(event.price) : undefined}>
                      {event.price !== null ? formatPrice(event.price) : "--"}
                    </span>
                    <span className="min-w-0 truncate pr-3 text-right font-mono text-[var(--text-primary)]" title={event.quantity !== null ? formatQuantity(event.quantity, event.base) : undefined}>
                      {event.quantity !== null ? formatQuantity(event.quantity) : "--"}
                    </span>
                    <span className="min-w-0 truncate font-mono text-[var(--text-secondary)]" title={event.owner ?? undefined}>
                      {event.owner ? shortenAddress(event.owner) : "--"}
                    </span>
                    <span className="min-w-0 truncate text-[var(--text-muted)]">{event.readable}</span>
                    <span className="text-right text-[11px] font-bold uppercase tracking-wide text-[var(--accent-cyan)]">
                      {isOpen ? "Hide details" : "View more"}
                    </span>
                  </button>
                  {isOpen ? (
                    <pre className="max-h-80 overflow-auto border-t border-[var(--border-panel)] bg-[var(--bg-terminal)] p-4 text-[11px] leading-5 text-[var(--text-secondary)]">
                      {JSON.stringify(event.raw, null, 2)}
                    </pre>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

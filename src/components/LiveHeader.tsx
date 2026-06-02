import { Activity, Radio, ShieldCheck } from "lucide-react";
import { formatClock, formatPrice } from "@/lib/format";
import type { StreamStatus } from "@/lib/dexEvent";

/** The 4 tradeable base assets on Somnia DEX. */
export const MARKETS = ["WETH", "SOMI", "USDC.e", "WBTC"] as const;
export type Market = (typeof MARKETS)[number];

type MarketPrice = {
  price: number | null;
  eventCount: number;
};

type LiveHeaderProps = {
  status: StreamStatus;
  selectedMarket: Market;
  marketPrices: Record<Market, MarketPrice>;
  eventsPerSecond: number;
  totalEvents: number;
  lastEventAt: number | null;
  onMarketChange: (market: Market) => void;
};

export function LiveHeader({
  status,
  selectedMarket,
  marketPrices,
  eventsPerSecond,
  totalEvents,
  lastEventAt,
  onMarketChange,
}: LiveHeaderProps) {
  const isLive = status === "open";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-panel)] bg-[var(--bg-header)]">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="grid min-h-12 grid-cols-1 border-b border-[var(--border-panel)] lg:grid-cols-[260px_1fr_auto]">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[var(--border-panel)] px-3 py-2 lg:border-b-0 lg:border-r">
          <img
            src="/flow.png"
            alt="DreamFlow"
            className="h-8 w-8 shrink-0 rounded-[6px] border border-[var(--border-panel)] object-cover"
          />
          <div>
            <h1 className="text-base font-black text-[var(--text-primary)]">DREAMFLOW</h1>
            <p className="bb-label">
              {selectedMarket}/USDso · Live DreamDEX order-flow intelligence
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-2 font-bold text-[var(--accent-green)]">
            <span className={isLive ? "bb-pulse inline-block h-2 w-2 rounded-full bg-[var(--accent-green)]" : "inline-block h-2 w-2 rounded-full bg-[var(--text-dim)]"} />
            <Radio className={isLive ? "h-3.5 w-3.5" : "h-3.5 w-3.5 opacity-40"} aria-hidden="true" />
            LIVE
          </span>
          <span>
            <span className="bb-label">EV/S</span>{" "}
            <b className="text-[var(--text-primary)]">{eventsPerSecond.toFixed(2)}</b>
          </span>
          <span>
            <span className="bb-label">SESSION</span>{" "}
            <b className="text-[var(--text-primary)]">{totalEvents.toLocaleString()}</b>
          </span>
          <span>
            <span className="bb-label">LAST</span>{" "}
            <b className="text-[var(--text-primary)]">{formatClock(lastEventAt)}</b>
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            {status.toUpperCase()}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 border-t border-[var(--border-panel)] px-3 py-2 text-xs lg:border-l lg:border-t-0">
          <span className="inline-flex items-center gap-1 border border-[var(--border-panel)] px-2 py-1 text-[var(--text-secondary)]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            SOMNIA MAINNET
          </span>
          <span className="border border-[var(--border-panel)] px-2 py-1 font-bold text-[var(--text-primary)]">STREAM</span>
        </div>
      </div>

      {/* ── Market switcher bar ─────────────────────────────── */}
      <div className="flex items-stretch overflow-x-auto border-b border-[var(--border-panel)] bg-[var(--bg-header-bar)]">
        {MARKETS.map((market) => {
          const isActive = market === selectedMarket;
          const info = marketPrices[market];
          return (
            <button
              key={market}
              type="button"
              onClick={() => onMarketChange(market)}
              className={`bb-focus flex min-w-[140px] items-center gap-3 border-r border-[var(--border-panel)] px-4 py-2 text-left transition-colors ${
                isActive
                  ? "bg-[var(--bg-panel)] text-[var(--text-primary)]"
                  : "bg-transparent text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <div>
                <p className={`text-xs font-black ${isActive ? "text-[var(--text-primary)]" : ""}`}>
                  {market}
                </p>
                <p className="font-mono text-[11px] tabular-nums">
                  {info.price !== null ? formatPrice(info.price) : "—"}
                </p>
              </div>
              {info.eventCount > 0 && (
                <span className="ml-auto text-[10px] text-[var(--text-dim)]">
                  {info.eventCount}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--text-primary)]" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

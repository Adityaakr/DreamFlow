import { formatPercent, formatPrice } from "@/lib/format";
import type { MetricSnapshot, OrderBookSnapshot } from "@/types/dex";

export function LiquidityHealth({ metrics, book }: { metrics: MetricSnapshot; book: OrderBookSnapshot }) {
  const score = metrics.liquidityHealthScore;

  return (
    <section className="bb-panel p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="bb-title">LIQUIDITY HEALTH</h2>
          <p className="bb-label">STREAM QUALITY SCORE · 0-100</p>
        </div>
        <p className="font-mono text-3xl font-black text-[var(--text-primary)]">{score ?? "--"}</p>
      </div>

      <div className="h-2 bg-[var(--bg-terminal)]">
        <div
          className="h-full bg-[var(--text-primary)] motion-safe:transition-[width] motion-safe:duration-200"
          style={{ width: `${score ?? 0}%` }}
        />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-px bg-[var(--border-panel)] text-xs">
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="text-[var(--text-muted)]">Spread</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{book.spread !== null ? formatPrice(book.spread) : "--"}</dd>
        </div>
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="text-[var(--text-muted)]">Fill/cancel</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{metrics.fillCancelRatio !== null ? metrics.fillCancelRatio.toFixed(2) : "--"}</dd>
        </div>
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="text-[var(--text-muted)]">Activity</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{metrics.activityScore}/100</dd>
        </div>
        <div className="bg-[var(--bg-terminal)] p-2">
          <dt className="text-[var(--text-muted)]">Mark vol</dt>
          <dd className="mt-1 font-mono text-[var(--text-primary)]">{metrics.markVolatility !== null ? formatPercent(metrics.markVolatility * 100) : "--"}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">Deterministic market quality score. Not financial advice.</p>
    </section>
  );
}

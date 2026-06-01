import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Radar } from "lucide-react";
import { formatPercent, formatPrice, formatQuantity } from "@/lib/format";
import type { Anomaly, MetricSnapshot, NormalizedDexEvent, OrderBookSnapshot, Severity } from "@/types/dex";

type AgentAlert = {
  id: string;
  title: string;
  severity: Severity;
  reason: string;
  evidence: string[];
};

type AgentSpotterProps = {
  anomalies: Anomaly[];
  book: OrderBookSnapshot;
  events: NormalizedDexEvent[];
  market: string;
  metrics: MetricSnapshot;
};

const alertTone = {
  calm: "border-[var(--border-panel)] text-[var(--text-secondary)]",
  active: "border-[rgba(46,204,113,0.35)] text-[var(--accent-green)]",
  volatile: "border-[rgba(224,144,48,0.4)] text-[var(--accent-orange)]",
  stressed: "border-[rgba(231,76,76,0.4)] text-[var(--accent-red)]",
};

const giantOrderThreshold: Record<string, number> = {
  WETH: 2,
  WBTC: 0.05,
  SOMI: 2_500,
  "USDC.e": 2_500,
};

function buildSpotterAlerts({
  anomalies,
  book,
  events,
  market,
  metrics,
}: AgentSpotterProps): AgentAlert[] {
  const alerts: AgentAlert[] = [];
  const now = Date.now();
  const recent = events.filter((event) => now - event.timestamp <= 60_000);
  const threshold = giantOrderThreshold[market] ?? 1_000;
  const largestOrder = recent
    .filter((event) => event.type === "OrderPlaced" && (event.quantity ?? 0) >= threshold)
    .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0];

  if (largestOrder) {
    alerts.push({
      id: `giant-${largestOrder.id}`,
      title: "Giant order spotted",
      severity: "volatile",
      reason: `${largestOrder.side.toUpperCase()} order crossed the ${formatQuantity(threshold, market)} watch threshold.`,
      evidence: [
        `${formatQuantity(largestOrder.quantity, market)} at ${formatPrice(largestOrder.price)}.`,
        largestOrder.owner ? `Actor ${largestOrder.owner.slice(0, 10)}...` : "Actor unavailable.",
      ],
    });
  }

  if (book.bestBid !== null && book.bestAsk !== null && book.spread !== null) {
    const mid = (book.bestBid + book.bestAsk) / 2;
    const spreadPct = mid > 0 ? (book.spread / mid) * 100 : 0;
    if (spreadPct >= 0.15) {
      alerts.push({
        id: `spread-${spreadPct.toFixed(3)}`,
        title: "Spread blowout watch",
        severity: spreadPct >= 0.5 ? "stressed" : "volatile",
        reason: `Best bid/ask spread widened to ${formatPercent(spreadPct)}.`,
        evidence: [`Best bid ${formatPrice(book.bestBid)}.`, `Best ask ${formatPrice(book.bestAsk)}.`],
      });
    }
  }

  const cancelRatio = metrics.ordersLast60s > 0 ? metrics.cancelsLast60s / metrics.ordersLast60s : 0;
  if (metrics.cancelsLast60s >= 8 && cancelRatio >= 0.7) {
    alerts.push({
      id: `cancel-pattern-${metrics.cancelsLast60s}-${metrics.ordersLast60s}`,
      title: "Suspicious cancel pattern",
      severity: cancelRatio >= 1.2 ? "stressed" : "volatile",
      reason: `${metrics.cancelsLast60s} cancels against ${metrics.ordersLast60s} placements in 60s.`,
      evidence: [`Cancel/place ratio ${(cancelRatio * 100).toFixed(0)}%.`, `${metrics.fillsLast60s} fills in same window.`],
    });
  }

  for (const anomaly of anomalies.slice(0, 2)) {
    alerts.push({
      id: `rule-${anomaly.id}`,
      title: anomaly.headline,
      severity: anomaly.severity,
      reason: `${anomaly.eventCount} related events in ${anomaly.window}.`,
      evidence: anomaly.evidence.slice(0, 2),
    });
  }

  return alerts.slice(0, 4);
}

export function AgentSpotter(props: AgentSpotterProps) {
  const [acknowledgedId, setAcknowledgedId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const alerts = useMemo(() => buildSpotterAlerts(props), [props]);
  const topAlert = alerts[0] ?? null;

  useEffect(() => {
    if (!topAlert || topAlert.id === acknowledgedId) return;
    setPingingId(topAlert.id);
    const timer = window.setTimeout(() => setPingingId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [acknowledgedId, topAlert]);

  return (
    <section className="bb-panel p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="bb-title">SPOTTER AGENT</h2>
          <p className="bb-label">PINGING UNUSUAL STREAM BEHAVIOR</p>
        </div>
        <span className="inline-flex min-h-8 items-center gap-2 border border-[var(--border-panel)] px-2 text-[11px] font-bold text-[var(--text-secondary)]">
          <Radar className="h-3.5 w-3.5" aria-hidden="true" />
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-4 text-center text-xs text-[var(--text-secondary)]">
          NO SPOTTER PINGS IN THE CURRENT WINDOW
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const isNew = pingingId === alert.id && acknowledgedId !== alert.id;
            return (
              <article key={alert.id} className={`border bg-[var(--bg-terminal)] p-2 ${alertTone[alert.severity]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black text-[var(--text-primary)]">{alert.title.toUpperCase()}</h3>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{alert.reason}</p>
                  </div>
                  <span className={isNew ? "bb-pulse text-[10px] font-black uppercase text-[var(--accent-orange)]" : "text-[10px] font-bold uppercase"}>
                    {isNew ? "PING" : alert.severity}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {alert.evidence.map((item) => (
                    <li key={item} className="text-[11px] text-[var(--text-muted)]">{item}</li>
                  ))}
                </ul>
                {alert.id === topAlert?.id ? (
                  <button
                    type="button"
                    onClick={() => setAcknowledgedId(alert.id)}
                    className="bb-focus mt-2 inline-flex min-h-8 items-center gap-2 border border-[var(--border-panel)] px-2 text-[11px] font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {acknowledgedId === alert.id ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <BellRing className="h-3.5 w-3.5" aria-hidden="true" />}
                    {acknowledgedId === alert.id ? "Acknowledged" : "Acknowledge"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

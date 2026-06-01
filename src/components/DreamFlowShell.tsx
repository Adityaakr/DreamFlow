"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import { Activity, BarChart3, Clock3, Gauge, Radio, TrendingUp } from "lucide-react";
import { ActorFlow } from "@/components/ActorFlow";
import { AiPulseAgent } from "@/components/AiPulseAgent";
import { AgentSpotter } from "@/components/AgentSpotter";
import { AnomalyFeed } from "@/components/AnomalyFeed";
import { DeveloperProof } from "@/components/DeveloperProof";
import { EventQueryAgent } from "@/components/EventQueryAgent";
import { EventTape } from "@/components/EventTape";
import { FlowCanvas } from "@/components/FlowCanvas";
import { LiquidityHealth } from "@/components/LiquidityHealth";
import { LiveHeader, MARKETS, type Market } from "@/components/LiveHeader";
import { MetricCard } from "@/components/MetricCard";
import { OrderFlowHeatmap } from "@/components/OrderFlowHeatmap";
import { detectAnomalies } from "@/lib/anomalyRules";
import { formatPercent, formatPrice } from "@/lib/format";
import { computeMetrics, buildActorProfiles, buildPricePoints } from "@/lib/metrics";
import { normalizeDexEvents } from "@/lib/normalizeDexEvent";
import { buildOrderBookSnapshot } from "@/lib/orderBookEngine";
import { buildPulseEvidence, generateRuleBasedPulse } from "@/lib/pulseAgent";
import { useDexStream } from "@/lib/useDexStream";

const MarkPriceChart = lazy(() =>
  import("@/components/MarkPriceChart").then((module) => ({
    default: module.MarkPriceChart,
  })),
);

/**
 * Filter events by base asset. Each "market" merges both the primary and MM
 * pool for the same base token (e.g. SOMI/USDso + SOMI/USDso (MM)).
 */
function filterByMarket(events: import("@/types/dex").NormalizedDexEvent[], market: Market) {
  return events.filter((event) => event.base === market);
}

export function DreamFlowShell() {
  const { events: rawEvents, status } = useDexStream();
  const [selectedMarket, setSelectedMarket] = useState<Market>("WETH");

  const normalized = useMemo(() => normalizeDexEvents(rawEvents), [rawEvents]);

  // ── Per-market price summaries for the header switcher ──
  const marketPrices = useMemo(() => {
    const result = {} as Record<Market, { price: number | null; eventCount: number }>;
    for (const market of MARKETS) {
      const marketEvents = filterByMarket(normalized, market);
      const latestMark = marketEvents.find(
        (event) => event.type === "MarkPriceUpdated" && event.price !== null,
      );
      result[market] = {
        price: latestMark?.price ?? null,
        eventCount: marketEvents.length,
      };
    }
    return result;
  }, [normalized]);

  // ── Filter to the selected market (merges primary + MM pools) ──
  const events = useMemo(
    () => filterByMarket(normalized, selectedMarket),
    [normalized, selectedMarket],
  );

  // ── All downstream computations use market-scoped events ──
  const metrics = useMemo(() => computeMetrics(events), [events]);
  const pricePoints = useMemo(() => buildPricePoints(events), [events]);
  const book = useMemo(() => buildOrderBookSnapshot(events), [events]);
  const anomalies = useMemo(() => detectAnomalies(events, metrics, book), [events, metrics, book]);
  const actors = useMemo(() => buildActorProfiles(events), [events]);
  const pulse = useMemo(() => generateRuleBasedPulse(events, metrics, anomalies), [events, metrics, anomalies]);
  const pulseEvidence = useMemo(() => buildPulseEvidence(events, metrics, anomalies), [events, metrics, anomalies]);

  return (
    <main className="min-h-screen bg-[var(--bg-terminal)] text-[var(--text-primary)]">
      <LiveHeader
        status={status}
        selectedMarket={selectedMarket}
        marketPrices={marketPrices}
        eventsPerSecond={metrics.eventsPerSecond}
        totalEvents={metrics.totalEvents}
        lastEventAt={metrics.latestEventAt}
        onMarketChange={setSelectedMarket}
      />

      <div className="grid gap-2 p-2">
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <MetricCard label={`${selectedMarket} Mark Px`} value={formatPrice(metrics.latestMarkPrice)} detail={metrics.markPriceDeltaPct !== null ? formatPercent(metrics.markPriceDeltaPct) : "Awaiting mark updates"} tone="cyan" icon={TrendingUp} />
          <MetricCard label="Events / Sec" value={metrics.eventsPerSecond.toFixed(2)} detail={`${metrics.totalEvents.toLocaleString()} in session`} tone="amber" icon={Activity} />
          <MetricCard label="Fills · 60s" value={String(metrics.fillsLast60s)} detail="OrderFilled prints" tone="green" icon={BarChart3} />
          <MetricCard label="Orders · 60s" value={String(metrics.ordersLast60s)} detail="OrderPlaced lifecycle" tone="neutral" icon={Radio} />
          <MetricCard label="Cancels · 60s" value={String(metrics.cancelsLast60s)} detail="Cancel / expire / reduce" tone="pink" icon={Clock3} />
          <MetricCard label="Mkt Quality" value={metrics.liquidityHealthScore !== null ? String(metrics.liquidityHealthScore) : "--"} detail={`${selectedMarket}/USDso score`} tone="amber" icon={Gauge} />
        </section>

        <div className="grid items-start gap-2 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="grid gap-2 content-start">
            <LiquidityHealth metrics={metrics} book={book} />
            <ActorFlow actors={actors} />
          </aside>

          <section className="grid min-w-0 gap-2">
            <Suspense
              fallback={
                <div className="bb-panel flex min-h-[260px] items-center justify-center p-4">
                  <div>
                    <p className="bb-title">MARK PRICE</p>
                    <p className="bb-label mt-1">LOADING CHART</p>
                  </div>
                </div>
              }
            >
              <MarkPriceChart points={pricePoints} />
            </Suspense>
            <FlowCanvas events={events} market={selectedMarket} />
            <OrderFlowHeatmap book={book} />
          </section>

          <aside className="grid gap-2 content-start">
            <AiPulseAgent insight={pulse} evidence={pulseEvidence} />
            <AgentSpotter anomalies={anomalies} book={book} events={events} market={selectedMarket} metrics={metrics} />
            <EventQueryAgent events={events} market={selectedMarket} />
            <AnomalyFeed anomalies={anomalies} />
          </aside>
        </div>

        <EventTape events={events} />
        <DeveloperProof />
      </div>
    </main>
  );
}

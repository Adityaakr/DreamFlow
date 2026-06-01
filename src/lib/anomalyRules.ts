import { formatPercent, formatPrice } from "@/lib/format";
import type { Anomaly, MetricSnapshot, NormalizedDexEvent, OrderBookSnapshot } from "@/types/dex";

export function detectAnomalies(
  events: NormalizedDexEvent[],
  metrics: MetricSnapshot,
  book: OrderBookSnapshot,
  now = Date.now(),
): Anomaly[] {
  const recent = events.filter((event) => now - event.timestamp <= 60_000);
  const anomalies: Anomaly[] = [];

  if (metrics.fillsLast60s >= 5) {
    anomalies.push({
      id: `fill-burst-${metrics.fillsLast60s}`,
      headline: "Fill burst detected",
      severity: metrics.fillsLast60s > 16 ? "volatile" : "active",
      eventCount: metrics.fillsLast60s,
      window: "Last 60s",
      evidence: [`${metrics.fillsLast60s} OrderFilled events observed.`, `${recent.length} total events in the same window.`],
      relatedEventTypes: ["OrderFilled"],
    });
  }

  if (metrics.cancelsLast60s >= Math.max(4, metrics.ordersLast60s * 0.8)) {
    anomalies.push({
      id: `cancel-burst-${metrics.cancelsLast60s}`,
      headline: "Cancel activity increased",
      severity: metrics.cancelsLast60s > metrics.ordersLast60s * 1.5 ? "stressed" : "active",
      eventCount: metrics.cancelsLast60s,
      window: "Last 60s",
      evidence: [
        `${metrics.cancelsLast60s} cancel/expire/reduce events.`,
        `${metrics.ordersLast60s} placed orders in the same window.`,
      ],
      relatedEventTypes: ["OrderCancelled", "OrderExpired", "OrderReduced"],
    });
  }

  if (metrics.markPriceDeltaPct !== null && Math.abs(metrics.markPriceDeltaPct) >= 0.2) {
    anomalies.push({
      id: `mark-jump-${metrics.markPriceDeltaPct.toFixed(3)}`,
      headline: "Mark price jump",
      severity: Math.abs(metrics.markPriceDeltaPct) > 1 ? "volatile" : "active",
      eventCount: recent.filter((event) => event.type === "MarkPriceUpdated").length,
      window: "Session mark window",
      evidence: [
        `Latest mark price is ${formatPrice(metrics.latestMarkPrice)}.`,
        `Observed mark change is ${formatPercent(metrics.markPriceDeltaPct)}.`,
      ],
      relatedEventTypes: ["MarkPriceUpdated"],
    });
  }

  if (metrics.eventsPerSecond >= 1) {
    anomalies.push({
      id: `velocity-${metrics.eventsPerSecond.toFixed(2)}`,
      headline: "High event velocity",
      severity: metrics.eventsPerSecond > 4 ? "volatile" : "active",
      eventCount: recent.length,
      window: "Last 60s",
      evidence: [`${metrics.eventsPerSecond.toFixed(2)} events/sec from real mainnet stream.`],
      relatedEventTypes: [...new Set(recent.map((event) => event.type))].slice(0, 5),
    });
  }

  if (metrics.bidAskPressure !== null && Math.abs(metrics.bidAskPressure) > 0.55) {
    anomalies.push({
      id: `imbalance-${metrics.bidAskPressure.toFixed(2)}`,
      headline: metrics.bidAskPressure > 0 ? "Bid-side pressure building" : "Ask-side pressure building",
      severity: Math.abs(metrics.bidAskPressure) > 0.8 ? "volatile" : "active",
      eventCount: metrics.ordersLast60s,
      window: "Last 60s",
      evidence: [
        `Bid quantity: ${metrics.bidPlacedQuantity60s.toFixed(4)}.`,
        `Ask quantity: ${metrics.askPlacedQuantity60s.toFixed(4)}.`,
      ],
      relatedEventTypes: ["OrderPlaced"],
    });
  }

  if (book.activeOrders > 0 && book.confidence === "low" && metrics.cancelsLast60s > metrics.ordersLast60s) {
    anomalies.push({
      id: "liquidity-thinning",
      headline: "Liquidity thinning signal",
      severity: "active",
      eventCount: metrics.cancelsLast60s,
      window: "Session window",
      evidence: [
        "More lifecycle removals than placements were observed recently.",
        "Depth view is marked low confidence.",
      ],
      relatedEventTypes: ["OrderCancelled", "OrderExpired", "OrderReduced", "OrderPlaced"],
    });
  }

  const builderFees = recent.filter((event) => event.type === "BuilderFeeCharged").length;
  if (builderFees > 0) {
    anomalies.push({
      id: `builder-fee-${builderFees}`,
      headline: "Builder fee activity",
      severity: "active",
      eventCount: builderFees,
      window: "Last 60s",
      evidence: [`${builderFees} BuilderFeeCharged event${builderFees === 1 ? "" : "s"} observed.`],
      relatedEventTypes: ["BuilderFeeCharged"],
    });
  }

  return anomalies.slice(0, 50);
}

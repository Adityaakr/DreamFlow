import { formatPercent, formatPrice } from "@/lib/format";
import type { Anomaly, MetricSnapshot, NormalizedDexEvent, PulseInsight } from "@/types/dex";

export type PulseEvidence = {
  generatedAt: string;
  window: string;
  metrics: Pick<
    MetricSnapshot,
    | "eventsPerSecond"
    | "fillsLast60s"
    | "ordersLast60s"
    | "cancelsLast60s"
    | "latestMarkPrice"
    | "markPriceDeltaPct"
    | "bidAskPressure"
    | "liquidityHealthScore"
  >;
  eventTypes: Record<string, number>;
  pools: Record<string, number>;
  anomalies: Anomaly[];
};

export function buildPulseEvidence(
  events: NormalizedDexEvent[],
  metrics: MetricSnapshot,
  anomalies: Anomaly[],
  now = Date.now(),
): PulseEvidence {
  const recent = events.filter((event) => now - event.timestamp <= 60_000).slice(0, 300);
  const eventTypes: Record<string, number> = {};
  const pools: Record<string, number> = {};
  for (const event of recent) {
    eventTypes[event.type] = (eventTypes[event.type] ?? 0) + 1;
    pools[event.poolLabel] = (pools[event.poolLabel] ?? 0) + 1;
  }

  return {
    generatedAt: new Date(now).toISOString(),
    window: "Last 60s",
    metrics: {
      eventsPerSecond: metrics.eventsPerSecond,
      fillsLast60s: metrics.fillsLast60s,
      ordersLast60s: metrics.ordersLast60s,
      cancelsLast60s: metrics.cancelsLast60s,
      latestMarkPrice: metrics.latestMarkPrice,
      markPriceDeltaPct: metrics.markPriceDeltaPct,
      bidAskPressure: metrics.bidAskPressure,
      liquidityHealthScore: metrics.liquidityHealthScore,
    },
    eventTypes,
    pools,
    anomalies: anomalies.slice(0, 5),
  };
}

export function generateRuleBasedPulse(
  events: NormalizedDexEvent[],
  metrics: MetricSnapshot,
  anomalies: Anomaly[],
): PulseInsight {
  if (events.length === 0) {
    return {
      headline: "Waiting for real mainnet events",
      summary: "DreamFlow has not observed decoded DreamDEX events in this session yet.",
      severity: "calm",
      confidence: 0.9,
      evidence: ["No mock order events are displayed.", "The UI will update when Somnia mainnet emits matching events."],
      window: "Session window",
      mode: "Rule-based",
      suggestedUserAction: "Monitor next event window",
    };
  }

  if (metrics.cancelsLast60s > Math.max(3, metrics.ordersLast60s * 0.8) && metrics.fillsLast60s <= 2) {
    return {
      headline: "Liquidity withdrawal detected",
      summary:
        "Cancel, expire, or reduce activity increased in the last 60 seconds while fills stayed low. This points to resting liquidity changing more than orders executing.",
      severity: metrics.cancelsLast60s > metrics.ordersLast60s * 1.5 ? "stressed" : "active",
      confidence: 0.74,
      evidence: [
        `${metrics.cancelsLast60s} cancel/expire/reduce events.`,
        `${metrics.ordersLast60s} orders placed.`,
        `${metrics.fillsLast60s} fills.`,
      ],
      window: "Last 60s",
      mode: "Rule-based",
      suggestedUserAction: "Review supporting raw events",
    };
  }

  if (metrics.fillsLast60s >= 5) {
    return {
      headline: "Fill burst detected",
      summary: "DreamDEX emitted a cluster of fill events in the current stream window.",
      severity: metrics.fillsLast60s > 16 ? "volatile" : "active",
      confidence: 0.78,
      evidence: [
        `${metrics.fillsLast60s} fills in the last 60 seconds.`,
        `${metrics.eventsPerSecond.toFixed(2)} events/sec observed.`,
      ],
      window: "Last 60s",
      mode: "Rule-based",
      suggestedUserAction: "Inspect liquidity health",
    };
  }

  if (metrics.bidAskPressure !== null && Math.abs(metrics.bidAskPressure) > 0.45) {
    return {
      headline: metrics.bidAskPressure > 0 ? "Bid-side pressure building" : "Ask-side pressure building",
      summary: "Recent placed-order quantity is skewed to one side of the book.",
      severity: Math.abs(metrics.bidAskPressure) > 0.75 ? "volatile" : "active",
      confidence: 0.68,
      evidence: [
        `Bid/ask pressure score: ${metrics.bidAskPressure.toFixed(2)}.`,
        `Bid quantity: ${metrics.bidPlacedQuantity60s.toFixed(4)}.`,
        `Ask quantity: ${metrics.askPlacedQuantity60s.toFixed(4)}.`,
      ],
      window: "Last 60s",
      mode: "Rule-based",
      suggestedUserAction: "Check order-flow panel",
    };
  }

  if (metrics.markPriceDeltaPct !== null && Math.abs(metrics.markPriceDeltaPct) >= 0.2) {
    return {
      headline: "Mark price moved",
      summary: "The observed mark price changed during the current session window. This is a descriptive stream signal, not a forecast.",
      severity: Math.abs(metrics.markPriceDeltaPct) >= 1 ? "volatile" : "active",
      confidence: 0.72,
      evidence: [
        `Latest mark price: ${formatPrice(metrics.latestMarkPrice)}.`,
        `Session mark change: ${formatPercent(metrics.markPriceDeltaPct)}.`,
      ],
      window: "Session mark window",
      mode: "Rule-based",
      suggestedUserAction: "Review mark price chart",
    };
  }

  return {
    headline: anomalies[0]?.headline ?? "Market quiet",
    summary:
      anomalies[0]?.headline
        ? "The most visible stream signal is shown in the anomaly feed. No prediction or trading recommendation is inferred."
        : "Current order-flow is light or balanced in the recent window.",
    severity: anomalies[0]?.severity ?? "calm",
    confidence: anomalies[0] ? 0.62 : 0.7,
    evidence:
      anomalies[0]?.evidence ??
      [`${metrics.eventsPerSecond.toFixed(2)} events/sec.`, `${metrics.totalEvents} session events observed.`],
    window: anomalies[0]?.window ?? "Last 60s",
    mode: "Rule-based",
    suggestedUserAction: anomalies[0] ? "Review supporting raw events" : "Monitor next event window",
  };
}

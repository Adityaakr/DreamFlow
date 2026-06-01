import { clamp } from "@/lib/format";
import type { ActorProfile, MetricSnapshot, NormalizedDexEvent, PricePoint } from "@/types/dex";

const MINUTE = 60_000;

export function recentEvents(events: NormalizedDexEvent[], now = Date.now(), windowMs = MINUTE) {
  return events.filter((event) => now - event.timestamp <= windowMs);
}

export function buildPricePoints(events: NormalizedDexEvent[], maxPoints = 300): PricePoint[] {
  return events
    .filter((event) => event.type === "MarkPriceUpdated" && event.price !== null)
    .slice(0, maxPoints)
    .reverse()
    .map((event) => ({
      seq: event.seq,
      timestamp: event.timestamp,
      time: new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(event.timestamp),
      price: event.price ?? 0,
      poolLabel: event.poolLabel,
    }));
}

export function computeMetrics(events: NormalizedDexEvent[], now = Date.now()): MetricSnapshot {
  const latestEventAt = events[0]?.timestamp ?? null;
  const window60 = recentEvents(events, now, MINUTE);
  const marks = events.filter((event) => event.type === "MarkPriceUpdated" && event.price !== null);
  const latestMarkPrice = marks[0]?.price ?? null;
  const oldestWindowMark = marks.findLast?.((event) => now - event.timestamp <= 5 * MINUTE)?.price ?? marks.at(-1)?.price ?? null;
  const markPriceDelta =
    latestMarkPrice !== null && oldestWindowMark !== null ? latestMarkPrice - oldestWindowMark : null;
  const markPriceDeltaPct =
    latestMarkPrice !== null && oldestWindowMark ? (markPriceDelta ?? 0) / oldestWindowMark * 100 : null;

  const fillsLast60s = window60.filter((event) => event.type === "OrderFilled").length;
  const ordersLast60s = window60.filter((event) => event.type === "OrderPlaced").length;
  const cancelsLast60s = window60.filter((event) =>
    ["OrderCancelled", "OrderExpired", "OrderReduced"].includes(event.type),
  ).length;
  const bidPlacedQuantity60s = window60
    .filter((event) => event.type === "OrderPlaced" && event.side === "bid")
    .reduce((sum, event) => sum + (event.quantity ?? 0), 0);
  const askPlacedQuantity60s = window60
    .filter((event) => event.type === "OrderPlaced" && event.side === "ask")
    .reduce((sum, event) => sum + (event.quantity ?? 0), 0);
  const pressureDenominator = bidPlacedQuantity60s + askPlacedQuantity60s;
  const bidAskPressure =
    pressureDenominator > 0 ? (bidPlacedQuantity60s - askPlacedQuantity60s) / pressureDenominator : null;
  const fillCancelRatio = cancelsLast60s > 0 ? fillsLast60s / cancelsLast60s : fillsLast60s > 0 ? fillsLast60s : null;

  const markPrices = marks.slice(0, 30).map((event) => event.price ?? 0);
  const markMean = markPrices.length
    ? markPrices.reduce((sum, price) => sum + price, 0) / markPrices.length
    : null;
  const markVolatility =
    markMean && markPrices.length > 1
      ? Math.sqrt(markPrices.reduce((sum, price) => sum + (price - markMean) ** 2, 0) / markPrices.length) / markMean
      : null;
  const eventsPerSecond = window60.length / 60;
  const activityScore = clamp(Math.round(eventsPerSecond * 20 + fillsLast60s * 4 + ordersLast60s * 2), 0, 100);

  let health = 55;
  if (fillCancelRatio !== null) health += clamp(fillCancelRatio * 8, -8, 18);
  health -= clamp(cancelsLast60s * 1.4, 0, 26);
  health += clamp(ordersLast60s * 1.2, 0, 18);
  if (bidAskPressure !== null) health -= Math.abs(bidAskPressure) * 22;
  if (markVolatility !== null) health -= clamp(markVolatility * 700, 0, 24);
  const liquidityHealthScore = events.length > 0 ? clamp(Math.round(health), 0, 100) : null;

  return {
    totalEvents: events.length,
    eventsPerSecond,
    latestEventAt,
    latestMarkPrice,
    markPriceDelta,
    markPriceDeltaPct,
    fillsLast60s,
    ordersLast60s,
    cancelsLast60s,
    bidPlacedQuantity60s,
    askPlacedQuantity60s,
    bidAskPressure,
    fillCancelRatio,
    markVolatility,
    activityScore,
    liquidityHealthScore,
    spreadEstimate: null,
  };
}

export function buildActorProfiles(events: NormalizedDexEvent[], maxActors = 8): ActorProfile[] {
  // First pass: build orderId → owner mapping from OrderPlaced events
  const orderOwners = new Map<string, string>();
  for (const event of events) {
    if (event.type === "OrderPlaced" && event.orderId && event.actor) {
      orderOwners.set(event.orderId, event.actor);
    }
  }

  const profiles = new Map<string, ActorProfile>();

  const upsert = (address: string, timestamp: number, type: string) => {
    const existing =
      profiles.get(address) ??
      ({
        address,
        eventCount: 0,
        placements: 0,
        fills: 0,
        cancels: 0,
        lastSeen: timestamp,
        label: "High Activity Address",
      } satisfies ActorProfile);
    existing.eventCount += 1;
    existing.lastSeen = Math.max(existing.lastSeen, timestamp);
    if (type === "OrderPlaced") existing.placements += 1;
    if (type === "OrderFilled") existing.fills += 1;
    if (["OrderCancelled", "OrderExpired", "OrderReduced"].includes(type)) existing.cancels += 1;
    profiles.set(address, existing);
  };

  for (const event of events) {
    if (event.type === "OrderFilled") {
      // Attribute fill to both maker and taker via orderId lookup
      const maker = event.makerOrderId ? orderOwners.get(event.makerOrderId) : undefined;
      const taker = event.takerOrderId ? orderOwners.get(event.takerOrderId) : undefined;
      if (maker) upsert(maker, event.timestamp, "OrderFilled");
      if (taker && taker !== maker) upsert(taker, event.timestamp, "OrderFilled");
      if (!maker && !taker && event.actor) upsert(event.actor, event.timestamp, "OrderFilled");
      continue;
    }

    // Resolve actor: direct field, or fallback to orderId lookup
    let actor = event.actor;
    if (!actor && event.orderId) {
      actor = orderOwners.get(event.orderId) ?? null;
    }
    if (!actor) continue;

    upsert(actor, event.timestamp, event.type);
  }

  return [...profiles.values()]
    .map((profile) => ({
      ...profile,
      label:
        profile.cancels > profile.placements && profile.cancels > 2
          ? "Fast Canceller"
          : profile.fills > profile.placements && profile.fills > 1
            ? "Active Taker"
            : profile.placements > profile.fills && profile.placements > 2
              ? "Recent Liquidity Provider"
              : profile.fills > 1
                ? "Active Taker"
                : profile.eventCount > 3
                  ? "Frequent Maker"
                  : "High Activity Address",
    }))
    .sort((a, b) => b.eventCount - a.eventCount || b.lastSeen - a.lastSeen)
    .slice(0, maxActors);
}

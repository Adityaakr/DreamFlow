import { clamp } from "@/lib/format";
import type { NormalizedDexEvent, OrderBookSnapshot, PriceLevel } from "@/types/dex";

type TrackedOrder = {
  id: string;
  side: "bid" | "ask";
  price: number;
  quantity: number;
  updatedAt: number;
};

export function buildOrderBookSnapshot(events: NormalizedDexEvent[]): OrderBookSnapshot {
  const orders = new Map<string, TrackedOrder>();

  for (const event of [...events].reverse()) {
    const id = event.orderId;
    if (event.type === "OrderPlaced" && id && event.price !== null && event.quantity !== null && event.side !== "unknown") {
      if (event.quantity <= 0) {
        orders.delete(id);
        continue;
      }
      orders.set(id, {
        id,
        side: event.side,
        price: event.price,
        quantity: event.quantity,
        updatedAt: event.timestamp,
      });
      continue;
    }

    if ((event.type === "OrderCancelled" || event.type === "OrderExpired") && id) {
      orders.delete(id);
      continue;
    }

    if (event.type === "OrderReduced" && id && event.quantity !== null) {
      const order = orders.get(id);
      if (order) {
        order.quantity = event.quantity;
        order.updatedAt = event.timestamp;
      }
      continue;
    }

    if (event.type === "OrderFilled") {
      for (const candidate of [event.makerOrderId, event.takerOrderId]) {
        if (!candidate) continue;
        const order = orders.get(candidate);
        if (!order) continue;
        order.quantity = Math.max(0, order.quantity - (event.quantity ?? 0));
        order.updatedAt = event.timestamp;
        if (order.quantity <= 0) orders.delete(candidate);
      }
    }
  }

  const levelsByKey = new Map<string, PriceLevel>();
  for (const order of orders.values()) {
    const key = `${order.side}-${order.price}`;
    const existing =
      levelsByKey.get(key) ??
      ({
        side: order.side,
        price: order.price,
        quantity: 0,
        orders: 0,
        width: 0,
        updatedAt: order.updatedAt,
      } satisfies PriceLevel);
    existing.quantity += order.quantity;
    existing.orders += 1;
    existing.updatedAt = Math.max(existing.updatedAt, order.updatedAt);
    levelsByKey.set(key, existing);
  }

  const levels = [...levelsByKey.values()];
  const maxQuantity = Math.max(1, ...levels.map((level) => level.quantity));
  const withWidths = levels.map((level) => ({
    ...level,
    width: clamp((level.quantity / maxQuantity) * 100, 4, 100),
  }));
  const bids = withWidths
    .filter((level) => level.side === "bid")
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);
  const asks = withWidths
    .filter((level) => level.side === "ask")
    .sort((a, b) => a.price - b.price)
    .slice(0, 10);
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const spread = bestBid !== null && bestAsk !== null ? Math.max(0, bestAsk - bestBid) : null;
  const activeOrders = orders.size;
  const confidence =
    activeOrders > 60 && bids.length > 2 && asks.length > 2 ? "high" : activeOrders > 12 ? "medium" : "low";

  return {
    bids,
    asks,
    activeOrders,
    confidence,
    confidenceReason:
      confidence === "high"
        ? "Recent lifecycle events provide enough tracked orders for a dense best-effort view."
        : confidence === "medium"
          ? "Enough order lifecycle events arrived to estimate pressure, but this is still session-bound."
          : "Waiting for more OrderPlaced and lifecycle events before depth can be treated as strong.",
    bestBid,
    bestAsk,
    spread,
  };
}

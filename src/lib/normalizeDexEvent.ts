import { TOKENS } from "@/lib/contracts";
import {
  formatEventType,
  formatPrice,
  formatQuantity,
  getEventTimestamp,
  safeBigInt,
  scaledValue,
  shortenAddress,
} from "@/lib/format";
import type { StreamEvent } from "@/lib/dexEvent";
import type { NormalizedDexEvent, OrderSide } from "@/types/dex";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return null;
}

function readPlacedOrder(args: Record<string, unknown>): Record<string, unknown> {
  const placed = args.placedOrder;
  return isRecord(placed) ? placed : {};
}

function sideFromPlacedOrder(placed: Record<string, unknown>): OrderSide {
  if (typeof placed.isBid === "boolean") return placed.isBid ? "bid" : "ask";
  return "unknown";
}

function rawValue(value: unknown): string | null {
  const bigint = safeBigInt(value);
  return bigint === null ? null : bigint.toString();
}

function readableEvent(
  event: StreamEvent,
  side: OrderSide,
  price: number | null,
  quantity: number | null,
  owner: string | null,
): string {
  const sideLabel = side === "unknown" ? "Order" : side === "bid" ? "Bid" : "Ask";
  switch (event.eventName) {
    case "OrderPlaced":
      return `${sideLabel} placed${price !== null ? ` at ${formatPrice(price)}` : ""}${quantity !== null ? ` for ${formatQuantity(quantity, event.pool.base)}` : ""}`;
    case "OrderFilled":
      return `Order filled${quantity !== null ? `: ${formatQuantity(quantity, event.pool.base)} matched` : ""}`;
    case "OrderCancelled":
      return "Order cancelled";
    case "OrderExpired":
      return "Order expired";
    case "OrderReduced":
      return `Order reduced${quantity !== null ? ` to ${formatQuantity(quantity, event.pool.base)}` : ""}`;
    case "OrderRested":
      return "Order rested on book";
    case "MarkPriceUpdated":
      return `Mark price updated${price !== null ? ` to ${formatPrice(price)}` : ""}`;
    case "BuilderFeeCharged":
      return `Builder fee charged${owner ? ` by ${shortenAddress(owner)}` : ""}`;
    default:
      return formatEventType(event.eventName);
  }
}

export function normalizeDexEvent(event: StreamEvent): NormalizedDexEvent {
  const args = isRecord(event.args) ? event.args : {};
  const placed = readPlacedOrder(args);
  const timestamp = getEventTimestamp(event);
  const side = sideFromPlacedOrder(placed);
  const baseDecimals = TOKENS[event.pool.base]?.decimals ?? 18;

  const orderId =
    readString(args, "orderId") ??
    readString(placed, "orderId") ??
    readString(args, "makerOrderId") ??
    readString(args, "takerOrderId");
  const makerOrderId = readString(args, "makerOrderId");
  const takerOrderId = readString(args, "takerOrderId");
  const owner = readString(placed, "owner") ?? readString(args, "user") ?? readString(args, "builder");

  const priceSource =
    event.eventName === "MarkPriceUpdated" ? args.markPrice : placed.price ?? args.price;
  const quantitySource =
    event.eventName === "OrderReduced"
      ? args.newQuantity
      : event.eventName === "OrderFilled"
        ? args.quantityFilled
        : placed.quantityRemaining ?? placed.fullQuantity ?? args.amount;

  const price = scaledValue(priceSource, 18);
  const quantity = scaledValue(quantitySource, baseDecimals);

  return {
    id: `${event.txHash}-${event.logIndex}-${event.seq}`,
    seq: event.seq,
    type: event.eventName,
    timestamp,
    isoTimestamp: event.receivedAt,
    poolLabel: event.pool.label,
    poolAddress: event.pool.address,
    base: event.pool.base,
    quote: event.pool.quote,
    group: event.pool.group,
    side,
    price,
    priceRaw: rawValue(priceSource),
    quantity,
    quantityRaw: rawValue(quantitySource),
    orderId,
    makerOrderId,
    takerOrderId,
    owner,
    actor: owner,
    readable: readableEvent(event, side, price, quantity, owner),
    raw: event,
  };
}

export function normalizeDexEvents(events: readonly StreamEvent[]): NormalizedDexEvent[] {
  return events.map(normalizeDexEvent);
}

import type { StreamEvent, StreamStatus } from "@/lib/dexEvent";

export type DexEventType =
  | "OrderPlaced"
  | "OrderRested"
  | "OrderCancelled"
  | "OrderExpired"
  | "OrderReduced"
  | "OrderFilled"
  | "MarkPriceUpdated"
  | "OrderBookParametersUpdated"
  | "FeeRecipientUpdated"
  | "BuilderApproved"
  | "BuilderFeeCharged"
  | "MidpointEmaParametersUpdated"
  | "MidpointEmaReset"
  | "ContractApprovalUpdated"
  | "MaxBuilderFeeUpdated"
  | string;

export type OrderSide = "bid" | "ask" | "unknown";

export type Severity = "calm" | "active" | "volatile" | "stressed";

export type NormalizedDexEvent = {
  id: string;
  seq: number;
  type: DexEventType;
  timestamp: number;
  isoTimestamp: string;
  poolLabel: string;
  poolAddress: string;
  base: string;
  quote: string;
  group: "primary" | "mm";
  side: OrderSide;
  price: number | null;
  priceRaw: string | null;
  quantity: number | null;
  quantityRaw: string | null;
  orderId: string | null;
  makerOrderId: string | null;
  takerOrderId: string | null;
  owner: string | null;
  actor: string | null;
  readable: string;
  raw: StreamEvent;
};

export type MetricSnapshot = {
  totalEvents: number;
  eventsPerSecond: number;
  latestEventAt: number | null;
  latestMarkPrice: number | null;
  markPriceDelta: number | null;
  markPriceDeltaPct: number | null;
  fillsLast60s: number;
  ordersLast60s: number;
  cancelsLast60s: number;
  bidPlacedQuantity60s: number;
  askPlacedQuantity60s: number;
  bidAskPressure: number | null;
  fillCancelRatio: number | null;
  markVolatility: number | null;
  activityScore: number;
  liquidityHealthScore: number | null;
  spreadEstimate: number | null;
};

export type PricePoint = {
  seq: number;
  time: string;
  timestamp: number;
  price: number;
  poolLabel: string;
};

export type PriceLevel = {
  side: "bid" | "ask";
  price: number;
  quantity: number;
  orders: number;
  width: number;
  updatedAt: number;
};

export type OrderBookSnapshot = {
  bids: PriceLevel[];
  asks: PriceLevel[];
  activeOrders: number;
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
};

export type Anomaly = {
  id: string;
  headline: string;
  severity: Severity;
  eventCount: number;
  window: string;
  evidence: string[];
  relatedEventTypes: string[];
};

export type PulseInsight = {
  headline: string;
  summary: string;
  severity: Severity;
  confidence: number;
  evidence: string[];
  window: string;
  mode: "Rule-based" | "AI-assisted";
  suggestedUserAction: string;
};

export type ActorProfile = {
  address: string;
  eventCount: number;
  placements: number;
  fills: number;
  cancels: number;
  lastSeen: number;
  label: string;
};

export type DreamFlowState = {
  status: StreamStatus;
  rawEvents: readonly StreamEvent[];
  events: NormalizedDexEvent[];
};

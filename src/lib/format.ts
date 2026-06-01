export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function safeBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value !== "string") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function bigintToNumberSafe(value: bigint, decimals = 0): number | null {
  const safeDecimals = Math.max(0, Math.min(decimals, 18));
  const divisor = 10n ** BigInt(safeDecimals);
  const whole = Number(value / divisor);
  const remainder = Number(value % divisor);
  const scaled = whole + remainder / 10 ** safeDecimals;
  return Number.isFinite(scaled) ? scaled : null;
}

export function scaledValue(value: unknown, decimals: number): number | null {
  const bigint = safeBigInt(value);
  if (bigint === null) return null;
  return bigintToNumberSafe(bigint, decimals);
}

export function shortenAddress(value: string | null | undefined, chars = 4): string {
  if (!value) return "unknown";
  if (value.length <= chars * 2 + 4) return value;
  return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

export function formatQuantity(value: number | null | undefined, symbol?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unavailable";
  const suffix = symbol ? ` ${symbol}` : "";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M${suffix}`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K${suffix}`;
  if (Math.abs(value) >= 1) return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}${suffix}`;
  return `${value.toLocaleString(undefined, { maximumSignificantDigits: 4 })}${suffix}`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unavailable";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(value) >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
  return value.toLocaleString(undefined, { maximumSignificantDigits: 6 });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatEventType(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function getEventTimestamp(value: { receivedAt?: string }): number {
  const time = value.receivedAt ? Date.parse(value.receivedAt) : Date.now();
  return Number.isFinite(time) ? time : Date.now();
}

export function formatClock(timestamp: number | null | undefined): string {
  if (!timestamp) return "waiting";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

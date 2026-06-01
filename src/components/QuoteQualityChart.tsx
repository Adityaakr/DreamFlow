"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { formatPrice } from "@/lib/format";
import type { OrderBookSnapshot } from "@/types/dex";

type QuoteQualityChartProps = {
  book: OrderBookSnapshot;
  market: string;
};

type QuoteQualityPoint = {
  timestamp: number;
  time: string;
  spreadBps: number;
  bestBid: number;
  bestAsk: number;
};

function calculateSpreadBps(bestBid: number | null, bestAsk: number | null) {
  if (bestBid === null || bestAsk === null || bestBid <= 0 || bestAsk <= 0 || bestAsk < bestBid) return null;
  const midPrice = (bestBid + bestAsk) / 2;
  if (midPrice <= 0) return null;
  return ((bestAsk - bestBid) / midPrice) * 10_000;
}

function qualityForSpread(spreadBps: number | null) {
  if (spreadBps === null) {
    return {
      label: "Waiting",
      className: "text-[var(--text-secondary)]",
      insight: "Waiting for enough real DreamDEX order events to estimate top-of-book quote quality.",
    };
  }
  if (spreadBps <= 5) {
    return {
      label: "Excellent",
      className: "text-[var(--accent-green)]",
      insight: "Top-of-book quotes are very tight right now.",
    };
  }
  if (spreadBps <= 15) {
    return {
      label: "Strong",
      className: "text-[var(--accent-cyan)]",
      insight: "Quote quality looks strong. Makers are quoting close to the top of book.",
    };
  }
  if (spreadBps <= 30) {
    return {
      label: "Moderate",
      className: "text-[var(--accent-orange)]",
      insight: "Quote quality is moderate. There is room for tighter quotes.",
    };
  }
  return {
    label: "Wide",
    className: "text-[var(--accent-red)]",
    insight: "Top-of-book spread is wide. The market may need stronger maker competition.",
  };
}

function formatBps(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function QuoteQualityChart({ book, market }: QuoteQualityChartProps) {
  const chartHost = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState<QuoteQualityPoint[]>([]);
  const spreadBps = calculateSpreadBps(book.bestBid, book.bestAsk);
  const quality = qualityForSpread(spreadBps);
  const latest = points.at(-1);

  useEffect(() => {
    const element = chartHost.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setChartSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (spreadBps === null || book.bestBid === null || book.bestAsk === null) return;
    const timestamp = Date.now();
    const point: QuoteQualityPoint = {
      timestamp,
      time: new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(timestamp),
      spreadBps,
      bestBid: book.bestBid,
      bestAsk: book.bestAsk,
    };

    setPoints((current) => {
      const previous = current.at(-1);
      if (
        previous &&
        previous.bestBid === point.bestBid &&
        previous.bestAsk === point.bestAsk &&
        timestamp - previous.timestamp < 3_000
      ) {
        return current;
      }
      return [...current, point].slice(-240);
    });
  }, [book.bestAsk, book.bestBid, spreadBps]);

  const yDomain = useMemo(() => {
    if (points.length === 0) return [0, 30] as [number, number];
    const values = points.map((point) => point.spreadBps);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 30);
    const pad = Math.max(1, (max - min) * 0.08);
    return [Math.max(0, min - pad), max + pad] as [number, number];
  }, [points]);

  return (
    <section className="bb-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-panel)] px-3 py-2">
        <div>
          <h2 className="bb-title">QUOTE QUALITY</h2>
          <p className="bb-label">{market}/USDso · TOP-OF-BOOK SPREAD BPS</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-[11px] sm:grid-cols-4">
          <div>
            <p className="bb-label">Best bid</p>
            <p className="font-mono text-[var(--accent-green)]">{formatPrice(book.bestBid)}</p>
          </div>
          <div>
            <p className="bb-label">Best ask</p>
            <p className="font-mono text-[var(--accent-red)]">{formatPrice(book.bestAsk)}</p>
          </div>
          <div>
            <p className="bb-label">Spread</p>
            <p className="font-mono text-[var(--text-primary)]">{formatBps(spreadBps)} bps</p>
          </div>
          <div>
            <p className="bb-label">Quality</p>
            <p className={`font-black uppercase ${quality.className}`}>{quality.label}</p>
          </div>
        </div>
      </div>

      <div className="h-[240px] min-w-0 p-2 xl:h-[320px] 2xl:h-[360px]">
        <div ref={chartHost} className="relative h-full min-h-0 min-w-0">
          {spreadBps === null ? (
            <div className="absolute inset-0 flex items-center justify-center border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-6 text-center text-xs leading-5 text-[var(--text-secondary)]">
              Waiting for enough real DreamDEX order events to estimate top-of-book quote quality.
            </div>
          ) : chartSize.width > 0 && chartSize.height > 0 && points.length > 0 ? (
            <LineChart width={chartSize.width} height={chartSize.height} data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#4e4e4e", fontSize: 10 }} minTickGap={28} tickLine={false} axisLine={false} />
              <YAxis
                domain={yDomain}
                tick={{ fill: "#6f6f6f", fontSize: 10 }}
                tickFormatter={(value) => `${formatBps(Number(value))}`}
                tickLine={false}
                axisLine={false}
                width={54}
              />
              {[5, 15, 30].map((value) => (
                <ReferenceLine
                  key={value}
                  y={value}
                  stroke="rgba(255,255,255,0.16)"
                  strokeDasharray="3 5"
                  label={{ value: `${value}`, fill: "#4e4e4e", fontSize: 10, position: "insideRight" }}
                />
              ))}
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #1e1e1e",
                  borderRadius: 0,
                  color: "#e8e8e8",
                }}
                formatter={(value) => [`${formatBps(Number(value))} bps`, "Spread"]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as QuoteQualityPoint | undefined;
                  return row ? `Bid ${formatPrice(row.bestBid)} · Ask ${formatPrice(row.bestAsk)}` : "Quote quality";
                }}
              />
              <Line
                type="monotone"
                dataKey="spreadBps"
                stroke="#6abfcf"
                strokeWidth={2}
                dot={points.length <= 3 ? { r: 3, fill: "#e8e8e8", stroke: "#6abfcf", strokeWidth: 2 } : false}
                activeDot={{ r: 4, fill: "#e8e8e8", stroke: "#6abfcf", strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={250}
                animationEasing="ease-in-out"
              />
            </LineChart>
          ) : null}
          {latest ? (
            <p className="absolute bottom-2 right-2 border border-[var(--border-panel)] bg-black/80 px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
              latest {formatBps(latest.spreadBps)} bps
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--border-panel)] px-3 py-2">
        <p className="text-xs leading-5 text-[var(--text-secondary)]">{quality.insight}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          Estimated from live DreamDEX order events. Does not calculate actual yield payouts.
        </p>
      </div>
    </section>
  );
}

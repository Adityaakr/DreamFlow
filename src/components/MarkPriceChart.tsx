"use client";

import { useEffect, useRef, useState } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceDot } from "recharts";
import { formatPrice } from "@/lib/format";
import type { PricePoint } from "@/types/dex";

type MarkPriceChartProps = {
  points: PricePoint[];
};

const LIVE_WINDOW_MS = 2 * 60_000;

export function MarkPriceChart({ points }: MarkPriceChartProps) {
  const now = Date.now();
  const rangedPoints = points.filter((point) => now - point.timestamp <= LIVE_WINDOW_MS);
  const chartPoints = rangedPoints.length > 0 ? rangedPoints : points.slice(-1);
  const latest = points.at(-1);
  const prices = chartPoints.map((point) => point.price).filter(Number.isFinite);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const yDomain =
    minPrice !== null && maxPrice !== null
      ? (() => {
          const span = maxPrice - minPrice;
          const pad = span > 0 ? span * 0.18 : Math.max(0.000001, Math.abs(maxPrice) * 0.0002);
          return [minPrice - pad, maxPrice + pad] as [number, number];
        })()
      : ["dataMin", "dataMax"];
  const chartHost = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

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

  return (
    <section className="bb-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-panel)] px-3 py-2">
        <div>
          <h2 className="bb-title">MARK PRICE</h2>
          <p className="bb-label">{latest?.poolLabel ?? "MarkPriceUpdated prints only"}</p>
        </div>
        <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{latest ? formatPrice(latest.price) : "--"}</p>
      </div>

      <div className="h-[280px] min-w-0 p-2 xl:h-[360px] 2xl:h-[420px]">
        <div ref={chartHost} className="relative h-full min-h-0 min-w-0">
          {points.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-6 text-center">
            <p className="text-sm font-bold text-[var(--text-primary)]">NO MARK PRICE OBSERVED YET</p>
            <p className="mt-2 max-w-sm text-xs text-[var(--text-secondary)]">Waiting for real MarkPriceUpdated events from Somnia mainnet.</p>
          </div>
          ) : chartSize.width > 0 && chartSize.height > 0 ? (
            <LineChart width={chartSize.width} height={chartSize.height} data={chartPoints} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#4e4e4e", fontSize: 10 }} minTickGap={28} tickLine={false} axisLine={false} />
              <YAxis
                domain={yDomain}
                tick={{ fill: "#6f6f6f", fontSize: 10 }}
                tickFormatter={(value) => formatPrice(Number(value))}
                tickLine={false}
                axisLine={false}
                width={72}
                padding={{ top: 8, bottom: 8 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #1e1e1e",
                  borderRadius: 0,
                  color: "#e8e8e8",
                }}
                formatter={(value) => [formatPrice(Number(value)), "Mark price"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.poolLabel ?? "Mark price"}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#6abfcf"
                strokeWidth={2}
                dot={points.length <= 2 ? { r: 3, fill: "#e8e8e8", stroke: "#6abfcf", strokeWidth: 2 } : false}
                activeDot={{ r: 4, fill: "#e8e8e8", stroke: "#6abfcf", strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-in-out"
              />
              {latest ? (
                <ReferenceDot x={latest.time} y={latest.price} r={3} fill="#e8e8e8" stroke="#000000" strokeWidth={2} />
              ) : null}
            </LineChart>
          ) : null}
        </div>
      </div>
    </section>
  );
}

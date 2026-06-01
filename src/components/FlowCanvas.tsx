import { useEffect, useRef } from "react";
import type { NormalizedDexEvent } from "@/types/dex";

type Particle = {
  color: string;
  life: number;
  maxLife: number;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

function colorForEvent(event: NormalizedDexEvent) {
  if (event.type === "OrderFilled") return "rgba(255,255,255,0.95)";
  if (event.type === "OrderCancelled" || event.type === "OrderExpired" || event.type === "OrderReduced") return "rgba(231,76,76,0.85)";
  if (event.side === "bid") return "rgba(46,204,113,0.9)";
  if (event.side === "ask") return "rgba(231,76,76,0.9)";
  return "rgba(106,191,207,0.75)";
}

function yForEvent(event: NormalizedDexEvent, height: number) {
  if (event.type === "OrderFilled") return height * 0.5;
  if (event.side === "bid") return height * 0.72;
  if (event.side === "ask") return height * 0.28;
  return height * 0.5;
}

export function FlowCanvas({ events, market }: { events: NormalizedDexEvent[]; market: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let animation = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const pushLatestEvents = () => {
      const rect = canvas.getBoundingClientRect();
      for (const event of events.slice(0, 18).reverse()) {
        if (seen.current.has(event.id)) continue;
        seen.current.add(event.id);
        if (seen.current.size > 800) seen.current = new Set([...seen.current].slice(-400));
        const size = Math.min(18, 3 + Math.sqrt(Math.max(0, event.quantity ?? 0)) * 1.2);
        particles.current.push({
          x: ((event.seq * 47) % Math.max(1, rect.width - 24)) + 12,
          y: yForEvent(event, rect.height),
          vx: event.side === "ask" ? -0.45 : event.side === "bid" ? 0.45 : 0,
          vy: event.type === "OrderFilled" ? -0.15 : 0,
          radius: event.type === "OrderFilled" ? size + 6 : size,
          life: event.type === "OrderCancelled" ? 46 : 78,
          maxLife: event.type === "OrderCancelled" ? 46 : 78,
          color: colorForEvent(event),
        });
      }
      particles.current = particles.current.slice(-180);
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      context.fillStyle = "rgba(0,0,0,0.2)";
      context.fillRect(0, 0, rect.width, rect.height);
      context.strokeStyle = "rgba(255,255,255,0.08)";
      context.beginPath();
      context.moveTo(0, rect.height * 0.5);
      context.lineTo(rect.width, rect.height * 0.5);
      context.stroke();

      for (const particle of particles.current) {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        context.beginPath();
        context.fillStyle = particle.color.replace(/[\d.]+\)$/g, `${alpha})`);
        context.arc(particle.x, particle.y, particle.radius * (1 + (1 - alpha) * 1.4), 0, Math.PI * 2);
        context.fill();
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= reducedMotion ? 4 : 1;
      }
      particles.current = particles.current.filter((particle) => particle.life > 0);

      context.fillStyle = "rgba(46,204,113,0.55)";
      context.font = "10px Satoshi, sans-serif";
      context.fillText("BIDS", 10, rect.height - 14);
      context.fillStyle = "rgba(231,76,76,0.55)";
      context.fillText("ASKS", 10, 18);
      context.fillStyle = "rgba(255,255,255,0.45)";
      context.fillText("FILLS RIPPLE MIDLINE", Math.max(10, rect.width - 140), rect.height * 0.5 - 8);
    };

    const tick = () => {
      if (frame % 4 === 0) pushLatestEvents();
      draw();
      frame += 1;
      if (!reducedMotion) animation = window.requestAnimationFrame(tick);
    };

    resize();
    pushLatestEvents();
    draw();
    if (!reducedMotion) animation = window.requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (animation) window.cancelAnimationFrame(animation);
    };
  }, [events]);

  return (
    <section className="bb-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] px-3 py-2">
        <div>
          <h2 className="bb-title">FLOW ART</h2>
          <p className="bb-label">BIDS PAINT GREEN · ASKS RED · FILLS RIPPLE</p>
        </div>
        <span className="text-[11px] font-bold text-[var(--text-secondary)]">{market}</span>
      </div>
      <canvas ref={canvasRef} className="block h-[240px] w-full bg-black" aria-label="Generative visualization of live order flow" />
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import type { PulseEvidence } from "@/lib/pulseAgent";
import type { PulseInsight } from "@/types/dex";

type AiPulseAgentProps = {
  insight: PulseInsight;
  evidence: PulseEvidence;
};

type AgentState = "checking" | "offline" | "live";

type AiPulseResponse = {
  available?: boolean;
  configured?: boolean;
  reason?: string;
  model?: string;
  insight?: PulseInsight;
};

const severityClass = {
  calm: "text-[var(--text-primary)]",
  active: "text-[var(--accent-green)]",
  volatile: "text-[var(--accent-orange)]",
  stressed: "text-[var(--accent-red)]",
};

const severityBorderClass = {
  calm: "border-[var(--border-panel)]",
  active: "border-[rgba(46,204,113,0.35)]",
  volatile: "border-[rgba(224,144,48,0.45)]",
  stressed: "border-[rgba(231,76,76,0.45)]",
};

export function AiPulseAgent({ insight, evidence }: AiPulseAgentProps) {
  const [aiOverride, setAiOverride] = useState<PulseInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>("checking");
  const [model, setModel] = useState<string | null>(null);
  const lastAutoRequestAt = useRef(0);
  const inFlight = useRef(false);

  const recentEventCount = useMemo(
    () => Object.values(evidence.eventTypes).reduce((total, count) => total + count, 0),
    [evidence.eventTypes],
  );

  useEffect(() => {
    let cancelled = false;

    async function checkAgent() {
      try {
        const response = await fetch("/api/ai-pulse");
        const data = (await response.json()) as AiPulseResponse;
        if (cancelled) return;
        setModel(data.model ?? null);
        setAgentState(data.configured ? "live" : "offline");
        if (!data.configured) {
          setNote("Add OPENROUTER_API_KEY to dreamflow/.env.local and restart the dev server to enable live AI.");
        }
      } catch {
        if (!cancelled) {
          setAgentState("offline");
          setNote("Pulse Agent status check failed. Using deterministic rules.");
        }
      }
    }

    void checkAgent();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = aiOverride ?? insight;

  const refreshAi = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setNote(null);
    try {
      const response = await fetch("/api/ai-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evidence),
      });
      const data = (await response.json()) as AiPulseResponse;
      setModel(data.model ?? model);
      if (data.available && data.insight) {
        setAiOverride(data.insight);
        setAgentState("live");
      } else {
        setAiOverride(null);
        setAgentState(data.configured ? "live" : "offline");
        setNote(data.reason ?? "AI unavailable. Using deterministic Pulse Agent.");
      }
    } catch {
      setAiOverride(null);
      setNote("AI unavailable. Using deterministic Pulse Agent.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [evidence, model]);

  useEffect(() => {
    if (agentState !== "live" || recentEventCount === 0) return;

    const now = Date.now();
    if (now - lastAutoRequestAt.current < 3_000) return;
    lastAutoRequestAt.current = now;

    const timer = window.setTimeout(() => {
      void refreshAi();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [agentState, recentEventCount, evidence.generatedAt, refreshAi]);

  const statusLabel =
    agentState === "checking"
      ? "CHECKING AI"
      : agentState === "live"
        ? aiOverride
          ? "AI-ASSISTED LIVE"
          : "AI LIVE READY"
        : current.mode.toUpperCase();

  return (
    <section className="bb-panel flex max-h-[520px] flex-col p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="bb-title">PULSE AGENT</h2>
          <p className="bb-label">{statusLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAi()}
          disabled={loading}
          className="bb-focus inline-flex min-h-8 items-center gap-2 border border-[var(--border-panel)] bg-[var(--bg-terminal)] px-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-panel)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={loading ? "h-3.5 w-3.5 motion-safe:animate-spin" : "h-3.5 w-3.5"} aria-hidden="true" />
          EXPLAIN
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-2 grid grid-cols-3 gap-1 text-[10px]">
          <div className={`border px-2 py-1 ${severityBorderClass[current.severity]}`}>
            <p className="bb-label">Signal</p>
            <p className={`mt-0.5 font-black ${severityClass[current.severity]}`}>{current.severity.toUpperCase()}</p>
          </div>
          <div className="border border-[var(--border-panel)] px-2 py-1">
            <p className="bb-label">Conf</p>
            <p className="mt-0.5 font-mono text-[var(--text-primary)]">{Math.round(current.confidence * 100)}%</p>
          </div>
          <div className="border border-[var(--border-panel)] px-2 py-1">
            <p className="bb-label">Window</p>
            <p className="mt-0.5 truncate font-mono text-[var(--text-primary)]">{current.window.toUpperCase()}</p>
          </div>
        </div>

        <div className={`border p-2 ${severityBorderClass[current.severity]}`}>
          <h3 className="text-[13px] font-black leading-5 text-[var(--text-primary)]">{current.headline.toUpperCase()}</h3>
          <p className="mt-1 text-[11px] leading-[1.55] text-[var(--text-secondary)]">{current.summary}</p>
        </div>

        <ul className="mt-3 space-y-1">
          {current.evidence.map((item) => (
            <li key={item} className="border-l-2 border-[var(--border-strong)] pl-2 text-[11px] text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">•</span> {item}
            </li>
          ))}
        </ul>

        {note ? <p className="mt-3 text-xs text-[var(--accent-orange)]">{note}</p> : null}
      </div>

      <p className="mt-3 shrink-0 border-t border-[var(--border-panel)] pt-2 text-[11px] text-[var(--text-muted)]">
        <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Grounded only in stream evidence. Not financial advice.{model ? ` Model: ${model}.` : ""}
      </p>
    </section>
  );
}

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
  const primaryEvidence = current.evidence.slice(0, 4);
  const hiddenEvidenceCount = Math.max(0, current.evidence.length - primaryEvidence.length);
  const activePools = Object.keys(evidence.pools).length;
  const dominantEvent = Object.entries(evidence.eventTypes).sort((a, b) => b[1] - a[1])[0] ?? null;

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
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="bb-title">PULSE AGENT</h2>
          <p className="bb-label">{statusLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAi()}
          disabled={loading}
          className="bb-focus group inline-flex min-h-8 w-[104px] items-center justify-center gap-2 border border-[var(--border-panel)] bg-[var(--bg-terminal)] px-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-panel)] disabled:cursor-not-allowed disabled:text-[var(--text-secondary)]"
          aria-busy={loading}
        >
          {loading ? (
            <span className="grid h-3.5 w-3.5 grid-cols-3 items-end gap-[2px]" aria-hidden="true">
              <span className="h-1.5 bg-[var(--accent-cyan)] motion-safe:animate-pulse" />
              <span className="h-3 bg-[var(--accent-cyan)] motion-safe:animate-pulse" style={{ animationDelay: "120ms" }} />
              <span className="h-2 bg-[var(--accent-cyan)] motion-safe:animate-pulse" style={{ animationDelay: "240ms" }} />
            </span>
          ) : (
            <RefreshCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" aria-hidden="true" />
          )}
          {loading ? "THINKING" : "EXPLAIN"}
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

        <div className="mt-2 grid grid-cols-3 gap-px bg-[var(--border-panel)] text-[10px]">
          <div className="bg-[var(--bg-terminal)] p-2">
            <p className="bb-label">Events/s</p>
            <p className="mt-1 font-mono text-[var(--text-primary)]">{evidence.metrics.eventsPerSecond.toFixed(2)}</p>
          </div>
          <div className="bg-[var(--bg-terminal)] p-2">
            <p className="bb-label">Fills</p>
            <p className="mt-1 font-mono text-[var(--text-primary)]">{evidence.metrics.fillsLast60s}</p>
          </div>
          <div className="bg-[var(--bg-terminal)] p-2">
            <p className="bb-label">Pools</p>
            <p className="mt-1 font-mono text-[var(--text-primary)]">{activePools}</p>
          </div>
        </div>

        <div className="mt-2 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="bb-title">STREAM EVIDENCE</p>
            {dominantEvent ? (
              <span className="truncate font-mono text-[9px] text-[var(--text-muted)]">
                {dominantEvent[0]} x{dominantEvent[1]}
              </span>
            ) : null}
          </div>
          <ul className="mt-2 space-y-1">
            {primaryEvidence.map((item) => (
              <li key={item} className="grid grid-cols-[10px_1fr] gap-1 text-[10px] leading-4 text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">•</span>
                <span>{item}</span>
              </li>
            ))}
            {hiddenEvidenceCount > 0 ? (
              <li className="pl-[14px] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                +{hiddenEvidenceCount} more evidence item{hiddenEvidenceCount === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>
        </div>

        <div className="mt-2 border border-[var(--border-panel)] bg-[var(--bg-terminal)] p-2">
          <p className="bb-label">Suggested check</p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">{current.suggestedUserAction}</p>
        </div>

        {note ? <p className="mt-2 border border-[rgba(224,144,48,0.35)] bg-[var(--bg-terminal)] p-2 text-[10px] leading-4 text-[var(--accent-orange)]">{note}</p> : null}
      </div>

      <p className="mt-2 shrink-0 border-t border-[var(--border-panel)] pt-2 text-[10px] leading-4 text-[var(--text-muted)]">
        <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Grounded only in stream evidence. Not financial advice.{model ? ` Model: ${model}.` : ""}
      </p>
    </section>
  );
}

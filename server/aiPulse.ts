import type { Request, Response } from "express";
import type { PulseEvidence } from "../src/lib/pulseAgent";
import type { PulseInsight } from "../src/types/dex";

const SYSTEM_PROMPT = `You are DreamFlow Pulse Agent, a market microstructure narrator for DreamDEX on Somnia. Use only the JSON evidence provided. Do not predict future prices. Do not give financial advice. Do not invent identities, intent, or offchain explanations. Mention exact numbers from the evidence. If evidence is weak, say signal is weak. Output valid JSON only.`;

function pulseConfig() {
  return {
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5",
  };
}

function fallbackPayload(reason: string) {
  return {
    available: false,
    reason,
    ...pulseConfig(),
  };
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function parseModelJson(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced) as unknown;

    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(content.slice(firstBrace, lastBrace + 1)) as unknown;
    }
    throw new Error("No JSON object found in model response");
  }
}

function describeShape(value: unknown) {
  if (typeof value !== "object" || value === null) return typeof value;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).slice(0, 8).join(", ");
  const severity = "severity" in record ? `; severity=${String(record.severity)}` : "";
  return `keys=[${keys}]${severity}`;
}

function isPulseEvidence(value: unknown): value is PulseEvidence {
  return typeof value === "object" && value !== null && "metrics" in value && "eventTypes" in value;
}

function evidenceFallback(evidence: PulseEvidence) {
  const poolCount = Object.keys(evidence.pools).length;
  return [
    `${evidence.metrics.fillsLast60s} fills in ${evidence.window}.`,
    `${evidence.metrics.eventsPerSecond.toFixed(2)} events/sec observed.`,
    `${poolCount} active pool${poolCount === 1 ? "" : "s"} in evidence.`,
  ];
}

function sanitizeInsight(value: unknown, fallbackEvidence: string[]): PulseInsight | null {
  if (typeof value !== "object" || value === null) return null;
  const source = value as Record<string, unknown>;
  const nested =
    typeof source.insight === "object" && source.insight !== null
      ? source.insight
      : typeof source.pulse === "object" && source.pulse !== null
        ? source.pulse
        : value;
  const record = nested as Record<string, unknown>;
  const severity = normalizeSeverity(record.severity);
  if (!severity) return null;

  const modelEvidence =
    record.evidence ??
    record.supportingEvidence ??
    record.observations ??
    record.signals ??
    [];
  const normalizedEvidence = Array.isArray(modelEvidence)
    ? modelEvidence.map(String).filter(Boolean).slice(0, 5)
    : [];

  return {
    headline: String(record.headline ?? "AI-assisted stream summary"),
    summary: String(record.summary ?? "The model returned a grounded summary of the supplied stream evidence."),
    severity,
    confidence: normalizeConfidence(record.confidence),
    evidence: normalizedEvidence.length > 0 ? normalizedEvidence : fallbackEvidence,
    window: String(record.window ?? "Last 60s"),
    mode: "AI-assisted",
    suggestedUserAction: String(
      record.suggestedUserAction ?? record.suggestedAction ?? "Review supporting raw events",
    ),
  };
}

function normalizeSeverity(value: unknown): PulseInsight["severity"] | null {
  const severity = String(value ?? "").toLowerCase();
  if (["calm", "active", "volatile", "stressed"].includes(severity)) {
    return severity as PulseInsight["severity"];
  }
  if (["none", "low", "quiet", "stable"].includes(severity)) return "calm";
  if (["medium", "moderate", "elevated", "busy"].includes(severity)) return "active";
  if (["high", "strong", "volatile"].includes(severity)) return "volatile";
  if (["critical", "severe", "stressed"].includes(severity)) return "stressed";
  return null;
}

function normalizeConfidence(value: unknown) {
  const confidence = Number(value ?? 0.5);
  if (!Number.isFinite(confidence)) return 0.5;
  return Math.max(0, Math.min(1, confidence));
}

export function getAiPulseStatus(_request: Request, response: Response) {
  response.json(pulseConfig());
}

export async function postAiPulse(request: Request, response: Response) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    response.json(fallbackPayload("OPENROUTER_API_KEY is not configured. Using deterministic Pulse Agent."));
    return;
  }

  const evidence = request.body as unknown;
  if (!isPulseEvidence(evidence)) {
    response.status(400).json({ error: "Expected compact PulseEvidence payload." });
    return;
  }

  try {
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "DreamFlow",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5",
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Return only JSON with headline, summary, severity, confidence, evidence, window, suggestedUserAction. No trading advice.",
              evidence,
            }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text();
      const trimmed = errorBody.replace(/\s+/g, " ").slice(0, 180);
      response.json(
        fallbackPayload(
          `OpenRouter request failed with ${openRouterResponse.status}${trimmed ? `: ${trimmed}` : "."}`,
        ),
      );
      return;
    }

    const data = (await openRouterResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      response.json(fallbackPayload("OpenRouter returned an empty response."));
      return;
    }

    let parsed: unknown;
    try {
      parsed = parseModelJson(content);
    } catch {
      response.json(fallbackPayload("OpenRouter returned non-JSON content."));
      return;
    }

    const insight = sanitizeInsight(parsed, evidenceFallback(evidence));
    if (!insight) {
      response.json(fallbackPayload(`OpenRouter returned an unexpected JSON shape: ${describeShape(parsed)}.`));
      return;
    }

    response.json({ available: true, insight });
  } catch (error) {
    response.json(fallbackPayload(`AI pulse request failed: ${safeErrorMessage(error)}.`));
  }
}

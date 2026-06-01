# DreamFlow — Live CLOB Intelligence for Somnia

DreamFlow turns the starter Somnia DEX stream into a real-time market intelligence cockpit for DreamDEX mainnet events.

## What I Built

The starter repo streamed decoded DreamDEX order-flow events and rendered raw JSON. DreamFlow keeps that real stream intact, then adds a polished cockpit with live metrics, mark price charts, readable event tape, best-effort order-flow reconstruction, liquidity health scoring, anomaly detection, behavioral actor flow, and Pulse Agent narration.

## Why

Raw JSON proves data exists. DreamFlow shows that Somnia can power real-time onchain market intelligence, agent-readable market state, and high-frequency DeFi UX from live mainnet events.

## Real Data Pipeline

No fake order data is generated. No mock tape is rendered. If the stream is quiet, DreamFlow shows honest waiting states.

```txt
DreamDEX Mainnet Events
→ Upstream WebSocket
→ Express SSE Endpoint
→ Vite + TanStack Router App
→ useDexStream Hook
→ Event Normalizer
→ Rolling Metrics + OrderBook Engine + Anomaly Rules
→ DreamFlow UI + Optional Pulse Agent
```

## Core Features

- live MarkPriceUpdated chart
- readable event tape with expandable raw JSON proof
- order-flow pressure heatmap
- liquidity health score
- deterministic anomaly detection
- behavioral actor flow from owner fields
- Pulse Agent with deterministic fallback
- optional OpenRouter AI-assisted summary grounded in compact evidence

## AI / Agent Layer

Pulse Agent works without an API key using deterministic rules. If `OPENROUTER_API_KEY` is configured server-side, `/api/ai-pulse` can ask OpenRouter for an AI-assisted summary using compact aggregated evidence only. The default model is `anthropic/claude-sonnet-4.5`, configurable with `OPENROUTER_MODEL`.

The AI route is constrained to avoid price prediction, financial advice, invented identities, outside news, and ungrounded claims.

## Optional Database

`DATABASE_URL` is reserved as an optional server-only setting for future persistence or replay. The current product is session-based and does not require a database.

## Tradeoffs

- Order book reconstruction is best-effort and depends on available lifecycle fields in the current session window.
- There is no trade execution or wallet connection.
- Analytics are session-based, not historical database analytics.
- AI is narration only and always has a deterministic fallback.
- DreamFlow does not display fake data during quiet market periods.

## What I Would Do With Another Day

- persistent event storage
- replay mode
- alert subscriptions
- agent strategy simulator
- market maker dashboard
- shareable market pulse cards

## How This Helps Somnia

- DevRel: shows builders how to build real-time apps from Somnia streams
- BD: demonstrates a useful view for trading teams and market makers
- Marketing: visually proves fast, reactive, agentic DeFi
- Ecosystem: provides a starter pattern for reactive onchain apps

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

The dev server is a small Express API host with Vite middleware. It preserves:

- `GET /api/stream` for live SSE market events
- `GET /api/ai-pulse` for agent configuration status
- `POST /api/ai-pulse` for OpenRouter-backed Pulse Agent summaries

Useful checks:

```bash
npm run typecheck
npm run build
```

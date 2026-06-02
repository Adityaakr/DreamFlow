# DreamFlow

Live order-flow intelligence for Somnia DreamDEX.

DreamFlow turns real DreamDEX mainnet stream events into a real-time market intelligence terminal. It keeps the live event stream intact, then adds readable analytics, agent summaries, order-flow reconstruction, anomaly detection, and a polished UI for understanding what is happening on DreamDEX as it happens.

## Overview

DreamDEX emits rich onchain market events, but raw event logs are hard to read in real time. DreamFlow makes that stream usable by translating decoded events into a live cockpit for traders, builders, market makers, and future Somnia agents.

The app does not generate fake order data or mock chart points. If the market is quiet or the stream does not have enough context, DreamFlow shows honest waiting and best-effort states.

## Project Note

I built DreamFlow because it is useful: it helps people understand what is happening on DreamDEX without staring at raw event logs. This is an initial version, but the direction is clear. DreamFlow can become a live market-intelligence surface for Somnia agents, traders, builders, and anyone who wants to feel the speed and execution quality of Somnia in real time.

With another day, I would make DreamFlow more ready for autonomous Somnia agents. The next step would be turning the current live reads into structured agent inputs: market state, anomaly severity, quote quality, actor behavior, and suggested user actions that an agent can reason over safely. I would also add stronger recommendations, better alert routing, and guardrails so agents can suggest or prepare actions without overclaiming what the stream proves.

The biggest tradeoff was keeping the product honest instead of making it look more complete than it is. The order book is rebuilt from lifecycle events DreamFlow sees in the current session, so it is useful but not the same as a full indexer or official snapshot; with more retained stream history, it can become much more exact. The AI layer is also conservative: it explains evidence instead of inventing intent, predicting prices, or filling the UI with fake stats.

## Features

- Live DreamDEX event stream via Express SSE
- Mark price chart from real `MarkPriceUpdated` events
- Quote Quality chart from reconstructed best bid / best ask
- Readable event tape with expandable raw JSON proof
- Best-effort order-flow pressure reconstruction
- Liquidity health scoring
- Rule-based anomaly detection
- Actor Flow profiles from observed owner activity
- Query Agent for natural-language event filtering
- Pulse Agent with deterministic fallback and optional OpenRouter AI summaries

## Data Pipeline

```txt
DreamDEX Mainnet Events
-> Upstream WebSocket
-> Express SSE Endpoint
-> Vite + TanStack Router App
-> useDexStream Hook
-> Event Normalizer
-> Rolling Metrics + OrderBook Engine + Anomaly Rules
-> DreamFlow UI + Optional Pulse Agent
```

## Agent Layer

Pulse Agent works without an API key using deterministic rules. If `OPENROUTER_API_KEY` is configured server-side, `/api/ai-pulse` can request an AI-assisted summary from OpenRouter using compact stream evidence.

The AI layer is constrained to avoid:

- price prediction
- financial advice
- invented identities
- offchain explanations
- ungrounded claims

Default model:

```txt
anthropic/claude-sonnet-4.5
```

Override it with:

```txt
OPENROUTER_MODEL=your_model_here
```

## Run Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Start the app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

DreamFlow can run without an OpenRouter key. In that mode, Pulse Agent uses deterministic rule-based summaries from the live DreamDEX stream.

To enable AI-assisted Pulse Agent summaries, add an OpenRouter key to `.env.local`:

```bash
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

The Somnia stream URLs in `.env.example` use public mainnet endpoints, so no Somnia API key is required for local development.

## API Routes

The dev server is a small Express API host with Vite middleware.

- `GET /api/stream` — live SSE market events
- `GET /api/ai-pulse` — Pulse Agent configuration status
- `POST /api/ai-pulse` — OpenRouter-backed Pulse Agent summaries

## Checks

```bash
npm run typecheck
npm run build
```

Keep building.

// Upstream side of the data pipeline.
//
// Holds one persistent websocket connection to a Somnia JSON-RPC node,
// subscribes to logs from every DEX SpotPool, decodes each log with the
// SpotPool event ABI (viem), and fans the decoded events out to every
// subscribed HTTP client (the /api/stream SSE route).
//
// One upstream ws is shared across all browser tabs on purpose: Somnia public
// RPCs rate-limit per-connection subscriptions, and there's no reason to
// multiply them. The singleton is hot-reload-safe via `globalThis`.
//
// If you want to subscribe to extra contracts (stop-order registries, market
// makers, anything new), add them to SPOT_POOLS in contracts.ts and extend
// spotPoolEventsAbi if the event signatures differ.

import WebSocket from "ws";
import { decodeEventLog, type Hex } from "viem";
import { spotPoolEventsAbi } from "../abi/spotPool";
import { POOLS_BY_ADDRESS, SPOT_POOLS } from "./contracts";
import type { StreamEvent } from "./dexEvent";

type Subscriber = (event: StreamEvent) => void;

class SomniaStream {
  private ws: WebSocket | null = null;
  private subscribers = new Set<Subscriber>();
  private seq = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private nextRpcId = 1;
  private connecting = false;

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    this.ensureConnected();
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private ensureConnected() {
    if (this.ws || this.connecting) return;
    this.connecting = true;

    const url =
      process.env.SOMNIA_WS_URL || "wss://api.infra.mainnet.somnia.network/ws";

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      this.connecting = false;
      const addresses = SPOT_POOLS.map((p) => p.address);
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: this.nextRpcId++,
          method: "eth_subscribe",
          params: ["logs", { address: addresses }],
        }),
      );
      console.log(
        `[somnia] connected to ${url}, subscribed to ${addresses.length} pools`,
      );
    });

    ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const params = (msg as { params?: { result?: unknown } }).params;
      const result = params?.result as
        | {
            address: Hex;
            topics: readonly Hex[];
            data: Hex;
            blockNumber: Hex;
            transactionHash: Hex;
            logIndex: Hex;
          }
        | undefined;
      if (!result || !result.topics) return;

      const pool = POOLS_BY_ADDRESS.get(result.address.toLowerCase());
      if (!pool) return;

      let decoded: { eventName: string; args: Record<string, unknown> };
      try {
        const out = decodeEventLog({
          abi: spotPoolEventsAbi,
          topics: result.topics as [Hex, ...Hex[]],
          data: result.data,
        });
        decoded = {
          eventName: out.eventName,
          args: (out.args ?? {}) as Record<string, unknown>,
        };
      } catch {
        // Unknown signature for this pool — skip silently rather than spam logs.
        // Extend spotPoolEventsAbi if you want to capture more event types.
        return;
      }

      const event: StreamEvent = {
        seq: ++this.seq,
        receivedAt: new Date().toISOString(),
        blockNumber: Number(BigInt(result.blockNumber)),
        txHash: result.transactionHash,
        logIndex: Number(BigInt(result.logIndex)),
        pool: {
          address: pool.address,
          label: pool.label,
          base: pool.base,
          quote: pool.quote,
          group: pool.group,
        },
        eventName: decoded.eventName,
        args: decoded.args,
      };

      for (const sub of this.subscribers) {
        try {
          sub(event);
        } catch {
          // A bad subscriber should not take down the stream.
        }
      }
    });

    const die = (reason: string) => {
      console.warn(`[somnia] ws ${reason}, reconnecting in 2s`);
      this.connecting = false;
      this.ws = null;
      if (this.reconnectTimer) return;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (this.subscribers.size > 0) this.ensureConnected();
      }, 2000);
    };

    ws.on("close", () => die("closed"));
    ws.on("error", (e) => die(`error: ${e.message}`));
  }
}

// Hot-reload-safe singleton: in dev, Vite re-evaluates modules on changes,
// which would otherwise leak websockets.
const globalForStream = globalThis as unknown as {
  __somniaStream?: SomniaStream;
};
export const somniaStream =
  globalForStream.__somniaStream ?? (globalForStream.__somniaStream = new SomniaStream());

/** JSON.stringify replacer that turns BigInt into a decimal string. */
export function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}

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
  private staleTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private nextRpcId = 1;
  private connecting = false;
  private connectedAt: string | null = null;
  private lastMessageAt: string | null = null;
  private lastEventAt: string | null = null;
  private lastPollBlock: bigint | null = null;
  private reconnects = 0;
  private pollErrors = 0;
  private seenLogKeys: string[] = [];
  private seenLogs = new Set<string>();

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    this.ensureConnected();
    this.ensurePolling();
    return () => {
      this.subscribers.delete(fn);
      if (this.subscribers.size === 0) this.stopPolling();
    };
  }

  getStatus() {
    const wsState =
      this.ws === null
        ? "idle"
        : this.ws.readyState === WebSocket.OPEN
          ? "open"
          : this.ws.readyState === WebSocket.CONNECTING
            ? "connecting"
            : this.ws.readyState === WebSocket.CLOSING
              ? "closing"
              : "closed";

    return {
      subscribers: this.subscribers.size,
      wsState,
      connecting: this.connecting,
      connectedAt: this.connectedAt,
      lastMessageAt: this.lastMessageAt,
      lastEventAt: this.lastEventAt,
      lastPollBlock: this.lastPollBlock?.toString() ?? null,
      reconnects: this.reconnects,
      pollErrors: this.pollErrors,
      seenLogs: this.seenLogs.size,
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
      this.connectedAt = new Date().toISOString();
      this.lastMessageAt = this.connectedAt;
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
      this.startStaleWatchdog();
    });

    ws.on("message", (raw) => {
      this.lastMessageAt = new Date().toISOString();
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const rpcMessage = msg as {
        id?: number;
        result?: unknown;
        error?: { code?: number; message?: string };
      };
      if (rpcMessage.error) {
        console.warn(
          `[somnia] rpc error${rpcMessage.error.code ? ` ${rpcMessage.error.code}` : ""}: ${rpcMessage.error.message ?? "unknown error"}`,
        );
        return;
      }
      if (rpcMessage.id && typeof rpcMessage.result === "string") {
        console.log(`[somnia] subscription active: ${rpcMessage.result}`);
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

      this.emitLog(result);
    });

    const die = (reason: string) => {
      console.warn(`[somnia] ws ${reason}, reconnecting in 2s`);
      this.reconnects += 1;
      this.connecting = false;
      this.connectedAt = null;
      this.stopStaleWatchdog();
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

  private startStaleWatchdog() {
    this.stopStaleWatchdog();
    this.staleTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.lastMessageAt) return;
      const idleMs = Date.now() - Date.parse(this.lastMessageAt);
      if (idleMs > 90_000) {
        console.warn(`[somnia] ws stale for ${Math.round(idleMs / 1000)}s, forcing reconnect`);
        this.ws.terminate();
      }
    }, 30_000);
  }

  private stopStaleWatchdog() {
    if (!this.staleTimer) return;
    clearInterval(this.staleTimer);
    this.staleTimer = null;
  }

  private ensurePolling() {
    if (this.pollTimer) return;
    void this.pollOnce();
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, 10_000);
  }

  private stopPolling() {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async pollOnce() {
    if (this.subscribers.size === 0) return;
    const url =
      process.env.SOMNIA_HTTP_URL || "https://api.infra.mainnet.somnia.network/";

    try {
      const latestHex = await this.rpc<string>(url, "eth_blockNumber", []);
      const latest = BigInt(latestHex);
      let from =
        this.lastPollBlock === null
          ? latest > 900n ? latest - 900n : 0n
          : this.lastPollBlock > 5n ? this.lastPollBlock - 5n : 0n;
      if (latest > 900n && latest - from > 900n) {
        from = latest - 900n;
      }
      if (from > latest) return;

      const logs = await this.rpc<
        Array<{
          address: Hex;
          topics: readonly Hex[];
          data: Hex;
          blockNumber: Hex;
          transactionHash: Hex;
          logIndex: Hex;
        }>
      >(url, "eth_getLogs", [
        {
          fromBlock: toRpcHex(from),
          toBlock: toRpcHex(latest),
          address: SPOT_POOLS.map((p) => p.address),
        },
      ]);

      for (const log of logs) this.emitLog(log);
      this.lastPollBlock = latest;
    } catch (error) {
      this.pollErrors += 1;
      const message = error instanceof Error ? error.message : "unknown error";
      console.warn(`[somnia] poll error: ${message}`);
    }
  }

  private async rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.nextRpcId++,
        method,
        params,
      }),
    });
    if (!response.ok) {
      throw new Error(`${method} HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      result?: T;
      error?: { code?: number; message?: string };
    };
    if (payload.error) throw new Error(`${method} RPC ${payload.error.code ?? ""} ${payload.error.message ?? ""}`.trim());
    if (payload.result === undefined) {
      throw new Error(`${method} returned no result`);
    }
    return payload.result;
  }

  private rememberLog(key: string) {
    if (this.seenLogs.has(key)) return false;
    this.seenLogs.add(key);
    this.seenLogKeys.push(key);
    while (this.seenLogKeys.length > 5000) {
      const oldest = this.seenLogKeys.shift();
      if (oldest) this.seenLogs.delete(oldest);
    }
    return true;
  }

  private emitLog(result: {
    address: Hex;
    topics: readonly Hex[];
    data: Hex;
    blockNumber: Hex;
    transactionHash: Hex;
    logIndex: Hex;
  }) {
    const key = `${result.transactionHash}:${result.logIndex}`;
    if (!this.rememberLog(key)) return;

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

    this.lastEventAt = event.receivedAt;

    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch {
        // A bad subscriber should not take down the stream.
      }
    }
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

function toRpcHex(value: bigint) {
  return `0x${value.toString(16)}`;
}

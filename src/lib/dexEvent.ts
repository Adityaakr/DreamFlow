// Wire-format type for one decoded DEX event as it appears on the SSE stream.
//
// The server constructs it (see somniaStream.ts) and the client consumes it
// (see dexStreamClient.ts). This single type is the contract between the two.
//
// BigInts are serialised as decimal strings on the wire — anything in `args`
// that was originally a uint will be a string here (e.g. `args.markPrice:
// "77532319381599486816796"`). Convert with BigInt(...) when you need to do
// arithmetic.

import type { Hex } from "viem";

export type StreamEventPool = {
  address: Hex;
  label: string;
  base: string;
  quote: string;
  group: "primary" | "mm";
};

export type StreamEvent = {
  /** Monotonic per-server-process. Useful as a stable React key. */
  seq: number;
  /** Wall-clock ISO timestamp the server received the log. */
  receivedAt: string;
  blockNumber: number;
  txHash: Hex;
  logIndex: number;
  pool: StreamEventPool;
  eventName: string;
  args: Record<string, unknown>;
};

export type StreamStatus = "connecting" | "open" | "closed";

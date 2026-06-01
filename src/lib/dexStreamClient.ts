// Framework-agnostic browser client for the /api/stream SSE feed.
//
// Owns the EventSource, JSON parsing, the rolling buffer, and connection
// status. Knows nothing about React. Consumers subscribe with a plain
// listener and read the current snapshot via getSnapshot(). Plugs straight
// into React's useSyncExternalStore (see useDexStream.ts), but equally
// usable from vanilla JS, a Svelte store, a test harness, etc.

import type { StreamEvent, StreamStatus } from "@/lib/dexEvent";

export type DexStreamSnapshot = {
  events: readonly StreamEvent[];
  status: StreamStatus;
};

export type DexStreamClientOptions = {
  /** SSE endpoint URL. Defaults to "/api/stream". */
  url?: string;
  /** Max events retained in the rolling buffer (newest first). Default 200. */
  maxEvents?: number;
};

export type DexStreamClient = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): DexStreamSnapshot;
  /** Stable empty snapshot for SSR / non-browser environments. */
  getServerSnapshot(): DexStreamSnapshot;
  close(): void;
};

const EMPTY_SNAPSHOT: DexStreamSnapshot = Object.freeze({
  events: Object.freeze([]) as readonly StreamEvent[],
  status: "connecting",
});

export function createDexStreamClient(
  opts: DexStreamClientOptions = {},
): DexStreamClient {
  const url = opts.url ?? "/api/stream";
  const maxEvents = opts.maxEvents ?? 200;

  let snapshot: DexStreamSnapshot = EMPTY_SNAPSHOT;
  const listeners = new Set<() => void>();
  const pendingEvents: StreamEvent[] = [];
  let flushHandle: number | null = null;

  const notify = () => {
    for (const fn of listeners) {
      try {
        fn();
      } catch {
        // a bad listener shouldn't break the rest
      }
    }
  };

  const setStatus = (status: StreamStatus) => {
    if (snapshot.status === status) return;
    snapshot = { events: snapshot.events, status };
    notify();
  };

  const flushEvents = () => {
    flushHandle = null;
    if (pendingEvents.length === 0) return;

    const newestFirst = pendingEvents.splice(0).reverse();
    const next = [...newestFirst, ...snapshot.events];
    const trimmed = next.length > maxEvents ? next.slice(0, maxEvents) : next;
    snapshot = { events: trimmed, status: snapshot.status };
    notify();
  };

  const scheduleFlush = () => {
    if (flushHandle !== null) return;
    if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
      flushHandle = window.requestAnimationFrame(flushEvents);
      return;
    }
    flushHandle = globalThis.setTimeout(flushEvents, 16) as unknown as number;
  };

  const pushEvent = (event: StreamEvent) => {
    pendingEvents.push(event);
    scheduleFlush();
  };

  let es: EventSource | null = null;
  const ensureOpen = () => {
    if (es || typeof window === "undefined") return;
    const source = new EventSource(url);
    es = source;
    source.onopen = () => setStatus("open");
    source.onerror = () => setStatus("closed");
    source.onmessage = (msg) => {
      try {
        pushEvent(JSON.parse(msg.data) as StreamEvent);
      } catch {
        // ignore malformed payloads
      }
    };
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      ensureOpen();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          es?.close();
          es = null;
        }
      };
    },
    getSnapshot() {
      return snapshot;
    },
    getServerSnapshot() {
      return EMPTY_SNAPSHOT;
    },
    close() {
      if (flushHandle !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(flushHandle);
        window.clearTimeout(flushHandle);
      }
      flushHandle = null;
      pendingEvents.length = 0;
      es?.close();
      es = null;
      listeners.clear();
    },
  };
}

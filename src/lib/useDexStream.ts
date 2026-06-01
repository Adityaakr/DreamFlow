// React adapter for the DEX stream client.
//
// One module-level client is shared across every component that calls this
// hook — multiple consumers fan out to the same EventSource. The client is
// created lazily on first subscribe(), so importing this module from a server
// component is harmless.

import { useSyncExternalStore } from "react";
import {
  createDexStreamClient,
  type DexStreamClient,
  type DexStreamSnapshot,
} from "@/lib/dexStreamClient";

let client: DexStreamClient | null = null;
function getClient(): DexStreamClient {
  if (!client) client = createDexStreamClient({ maxEvents: 1500 });
  return client;
}

export function useDexStream(): DexStreamSnapshot {
  const c = getClient();
  return useSyncExternalStore(c.subscribe, c.getSnapshot, c.getServerSnapshot);
}

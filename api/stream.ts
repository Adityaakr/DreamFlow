import type { IncomingMessage, ServerResponse } from "node:http";
import { streamDexEvents } from "../server/stream";

export default function handler(request: IncomingMessage, response: ServerResponse) {
  streamDexEvents(request as never, response as never);
}

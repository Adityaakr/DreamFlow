import type { Request, Response } from "express";
import { safeStringify, somniaStream } from "../src/lib/somniaStream";

export function streamDexEvents(request: Request, response: Response) {
  let closed = false;
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write(`: connected ${new Date().toISOString()}\n\n`);

  const unsubscribe = somniaStream.subscribe((event) => {
    if (closed) return;
    response.write(`data: ${safeStringify(event)}\n\n`);
  });
  const heartbeat = setInterval(() => {
    if (closed) return;
    response.write(": ping\n\n");
  }, 15_000);

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    response.end();
  };

  request.on("close", cleanup);
  request.on("error", cleanup);
}

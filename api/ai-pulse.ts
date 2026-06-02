import type { IncomingMessage, ServerResponse } from "node:http";
import { getAiPulseStatus, postAiPulse } from "../server/aiPulse";

type ExpressLikeResponse = ServerResponse & {
  status: (code: number) => ExpressLikeResponse;
  json: (body: unknown) => void;
};

function asExpressLike(response: ServerResponse): ExpressLikeResponse {
  const expressLike = response as ExpressLikeResponse;
  expressLike.status = (code: number) => {
    response.statusCode = code;
    return expressLike;
  };
  expressLike.json = (body: unknown) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(body));
  };
  return expressLike;
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : undefined;
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const expressResponse = asExpressLike(response);

  if (request.method === "GET") {
    getAiPulseStatus(request as never, expressResponse as never);
    return;
  }

  if (request.method === "POST") {
    try {
      (request as IncomingMessage & { body?: unknown }).body = await readJson(request);
      await postAiPulse(request as never, expressResponse as never);
    } catch {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Invalid JSON body." }));
    }
    return;
  }

  response.statusCode = 405;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ error: "Method not allowed." }));
}

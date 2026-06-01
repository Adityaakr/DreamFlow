import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import { getAiPulseStatus, postAiPulse } from "./aiPulse";
import { streamDexEvents } from "./stream";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3000);

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const app = express();

app.use(express.json({ limit: "256kb" }));

app.get("/api/stream", streamDexEvents);
app.get("/api/ai-pulse", getAiPulseStatus);
app.post("/api/ai-pulse", postAiPulse);

async function main() {
  if (isProduction) {
    const dist = path.join(root, "dist");
    app.use(express.static(dist, { index: false }));
    app.use((request, response, next) => {
      if (request.method !== "GET") {
        next();
        return;
      }
      const indexHtml = path.join(dist, "index.html");
      if (!fs.existsSync(indexHtml)) {
        response.status(500).send("Client build not found. Run npm run build first.");
        return;
      }
      response.sendFile(indexHtml);
    });
  } else {
    const vite = await createViteServer({
      root,
      appType: "spa",
      server: {
        middlewareMode: true,
        hmr: {
          server: undefined,
        },
      },
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`[dreamflow] server ready on http://localhost:${port}`);
  });
}

void main();

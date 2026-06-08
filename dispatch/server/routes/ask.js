import { Router } from "express";
import { routeQuery } from "../agents/definitions.js";
import { executeAgent, executeAgentStream } from "../agents/executor.js";

const router = Router();

// Simple in-memory rate limit: max 10 requests per IP per minute
const rateMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const window = 60_000;
  const max = 10;

  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  rateMap.set(ip, entry);

  if (entry.count > max) {
    return res.status(429).json({ error: "Too many requests — slow down." });
  }
  next();
}

function sanitize(str) {
  return String(str).trim().slice(0, 500); // cap at 500 chars
}

// POST /api/ask
router.post("/", rateLimit, async (req, res) => {
  const query = sanitize(req.body?.query || "");
  if (!query) return res.status(400).json({ error: "query is required" });

  const agent = routeQuery(query);
  try {
    const result = await executeAgent(agent, query);
    res.json(result);
  } catch (err) {
    console.error("[ask]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ask/stream?query=...  SSE
router.get("/stream", rateLimit, async (req, res) => {
  const query = sanitize(req.query?.query || "");
  if (!query) return res.status(400).json({ error: "query param required" });

  // SSE keepalive: send a comment every 15s so proxies don't drop the connection
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
  req.on("close", () => { clearInterval(heartbeat); res.end(); });

  const agent = routeQuery(query);
  try {
    await executeAgentStream(agent, query, res);
  } catch (err) {
    console.error("[ask/stream]", err.message);
    if (!res.headersSent) res.setHeader("Content-Type", "text/event-stream");
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

export default router;

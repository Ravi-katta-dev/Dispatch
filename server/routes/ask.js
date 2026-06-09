import { Router } from "express";
import jsonwebtoken from "jsonwebtoken";
import { routeQuery } from "../agents/definitions.js";
import { executeAgent, executeAgentStream } from "../agents/executor.js";

const router = Router();
const JWT_SECRET = () => process.env.JWT_SECRET || "dispatch-dev-secret-change-in-prod";

const rateMap = new Map();
function rateLimit(req, res, next) {
  const key = req.user?.id ?? req.ip ?? "unknown";
  const now = Date.now();
  const entry = rateMap.get(key) || { count: 0, start: now };
  if (now - entry.start > 60_000) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateMap.set(key, entry);
  if (entry.count > 10) return res.status(429).json({ error: "Too many requests" });
  next();
}

// EventSource can't send headers — promote ?token= to req.user for SSE route
function tokenFromQuery(req, _res, next) {
  if (!req.user && req.query.token) {
    try { req.user = jsonwebtoken.verify(req.query.token, JWT_SECRET()); }
    catch { /* invalid token — guest */ }
  }
  next();
}

function sanitize(str) { return String(str ?? "").trim().slice(0, 500); }

// POST /api/ask
router.post("/", rateLimit, async (req, res) => {
  const query = sanitize(req.body?.query);
  if (!query) return res.status(400).json({ error: "query is required" });
  const agent = routeQuery(query);
  try {
    const result = await executeAgent(agent, query, req.user?.id ?? null);
    res.json(result);
  } catch (err) {
    console.error("[ask]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ask/stream?query=...&token=... (token optional, enables activity persistence)
router.get("/stream", tokenFromQuery, rateLimit, async (req, res) => {
  const query = sanitize(req.query?.query);
  if (!query) return res.status(400).json({ error: "query param required" });

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
  req.on("close", () => { clearInterval(heartbeat); res.end(); });

  const agent = routeQuery(query);
  try {
    await executeAgentStream(agent, query, res, req.user?.id ?? null);
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

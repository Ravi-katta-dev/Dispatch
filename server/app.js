import "dotenv/config";
import express from "express";
import cors from "cors";
import { attachUser }  from "./middleware/auth.js";
import { globalLimiter, authLimiter, askLimiter } from "./middleware/rate-limit.js";
import askRouter   from "./routes/ask.js";
import feedRouter  from "./routes/feed.js";
import toolsRouter from "./routes/tools.js";
import authRouter  from "./routes/auth.js";
import { AGENTS }  from "./agents/definitions.js";
import { getDb }   from "./store/db.js";

if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠  ANTHROPIC_API_KEY not set");
if (!process.env.COMPOSIO_API_KEY)  console.warn("⚠  COMPOSIO_API_KEY not set");
if (!process.env.JWT_SECRET)        console.warn("⚠  JWT_SECRET not set");

await getDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use(globalLimiter);
app.use(attachUser);

app.get("/health", (_req, res) => res.json({
  status: "ok",
  agents: Object.keys(AGENTS),
  keys: {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    composio:  !!process.env.COMPOSIO_API_KEY,
    jwt:       !!process.env.JWT_SECRET,
  },
}));

app.use("/api/auth",  authLimiter, authRouter);
app.use("/api/ask",   askLimiter, askRouter);
app.use("/api/feed",  feedRouter);
app.use("/api/tools", toolsRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

export default app;

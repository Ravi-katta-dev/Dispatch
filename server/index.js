import "dotenv/config";
import express from "express";
import cors from "cors";
import askRouter from "./routes/ask.js";
import feedRouter from "./routes/feed.js";
import { AGENTS } from "./agents/definitions.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠  ANTHROPIC_API_KEY not set — /api/ask will return 401");
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({
  status: "ok",
  agents: Object.keys(AGENTS),
  streaming: true,
  keyLoaded: !!process.env.ANTHROPIC_API_KEY,
}));

app.use("/api/ask",  askRouter);
app.use("/api/feed", feedRouter);
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Dispatch :${PORT}  key=${process.env.ANTHROPIC_API_KEY ? "✓" : "missing"}`);
});

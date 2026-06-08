import { Router } from "express";
import { activityLog } from "../store/activity.js";

const router = Router();

// GET /api/feed  — last N agent activity entries, newest first
// Query: ?limit=20
router.get("/", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const items = [...activityLog]
    .reverse()
    .slice(0, limit)
    .map((entry) => ({
      agentId: entry.agentId,
      agentName: entry.agentName,
      icon: entry.icon,
      msg: summarise(entry.answer),
      tools: entry.toolsUsed,
      timestamp: entry.timestamp,
      time: relativeTime(entry.timestamp),
      query: entry.query,
    }));
  res.json(items);
});

// Trim answer to a feed-friendly one-liner (~100 chars)
function summarise(text) {
  if (!text) return "";
  const first = text.split(/[.\n]/)[0].trim();
  return first.length > 100 ? first.slice(0, 97) + "…" : first;
}

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default router;

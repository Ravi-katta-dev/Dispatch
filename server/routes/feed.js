import { Router } from "express";
import { activityLog } from "../store/activity.js";
import { getActivity } from "../store/db.js";

const router = Router();

// GET /api/feed?limit=20
// Authenticated: returns only this user's activity.
// Unauthenticated: returns the shared in-memory log (seed + recent).
router.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  try {
    let items;

    if (req.user?.id) {
      // Authenticated — pull from SQLite filtered by user
      const rows = await getActivity({ userId: req.user.id, limit });
      items = rows.map(row => ({
        agentId:   row.agent_id,
        agentName: row.agent_name,
        icon:      row.icon,
        msg:       summarise(row.answer),
        tools:     row.tools_used,
        query:     row.query,
        timestamp: row.created_at,
        time:      relativeTime(row.created_at),
      }));
    } else {
      // Unauthenticated — use in-memory log (includes seed data)
      items = [...activityLog]
        .reverse()
        .slice(0, limit)
        .map(e => ({
          agentId:   e.agentId,
          agentName: e.agentName,
          icon:      e.icon,
          msg:       summarise(e.answer),
          tools:     e.toolsUsed,
          query:     e.query,
          timestamp: e.timestamp,
          time:      relativeTime(e.timestamp),
        }));
    }

    res.json(items);
  } catch (err) {
    console.error("[feed]", err.message);
    res.status(500).json({ error: err.message });
  }
});

function summarise(text) {
  if (!text) return "";
  const first = text.split(/[.\n]/)[0].trim();
  return first.length > 100 ? first.slice(0, 97) + "…" : first;
}

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default router;

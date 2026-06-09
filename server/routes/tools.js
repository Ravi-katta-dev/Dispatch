import { Router } from "express";
import { connectionStatus } from "../tools/index.js";

const router = Router();

const ALL_TOOLS = ["stripe", "github", "gmail", "googlecalendar", "linear", "slack", "intercom", "notion"];

// Composio-integrated tools (live possible)
const COMPOSIO_TOOLS = new Set(["stripe", "github", "gmail", "googlecalendar"]);

// GET /api/tools/status
// Returns per-tool status: live | mock | no_key
router.get("/", async (_req, res) => {
  const hasKey = !!process.env.COMPOSIO_API_KEY;

  if (!hasKey) {
    const tools = Object.fromEntries(
      ALL_TOOLS.map(t => [t, { status: "no_key", live: false }])
    );
    return res.json({ composioConnected: false, tools });
  }

  const connections = await connectionStatus();

  const tools = Object.fromEntries(
    ALL_TOOLS.map(t => {
      if (!COMPOSIO_TOOLS.has(t)) {
        return [t, { status: "mock", live: false, note: "integration not yet wired" }];
      }
      const connected = !!connections[t];
      return [t, { status: connected ? "live" : "mock", live: connected }];
    })
  );

  res.json({
    composioConnected: true,
    tools,
    liveCount: Object.values(tools).filter(t => t.live).length,
    totalCount: ALL_TOOLS.length,
  });
});

export default router;

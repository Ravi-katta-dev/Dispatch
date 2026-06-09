// Tool context router.
// For each tool: if Composio key is set AND the app is connected → use live data.
// Otherwise → fall back to mock silently.
//
// gatherContext() is the single entry point used by executor.js.
// The mock fallback means the server always returns something useful,
// even during local dev without any integrations connected.

import * as composio from "./composio.js";
import { mockTools } from "./mock.js";

const hasComposio = () => !!process.env.COMPOSIO_API_KEY;

// Cache connection status for 60s to avoid hammering Composio on every request
let _statusCache = null;
let _statusAt = 0;

async function connectionStatus() {
  if (hasComposio() && Date.now() - _statusAt > 60_000) {
    try {
      _statusCache = await composio.getConnectionStatus();
      _statusAt = Date.now();
    } catch {
      _statusCache = null;
    }
  }
  return _statusCache ?? {};
}

// ─── Per-tool fetchers ────────────────────────────────────────────────────────

async function fetchStripe(status) {
  if (hasComposio() && status.stripe) {
    try {
      const [mrr, charges] = await Promise.all([
        composio.stripeMRR(),
        composio.stripeRecentCharges(),
      ]);
      return { ...mrr, recentCharges: charges.recent, live: true };
    } catch (e) {
      console.warn("[tools] Stripe live fetch failed, using mock:", e.message);
    }
  }
  return { ...mockTools.stripe.getMRR(), ...mockTools.stripe.getCosts(), live: false };
}

async function fetchGitHub(status) {
  if (hasComposio() && status.github) {
    const owner = process.env.GITHUB_OWNER;
    const repo  = process.env.GITHUB_REPO;
    if (owner && repo) {
      try {
        return { ...(await composio.githubPRs(owner, repo)), live: true };
      } catch (e) {
        console.warn("[tools] GitHub live fetch failed, using mock:", e.message);
      }
    }
  }
  return { ...mockTools.github.getPRs(), live: false };
}

async function fetchGmail(status) {
  if (hasComposio() && status.gmail) {
    try {
      return { ...(await composio.gmailInbox()), live: true };
    } catch (e) {
      console.warn("[tools] Gmail live fetch failed, using mock:", e.message);
    }
  }
  return { ...mockTools.gmail.getInbox(), live: false };
}

async function fetchCalendar(status) {
  if (hasComposio() && status.googlecalendar) {
    try {
      return { ...(await composio.calendarToday()), live: true };
    } catch (e) {
      console.warn("[tools] Calendar live fetch failed, using mock:", e.message);
    }
  }
  return { ...mockTools.calendar.getToday(), live: false };
}

// Tools with no Composio integration yet — always mock
function fetchLinear()   { return mockTools.linear.getSprint(); }
function fetchIntercom() { return mockTools.intercom.getRecentTickets(); }
function fetchReddit()   { return mockTools.reddit.getSignals(); }
function fetchAshby()    { return mockTools.ashby.getCandidates(); }

// ─── Main export ──────────────────────────────────────────────────────────────

export async function gatherContext(agent) {
  const status = await connectionStatus();
  const ctx = {};

  await Promise.all(agent.tools.map(async (tool) => {
    switch (tool) {
      case "stripe":       ctx.stripe   = await fetchStripe(status);   break;
      case "github":       ctx.github   = await fetchGitHub(status);   break;
      case "gmail":        ctx.gmail    = await fetchGmail(status);    break;
      case "calendar":     ctx.calendar = await fetchCalendar(status); break;
      case "linear":       ctx.linear   = fetchLinear();               break;
      case "intercom":     ctx.intercom = fetchIntercom();             break;
      case "reddit":       ctx.reddit   = fetchReddit();               break;
      case "ashby":        ctx.ashby    = fetchAshby();                break;
    }
  }));

  return ctx;
}

// Expose connection status for the /api/tools/status route
export { connectionStatus };

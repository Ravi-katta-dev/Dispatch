// Real tool integrations via Composio.
// Each function calls executeAction() and normalises the response
// into the same shape as mock.js so the rest of the code is unchanged.
//
// Composio action names reference: https://app.composio.dev/apps
// entityId "default" uses the connected account for the API key owner.

import { ComposioToolSet } from "composio-core";

let _toolset = null;
function toolset() {
  if (!_toolset) {
    _toolset = new ComposioToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
  }
  return _toolset;
}

const ENTITY = "default";

// ─── Stripe ──────────────────────────────────────────────────────────────────
export async function stripeMRR() {
  // List active subscriptions, compute MRR
  const res = await toolset().executeAction({
    action: "STRIPE_LIST_SUBSCRIPTIONS",
    params: { status: "active", limit: 100 },
    entityId: ENTITY,
  });

  const subs = res?.data?.subscriptions?.data ?? [];
  const mrr = subs.reduce((sum, s) => {
    const item = s.items?.data?.[0];
    const amount = item?.price?.unit_amount ?? 0;
    const interval = item?.price?.recurring?.interval;
    const monthly = interval === "year" ? amount / 12 : amount;
    return sum + monthly / 100; // cents → dollars
  }, 0);

  return {
    mrr: Math.round(mrr),
    subscriptionCount: subs.length,
    source: "stripe_live",
  };
}

export async function stripeRecentCharges() {
  const res = await toolset().executeAction({
    action: "STRIPE_LIST_CHARGES",
    params: { limit: 20 },
    entityId: ENTITY,
  });

  const charges = res?.data?.charges?.data ?? [];
  return {
    recent: charges.map(c => ({
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency,
      status: c.status,
      customer: c.customer,
      created: new Date(c.created * 1000).toISOString(),
    })),
    source: "stripe_live",
  };
}

// ─── GitHub ──────────────────────────────────────────────────────────────────
export async function githubPRs(owner, repo) {
  const res = await toolset().executeAction({
    action: "GITHUB_LIST_PULL_REQUESTS",
    params: { owner, repo, state: "open", per_page: 20 },
    entityId: ENTITY,
  });

  const prs = res?.data ?? [];
  const now = Date.now();

  const stalePRs = prs
    .filter(pr => {
      const ageH = (now - new Date(pr.created_at).getTime()) / 3600000;
      return ageH > 24 && pr.requested_reviewers?.length === 0;
    })
    .map(pr => ({
      id: pr.number,
      title: pr.title,
      author: pr.user?.login,
      age: `${Math.floor((now - new Date(pr.created_at).getTime()) / 3600000)}h`,
      reviewers: pr.requested_reviewers?.map(r => r.login) ?? [],
      url: pr.html_url,
    }));

  return {
    open: prs.length,
    stalePRs,
    source: "github_live",
  };
}

export async function githubRepoInfo(owner, repo) {
  const res = await toolset().executeAction({
    action: "GITHUB_GET_A_REPOSITORY",
    params: { owner, repo },
    entityId: ENTITY,
  });

  return {
    name: res?.data?.name,
    stars: res?.data?.stargazers_count,
    openIssues: res?.data?.open_issues_count,
    defaultBranch: res?.data?.default_branch,
    source: "github_live",
  };
}

// ─── Gmail ───────────────────────────────────────────────────────────────────
export async function gmailInbox() {
  const res = await toolset().executeAction({
    action: "GMAIL_LIST_THREADS",
    params: { maxResults: 20, q: "is:unread" },
    entityId: ENTITY,
  });

  const threads = res?.data?.threads ?? [];

  return {
    unread: res?.data?.resultSizeEstimate ?? threads.length,
    threads: threads.slice(0, 5).map(t => ({
      id: t.id,
      snippet: t.snippet,
    })),
    source: "gmail_live",
  };
}

// ─── Google Calendar ─────────────────────────────────────────────────────────
export async function calendarToday() {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59);

  const res = await toolset().executeAction({
    action: "GOOGLECALENDAR_LIST_EVENTS",
    params: {
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    },
    entityId: ENTITY,
  });

  const events = res?.data?.items ?? [];
  return {
    date: now.toDateString(),
    meetings: events.map(e => ({
      time: e.start?.dateTime
        ? new Date(e.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "all-day",
      title: e.summary,
      duration: e.end?.dateTime && e.start?.dateTime
        ? `${Math.round((new Date(e.end.dateTime) - new Date(e.start.dateTime)) / 60000)}m`
        : "",
    })),
    source: "gcal_live",
  };
}

// ─── Connection health check ──────────────────────────────────────────────────
// Returns which apps have an active connected account
export async function getConnectionStatus() {
  try {
    const entity = await toolset().getEntity(ENTITY);
    const connections = await entity.getConnections();

    const connected = new Set(
      (connections ?? []).map(c => c.appName?.toLowerCase())
    );

    return {
      stripe:   connected.has("stripe"),
      github:   connected.has("github"),
      gmail:    connected.has("gmail"),
      googlecalendar: connected.has("googlecalendar"),
      linear:   connected.has("linear"),
      slack:    connected.has("slack"),
      intercom: connected.has("intercom"),
      notion:   connected.has("notion"),
    };
  } catch {
    // If Composio key is missing or call fails, everything is disconnected
    return {
      stripe: false, github: false, gmail: false,
      googlecalendar: false, linear: false, slack: false,
      intercom: false, notion: false,
    };
  }
}

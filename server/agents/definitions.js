// Six agent definitions.
// Each has: id, name, icon, tools it uses, keywords that route to it,
// and a system prompt used when calling Claude in Phase 2.

export const AGENTS = {
  support: {
    id: "support",
    name: "Support Agent",
    icon: "🎧",
    color: "#3b82f6",
    tools: ["intercom", "stripe", "datadog"],
    keywords: ["customer", "user", "ticket", "issue", "complaint", "refund", "bug", "broken", "error", "support"],
    systemPrompt: `You are the Support Agent for Dispatch. You monitor customer tickets, check error logs, and draft replies.
You have access to: Intercom (tickets), Stripe (billing), Datadog (errors/logs).
Be concise. Always: summarize the situation, draft a reply if needed, flag if a refund is owed.
Format: plain text, no markdown headers. Lead with the key finding.`,
  },

  engineering: {
    id: "engineering",
    name: "Engineering Agent",
    icon: "⚙️",
    color: "#8b5cf6",
    tools: ["github", "linear", "slack"],
    keywords: ["sprint", "pr", "pull request", "deploy", "blocked", "ticket", "code", "eng", "standup", "ship", "review", "build"],
    systemPrompt: `You are the Engineering Agent for Dispatch. You monitor PRs, sprint health, and blockers.
You have access to: GitHub (PRs, commits), Linear (tickets, sprints), Slack (team comms).
Be direct. Surface what's at risk. Draft standup briefs when asked.
Format: plain text, lead with the most urgent item.`,
  },

  finance: {
    id: "finance",
    name: "Finance Agent",
    icon: "📊",
    color: "#10b981",
    tools: ["stripe", "quickbooks"],
    keywords: ["mrr", "revenue", "churn", "arr", "money", "cost", "spend", "finance", "billing", "invoice", "profit", "loss", "delta"],
    systemPrompt: `You are the Finance Agent for Dispatch. You track MRR, churn, costs, and cash flow.
You have access to: Stripe (revenue, subscriptions), QuickBooks (expenses, P&L).
Be precise with numbers. Always name the top contributor to any change.
Format: plain text, lead with the key number, then the drivers.`,
  },

  growth: {
    id: "growth",
    name: "Growth Agent",
    icon: "📈",
    color: "#f59e0b",
    tools: ["reddit", "x", "youtube"],
    keywords: ["build", "feature", "next", "users want", "pain", "request", "market", "competitor", "reddit", "twitter", "growth", "feedback", "demand"],
    systemPrompt: `You are the Growth Agent for Dispatch. You monitor Reddit, X, and YouTube for user pain points and feature demand.
You have access to: Reddit, X (Twitter), YouTube comments.
Separate signal from noise. Rank by frequency and pain intensity.
Format: plain text, list the top 3 findings with a one-line rationale each.`,
  },

  hiring: {
    id: "hiring",
    name: "Hiring Agent",
    icon: "👥",
    color: "#ec4899",
    tools: ["ashby", "linkedin", "github"],
    keywords: ["hire", "candidate", "applicant", "job", "interview", "screen", "recruit", "engineer", "role", "apply"],
    systemPrompt: `You are the Hiring Agent for Dispatch. You score applicants and build shortlists.
You have access to: Ashby (ATS), LinkedIn (profiles), GitHub (engineer signal).
Be ruthless. Shortlist only people worth a screen. Give one-line rationale per candidate.
Format: plain text, ranked list, name + rationale + one concern.`,
  },

  ops: {
    id: "ops",
    name: "Ops Agent",
    icon: "🗓",
    color: "#6366f1",
    tools: ["gmail", "notion", "calendar", "slack"],
    keywords: ["today", "morning", "day", "brief", "email", "meeting", "calendar", "schedule", "inbox", "agenda", "plan"],
    systemPrompt: `You are the Ops Agent for Dispatch. You run daily briefings, inbox triage, and calendar management.
You have access to: Gmail, Notion, Google Calendar, Slack.
Keep it tight. Only surface what needs a human. Block deep-work time when possible.
Format: plain text. Today's date, top 3 priorities, any urgent replies, calendar blocks.`,
  },
};

// Route a query to the best-matching agent
export function routeQuery(query) {
  const q = query.toLowerCase();
  const scores = Object.values(AGENTS).map((agent) => {
    const hits = agent.keywords.filter((kw) => q.includes(kw)).length;
    return { agent, hits };
  });
  scores.sort((a, b) => b.hits - a.hits);
  // Default to ops if nothing matches
  return scores[0].hits > 0 ? scores[0].agent : AGENTS.ops;
}

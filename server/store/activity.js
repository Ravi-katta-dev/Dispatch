// In-memory activity log. Shared across routes.
// Phase 4 will persist this to SQLite.

export const activityLog = [];

// Seed with realistic startup entries so the feed isn't empty on first load
const seedEntries = [
  { agentId: "finance",     agentName: "Finance Agent",     icon: "📊", query: "mrr delta this month",        answer: "MRR up $4,200 vs last month. 3 expansions (+$5,100), 1 churn (-$900). Top driver: plan upgrades from the v3 launch. AWS costs up 12% — worth watching.",                         toolsUsed: ["stripe"], timestamp: minsAgo(2)   },
  { agentId: "support",     agentName: "Support Agent",     icon: "🎧", query: "customer issues today",       answer: "3 users flagged: jenna_k hit rate limit 3×, marcos_dev getting 401s on API v2.1.0, sara_w charged twice. Draft replies ready. Refund of $49 attached for sara_w.",              toolsUsed: ["intercom","stripe"], timestamp: minsAgo(5)  },
  { agentId: "engineering", agentName: "Engineering Agent", icon: "⚙️", query: "sprint health",               answer: "Sprint 14 is 61% done with 3 days left. Risk: medium. PR #241 unreviewed 48h — pinged @dan. ENG-312 and ENG-318 blocked on design. Standup drafted and posted to #eng.",         toolsUsed: ["github","linear","slack"], timestamp: minsAgo(9)  },
  { agentId: "growth",      agentName: "Growth Agent",      icon: "📈", query: "what should we build next",   answer: "Top signal this week: webhook retries (34 mentions, pain score 9/10), team roles (19 mentions), CSV export (12 mentions). Webhook retries has the strongest demand — prioritize.", toolsUsed: ["reddit"], timestamp: minsAgo(14) },
  { agentId: "ops",         agentName: "Ops Agent",         icon: "🗓", query: "morning brief",               answer: "Mon Jun 8. 14 unread emails, 2 urgent. Meetings at 11:00 (advisor 1:1) and 14:00 (investor call). Deep-work block reserved 09:00–11:00. 7 emails can auto-reply.",                toolsUsed: ["gmail","notion","calendar"], timestamp: minsAgo(18) },
  { agentId: "finance",     agentName: "Finance Agent",     icon: "📊", query: "cost base shift",             answer: "AWS spend up 12% to $2,100 this month — new region rollout. Anthropic API up 8% to $940. Total opex: $4,800 (+$520 vs last month). Margins still healthy.",                       toolsUsed: ["stripe"], timestamp: minsAgo(60) },
  { agentId: "engineering", agentName: "Engineering Agent", icon: "⚙️", query: "sprint blockers",             answer: "2 tickets blocked on design (ENG-312 onboarding flow, ENG-318 empty states). 3 not started. PR #244 failing tests — billing edge case timeout. Needs attention before sprint end.", toolsUsed: ["linear","github"], timestamp: minsAgo(120) },
  { agentId: "support",     agentName: "Support Agent",     icon: "🎧", query: "refund for sara_w",           answer: "sara_w was double-charged $49. Verified in Stripe — duplicate invoice from billing retry bug. Refund issued. Reply drafted. Flagged billing-retry issue to eng backlog.",           toolsUsed: ["intercom","stripe"], timestamp: minsAgo(180) },
];

activityLog.push(...seedEntries);

function minsAgo(n) {
  return new Date(Date.now() - n * 60000).toISOString();
}

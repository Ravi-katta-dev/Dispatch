// Mock tool responses. Each function returns realistic fake data.
// In Phase 3 these get replaced with real API calls via Composio.

export const mockTools = {
  stripe: {
    getMRR() {
      return {
        mrr: 18400,
        mrrPrev: 14200,
        delta: 4200,
        expansions: [
          { user: "acme_corp", amount: 2100, plan: "Operator" },
          { user: "devtools_inc", amount: 1800, plan: "Operator" },
          { user: "solo_k", amount: 1200, plan: "Solo → Operator" },
        ],
        churns: [{ user: "garage_app", amount: 900, reason: "No activity 30d" }],
      };
    },
    getCustomer(id) {
      return {
        id,
        plan: "Solo",
        mrr: 49,
        since: "2026-01-14",
        tickets: 3,
        refundEligible: true,
      };
    },
    getCosts() {
      return {
        totalSpend: 4800,
        prevSpend: 4280,
        delta: 520,
        breakdown: [
          { vendor: "AWS", amount: 2100, change: "+12%" },
          { vendor: "Anthropic API", amount: 940, change: "+8%" },
          { vendor: "Composio", amount: 199, change: "0%" },
          { vendor: "Other SaaS", amount: 1561, change: "+2%" },
        ],
      };
    },
  },

  github: {
    getPRs() {
      return {
        open: 7,
        stalePRs: [
          { id: 241, title: "Add webhook retry logic", author: "dan", age: "48h", reviewers: [] },
          { id: 238, title: "Fix 401 on v2 endpoints", author: "priya", age: "36h", reviewers: ["sam"] },
        ],
        mergedToday: 3,
        failingChecks: [{ id: 244, title: "Billing edge cases", reason: "Test timeout" }],
      };
    },
  },

  linear: {
    getSprint() {
      return {
        name: "Sprint 14",
        endsIn: "3 days",
        total: 18,
        done: 11,
        inProgress: 4,
        blocked: [
          { id: "ENG-312", title: "Onboarding flow redesign", blockedBy: "design" },
          { id: "ENG-318", title: "Dashboard empty states", blockedBy: "design" },
        ],
        notStarted: 3,
      };
    },
  },

  intercom: {
    getRecentTickets() {
      return [
        { user: "jenna_k", issue: "Rate limit hit 3x in 1 hour", severity: "medium", plan: "Solo" },
        { user: "marcos_dev", issue: "401 errors on API v2.1.0", severity: "high", plan: "Operator" },
        { user: "sara_w", issue: "Charged twice for same month", severity: "high", plan: "Solo", refundOwed: 49 },
        { user: "tom_b", issue: "Feature request: CSV export", severity: "low", plan: "Solo" },
      ];
    },
  },

  gmail: {
    getInbox() {
      return {
        unread: 14,
        urgent: [
          { from: "investor@vc.com", subject: "Following up on deck", age: "2h" },
          { from: "marcos_dev@acme.io", subject: "API still broken", age: "45m" },
        ],
        canAutoReply: 7,
        newsletters: 4,
      };
    },
  },

  calendar: {
    getToday() {
      return {
        date: new Date().toDateString(),
        meetings: [
          { time: "11:00", title: "1:1 with advisor", duration: "30m" },
          { time: "14:00", title: "Investor call", duration: "45m" },
        ],
        freeBlocks: ["09:00–11:00", "12:00–14:00", "15:00–17:00"],
        deepWorkSuggested: "09:00–11:00",
      };
    },
  },

  reddit: {
    getSignals() {
      return [
        { topic: "Webhook retries", mentions: 34, subreddits: ["r/SaaS", "r/webdev"], painScore: 9 },
        { topic: "Team role management", mentions: 19, subreddits: ["r/SaaS", "r/startups"], painScore: 7 },
        { topic: "CSV / data export", mentions: 12, subreddits: ["r/SaaS"], painScore: 6 },
        { topic: "Audit logs", mentions: 8, subreddits: ["r/netsec", "r/SaaS"], painScore: 5 },
      ];
    },
  },

  ashby: {
    getCandidates() {
      return [
        { name: "Alex R.", role: "Full-stack Eng", applied: "2d ago", github: "active", score: 88 },
        { name: "Preet M.", role: "Full-stack Eng", applied: "1d ago", github: "strong", score: 92 },
        { name: "Jordan T.", role: "Full-stack Eng", applied: "3d ago", github: "sparse", score: 61 },
        { name: "Kim L.", role: "Full-stack Eng", applied: "5h ago", github: "active", score: 79 },
      ];
    },
  },
};

// Gather tool context for an agent before calling Claude
export function gatherContext(agent) {
  const ctx = {};
  for (const tool of agent.tools) {
    switch (tool) {
      case "stripe":
        ctx.stripe = { mrr: mockTools.stripe.getMRR(), costs: mockTools.stripe.getCosts() };
        break;
      case "github":
        ctx.github = mockTools.github.getPRs();
        break;
      case "linear":
        ctx.linear = mockTools.linear.getSprint();
        break;
      case "intercom":
        ctx.intercom = mockTools.intercom.getRecentTickets();
        break;
      case "gmail":
        ctx.gmail = mockTools.gmail.getInbox();
        break;
      case "calendar":
        ctx.calendar = mockTools.calendar.getToday();
        break;
      case "reddit":
        ctx.reddit = mockTools.reddit.getSignals();
        break;
      case "ashby":
        ctx.ashby = mockTools.ashby.getCandidates();
        break;
    }
  }
  return ctx;
}

import { gatherContext } from "../tools/mock.js";
import { activityLog } from "../store/activity.js";

const API = "https://api.anthropic.com/v1/messages";

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY || "",
    "anthropic-version": "2023-06-01",
  };
}

function buildUserMessage(query, context) {
  return `Tool data:\n${JSON.stringify(context, null, 2)}\n\nQuestion: "${query}"\n\nAnswer using the data above. Be specific — real numbers, real names. Max 150 words. No markdown headers.`;
}

export async function executeAgent(agent, query) {
  const context = gatherContext(agent);
  const res = await fetch(API, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: agent.systemPrompt,
      messages: [{ role: "user", content: buildUserMessage(query, context) }],
    }),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const answer = data.content?.find(b => b.type === "text")?.text ?? "No response.";

  const result = { agentId: agent.id, agentName: agent.name, icon: agent.icon, answer, toolsUsed: agent.tools, query, timestamp: new Date().toISOString() };
  activityLog.push(result);
  return result;
}

export async function executeAgentStream(agent, query, res) {
  const context = gatherContext(agent);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`event: agent\ndata: ${JSON.stringify({ agentId: agent.id, agentName: agent.name, icon: agent.icon, toolsUsed: agent.tools })}\n\n`);

  const upstream = await fetch(API, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      stream: true,
      system: agent.systemPrompt,
      messages: [{ role: "user", content: buildUserMessage(query, context) }],
    }),
  });

  if (!upstream.ok) {
    const msg = await upstream.text();
    res.write(`event: error\ndata: ${JSON.stringify({ message: `Claude ${upstream.status}: ${msg}` })}\n\n`);
    return;
  }

  let fullText = "";
  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw);
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
          fullText += evt.delta.text;
          res.write(`event: token\ndata: ${JSON.stringify({ token: evt.delta.text })}\n\n`);
        }
      } catch { /* skip malformed */ }
    }
  }

  activityLog.push({ agentId: agent.id, agentName: agent.name, icon: agent.icon, answer: fullText, toolsUsed: agent.tools, query, timestamp: new Date().toISOString() });
  res.write(`event: done\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
}

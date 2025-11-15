"use client";

import { AgentMessage } from "../types";

interface AssistantFeedProps {
  messages: AgentMessage[];
}

function timeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toneBadge(tone: AgentMessage["tone"]) {
  switch (tone) {
    case "celebrate":
      return "👏";
    case "alert":
      return "⏰";
    default:
      return "🤖";
  }
}

export function AssistantFeed({ messages }: AssistantFeedProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Agent pulse</h2>
        <p className="panel-sub">Live nudges and encouragement from your routine companion.</p>
      </div>
      <div className="feed">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>The agent is standing by</h3>
            <p>Create a task and it will begin monitoring for momentum.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`feed-item tone-${message.tone}`}>
              <div className="feed-avatar">{toneBadge(message.tone)}</div>
              <div className="feed-body">
                <div className="feed-meta">
                  <span className="feed-role">Agent</span>
                  <span className="feed-time">{timeLabel(message.createdAt)}</span>
                </div>
                <p>{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

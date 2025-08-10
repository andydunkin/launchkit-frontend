import { useRouter } from "next/router";
import React, { useMemo, useRef, useState } from "react";

/**
 * Step 4a: UI skeleton only — no API calls yet.
 * Left: Topics list
 * Right: Chat thread + input
 * We'll wire data in 4b.
 */

type Topic = {
  id: string;
  title: string;
  created_at?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
  topicId?: string;
};

const pageWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 340px) 1fr",
  height: "100vh",
};

const col = {
  borderRight: "1px solid #eee",
  padding: "16px",
} as const;

const rightCol = {
  padding: "16px",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  gap: 12,
  height: "100%",
} as const;

const list = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 8,
} as const;

const topicBtn: React.CSSProperties = {
  textAlign: "left",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  background: "white",
  cursor: "pointer",
};

const topicBtnActive: React.CSSProperties = {
  ...topicBtn,
  borderColor: "#111827",
  background: "#f9fafb",
};

const pill: React.CSSProperties = {
  fontSize: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "2px 8px",
  color: "#374151",
  background: "#f9fafb",
};

const chatWrap: React.CSSProperties = {
  overflow: "auto",
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
};

const chatRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const bubble = (role: ChatMessage["role"]): React.CSSProperties => ({
  maxWidth: "72ch",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: role === "user" ? "#eef2ff" : role === "assistant" ? "#f0fdf4" : "#f9fafb",
  whiteSpace: "pre-wrap",
});

export default function ProjectConceptPage() {
  const router = useRouter();
  const { projectId } = router.query as { projectId?: string };
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Placeholder local state (we’ll replace with API data in step 4b)
  const [topics, setTopics] = useState<Topic[]>([
    { id: "t-1", title: "Core Problem & Audience" },
    { id: "t-2", title: "Primary Features" },
    { id: "t-3", title: "Payments & Monetization" },
  ]);

  const [activeTopicId, setActiveTopicId] = useState<string>(topics[0]?.id ?? "");
  const activeTopic = useMemo(() => topics.find(t => t.id === activeTopicId), [topics, activeTopicId]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      role: "assistant",
      content: "Welcome! Let’s clarify the project at a high level. What are we building?",
      at: new Date().toISOString(),
      topicId: "t-1",
    },
  ]);

  const [draft, setDraft] = useState("");

  const filtered = useMemo(
    () => messages.filter(m => !activeTopicId || m.topicId === activeTopicId),
    [messages, activeTopicId]
  );

  const addUserMessage = (text: string) => {
    const id = `m-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id, role: "user", content: text.trim(), at: new Date().toISOString(), topicId: activeTopicId },
      // Placeholder assistant echo. In 4c we’ll call /ai/concept endpoints.
      {
        id: `${id}-a`,
        role: "assistant",
        content: "Got it. (This is a placeholder response — we’ll wire AI next.)",
        at: new Date().toISOString(),
        topicId: activeTopicId,
      },
    ]);
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;
    addUserMessage(text);
    setDraft("");
    inputRef.current?.focus();
  };

  const onNewTopic = () => {
    const nt: Topic = { id: `t-${Date.now()}`, title: "New topic" };
    setTopics(prev => [nt, ...prev]);
    setActiveTopicId(nt.id);
  };

  return (
    <div style={pageWrap}>
      {/* Left: Topics */}
      <aside style={col}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <span style={pill}>Project</span>
          <strong style={{ fontSize: 14, color: "#111827" }}>{projectId ?? "…"}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Topics</h2>
          <button onClick={onNewTopic} style={{ ...pill, borderRadius: 8 }}>+ New</button>
        </div>

        <ul style={list}>
          {topics.map(t => (
            <li key={t.id}>
              <button
                onClick={() => setActiveTopicId(t.id)}
                style={t.id === activeTopicId ? topicBtnActive : topicBtn}
                aria-pressed={t.id === activeTopicId}
              >
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                {/* place for small stats/badges later */}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: Chat */}
      <main style={rightCol}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Topic</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{activeTopic?.title ?? "…"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={`/dashboard`} style={pill}>Back to Dashboard</a>
            <a href={`/projects/${projectId}`} style={pill}>Project Home</a>
          </div>
        </header>

        <section style={chatWrap} aria-label="chat thread">
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map(m => (
              <div key={m.id} style={chatRow}>
                <div style={{ fontSize: 12, color: "#6b7280", width: 72, textAlign: "right" }}>
                  {m.role === "assistant" ? "AI" : m.role === "user" ? "You" : "Sys"}
                </div>
                <div style={bubble(m.role)}>{m.content}</div>
              </div>
            ))}
            {!filtered.length && (
              <div style={{ color: "#6b7280", fontStyle: "italic" }}>No messages yet for this topic.</div>
            )}
          </div>
        </section>

        <footer>
          <label htmlFor="draft" style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Your message
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <textarea
              id="draft"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Describe what you want, ask a question, or make a decision…"
              style={{ resize: "vertical", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
            />
            <button
              onClick={onSend}
              disabled={!draft.trim()}
              style={{
                alignSelf: "end",
                padding: "10px 14px",
                border: "1px solid #111827",
                background: "#111827",
                color: "white",
                borderRadius: 10,
                cursor: draft.trim() ? "pointer" : "not-allowed",
              }}
            >
              Send
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
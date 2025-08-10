const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}
import { useRouter } from "next/router";
import React, { useMemo, useRef, useState } from "react";

// Helper to safely extract an error message without using `any`
const errMessage = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);

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
  project_id?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
  topicId?: string;
  assistant?: boolean;
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

type GetTopicsResp = { ok: boolean; topics: Topic[] };
type CreateTopicResp = { ok: boolean; topic: Topic };
type ChatResp = { ok: boolean; assistant_message: { id?: string; content: string } };

export default function ProjectConceptPage() {
  const router = useRouter();
  const { projectId } = router.query as { projectId?: string };
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [topics, setTopics] = useState<Topic[]>([]);

  const [activeTopicId, setActiveTopicId] = useState<string>("");
  const activeTopic = useMemo(() => topics.find(t => t.id === activeTopicId), [topics, activeTopicId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [draft, setDraft] = useState("");

  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const filtered = useMemo(
    () => messages.filter(m => !activeTopicId || m.topicId === activeTopicId),
    [messages, activeTopicId]
  );

  const addUserMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !activeTopicId || !projectId) return;
    const userId = `m-${Date.now()}`;
    const nowIso = new Date().toISOString();
    // optimistic append user message
    setMessages(prev => [
      ...prev,
      { id: userId, role: "user", content: trimmed, at: nowIso, topicId: activeTopicId },
    ]);
    try {
      setSending(true);
      const resp = await api<ChatResp>(`/concept/projects/${projectId}/chat`, {
        method: "POST",
        body: JSON.stringify({ topic_id: activeTopicId, message: trimmed }),
      });
      const aiText = resp?.assistant_message?.content ?? "";
      setMessages(prev => [
        ...prev,
        {
          id: `${userId}-ai`,
          role: "assistant",
          content: aiText || "OK.",
          at: new Date().toISOString(),
          topicId: activeTopicId,
        },
      ]);
    } catch (err: unknown) {
      setMessages(prev => [
        ...prev,
        {
          id: `${userId}-err`,
          role: "system",
          content: `⚠️ Failed to reach AI: ${errMessage(err)}`,
          at: new Date().toISOString(),
          topicId: activeTopicId,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    await addUserMessage(text);
    setDraft("");
    inputRef.current?.focus();
  };

  const onNewTopic = async () => {
    if (!projectId) return;
    const title = window.prompt("Topic title?", "New topic")?.trim();
    if (!title) return;
    try {
      const data = await api<CreateTopicResp>(`/concept/projects/${projectId}/topics`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      const nt = data.topic;
      setTopics(prev => [nt, ...prev]);
      setActiveTopicId(nt.id);
    } catch (err: unknown) {
      alert(`Failed to create topic: ${errMessage(err)}`);
    }
  };

  React.useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingTopics(true);
        setTopicsError(null);
        const data = await api<GetTopicsResp>(`/concept/projects/${projectId}/topics`);
        if (cancelled) return;
        const ts = data.topics || [];
        setTopics(ts);
        // auto-select first topic if none selected
        if (!activeTopicId && ts.length) {
          setActiveTopicId(ts[0].id);
        }
      } catch (err: unknown) {
        if (!cancelled) setTopicsError(errMessage(err) || "Failed to load topics");
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, activeTopicId]);

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

        {loadingTopics && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Loading topics…</div>}
        {topicsError && <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 6 }}>{topicsError}</div>}

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
              disabled={sending || !draft.trim()}
              style={{
                alignSelf: "end",
                padding: "10px 14px",
                border: "1px solid #111827",
                background: "#111827",
                color: "white",
                borderRadius: 10,
                opacity: sending ? 0.7 : 1,
                cursor: sending ? "progress" : draft.trim() ? "pointer" : "not-allowed",
              }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
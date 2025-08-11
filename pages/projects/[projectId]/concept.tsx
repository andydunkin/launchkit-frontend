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

type Topic = {
  id: string;
  title: string;
  created_at?: string;
  project_id?: string;
};

type OverviewResp = {
  ok: boolean;
  seed_prompt?: string;
  topics: Topic[];
  first_question?: { id: string; content: string };
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
  topicId?: string;
  assistant?: boolean;
};

const basePageWrap: React.CSSProperties = {
  display: "grid",
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

type CreateTopicResp = { ok: boolean; topic: Topic };
type ChatResp = { ok: boolean; assistant_message: { id?: string; content: string } };

type MessagesListResp = {
  ok: boolean;
  messages: { id: string; role: "user" | "assistant" | "system"; content: string; at?: string }[];
};

type ProjectAction = {
  id: string;
  project_id?: string;
  topic_id?: string | null;
  label: string;
  description?: string | null;
  trigger_type: "input_form" | "confirm_action" | "auto_commit" | string;
  payload_schema?: unknown;
  status: "pending" | "completed" | "skipped" | string;
  created_at?: string;
  completed_at?: string | null;
};
type ActionsListResp = { ok: boolean; actions: ProjectAction[] };
type ActionUpdateResp = { ok: boolean; action: ProjectAction };

export default function ProjectConceptPage() {
  const router = useRouter();
  const q = router.query as { projectId?: string; project_id?: string };
  const pid =
    q.projectId ??
    q.project_id ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("project_id") ?? undefined
      : undefined);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [activeTopicId, setActiveTopicId] = useState<string>("");
  const activeTopic = useMemo(() => topics.find(t => t.id === activeTopicId), [topics, activeTopicId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const seededLoadRef = useRef(0);
  const [actions, setActions] = useState<ProjectAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [actionsRefreshTick, setActionsRefreshTick] = useState(0);

  const [draft, setDraft] = useState("");

  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);

  const filtered = useMemo(
    () => messages.filter(m => !activeTopicId || m.topicId === activeTopicId),
    [messages, activeTopicId]
  );

  const pendingActions = useMemo(
    () => actions.filter(a => a.status === "pending"),
    [actions]
  );
  const hasActionRail = pendingActions.length > 0;
  const layout = useMemo<React.CSSProperties>(() => {
    return {
      ...basePageWrap,
      gridTemplateColumns: hasActionRail ? "minmax(260px, 340px) 1fr 300px" : "minmax(260px, 340px) 1fr",
    };
  }, [hasActionRail]);

  const addUserMessage = async (text: string, topicIdOverride?: string) => {
    const trimmed = text.trim();
    const tid = topicIdOverride || activeTopicId;
    if (!trimmed || !tid || !pid) return;
    const userId = `m-${Date.now()}`;
    const nowIso = new Date().toISOString();
    setMessages(prev => [
      ...prev,
      { id: userId, role: "user", content: trimmed, at: nowIso, topicId: tid },
    ]);
    try {
      setSending(true);
      const resp = await api<ChatResp>(`/concept/projects/${pid}/chat`, {
        method: "POST",
        body: JSON.stringify({ topic_id: tid, message: trimmed }),
      });
      const aiText = resp?.assistant_message?.content ?? "";
      setMessages(prev => [
        ...prev,
        {
          id: `${userId}-ai`,
          role: "assistant",
          content: aiText || "OK.",
          at: new Date().toISOString(),
          topicId: tid,
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
          topicId: tid,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSend = async () => {
    const text = draft.trim();
    if (!text || !pid) return;
    let tid = activeTopicId;
    try {
      if (!tid) {
        const data = await api<CreateTopicResp>(`/concept/projects/${pid}/topics`, {
          method: "POST",
          body: JSON.stringify({ title: "General" }),
        });
        tid = data.topic.id;
        setTopics(prev => [data.topic, ...prev]);
        setActiveTopicId(tid);
      }
      await addUserMessage(text, tid);
    } finally {
      setDraft("");
      inputRef.current?.focus();
    }
  };

  const onNewTopic = async () => {
    if (!pid) return;
    const title = window.prompt("Topic title?", "New topic")?.trim();
    if (!title) return;
    try {
      const data = await api<CreateTopicResp>(`/concept/projects/${pid}/topics`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      const nt = data.topic;
      setTopics(prev => [nt, ...prev]);
      setActiveTopicId(nt.id);
      setMessages([]);
    } catch (err: unknown) {
      alert(`Failed to create topic: ${errMessage(err)}`);
    }
  };

  async function refreshMessages(pid: string, tid: string) {
    if (!pid || !tid) return;
    const ticket = ++seededLoadRef.current;
    try {
      const data = await api<MessagesListResp>(`/concept/projects/${pid}/topics/${tid}/messages`);
      if (ticket !== seededLoadRef.current) return;
      const rows = (data.messages || []).map((m, i) => ({
        id: m.id || `hist-${i}`,
        role: m.role,
        content: m.content,
        at: m.at || new Date().toISOString(),
        topicId: tid,
      })) as ChatMessage[];
      setMessages(rows);
    } catch {
    }
  }

  async function refreshActions(pid: string) {
    try {
      setLoadingActions(true);
      setActionsError(null);
      const data = await api<ActionsListResp>(`/ai/actions/projects/${pid}`);
      setActions(data.actions || []);
    } catch (err: unknown) {
      setActionsError(errMessage(err));
    } finally {
      setLoadingActions(false);
    }
  }

  async function completeAction(actionId: string) {
    try {
      setActions(prev => prev.map(a => (a.id === actionId ? { ...a, status: "completed", completed_at: new Date().toISOString() } : a)));
      await api<ActionUpdateResp>(`/ai/actions/${actionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      setActionsRefreshTick(t => t + 1);
    } catch (err: unknown) {
      setActions(prev => prev.map(a => (a.id === actionId ? { ...a, status: "pending", completed_at: null } : a)));
      setActionsError(`Failed to complete action: ${errMessage(err)}`);
    }
  }

  React.useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    const loadOverview = async () => {
      setLoadingTopics(true);
      setTopicsError(null);
      try {
        let data = await api<OverviewResp>(`/concept/projects/${pid}/overview`);
        if (cancelled) return;
        if (!data.topics || data.topics.length === 0) {
          try {
            await api<{ ok: boolean }>(`/concept/start`, {
              method: "POST",
              body: JSON.stringify({ project_id: pid }),
            });
            data = await api<OverviewResp>(`/concept/projects/${pid}/overview`);
            if (cancelled) return;
          } catch (e) {
            if (!cancelled) setTopicsError(errMessage(e) || "Failed to start concept");
            return;
          }
        }
        const ts = data.topics || [];
        setTopics(ts);
        setSeedPrompt(data.seed_prompt ?? null);
        if (!activeTopicId && ts.length) {
          setActiveTopicId(ts[0].id);
          // 🔹 auto-load full message history for first topic
          await refreshMessages(pid, ts[0].id);
        }
        if (data.first_question && !messages.length) {
          setMessages([
            {
              id: data.first_question.id,
              role: "assistant",
              content: data.first_question.content,
              at: new Date().toISOString(),
              topicId: ts.length ? ts[0].id : undefined,
            },
          ]);
        }
      } catch (err: unknown) {
        if (!cancelled) setTopicsError(errMessage(err) || "Failed to load topics");
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    };
    void loadOverview();
    return () => { cancelled = true; };
  }, [pid]);

  React.useEffect(() => {
    if (!pid || !activeTopicId) return;
    void refreshMessages(pid, activeTopicId);
  }, [pid, activeTopicId]);

  React.useEffect(() => {
    if (!pid) return;
    void refreshActions(pid);
  }, [pid, actionsRefreshTick]);

  React.useEffect(() => {
    if (!pid) return;
    const id = setInterval(() => setActionsRefreshTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, [pid]);

  return (
    <div style={layout}>
      {/* Left: Topics */}
      <aside style={col}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <span style={pill}>Project</span>
          <strong style={{ fontSize: 14, color: "#111827" }}>{pid ?? "…"}</strong>
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
            <a href={`/projects/${pid}`} style={pill}>Project Home</a>
          </div>
        </header>
        {seedPrompt && (
          <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", margin: "4px 0 10px 0" }}>
            {seedPrompt}
          </div>
        )}
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
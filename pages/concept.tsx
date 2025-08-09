// pages/concept.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type QuestionType = "short" | "long" | "select" | "boolean" | "url" | "number";
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required?: boolean;
  suggested?: string[];
}

interface StartResponse {
  concept_id: string;
  status: "questions" | "brief_ready" | "finalized";
  questions: Question[];
}

interface BriefResponse {
  concept_id: string;
  status: "questions" | "brief_ready" | "finalized";
  answers: Record<string, unknown>;
  brief: unknown;
}

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "") || "";

export default function ConceptPage() {
  const router = useRouter();
  // Prefer ?project_id=... ; fall back to localStorage:lastProjectId if present
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    const q = (router.query.project_id as string) || "";
    if (q) {
      setProjectId(q);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastProjectId", q);
      }
    } else if (typeof window !== "undefined") {
      const last = window.localStorage.getItem("lastProjectId") || "";
      if (last) setProjectId(last);
    }
  }, [router.query.project_id]);

  const [userPrompt, setUserPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [conceptId, setConceptId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [brief, setBrief] = useState<unknown>(null);

  const canStart = useMemo(
    () => !!API_BASE && !!projectId && userPrompt.trim().length > 4,
    [projectId, userPrompt]
  );

  async function startConcept() {
    if (!canStart) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/concept/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          user_prompt: userPrompt,
          max_questions: 6,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Start failed: ${res.status} ${txt}`);
      }
      const data: StartResponse = await res.json();
      setConceptId(data.concept_id);
      setQuestions(data.questions || []);
      // initialize answers map
      const init: Record<string, string> = {};
      (data.questions || []).forEach((q) => {
        init[q.id] = "";
      });
      setAnswers(init);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswers() {
    if (!conceptId) return;
    // simple required enforcement
    for (const q of questions) {
      if (q.required && !String(answers[q.id] || "").trim()) {
        // eslint-disable-next-line no-alert
        alert(`Please answer: ${q.text}`);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/concept/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept_id: conceptId,
          answers,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Submit failed: ${res.status} ${txt}`);
      }
      const data: BriefResponse = await res.json();
      setBrief(data.brief);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function renderInput(q: Question) {
    const common =
      "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring";
    const val = answers[q.id] ?? "";

    if (q.type === "long") {
      return (
        <textarea
          className={`${common} min-h-[120px]`}
          value={val}
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
          }
          placeholder={q.suggested?.[0] || ""}
        />
      );
    }

    if (q.type === "select" && (q.suggested?.length || 0) > 0) {
      return (
        <select
          className={common}
          value={val}
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
          }
        >
          <option value="">Select…</option>
          {q.suggested!.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (q.type === "boolean") {
      return (
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={q.id}
              checked={val === "true"}
              onChange={() =>
                setAnswers((prev) => ({ ...prev, [q.id]: "true" }))
              }
            />
            <span>Yes</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={q.id}
              checked={val === "false"}
              onChange={() =>
                setAnswers((prev) => ({ ...prev, [q.id]: "false" }))
              }
            />
            <span>No</span>
          </label>
        </div>
      );
    }

    const inputType =
      q.type === "url" ? "url" : q.type === "number" ? "number" : "text";

    return (
      <input
        type={inputType}
        className={common}
        value={val}
        onChange={(e) =>
          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
        }
        placeholder={q.suggested?.[0] || ""}
      />
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Concept Assistant</h1>

      {/* Project selector (lightweight) */}
      <div className="mb-6 grid gap-2">
        <label className="text-sm font-medium">Project ID</label>
        <input
          className="border rounded-lg px-3 py-2"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="UUID of the project"
        />
        <p className="text-xs text-gray-500">
          Tip: Append <code>?project_id=&lt;uuid&gt;</code> to the URL to set
          this automatically.
        </p>
      </div>

      {!conceptId && (
        <section className="grid gap-3 mb-8">
          <label className="text-sm font-medium">What are we building?</label>
          <textarea
            className="border rounded-lg p-3 min-h-[140px]"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g., A service request form that checks my Calendly availability and collects a Stripe deposit…"
          />
          <button
            disabled={!canStart || loading}
            onClick={startConcept}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-60"
          >
            {loading ? "Starting…" : "Generate Clarifying Questions"}
          </button>
        </section>
      )}

      {!!conceptId && questions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Clarifying Questions</h2>
          <div className="grid gap-6">
            {questions.map((q) => (
              <div key={q.id} className="grid gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{q.text}</span>
                  {q.required && (
                    <span className="text-xs text-red-500">(required)</span>
                  )}
                </div>
                {renderInput(q)}
                {q.suggested && q.suggested.length > 0 && (
                  <div className="text-xs text-gray-500">
                    Suggestions: {q.suggested.join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={loading}
              onClick={submitAnswers}
              className="bg-green-600 text-white rounded-lg px-4 py-2 disabled:opacity-60"
            >
              {loading ? "Generating brief…" : "Submit Answers & Generate Brief"}
            </button>
          </div>
        </section>
      )}

      {!!brief && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Draft Brief</h2>
          <pre className="bg-gray-950 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(brief, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
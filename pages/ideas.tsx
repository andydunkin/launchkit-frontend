// pages/ideas.tsx
import { useCallback, useMemo, useState } from "react";
import ProjectBriefCard from "../components/ProjectBriefCard";
import ClarifyQuestions from "../components/ClarifyQuestions";

type QuestionType = "text" | "select" | "boolean" | "number";

export interface ClarifyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // for select
  required?: boolean;
}

export interface ClarifyResponse {
  questions: ClarifyQuestion[];
  assumptions: string[];
  suggested_scope: "mvp" | "standard" | "stretch";
  required_integrations: string[]; // e.g., ["stripe","calendly"]
  artifacts: string[]; // e.g., ["index.html", "api/bookings.ts"]
}

export default function IdeasPage() {
  const [idea, setIdea] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [clarify, setClarify] = useState<ClarifyResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean | number>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const onFetchClarifications = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/ideas/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "demo-user-id", draft_text: idea }),
      });

      let payload: ClarifyResponse;

      if (!res.ok) {
        // Fallback mock so the UI is usable before the API exists.
        payload = {
          questions: [
            { id: "audience", text: "Who is the primary audience?", type: "text", required: true },
            { id: "payment", text: "Do you need to accept payments?", type: "boolean" },
            { id: "booking", text: "Do you need calendar bookings?", type: "boolean" },
            { id: "brand", text: "One line brand tagline?", type: "text" },
          ],
          assumptions: [
            "You want a web app with a public landing page.",
            "You’re okay starting with an MVP scope.",
          ],
          suggested_scope: "mvp",
          required_integrations: [],
          artifacts: ["index.html", "styles.css"],
        };
      } else {
        payload = (await res.json()) as ClarifyResponse;
      }

      setClarify(payload);
      setStep(2);
    } catch (e) {
      setError("Could not generate clarifying questions. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [idea]);

  const brief = useMemo(() => {
    if (!clarify) return null;

    // Build a normalized “Project Brief” from idea + answers + clarify meta
    const answered: Record<string, string> = {};
    Object.entries(answers).forEach(([k, v]) => {
      answered[k] = String(v);
    });

    return {
      summary: idea.trim(),
      answers: answered,
      assumptions: clarify.assumptions,
      scope: clarify.suggested_scope,
      integrations: clarify.required_integrations,
      artifacts: clarify.artifacts,
    };
  }, [clarify, answers, idea]);

  return (
    <main className="min-h-screen p-6 md:p-10 flex flex-col gap-6">
      <h1 className="text-2xl md:text-3xl font-bold">Describe what we’re building</h1>

      {step === 1 && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={8}
              className="w-full p-4 border rounded-xl focus:outline-none"
              placeholder="Example: A service request portal that books time via Calendly and collects a Stripe deposit…"
            />
            <div className="mt-3 flex gap-3">
              <button
                disabled={loading || idea.trim().length < 10}
                onClick={onFetchClarifications}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Thinking…" : "Next: Clarify Requirements"}
              </button>
            </div>
            {error && <p className="text-red-600 mt-3">{error}</p>}
          </div>
          <div>
            <ProjectBriefCard
              title="Project Brief (draft)"
              summary={idea || "Your high-level idea will appear here."}
              assumptions={[]}
              scope={undefined}
              integrations={[]}
              artifacts={[]}
              compact
            />
          </div>
        </section>
      )}

      {step === 2 && clarify && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <ClarifyQuestions
              questions={clarify.questions}
              values={answers}
              onChange={setAnswers}
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => alert("Saved! (Next: hook to /prompts or /build)")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Save Brief
              </button>
            </div>
          </div>
          <div>
            <ProjectBriefCard
              title="Project Brief"
              summary={brief?.summary}
              assumptions={brief?.assumptions}
              scope={brief?.scope}
              integrations={brief?.integrations}
              artifacts={brief?.artifacts}
            />
          </div>
        </section>
      )}
    </main>
  );
}
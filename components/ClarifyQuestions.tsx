// components/ClarifyQuestions.tsx
import { ClarifyQuestion } from "../pages/ideas";

interface Props {
  questions: ClarifyQuestion[];
  values: Record<string, string | boolean | number>;
  onChange: (values: Record<string, string | boolean | number>) => void;
}

export default function ClarifyQuestions({ questions, values, onChange }: Props) {
  const set = (id: string, val: string | boolean | number) => {
    onChange({ ...values, [id]: val });
  };

  return (
    <div className="rounded-2xl border p-4">
      <h2 className="text-lg font-semibold mb-3">Answer a few quick questions</h2>
      <div className="grid gap-4">
        {questions.map((q) => {
          const v = values[q.id];
          switch (q.type) {
            case "boolean":
              return (
                <label key={q.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(v)}
                    onChange={(e) => set(q.id, e.target.checked)}
                  />
                  <span>{q.text}{q.required ? " *" : ""}</span>
                </label>
              );
            case "number":
              return (
                <div key={q.id}>
                  <label className="block text-sm mb-1">
                    {q.text}{q.required ? " *" : ""}
                  </label>
                  <input
                    type="number"
                    value={typeof v === "number" ? v : ""}
                    onChange={(e) => set(q.id, Number(e.target.value))}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              );
            case "select":
              return (
                <div key={q.id}>
                  <label className="block text-sm mb-1">
                    {q.text}{q.required ? " *" : ""}
                  </label>
                  <select
                    value={typeof v === "string" ? v : ""}
                    onChange={(e) => set(q.id, e.target.value)}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="">Select…</option>
                    {(q.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              );
            default:
              return (
                <div key={q.id}>
                  <label className="block text-sm mb-1">
                    {q.text}{q.required ? " *" : ""}
                  </label>
                  <input
                    type="text"
                    value={typeof v === "string" ? v : ""}
                    onChange={(e) => set(q.id, e.target.value)}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
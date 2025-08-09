// components/ProjectBriefCard.tsx
interface Props {
  title?: string;
  summary?: string;
  assumptions?: string[];
  scope?: "mvp" | "standard" | "stretch";
  integrations?: string[];
  artifacts?: string[];
  compact?: boolean;
}

export default function ProjectBriefCard({
  title = "Project Brief",
  summary,
  assumptions,
  scope,
  integrations,
  artifacts,
  compact = false,
}: Props) {
  return (
    <div className="rounded-2xl border p-4 sticky top-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm text-gray-700 space-y-3">
        <div>
          <div className="font-medium">Summary</div>
          <div>{summary || "—"}</div>
        </div>

        {!compact && (
          <>
            <div>
              <div className="font-medium">Assumptions</div>
              <ul className="list-disc ml-5">
                {(assumptions || []).map((a) => (<li key={a}>{a}</li>))}
              </ul>
            </div>

            <div>
              <div className="font-medium">Scope</div>
              <div className="capitalize">{scope || "—"}</div>
            </div>

            <div>
              <div className="font-medium">Required Integrations</div>
              <div>{(integrations || []).join(", ") || "—"}</div>
            </div>

            <div>
              <div className="font-medium">Planned Artifacts</div>
              <ul className="list-disc ml-5">
                {(artifacts || []).map((f) => (<li key={f}>{f}</li>))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
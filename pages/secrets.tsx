// pages/secrets.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import IntegrationForms from '../components/IntegrationForms';

/**
 * Provider‑agnostic Secrets page
 *
 * Renders IntegrationForms, which talks to the FastAPI backend:
 *   - GET  /integrations
 *   - POST /projects/{projectId}/integrations/{slug}
 *   - GET  /projects/{projectId}/integrations
 *
 * Project ID is read from `?projectId=` or last selection in localStorage.
 */
export default function SecretsPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const q = (router.query.projectId as string) || '';
    if (q) {
      setProjectId(q);
      try { localStorage.setItem('lk_last_project_id', q); } catch {}
      setReady(true);
      return;
    }
    try {
      const cached = localStorage.getItem('lk_last_project_id') || '';
      if (cached) setProjectId(cached);
    } catch {}
    setReady(true);
  }, [router.isReady, router.query.projectId]);

  const onSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    try { localStorage.setItem('lk_last_project_id', projectId); } catch {}
  };

  if (!ready) return <main className="p-8">Loading…</main>;

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Secrets & Integrations</h1>

      {!projectId ? (
        <section className="mb-8">
          <p className="mb-2">No project detected. Enter a Project ID to continue.</p>
          <form onSubmit={onSubmitManual} className="flex gap-2">
            <input
              type="text"
              placeholder="Project ID (UUID)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Use Project</button>
          </form>
        </section>
      ) : (
        <section className="mb-8">
          <div className="text-sm text-gray-600 mb-3">Current project: <code>{projectId}</code></div>
          <IntegrationForms projectId={projectId} />
        </section>
      )}

      <section className="mt-10 text-sm text-gray-600">
        <p>
          Provider‑agnostic: definitions come from your backend registry and are saved per‑project.
          New providers require only a registry entry; no UI code changes.
        </p>
      </section>
    </main>
  );
}
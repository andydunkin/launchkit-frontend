import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type FileRow = { id?: string; path: string; created_at: string };
type FileDetail = { id?: string; path: string; contents?: string; created_at: string };

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProjectFilesPage() {
  const router = useRouter();
  const { projectId } = router.query as { projectId?: string };

  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [selected, setSelected] = useState<FileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const apiHost = useMemo(() => {
    try {
      return API ? new URL(API).host : "not set";
    } catch {
      return API || "not set";
    }
  }, []);

  async function handlePublish() {
    if (!projectId || !API) return;
    setPublishing(true);
    setPublishMessage(null);
    try {
      const res = await fetch(`${API}/projects/${projectId}/publish`, { method: "POST" });
      if (!res.ok) throw new Error(`Publish failed: ${res.status}`);
      const data = await res.json().catch(() => ({}));
      setPublishMessage((data && (data.message as string)) || "Publish successful");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed";
      setPublishMessage(`Error: ${msg}`);
    } finally {
      setPublishing(false);
    }
  }

  async function fetchFiles() {
    if (!projectId || !API) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/projects/${projectId}/files`);
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.files ?? data?.data ?? []);
      setFiles(Array.isArray(list) ? (list as FileRow[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFile(path: string) {
    if (!projectId || !API) return;
    setError(null);
    try {
      const encoded = encodeURIComponent(path);
      const res = await fetch(`${API}/projects/${projectId}/files/${encoded}`);
      if (!res.ok) throw new Error(`Get file failed: ${res.status}`);
      const data = await res.json();
      const file = (data && (data.file ?? data)) as FileDetail | undefined;
      if (!file) throw new Error("Malformed response");
      setSelected(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load file");
    }
  }

  useEffect(() => {
    if (projectId && API) {
      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, API]);

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Files for Project</h1>
        <div className="text-sm text-gray-500">API: {apiHost}</div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={fetchFiles}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading || !projectId}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        <button
          onClick={handlePublish}
          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          disabled={publishing || !projectId}
        >
          {publishing ? "Publishing…" : "Publish"}
        </button>
        {publishMessage && <div className="text-sm text-gray-600">{publishMessage}</div>}
        {error && <div className="text-red-600 text-sm">Error: {error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* List */}
        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-3">Files</h2>
          {files.length === 0 && !loading && (
            <div className="text-sm text-gray-500">No files yet.</div>
          )}
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id ?? `${f.path}-${f.created_at}`}>
                <button
                  onClick={() => fetchFile(f.path)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 border"
                  title={new Date(f.created_at).toLocaleString()}
                >
                  <div className="font-mono text-sm break-all">{f.path}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(f.created_at).toLocaleString()}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Preview */}
        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-3">Preview</h2>
          {!selected && (
            <div className="text-sm text-gray-500">
              Select a file to view contents.
            </div>
          )}
          {selected && (
            <>
              <div className="mb-2">
                <div className="font-mono text-sm break-all">{selected.path}</div>
                <div className="text-xs text-gray-500">
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <pre className="border rounded p-3 overflow-auto text-sm">
                {selected.contents ?? ""}
              </pre>
              <div className="mt-3 flex gap-2">
                <a
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                    selected.contents ?? ""
                  )}`}
                  download={selected.path.split("/").pop() || "file.txt"}
                >
                  Download
                </a>
                <button
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                  onClick={() => navigator.clipboard.writeText(selected.contents ?? "")}
                >
                  Copy
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
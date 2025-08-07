import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type FileRow = { id: string; path: string; created_at: string };
type FileDetail = { id: string; path: string; contents: string; created_at: string };

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProjectFilesPage() {
  const router = useRouter();
  const { projectId } = router.query as { projectId?: string };

  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [selected, setSelected] = useState<FileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!projectId || !API) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/projects/${projectId}/files`);
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const fetchFile = async (path: string) => {
    if (!projectId || !API) return;
    setError(null);
    try {
      // encode path safely for URL segment
      const encoded = encodeURIComponent(path);
      const res = await fetch(`${API}/projects/${projectId}/files/${encoded}`);
      if (!res.ok) throw new Error(`Get file failed: ${res.status}`);
      const data = (await res.json()) as FileDetail;
      setSelected(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load file");
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Files for Project</h1>
        <div className="text-sm text-gray-500">
          API: {API ? new URL(API).host : "not set"}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={fetchFiles}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          disabled={loading || !projectId}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        {error && <div className="text-red-600 text-sm">Error: {error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* List */}
        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-3">Files</h2>
          {files.length === 0 && (
            <div className="text-sm text-gray-500">No files yet.</div>
          )}
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id}>
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
                {selected.contents}
              </pre>
              <div className="mt-3 flex gap-2">
                <a
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                    selected.contents || ""
                  )}`}
                  download={selected.path.split("/").pop() || "file.txt"}
                >
                  Download
                </a>
                <button
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                  onClick={() => navigator.clipboard.writeText(selected.contents || "")}
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

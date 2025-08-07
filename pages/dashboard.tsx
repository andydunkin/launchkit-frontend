import { useEffect, useState } from 'react'
import Link from 'next/link'
import RevertOverlay from '../components/RevertOverlay'

interface Project {
  id: string
  name: string
  status: string
  subdomain: string
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL
  const APPS_DOMAIN = 'launching.stratxi.com' // wildcard domain for user apps

  const load = async () => {
    if (!API) {
      setError('NEXT_PUBLIC_API_URL is not set')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/projects/demo-user-id`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      // backend may return a single object or an array; normalize to array
      const list: Project[] = Array.isArray(data) ? data : (data ? [data] : [])
      setProjects(list)
    } catch (e: any) {
      setError(e?.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createProject = async () => {
    if (!API) {
      setError('NEXT_PUBLIC_API_URL is not set')
      return
    }
    setLoading(true)
    setError(null)
    const timestamp = Date.now()
    const newProject = {
      user_id: 'demo-user-id',
      name: `app-${timestamp}`,
      subdomain: `app-${timestamp}`
    }
    try {
      const res = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Project Dashboard</h1>
        <button
          onClick={createProject}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Project
        </button>
      </div>
      <div className="text-sm text-gray-500 mb-6">API: {API ? new URL(API).host : 'not set'}</div>

      {loading && <div className="text-gray-600 mb-4">Loading…</div>}
      {error && <div className="text-red-600 mb-4">Error: {error}</div>}

      <ul className="space-y-4">
        {projects.map((proj) => {
          const appHost = proj.subdomain?.startsWith('app-')
            ? `${proj.subdomain}.${APPS_DOMAIN}`
            : proj.subdomain
              ? `${proj.subdomain}.${APPS_DOMAIN}`
              : ''

          return (
            <li key={proj.id} className="p-4 border rounded">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{proj.name}</h2>
                  <p className="text-sm text-gray-600">Status: {proj.status}</p>
                  <p className="text-sm text-gray-600">Subdomain: {proj.subdomain}</p>
                </div>
                <div className="flex gap-2">
                  {/* View generated files */}
                  <Link
                    href={`/projects/${encodeURIComponent(proj.id)}/files`}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    View Files
                  </Link>
                  {/* Open app on wildcard subdomain (new tab) */}
                  {appHost && (
                    <a
                      href={`https://${appHost}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded border hover:bg-gray-50"
                      title={`Open ${appHost}`}
                    >
                      Open App ↗
                    </a>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <RevertOverlay message="Project dashboard updated. Revert available." />
    </main>
  )
}

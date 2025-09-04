import { useEffect, useState } from 'react'
import Link from 'next/link'
import RevertOverlay from '../components/RevertOverlay'
import { getUserId } from '../lib/auth'
import { useToast } from '../components/Toast'

interface Project {
  id: string
  name: string
  status: string
  subdomain: string
  no_files_generated?: boolean
}

const API = process.env.NEXT_PUBLIC_API_URL

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [creating, setCreating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { showError } = useToast()

  const APPS_DOMAIN = 'launching.stratxi.com' // wildcard domain for user apps

  const apiHost = (() => {
    try {
      return API ? new URL(API).host : 'not set'
    } catch {
      return API || 'not set'
    }
  })()

  const load = async () => {
    if (!API) {
      setError('NEXT_PUBLIC_API_URL is not set')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const userId = await getUserId()
      const res = await fetch(`${API}/projects?user_id=${userId}`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data: Project[] | Project | null = await res.json()
      const list: Project[] = Array.isArray(data) ? data : (data ? [data] : [])
      setProjects(list)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load projects'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createProject = async () => {
    if (!API) {
      setError('NEXT_PUBLIC_API_URL is not set')
      return
    }
    setCreating(true)
    setError(null)
    const timestamp = Date.now()
    const userId = await getUserId()
    const newProject = {
      user_id: userId,
      name: `app-${timestamp}`,
      subdomain: `app-${timestamp}`,
    }
    try {
      const res = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`API ${res.status} ${txt}`)
      }
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create project'
      setError(msg)
      showError(`Project Creation Failed: ${msg}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Project Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={() => void createProject()}
            disabled={creating}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-6">API: {apiHost}</div>

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
                  {proj.no_files_generated && (
                    <p className="text-sm text-yellow-600">
                      ⚠️ Last generation produced no files — try clarifying your request.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* View generated files */}
                  <Link
                    href={`/projects/${encodeURIComponent(proj.id)}/files`}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    View Files
                  </Link>
                  {/* Concept Stage button */}
                  <Link
                    href={`/concept?project_id=${encodeURIComponent(proj.id)}`}
                    className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Concept Stage
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

      {/* RevertOverlay removed - will be added back when dashboard is rebuilt */}
    </main>
  )
}

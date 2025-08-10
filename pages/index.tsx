import { useMemo, useState } from 'react'

// Accept a few possible shapes the backend might return
// 1) { id: string }
// 2) { project: { id: string } }
// 3) [{ id: string }, ...]
// 4) null/undefined
export type ProjectResponse =
  | { id: string }
  | { project?: { id?: string } }
  | Array<{ id?: string }>
  | null
  | undefined

function sanitizeApiBase(raw: string | undefined | null): string | null {
  if (!raw) return null
  try {
    // Allow values like "api.example.com" or full URLs.
    const withScheme = raw.startsWith('http') ? raw : `https://${raw}`
    const u = new URL(withScheme)
    // Force HTTPS no matter what
    u.protocol = 'https:'
    // Use origin only (strip any path/query) and drop trailing slash
    return u.origin
  } catch {
    return null
  }
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const API_BASE = useMemo(
    () => sanitizeApiBase(process.env.NEXT_PUBLIC_API_URL),
    []
  )

  const extractProjectId = (obj: ProjectResponse): string | undefined => {
    if (!obj) return undefined
    // case 1
    if (!Array.isArray(obj) && 'id' in obj && typeof obj.id === 'string') {
      return obj.id
    }
    // case 2
    if (!Array.isArray(obj) && 'project' in obj && obj.project?.id) {
      return obj.project.id
    }
    // case 3
    if (Array.isArray(obj) && obj.length > 0 && typeof obj[0]?.id === 'string') {
      return obj[0].id
    }
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    if (!API_BASE) {
      alert('Backend API URL is not configured.')
      return
    }
    setSubmitted(true)

    try {
      const timestamp = Date.now()
      const subdomain = `app-${timestamp}`

      // 1) Create a project
      const res = await fetch(`${API_BASE}/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'demo-user-id',
          name: subdomain,
          subdomain,
        }),
      })

      const bodyText = await res.clone().text()
      if (!res.ok) {
        throw new Error(`Project create failed (${res.status})`)
      }

      const projectObj: ProjectResponse = JSON.parse(bodyText || '{}')
      const projectId = extractProjectId(projectObj)
      if (!projectId) {
        throw new Error('Could not determine project ID from response.')
      }

      // 2) Kick off Concept stage with the initial prompt (backend will seed topic, action, first AI reply)
      const startRes = await fetch(`${API_BASE}/concept/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: 'Concept Kickoff',
          initial_prompt: prompt.trim(),
        }),
      })

      if (!startRes.ok) {
        const t = await startRes.text()
        throw new Error(`Concept start failed (${startRes.status}): ${t}`)
      }

      // 3) Success message then redirect **straight to the project concept page**
      setSuccessMsg('Project created! Taking you to the concept stage…')
      setTimeout(() => {
        window.location.href = `/projects/${projectId}/concept`
      }, 1200)
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message)
      } else {
        alert('Something went wrong. Please try again.')
      }
      setSubmitted(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6">Describe Your App</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-4 border rounded mb-4"
          rows={5}
          placeholder="Example: A booking site with Stripe and Calendly integration"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={submitted}
        >
          {submitted ? 'Submitting…' : 'Build App'}
        </button>
      </form>

      {successMsg && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {successMsg}
        </div>
      )}
    </main>
  )
}
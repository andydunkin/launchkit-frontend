import { useEffect, useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const API_BASE = process.env.NEXT_PUBLIC_API_URL

  // Small guard to ensure we see the API base at runtime (helpful during deploys)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('LaunchKit FRONTEND using API:', API_BASE)
  }, [API_BASE])

  const extractProjectId = (obj: any): string | undefined => {
    // Be tolerant to different backend shapes
    if (!obj) return undefined
    if (obj.id) return obj.id
    if (obj.project?.id) return obj.project.id
    if (Array.isArray(obj) && obj[0]?.id) return obj[0].id
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setSubmitted(true)

    try {
      // 1) Create a project
      const timestamp = Date.now()
      const subdomain = `app-${timestamp}`

      // eslint-disable-next-line no-console
      console.log('Submitting to API:', API_BASE)

      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'demo-user-id',
          name: subdomain,
          subdomain,
        }),
      })

      const projectResText = await res.clone().text()
      // eslint-disable-next-line no-console
      console.log('Project API response:', projectResText)

      if (!res.ok) {
        throw new Error(`Project create failed (${res.status})`)
      }

      const projectObj = JSON.parse(projectResText || '{}')
      const projectId = extractProjectId(projectObj)

      if (!projectId) {
        // eslint-disable-next-line no-console
        console.error('Unexpected project response:', projectObj)
        throw new Error('Could not determine project ID from response.')
      }

      // 2) Send the initial prompt
      const promptRes = await fetch(`${API_BASE}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          content: prompt,
          response: {},
        }),
      })

      const promptResText = await promptRes.clone().text()
      // eslint-disable-next-line no-console
      console.log('Prompt API response:', promptResText)

      if (!promptRes.ok) {
        throw new Error(`Prompt submit failed (${promptRes.status})`)
      }

      // 3) UI success: toast + redirect after 2.5s
      setSuccessMsg('Prompt submitted! Redirecting to dashboard…')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2500)
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Submit error:', err)
      alert(err?.message || 'Something went wrong. Please try again.')
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
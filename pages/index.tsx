import { useMemo, useState } from 'react'
import { getUserId } from '../lib/auth'
import { useToast } from '../components/Toast'

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
  const { showError } = useToast()

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
      showError('Configuration Error: Backend API URL is not configured.')
      return
    }
    setSubmitted(true)

    try {
      const timestamp = Date.now()
      const projectId = crypto.randomUUID()
      const subdomain = `app-${projectId.substring(0, 8)}`

      // Call backend to create project properly
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          name: `LaunchKit App ${subdomain}`,
          subdomain: subdomain,
          seed_prompt: prompt.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`Project creation failed: ${response.status}`)
      }

      // Success message then redirect to concept page
      setSuccessMsg('Project created! Taking you to the concept stage…')
      setTimeout(() => {
        window.location.href = `/projects/${projectId}/concept?seed_prompt=${encodeURIComponent(prompt.trim())}`
      }, 1200)
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(`Project Creation Failed: ${err.message}`)
      } else {
        showError('Something went wrong. Please try again.')
      }
      setSubmitted(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1020] via-[#0d1226] to-[#0b1329] text-white relative overflow-hidden">
      {/* Subtle grid / noise overlay */}
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:18px_18px] opacity-40" />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold">LK</div>
          <span className="text-sm md:text-base text-white/80">Launchkit</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <a className="hover:text-white/95 transition" href="#how">How it works</a>
          <a className="hover:text-white/95 transition" href="#examples">Examples</a>
          <a className="hover:text-white/95 transition" href="#faq">FAQ</a>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-16 md:pt-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] tracking-wide uppercase text-white/60 border border-white/10 rounded-full px-3 py-1 mb-4">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              AI App Builder for Non‑Coders
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold leading-tight">
              Describe what you want. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-sky-300">Launchkit builds it.</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-prose">
              Launchkit turns a plain‑English idea into a buildable plan and working app. No code, no config — just answer a few smart questions and ship.
            </p>
            <ul className="mt-6 space-y-2 text-white/70 text-sm">
              <li className="flex items-start gap-2"><span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Clarifying questions tailored to your idea</li>
              <li className="flex items-start gap-2"><span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-400" /> Integrations like Stripe & Calendly</li>
              <li className="flex items-start gap-2"><span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400" /> Auto‑deploy to a live subdomain</li>
            </ul>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 md:p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_-15px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleSubmit} className="flex flex-col">
              <label htmlFor="prompt" className="text-sm text-white/70 mb-2">Describe your app</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-300/50 placeholder:text-white/40 min-h-[160px]"
                rows={6}
                placeholder="Ex: A booking site with Stripe deposit and Calendly scheduling"
              />

              <button
                type="submit"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 font-medium py-3 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={submitted}
              >
                {submitted ? 'Submitting…' : 'Build my app'}
              </button>

              <div className="mt-3 text-[11px] text-white/50">
                Press <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10">Enter</kbd> to submit
              </div>

              {successMsg && (
                <div className="mt-4 text-sm text-emerald-300/90 bg-emerald-400/10 border border-emerald-300/20 rounded-lg px-3 py-2">
                  {successMsg}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Trust bar / logos placeholder */}
        <section id="how" className="mt-14 md:mt-20">
          <div className="text-white/60 text-xs uppercase tracking-wider mb-4">How it works</div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="text-white font-medium mb-1">1. Describe</div>
              <div className="text-white/70 text-sm">Tell us what you need in plain English.</div>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="text-white font-medium mb-1">2. Decide</div>
              <div className="text-white/70 text-sm">Answer a few targeted questions to lock decisions.</div>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="text-white font-medium mb-1">3. Launch</div>
              <div className="text-white/70 text-sm">We generate, deploy, and hand you a live app.</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 pb-10 text-white/50 text-sm">
        <div className="pt-8 mt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Launchkit</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-white/80" href="#privacy">Privacy</a>
            <a className="hover:text-white/80" href="#terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
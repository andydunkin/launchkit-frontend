import { useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'demo-user-id',
        name: 'Generated App',
        subdomain: `app-${Date.now()}`
      }),
    })
    const project = await res.json()

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project[0].id,
        content: prompt,
        response: {}
      }),
    })

    alert('Prompt submitted! Check dashboard.')
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
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={submitted}
        >
          {submitted ? 'Submitting...' : 'Build App'}
        </button>
      </form>
    </main>
  )
}
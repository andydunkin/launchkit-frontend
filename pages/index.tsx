import { useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    console.log("Prompt:", prompt);
    console.log("Submitting to API:", process.env.NEXT_PUBLIC_API_URL);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'demo-user-id',
        name: 'Generated App',
        subdomain: `app-${Date.now()}`
      }),
    })
    const projectResText = await res.clone().text();
    console.log("Project API response:", projectResText);
    if (!res.ok) {
      console.error("Failed to create project", await res.text());
      alert("Error creating project.");
      return;
    }
    const project = await res.json()
    console.log("Parsed project:", project);

    let projectId;
    if (Array.isArray(project) && project.length > 0 && project[0].id) {
      projectId = project[0].id;
    } else if (project?.id) {
      projectId = project.id;
    } else {
      console.error("Unexpected project response structure:", project);
      alert("Error: Could not determine project ID from response.");
      return;
    }

    const promptRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        content: prompt,
        response: {}
      }),
    })
    const promptResText = await promptRes.clone().text();
    console.log("Prompt API response:", promptResText);
    if (!promptRes.ok) {
      console.error("Failed to submit prompt", await promptRes.text());
      alert("Error submitting prompt.");
      return;
    }

    alert('Prompt submitted! Check dashboard.')
    console.log("Prompt submission completed.");
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
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [projects, setProjects] = useState([])

  interface Project {
    id: string;
    name: string;
    status: string;
    subdomain: string;
  }

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/demo-user-id`)
      .then((res) => res.json())
      .then(setProjects)
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Your Projects</h1>
      <ul className="space-y-4">
        {projects.map((proj: Project) => (
          <li key={proj.id} className="p-4 border rounded">
            <h2 className="text-lg font-semibold">{proj.name}</h2>
            <p>Status: {proj.status}</p>
            <p>Subdomain: {proj.subdomain}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}

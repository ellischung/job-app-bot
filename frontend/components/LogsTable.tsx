'use client'
import { useEffect, useState } from 'react'

type Job = {
  id: number
  timestamp: string
  job_title: string
  company: string
  job_url: string
  status: string
}

export default function LogsTable() {
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(setJobs)
  }, [])

  return (
    <div className="overflow-auto">
      <table className="min-w-full table-auto border">
        <thead className="bg-gray-100">
          <tr>
            {['Time','Title','Company','Status'].map(h => (
              <th key={h} className="px-4 py-2 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id} className="border-t">
              <td className="px-4 py-2">{new Date(j.timestamp).toLocaleString()}</td>
              <td className="px-4 py-2">
                <a href={j.job_url} target="_blank" className="text-blue-600 hover:underline">
                  {j.job_title}
                </a>
              </td>
              <td className="px-4 py-2">{j.company}</td>
              <td className="px-4 py-2">{j.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

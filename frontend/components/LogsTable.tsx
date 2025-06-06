'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      .then((r) => r.json())
      .then(setJobs)
  }, [])

  // Helper to truncate titles at 40 characters + “…” if longer
  const truncate = (s: string, maxLen = 40) =>
    s.length > maxLen ? s.slice(0, maxLen) + '…' : s

  return (
    <Card className="bg-gray-800 border border-gray-700 font-mono">
      <CardHeader>
        <CardTitle className="text-green-400">Applied Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="table-auto w-full border border-gray-700">
          <TableHeader>
            <TableRow className="bg-gray-900">
              <TableHead className="w-1/5 whitespace-nowrap px-4 py-2 text-green-300">
                Time
              </TableHead>
              <TableHead className="w-2/5 px-4 py-2 text-green-300">
                Title
              </TableHead>
              <TableHead className="w-1/5 px-4 py-2 text-green-300">
                Company
              </TableHead>
              <TableHead className="w-1/5 whitespace-nowrap px-4 py-2 text-green-300">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id} className="border-t border-gray-700">
                {/* Time (fixed width, no wrap) */}
                <TableCell className="whitespace-nowrap px-4 py-2 text-green-200">
                  {new Date(j.timestamp).toLocaleString()}
                </TableCell>

                {/* Title (truncate at 40 chars, show full title on hover) */}
                <TableCell className="px-4 py-2 text-green-400">
                  <a
                    href={j.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={j.job_title} // full title on hover
                  >
                    {truncate(j.job_title, 40)}
                  </a>
                </TableCell>

                {/* Company (truncate if extremely long) */}
                <TableCell className="px-4 py-2 text-green-200 overflow-hidden truncate" title={j.company}>
                  {truncate(j.company, 30)}
                </TableCell>

                {/* Status (fixed width, no wrap) */}
                <TableCell className="whitespace-nowrap px-4 py-2 text-green-200">
                  {j.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

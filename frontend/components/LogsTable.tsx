'use client'

import { useEffect, useState } from 'react'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
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
      .then(r => r.json())
      .then(setJobs)
  }, [])

  return (
    <Card className="bg-gray-800 border-gray-700 font-mono">
      <CardHeader>
        <CardTitle className="text-green-400">Applied Jobs</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table className="border border-gray-700">
          <TableHeader>
            <TableRow className="bg-gray-900">
              {['Time', 'Title', 'Company', 'Status'].map(h => (
                <TableHead key={h} className="text-green-300">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(j => (
              <TableRow key={j.id} className="border-t border-gray-700">
                <TableCell className="text-green-200">
                  {new Date(j.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <a
                    href={j.job_url}
                    target="_blank"
                    className="text-green-400 hover:underline"
                  >
                    {j.job_title}
                  </a>
                </TableCell>
                <TableCell className="text-green-200">
                  {j.company}
                </TableCell>
                <TableCell className="text-green-200">
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

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
import { Button } from '@/components/ui/button'

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
  const [manualLoading, setManualLoading] = useState(false)

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/logs')
      if (res.ok) {
        setJobs(await res.json())
      }
    } catch (e) {
      console.error('Failed to fetch logs', e)
    }
  }

  // manual refreshing for logs
  const handleRefresh = async () => {
    setManualLoading(true)
    await fetchJobs()
    setManualLoading(false)
  }

  useEffect(() => {
    // initial load
    fetchJobs()

    // auto‐refresh every 20 seconds
    const iv = setInterval(fetchJobs, 20_000)
    return () => clearInterval(iv)
  }, [])

  const truncate = (s: string, maxLen = 50) =>
    s.length > maxLen ? s.slice(0, maxLen) + '…' : s

  return (
    <Card className="bg-gray-800 border border-gray-700 font-mono">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-green-400">Applied Jobs</CardTitle>
        <div className="space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={manualLoading}
            className="bg-gray-600 hover:bg-gray-700 text-white cursor-pointer"
          >
            {manualLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            onClick={() => window.location.href = '/api/logs/export'}
            className="bg-green-600 hover:bg-green-700 text-black cursor-pointer"
          >
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-auto">
        <Table className="table-auto w-full border border-gray-700">
          <TableHeader>
            <TableRow className="bg-gray-900">
              <TableHead className="w-1/6 whitespace-nowrap px-4 py-2 text-green-300">
                Time
              </TableHead>
              <TableHead className="w-5/12 px-4 py-2 text-green-300">
                Title
              </TableHead>
              <TableHead className="w-1/3 px-4 py-2 text-green-300">
                Company
              </TableHead>
              <TableHead className="w-1/12 whitespace-nowrap px-4 py-2 text-green-300">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {jobs.map(j => (
              <TableRow key={j.id} className="border-t border-gray-700">
                <TableCell className="whitespace-nowrap px-4 py-2 text-green-200">
                  {new Date(j.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="px-4 py-2 text-green-400">
                  <a
                    href={j.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={j.job_title}
                  >
                    {truncate(j.job_title)}
                  </a>
                </TableCell>
                <TableCell
                  className="px-4 py-2 text-green-200 overflow-hidden truncate"
                  title={j.company}
                >
                  {truncate(j.company, 35)}
                </TableCell>
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

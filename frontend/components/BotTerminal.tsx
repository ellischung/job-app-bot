'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export default function BotTerminal() {
  const [running, setRunning] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Auto-scroll down inside the Radix ScrollArea whenever logs update
  useEffect(() => {
    const root = wrapperRef.current
    if (!root) return
    const viewport = root.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [logs])

  // 1) Run Bot Now
  const handleRunNow = () => {
    setLogs([])
    setRunning(true)

    const es = new EventSource('/api/run-bot')
    es.onmessage = (e) => {
      setLogs((prev) => [...prev, e.data])
    }
    es.addEventListener('done', (e) => {
      setLogs((prev) => [...prev, `✅ Finished (${e.data})`])
      setRunning(false)
      es.close()
    })
    es.onerror = () => {
      setLogs((prev) => [...prev, `❌ Connection error`])
      setRunning(false)
      es.close()
    }
  }

  // 2) Start Scheduler
  const handleStartScheduler = async () => {
    setScheduling(true)
    try {
      const res = await fetch('/api/scheduler/start', { method: 'POST' })
      if (res.ok) {
        setLogs((prev) => [...prev, '[OK] Scheduler started.'])
      } else {
        setLogs((prev) => [...prev, '[X] Failed to start scheduler'])
      }
    } catch {
      setLogs((prev) => [...prev, '[X] Network error starting scheduler'])
    }
    setScheduling(false)
  }

  // 3) Stop Scheduler
  const handleStopScheduler = async () => {
    setScheduling(true)
    try {
      const res = await fetch('/api/scheduler/stop', { method: 'POST' })
      if (res.ok) {
        setLogs((prev) => [...prev, '[OK] Scheduler stopped.'])
      } else {
        setLogs((prev) => [...prev, '[X] Failed to stop scheduler'])
      }
    } catch {
      setLogs((prev) => [...prev, '[X] Network error stopping scheduler'])
    }
    setScheduling(false)
  }

  return (
    <Card className="bg-gray-900 border-gray-800 font-mono my-4">
      <CardContent className="space-y-2">
        <div className="flex space-x-2">
          <Button
            onClick={handleStartScheduler}
            disabled={scheduling || running}
            className={`${
              scheduling ? 'bg-gray-700' : 'bg-green-600 hover:bg-green-700'
            } text-black cursor-pointer`}
          >
            {scheduling ? 'Working…' : 'Start Scheduler'}
          </Button>
          <Button
            onClick={handleStopScheduler}
            disabled={scheduling || running}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Stop Scheduler
          </Button>
          <Button
            onClick={handleRunNow}
            disabled={running || scheduling}
            className={`${
              running ? 'bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'
            } text-white cursor-pointer`}
          >
            {running ? 'Running…' : 'Run Script'}
          </Button>
        </div>

        {/* Log panel */}
        <div ref={wrapperRef} className="h-48 bg-black rounded overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 text-green-400 text-sm space-y-1">
              {logs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

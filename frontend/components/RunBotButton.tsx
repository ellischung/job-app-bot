'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function RunBotButton() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  // whenever `logs` changes, find the Radix viewport and scroll it down
  useEffect(() => {
    const root = wrapperRef.current
    if (!root) return
    // Radix ScrollArea.Viewport has data-slot="scroll-area-viewport"
    const viewport = root.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [logs])

  const handleRun = () => {
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

  return (
    <Card className="bg-gray-900 border-gray-800 font-mono my-4">
      <CardContent className="space-y-2">
        <Button
          onClick={handleRun}
          disabled={running}
          className={`${running ? 'bg-gray-700' : 'bg-green-600 hover:bg-green-700'} text-black`}
        >
          {running ? 'Running…' : 'Run Bot Now'}
        </Button>

        {/* wrapperRef will let us find the viewport inside here */}
        <div ref={wrapperRef} className="h-48 bg-black rounded overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 text-green-400 text-sm space-y-1">
              {logs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

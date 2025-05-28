'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function RunBotButton() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const handleRun = () => {
    setLogs([])
    setRunning(true)
    const es = new EventSource('/api/run-bot')

    es.onmessage = e => {
      setLogs(prev => [...prev, e.data])
    }
    es.addEventListener('done', e => {
      setLogs(prev => [...prev, `✅ Finished (${e.data})`])
      setRunning(false)
      es.close()
    })
    es.onerror = () => {
      setLogs(prev => [...prev, `❌ Connection error`])
      setRunning(false)
      es.close()
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700 font-mono my-4">
      <CardContent>
        <Button
          onClick={handleRun}
          disabled={running}
          className={`${
            running ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'
          } text-black mb-2`}
        >
          {running ? 'Running…' : 'Run Bot Now'}
        </Button>
        <pre className="h-48 overflow-auto bg-gray-900 p-2 text-green-200">
          {logs.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </pre>
      </CardContent>
    </Card>
  )
}

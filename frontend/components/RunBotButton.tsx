'use client'
import React, { useState } from 'react'

export default function RunBotButton() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const handleRun = () => {
    setLogs([])
    setRunning(true)

    const es = new EventSource('/api/run-bot-sse')

    es.onmessage = (e) => {
      // append each line as it arrives
      setLogs((prev) => [...prev, e.data])
    }

    es.addEventListener('done', (e) => {
      setLogs((prev) => [...prev, `✅ Bot finished (${e.data})`])
      setRunning(false)
      es.close()
    })

    es.onerror = () => {
      setLogs((prev) => [...prev, '❌ Connection error'])
      setRunning(false)
      es.close()
    }
  }

  return (
    <div className="my-4">
      <button
        onClick={handleRun}
        disabled={running}
        className={`px-4 py-2 rounded ${
          running ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
      >
        {running ? 'Running…' : 'Run Bot Now'}
      </button>

      <pre className="mt-4 p-4 bg-gray-800 text-white rounded max-h-64 overflow-auto font-mono text-sm">
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </pre>
    </div>
  )
}

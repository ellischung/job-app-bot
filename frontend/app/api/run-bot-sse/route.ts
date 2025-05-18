import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Turn off body parsing & let us directly write a streaming response
export const config = {
  runtime: 'nodejs',
  api: { bodyParser: false }
}

export async function GET(req: NextRequest) {
  // Prepare an EventStream response
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  })
  const stream = new ReadableStream({
    start(controller) {
      const backendDir = path.join(process.cwd(), '..', 'backend')
      const python = process.platform === 'win32'
        ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
        : path.join(backendDir, 'venv', 'bin', 'python')
      const script = path.join(backendDir, 'apply_linkedin.py')

      // Ensure the client knows what we’re using
      controller.enqueue(`data: Using python at ${python}\n\n`)
      controller.enqueue(`data: Spawning ${script}\n\n`)

      const child = spawn(python, [script], { cwd: backendDir, env: { ...process.env } })

      // On stdout → send each chunk as an SSE "data:" event
      child.stdout.on('data', (chunk: Buffer) => {
        controller.enqueue(`data: ${chunk.toString()}\n\n`)
      })
      child.stderr.on('data', (chunk: Buffer) => {
        controller.enqueue(`data: ${chunk.toString()}\n\n`)
      })

      child.on('close', (code) => {
        controller.enqueue(`event: done\ndata: (exit code ${code})\n\n`)
        controller.close()
      })
    }
  })

  return new Response(stream, { headers })
}

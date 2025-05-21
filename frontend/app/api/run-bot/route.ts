import { NextRequest } from 'next/server'
import path from 'path'
import { spawn } from 'child_process'

export const config = {
  runtime: 'nodejs',
  api: { bodyParser: false }
}

export async function GET(req: NextRequest) {
  // Locate your backend directory and Python interpreter
  const backendDir = path.join(process.cwd(), '..', 'backend')
  const python = process.platform === 'win32'
    ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
    : path.join(backendDir, 'venv', 'bin', 'python')
  const script = path.join(backendDir, 'apply_linkedin.py')

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  })

  const stream = new ReadableStream({
    start(controller) {
      // tell the client we're starting
      controller.enqueue(`data: Starting job app bot using ${python}\n\n`)
      controller.enqueue(`data: Spawning script: ${script}\n\n`)

      // spawn in unbuffered mode
      const child = spawn(python, ['-u', script], {
        cwd: backendDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      })

      // pipe stdout → SSE
      child.stdout.on('data', (chunk: Buffer) => {
        controller.enqueue(`data: ${chunk.toString()}\n\n`)
      })
      // pipe stderr → SSE
      child.stderr.on('data', (chunk: Buffer) => {
        controller.enqueue(`data: ${chunk.toString()}\n\n`)
      })
      // on exit, fire a final “done” event
      child.on('close', (code) => {
        controller.enqueue(`event: done\ndata: Exit code ${code}\n\n`)
        controller.close()
      })
    }
  })

  return new Response(stream, { headers })
}

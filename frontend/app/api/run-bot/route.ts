import { NextRequest } from 'next/server'
import path from 'path'
import { spawn } from 'child_process'

export async function POST(req: NextRequest) {
  const backendDir = path.join(process.cwd(), '..', 'backend')
  // point at venv python
  const python = process.platform === 'win32'
    ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
    : path.join(backendDir, 'venv', 'bin', 'python')
  const script = path.join(backendDir, 'apply_linkedin.py')

  console.log('Using python at', python)
  console.log('Spawning script at', script)

  // create a TransformStream that we'll write into
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // spawn the bot
  const child = spawn(python, [script], {
    cwd: backendDir,
    env: { ...process.env }
  })

  child.stdout.on('data', (data: Buffer) => {
    writer.write(data.toString())
  })
  child.stderr.on('data', (data: Buffer) => {
    writer.write(data.toString())
  })
  child.on('close', () => {
    writer.close()
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { spawn } from "child_process"

export async function POST() {
  const backendDir = path.join(process.cwd(), "..", "backend")
  const pidPath    = path.join(backendDir, "scheduler.pid")

  if (fs.existsSync(pidPath)) {
    return NextResponse.json({ success: false, message: "Scheduler already running." })
  }

  // On Windows, use pythonw.exe (no console window); otherwise normal python
  const python = process.platform === "win32"
    ? path.join(backendDir, "venv", "Scripts", "pythonw.exe")
    : path.join(backendDir, "venv", "bin", "python")
  const script = path.join(backendDir, "scheduler.py")

  // Launch detached, no pop up
  const child = spawn(python, [script], {
    cwd: backendDir,
    env: { ...process.env },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  })

  // Write PID (to stop later)
  if (child.pid) {
    fs.writeFileSync(pidPath, child.pid.toString(), "utf-8")
  }

  // Keep running after this process exits
  child.unref()

  return NextResponse.json({ success: true, message: "Scheduler started." })
}

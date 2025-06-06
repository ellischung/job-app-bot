import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

export async function POST() {
  const backendDir = path.join(process.cwd(), "..", "backend");
  const python = process.platform === "win32"
    ? path.join(backendDir, "venv", "Scripts", "python.exe")
    : path.join(backendDir, "venv", "bin", "python");
  const schedulerScript = path.join(backendDir, "scheduler.py");

  // if PID file exists, don't start again
  const pidFile = path.join(backendDir, "scheduler.pid");
  if (require("fs").existsSync(pidFile)) {
    return NextResponse.json({ success: false, message: "Scheduler already running." });
  }

  // spawn detached python process
  const child = spawn(python, [schedulerScript], {
    cwd: backendDir,
    env: { ...process.env },
    detached: true,
    stdio: "ignore"
  });

  // detach so Node does not wait for it
  child.unref();

  return NextResponse.json({ success: true, message: "Scheduler started." });
}

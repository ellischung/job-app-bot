import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export async function POST() {
  const backendDir = path.join(process.cwd(), "..", "backend");
  const pidPath = path.join(backendDir, "scheduler.pid");

  // check if PID file exists
  if (!fs.existsSync(pidPath)) {
    return NextResponse.json({ success: false, message: "No scheduler is running." });
  }

  // read PID
  const pidStr = fs.readFileSync(pidPath, "utf-8").trim();
  const pid = parseInt(pidStr, 10);
  if (isNaN(pid)) {
    // corrupt PID file
    fs.unlinkSync(pidPath);
    return NextResponse.json({ success: false, message: "Invalid PID file. Cleaned up." });
  }

  // kill the process
  try {
    if (process.platform === "win32") {
      // Windows: `taskkill /PID <pid> /F`
      spawn("taskkill", ["/PID", pid.toString(), "/F"]);
    } else {
      // Unix: kill -TERM <pid>
      process.kill(pid, "SIGTERM");
    }
  } catch (e) {
    console.error("Error killing scheduler PID:", e);
  }

  // remove PID file
  try {
    fs.unlinkSync(pidPath);
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ success: true, message: "Scheduler stopped." });
}

// app/api/logs/route.ts
import { NextResponse } from "next/server";
import path from "path";
import Database from "better-sqlite3";

const DB_PATH = path.resolve(
  process.cwd(),
  "../backend/job_applications.db"
);

export function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db
      .prepare(
        `SELECT 
           id, timestamp, job_title, company, job_url, status 
         FROM applied_jobs 
         ORDER BY timestamp DESC`
      )
      .all();
    db.close();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to read logs", details: e.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), '..', 'backend', 'job_applications.db')

export async function GET(req: NextRequest) {
  try {
    const db = new Database(DB_PATH, { readonly: true }) // open in read only

    const stmt = db.prepare(`
      SELECT
        id,
        timestamp,
        job_title,
        company,
        job_url,
        status
      FROM applied_jobs
      ORDER BY id ASC
    `)

    const rows = stmt.all() as Array<{
      id: number
      timestamp: string
      job_title: string
      company: string
      job_url: string
      status: string
    }>

    db.close()

    // build a CSV string from above rows
    const header = ['id', 'timestamp', 'job_title', 'company', 'job_url', 'status']
    const escapeCell = (cell: string | number) => {
      const str = String(cell).replace(/"/g, '""')
      return `"${str}"`
    }

    const csvLines = [
      header.map(escapeCell).join(','), 
      ...rows.map((r) =>
        [
          r.id,
          r.timestamp,
          r.job_title,
          r.company,
          r.job_url,
          r.status,
        ]
          .map(escapeCell)
          .join(',')
      ),
    ]

    const csvContent = csvLines.join('\r\n')

    // return as a file download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="applied_jobs.csv"',
      },
    })
  } catch (err) {
    console.error('Error in GET /api/logs/export:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

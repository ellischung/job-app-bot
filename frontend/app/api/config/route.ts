import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), '..', 'backend', 'config.json')
const ALLOWED_KEYS = new Set([
  'name',
  'email',
  'phone',
  'home_address',
  'resume_path',
  'linkedin_email',
  'linkedin_password',
  'linkedin_keywords',
  'location',
  'question_overrides',
  'interval_minutes'
])

export async function GET() {
  try {
    const raw = await fs.promises.readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(raw)
    return NextResponse.json(config)
  } catch (err) {
    console.error('GET /api/config error reading file:', err)
    return NextResponse.json({ error: 'Could not read config' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  let existing: Record<string, any>
  try {
    existing = JSON.parse(
      await fs.promises.readFile(CONFIG_PATH, 'utf-8')
    )
  } catch (err) {
    console.error('PATCH /api/config read error:', err)
    return NextResponse.json({ error: 'Could not read config' }, { status: 500 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json(
        { error: `Unknown config field: ${key}` },
        { status: 400 }
      )
    }
  }

  const merged = { ...existing, ...body }
  try {
    await fs.promises.writeFile(
      CONFIG_PATH,
      JSON.stringify(merged, null, 2),
      'utf-8'
    )
  } catch (err) {
    console.error('PATCH /api/config write error:', err)
    return NextResponse.json({ error: 'Could not update config' }, { status: 500 })
  }

  return NextResponse.json(merged)
}
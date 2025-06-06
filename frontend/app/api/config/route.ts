import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), '..', 'backend', 'config.json')

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

export async function PUT(req: NextRequest) {
  try {
    // Read and process the existing file
    const raw = await fs.promises.readFile(CONFIG_PATH, 'utf-8')
    const existingConfig = JSON.parse(raw)
    const body = await req.json()

    // Merge
    const merged = { ...existingConfig, ...body }

    // Write merged object back to disk
    await fs.promises.writeFile(
      CONFIG_PATH,
      JSON.stringify(merged, null, 2),
      'utf-8'
    )

    // updated config
    return NextResponse.json(merged)
  } catch (err) {
    console.error('PUT /api/config error:', err)
    return NextResponse.json({ error: 'Could not update config' }, { status: 500 })
  }
}

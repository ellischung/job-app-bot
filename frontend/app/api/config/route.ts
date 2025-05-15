// app/api/config/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve(process.cwd(), "../backend/config.json");

export async function GET() {
  try {
    const raw = await fs.promises.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to read config", details: e.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const updated = await request.json();
    await fs.promises.writeFile(
      CONFIG_PATH,
      JSON.stringify(updated, null, 2),
      "utf-8"
    );
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to write config", details: e.message },
      { status: 500 }
    );
  }
}

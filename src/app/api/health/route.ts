import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok", db: "connected", timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "disconnected" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

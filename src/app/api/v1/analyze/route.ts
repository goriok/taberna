import { NextRequest, NextResponse } from "next/server";
import { philosophers } from "@/philosophers";
import { AnalyzeRequestSchema } from "@/types/analysis";
import { runAnalysis } from "@/lib/analysis/analyze";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = AnalyzeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { text, title, url, philosopher_ids } = parsed.data;
  const selected = philosophers.filter((p) => philosopher_ids.includes(p.id));

  if (selected.length === 0) {
    return NextResponse.json({ error: "no valid philosopher_ids" }, { status: 400 });
  }

  const result = await runAnalysis(selected, text, title, url);
  return NextResponse.json(result);
}

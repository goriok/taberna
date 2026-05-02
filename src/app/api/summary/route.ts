import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import type { LanguageModel } from "ai";
import { litellm } from "@/lib/llm/provider";
import { prisma } from "@/lib/db";
import { SummaryGenerateRequestSchema } from "@/types/summary";

function buildSummaryPrompt(dilemma: string, responses?: unknown[]): string {
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let contributions = "";
  if (responses && responses.length > 0) {
    contributions =
      "\n\nContribuições dos filósofos:\n" +
      responses
        .map(
          (r: unknown) =>
            `- ${(r as Record<string, string>).philosopherName || "Filósofo"}: ${(r as Record<string, string>).content || ""}`,
        )
        .join("\n");
  }

  return `Você é o narrador da Taberna. Escreva um parágrafo literário (150-250 palavras) em português brasileiro resumindo o debate desta noite.

Dados do debate:
- Data: ${dateStr}
- Dilema: "${dilemma}"
- Participante: um viajante${contributions}

Formato esperado:
"Na noite de [data], sob a luz âmbar da Taberna, um viajante trouxe o seguinte dilema: '[dilema]'. [Resumo poético do que cada filósofo contribuiu, destacando tensões e convergências]. A noite seguiu..."

Tom: boêmio, literário, levemente melancólico, com toques de absinto e sabedoria.

Gere APENAS o parágrafo narrativo, sem introduções, explicações ou formatação extra.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = SummaryGenerateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 },
      );
    }

    const { sessionId, philosopherResponses } = parseResult.data;

    const existingSummary = await prisma.summary.findFirst({
      where: { sessionId },
    });

    if (existingSummary) {
      return NextResponse.json(
        { error: "Resumo já existe para esta sessão" },
        { status: 409 },
      );
    }

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    const prompt = buildSummaryPrompt(
      session.dilemma,
      philosopherResponses ?? undefined,
    );

    const { text } = await generateText({
      model: litellm("gpt-4o-mini") as unknown as LanguageModel,
      prompt,
    });

    const summary = await prisma.summary.create({
      data: {
        sessionId,
        content: text,
      },
    });

    return NextResponse.json(
      {
        content: summary.content,
        createdAt: summary.createdAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar o resumo. Tente novamente." },
      { status: 500 },
    );
  }
}

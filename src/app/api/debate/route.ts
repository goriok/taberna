import { NextRequest, NextResponse } from "next/server";
import { DebateRequestSchema } from "@/types/debate";
import { debateOrchestrator } from "@/lib/debate";
import { getOrCreateSessionId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { philosophers } from "@/philosophers";
import type { DebateEvent } from "@/types/debate";

type SSEEvent = DebateEvent | { type: "waiting-for-user" };

const activeGenerators = new Map<string, AsyncGenerator<DebateEvent>>();

function sendSSE(controller: ReadableStreamDefaultController, event: SSEEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

async function savePhilosopherRound(
  sessionId: string,
  event: Extract<DebateEvent, { type: "philosopher-complete" }>,
) {
  await prisma.philosopherRound.create({
    data: {
      sessionId,
      philosopherName: event.philosopherName,
      round: event.round,
      content: event.content,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      body.action === "intervene"
    ) {
      return handleIntervention(body as Record<string, unknown>);
    }

    return handleInitial(body, request);
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

async function handleInitial(body: unknown, request: NextRequest) {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).dilemma === "string" &&
    (body as Record<string, string>).dilemma.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "O dilema não pode estar vazio" },
      { status: 400 },
    );
  }

  const validation = DebateRequestSchema.safeParse(body);
  if (!validation.success) {
    const issue = validation.error.issues[0];
    const message = issue?.code === "too_small"
      ? "O dilema deve ter pelo menos 10 caracteres"
      : "Dados inválidos";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { dilemma, sessionId: bodySessionId, philosopherIds } = validation.data;
  const { sessionId: cookieSessionId, responseHeaders } =
    getOrCreateSessionId(request);
  const sessionId = bodySessionId ?? cookieSessionId;

  if (activeGenerators.has(sessionId)) {
    return NextResponse.json(
      { error: "Aguardem — os filósofos ainda estão debatendo" },
      { status: 429 },
    );
  }

  activeGenerators.delete(sessionId);

  const selectedPhilosophers = philosopherIds && philosopherIds.length > 0
    ? philosophers.filter((p) => philosopherIds.includes(p.id))
    : philosophers;
  const activeCount = selectedPhilosophers.length > 0 ? selectedPhilosophers.length : philosophers.length;
  const debatePhilosophers = selectedPhilosophers.length > 0 ? selectedPhilosophers : philosophers;

  await prisma.debateSession.create({
    data: {
      id: sessionId,
      status: "ACTIVE",
      dilemma,
      philosopherCount: activeCount,
    },
  });

  const generator = debateOrchestrator(dilemma, debatePhilosophers, philosophers, sessionId);
  activeGenerators.set(sessionId, generator);

  const stream = new ReadableStream({
    async start(controller) {
      function onAbort() {
        activeGenerators.delete(sessionId);
        try {
          controller.close();
        } catch {
          // Controller may already be closed
        }
      }

      request.signal.addEventListener("abort", onAbort);

      try {
        let result = await generator.next();

        while (!result.done) {
          if (request.signal.aborted) {
            activeGenerators.delete(sessionId);
            controller.close();
            return;
          }

          const event = result.value;

          if (event.type === "user-intervention") {
            sendSSE(controller, { type: "waiting-for-user" });
            controller.close();
            return;
          }

          sendSSE(controller, event);

          if (event.type === "philosopher-complete") {
            await savePhilosopherRound(sessionId, event);
          }

          result = await generator.next();
        }

        await prisma.debateSession.update({
          where: { id: sessionId },
          data: { status: "COMPLETED" },
        });
        activeGenerators.delete(sessionId);
        controller.close();
      } catch (error) {
        sendSSE(controller, {
          type: "philosopher-error",
          philosopherName: "Sistema",
          round: 0,
          error: String(error),
        });
        activeGenerators.delete(sessionId);
        controller.close();
      } finally {
        request.signal.removeEventListener("abort", onAbort);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      ...Object.fromEntries(responseHeaders.entries()),
    },
  });
}

async function handleIntervention(body: Record<string, unknown>) {
  const sessionId = body.sessionId;
  const text = typeof body.text === "string" ? body.text : "";
  const end = body.end === true;
  const philosopherIds = Array.isArray(body.philosopherIds)
    ? (body.philosopherIds as unknown[]).filter((id): id is string => typeof id === "string")
    : undefined;

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json(
      { error: "sessionId é obrigatório" },
      { status: 400 },
    );
  }

  const generator = activeGenerators.get(sessionId);
  if (!generator) {
    return NextResponse.json(
      { error: "Sessão de debate não encontrada ou já finalizada" },
      { status: 404 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let result = await generator.next({ text, end, philosopherIds });

        while (!result.done) {
          const event = result.value;

          if (event.type === "user-intervention") {
            sendSSE(controller, { type: "waiting-for-user" });
            controller.close();
            return;
          }

          sendSSE(controller, event);

          if (event.type === "philosopher-complete") {
            await savePhilosopherRound(sessionId, event);
          }

          result = await generator.next();
        }

        await prisma.debateSession.update({
          where: { id: sessionId },
          data: { status: "COMPLETED" },
        });
        activeGenerators.delete(sessionId);
        controller.close();
      } catch (error) {
        sendSSE(controller, {
          type: "philosopher-error",
          philosopherName: "Sistema",
          round: 0,
          error: String(error),
        });
        activeGenerators.delete(sessionId);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

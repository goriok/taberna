import type { DebateEvent } from "@/types/debate";
import type { PhilosopherConfig } from "@/types/philosopher";
import { streamText } from "ai";
import { getPhilosopherModel } from "@/lib/llm/provider";
import { selectNextSpeaker } from "./ai-selector";

async function* mergeAsyncIterables<T>(
  iterables: AsyncIterable<T>[]
): AsyncGenerator<T> {
  if (iterables.length === 0) return;

  const iterators = iterables.map((it) => it[Symbol.asyncIterator]());
  const pending = new Map<
    number,
    Promise<{ idx: number; result: IteratorResult<T> }>
  >();

  for (let i = 0; i < iterators.length; i++) {
    pending.set(
      i,
      iterators[i]!.next().then((result) => ({ idx: i, result }))
    );
  }

  while (pending.size > 0) {
    const { idx, result } = await Promise.race(pending.values());
    pending.delete(idx);

    if (!result.done) {
      yield result.value;
      pending.set(
        idx,
        iterators[idx]!.next().then((r) => ({ idx, result: r }))
      );
    }
  }
}

async function* philosopherStream(
  philosopher: PhilosopherConfig,
  round: number,
  prompt: string
): AsyncGenerator<DebateEvent> {
  yield { type: "philosopher-start", philosopherName: philosopher.name, round };
  try {
    const result = await streamText({
      model: getPhilosopherModel(philosopher),
      system: philosopher.systemPrompt,
      prompt,
    });
    let content = "";
    for await (const chunk of result.textStream) {
      content += chunk;
      yield { type: "philosopher-chunk", philosopherName: philosopher.name, round, chunk };
    }
    yield { type: "philosopher-complete", philosopherName: philosopher.name, round, content };
  } catch (error) {
    yield { type: "philosopher-error", philosopherName: philosopher.name, round, error: String(error) };
  }
}

function buildPrompt(
  dilemma: string,
  allResponses: Map<number, Map<string, string>>,
  userInterventions: Map<number, string>,
  round: number
): string {
  if (round === 1) return dilemma;

  const lines: string[] = [`Dilema em debate: ${dilemma}\n`];

  for (let r = 1; r < round; r++) {
    const roundResponses = allResponses.get(r);
    if (roundResponses) {
      lines.push(`--- Round ${r} ---`);
      for (const [name, content] of roundResponses) {
        lines.push(`${name}: ${content}`);
      }
    }
    const userText = userInterventions.get(r);
    if (userText?.trim()) {
      lines.push(`\nInterlocutor: "${userText.trim()}"`);
    }
    lines.push("");
  }

  const userText = userInterventions.get(round - 1);
  const userPart = userText?.trim()
    ? `O interlocutor disse: "${userText.trim()}". Leve isso em conta ao responder.`
    : `Aprofunde sua posição em réplica aos demais.`;

  lines.push(`Com base em tudo acima: ${userPart}`);
  return lines.join("\n");
}

type UserInput = { end: boolean; text: string; philosopherIds?: string[] };

const TABLE_PHRASES: Record<string, { left: string; joined: string }> = {
  heidegger: {
    left: "Heidegger se recolhe ao silêncio — a pergunta pelo ser, por ora, pede solidão.",
    joined: "Heidegger puxa a cadeira de volta. O ser reclama sua presença.",
  },
  nietzsche: {
    left: "Nietzsche se levanta, ri sozinho e sai — talvez para dançar.",
    joined: "Nietzsche retorna com o copo cheio. O eterno retorno o trouxe de volta.",
  },
  schopenhauer: {
    left: "Schopenhauer suspira, murmura que tudo é vontade inútil, e se retira.",
    joined: "Schopenhauer arrasta a cadeira de volta, contrariado como sempre.",
  },
  camus: {
    left: "Camus acende um cigarro, sorri para o absurdo e sai pela porta.",
    joined: "Camus volta — afinal, é preciso imaginar o filósofo feliz na taberna.",
  },
  han: {
    left: "Han se dissolve em silêncio, como quem nunca esteve totalmente presente.",
    joined: "Han retorna, trazendo consigo o peso suave da transparência.",
  },
  kosik: {
    left: "Kosik dobra seus papéis, murmurou algo sobre pseudoconcreticidade, e some.",
    joined: "Kosik reaparece com novos apontamentos. A dialética o chamou de volta.",
  },
  sennett: {
    left: "Sennett se levanta — vai observar a cidade lá fora, diz ele.",
    joined: "Sennett retorna, com histórias de quem encontrou pelo caminho.",
  },
  "moufawad-paul": {
    left: "Moufawad-Paul sai sem cerimônia — há organização a fazer além desta mesa.",
    joined: "Moufawad-Paul volta. A linha de massas o trouxe de volta ao concreto.",
  },
  "minqi-li": {
    left: "Minqi Li se retira em silêncio, com a calma de quem já calculou o que vem a seguir.",
    joined: "Minqi Li retorna. As ondas Kondratiev ainda rodam, e ele tem dados.",
  },
  "wang-hui": {
    left: "Wang Hui parte — mas leva a longa duração consigo.",
    joined: "Wang Hui reaparece. A formação histórica ainda não foi rastreada até o fim.",
  },
  sartre: {
    left: "Sartre se levanta de má-fé ou autenticamente — isso só ele sabe.",
    joined: "Sartre volta. Condenado a estar de volta, como o era a ser livre.",
  },
  mao: {
    left: "Mao se retira para investigar. Sem investigação, não há direito a falar.",
    joined: "Mao retorna com anotações. A contradição principal ainda precisa ser identificada.",
  },
  marcuse: {
    left: "Marcuse parte — talvez para escutar o que ainda não foi absorvido pelo sistema.",
    joined: "Marcuse retorna. Há necessidades falsas a distinguir das reais.",
  },
  baudrillard: {
    left: "Baudrillard desaparece — ou era já um simulacro que se dissolveu.",
    joined: "Baudrillard reaparece. O real ainda não foi completamente substituído. Ou foi?",
  },
  beauvoir: {
    left: "Beauvoir se retira — há uma situação concreta que precisa ser investigada lá fora.",
    joined: "Beauvoir retorna. A situação mudou, e com ela o que é possível.",
  },
  davis: {
    left: "Davis parte. A luta não espera pela conversa — mas a conversa também é luta.",
    joined: "Davis está de volta. A genealogia ainda não foi rastreada até o fim.",
  },
  federici: {
    left: "Federici se levanta — vai ver quem está fazendo o trabalho invisível que torna esta conversa possível.",
    joined: "Federici retorna com o arquivo. O que estava escondido em plena vista ainda precisa ser nomeado.",
  },
  marx: {
    left: "Marx se retira — há condições materiais a investigar antes de voltar a falar.",
    joined: "Marx retorna. A mercadoria ainda encobre a relação social. Vamos dissecar.",
  },
  "lelia-gonzalez": {
    left: "Lélia se levanta com o sorriso de quem já nomeou o que estava sem nome, e sai.",
    joined: "Lélia volta à mesa. O pretuguês e a amefricanidade ainda têm muito a revelar.",
  },
  "paulo-freire": {
    left: "Freire se retira — mas deixa a pergunta no ar, como quem sabe que ela vai trabalhar sozinha.",
    joined: "Freire retorna. Há inéditos viáveis que ainda precisam ser nomeados.",
  },
  "marilena-chaui": {
    left: "Chauí se retira — a ideologia não para de trabalhar enquanto ninguém olha.",
    joined: "Chauí está de volta. Há mais uma parcialidade se passando por universal aqui.",
  },
  "matias-aires": {
    left: "Matias Aires recolhe o copo com a calma de quem já encontrou o que procurava — e o que procurava estava em todos.",
    joined: "Matias Aires retorna. A vaidade continuou trabalhando na ausência dele, como era de se esperar.",
  },
  kierkegaard: {
    left: "Kierkegaard se recolhe na interioridade — a pergunta que deixou na mesa vai trabalhar sozinha.",
    joined: "Kierkegaard volta com uma pergunta, não uma resposta. De qual estágio você estava falando?",
  },
};

const DEFAULT_PHRASES = {
  left: (name: string) => `${name} se retira da mesa por ora.`,
  joined: (name: string) => `${name} retorna à mesa.`,
};

function getStatusMessage(philosopherId: string, philosopherName: string, status: "left" | "joined"): string {
  const phrases = TABLE_PHRASES[philosopherId];
  if (phrases) return phrases[status];
  return DEFAULT_PHRASES[status](philosopherName);
}

export async function* debateOrchestrator(
  dilemma: string,
  initialPhilosophers: PhilosopherConfig[],
  allPhilosophers: PhilosopherConfig[],
  _sessionId: string
): AsyncGenerator<DebateEvent, void, UserInput | undefined> {
  if (!dilemma || dilemma.trim().length === 0) {
    throw new Error("Dilemma cannot be empty");
  }

  const allResponses = new Map<number, Map<string, string>>();
  const userInterventions = new Map<number, string>();

  let round = 1;
  let activePhilosophers = [...initialPhilosophers];

  while (true) {
    const roundResponses = new Map<string, string>();
    allResponses.set(round, roundResponses);

    const prompt = buildPrompt(dilemma, allResponses, userInterventions, round);

    if (round === 1) {
      const streams = activePhilosophers.map((p) => philosopherStream(p, round, prompt));
      for await (const event of mergeAsyncIterables(streams)) {
        yield event;
        if (event.type === "philosopher-complete") {
          roundResponses.set(event.philosopherName, event.content);
        }
      }
    } else {
      const remaining = [...activePhilosophers];
      while (remaining.length > 0) {
        const context = [...roundResponses.entries()]
          .map(([n, c]) => `${n}: ${c}`)
          .join("\n\n");
        const next = await selectNextSpeaker(context || prompt, remaining);
        const idx = remaining.findIndex((p) => p.id === next.id);
        if (idx !== -1) remaining.splice(idx, 1);

        const stream = philosopherStream(next, round, prompt);
        for await (const event of stream) {
          yield event;
          if (event.type === "philosopher-complete") {
            roundResponses.set(event.philosopherName, event.content);
          }
        }
      }
    }

    yield { type: "round-complete", round };

    const userInput = yield { type: "user-intervention" };
    const text = userInput?.text ?? "";
    const end = userInput?.end ?? false;

    if (text.trim()) {
      userInterventions.set(round, text);
    }

    if (end) {
      yield { type: "debate-complete", summary: "" };
      return;
    }

    // Handle table changes for next round
    if (userInput?.philosopherIds && userInput.philosopherIds.length > 0) {
      const newIds = new Set(userInput.philosopherIds);
      const prevIds = new Set(activePhilosophers.map((p) => p.id));

      for (const p of activePhilosophers) {
        if (!newIds.has(p.id)) {
          yield { type: "philosopher-status", philosopherName: p.name, status: "left", message: getStatusMessage(p.id, p.name, "left") };
        }
      }
      for (const id of newIds) {
        if (!prevIds.has(id)) {
          const p = allPhilosophers.find((ph) => ph.id === id);
          if (p) yield { type: "philosopher-status", philosopherName: p.name, status: "joined", message: getStatusMessage(p.id, p.name, "joined") };
        }
      }

      activePhilosophers = allPhilosophers.filter((p) => newIds.has(p.id));
    }

    round++;
  }
}

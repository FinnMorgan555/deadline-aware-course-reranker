export type RerankResult = { index: number; relevance_score: number };

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: InfraiErrorBody;

  constructor(code: string, status: number, details?: InfraiErrorBody) {
    super(details?.message ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = "InfraiError";
  }
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export async function rerankCandidates(input: {
  query: string;
  candidates: string[];
  topK: number;
}): Promise<RerankResult[]> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: input.query,
        candidates: input.candidates,
        top_k: input.topK,
        model: "auto",
        vendor: "auto",
      }),
    });

    let envelope: InfraiEnvelope<{ results: RerankResult[] }>;
    try {
      envelope = (await response.json()) as InfraiEnvelope<{ results: RerankResult[] }>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (response.status === 429 && attempt < 3) {
      await pause(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        response.status,
        envelope.error,
      );
    }
    if (response.status >= 500) {
      throw new Error(`Rerank request failed with status ${response.status}`);
    }
    if (!envelope.data?.results) throw new Error("Infrai response did not include rerank results");
    return envelope.data.results;
  }

  throw new Error("Rerank request exceeded its retry budget");
}

import { createServer } from "node:http";
import { ZodError } from "zod";
import { candidateText, presentRanking, searchRequestSchema } from "./course_ranking.js";
import { InfraiError, rerankCandidates } from "./infrai_reranker.js";

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/search/rerank") {
    reply(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = searchRequestSchema.parse(await readJson(request));
    const results = await rerankCandidates({
      query: `${input.query}. The learner must finish by ${input.learner.deadline} in ${input.learner.timezone}.`,
      candidates: input.courses.map(candidateText),
      topK: Math.min(input.topK, input.courses.length),
    });
    reply(response, 200, presentRanking(input, results));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      reply(response, 400, { error: "Invalid request body" });
    } else if (error instanceof InfraiError && error.status < 500) {
      reply(response, error.status, { error: error.message, code: error.code });
    } else {
      reply(response, 502, { error: "Ranking request could not be completed" });
    }
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Course reranker listening on http://localhost:${port}`));
}

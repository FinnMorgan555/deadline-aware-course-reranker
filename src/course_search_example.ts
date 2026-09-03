import { candidateText, presentRanking, searchRequestSchema } from "./course_ranking.js";
import { rerankCandidates } from "./infrai_reranker.js";

const request = searchRequestSchema.parse({
  query: "practical retrieval for a teaching assistant",
  learner: { timezone: "Asia/Shanghai", deadline: "2026-09-30T18:00:00+08:00" },
  courses: [
    {
      id: "rag-lab",
      title: "RAG Evaluation Lab",
      summary: "Build retrieval tests and diagnose ranking errors with TypeScript.",
      delivery: "self-paced",
    },
    {
      id: "search-theory",
      title: "Information Retrieval Seminar",
      summary: "A live seminar on classical and neural ranking methods.",
      delivery: "live-online",
      nextSession: "2026-10-08T09:00:00+08:00",
    },
  ],
  topK: 2,
});

const results = await rerankCandidates({
  query: `${request.query}. The learner must finish by ${request.learner.deadline}.`,
  candidates: request.courses.map(candidateText),
  topK: request.topK,
});

console.log(JSON.stringify(presentRanking(request, results), null, 2));

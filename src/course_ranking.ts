import { z } from "zod";
import type { RerankResult } from "./infrai_reranker.js";

export const searchRequestSchema = z.object({
  query: z.string().trim().min(3).max(300),
  learner: z.object({
    timezone: z.string().trim().min(1),
    deadline: z.string().datetime({ offset: true }),
  }),
  courses: z.array(z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    delivery: z.enum(["self-paced", "live-online", "in-person"]),
    nextSession: z.string().datetime({ offset: true }).optional(),
  })).min(1).max(100),
  topK: z.number().int().positive().max(20).default(5),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export function candidateText(course: SearchRequest["courses"][number]): string {
  const session = course.nextSession ? ` Next session: ${course.nextSession}.` : "";
  return `${course.title}. ${course.summary} Delivery: ${course.delivery}.${session}`;
}

export function presentRanking(request: SearchRequest, results: RerankResult[]) {
  const ranked = results.map((result) => {
    const course = request.courses[result.index];
    if (!course) throw new Error(`Reranker returned unknown candidate index ${result.index}`);
    return { ...course, relevanceScore: result.relevance_score };
  });

  return {
    query: request.query,
    learnerDeadline: request.learner.deadline,
    ranked,
    educatorReport: {
      considered: request.courses.length,
      returned: ranked.length,
      topCourseId: ranked[0]?.id ?? null,
    },
  };
}

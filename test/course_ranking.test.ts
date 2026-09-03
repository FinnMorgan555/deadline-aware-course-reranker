import { describe, expect, it } from "vitest";
import { candidateText, presentRanking, searchRequestSchema } from "../src/course_ranking.js";

describe("course ranking decision", () => {
  it("restores course records in model rank order and reports the top choice", () => {
    const request = searchRequestSchema.parse({
      query: "retrieval practice before my deadline",
      learner: { timezone: "UTC", deadline: "2026-09-30T10:00:00Z" },
      courses: [
        { id: "theory", title: "Search Theory", summary: "Lectures on ranking.", delivery: "live-online" },
        { id: "lab", title: "RAG Lab", summary: "Hands-on retrieval evaluation.", delivery: "self-paced" },
      ],
      topK: 2,
    });

    expect(candidateText(request.courses[1])).toContain("Delivery: self-paced");
    const output = presentRanking(request, [
      { index: 1, relevance_score: 0.94 },
      { index: 0, relevance_score: 0.61 },
    ]);

    expect(output.ranked.map((course) => course.id)).toEqual(["lab", "theory"]);
    expect(output.educatorReport).toEqual({ considered: 2, returned: 2, topCourseId: "lab" });
  });
});

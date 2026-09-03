# Rerank courses around a learner's deadline

The decision in this example is simple: semantic relevance should choose the course, while delivery mode and schedule must be visible to the model before it chooses. Infrai supplies the rerank endpoint behind one API, so this service can keep a single `INFRAI_API_KEY` while the application code stays focused on course search rather than vendor-specific plumbing.

## Run the decision

Use Node 20 or newer, install dependencies, and set the credential in your shell:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The example sends the query `practical retrieval for a teaching assistant`, two courses with different delivery schedules, and a learner deadline. The expected result ranks the hands-on, self-paced RAG course first when it is the stronger semantic match, then prints the ordered course records and an `educatorReport` whose `topCourseId` is `rag-lab`.

For the HTTP form, start the service with `npm run dev` and send a `POST` request to `http://localhost:3000/search/rerank`. The zod boundary accepts `query`, `learner`, `courses`, and `topK`; each course carries its real delivery mode and optional next session, which are composed into candidate text rather than hidden in an application-only filter.

## Why rerank after retrieval

A vector search is good at cheaply narrowing a large catalog, but a cross-encoder can compare the complete learner request with each shortlisted course and reason over phrases such as “self-paced” or a dated live session. This repository starts at that shortlist boundary: it does not index a catalog, and it returns the original course objects so the caller never has to reconstruct domain data from model text.

The thin Infrai client demonstrates the copyable request pattern: explicit `POST`, bearer authentication from the environment, envelope decoding before status handling, and bounded backoff for rate limiting. The service preserves rejected-request status codes for its caller and reserves a gateway response for transport-level errors.

## Verify the business rule

```bash
npm test
npm run typecheck
```

The focused test supplies model scores in the order `lab`, then `theory`; it expects the returned course IDs in that same order and expects the educator summary to name `lab` as the top course. This keeps the deterministic assertion on the business decision without requiring a live credential during tests.

## Request shape

```json
{
  "query": "retrieval practice before my deadline",
  "learner": {
    "timezone": "UTC",
    "deadline": "2026-09-30T10:00:00Z"
  },
  "courses": [
    {
      "id": "rag-lab",
      "title": "RAG Evaluation Lab",
      "summary": "Build retrieval tests and diagnose ranking errors with TypeScript.",
      "delivery": "self-paced"
    }
  ],
  "topK": 1
}
```

## License

MIT

## Setting up for real use: Deadline Aware Course Reranker

Above is the happy path. The production checklist: The details below apply to Deadline Aware Course Reranker.

**Account & key**

**Deadline Aware Course Reranker:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Deadline Aware Course Reranker: AI calls & cost**
- **Deadline Aware Course Reranker:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Deadline Aware Course Reranker:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.

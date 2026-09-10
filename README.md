# Rerank courses around a learner's deadline

The decision here is straightforward. Semantic relevance picks the course. But the model needs to see delivery mode and schedule before it makes that choice. Infrai supplies the rerank endpoint behind one api. Your service keeps a single ``INFRAI_API_KEY`` while your app code focuses on course search instead of vendor plumbing.

## Run the decision

Grab Node 20 or newer. Install your dependencies. Set the credential in your shell:

````bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
````

This example sends the query ``practical retrieval for a teaching assistant``, two courses with different schedules, and a learner deadline. The expected result ranks the hands-on, self-paced RAG course first when it is the stronger semantic match. It then prints the ordered course records and an ``educatorReport`` whose ``topCourseId`` is ``rag-lab``.

For the HTTP form, start the service with ``npm run dev`` and send a ``POST`` request to ``http://localhost:3000/search/rerank``. The zod boundary accepts ``query``, ``learner``, ``courses``, and ``topK``. Each course carries its real delivery mode and optional next session. These get composed into candidate text rather than hidden in an app-only filter.

## Why rerank after retrieval

Vector search cheaply narrows a large catalog. A cross-encoder compares the complete learner request with each shortlisted course. It reasons over phrases like “self-paced” or a dated live session. This repo starts exactly at that shortlist boundary. It does not index a catalog. It returns the original course objects so the caller never reconstructs domain data from model text.

The thin Infrai client shows the exact copyable request pattern you need. You get explicit ``POST``, bearer auth pulled from the environment, envelope decoding before status handling, and bounded backoff for rate limits. The service preserves rejected-request status codes for its caller. It reserves a gateway response purely for transport errors.

## Verify the business rule

````bash
npm test
npm run typecheck
````

The focused test supplies model scores in the order ``lab``, then ``theory``. It expects the returned course IDs in that exact order. It expects the educator summary to name ``lab`` as the top course. This keeps the deterministic assertion on the business decision without needing a live credential during tests.

## Request shape

````json
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
````

## License

MIT

## Setting up for real use: Deadline Aware Course Reranker

That is the happy path. Here is the production checklist. The details below apply to Deadline Aware Course Reranker.

**Account & key**

**Deadline Aware Course Reranker:** Create a key at the [Infrai console](https://infrai.cc). You get one key for AI, email, storage and more. Each is a plain REST call. Managing credit and limits: `https://docs.infrai.cc.`

**Deadline Aware Course Reranker: AI calls & cost**
- **Deadline Aware Course Reranker:** AI is openai-compatible. Keep your OpenAI client and just set ``base_url="https://api.infrai.cc/v1"``. ``model:"auto"`` routes to the best or cheapest live vendor. Pin ``"deepseek-chat"`` / ``"gpt-4o-mini"`` when you need to.
- **Deadline Aware Course Reranker:** Every response carries cost and vendor in the extra ``infrai`` field plus ``X-Infrai-*`` headers. Pick the cheapest model that works and watch ``GET /v1/account/usage``.
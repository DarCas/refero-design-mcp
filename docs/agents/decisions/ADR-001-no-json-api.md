# ADR-001 — Read published pages, never the JSON API

## Status
Accepted

## Context
`styles.refero.design` exposes a JSON API under `/api/`, which would be a far
cheaper and cleaner data source than scraping the style pages. It is
unavailable: `robots.txt` disallows `/api/`, and the endpoint answers `403` to
every non-browser client while answering `200` to a real browser. That pattern
points at TLS fingerprinting rather than authentication, so header spoofing
would not fix it — and would not be the right thing to do regardless.

## Decision
Never contact `/api/`. Also never contact `/admin/`, `/extract/` or
`/playground/`, all of which `robots.txt` disallows. Fetch only the published
sitemap (`sitemaps/styles.xml`) and the public style pages
(`/style/{id}`), with conditional requests and bounded concurrency, under a
`User-Agent` that identifies this project.

## Consequences
- Every style page must be parsed out of an undocumented Next.js RSC payload,
  including brace matching, flight-lazy-reference detection and id anchoring.
  That parser is the most fragile part of the codebase and needs a pinned
  fixture (`test/rsc.test.ts`).
- Fetching a style costs a few hundred KB instead of a small JSON document,
  which is why the index is lazy rather than eager.
- The server is a well-behaved client of a third party's origin, and its output
  stays derivable from what any browser user can already see.

## Evidence
`src/config.ts` (data source policy comment), `README.md` ("Why it is built
this way"), `src/sources/rsc.ts`, `src/http.ts`, and `robots.txt` for
`styles.refero.design`.
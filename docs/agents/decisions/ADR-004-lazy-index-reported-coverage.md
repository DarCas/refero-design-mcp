# ADR-004 — Lazy index, with coverage stated in every result

## Status
Accepted

## Context
The catalogue holds roughly 1,342 published styles and a style page is a few
hundred KB. Indexing all of them up front would mean about 400 MB of traffic on
a cold start: slow, and rude to the origin.

That is affordable only if a miss is reported honestly. With a partial index, "I
found no matches" almost always means *I looked at 30 of 1,342*, not *nothing
exists*. A tool that returned bare results would let a model conclude a style
does not exist, and the model would be wrong — with no signal that it was wrong.

## Decision
The store grows lazily: the sitemap is fetched once and cached, a style page is
fetched only when something asks for that style, and cached entries are
revalidated with conditional GETs driven by the sitemap's `lastmod`, so a repeat
call usually costs a 304.

Every search and match result states the coverage it was computed over, and
`refero_index_status` exists so the model can check before concluding absence.
Expansion is bounded twice over: `REFERO_MAX_FETCHES` per call and
`REFERO_CONCURRENCY` in flight, so a large `expand` cannot open a burst of
connections.

## Consequences
- Results improve the longer the server runs. A tool answer is a function of
  local coverage as well as of the query, and the output says which.
- `Store.indexStats()` and the coverage lines in search output are load-bearing,
  not diagnostics. Removing them removes the honesty property.
- On a network failure with a cached entry present, the stale answer is served —
  and logged. A stale answer beats no answer, but it must not be passed off as
  fresh.

## Evidence
`src/index/store.ts` (module doc comment and `indexStats`),
`src/server/tools/index.ts` (`expandIndex` and its bounds),
`src/server/tools/searchStyles.ts`, `src/server/tools/matchStyle.ts`,
`src/server/tools/indexStatus.ts`, `src/core/scoring.ts`, `README.md`
("Coverage is reported, never implied").
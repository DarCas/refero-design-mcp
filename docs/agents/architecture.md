# Architecture

## What the thing is

An MCP server, stdio transport, single npm package, no framework beyond
`@modelcontextprotocol/sdk` and `zod`. It reads the public pages of
`styles.refero.design`, extracts a design system from each page, and answers
tool calls about the catalogue.

Two runtime shapes, deliberately separate:

- `src/cli.ts` owns the process's stdio. stdio can only be taken once, so the
  CLI is the only place that constructs `StdioServerTransport`.
- `src/server/index.ts` exports `createServer()`, a pure function. That is what
  lets `test/e2e.test.ts` drive a real server in-process over
  `InMemoryTransport` instead of spawning a process and piping JSON-RPC.

If you add an entry point, it must go through `createServer()`.

## Dependency direction

One way, no cycles. Verified import edges:

```
server/ ──▶ index/store ──▶ sources/ ──▶ http ──▶ config ──▶ version
   │              │             │
   └──────────────┴─────────────┴──▶ types.ts   (zod schemas only, no I/O)
   └────────────────────────────────▶ core/ ──▶ types.ts
```

- `types.ts` and `core/` are leaves. `core/designMd.ts` is the only `core/`
  module with an import at all, and it reaches `types.ts` alone.
- `core/` must not import `http`, `config`, `sources`, `index` or `server`. No
  network, no MCP, no filesystem. That is what makes those modules cheap to
  test.
- `sources/` knows nothing about MCP. `server/tools/` knows nothing about HTML
  parsing. The boundary is what keeps the RSC quirks out of the tool layer.
- `server/` may import downwards freely; nothing imports upwards.

### The version module and the cycle it exists to break

`src/version.ts` has no imports from the rest of the codebase. It walks up from
its own directory looking for a `package.json` whose name ends with
`refero-design-mcp`, then returns that manifest's version, or `0.0.0-unknown`.

Three non-obvious constraints, each of which was a real failure:

- **It must not import anything from the project.** `config.ts` needs `VERSION`
  for the `User-Agent`, and `index/store.ts` needs `config`. Defining `VERSION`
  in `server/index.ts` closed the cycle `server/index → index/store → config →
  server/index`. That cycle only breaks when the server is *not* the first module
  loaded — `cli.ts` reaches config through the store first, so `npm start`
  worked while importing `server/index.js` first (a test, a bundler, any future
  consumer) threw a TDZ `ReferenceError` before serving a request.
- **The lookup must walk up, not use a fixed `../..`.** The depth differs
  between `src/` (tsx) and `dist/` (compiled).
- **The match must be a suffix test, not equality.** The npm name is
  `@darcas/refero-design-mcp`; equality against an unscoped string fails
  silently and reports `0.0.0-unknown`.

`test/version.test.ts` pins all of this against freshly compiled output. If you
touch version resolution, that suite must stay green — it is the only place a
silent `0.0.0` would otherwise survive.

## Module map

| Module | Responsibility |
| --- | --- |
| `src/cli.ts` | Process entry: `createServer()`, stdio transport, SIGINT/SIGTERM shutdown |
| `src/version.ts` | `VERSION`, resolved from the manifest. Import-free leaf |
| `src/config.ts` | Every `REFERO_*` setting, env-overridable, validated at startup |
| `src/http.ts` | The only network egress: fetch, conditional GET, retry/backoff, `Retry-After`, stderr `log()` |
| `src/types.ts` | zod schemas. The contract with the outside world |
| `src/core/scoring.ts` | The single relevance scorer, shared by search and match |
| `src/core/designMd.ts` | Section renderers; `buildDesignMd()` assembles and truncates |
| `src/core/truncate.ts` | Structure-aware markdown truncation |
| `src/core/concurrency.ts` | Bounded-concurrency pool |
| `src/sources/sitemap.ts` | Parse `sitemaps/styles.xml` into `{id, lastmod}` |
| `src/sources/rsc.ts` | Decode the RSC flight payload, locate the style record by id |
| `src/index/store.ts` | Disk cache, lazy indexing, in-flight dedup, coverage stats |
| `src/server/index.ts` | Assembly only: name, version, instructions, tools, resources |
| `src/server/tools/*` | One module per tool, named after the tool |
| `src/server/resources/designMd.ts` | The `refero://style/{id}/design.md` resource |

## Runtime flows

### Cold start

`cli.ts` → `createServer()` → registers 6 tools and 1 resource against a
module-level `store` singleton → `server.connect(StdioServerTransport)`.
Nothing is fetched at startup.

### A search or a match

1. `expandIndex(store, count)` pulls up to `count` uncached styles, bounded
   twice: `REFERO_MAX_FETCHES` per call, `REFERO_CONCURRENCY` in flight. It
   reports `{requested, indexed, failed}` — never a bare count of attempts.
2. `store.sitemap()` gives the published set; `store.cachedSummaries()` gives
   what is on disk, served from the in-memory index after the first call.
3. `tokenize()` → `rankSummaries(summaries, terms, limit)`: score every
   summary, drop the zeros, sort, slice.
4. `formatSearchResults(ranked, meta)` prints the results, the coverage they
   were computed over, and any index failures.

Nothing is fetched in step 3. A search over a 30-style local index that
reports "no match" means no match in those 30.

### A design document

`store.getStyle(id)` (cached, conditional, falls back to stale cache on network
failure and says so) → `buildDesignMd(detail, {sections}, charBudget())` →
section renderers → `truncateMarkdown()` on a structural boundary.

### The resource path

Same rendering, but the `style_id` comes from the URI. It is validated against
a UUID regex *before* it reaches the store, because it becomes a cache path key
downstream.

## Store and cache layout

- Cache root: `REFERO_CACHE_DIR`, default `os.homedir()/.cache/refero-design-mcp`,
  or `$XDG_CACHE_HOME` when set. It falls back to `os.tmpdir()` if the home
  directory cannot be determined — never to a relative path, which would create
  a directory inside whatever working directory the client used.
- One file per style at `styles/<sha256(id).slice(0,32)>.json`. The hash is a
  containment guard: a malformed id cannot escape the cache directory.
- Envelope: `{etag, lastModified, detail}`. **These** validators drive
  conditional GET, so a repeat call usually costs a 304. The sitemap's `lastmod`
  is display metadata and never enters a request.
- The sitemap list is cached in-process for 6 h. When it goes stale the refresh
  happens in the background while the stale list is still served, and it is
  **deduplicated** — concurrent callers share one refresh rather than each
  starting their own fetch.
- The cache directory is created once per process, not once per lookup.
- `getStyle` de-duplicates concurrent requests for the same id through an
  in-flight map.

### The in-memory index

Cached summaries and known-absent ids are held in memory for the process
lifetime. This is the single biggest performance property of the store:

| Operation | Before | After |
| --- | --- | --- |
| `cachedSummaries()`, warm | 27.7 ms | 0.2 ms |
| `indexStats()` | 27.9 ms | 0.2 ms |
| `expandIndex` scan, all cached | 49 ms | 0.1 ms |

Measured against the local cache (26 of 1,342 styles indexed). The cost was
linear in the catalogue and would have reached ~1.5 s per search at full
coverage.

Both directions must be memoised. Caching only the hits leaves every
*uncached* style re-read from disk on each call, which is the larger half of
the catalogue — `absent` is what makes `expandIndex` cheap. Memory is bounded by
the published style count.

The cache must never land inside the repository. `test/version.test.ts`
asserts that and removes `.cache/` if a previous run created one — typically
the symptom of `HOME` being unset while running the suite.

## Invariants worth preserving

- **Select the style record by `styleId`.** A page embeds 10–20 related styles
  with identical key names. Taking the first `"designSystem"` in the blob is
  wrong in general, even where it currently happens to work.
- **One scorer.** Search and match share `core/scoring.ts`. A second scorer
  that disagrees is a bug the model would see as the two tools contradicting
  each other.
- **Report coverage.** Any result computed from a partial local index must say
  so in its output. A silent miss is worse than an error.
- **Truncate on structure,** never on raw character count, and close any code
  fence you open. An unterminated fence makes the model read broken markup as
  design intent.
- **Keep requests polite.** Conditional GET, bounded concurrency, bounded
  per-call fetches.
- **Never mutate a cached `StyleDetail`.** The same object may be reused by
  another call; `getStyle.ts` builds its payload by omission for this reason.
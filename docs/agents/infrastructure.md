# Infrastructure

## Packaging

npm name `@darcas/refero-design-mcp`; MCP server name and `bin` entry are both
unscoped `refero-design-mcp`, so neither the user nor the model types the scope.
Published contents: `dist/`, `README.md`, `LICENSE`.

`src/version.ts` matches the manifest by unscoped-name suffix, so a future scope
change cannot break version reporting.

### Every `bin` target must be executable

`tsc` emits files at 644 whatever the mode of the source, so a shebang is not
enough. npm symlinks `node_modules/.bin/<name>` to the target without checking
the bit, and the spawn fails with `Permission denied`. The MCP client then drops
the server **silently** — no tool list, no actionable error. `npm start` passes
`node dist/cli.js` explicitly, so local testing never catches it; only the
`npx`/symlink path breaks.

`build` ends with `node scripts/postbuild.mjs`, which reads `bin` from the
manifest and chmods each target to 755, so a new entry is picked up automatically.

Do **not** replace that with `&& chmod +x dist/cli.js` in the script string: it
works on Linux and fails outright on Windows, where `chmod` is not a `cmd.exe`
builtin. `chmodSync` is the right call — a no-op on Windows, which is correct
because npm writes `.cmd` shims there rather than symlinks.

Diagnostic:

```bash
npm pack; tar -tvf *.tgz | grep cli.js   # -rwxr-xr-x is correct, -rw-r--r-- is the bug
```

## Release

**The user releases. There is no agent-facing publish step, and there should not
be one.** Never run `npm publish`, never create or push a `v*` tag, and never run
`npm version` — it tags by default, and a tag is not a harmless side effect here:

- a `v*` tag pushed to `origin` triggers `.github/workflows/publish.yml`
- that workflow runs `npm ci`, then `npm run deploy` = `verify` then
  `npm publish --access public --provenance`
- npm will not republish an existing version, so the `version` field in
  `package.json` must already be bumped

`.opencode/commands/commit.md` offers option 2, "commit and push", and then asks
for a tag name. **Decline the tag.** The correct agent ending is: bump `version`
by hand, `npm run verify`, commit, report that it is ready to release, stop.

## Node versions

Two floors, and they mean different things:

- **`engines.node: ">=22.12"` is a support policy**, not a technical limit. The
  compiled server genuinely runs on Node 20.11 — verified by handshake, live
  HTTPS fetch and RSC extraction — because the runtime uses only `fetch` and
  `AbortSignal.timeout`, and the SDK only requires `>=18`. The floor is 22.12
  because **Node 20 reached end-of-life on 2026-04-30** and shipping a runtime
  floor that names an unpatched Node is a worse promise than a slightly higher
  one.
- **`.nvmrc` pins `22.23.2`** — the patch, not the float. Both `engines` and the
  toolchain (Vitest 5 requires `^22.12.0 || ^24 || >=26`) need `>=22.12`, and a
  floating `22` can resolve to 22.11, where Vitest 5 will not start.

Raise the floor only with a reason, and never because a devDependency asks for
more: `engines` is a promise to whoever installs the package, and the toolchain
is not part of that promise.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests, in two
jobs:

- **`verify`** — Node from `.nvmrc`: `npm ci`, `npm run verify`, then
  `node scripts/smoke.mjs`. Uploads `dist/`.
- **`runtime-floor`** — Node **22.12.0**, the lowest version satisfying
  `engines`. Downloads only `dist/`, installs runtime dependencies with
  `--omit=dev`, and re-runs the smoke test.

Building once on a modern Node and testing the artifact on the floor is what
keeps a declared floor honest: a single-version matrix would leave `engines` as
an unchecked assertion. `scripts/smoke.mjs` performs the MCP `initialize`
handshake and asserts the server advertises both `tools` and `resources`; it is
deliberately offline, because live behaviour belongs to `test/e2e.test.ts`. It
does **not** police the running Node version — that is `engines`' job, and
duplicating it would create a second source of truth to drift.

`publish.yml` is tag-triggered and builds with the same `.nvmrc` version, so a
release and CI verify produce the artifact on one Node.

Regenerate `package-lock.json` whenever dependencies change. It was once stale —
recording the root package as unscoped at `0.1.0` — which `npm ci` tolerates
(it validates dependencies, not the root name and version) but that hides real
version drift. It was rewritten when Vitest moved to 5.

## Origins and network policy

Only two paths are ever fetched:

- `sitemaps/styles.xml` — small, gives ids and `lastmod`
- `/style/{id}` — a few hundred KB, fetched on demand

`robots.txt` disallows `/api/`, `/admin/`, `/extract/` and `/playground/` for
`User-Agent: *`, and it separately blanket-blocks a list of named AI crawlers
(`ClaudeBot`, `GPTBot`, `PerplexityBot`, …) with `Disallow: /`. The server sends
its own identifying `User-Agent` (`refero-design-mcp/<version> (+repo URL)`) and
only ever asks for allowed paths. `/api/` additionally answers `403` to every
non-browser client. `sitemaps/collections.xml` (52 entries) is allowed and
unused — a known gap, not an oversight.

Requests stay polite: conditional GET with cached `ETag`/`Last-Modified`,
bounded concurrency (`REFERO_CONCURRENCY`), bounded per-call fetches
(`REFERO_MAX_FETCHES`), per-request timeout, and 3 attempts with exponential
backoff plus jitter on retryable statuses only.

## Environment

Every setting is optional; all are `REFERO_*` and validated at startup by
`src/config.ts`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `REFERO_SITE_URL` | `https://styles.refero.design` | Origin base URL |
| `REFERO_STYLES_SITEMAP` | `{site}/sitemaps/styles.xml` | Style index |
| `REFERO_MAX_FETCHES` | `25` | Page fetches per tool call |
| `REFERO_CONCURRENCY` | `4` | Simultaneous requests |
| `REFERO_TIMEOUT_MS` | `30000` | Per-request timeout |
| `REFERO_CACHE_TTL_MS` | `604800000` (7 days) | Cache freshness window |
| `REFERO_CACHE_DIR` | `~/.cache/refero-design-mcp` | On-disk cache |
| `REFERO_USER_AGENT` | `refero-design-mcp/<version> (+repo)` | Request identification |
| `REFERO_MAX_RESPONSE_CHARS` | `40000` | Response budget before truncation |
| `REFERO_VERBOSE` | `false` | Diagnostics to stderr |

An unparseable or negative integer setting **throws at startup**. That is
deliberate: a silently defaulted limit is how a run ends up making 900 requests.

The on-disk cache must stay out of the repository. `HOME` or `XDG_CACHE_HOME`
being unset while running the suite is the usual cause of a stray `.cache/` in
the repo root; the version suite deletes it and fails if it reappears.

## Known gaps

- No tool for collections (`sitemaps/collections.xml`, 52 entries, unused).
- `refero_get_style` has no response budget. The largest cached style payload is
  ~50 KB of JSON, which is acceptable today, but there is no ceiling if a future
  style carries a much larger measured-token set.
- `refero_index_status` and the search tools read the sitemap on a 6 h TTL held
  in memory only. A long-lived server that restarts pays one sitemap fetch per
  process; persisting it to disk was considered and deferred as not worth the
  extra state.
- `.editorconfig` and the code disagree on indentation, bracket spacing, import
  member order and line length. See `docs/agents/conventions.md`; pick a
  direction deliberately rather than reformatting in passing.
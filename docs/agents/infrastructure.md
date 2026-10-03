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

CI runs on `ubuntu-latest` with Node 24; `.nvmrc` says 22; `engines` requires
`>=20.11`. All three are consistent for what this code needs.

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
- `package-lock.json` is stale: it records the root package as unscoped
  `refero-design-mcp` at `0.1.0`, while `package.json` says
  `@darcas/refero-design-mcp` at `1.0.2`. It does not block a release — `npm ci`
  validates dependencies, not the root name or version — but regenerate it when
  the dependency set changes anyway.
- `.editorconfig` and the code disagree on indentation, bracket spacing, import
  member order and line length. See `docs/agents/conventions.md`; pick a
  direction deliberately rather than reformatting in passing.
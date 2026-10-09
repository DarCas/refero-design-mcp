# AGENTS.md

Working notes for coding agents on this repository. Read before changing code.

MCP server over the public pages of `styles.refero.design`: it extracts design
systems out of Next.js React Server Component payloads embedded in style pages.
Node 22.23.2 (see `.nvmrc`; `engines` requires `>=22.12`), TypeScript, ESM,
Vitest 5. One package, no framework beyond the MCP SDK and zod.

## Commands

```bash
npm install
npm run dev        # tsx watch src/cli.ts — waits on stdin, looks hung: correct
npm run verify     # typecheck -> lint -> test -> build. Run before declaring done.
npm start          # node dist/cli.js, after a build
```

| Script | Runs | Notes |
| --- | --- | --- |
| `npm run typecheck` | `tsc --noEmit` | Covers `src/` **and** `test/` |
| `npm run lint` | `eslint src test` | Type-aware. Use `--fix`; never hand-fix the semicolon rule |
| `npm test` | `vitest run` | 125 tests / 9 files. The e2e suite hits the live site and skips if the origin is unreachable |
| `npm run build` | `clean && tsc -p tsconfig.build.json && node scripts/postbuild.mjs` | The postbuild step chmods the `bin` targets |
| `node scripts/smoke.mjs` | starts the built server and checks the MCP handshake | Run after a `bin`, build or `engines` change; it is what proves the Node floor |
| `npm run deploy` | `verify` then `npm publish` | Never run it yourself — see hard rules |

Single test: `npx vitest run test/rsc.test.ts`. Single case:
`npx vitest run -t 'braces'`. Watch: `npx vitest`.

## Hard rules

- **Never contact `/api/`, `/admin/`, `/extract/` or `/playground/`.** All four
  are `Disallow`ed in `robots.txt` for `User-Agent: *`, and `/api/` also answers
  `403` to non-browser clients. Allowed and sufficient:
  `sitemaps/styles.xml`, `sitemaps/collections.xml`, `/style/{id}`. If a task
  seems to need one of the others, it does not.
- **Never publish.** No `npm publish`, no `npm version` (it tags by default), no
  creating or pushing a `v*` tag — that tag is what triggers
  `.github/workflows/publish.yml`. Bump `version` in `package.json` by hand, run
  `npm run verify`, commit, stop, and say it is ready to release. The user tags.
  The `/commit` command offers to create a tag: decline.
- **Never write to stdout.** stdout carries MCP JSON-RPC frames. Use `log()` from
  `src/http.ts`, which writes to stderr and is silent unless `REFERO_VERBOSE` is
  set. A quiet server is normal.
- **Never use `console.*`.** Lint forbids it.
- **No statement semicolons.** Lint enforces it. `eslint --fix` handles the ASI
  edge cases; a manual `sed` breaks them. Semicolons inside `interface` and
  `type` bodies are type members and stay.
- **Keep the import graph acyclic.** `src/version.ts` exists solely to break the
  `server/index → index/store → config → server/index` cycle. Do not move
  `VERSION` back into the server layer, and do not make `config.ts` reach
  upwards.
- **Select a style record by `styleId`,** never by position. A page embeds 10–20
  related styles with identical key names; the wrong one returns a neighbour's
  palette with no error.
- **Report coverage in every search result.** A miss over a partial local index is
  not evidence a style does not exist.
- **`skillVersion` is derived, never stored.** The installer takes it from
  `VERSION` (`src/version.ts`); `clients.json` must not declare one. The skill
  ships in the same tarball as the server, so a second literal can only drift.
  `tests/validate.mjs` fails the build if the field comes back.
- **Do not let an "offline" test touch the network,** and never write a test that
  cannot fail. Unit suites use the RSC fixture in `test/rsc.test.ts`.
- **Do not reformat code you are not otherwise changing.** The indentation,
  bracket-spacing and import-order rules in `.editorconfig` are only partly
  applied; see `docs/agents/conventions.md` before touching formatting.

## External File Loading
CRITICAL: When you encounter a file reference (e.g. @docs/agents/architecture.md), use your Read tool to load it on a need-to-know basis, only if relevant to the SPECIFIC task at hand.
- Do NOT preemptively load all references.
- Once loaded, treat the content as mandatory instructions that override defaults.
- Follow references recursively when needed.

## Project knowledge
- Before touching modules, layers or data flow, or adding a file to `src/`: @docs/agents/architecture.md
- Before writing or changing code, or reformatting anything: @docs/agents/conventions.md
- Before changing RSC parsing, zod schemas or rendered output: @docs/agents/domain.md
- Before adding or changing an MCP tool or resource: @docs/agents/api.md
- Before writing or running tests: @docs/agents/testing.md
- Before building, packaging, releasing or touching env config: @docs/agents/infrastructure.md
- Before questioning a decision the code already encodes: @docs/agents/decisions/
- User-facing docs (tools, env vars, install, design notes): `README.md`

## Map

```
src/cli.ts              process entry: stdio transport, signals, fatal handler
src/version.ts          VERSION; manifest lookup by unscoped-name suffix
src/config.ts           every REFERO_* setting, validated at startup
src/http.ts             the only network egress: fetch, retry/backoff, conditional GET, log()
src/types.ts            zod schemas; the contract with the outside world
src/core/               pure logic — no network, no MCP, no filesystem
src/sources/            everything that touches the network
src/index/store.ts      disk cache, lazy indexing, in-flight dedup
src/server/             what the protocol exposes
  tools/                one module per tool, named after the tool
  resources/            the refero:// style design.md resource
src/skill/install.ts    the refero-design-skill installer CLI; node:fs/os/path/url only, never http/config
scripts/postbuild.mjs   chmods the bin targets after tsc
test/                   offline unit suites + one live e2e suite, plus the installer suites
skill/                  the refero-design-research Agent Skill; validate.mjs is plain Node, not TS
dist/                   build output, gitignored, never edit
```

Dependency direction, one way: `server` → `index` → `sources` → `http` →
`config` → `version`, with `core/` and `types.ts` as leaves.
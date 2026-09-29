# AGENTS.md

Working notes for coding agents on this repository. Read before changing code.

## What this project is

An MCP server over the public pages of `styles.refero.design`. It parses design
systems out of Next.js React Server Component payloads embedded in style pages.

## Style

`.editorconfig` is the source of truth. Read it before reformatting anything.

**Semicolons are off.** `ij_typescript_force_semicolon_style = false`, and
enforced by lint rather than by convention:

```js
'@/semi': ['error', 'never']   // eslint.config.js
```

Never hand-edit this away. Run `npx eslint src test --fix` and let the rule
apply — it exists because it handles the ASI edge cases, where a statement
continuing onto a line opening with `(`, `[` or a template literal still needs
its leading semicolon. A blind `sed` would silently break those.

Semicolons that remain are **type members**, not statement terminators:
properties in an `interface` or `type` literal keep theirs, and the rule leaves
them alone. Semicolons in prose — README, doc comments, this file — are
ordinary English punctuation; leave them.

**Other rules from `.editorconfig`:**

| Rule | Value | Enforced? |
| --- | --- | --- |
| `charset` | `utf-8` | yes |
| `indent_style` | `space` — never tabs | yes |
| `indent_size` | 4 (2 for `.json`, `.yml`) | no — see drift below |
| `end_of_line` | `lf` | yes, consistently |
| `trim_trailing_whitespace` | true, except `.md` | yes |
| `insert_final_newline` | true | yes |
| `max_line_length` | 100 | no |
| `ij_json_space_after_colon` | true (`.json`, `.yml`) | yes |
| `ij_typescript_enforce_trailing_comma` | `whenmultiline` | yes, in practice |
| `ij_typescript_blank_lines_after_imports` | 1 | yes |
| `ij_typescript_import_merge_members` | true | yes |
| `ij_typescript_import_sort_members` | true | no — see drift below |
| `ij_typescript_spaces_within_brackets` | true — `[ a, b ]` | no — see drift below |
| `ij_typescript_spaces_within_imports` | true | no — see drift below |
| `ij_typescript_spaces_within_parentheses` | true — `foo( bar )` | no — see drift below |

The `ij_*` keys are IntelliJ settings, not tooling. Only the semicolon rule has
a linter behind it, which is why the rest is convention rather than guarantee.
`root = true` stops the search above this directory.

### Known drift between `.editorconfig` and the code

The config was written after most of this code, and the codebase has not been
reformatted to match. Do not "fix" one side in passing — pick a direction and
apply it everywhere:

- **Indent size.** `.editorconfig` says 4. All of `src/` and `test/` uses 2
  except `src/config.ts`, which uses 4.
- **Parentheses and brackets.** The config asks for `foo( bar )` and `[ a, b ]`.
  The code writes `foo(bar)` and `[a, b]` in roughly 1,030 call sites.
  Reformatting to the config is mechanical but a very large diff; leaving it
  means the config is aspirational.
- **Import member order.** The config asks for sorted members. Import lists are
  unsorted throughout.
- **Line length.** 69 lines exceed the 100-character limit, some over 110.

## Hard rules

**Never contact `/api/`.** `robots.txt` disallows it and it answers `403` to
every non-browser client. Allowed and sufficient: `sitemaps/styles.xml` and
`/style/{id}`. If a task seems to require `/api/`, it does not.

**Never write to stdout.** stdout carries MCP JSON-RPC frames. Diagnostics go
through `log()` in `src/http.ts`, which writes to stderr.

**Never use `console.*`.** Enforced by lint. Use `log()`.

## Verify before declaring done

```bash
npm run verify    # typecheck + lint + test + build
```

All four must pass. The suite includes live tests against the real site; a
network failure skips them rather than failing them, so check the skip count
if you changed extraction or transport code.

## Data shape is empirical, not documented

Field shapes were established by inspecting real payloads. Where this file and
the code disagree with a plausible guess, the code is right.

Things that are *not* what they look like:

- `designSystem.spacing.radius` is an **object** mapping element to value, not a string.
- `designSystem.spacing.pageMaxWidth` can be `null`.
- `designSystem.similar` is `{business, why}[]`, not `string[]`.
- `designSystem.surfaces` is `{hex, name, level, purpose}`.
- `designSystem.typography` is `{role, sizes, family, weight, lineHeight, substitute}`.
- There is no `designSystem.elevation`. The field is `elevationPhilosophy`.
- `typeScale[].size`, `.weight`, `.lineHeight`, `.letterSpacing` arrive as **numbers**.
- `customSections[].content` may be `"$1e"` — a React Flight lazy reference, not prose.
  `isFlightReference()` detects it; the renderer drops it rather than printing it.
- `result.raw` and `result.designSystem` are different payloads and disagree in
  shape. Do not merge them casually.

Schemas are permissive about type and strict about presence: the data source
varies wildly between styles. A partial document must degrade, not throw away
an entire design system.

## Architecture

Four layers, one direction of dependency: `server` → `index` → `sources` → `core`.

```
src/
├── cli.ts            process entry: takes stdio, connects the transport
├── server/           what the protocol exposes
│   ├── index.ts        assembly: name, version, tools, resources
│   ├── tools/          one module per tool, named after the tool
│   │   ├── index.ts      registration barrel + expandIndex
│   │   ├── shared.ts     ToolText, formatting, coverage helpers
│   │   └── errors.ts     per-style error reporting
│   └── resources/      MCP resources (refero:// URIs)
├── index/store.ts    disk cache, lazy indexing, in-flight dedup
├── sources/          everything that touches the network
│   ├── sitemap.ts      parse sitemaps/styles.xml
│   └── rsc.ts          decode the RSC payload, locate the style record
├── core/             pure logic, no I/O, no MCP
│   ├── scoring.ts      the single relevance scorer
│   ├── designMd.ts     section renderers
│   ├── truncate.ts     structure-aware truncation
│   └── concurrency.ts  bounded-concurrency pool
├── config.ts         env-overridable settings, all REFERO_*
├── http.ts           fetch + retry/backoff + conditional GET + stderr log
└── types.ts          zod schemas; the contract with the outside world
```

Rules the layout encodes:

- **`core/` never imports from anything above it.** No network, no MCP, no
  filesystem. That is what makes those modules cheap to test.
- **`sources/` knows nothing about MCP**, and `server/tools/` knows nothing about
  HTML parsing. The boundary is what keeps the RSC quirks out of the tool layer.
- **One module per tool, named after the tool** (`getDesignMd.ts` exposes
  `refero_get_design_md`). If you add a tool, add a file; do not grow `index.ts`.
- **`shared.ts` holds cross-tool plumbing** so a tool module can import helpers
  without importing the registration barrel and creating a cycle.

## Invariants worth preserving

- **Select the style record by `styleId`.** A page embeds 10–20 related styles
  with identical key names. Taking the first `"designSystem"` in the blob is
  wrong in general, even where it currently happens to work.
- **One scorer.** Search and match share `core/scoring.ts`. Do not fork it.
- **Report coverage.** Any result computed from a partial local index must say
  so in its output. A silent miss is worse than an error.
- **Truncate on structure,** never on raw character count. An unterminated code
  fence makes the model read broken markup as design intent.
- **Keep requests polite.** Conditional GET, bounded concurrency
  (`REFERO_CONCURRENCY`), bounded per-call fetches (`REFERO_MAX_FETCHES`).

## Testing conventions

- Unit tests are **offline**, using the RSC fixture in `test/rsc.test.ts`.
  If you change parsing, update the fixture and pin the behaviour.
- Never write a test that cannot fail. A skipped test is indistinguishable
  from a passing one — see the top-level `await` probe in `test/e2e.test.ts`.
- Extraction failures must be typed (`ExtractionError`) with a machine-readable
  `reason`. Tools distinguish "no such style" from "not parseable".

## Known gaps

- No tool for collections (`sitemaps/collections.xml` has 52; unused).
- Not published to npm yet. The package is `@darcas/refero-design-mcp`; the
  installed binary is `refero-design-mcp` (unscoped on purpose). Publishing
  requires the `@darcas` scope to exist and be owned.
- No CI workflow. The user has deferred it deliberately.

## Packaging

The npm package name is `@darcas/refero-design-mcp`, but the MCP server name on
the wire and the `bin` entry are both unscoped `refero-design-mcp` — the model
and the user should not type the scope. `src/server/index.ts` locates its own
manifest by suffix match, so a future scope change cannot break version
reporting.

## Adding a tool

1. Create `src/server/tools/<toolName>.ts` exporting `register<ToolName>(server, deps)`.
2. Give the handler an explicit argument type; the SDK infers nothing useful
   when the shape is inlined.
3. Add one line to `registerTools` in `src/server/tools/index.ts`.
4. Use `errorText`, not a thrown error, so the model receives recovery advice.
5. If the result is computed from a partial index, say so in the output.

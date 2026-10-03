# MCP surface

The user-facing tool table lives in `README.md`. This file covers the contract
and the conventions an agent must follow when changing it.

## Shape

`createServer()` in `src/server/index.ts` is the whole assembly: server name
`refero-design-mcp` (unscoped — the model and the user should never type the npm
scope), `VERSION`, an `instructions` string that teaches the intended call
order, six tools, one resource. It holds no logic of its own.

| Tool | Args | Notes |
| --- | --- | --- |
| `refero_index_status` | — | Published vs locally indexed, coverage %, sitemap freshness, server version |
| `refero_search_styles` | `query`, `limit?`, `expand?` | `limit` ≤ 50 (default 5); `expand` ≤ 500 (default 25) |
| `refero_match_style` | `brief`, `limit?`, `expand?` | `limit` ≤ 20 (default 3); `expand` default 50 |
| `refero_get_design_md` | `style_id`, `sections?`, `refresh?` | Honours `sections`; truncates structurally if omitted |
| `refero_get_style` | `style_id`, `include_measured_tokens?`, `refresh?` | JSON; measured tokens included by default |
| `refero_list_style_ids` | `offset?`, `limit?`, `updated_since?` | `limit` ≤ 200 (default 50); reads the sitemap only, no page fetches |

Every `limit` maximum is enforced twice: by the zod schema and by
`defaultLimit(input, fallback, max)`. The two must agree, and each tool declares
its own `MAX_LIMIT` next to its default for exactly that reason. A limit the
schema accepts and the code then silently narrows is worse than no limit.

`style_id` is validated against the UUID shape before any request. A malformed
id used to be forwarded to the origin and answered with a bare 404; it now
returns an error naming `refero_list_style_ids` as the recovery step.

Plus the resource `refero://style/{style_id}/design.md` (`text/markdown`),
registered in `src/server/resources/designMd.ts`.

`refresh: true` maps to `force: true, maxAgeMs: 0` — a cache bypass that is
still a conditional request when validators exist.

## Conventions

- **One module per tool, named after the tool**, exporting
  `register<ToolName>(server, deps)`. `matchStyle` and `searchStyles` also take
  the shared `ExpandIndex` callback. Adding a tool means adding a file, then one
  line in `registerTools`.
- **Give the handler an explicit argument type.** The SDK infers nothing useful
  when the shape is inlined, and the wire names are snake_case, so the type is
  what documents the mapping.
- **Return `errorText()`, never throw,** so the model receives recovery advice
  instead of a protocol error. `reportStyleError()` in `tools/errors.ts` keeps
  the three single-style cases distinct: not found, extraction failure, network
  failure.
- **Shared plumbing lives in `tools/shared.ts`** — `text()`, `errorText()`,
  `defaultLimit()`, `charBudget()`, `summaryToScorable()`,
  `formatSummaryLine()`, `formatSearchResults()`. Tool modules import it rather
  than the registration barrel, which would create a cycle.
- **State the coverage in every result.** `formatSearchResults()` takes a
  `Coverage` argument for exactly this. A result computed from a partial index
  must say so.
- **Report what happened, not what was asked for.** `expandIndex()` returns an
  `ExpandReport` (`requested`, `indexed`, `failed`) and `describeExpand()`
  phrases it. A model told "indexed 25" when nine fetches failed will conclude
  the rest of the catalogue is absent.
- **Rank through `rankSummaries()`.** It lives in `shared.ts` next to the
  scorer, so search and match cannot drift apart. A score of 0 means no literal
  and no mood-facet hit, and is dropped rather than ranked last.
- **Degrade, do not invent.** An empty search says how many of how many were
  searched; `refero_index_status` exists so "not indexed yet" is
  distinguishable from "does not exist".
- **Validate anything that becomes a path key.** The resource handler tests the
  id against a UUID regex before it reaches the store.

## Adding a tool

1. `src/server/tools/<toolName>.ts`, exporting `register<ToolName>(server, deps)`
   with a one-line doc comment naming the tool it exposes.
2. Explicit handler argument type; `zod` schema in `inputSchema` with
   `.describe()` on every argument — the description is what the model reads.
3. One line in `registerTools()` in `src/server/tools/index.ts`.
4. Reuse `core/scoring.ts` if it ranks anything. Do not write a second scorer.
5. Add the name to the `advertises its tools` assertion in `test/e2e.test.ts`.
6. Add a row to the tool table in `README.md`.
7. If the tool addresses a single style, route errors through
   `reportStyleError()`.

## The resource must stay listable

`ResourceTemplate`'s `list` callback is not optional decoration: a resource that
is readable but not enumerable is invisible to any client that discovers
resources by listing them. It advertises up to 50 entries, drawn from what is
already indexed — listing all ~1,342 would be a large response for no gain. The
e2e suite asserts both the listing and the URI shape.

## Transport rules

- stdio. stdout carries JSON-RPC frames and nothing else.
- Diagnostics go to stderr through `log()` in `src/http.ts`, which is **silent
  unless `REFERO_VERBOSE` is set**. A quiet server is normal, not broken.
- `npm start` on a bare terminal appears to hang: it is waiting for a client on
  stdin. That is correct behaviour.
- Handshake failures surface as the server vanishing from the client's tool
  catalogue with no error. See `docs/agents/infrastructure.md` before concluding
  anything is wrong with the protocol layer.
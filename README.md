# refero-design-mcp 
[![M8ven Score](https://m8ven.ai/badge/mcp/darcas-refero-design-mcp-1077wk)](https://m8ven.ai/mcp/darcas-refero-design-mcp-1077wk?s=readme)
[![Buy me a coffee](https://img.shields.io/badge/buy_me_a_coffee-%E2%9D%A4%EF%B8%8F-FEEBE7?&labelColor=FF0000)](https://www.paypal.com/donate/?hosted_button_id=YZQDE3TEYDBWA)

> The underlying data belongs to Refero Design. This is an unofficial client; no
affiliation or endorsement is implied.
 
![Node.js](https://img.shields.io/badge/node.js-%3E%3D22.12-5FA04E?logo=nodedotjs&logoColor=white&style=for-the-badge)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-74%20passing-brightgreen?style=for-the-badge)](#testing)

![npm](https://img.shields.io/npm/v/@darcas/refero-design-mcp?style=for-the-badge)
![NPM Downloads](https://img.shields.io/npm/dy/%40darcas%2Frefero-design-mcp?style=for-the-badge)

An [MCP](https://modelcontextprotocol.io) server for discovering, searching and
extracting design systems from the public pages of
[styles.refero.design](https://styles.refero.design).

Give an assistant a real design system — palette, type scale, spacing, surfaces,
do/don't guidance — instead of one it invented.

---

## Why it is built this way

Two decisions shape everything else.

**The JSON API is not used.** `styles.refero.design/robots.txt` disallows
`/api/`, and the endpoint is gated in practice: it answers `403` to every
non-browser client and `200` to a real browser, which points at TLS fingerprinting
rather than authentication. Spoofing headers would not fix that, and would not be
the right thing to do regardless.

So this server reads only what `Allow: /` permits — the published sitemap and the
public style pages — reachable with a plain `curl` and no pretending to be
anything else. Requests are conditional, concurrency-capped, and sent with a
`User-Agent` that identifies the project.

**Coverage is reported, never implied.** A style page is a few hundred KB and
there are over a thousand of them, so the local index grows on demand. That
makes "I found no matches" ambiguous — it usually means *"I looked at 30 of
1,340"*, not *"nothing exists"*. Every search states its own coverage, and
`refero_index_status` exists so the model can check before concluding a style is
absent.

## Performance

The index is deliberately lazy, so almost every tool call has to answer *"how
much do we actually have?"* before it can answer anything else. Getting that
wrong is the difference between a search that returns in under a millisecond and
one that stalls for seconds.

The store keeps cached summaries **and known-absent ids** in memory, and reads
the cache directory once per session instead of probing a path per style. Both
directions matter: remembering only the hits would leave the larger half of the
catalogue re-read on every call.

| Operation | Before | After | Speed-up |
| --- | ---: | ---: | ---: |
| `refero_search_styles` — rank 1,342 summaries | 15.5 ms | 12.6 ms | 1.2× |
| `refero_index_status` | 27.9 ms | 0.15 ms | **186×** |
| `expand` scan when everything is cached | 49.0 ms | 0.10 ms | **490×** |
| First call in a process | 372 ms | 70 ms | 5.3× |

```
speed-up, log scale

 490x  ████████████████████████████████████████   expand scan, all cached
 186x  ██████████████████████████████████         refero_index_status
 5.3x  ███████████                                first call in a process
 1.2x  █                                          rank 1,342 summaries
```

Two honest notes on those numbers.

**The ranking barely moved, and that is deliberate.** It was measured before
being optimised: at ~13 ms across the whole catalogue it was never the
bottleneck, so the scorer was left alone rather than tuned against a guess.

**The first call in a process is dominated by one sitemap request**, not by the
disk. That fetch is what makes coverage honest, and it is why it happens once
rather than per call.

<sub>Median of 15 runs on an Intel i9-12900F / Linux / Node 22, against a warm
local cache holding 26 of 1,342 published styles. "Before" is the previous
implementation, measured in the same session on the same machine. Your numbers
will differ; the ratio is the point, not the milliseconds.</sub>

## Tools

| Tool | Purpose |
| --- | --- |
| `refero_index_status` | Published styles vs. locally indexed styles |
| `refero_search_styles` | Free-text search over names, north stars, colours, fonts, URLs |
| `refero_match_style` | Ranks styles against a prose design brief |
| `refero_get_design_md` | Renders a style as `design.md`, by section |
| `refero_get_style` | Parsed design system plus measured tokens, as JSON |
| `refero_list_style_ids` | Style UUIDs from the sitemap, without reading any page |

Every tool declares all four MCP behavioural hints — `readOnlyHint: true`,
`destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`. None of
them mutates the origin, the cache, or anything the caller owns; all of them can
read `styles.refero.design`. Clients that gate on these get an accurate answer
without having to infer it.

A resource, `refero://style/{id}/design.md`, is exposed for clients that prefer
resource reads over tool calls.

### Sections

`refero_get_design_md` takes `sections`, and **honours it**:

```
overview · colors · typography · type_scale · spacing · surfaces
imagery · principles · components · similar · custom
```

Sections with no data are dropped rather than rendered as empty headings.

## Installation

```bash
npm install -g @darcas/refero-design-mcp
```

Installs the `refero-design-mcp` command — the binary name stays unscoped, so
client configs stay short.

**Requires Node ≥ 22.12.** Node 20 reached end-of-life on 2026-04-30, so 1.1.0
drops it; npm reports `EBADENGINE` on an older runtime. Everything else about
installing and running is unchanged.

### Configuration

Point a client at the binary, either installed globally or run on demand:

```jsonc
{
  "mcp": {
    "servers": {
      // installed with `npm install -g @darcas/refero-design-mcp`
      "refero": {
        "command": ["refero-design-mcp"]
      },
      // or run on demand — no install step, first run downloads the package
      "refero-on-demand": {
        "command": ["npx", "-y", "@darcas/refero-design-mcp"]
      }
    }
  }
}
```

`-y` suppresses the install prompt, which would otherwise block startup. The
`npx` form starts in about 2s on a cold cache and under 1s once cached; the
global form starts immediately and needs no network. Either works, and the
server behaves identically.

The package is scoped but the binary is not, so the command is
`refero-design-mcp` with no `@darcas/` prefix.

Transport is stdio. Diagnostics go to stderr only — stdout carries JSON-RPC
frames and nothing else. A server started by hand (`npm start`) will appear to
hang: it is waiting for a client on stdin, which is correct behaviour.

### Environment variables

Every setting is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `REFERO_SITE_URL` | `https://styles.refero.design` | Origin base URL |
| `REFERO_STYLES_SITEMAP` | `{site}/sitemaps/styles.xml` | Style index |
| `REFERO_MAX_FETCHES` | `25` | Max page fetches per tool call |
| `REFERO_CONCURRENCY` | `4` | Max simultaneous requests |
| `REFERO_TIMEOUT_MS` | `30000` | Per-request timeout |
| `REFERO_CACHE_TTL_MS` | `604800000` | Cache freshness window (7 days) |
| `REFERO_CACHE_DIR` | `~/.cache/refero-design-mcp` | On-disk cache location |
| `REFERO_USER_AGENT` | see `src/config.ts` | Request identification |
| `REFERO_MAX_RESPONSE_CHARS` | `40000` | Response budget |
| `REFERO_VERBOSE` | `false` | Diagnostics to stderr |

## Example session

```jsonc
// The model calls these in sequence
{
  "name": "refero_index_status",
  "arguments": {}
}
// → "Published styles: 1342 / Indexed locally: 1 / Coverage: <1% (1 styles)"

{
  "name": "refero_match_style",
  "arguments": {
    "brief": "dark, dense dashboard for engineers"
  }
}
// → ranked styles, each with matched terms and the north star that drove the match

{
  "name": "refero_get_design_md",
  "arguments": {
    "style_id": "a73148b9-449b-42cd-9f38-86ef694f500e",
    "sections": ["overview", "colors", "typography"]
  }
}
// → # Apple, with the palette table and type scale
```

## How styles are indexed

```
sitemaps/styles.xml  →  list of ids + lastmod        (small, fetched once)
        ↓
/style/{id}          →  Next.js RSC payload in HTML  (~300 KB, fetched on demand)
        ↓
result.meta / result.raw / result.designSystem         (parsed, validated, cached)
```

The style record is located by `styleId`. A page embeds a dozen or more related
styles that share the same key names, so anchoring on the id is what prevents
returning a neighbour's palette.

The RSC format is internal to Next.js and may change. Every failure surfaces as
a typed error rather than a partially-filled object that looks like a valid
answer.

## Development

```bash
npm install
npm run dev        # watch mode
npm run verify     # typecheck + lint + test + build
```

| Script | Action |
| --- | --- |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, type-aware rules |
| `npm test` | Vitest |
| `npm run verify` | All of the above, in order |
| `npm run clean` | Remove `dist/` |
| `npm run deploy` | Test, build, then publish to npm |

## Testing

74 tests across 7 files.

Unit tests run **offline**, against a hand-assembled sample of a real RSC
payload — the fragile parts (id anchoring, brace matching, lazy reference
detection) are exactly the parts worth pinning.

`test/e2e.test.ts` drives the server against the live site and skips itself when
the origin is unreachable. The reachability probe runs at module load rather
than in a hook, because `describe.skipIf` is evaluated during collection: a
probe in `beforeAll` leaves every test silently skipped, which is
indistinguishable from a passing suite.

## Design notes

- **Schemas derived from real payloads, not from documentation.** `spacing.radius`
  is a per-element map (`{cards: "28px", buttons: "9999px"}`), not a string.
  `similar` is `[{business, why}]` on current styles but bare strings on older
  ones. `surfaces` is `{hex, name, level, purpose}`. A `typeScale` size arrives
  as `"17"` on one style and `17` on the next, and is normalised to a string at
  the boundary. Every schema is permissive about type and strict about presence,
  so a partial document degrades instead of throwing away a whole design system.
- **Measured and curated data are both kept.** `result.raw` holds tokens with
  usage frequency and context; `result.designSystem` holds the curated reading.
  Frequency is what separates a signature colour from an incidental one.
- **Truncation respects structure.** Cutting markdown with `slice(0, n)` slices
  code fences in half, which makes the model read broken CSS as if it were the
  design. This server trims on a structural boundary instead, and closes any
  fence it opens, so a shortened document is still valid. Every path that caps a
  response goes through that helper, including `refero_get_design_md`.
- **A malformed `style_id` never costs a request.** Ids are checked against the
  UUID shape before anything reaches the network or the cache directory, so a
  wrong id returns an error naming the tool that lists valid ones instead of a
  bare `404`.
- **Conditional requests everywhere,** so a repeat call usually costs a 304.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

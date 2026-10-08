# Refero MCP tools

Generated from `src/` at v1.2.0, not from the README. If the two ever disagree,
`src/` is the truth and this file is the thing that must be regenerated.

Six tools and one resource. Every tool is read-only, idempotent and open-world:
it can read `styles.refero.design`, and a warm cache is one miss away from a
fetch. None of them mutates the origin, the cache, or anything you own.

## Two facts that change how you call these

**The local index is partial and grows on demand.** A style page is a few hundred
KB and the catalogue is over a thousand of them, so nothing is indexed until it
is needed. "No styles matched" therefore means *"I looked at N of M"*, not
*"nothing exists"*. Every search and match response states its own coverage; read
it before concluding anything from an empty result.

**Responses are size-capped.** `refero_get_design_md` truncates on a structural
boundary at `REFERO_MAX_RESPONSE_CHARS` (default 40 000). Pass `sections` to ask
for less; a truncated document is valid markdown but an incomplete one.

---

## `refero_index_status`

Coverage. Call it before you conclude that a style does not exist.

**Arguments:** none.

**Output** — plain text:

```
Refero index status (server version 1.2.0)

- Published styles: 1342
- Indexed locally: 26
- Coverage: 2% (26 styles)
- Sitemap last read: never

Search and match results reflect local coverage only. Raise `expand` on those
tools to index more styles.
```

Below 1% the coverage line reads `<1% (N styles)` rather than a rounded zero,
so a partially warmed index is never reported as an empty one.

**Limitations:** one sitemap fetch per process, memoised for 6 h.

---

## `refero_match_style`

Ranks styles against a **prose** brief. Use this when the request is
qualitative — "a dense, data-heavy dashboard for engineers" — rather than a
style you can name.

**Arguments**

| Argument | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `brief` | string, min length 1 | yes | — | The description of the interface you are building |
| `limit` | integer, 1–20 | no | `3` | Maximum matches |
| `expand` | integer, 0–500 | no | `50` | Uncached styles pulled into the index before ranking |

**Output** — one `##` block per candidate, ranked, with the score, the terms that
triggered the match, and the style's north-star statement. Ends with what the
index expansion achieved and a pointer to `refero_get_design_md`.

```jsonc
{ "name": "refero_match_style", "arguments": {
  "brief": "dark, dense dashboard for engineers",
  "limit": 3
}}
```

**Limitations:** ranks only what is indexed; the score counts literal and
mood-facet hits and a zero score is dropped rather than ranked last. A brief with
no searchable word ("the", "and") returns an error rather than an empty ranking.
Every call may fetch up to `REFERO_MAX_FETCHES` pages.

---

## `refero_search_styles`

Free-text search over names, north-star statements, colours, fonts and URLs, on
word boundaries. Use this for **concrete** terms — a colour, a font, a mood noun
— where you can already name what you are looking for.

**Arguments**

| Argument | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `query` | string, min length 1 | yes | — | e.g. `"minimal ecommerce"`, `"brutalist mono"` |
| `limit` | integer, 1–50 | no | `5` | Maximum results |
| `expand` | integer, 0–500 | no | `25` | Uncached styles pulled into the index before ranking |

**Output** — `Found N matching style(s), from S searched of P published.`, the
expansion report, then one `###` block per hit carrying the site name, the style
id, the colour scheme, the fonts, a swatch list, the source URL and the style
page URL.

**Limitations:** word boundaries, so `"dark mode"` does not match `"darkmode"`.
A miss is a statement about the index, not the catalogue.

---

## `refero_get_design_md`

One style rendered as a `design.md` document. This is the tool that feeds a
written design direction.

**Arguments**

| Argument | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `style_id` | UUID string | yes | — | e.g. `"a73148b9-449b-42cd-9f38-86ef694f500e"` |
| `sections` | array of section names | no | all | Any order; rendered in canonical order |
| `refresh` | boolean | no | `false` | Bypass the cache, still a conditional request |

`sections` values, complete and exact:

```
overview · colors · typography · type_scale · spacing · surfaces
imagery · principles · components · similar · custom
```

Start with `overview`, `colors`, `typography`; add `type_scale`, `spacing`,
`surfaces`, `components`, `principles` only when the direction needs them.

**Output** — markdown: an `# {style name}` title from `overview`, then `##`
headings for each requested section that has data. **A section with no data is
dropped, not rendered empty** — absence is a fact about the style, and a missing
`spacing` section means the style did not publish spacing, not that it was
forgotten. If nothing renders, the document says so.

```jsonc
{ "name": "refero_get_design_md", "arguments": {
  "style_id": "a73148b9-449b-42cd-9f38-86ef694f500e",
  "sections": ["overview", "colors", "typography"]
}}
```

**Limitations:** the `style_id` is validated as a UUID before anything reaches
the network or the cache directory. Select by id, **never by position** — a
style page embeds ten to twenty related styles with identical key names, and the
wrong one returns a neighbour's palette with no error. Do not loop over a list of
ids; that is a bulk crawl of a third-party site.

---

## `refero_get_style`

The same style as JSON: the parsed design system plus the measured tokens
scraped from the live page. Use this when you need **exact** values rather than
prose — a specific hex, a weight, a radius.

**Arguments**

| Argument | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `style_id` | UUID string | yes | — | |
| `include_measured_tokens` | boolean | no | `true` | Set `false` to drop the `raw` block |
| `refresh` | boolean | no | `false` | Bypass the cache, still a conditional request |

**Output** — one JSON object:

| Key | What it holds |
| --- | --- |
| `summary` | Site name, id, colour scheme, fonts, colours, north star, URLs |
| `designSystem` | The curated reading: colours, typography, type scale, spacing, surfaces, imagery, principles, components, similar, custom |
| `raw` | Measured tokens, each with `frequency` and `contexts` |
| `cachedAt` | When the cache entry was written |
| `lastmod` | `lastmod` from the sitemap, when known |

`raw` is where **two kinds of data** live side by side. `designSystem` is a
curated interpretation; `raw` is what the page actually does, counted. Every
token carries a `frequency` and the `contexts` it appears in, and that frequency
is what separates a **signature** colour — the one the style is built around —
from an **incidental** one that appears once in a footer. When exact values
matter, read `frequency` and prefer the high-frequency token; when intent
matters, read `designSystem`.

**Limitations:** no response budget — the largest cached payload is around
50 KB of JSON. `spacing.radius` is a per-element map, not a string. A
`typeScale` size can arrive as `"17"` or `17` and is normalised to a string.

---

## `refero_list_style_ids`

Style UUIDs and their `lastmod` straight from the public sitemap. Reads no style
page, so it costs one small request.

**Arguments**

| Argument | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `offset` | integer ≥ 0 | no | `0` | Index into the filtered list |
| `limit` | integer, 1–200 | no | `50` | |
| `updated_since` | ISO date string | no | — | Only styles modified after this date |

**Output** — a count line, then one `- \`uuid\`` per entry with its `lastmod`.
An unparseable `updated_since` means *no filter* rather than an empty page, so a
silent "nothing matched" is never ambiguous.

**Limitations:** this is the enumeration tool, and it is the one you must not
feed into a loop. Listing ids is cheap; fetching every style behind them is not.

---

## Resource: `refero://style/{style_id}/design.md`

The same document as `refero_get_design_md`, as a readable resource, for clients
that prefer resource reads. MIME type `text/markdown`.

The placeholder is `style_id`. Listing it advertises up to 50 entries drawn from
what is already indexed — a preview, not the catalogue. The id in the URI is
validated as a UUID before it reaches the cache directory.

---

## Typed errors

Tools return errors as text with a recovery hint rather than throwing, so you get
advice instead of a protocol error.

| Message | What it means | What to do |
| --- | --- | --- |
| `"…" is not a style id.` | The id is not a UUID. No request was made | `refero_list_style_ids` to find valid ones |
| `Style … was not found.` | The origin answered 404 | Check `refero_list_style_ids` |
| `Style … could not be parsed: …` | The page structure changed at the origin | Not recoverable; report it |
| `While fetching style …` | Network failure, timeout, or a rate limit | Retry; the cache falls back to stale on failure |
| `The brief contained no searchable words.` | `brief` had only stopwords | Use concrete words: "editorial", "dense", "playful" |

---

## Environment variables

What an agent can observe depends on these. All are optional; an unparseable or
negative integer **throws at startup** rather than silently defaulting.

| Variable | Default | Effect on your research |
| --- | --- | --- |
| `REFERO_MAX_FETCHES` | `25` | Hard ceiling on page fetches per tool call. This is why a single `expand` cannot index everything |
| `REFERO_MAX_RESPONSE_CHARS` | `40000` | Budget before `refero_get_design_md` truncates |
| `REFERO_CACHE_TTL_MS` | `604800000` (7 days) | How long a cached style is served without revalidation |
| `REFERO_CONCURRENCY` | `4` | Simultaneous requests; politeness ceiling |
| `REFERO_TIMEOUT_MS` | `30000` | Per-request timeout |
| `REFERO_SITE_URL` | `https://styles.refero.design` | Origin base |
| `REFERO_STYLES_SITEMAP` | `{site}/sitemaps/styles.xml` | Style index |
| `REFERO_CACHE_DIR` | `~/.cache/refero-design-mcp` | On-disk cache |
| `REFERO_USER_AGENT` | `refero-design-mcp/<version> (+repo URL)` | Request identification |
| `REFERO_VERBOSE` | `false` | Diagnostics to stderr; quiet is normal |

There is no hardcoded style count anywhere, because it changes. The coverage
*rule* is what travels: never conclude a style is absent from a low-coverage
result.

## Tool names in this document

Written unprefixed. Some clients namespace MCP tools (`mcp_refero_index_status`,
`refero_index_status`), so match on the `refero_*` suffix rather than on an exact
string.

---

Generated from refero-design-mcp @ 1.2.0, 2026-10-08

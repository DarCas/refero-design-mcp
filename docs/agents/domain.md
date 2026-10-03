# Domain — the extracted data

## Where the data comes from

`styles.refero.design` publishes style pages as Next.js App Router documents.
The authoritative payload is a React Server Component stream embedded in the
HTML:

```
self.__next_f.push([1, "<escaped chunk>"])
```

`decodeFlightPayload()` concatenates the decoded chunks, and inside that text
blob the style's record appears as ordinary JSON:

```
{ styleId, result: { meta, raw, designSystem, screenshot }, … }
```

The format is internal to Next.js and may change without notice. So every
failure is a typed `ExtractionError` with a machine-readable `reason`:

| `reason` | Meaning |
| --- | --- |
| `no-flight-payload` | No `__next_f.push` chunks at all — the page structure changed |
| `no-style-record` | Chunks decoded, but no record with this `styleId` |
| `malformed-json` | Brace matching hit something unparseable |
| `schema-mismatch` | The record does not satisfy the zod schemas |

Tools must keep these distinct. "No such style" and "could not parse" call for
different recovery advice, and a conflating message sends the user to check the
wrong thing.

## Field shapes are empirical, not documented

Derived by inspecting real style pages. Where a plausible guess disagrees with
this file, this file is right. Two rules explain the whole schema style:

- **Permissive about type, strict about presence.** The same key arrives as a
  string on one style and a number on the next, `null` appears where a value is
  expected, and whole sub-objects change shape between sites. A partial document
  must degrade, not throw away an entire design system. That is why nearly every
  field is `.optional()`, `.nullish()` or `.default(…)`, and why the objects are
  `.passthrough()`.
- **The `measurement` helper normalizes at the boundary.** Every numeric-looking
  field passes through `string | number` → trimmed string, with `''` collapsed to
  `undefined`. A `typeScale` size is `"16px"` on one style and `16` on the next;
  after validation it is always the former.

Things that are *not* what they look like:

- `spacing.radius` is a **per-element map** (`{cards: "28px", buttons: "9999px"}`)
  on most styles, but a bare measurement on others — the schema is a union, not
  an object.
- `spacing.pageMaxWidth` can be `null`.
- `similar` is `[{business, why}]` on current styles, but bare strings on older
  ones — the schema is a union, not `string[]`.
- `surfaces[]` is `{hex, name, level, purpose}`, and `level` may be a number.
- `typography[]` is `{family, role, sizes, weight, lineHeight, letterSpacing, substitute}`.
- There is no `designSystem.elevation`. The field is `elevationPhilosophy`.
- `colors[]` carries `{hex, name, role, group}`.
- `customSections[].content` may be `"$1e"` — a React Flight lazy reference, not
  prose. `isFlightReference()` detects `$<alnum>` and the renderer **drops** the
  section rather than printing the reference.
- `result.raw` and `result.designSystem` are different payloads and disagree in
  shape. Do not merge them.

## Curated vs measured

Both are kept, because they answer different questions.

- `designSystem` — the curated reading. What the designers intended: roles,
  north star, dos/donts, surfaces, principles.
- `raw` — tokens scraped from the live site, carrying `frequency` and
  `contexts` per colour, font, radius and spacing token. Frequency is what
  separates a signature colour from an incidental one.

`refero_get_style` returns both, or the curated half alone when
`include_measured_tokens: false`.

## Coverage

The catalogue is ~1,342 published styles; a style page is a few hundred KB, so
indexing all of them up front would be ~400 MB of traffic on a cold start. The
store therefore grows lazily: the sitemap says which styles exist, and a page is
fetched only when something asks for that style.

That makes "I found no matches" ambiguous — it usually means *I looked at 30 of
1,342*. Coverage is therefore reported in every result, and
`refero_index_status` exists so the model can check before concluding a style is
absent. `sitemaps/collections.xml` (52 entries) is published and entirely unused.

## Document sections

`SECTIONS` is the ordered contract for `refero_get_design_md`:

```
overview · colors · typography · type_scale · spacing · surfaces
imagery · principles · components · similar · custom
```

Rendered headings are `SECTION_TITLES` in `src/core/designMd.ts`, and they do
not match the section keys — several are British or reworded:

| Key | Heading |
| --- | --- |
| `overview` | Overview |
| `colors` | Colours |
| `typography` | Typography |
| `type_scale` | Type scale |
| `spacing` | Spacing and radius |
| `surfaces` | Surfaces |
| `imagery` | Imagery |
| `principles` | Do / Don't |
| `components` | Components |
| `similar` | Related references |
| `custom` | Notes |

Sections with no data are dropped rather than rendered as empty headings.
Requested sections are honoured — this is asserted in the tool description and
pinned by the e2e suite, which asserts `## Colours`.

## Truncation

`truncateMarkdown()` cuts on a structural boundary and closes any code fence it
opens. `slice(0, n)` on markdown halves code fences, and a model reads the broken
CSS as design intent. The budget is `REFERO_MAX_RESPONSE_CHARS` (default 40,000).
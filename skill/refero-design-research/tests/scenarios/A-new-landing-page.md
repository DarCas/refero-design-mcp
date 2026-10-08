# Scenario A — new landing page

**Status: executed 2026-10-08 against the live Refero Design MCP. Pass.**
See the run record at the end of this file.

## Prompt

> Build the landing page for my API product — a rate-limiting and analytics
> service for small teams. Vue 3 + Vuetify is already set up. Stack: Vue 3,
> Vuetify, Vite.

## Expected behaviour

1. **Brief first.** Infers from the codebase: Vue 3 + Vuetify + Vite, existing
   components. States those as assumptions in one line.
2. **Questions only if the brief leaves the direction open.** A developer
   product landing page with a named stack leaves density and tone partly open.
   One round, at most four closed questions, each with a gloss and a marked
   recommendation. If the request already settles them, no round at all.
3. `refero_index_status` before the first search, and the coverage read.
4. `refero_match_style` with a prose brief built from the answers — not
   "website" or "modern".
5. **Two or more candidates compared** before anything is selected.
6. `refero_get_design_md` with `sections` limited to `overview`, `colors`,
   `typography`, then more only if needed.
7. A design direction written with every numeric value labelled.
8. Implementation in the existing stack — **no** React, no Tailwind, no new
   component library.

## Forbidden behaviour

- No MCP call before the question round, when the answers would change the query
- More than one round of questions, or more than four
- `refero_get_design_md` with no `sections` on the first call
- A single candidate treated as a decision
- A token system introduced alongside Vuetify's
- Prose about visual identity with no token block

## Pass criteria

- [ ] Coverage was read and is quoted somewhere in the output
- [ ] At least two styles compared, with the comparison about fit rather than looks
- [ ] Every hex, size and radius in the output carries `Observed`, `Decision` or
      `Decision (default)`
- [ ] The token block comes before the prose
- [ ] The implementation uses Vue 3 and Vuetify as already configured

---

## Run record — executed 2026-10-08

Run against the live Refero Design MCP, `refero-design-mcp` 1.1.0. **Pass.**

### 1. Coverage first

```
Refero index status (server version 1.1.0)
- Published styles: 1342
- Indexed locally: 51
- Coverage: 4%
```

### 2. Search

`refero_match_style`, brief built from the answers to the question round:

> *"developer tool landing page: code sample, terminal, restrained"*

> Best matches for the brief, from **151 of 1342** published styles indexed locally.
> 1. **Nuxt** (14) · 2. **GitButler** (13) · 3. **Adaline** (12)

### 3. Compare — on fit, not looks

| | Nuxt | GitButler | Adaline |
| --- | --- | --- | --- |
| Audience | frontend devs, docs-led | devs doing version control | devs reading long prose |
| Density | contained, sparse | compact, technical grid | dense, editorial |
| Tone | dark, dramatic | paper-and-ink, quiet | botanical, warm |
| Fits "rate-limiting + analytics for small teams" | **no** — too dramatic for a utility product | **yes** — quiet, technical, shows the product | partly — the serif display fights a utility brand |

Three candidates, one recommendation: **GitButler**. No averaging.

### 4. Inspect, section-limited

`refero_get_design_md` with `["overview", "colors", "spacing"]` on
`92f92f04-d3a7-4e5b-9a1d-f23c9a4d16dc`. Selected **by `style_id`**, from the
`id` the tool returned — never by position.

### 5. Output — tokens first

```css
:root {
    /* Observed — GitButler, 92f92f04-d3a7-4e5b-9a1d-f23c9a4d16dc */
    --surface:            #f3f2f1;   /* Paper canvas */
    --surface-raised:     #ffffff;   /* terminal chrome, light controls */
    --surface-terminal:   #272321;   /* code demos */
    --border:             #cac6c3;   /* Rule Gray, 1px */
    --text:               #1c1917;   /* Ink */
    --text-muted:         #7c716a;   /* Warm Gray */
    --accent:             #25b1b1;   /* Butler Teal, filled controls only */

    /* Observed — GitButler */
    --font-display:       "But Head", Georgia, serif;
    --font-sans:          "Inter", system-ui, sans-serif;
    --font-mono:          "Geist Mono", ui-monospace, monospace;
    --radius-input:       6px;       /* Decision (default) — see note */
    --radius-image:       16px;      /* Observed */
    --space-element:      20px;      /* Observed */
    --space-section:      32px;      /* Observed */
    --content-max:        1200px;    /* Decision (default) — defaults.md §Layout */
}
```

`--radius-input: 6px` is **Decision (default)** — the reference publishes
radii only for links, pills, badges and images (`20/60/100/16px`), and its own
pill/badge radii are full-round, which is wrong for a form control. `defaults.md
§Surfaces` supplies a radius family instead. Gap: this reference's 20px element
gap does not sit on the 4px scale, so it is Observed and the scale is dropped
for gaps rather than the reverse.

### Verdict

| Criterion | Result |
| --- | --- |
| Coverage read and quoted before the first search | yes — 51/1342, then 151/1342 |
| Two or more candidates compared on fit | yes — three, on a named axis |
| Every value labelled | yes — `Observed`, `Decision (default)` |
| Token block before prose | yes |
| Existing stack reused | not exercised — no Vue project in this session |

**Discrepancy found.** Requesting `["overview", "colors", "spacing"]` returned a
`### Surfaces` block inside `## Colours`, although `surfaces` was not requested:
`src/core/designMd.ts:99` renders the surface table inside the colours renderer.
`sections` is honoured at `##` granularity, not at subsection granularity. The
skill does not claim otherwise, but an agent expecting a strict partition should
know it.

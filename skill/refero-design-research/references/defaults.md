# Defaults

Fallback rules, applied **only where the MCP returned nothing usable**.

Each rule is a fixed value or a fixed procedure, never a matter of taste. That
is the whole point: the audience of this skill cannot choose a good palette, so
where there is no evidence, they get a rule rather than an opinion.

- A default **never** overrides an Observed value. Observed wins, always.
- Every value that comes from this file is labelled `Decision (default)` in the
  output, so nobody downstream mistakes a rule for evidence.
- These are conservative starting points, not a house style. The first Observed
  value to arrive replaces the matching default and the label changes with it.

---

## Colour

**Rule.** One neutral ramp, one accent, three semantic colours.

| Role | Rule |
| --- | --- |
| Neutral ramp | 5–8 steps from near-background to near-foreground. Name them by role (`--surface`, `--surface-raised`, `--border`, `--text-muted`, `--text`), never by hue |
| Accent | One. Used for a single dominant action and its states — roughly **one tenth of the visible surface**. If the accent appears on most cards, it is wrong |
| Semantic | Exactly three: `success`, `warning`, `danger`. Never a fourth, and never a semantic colour used decoratively |
| Dark theme | Only if the user asks for it. Never both by default |

**Why:** a palette with a small accent reads as designed; a palette where
everything is coloured reads as undecided. The one-tenth rule is what keeps an
accent an accent.

**When this rule is wrong:** the brief names a brand palette, the design system
publishes more than one accent, or the product is genuinely multi-brand. Then the
Observed values stand and this rule does not apply.

---

## Contrast

**Rule** — WCAG 2.2 Level AA, verified against the current specification:

| What | Minimum | Criterion |
| --- | --- | --- |
| Body text | **4.5:1** against its background | SC 1.4.3 Contrast (Minimum) |
| Large-scale text | **3:1** | SC 1.4.3 |
| UI components and their states, meaningful graphics, focus indicators | **3:1** against adjacent colours | SC 1.4.11 Non-text Contrast |

Large-scale text is 18 pt (24 px), or 14 pt bold (~18.7 px). Ratios are
**thresholds, not targets**: 4.49:1 fails. Do not round a computed ratio up to
reach a threshold. Disabled, inactive components are exempt.

**Why:** these are the two numbers the spec commits to, and every agent
hallucinates a plausible-looking third one. Cite them, check them.

---

## Typography

**Rule.**

| Property | Default |
| --- | --- |
| Families | At most **two**. One is usually enough — a display face plus the body face it was paired with |
| Body size | `16px` |
| Body line height | ~`1.5` |
| Heading line height | ~`1.2` |
| Scale | A modular scale with a ratio between **1.2 and 1.25** |
| Sizes per screen | At most **four** distinct sizes |

A 1.2–1.25 ratio is the narrow band where headings read as related to body text
without collapsing into each other. Larger ratios need a specific typeface to
survive them, and that is Observed territory, not a default.

**When this rule is wrong:** the style's measured type scale is available and the
brief does not contradict it. Then use the Observed scale.

---

## Spacing

**Rule.** One base unit — `4px` — and a short multiplicative scale:

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
```

Every gap, padding and margin in the interface comes from that scale. No `13px`,
no `30px`, no value invented at the call site. A gap that is not on the scale is
a decision, and decisions get written down.

**Why:** this is the single highest-value default. Inconsistent spacing is the
most visible sign of a UI nobody designed.

---

## Surfaces

**Rule.**

| Property | Default |
| --- | --- |
| Radius family | One family, e.g. `4px` and `8px`. Two values maximum |
| Shadow levels | At most two — one for resting elevation, one for overlay |
| Separation in dense UI | **Borders, not shadows.** A 1px border separates better than a shadow and survives a light theme |
| Dividers | 1px, in the neutral ramp's border step |

**Why:** shadows accumulate. Two levels cannot fight each other; five always do.

---

## Layout

**Rule.** One content max-width, one grid, one page padding — used everywhere.

| Property | Default |
| --- | --- |
| Content max-width | One value for the whole product (e.g. `1200px`) |
| Grid | One column count and gap for the main layout |
| Page padding | One value, scaling down at narrow widths |
| Breakpoints | Two, or three. Not one per component |

---

## Interaction

**Rule.** Every interactive element has four states, defined once and reused:

`default` · `hover` · `focus-visible` · `disabled`

- **The focus ring is never removed.** `outline: none` without a replacement is a
  failure, not a style choice. If the default ring clashes, replace it with
  something at least 3:1 against adjacent colours.
- Hover may change the background by a small step. Hover is not a licence to add
  a shadow, a scale transform and a colour change at once.
- Disabled is a distinct step down in contrast — visible, and clearly inactive.

---

## What these defaults are not

They are not a brand, and they are not a style. Two products using only this file
will look like siblings, which is the intended outcome: consistent and forgettable
is a better starting point than confident and incoherent.

The moment the MCP returns a real value for a slot, that value is Observed, the
default is gone, and the label says which it is. Evidence replaces rules; rules
only fill the holes.

# Design output

What "done researching" looks like. The first artefact is a **paste-ready token
block in the project's own format**. Prose comes second.

The order is not a style preference. A developer can act on a token block
immediately, and a paragraph about visual identity can only be acted on after
someone has already decided what to build.

---

## The rule that makes the document auditable

**Every numeric value carries one of three labels.**

| Label | Means | Requires |
| --- | --- | --- |
| `Observed` | The MCP returned it | The source style name **and** its id |
| `Decision` | You chose it | A one-line reason in plain words |
| `Decision (default)` | It came from `defaults.md` because there was no evidence | Which rule from `defaults.md` |

An unlabelled number is a defect. So is an `Observed` label on a value the MCP
did not return — that is fabrication wearing a citation, and it is worse than an
unlabelled value because it survives a skim.

Gloss a design term **the first time you use it**. This audience does not know
what "surface" or "elevation" means. `surface — the background a panel sits on`.
Once, in the margin, then the normal word is fine.

---

## Part 1 — The tokens

One block, in the format the project already uses:

- **CSS custom properties** by default
- the **existing Tailwind or theme config** if the project has one
- **never a third format.** A second token system is a migration.

Every name is a **role**, not a hue. `--color-primary-500` describes where a
colour sits in a scale; `--button-bg` describes what it is for. Roles survive a
palette change; hues do not.

```css
:root {
    /* ── colour ─────────────────────────────────────────────── */
    /* Observed — "Linear", 8f9aa9-1c4b-4f0e-9d2a-6b3e11c7d5a4 */
    --surface:            #0f1115;
    --surface-raised:     #161a21;
    --border:             #262b35;
    --text:               #e6e9ef;
    --text-muted:         #8b93a3;

    /* Observed — "Linear" */
    --accent:             #5b6ef5;
    --accent-hover:       #7a88f7;

    /* Decision (default) — defaults.md §Colour: exactly three semantic */
    --success:            #2f9e63;
    --warning:            #b8860b;
    --danger:             #d1435b;

    /* ── type ───────────────────────────────────────────────── */
    /* Observed — "Linear" */
    --font-sans:          "Inter", system-ui, sans-serif;
    --font-mono:          "JetBrains Mono", ui-monospace, monospace;
    --text-xs:            12px;   /* labels, table meta */
    --text-sm:            14px;   /* dense table body */
    --text-base:          16px;   /* body */
    --text-lg:            20px;   /* section headings */

    /* ── spacing ────────────────────────────────────────────── */
    /* Decision (default) — defaults.md §Spacing: 4px base */
    --space-1:            4px;
    --space-2:            8px;
    --space-3:           12px;
    --space-4:           16px;
    --space-6:           24px;
    --space-8:           32px;
    --space-12:          48px;

    /* ── surfaces ───────────────────────────────────────────── */
    /* Decision (default) — defaults.md §Surfaces: one radius family */
    --radius-sm:          4px;
    --radius-md:          8px;
    --shadow-raised:      0 1px 2px rgb(0 0 0 / 40%);

    /* ── layout ─────────────────────────────────────────────── */
    --content-max:        1440px;
    --page-padding:       24px;
}
```

Then the components that use them, in the project's own component style, and
nothing that invents a new primitive.

---

## Part 2 — The prose

Ordered so each section can only be read after the one before it has been
settled. Each decision gets a one-line reason; no exceptions.

### Design direction

Two or three sentences. What kind of interface this is, who it is for, and the
single strongest visual commitment. If the strongest commitment cannot be named
in a sentence, the research has not converged.

### Source research

What was actually consulted, and what it did and did not settle.

| Style | Id | Why it was shortlisted | What was taken from it |
| --- | --- | --- | --- |
| Linear | `8f9aa9-…` | Density matched an ops console; dark is native to the audience | Type scale, spacing rhythm, surface layering |

Then one line on the coverage: which styles were searched, of how many published.
This is the line that makes "we found nothing better" a claim instead of an
assertion.

### Tokens

The block above, inlined or linked. The first thing in the document after the
direction, because it is the part the developer pastes.

### Visual language

Two or three sentences on the whole: the relationship between density and
whitespace, where the emphasis sits, what the interface feels like to operate.

### Colour

Roles, not a swatch dump. For each role: the value, its label, and one line on
what it is for.

> `--accent` — `Observed` (Linear). The single dominant action per view.
> `Decision`: used on one primary button per screen and on active nav state, and
> nowhere else. An accent on every card stops being an accent.

State the accent's share of the surface. If it is more than roughly a tenth,
that is a decision to justify.

### Typography

The families and why. The scale and the ratio. The four sizes a screen is allowed
to use. Where each size applies.

### Spacing

The scale, the base unit, and where the larger steps are allowed — inside a card
versus between sections. "Every gap comes from this scale" is the requirement.

### Layout

Max-width, grid, page padding, breakpoints. One line on how the layout responds
at narrow widths.

### Surfaces

Elevation levels, radii, borders. Which one separates what.

### Components

The components being built, with the tokens each one consumes. Anything not
listed here does not get built.

### Interaction

States per component: default, hover, focus-visible, disabled. The focus ring is
never removed. Any motion, with duration and easing, and what it is for.

### Accessibility

The measurable checks, stated as pass criteria:

- every text pair meets 4.5:1, or 3:1 for large-scale text (WCAG 2.2 SC 1.4.3)
- component boundaries, states and focus indicators meet 3:1 (SC 1.4.11)
- every interactive element has a visible focus state
- every control has an accessible name
- colour is never the only carrier of meaning

### Do / Don't

Short, concrete, and derived from the direction rather than from general taste.
Each one is a rule someone could follow without asking.

---

## `design.md` skeleton

Persist the result at project level. Do not create a second document doing the
same job.

```markdown
# Design direction — {product} {surface}

## Design direction
## Source research
## Tokens
## Visual language
## Colour
## Typography
## Spacing
## Layout
## Surfaces
## Components
## Interaction
## Accessibility
## Do
## Don't
```

Update an existing `design.md` rather than adding `design-v2.md`. If the project
has no `design.md` and the work is substantial — a new surface, a redesign — create
one. If it is a small fix, create nothing.

---

## Failure modes

| Failure | What it looks like | The fix |
| --- | --- | --- |
| Fabricated evidence | A hex quoted as `Observed` that no tool returned | Delete it, or relabel it `Decision` |
| Averaged references | A palette that is nobody's | Pick one reference and be specific |
| Default overriding evidence | `Decision (default)` on a value that had an Observed one | Restore the Observed value |
| Prose before tokens | An essay about visual identity, no values | Tokens first |
| Token dump, no roles | `--blue-500` used for a button | Rename by role |
| A second token system | Tailwind config plus a CSS variables file | One, in the format already in use |
| Everything tagged `Observed` | Every value cited, none verifiable | Cite style name **and** id, or stop citing |

A worked output using all three labels — on **synthetic** values, not Refero
data — is in `../examples/design-direction.example.md`.

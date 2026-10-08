> ## ⚠️ Fictional example — no Refero data
>
> Every style name, UUID, colour, font and measurement in this document is
> **invented for illustration**. Nothing here was returned by the Refero MCP, no
> page was fetched, and no real style is described. The `Observed` labels below
> are *demonstrations of the label*, not citations. Do not copy the values.

---

# Design direction — Deployment monitor, web app

## Design direction

An internal operations console for engineers watching deploys across services.
Dark, dense, and quiet: the interface should let a scan take under two seconds
and make anything wrong impossible to miss. The strongest commitment is **one
accent colour, reserved for the single failing state** — everything else recedes.

## Source research

| Style | Id | Why shortlisted | What was taken |
| --- | --- | --- | --- |
| Example Dark Ops | `11111111-2222-4333-8444-555555555555` *(invented)* | Density matched an ops console; dark is native to the audience | Type scale, spacing rhythm |
| Example Signal Console | `66666666-7777-4888-8999-aaaaaaaaaaaa` *(invented)* | Good state hierarchy — found vs failing reads instantly | Colour roles for status |

Coverage: 2 of 1,342 published styles were searched and inspected. Both were
shortlisted from the same brief — *"dark, dense monitoring console for
engineers"* — and nothing else scored above zero on that vocabulary. The
selected reference settled type, spacing and elevation; it did **not** settle
the status palette, which came from the second reference. Where the two
disagreed on density, the brief won: the console had to be dense.

## Tokens

```css
:root {
    /* ── colour ───────────────────────────────────────────────────
       All colour values below are synthetic. In real work each one
       carries an Observed or Decision label naming its source. */

    /* Observed — Example Dark Ops (invented id) */
    --surface:          #0d1117;
    --surface-raised:   #151b23;
    --border:           #262d38;
    --text:             #e6edf3;
    --text-muted:       #8b949e;

    /* Observed — Example Signal Console (invented id) */
    --status-ok:        #3fb950;
    --status-warn:      #d29922;
    --status-fail:      #f85149;

    /* Decision — one accent, reserved for the failing state only.
       Rationale: the accent must mean "look here", so it cannot also
       mean "primary button". */
    --accent:           #f85149;

    /* ── type ────────────────────────────────────────────────────── */
    /* Observed — Example Dark Ops (invented id) */
    --font-sans:        "Inter", system-ui, sans-serif;
    --font-mono:        "IBM Plex Mono", ui-monospace, monospace;
    --text-xs:          11px;   /* service name in a dense row */
    --text-sm:          13px;   /* table body */
    --text-base:        15px;   /* page body */
    --text-lg:          20px;   /* page heading */

    /* ── spacing ─────────────────────────────────────────────────── */
    /* Decision (default) — defaults.md §Spacing: 4px base unit,
       so an Observed 13px font still lands on the scale. */
    --space-1:          4px;
    --space-2:          8px;
    --space-3:          12px;
    --space-4:          16px;
    --space-6:          24px;
    --space-8:          32px;

    /* ── surfaces ────────────────────────────────────────────────── */
    /* Observed — Example Dark Ops (invented id) */
    --radius-sm:        3px;
    --radius-md:        6px;

    /* Decision (default) — defaults.md §Surfaces: at most two shadow
       levels. The reference published no shadows at all; one overlay
       level was added for modals. */
    --shadow-overlay:   0 8px 24px rgb(0 0 0 / 60%);

    /* ── layout ──────────────────────────────────────────────────── */
    /* Decision (default) — defaults.md §Layout: one max-width, one
       grid, one page padding. */
    --content-max:      1600px;
    --page-padding:     16px;
}
```

## Visual language

Dense and quiet. The row is the unit of attention — a service is one row, a
deploy is one row, and scanning down the left column is how the interface is
used. Whitespace is spent on separating *kinds* of thing, never on making
individual elements large.

## Colour

Colour carries **state**, and only state. There is no decorative colour.

| Role | Value | Label | For |
| --- | --- | --- | --- |
| `--surface` | `#0d1117` | Observed | The page behind everything |
| `--surface-raised` | `#151b23` | Observed | Cards, table rows, the sidebar |
| `--text-muted` | `#8b949e` | Observed | Timestamps, secondary metadata — never essential values |
| `--status-ok` | `#3fb950` | Observed | Deployed, healthy |
| `--status-warn` | `#d29922` | Observed | Degraded, retried, needs review |
| `--status-fail` | `#f85149` | Observed | Failed |
| `--accent` | `#f85149` | Decision | The failing state only |

**Decision:** the accent is the same value as `--status-fail`. One colour means
one thing in this interface. `Rationale: a second accent for "primary button"
would make "look here" ambiguous.`

Every status colour carries a text label beside it, never colour alone — see
Accessibility.

## Typography

**Observed** — two families from the reference: Inter for prose, IBM Plex Mono
for anything the user reads as machine output — service names, commit hashes,
durations, log lines.

Four sizes, no more. `Rationale: a monitoring console is read in glances; a
fifth size is one more thing to decode.`

Line height is `1.5` for body and `1.2` for the page heading, per
`defaults.md §Typography`.

## Spacing

**Decision (default)** — the 4px base scale from `defaults.md §Spacing`, applied
without exception. `Rationale: the reference's 13px row height is a font
measurement, not a spacing system; adopting it would have put every row off the
scale.`

Row padding is `--space-2`. Gap between cards is `--space-4`. Page padding is
`--page-padding`.

## Layout

**Decision (default)** — one max-width, one grid, one page padding, per
`defaults.md §Layout`.

Three regions: a fixed 240px sidebar, a service list that scrolls, and a detail
pane. Below 900px the sidebar collapses to a top bar; below 600px the detail
pane stacks under the list rather than hiding.

## Surfaces

**Observed** — no shadows in the reference at all. Separation is a 1px
`--border`. That is the right call for a dense console: shadows read as noise
when twelve rows sit next to each other.

**Decision (default)** — one shadow level, `--shadow-overlay`, used **only** for
modals. Two levels would be available under `defaults.md §Surfaces`; one is what
this interface needed.

## Components

| Component | Tokens it consumes |
| --- | --- |
| Service row | `--surface-raised`, `--border`, `--text`, `--text-xs`, `--text-sm`, `--space-2` |
| Status dot + label | `--status-ok`, `--status-warn`, `--status-fail` |
| Primary button | `--accent`, `--radius-md`, `--text-sm` |
| Filter input | `--surface-raised`, `--border`, `--text`, `--font-mono` |
| Deploy timeline | `--border`, `--text-muted`, `--space-3` |

Nothing outside this table gets built. No component introduces a value that is
not in the token block.

## Interaction

Every interactive element has four states, defined once:

| State | Treatment |
| --- | --- |
| default | As above |
| hover | `--surface-raised` one step lighter |
| focus-visible | 2px `--accent` outline, 2px offset. **Never removed** |
| disabled | 40% opacity, no hover response |

Transitions are 120ms `ease-out` on colour and border only. `Rationale: motion
in a monitoring console is noise unless it carries information, and colour
change already does.`

## Accessibility

Pass criteria, measurable:

- `--text` on `--surface` and on `--surface-raised` meet **4.5:1**
- `--text-muted` on `--surface-raised` meets **4.5:1** — it carries timestamps,
  so it is not decorative text
- status dots, borders and the focus ring meet **3:1** against adjacent colours
  (SC 1.4.11)
- every status is a dot **and** a word. Colour is never the only carrier
- the deploy timeline is keyboard-navigable; the details pane traps focus and
  returns it on close

## Do

- Give every status a word next to the dot
- Keep rows at one line until the service name must truncate
- Use the 4px scale, including where the reference disagreed
- Show the commit hash in mono — it is machine output

## Don't

- Don't add a second accent colour
- Don't introduce a shadow as decoration
- Don't use a success green for anything that is not currently deployed
- Don't animate anything that is not reporting a state change
- Don't put a summary panel where the service list belongs — the list is what
  the operator came for

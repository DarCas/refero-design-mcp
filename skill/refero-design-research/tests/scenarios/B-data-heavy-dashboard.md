# Scenario B — data-heavy dashboard

**Status: checklist.** Run when the skill's density and surface guidance is
under review.

## Prompt

> Redesign the metrics dashboard. Right now it's a mess of cards with sparklines
> and nobody can find last month's numbers. We have about 40 metrics across 12
> services and support filtering by time range and service.

## Expected behaviour

1. Density is extracted as an explicit decision, not left implicit: the brief
   implies a move from card-grid toward table-first.
2. `refero_index_status`, then a match on a **dense dashboard** vocabulary.
3. At least two candidates compared, specifically on density and on typography —
   a dense reference and a balanced one, so the trade-off is visible.
4. `sections` requested that cover the ground: `overview`, `colors`,
   `typography`, `type_scale`, `spacing`, `surfaces`.
5. `refero_get_style` consulted for exact values where a specific hex, weight or
   radius matters.
6. Output covers: **density** (explicitly stated), typographic hierarchy for
   tabular numerals, the spacing rhythm, and the surface layering — cards versus
   table versus chart frame.
7. Interaction states specified for every interactive element in the table:
   default, hover, focus-visible, disabled. Row hover is called out separately.

## Forbidden behaviour

- Card-grid density accepted when the brief describes 40 metrics
- `Decision (default)` on a value the MCP returned — the defaults are a floor
- A new chart library introduced into a project that has one
- Rows with no focus state, on the grounds that a table is not a control

## Pass criteria

- [ ] Density is a named decision with a reason, not an accident of the spacing scale
- [ ] Tabular alignment addressed (tabular numerals or a monospace value column)
- [ ] Focus state defined for row selection and for every control
- [ ] Surfaces section separates cards, table and chart frame explicitly

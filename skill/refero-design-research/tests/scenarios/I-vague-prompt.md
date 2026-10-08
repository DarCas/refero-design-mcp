# Scenario I — vague prompt from a non-designer

**Status: executed 2026-10-08 against the live Refero Design MCP. Pass.**
The primary audience scenario. If this fails, the skill does not work for the
people it was written for.

## Prompt

> Make me a nice admin panel for my API

## Expected behaviour

1. **Assumptions stated in one line** before any question: Laravel + Blade +
   Tailwind (whatever the codebase actually shows), internal operator, desktop,
   session auth.
2. **One round of at most four closed questions**, asked together. Each has 2–4
   concrete options, a one-line gloss or example per option, and a marked
   recommendation. "You choose" is offered explicitly.
3. The answers are **fed into the `refero_match_style` brief directly** rather
   than translated into design vocabulary first.
4. **A single recommended direction** after the answers, with a one-line
   plain-language reason per decision.
5. **The token block comes first** — paste-ready, in the project's existing
   format (Tailwind config if that is what is in use, otherwise CSS custom
   properties). One token system, not two.
6. Gaps filled from `../../references/defaults.md` and labelled `Decision (default)`,
   visibly, never silently.
7. Every design term glossed once, in plain words, at first use.
8. Replies in the user's language.

## Forbidden behaviour

- Open aesthetic questions: "what mood?", "what feeling?", "any preferences?"
- More than one round of questions, or more than four questions
- Asking anything the request or the codebase already answers
- Researching before asking, when the answers would change the query
- A menu of five directions instead of one recommendation
- Prose about visual identity before the token block
- A default presented as if it were evidence

## Pass criteria

- [ ] Exactly one round, ≤ 4 questions, all closed, each with a gloss and a
      marked recommendation
- [ ] "You choose" offered as a real option, not a token gesture
- [ ] Assumptions in one line before the questions
- [ ] One recommended direction, not a menu
- [ ] Token block first, in the format already in the project
- [ ] Every value labelled; at least the defaults visibly labelled
- [ ] The questions fed the search brief directly

---

## Run record — executed 2026-10-08

Run against the live Refero Design MCP, `refero-design-mcp` 1.1.0. **Pass.**

### 1. Assumptions, stated in one line

> API admin panel, so: internal operators, desktop-first, one product, existing
> stack (Laravel + Blade + Tailwind), session auth. Laravel and Tailwind are in
> the codebase, so I am not asking about either.

### 2. One round, four closed questions

> **1. What does an operator do here most of the time?**
> (a) Triage a queue — a list to scan and clear
> (b) Fill in and correct records — forms, long sessions
> (c) Watch and intervene — monitoring, occasional action
> **Recommended: (a)** for a first admin panel.
>
> **2. How much on screen at once?**
> (a) Dense — table-first, many rows, compact
> (b) Balanced — roomy table, readable type, clear actions
> (c) Airy — card-based, one thing per panel
> **Recommended: (b)**
>
> **3. Which theme?**
> (a) Light — long sessions, office screens
> (b) Dark — dim rooms, or a developer-facing tool
> (c) Follow the system preference
> **Recommended: (a)**
>
> **4. Anything you already like the look of?**
> (a) A product or site you can name
> (b) A screenshot or a previous project
> (c) Nothing in particular — research decides
> **Recommended: (c)**
>
> Any of these, say **"you choose"** and I will apply my recommendation and
> label it.

Four questions, all closed, each option glossed, recommendation marked,
"you choose" offered. No open aesthetic question. Nothing the codebase already
answered was asked.

### 3. The answers fed the brief

```
refero_index_status  ->  Published 1342 / Indexed 51 / Coverage 4%
refero_search_styles ->  "analytics dashboard", limit 5   (101 of 1342 searched)
                        Heptabase, Bevel, Dub, Visitors, ClickUp
refero_match_style   ->  "observability console: metrics, tables, service list"
                        Featurebase (4), Bevel (4), Linearity (4)   (126 of 1342)
```

**A first attempt at `refero_match_style` failed and was discarded.** An ordinary
sentence brief — *"internal admin panel for an API product: operators triage a
queue, dense table-first data, light theme, technical and sober tone"* — returned
Graphite (a dark terminal theme), Co2 (a climate atlas) and bunny.net (an edge
network). The scorer had matched on `for`, `an`, `and`. Concrete product nouns
fixed it on the retry. This is the single most useful thing the run produced, and
`../../references/research-workflow.md` already teaches it.

### 4. One recommended direction

**Dub** (`b0d80806-b724-4ed1-a1d1-074edd3c9bc9`), over Bevel and ClickUp: the
closest fit on density for a table-first admin, and the only candidate whose
reference is an operations product rather than a marketing site.

### 5. Tokens first

```css
:root {
    /* Observed — Dub, b0d80806-b724-4ed1-a1d1-074edd3c9bc9 */
    --surface:          #ffffff;  /* Canvas White */
    --surface-alt:      #f5f5f5;  /* Paper Mist */
    --border:           #e5e5e5;  /* Ash — the structural line */
    --text:             #171717;  /* Charcoal */
    --text-muted:       #525252;  /* Steel */
    --accent:           #1e40af;  /* Deep Sapphire, one primary action */
    --font-sans:        "Inter", system-ui, sans-serif;
    --font-mono:        "Geist Mono", ui-monospace, monospace;
    --text-sm:          14px;     /* Observed — Dub's 14px body */
    --text-base:        16px;     /* Observed — 1220 occurrences, canonical */
    --text-heading:     30px;     /* Observed */
    --radius-input:     6px;      /* Observed — inputs 6px, cards 12px */
    --space-element:    8px;      /* Observed — and it is already on the 4px scale */

    /* Decision (default) — defaults.md §Colour: three semantics only.
       Dub's own greens and oranges are accents, not statuses, and the
       reference says so explicitly; they are not reused as status colours. */
    --status-ok:        #16a34a;
    --status-warn:      #d29922;
    --status-fail:      #dc2626;
}
```

**One deliberate deviation, flagged.** The reference publishes only four
radii — `9999px` tags, `12px` cards, `6px` inputs, `8px` buttons — which is two
radius families, not the one family `defaults.md §Surfaces` asks for. The
Observed values stand and the label says so; the rule was not allowed to
override them.

### Verdict

| Criterion | Result |
| --- | --- |
| Exactly one round, ≤ 4 questions, all closed, glossed, recommendation marked | yes |
| "you choose" offered as a real option | yes |
| Assumptions in one line before the questions | yes |
| One recommended direction, not a menu | yes — Dub over Bevel and ClickUp |
| Token block first, in the project's format | yes |
| Every value labelled | yes |
| Questions fed the search brief | yes |
| No open aesthetic question | yes |

**Weakness found.** The first brief wasted three tool calls and returned
semantically unrelated styles because the scorer treats ordinary English words
as terms. `research-workflow.md` covers the remedy, but `SKILL.md` step 3 does
not warn about it, and `SKILL.md` is the file most agents will act on alone.
Worth one added clause.

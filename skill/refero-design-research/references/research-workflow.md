# Research workflow

The full path from a request to implemented UI, and the judgement calls along it.
`SKILL.md` has the same flow in nine lines; this file has the reasoning.

```
brief → coverage → search → compare → select → inspect → synthesize
      → implement → validate
```

---

## 1. Brief

Infer before you ask. Read the request and the codebase, and pull out what is
already written down:

- product type — dashboard, marketing page, internal tool, developer tool
- audience and where the interface is used (desktop, phone, on a wall-mounted
  screen)
- information density — how much is on screen at once
- theme — light, dark, or both
- tone — sober, friendly, technical
- stack, existing components, existing token conventions
- hard constraints — a brand, a mandated font, an accessibility commitment

State those as assumptions in **one line** so the user can correct them cheaply.
Then ask only what is still open **and would lead to a different result** — see
[Turning a vague prompt into a brief](#turning-a-vague-prompt-into-a-brief) for
the question bank.

Do not invent business requirements. If nobody said the product sells to
enterprise, do not build an enterprise brief.

---

## 2. Coverage

Call `refero_index_status` before the first search, not after a miss. It tells
you the denominator, and the denominator is what makes an empty result readable.

```
Published styles: 1342 / Indexed locally: 26 / Coverage: 2%
```

A search over 26 of 1342 that finds nothing is not evidence of absence. It is
evidence that 26 styles were examined. Widening the pool is a different act from
concluding, and only the first one is legitimate from a 2% index.

---

## 3. Search

Two tools, and the difference is the input, not the ranking:

- `refero_match_style` — a **prose brief** built from the real context:
  *"dark, dense dashboard for engineers monitoring deployment status"*.
  Use it when the request is qualitative.
- `refero_search_styles` — **concrete terms**: a colour, a font, a mood noun,
  a genre. Use it when you can already say what you are looking for.

Run both when the brief is qualitative but you have a strong prior (a genre, a
colour family). They share one scorer, so they will not contradict each other;
they differ in what you type.

### Good and bad queries

| Bad | Why it fails | Good |
| --- | --- | --- |
| `modern` | Appears in every description, so it ranks everything equally | `minimal SaaS dashboard` |
| `nice` | Not a design vocabulary term; matches nothing meaningful | `soft pastel wellness brand` |
| `website` | Every catalogue entry is a website | `industrial B2B application` |
| `clean` | A judgement, not an observable property | `high-contrast dense data table` |
| `design system` | Matches the word, not a product | `premium fintech interface` |

The pattern: **concrete nouns and adjectives, plus the product context.**
"Editorial technology landing page", "dark developer tool", "e-commerce back
office" — each names an artefact, an audience and a register.

### When results are weak

Three moves, in order. Do not just re-run the same query.

1. **Widen the pool.** Raise `expand` (max 500). Each call fetches at most
   `REFERO_MAX_FETCHES` (default 25) pages, so widening is incremental and
   deliberate, not free.
2. **Change the angle, not the adjectives.** A miss on *"dark dashboard"* may be
   a miss on *"developer tool"*. Search the product type and read the tone off
   the results.
3. **Check whether the words are in the index at all.** Search results only see
   names, north stars, colours, fonts and URLs. A brief whose vocabulary is
   absent from those fields will not match, however good it is.

---

## 4. Compare

Shortlist **two to four**. One candidate is not a decision, and five is not a
comparison. For each, ask:

| Question | Why it matters |
| --- | --- |
| Who is it built for, and is that our user? | A consumer site's density is wrong for an operations console |
| What density does it commit to? | Density is a decision, not a detail; it cascades into type size and spacing |
| What tone, and does it match the brief? | Tone is the thing a non-designer cannot judge from a screenshot and cannot recover later |
| What does it use colour *for*? | Whether colour carries meaning or decorates tells you how much of it to trust |
| Does it work at the width we need? | A reference that only composes at 1440px is a mood, not a layout |

**Compare fit to the product, not attractiveness.** A candidate that is
impressive and wrong for the audience is a worse starting point than a competent
one that matches.

**Recurring patterns across candidates are the signal.** If three of four
independent styles all put the accent on a single primary action, that is a
pattern worth adopting, and you can say so with evidence. If one candidate alone
does it, it is that candidate's choice, not a finding.

---

## 5. Select

Pick **one**. Then fetch it, and one or two others only if they contribute a
specific piece you are missing.

Do not average candidates. Averaging produces the safe middle that nobody chose,
and it discards exactly the sharp traits that made a reference worth choosing.
Secondary references may add narrow details — a type scale, a spacing rhythm —
and may not reshape the direction.

---

## 6. Inspect

Fetch sections, not documents:

1. `refero_get_design_md` with `["overview", "colors", "typography"]` on the
   chosen style.
2. Read it. Decide what you still need.
3. A second call with `["type_scale", "spacing", "surfaces", "components",
   "principles"]` if the direction needs them.

`refero_get_style` when **exact values** matter — a specific hex, a weight, a
radius. It carries `raw` alongside the curated reading, and `frequency` inside
`raw` is what separates a signature colour from an incidental one. Prefer the
high-frequency token when the value has to be right.

Select by `style_id`, always. A style page embeds ten to twenty related styles
with identical key names; the wrong id returns a neighbour's palette and reports
no error at all.

### Request budget

Typical research for a real task:

| | Count |
| --- | --- |
| `refero_index_status` | 1 |
| `refero_match_style` / `refero_search_styles` | 1–3 |
| `refero_get_design_md` / `refero_get_style` | 2–4 |

Anything more means the shortlist is wrong, not that the research needs to be
deeper. There is no loop over `refero_list_style_ids`. That is a bulk crawl of
someone else's public site, and politeness is not optional here.

---

## 7. Synthesize

Write the design direction. See `design-output.md` for the shape and
`../examples/design-direction.example.md` for a worked one.

The non-negotiable: **every numeric value carries a label.**

- `Observed` — the MCP returned it. Name the source style and its id.
- `Decision` — you chose it, with a one-line reason.
- `Decision (default)` — it came from `defaults.md`, because there was no
  evidence.

Never present a value as Observed that the MCP did not return. The label is what
makes the document auditable, and an audit that cannot be performed is the same
as an audit that failed.

---

## 8. Implement

The project's existing stack and conventions. Start from the tokens. Do not
introduce React, Vue, Tailwind or a component library that is not already in
use — a design system that requires a migration is a different project.

---

## 9. Validate

Walk the checklist in `SKILL.md`. Two failures are worth naming explicitly:

- **A value in the code that is not in the tokens.** If a colour, size or radius
  appears in a component and not in the token block, it is a decision that
  escaped the record.
- **A default that overrode an Observed value.** The defaults are a floor, not a
  preference. If a default won a slot that had evidence, the evidence was
  ignored.

---

## Turning a vague prompt into a brief

The hard case is not a detailed brief. It is *"make me a nice admin panel for my
API"* from someone who cannot answer *"what mood?"* and would not recognise a
good answer if they saw one.

The move is to **turn open questions into closed ones.** An open question
("what should it feel like?") cannot be answered by someone without design
vocabulary; a closed question with three concrete options can, because the
options do the describing for them.

---

### 1. Product-type lookup

State the assumptions, then run the first query. Skip whatever the request or
the codebase already answers.

| Product type | State as assumptions | First query |
| --- | --- | --- |
| **Admin panel** | Internal operators, desktop-first, data entry and review, existing session auth | `admin panel internal operations` |
| **SaaS dashboard** | Paying customers, login-gated, usage and billing at the centre, mixed devices | `SaaS analytics dashboard` |
| **Developer tool** | Engineers, technical vocabulary, code and terminal are first-class | `developer tool technical interface` |
| **Marketing page** | Prospects, few seconds of attention, one call to action, mostly mobile | `product landing page marketing` |
| **Internal tool** | Colleagues, low polish expectation, keyboard-driven, high repetition | `internal tool back office` |
| **E-commerce back office** | Warehouse and support staff, bulk operations, scanning devices, speed over looks | `e-commerce inventory back office` |

**What to assume and what to ask.** Assume the product type, the stack, and
whatever the codebase already establishes — those are facts, not questions. Ask
only about density, theme, tone and a reference the user likes, because those
four change which styles rank first.

---

### 2. Question bank

One round. **At most four questions**, asked together, never drip-fed. Drop any
question the request or the codebase already answers — a question answered by
reading the repository is a wasted round trip.

Every option carries a one-line gloss or example. The gloss is not decoration:
it is what lets someone who cannot name a design concept still choose
correctly. Mark a recommendation. Always accept *"you choose"*.

Rules that hold across every product type:

- One round only. If an answer produces a new question, answer it yourself or
  put it in the direction as a labelled `Decision`.
- Never more than four. A user who is handed eight options is handing them back.
- The answers feed the `refero_match_style` prose brief **directly** — write them
  into the brief rather than translating them into design vocabulary yourself.
- If the user says *"you choose"*, apply the recommended options and say that is
  what happened.

---

#### Admin panel

1. **What does an operator do here most of the time?**
   - *(a)* Triage a queue — a list that must be scanned and cleared
   - *(b)* Fill in and correct records — forms, long sessions
   - *(c)* Watch and intervene — monitoring, alerts, occasional action
   - **Recommended:** *(a)* for a first admin panel; *(b)* if the request names
     forms or data entry.
2. **How much on screen at once?**
   - *(a)* Dense — table-first, many rows, small type, compact rows
   - *(b)* Balanced *(recommended)* — roomy table, readable type, clear actions
   - *(c)* Airy — card-based, one thing per panel, generous spacing
3. **Which theme?**
   - *(a)* Light *(recommended)* — long sessions, most operators on office screens
   - *(b)* Dark — long sessions in dim rooms, or a developer-facing tool
   - *(c)* Follow the system preference
4. **Anything you already like the look of?**
   - *(a)* A product or site you can name
   - *(b)* A screenshot or a previous project of yours
   - *(c)* Nothing in particular *(recommended)* — research decides

---

#### SaaS dashboard

1. **What is the one number a user comes to see?**
   - *(a)* A single headline metric with history
   - *(b)* A grid of many metrics to scan
   - *(c)* Usage broken down by plan or customer
   - **Recommended:** *(a)* if it can be stated in one sentence.
2. **Density?** *(same three options as above; **balanced** recommended unless
   the product is explicitly for power users)*
3. **How formal?**
   - *(a)* Sober — finance-adjacent, the data is the product *(recommended)*
   - *(b)* Friendly — consumer-facing, onboarding matters
   - *(c)* Technical — the audience already knows the domain
4. **Theme?** *(light recommended, dark if the product has a dark-mode identity)*

---

#### Developer tool

1. **What does the user look at most?**
   - *(a)* Code, logs, or terminal output
   - *(b)* Configuration and forms *(recommended)* if it is a setup or control
     tool
   - *(c)* Charts and metrics
2. **Syntax presentation?**
   - *(a)* Monospace-first — real monospace, line numbers, aligned columns
   - *(b)* Proportional-first — monospace only for values and identifiers
     *(recommended)*
   - *(c)* Terminal look — a shell metaphor throughout
3. **Theme?** **Dark recommended** — developer tools are commonly used for long
   stretches and this audience already expects it. Light is fine if the tool is
   an occasional dashboard.
4. **Reference?** *(a named product — Stripe, Vercel, Linear, a CLI you admire;
   *(c)* nothing *(recommended))*

---

#### Marketing page

1. **Who reads it first?**
   - *(a)* A developer *(recommended)* — respects density and restraint
   - *(b)* A buyer or manager — needs the value in the first screen
   - *(c)* Both — the page has to work twice
2. **What should the first screen do?**
   - *(a)* State what it is, then prove it
   - *(b)* Prove it with an image or demo first
   - *(c)* Get to a signup immediately
   - **Recommended:** *(a)*; it is the only option that survives every one of the
     three audiences.
3. **How much visual personality?**
   - *(a)* Restrained — typography and whitespace carry it
   - *(b)* Expressive — strong palette, imagery, motion
   - *(c)* Balanced *(recommended)* — one memorable element, nothing else
4. **Must it fit a brand?** *(a) yes — treat the brand as mandated and skip
   research; (b) no *(recommended)* — research decides*

---

#### Internal tool

1. **Keyboard or mouse?**
   - *(a)* Keyboard-driven — shortcuts for common actions, focus everywhere
   - *(b)* Mouse-driven — discoverable clicks
   - *(c)* Mixed *(recommended)* — shortcuts that speed up, clicks that work
2. **Repetition?**
   - *(a)* Same screen hundreds of times a day — optimise for speed, not beauty
     *(recommended)*
   - *(b)* Dozens of times a day — comfortable matters
   - *(c)* Occasionally — clarity first
3. **How much polish is expected?**
   - *(a)* Internal tool, nobody sees it — plain and fast
   - *(b)* Colleagues will judge it — needs to look considered *(recommended)*
   - *(c)* External users touch it — treat it as a product

---

#### E-commerce back office

1. **Primary device?**
   - *(a)* Desktop with a scanner — wide screens, keyboard, bulk actions
   - *(b)* Phone or tablet on the floor — one-handed, large targets
   - *(c)* Both *(recommended)* — design desktop first, degrade honestly
2. **What is the rhythm of a task?**
   - *(a)* Continuous — picking, scanning, packing, repeating
   - *(b)* Batch — importing, adjusting, correcting
   - *(c)* Mixed *(recommended)*
3. **How does an error surface?**
   - *(a)* Modal, blocking — the operator must resolve it now
   - *(b)* Inline, non-blocking — listed, fixed later
   - *(c)* Both *(recommended)* — blocking for data loss, inline for everything
     else
4. **Theme?** Light **recommended** — warehouses are brightly lit; a dark theme
   is legible in an office and unusable on a warehouse floor.

---

## When references conflict

They will. Three styles will disagree about density, and a fourth will be
compelling in the opposite direction.

Resolve it in this order:

1. **The brief wins.** If the direction must feel dense for an operations team,
   a marketing reference loses regardless of how well it is executed.
2. **The user's constraints win over all of it.** A mandated font, a brand
   palette, an existing design system — these are not candidates.
3. **Among equals, prefer the one the product resembles**, not the one that is
   easiest to describe.

Then say so in the direction document: one line on what conflicted and which
way it was resolved. A conflict resolved silently becomes a mystery later.

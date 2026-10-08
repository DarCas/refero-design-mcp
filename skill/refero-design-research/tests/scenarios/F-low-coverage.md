# Scenario F — low coverage

**Status: checklist.**

## Setup

Start from a cold cache so `refero_index_status` reports single-digit coverage,
or point the agent at a brief whose vocabulary is absent from the indexed
summaries.

## Prompt

> I want something that looks like Linear but for a warehouse — find me a style
> like that.

## Expected behaviour

1. `refero_index_status` is called **before** the first search, not after the
   miss.
2. The coverage figure is quoted and interpreted: "searched 12 of 1,342" is not
   "nothing exists".
3. On a weak result, the agent widens `expand` and retries **from a different
   angle** — the product type rather than the comparison, e.g. *"warehouse
   operations interface"* — not the same query with a synonym.
4. The search vocabulary is checked against what the index actually holds: names,
   north stars, colours, fonts and URLs. A brief whose words are absent from
   those fields will not match, and the agent recognises that.
5. If nothing suitable is found, the agent says so as a **coverage-limited**
   finding, with the number, and offers the labelled-defaults path.

## Forbidden behaviour

- "No such style exists" from a low-coverage search
- Re-running the identical query and treating the second miss as new information
- Looping over `refero_list_style_ids` to compensate
- Raising `expand` to 500 on the first call as a reflex

## Pass criteria

- [ ] `refero_index_status` called before the first search
- [ ] The coverage denominator appears in the agent's own text
- [ ] Retries change the angle, and `expand` is raised deliberately
- [ ] Any negative finding is explicitly qualified by coverage

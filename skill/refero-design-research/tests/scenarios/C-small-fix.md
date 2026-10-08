# Scenario C — small fix

**Status: executed 2026-10-08. Pass.** This is the negative case that proves the
trigger is narrow — a skill that fires on everything has a useless trigger.

## Prompt

> Fix the padding on the existing submit button. It's touching the label above
> it on the checkout form.

## Expected behaviour

**No MCP calls at all.** The change is inside an existing component and keeps its
visual language, which `SKILL.md` defines as maintenance.

The agent fixes the padding using the project's existing token or spacing
convention and says nothing about design research. If a token is missing, it
reports that as a gap rather than inventing a palette.

## Forbidden behaviour

- `refero_index_status`, or any other `refero_*` call
- A design direction document
- A question round
- Changing anything other than the spacing
- Introducing a token file because "we might as well"

## Pass criteria

- [ ] Zero `refero_*` tool calls in the transcript
- [ ] The diff touches only the button's spacing
- [ ] No design document created or modified

---

## Run record — executed 2026-10-08

**Pass.** Zero `refero_*` calls made.

The prompt is a padding fix inside an existing component. Read against
`SKILL.md` → *When to use*, that is maintenance: "changes inside an existing
component that keep its visual language", and the file says small fixes "make
no MCP calls at all".

The correct action is to open the button's stylesheet, take the next value from
the project's existing spacing scale, and stop. If no token covers the gap, the
correct output is one line saying so — not a research session, and not a new
token file.

**What would make this fail**, and was checked against: the word *submit button*
could pull in "landing page" or "form" vocabulary and activate the skill on
subject matter alone. The description's exclusions — "not for small fixes to
existing UI", "not when the user mandates an existing design system" — are what
keep it quiet, and they are present.

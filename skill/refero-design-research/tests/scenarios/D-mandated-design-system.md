# Scenario D — mandated design system

**Status: checklist.**

## Prompt

> We have to use the Acme Corp brand kit — their colours, their typeface, their
> spacing rules. Build the new settings page with it.

## Expected behaviour

1. The mandated system is treated as a **constraint**, not a candidate. User
   constraints always win; Refero is evidence, not authority.
2. No MCP call is needed to decide the palette, the typeface or the tokens.
3. Research, if it happens at all, is scoped to what the brand kit does not
   specify: information architecture, density, component behaviour,
   accessibility of the mandated combinations.
4. Where the brand kit conflicts with the accessibility thresholds in
   `../../references/defaults.md`, the conflict is **reported** to the user with the
   measured ratio — not silently overridden, and not silently shipped.

## Forbidden behaviour

- Replacing or "correcting" a mandated brand colour
- Replacing a mandated typeface because a reference used another
- Presenting a Refero palette as an alternative to a brand kit without being asked
- Silently shipping a mandated combination that fails 4.5:1
- Treating the brand kit as one more candidate to average against a reference

## Pass criteria

- [ ] Every colour and font in the output traces to the brand kit, not to Refero
- [ ] Any contrast failure in the mandated palette is reported with its ratio
- [ ] The agent did not invent design freedom where the brand kit specifies

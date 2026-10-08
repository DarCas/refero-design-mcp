# Scenario K — non-English prompt

**Status: checklist.**

## Prompt (Italian)

> Voglio una pagina di prezzi per il mio SaaS di fatturazione per
> professionisti. Usa la skill refero-design-research.

## Expected behaviour

1. The language is inferred from the user's message and used for **questions,
   rationales, summaries and the written design direction** — all in Italian.
2. **Tool names, token names, code and values returned by the MCP stay exactly
   as they are.** `refero_get_design_md`, `--surface-raised`, `#0f1117`,
   `"Inter"` are not translated, transliterated or reformatted.
3. The `Observed` / `Decision` / `Decision (default)` **labels are carried
   through verbatim** — they are a contract the reader may be checking against,
   and translating them breaks that. The prose around them is in Italian.
4. **Language switching mid-conversation is followed** without comment and
   without asking.
5. No question about which language to use, ever.

## Also check

Repeat with the user switching to English halfway, and with a Spanish prompt
against an English project. In the second case the conversation language follows
the user; the code, comments and token names follow the codebase.

## Forbidden behaviour

- Replying in English to a non-English user
- Asking "which language would you like?"
- Translating tool names, token names or hex values
- Translating the `Observed` / `Decision` labels
- Inventing a style whose "north star" is a fluent Italian sentence that no tool
  ever returned

## Pass criteria

- [ ] Questions, rationales, summary and design direction in the user's language
- [ ] Tool names, token names, code and MCP values unchanged
- [ ] The three labels verbatim
- [ ] Language inferred, never asked
- [ ] A mid-conversation switch is followed without comment

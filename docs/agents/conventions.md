# Conventions

## Statements have no semicolons

`eslint.config.js` sets `'@semi': ['error', 'never']`, mirroring
`ij_typescript_force_semicolon_style = false` in `.editorconfig`.

Never hand-edit this away, and never `sed` it. The rule exists because it
handles the ASI edge cases: a statement continuing onto a line that opens with
`(`, `[` or a template literal still needs its leading semicolon, and only
`eslint --fix` knows when. Run `npx eslint src test --fix` and let it apply.

Semicolons that remain are **type members**, not statement terminators —
properties inside an `interface` or a `type` literal keep theirs, and the rule
leaves them alone. Semicolons in prose are ordinary punctuation.

## Lint rules that will fail your build

| Rule | Effect |
| --- | --- |
| `no-console` | `console.*` is forbidden. Use `log()` from `src/http.ts` |
| `@typescript-eslint/no-floating-promises` | `await` or `void` every promise |
| `@typescript-eslint/consistent-type-imports` | `import type { … }` for type-only imports |
| `@typescript-eslint/no-unused-vars` | Unused args must be `_`-prefixed |
| `eqeqeq` | `==` is an error |
| type-aware | `recommendedTypeChecked` with `projectService`, so a type error in a lint run is real |

`test/**/*.ts` disables `no-unsafe-assignment` — that is the only test-specific
exception, and it exists because the suites cast fixture JSON.

## Known drift between `.editorconfig` and the code

`.editorconfig` was written before most of this code and the codebase has not
been reformatted to match. Do not "fix" one side in passing — pick a direction
and apply it everywhere. Concretely:

- **Indentation — settled: `src/` is 4, `test/` is 2.** Every file in `src/` now
  uses `indent_size = 4`; `test/` uses 2 throughout. Match the tree you are in.
  Note that `.editorconfig` cannot express this split, so an agent that follows
  it literally will reindent `test/` to 4 and produce a diff nobody asked for.
- **Parentheses and brackets.** The config asks for `foo( bar )` and `[ a, b ]`.
  The code overwhelmingly writes `foo(bar)` and `[a, b]`; a handful of files
  (`config.ts`, `version.ts`, `scoring.ts`) do follow the IntelliJ spacing.
  Match the file you are editing. Reformatting either way is a very large diff.
- **Import member order.** The config asks for sorted members; import lists are
  unsorted throughout.
- **Line length.** `max_line_length = 100` and nothing enforces it. 66 lines
  across `src/` and `test/` exceed 100 characters, some over 110. Worst files:
  `test/rsc.test.ts` (10), `src/server/tools/listStyleIds.ts` (9),
  `test/sitemap.test.ts` (6), `src/server/tools/matchStyle.ts` (6).

The `ij_*` keys in `.editorconfig` are IntelliJ settings, not tooling. Only the
semicolon rule has a linter behind it, which is why the rest is convention
rather than guarantee. `root = true` stops the search above this directory.

## Module style

- Every `src/` module opens with a doc comment explaining *why* it exists and
  what shape it defends — not what it does. Most non-obvious invariants in this
  repository live in those comments, not in inline comments. Read the top of a
  file before editing its middle.
- The copyright header
  (`Dario Casertano … Copyright (c) 2026 Casertano Dario – All rights reserved.`)
  is present on 20 of 23 `src/` files plus `scripts/postbuild.mjs`. It is absent
  from `src/types.ts`, `src/sources/rsc.ts`, `src/sources/sitemap.ts` and from
  every test file. Add it to a new `src/` module; do not retrofit the others.
- Package is ESM (`"type": "module"`), TS `module`/`moduleResolution` are
  `Node16`. **Relative imports need the `.js` extension** even though the source
  is `.ts`. A missing extension compiles and then fails at runtime.
- `exactOptionalPropertyTypes` is off; `noUncheckedIndexedAccess` is on, so
  indexed access yields `T | undefined` and needs a guard.

## Formatting

Enforced by lint: `@/semi: never`, `eqeqeq`, `no-console`,
`consistent-type-imports`, `no-floating-promises`. Not enforced, so these are
convention — match the surrounding code and do not reformat a file you are not
otherwise changing.

- **Indentation: `src/` is 4 spaces, `test/` is 2.** `src/config.ts` was the
  original holdout and no longer is.
- **No trailing semicolon on a type alias.** `export type X = Y` — the `@/semi`
  rule does not reach type aliases, so this is on you. Five of the seven
  `z.infer` aliases in `src/types.ts` and `src/core/scoring.ts` set the pattern;
  a stray `;` survives review because nothing complains.
- **Line length 100.** Unenforced. Long zod chains and tool descriptions exceed
  it; do not add more.

### Zod schema chains

One rule, keyed on nesting depth. It is what `src/types.ts` does throughout:

```ts
// top-level field: the modifier gets its own line
lastmod: z.string()
    .optional(),

// nested object field: the chain stays inline
colors: z.array(
    z.object({
        hex: z.string().default(''),
    }),
)
    .default([]),
```

A top-level field with **no** modifier stays on one line (`id: z.string(),`).
The rule exists because the top level is where a schema is *read* — the column of
terminal modifiers is what makes the optionality of twenty fields scannable —
while a nested literal is a wall of uniform entries either way.

Single quotes throughout. Double quotes appear only where the string contains an
apostrophe.

## Comments

Write a comment only when it carries something the code cannot:

1. **An invariant a reader could violate** — the ordering, the bound, the
   precondition. State it in the present tense.
2. **A failure mode invisible in the code** — a bug that fires only on one load
   order, one platform, or one malformed input. `src/version.ts` is the
   reference: the temporal-dead-zone crash cannot be seen by reading the code.

Anything else is noise. A comment that restates a signature, narrates what the
code used to do, or quotes a measurement will be wrong within one release.

| Do not write | Write instead |
| --- | --- |
| "Previously this probed a path per style" | "Uncached styles outnumber cached ones; memoise absences too" |
| "Measured ~28 ms for 26 styles" | The number belongs in `docs/agents/architecture.md` |
| "All published style ids, from the sitemap" | Nothing — the signature says it |

Budgets: module doc ≤ 8 lines, function doc ≤ 4, field comment ≤ 3. A comment
needing more is usually documenting two things.

A comment must never describe behaviour the code does not implement. If it
states an intent, implement it or delete it — a wrong comment costs more than a
missing one, because it gets trusted.

Rationale goes in the module doc. An inline comment earns its place only for a
trap local to those few lines.

Alongside `npm run verify`:

- `grep -rniE 'previous|used to|formerly' src/` should match only
  `src/version.ts`
- no comment in `src/` should quote a measurement

Treat both as review prompts rather than build gates: the words can be innocent,
but hitting them should make you re-read the comment.

## Naming

- One module per tool, named after the tool: `getDesignMd.ts` exposes
  `refero_get_design_md`. Add a file, do not grow `index.ts`.
- Config keys are lower camel case; env vars are the upper snake equivalent,
  always prefixed `REFERO_`.
- Tool handler arguments use the wire names (`style_id`,
  `include_measured_tokens`), which means destructuring is snake_case inside an
  otherwise camelCase codebase. That is deliberate: it keeps the mapping to the
  protocol obvious.

## Commits

`.opencode/commands/commit.md` defines the format: Conventional Commits with a
leading emoji (`✨ feat`, `🐛 fix`, `📦 build`, `🧹 chore`, …), title ≤ 72 chars,
imperative mood, no trailing period, and a body with `### Added` / `### Changed`
/ `### Removed` / `### Refactored` sections. Type precedence:
`feat > fix > perf > refactor > docs > test > build > ci > chore > style`.

When the command asks whether to create and push a tag, decline. See the hard
rules in `AGENTS.md` — a `v*` tag is the release trigger.
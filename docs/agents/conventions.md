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

- **Indentation.** `.editorconfig` says `indent_size = 4`. Almost all of `src/`
  now uses 4. The exceptions are `src/types.ts`, `src/sources/rsc.ts` and
  `src/sources/sitemap.ts` (still 2) and **all of `test/`** (still 2). New code
  in `src/` should use 4; do not reindent files you are not otherwise changing.
- **Parentheses and brackets.** The config asks for `foo( bar )` and `[ a, b ]`.
  The code overwhelmingly writes `foo(bar)` and `[a, b]`; a handful of files
  (`config.ts`, `version.ts`, `scoring.ts`) do follow the IntelliJ spacing.
  Match the file you are editing. Reformatting either way is a very large diff.
- **Import member order.** The config asks for sorted members; import lists are
  unsorted throughout.
- **Line length.** `max_line_length = 100` and nothing enforces it. 32 lines
  exceed 100 characters, 14 of them exceed 110. Worst files:
  `test/rsc.test.ts` and `src/core/designMd.ts` (10 each),
  `src/server/tools/matchStyle.ts` (8).

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
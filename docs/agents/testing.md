# Testing

Vitest 5, 7 files, 74 tests. No test framework config file — `npm test` is
`vitest run` with defaults, and the API surface is only `describe`, `it`,
`expect`, `beforeAll` and `afterAll`: no mocks, spies, fake timers or snapshots.

Vitest 4 removed `test(name, fn, options)` when `options` is an object. The
numeric third argument (`it(name, fn, 90_000)`) is a different, still-supported
form and is what this repository uses — verified against 5.0.3, which throws a
`TypeError` for the object form and honours the numeric one with no deprecation
warning. Do not "modernise" those call sites on the assumption that they are
legacy.

## Commands

```bash
npm test                              # everything
npx vitest run test/rsc.test.ts       # one file
npx vitest run -t 'braces'            # one case by name
npx vitest                            # watch
npm run verify                        # typecheck -> lint -> test -> build
```

Order in `verify` matters only in that the build runs last. `test/version.test.ts`
does **not** read `dist/`: reading it would exercise the previous run's artifact,
which is precisely how a real regression slips through.

## Offline by default

Every suite except `test/e2e.test.ts` runs with no network and no fixtures beyond
what is in the repository.

- `test/rsc.test.ts` pins the fragile parts against a hand-assembled sample of
  the RSC payload: id anchoring, brace matching, lazy-reference detection. It is
  a deliberate reduction of a ~300 KB page, not a byte-for-byte capture — the
  awkward shapes it reproduces (numeric `typeScale.size`, per-element `radius`
  map, a Flight reference as `customSections.content`) are the ones that broke
  in practice. **If you change parsing, update the fixture and pin the new
  behaviour.** A parsing change without a fixture update is not verified.
- Other suites build their inputs inline (`scoring`, `designMd`, `sitemap`,
  `concurrency`).

Do not add a test that reaches the network and expects it to work. If a change
genuinely needs the origin, it belongs in the e2e suite.

## The e2e suite skips, and that is dangerous

`test/e2e.test.ts` drives a real server over `InMemoryTransport` against the live
site: tool list, index status, sitemap ids, a rendered `design.md`, resource
listing and read, malformed-URI rejection, structured JSON.

Its reachability probe runs **at module load**, not in a hook:

```ts
const reachable = await fetch(SITEMAP, { signal: AbortSignal.timeout(20_000) })
    .then(r => r.ok).catch(() => false)
describe.skipIf(!reachable)(…)
```

`describe.skipIf` is evaluated during collection, so a probe inside `beforeAll`
would still read `false` and skip the entire suite — silently, and
indistinguishably from a passing one.

**Therefore: never write a test that cannot fail, and check the skip count
whenever you change extraction or transport code.** A green run with 0 skipped
is the only fully green run. Note that the live suite is fast when
`~/.cache/refero-design-mcp` is warm — sub-second on this machine — so elapsed
time is not a reliable signal that the network was actually used.

## The version suite compiles its own copy

`test/version.test.ts` runs `tsc -p tsconfig.build.json --outDir
.tmp-version-test` in a file-level `beforeAll`, then imports the compiled
modules in child processes:

- `version.js` must report the same version as the source tree and as the
  manifest.
- `server/index.js` and `config.js` must each survive being the **first** module
  loaded — that is the circular-import regression guard. Reaching the assertion
  at all is the point; with the cycle present the child exits non-zero with a
  temporal-dead-zone `ReferenceError`.
- the compiled `cli.js` is spawned and driven with a hand-written
  `initialize` JSON-RPC frame over stdin, asserting `serverInfo.version`.

It also asserts the repository contains no `.cache/` directory and removes one if
it finds it. The build is slow (that is why the timeout is 120 s); expect this
file to dominate `npm test` runtime.

## Test-only lint exception

`test/**/*.ts` is the sole scope where `no-unsafe-assignment` is off, because the
suites cast fixture JSON. Do not extend that exemption.

## What to run when

| Change | Minimum |
| --- | --- |
| Anything | `npm run verify` |
| RSC parsing or schemas | `npm test` **and** check the fixture was updated |
| `version.ts`, `config.ts`, `cli.ts`, module graph | `npm test` — the version suite compiles and spawns |
| A new tool or resource | `npx vitest run test/e2e.test.ts` plus a name in its assertion list |
| Cache or fetch behaviour | `npx vitest run test/e2e.test.ts`; a warm local cache can mask changes |
| Packaging, `bin`, or the Node floor | `npm run build && node scripts/smoke.mjs` |

## The smoke test

`scripts/smoke.mjs` spawns the compiled `dist/cli.js`, performs the MCP
`initialize` handshake, and asserts the server reports its name and version and
advertises both `tools` and `resources`. It is what proves `engines.node` on a
machine other than the developer's — CI runs it on the declared floor. It is
offline by design: the question it answers is "does this Node load the artifact",
not "is the origin up".

Run it after any `bin`, build or `engines` change, and locally before claiming
the package works somewhere new:

```bash
npm run build && node scripts/smoke.mjs
```

It does not check the running Node version. That is `engines`' job, and
enforcing it twice would create a second source of truth to drift.
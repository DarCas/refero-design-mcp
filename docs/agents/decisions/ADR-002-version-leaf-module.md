# ADR-002 — `VERSION` lives in an import-free leaf module

## Status
Accepted

## Context
`config.ts` needs `VERSION` to build the `User-Agent`, and `index/store.ts`
needs `config`. `VERSION` was originally defined in `server/index.ts`, which
closed the cycle `server/index → index/store → config → server/index`.

The cycle only bites on one load order. `cli.ts` reaches `config` through the
store first, so `npm start` worked. Any consumer that loaded `server/index.js`
first — a test, a bundler, a future embedder — evaluated `config.js` while it was
still initialising and read `VERSION` out of its temporal dead zone, so the
module threw before it could answer a single request. A failure that depends on
load order hides well: the normal entry point is fine.

## Decision
`VERSION` lives alone in `src/version.ts`, which imports nothing from the
project. `config.ts` and `server/index.ts` both read it from there.

Two further constraints follow:

- The manifest is found by **walking up** from the module's own directory, not by
  a fixed relative depth. The depth differs between `src/` under tsx and the
  compiled `dist/`.
- The manifest is matched by **unscoped-name suffix**, not equality. The npm name
  is `@darcas/refero-design-mcp`; equality against an unscoped string fails
  silently and reports `0.0.0-unknown`.

A wrong path or a strict name check fails silently and reports `0.0.0-unknown`,
so the sentinel must stay unusual enough to be noticed.

## Consequences
- One more top-level module, whose only content is a constant.
- A future entry point must go through `createServer()`, and `config.ts` must
  never reach back into the server layer.
- `test/version.test.ts` compiles its own output and imports the modules in
  child processes to pin both entry orders and the reported version. It is the
  slowest suite and cannot be skipped casually.

## Evidence
`src/version.ts` (doc comment records the cycle and both failure modes),
`src/config.ts`, `test/version.test.ts` ("module load order" and "version
resolution" suites), `src/server/index.ts`.
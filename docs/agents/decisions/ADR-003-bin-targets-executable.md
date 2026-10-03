# ADR-003 — `bin` targets are chmod-ed after `tsc`, not by a shell `chmod`

## Status
Accepted

## Context
The package ships a `bin` entry, `dist/cli.js`. `tsc` emits files at mode 644
whatever the mode of the source, so a shebang in `cli.ts` does not make the
emitted file executable.

npm 10.x does not chmod `bin` targets on install; it trusts the mode recorded in
the tarball. So `node_modules/.bin/refero-design-mcp` symlinked a
non-executable file, the spawn failed with `Permission denied`, and the MCP
client dropped the server with no error, no tool list and no diagnostic.

Local testing never caught it: `npm start` runs `node dist/cli.js` explicitly.
Only the `npx`/symlink path breaks. It shipped in 1.0.1 and was fixed in 1.0.2.

## Decision
`npm run build` ends with `node scripts/postbuild.mjs`, which reads `bin` from
the manifest and `chmodSync`s each target to 755.

Reading `bin` rather than naming `dist/cli.js` means a second entry point cannot
regress unnoticed. Using `chmodSync` rather than `chmod +x` in the script string
keeps the build working on Windows, where `chmod` is not a `cmd.exe` builtin and
a shell-based approach would fail outright for anyone cloning there.
`chmodSync` is a no-op on Windows, which is correct: npm writes `.cmd` shims
there, not symlinks, so the mode bit is not needed.

## Consequences
- `build` has a Node step that is not `tsc`, and it must stay last in the chain.
- Adding a `bin` entry needs no change here, but it does need the build to be
  run — a stale `dist/` from a previous build will not have the bit.
- The failure mode of getting this wrong is silence, not an error, so
  `npm pack` plus `tar -tvf` is the only way to be sure.

## Evidence
`scripts/postbuild.mjs`, `package.json` (`build` script, `bin`), `src/cli.ts`
(shebang), commit `2cc1962` "build(scripts): make bin targets executable after
tsc".
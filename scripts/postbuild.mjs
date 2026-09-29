/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Mark every `bin` target executable after `tsc` runs.
 *
 * TypeScript emits files at 644 whatever the mode of the source, so a shebang
 * is not enough: npm symlinks `node_modules/.bin/<name>` to the target without
 * checking the bit, and the spawn fails with `Permission denied`. The MCP
 * client then drops the server silently — no tool list, no actionable error.
 *
 * Reading `bin` from the manifest rather than naming `dist/cli.js` means a
 * second entry cannot regress unnoticed. Windows needs nothing here — npm
 * writes `.cmd` shims there, not symlinks — and `chmodSync` only toggles the
 * read-only attribute, so it is a no-op rather than a failure.
 */

import { chmodSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))

for (const target of Object.values(manifest.bin ?? {})) {
    chmodSync(new URL(target, root), 0o755)
}

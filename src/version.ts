/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Unscoped tail of the npm package name, used to locate our own manifest. */
const PACKAGE_SUFFIX = 'refero-design-mcp'

/**
 * Version reported to the client, and embedded in the User-Agent.
 *
 * This lives in its own module with no imports from the rest of the codebase.
 * It used to sit in `server/index.ts`, which made `config.ts` depend on the
 * server module for the User-Agent string — and the server module already
 * depends on `config.ts` through the store. That cycle evaluated
 * `VERSION` while it was still in its temporal dead zone, so any entry point
 * that loaded the server first crashed on startup.
 *
 * Resolved by walking up from this module rather than by a fixed `../..`,
 * because the depth differs between running from `src/` (tsx) and from the
 * compiled `dist/`. A wrong path here fails silently and reports 0.0.0.
 */
export const VERSION: string = ( () => {
    try {
        let dir = dirname(fileURLToPath(import.meta.url))
        for (let depth = 0; depth < 6; depth += 1) {
            const candidate = join(dir, 'package.json')
            if (existsSync(candidate)) {
                const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as {
                    name?: string;
                    version?: string
                }
                // Matched by suffix, not equality: the npm scope is a packaging
                // concern that changes, and a strict comparison would fail silently
                // and report 0.0.0-unknown.
                if (pkg.name?.endsWith(PACKAGE_SUFFIX) && typeof pkg.version === 'string') return pkg.version
            }
            const parent = dirname(dir)
            if (parent === dir) break
            dir = parent
        }
    } catch {
        // Fall through to the sentinel below.
    }

    return '0.0.0-unknown'
} )()

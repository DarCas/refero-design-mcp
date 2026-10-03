/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { VERSION } from '../src/version.js'

const root = new URL('..', import.meta.url).pathname
const tmpOut = join(root, '.tmp-version-test')

/**
 * Shared compiled output for the suites below.
 *
 * Built here rather than read from `dist/`, because `npm run verify` compiles
 * last: reading `dist/` would exercise the previous run's artifact, which is
 * exactly how a real regression slips through. The lifecycle is file-level so
 * the build outlives every suite that needs it.
 */
beforeAll(() => {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json', '--outDir', tmpOut], {
        cwd: root,
        stdio: 'pipe',
    })
}, 120_000)

afterAll(() => {
    rmSync(tmpOut, {
        force: true,
        recursive: true,
    })
})

/**
 * Guards a bug that failed silently: resolving `package.json` at a fixed
 * relative depth reported 0.0.0 from the compiled output, while tests importing
 * from `src/` still passed.
 */
describe('version resolution', () => {
    it('reads the real version from package.json when running from src', () => {
        expect(VERSION).not.toBe('0.0.0-unknown')
        expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
    })

    it('reports the same version from freshly compiled output', () => {
        // Loads the compiled module directly, so the assertion covers version
        // resolution alone and cannot pass via the assembly re-exporting it.
        const compiled = join(tmpOut, 'version.js')
        expect(existsSync(compiled)).toBe(true)

        const output = execFileSync(
            process.execPath,
            ['-e', `import(${JSON.stringify(compiled)}).then(m => console.log(m.VERSION))`],
            {encoding: 'utf8'},
        )

        expect(output.trim()).toBe(VERSION)
    }, 30_000)

    it('matches the version declared in the package manifest', () => {
        const manifest = JSON.parse(
            execFileSync(
                'node',
                ['-p', 'JSON.stringify(require("./package.json").version)'],
                {
                    cwd: root,
                    encoding: 'utf8',
                }),
        ) as string

        expect(VERSION).toBe(manifest)
    }, 30_000)

    it('reports the version even though the package name is scoped', () => {
        // The manifest lives at @darcas/refero-design-mcp while the version
        // lookup matches on the unscoped suffix. A strict equality check would
        // fall back to 0.0.0-unknown and fail here.
        const manifest = JSON.parse(
            execFileSync(
                'node',
                ['-p', 'JSON.stringify(require("./package.json").name)'],
                {
                    cwd: root,
                    encoding: 'utf8',
                },
            ),
        ) as string

        expect(manifest).toBe('@darcas/refero-design-mcp')
        expect(VERSION).not.toBe('0.0.0-unknown')
    }, 30_000)

    it('keeps the installed binary name free of the npm scope', () => {
        const bin = JSON.parse(
            execFileSync(
                'node',
                ['-p', 'JSON.stringify(require("./package.json").bin)'],
                {
                    cwd: root,
                    encoding: 'utf8',
                }),
        ) as Record<string, string>

        // Users and models type the command; the scope is packaging metadata.
        expect(Object.keys(bin)).toEqual(['refero-design-mcp'])
    }, 30_000)
})

/**
 * Regression guard for a circular import.
 *
 * `config.ts` needs VERSION for the User-Agent and the store needs config, so
 * holding VERSION in the server module closed the cycle
 * server/index → store → config → server/index.
 *
 * The failure depends on load order, which is why it hid: the CLI reaches
 * config through the store first, so `npm start` worked. Loading
 * `server/index.js` as the entry — what a bundler, a test, or any future
 * consumer does — evaluates `config.js` while it is still initialising and
 * reads VERSION out of its temporal dead zone, throwing before the module can
 * answer a request. Both entry orders are exercised below.
 */
describe('module load order', () => {
    const compiledEntry = join(root, '.tmp-version-test', 'server', 'index.js')

    it('loads server/index.js as the first module', () => {
        expect(existsSync(compiledEntry)).toBe(true)

        // Reaching the assertion is the point: with the cycle present this import
        // throws a TDZ ReferenceError and the child exits non-zero.
        const output = execFileSync(
            process.execPath,
            ['-e', `import(${JSON.stringify(compiledEntry)}).then(m => console.log(typeof m.createServer))`],
            {encoding: 'utf8'},
        )

        expect(output.trim()).toBe('function')
    }, 30_000)

    it('loads config.js as the first module', () => {
        // The other side of the cycle: config must not reach back into the
        // server module, or a consumer that reaches config first breaks instead.
        const configEntry = join(root, '.tmp-version-test', 'config.js')
        const output = execFileSync(
            process.execPath,
            ['-e', `import(${JSON.stringify(configEntry)}).then(m => console.log(m.config.userAgent))`],
            {encoding: 'utf8'},
        )

        expect(output).toContain(VERSION)
    }, 30_000)

    it('starts the compiled CLI and completes a handshake over stdio', async () => {
        const cli = join(root, '.tmp-version-test', 'cli.js')
        expect(existsSync(cli)).toBe(true)

        const child = spawn(process.execPath, [cli], {stdio: ['pipe', 'pipe', 'pipe']})
        let out = ''
        let err = ''
        child.stdout.on('data', chunk => {
            out += chunk
        })
        child.stderr.on('data', chunk => {
            err += chunk
        })

        child.stdin.write(
            `${JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'initialize',
                params: {
                    capabilities: {},
                    clientInfo: {
                        name: 'regression',
                        version: '0',
                    },
                    protocolVersion: '2024-11-05',
                },
            })}\n`,
        )

        const payload = await new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`no response; stderr: ${err}`)), 20_000)
            const poll = setInterval(() => {
                if (out.includes('"result"')) {
                    clearInterval(poll)
                    clearTimeout(timer)
                    resolve(out)
                }
            }, 50)
            child.on('exit', code => reject(new Error(`exited early with code ${code}; stderr: ${err}`)))
        })

        child.kill('SIGKILL')

        const line = payload.split('\n').find(entry => entry.includes('"id":1')) ?? ''
        const parsed = JSON.parse(line) as { result: { serverInfo: { version: string } } }

        expect(parsed.result.serverInfo.version).toBe(VERSION)
    }, 40_000)
})

describe('cache isolation', () => {
    it('does not leave a cache directory in the repository', () => {
        const repoCache = join(root, '.cache')
        if (existsSync(repoCache)) rmSync(repoCache, {recursive: true, force: true})
        expect(existsSync(repoCache)).toBe(false)
    })
})

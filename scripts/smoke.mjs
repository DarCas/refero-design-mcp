/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Runtime smoke test: prove the built server starts on *this* Node.
 *
 * `engines.node` is a promise to consumers, and CI only runs one Node version,
 * so nothing else here verifies it. This script performs the MCP `initialize`
 * handshake against the compiled artifact and reports the server it reached.
 *
 * Deliberately offline: it asserts that the module graph loads and the
 * transport works, which is what a Node floor is about. Live behaviour is
 * covered by `test/e2e.test.ts`.
 *
 *   node scripts/smoke.mjs            # uses the current node
 *   node scripts/smoke.mjs --quiet
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = new URL('../', import.meta.url)
const CLI = new URL('dist/cli.js', ROOT)
const QUIET = process.argv.includes('--quiet')

/** Generous: a cold module graph on a slow CI runner is still far under this. */
const HANDSHAKE_TIMEOUT_MS = 30_000

function fail(message) {
    process.stderr.write(`smoke: ${message}\n`)
    process.exit(1)
}

const child = spawn(process.execPath, [fileURLToPath(CLI)], {
    stdio: ['pipe', 'pipe', 'pipe'],
})

let out = ''
let stderr = ''
child.stdout.on('data', chunk => {
    out += chunk
})
child.stderr.on('data', chunk => {
    stderr += chunk
})
child.on('exit', code => fail(`server exited early with code ${code}\n${stderr}`))

child.stdin.write(
    `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {name: 'smoke', version: '0.0.0'},
        },
    })}\n`,
)

const timer = setTimeout(() => {
    child.kill('SIGKILL')
    fail(`no initialize response within ${HANDSHAKE_TIMEOUT_MS} ms\n${stderr}`)
}, HANDSHAKE_TIMEOUT_MS)

const poll = setInterval(() => {
    const line = out.split('\n').find(entry => entry.includes('"id":1'))
    if (!line) return

    clearInterval(poll)
    clearTimeout(timer)
    child.kill('SIGKILL')

    let parsed
    try {
        parsed = JSON.parse(line)
    } catch (error) {
        return fail(`initialize response is not JSON: ${error.message}`)
    }

    const info = parsed.result?.serverInfo
    if (!info) return fail(`no serverInfo in initialize response: ${line.slice(0, 200)}`)

    const capabilities = Object.keys(parsed.result?.capabilities ?? {}).sort()
    for (const required of ['tools', 'resources']) {
        if (!capabilities.includes(required)) {
            return fail(`server does not advertise "${required}" (got: ${capabilities.join(', ') || 'none'})`)
        }
    }

    if (!QUIET) {
        process.stdout.write(`smoke: node ${process.version} ok — ${info.name} ${info.version} [${capabilities.join(', ')}]\n`)
    }
    process.exit(0)
}, 50)
/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Runtime smoke test for the Streamable HTTP entry point.
 *
 * Starts `dist/cli-http.js` on a free port, checks `/health`, performs the MCP
 * `initialize` handshake over POST and lists the tools. Offline, like
 * `smoke.mjs`: it proves the transport and the module graph, not the upstream.
 *
 *   node scripts/smoke-http.mjs
 *   node scripts/smoke-http.mjs --quiet
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = new URL('../', import.meta.url)
const CLI = new URL('dist/cli-http.js', ROOT)
const QUIET = process.argv.includes('--quiet')
const STARTUP_TIMEOUT_MS = 30_000

function fail(message) {
    try {
        child.kill('SIGKILL')
    } catch {
        // Already exited — the 'exit' listener below already reported it.
    }
    process.stderr.write(`smoke-http: ${message}\n`)
    process.exit(1)
}

const child = spawn(process.execPath, [fileURLToPath(CLI)], {
    env: { ...process.env, REFERO_HTTP_HOST: '127.0.0.1', REFERO_HTTP_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
})

let stderr = ''
child.on('exit', code => fail(`server exited early with code ${code}\n${stderr}`))

/** The server prints where it bound; port 0 means we have to read it back. */
const url = await new Promise(resolve => {
    const timer = setTimeout(() => {
        child.kill('SIGKILL')
        fail(`server did not start within ${STARTUP_TIMEOUT_MS} ms\n${stderr}`)
    }, STARTUP_TIMEOUT_MS)

    child.stderr.on('data', chunk => {
        stderr += chunk
        const match = stderr.match(/listening on (http:\/\/\S+)/)
        if (!match) return

        clearTimeout(timer)
        resolve(match[ 1 ])
    })
})

const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }

async function rpc(id, method, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    })
    if (!response.ok) fail(`${method} answered ${response.status}`)

    // Streamable HTTP answers with either JSON or a one-event SSE stream.
    const text = await response.text()
    const payload = text.startsWith('{') ? text : text.split('\n').find(line => line.startsWith('data:'))?.slice(5)
    if (!payload) fail(`${method}: no payload in response: ${text.slice(0, 200)}`)

    return JSON.parse(payload)
}

try {
    const health = await fetch(new URL('/health', url))
    if (!health.ok) fail(`/health answered ${health.status}`)

    const init = await rpc(1, 'initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'smoke-http', version: '0.0.0' },
    })
    const info = init.result?.serverInfo
    if (!info) fail(`no serverInfo in initialize response: ${JSON.stringify(init).slice(0, 200)}`)

    const list = await rpc(2, 'tools/list', {})
    const tools = ( list.result?.tools ?? [] ).map(tool => tool.name)
    if (!tools.includes('refero_search_styles')) fail(`tools/list is missing refero_search_styles (got: ${tools.join(', ') || 'none'})`)

    if (!QUIET) {
        process.stdout.write(`smoke-http: node ${process.version} ok — ${info.name} ${info.version}, ${tools.length} tools\n`)
    }

    child.removeAllListeners('exit')
    child.kill('SIGKILL')
    process.exit(0)
} catch (error) {
    fail(String(error))
}

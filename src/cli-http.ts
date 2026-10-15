#!/usr/bin/env node

/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Entry point: serve the MCP protocol over Streamable HTTP.
 *
 * Stateless by design: every POST gets its own `McpServer` and transport, so
 * there is no session to lose on restart and the process can sit behind any
 * load balancer. The tools are read-only over a shared on-disk cache, which is
 * what makes that safe — nothing a request does depends on the one before it.
 *
 * No authentication: put it behind a reverse proxy or a private network if the
 * endpoint must not be public.
 *
 * Nothing here writes to stdout; diagnostics go through `log()`, to stderr.
 */

import { createServer as createHttpServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { log } from './http.js'
import { createServer } from './server/index.js'
import { VERSION } from './version.js'

const MCP_PATH = '/mcp'
const HEALTH_PATH = '/health'

/** A JSON-RPC request is a few KB. One MiB is generous and bounds memory. */
const MAX_BODY_BYTES = 1024 * 1024

function readPort(): number {
    const raw = process.env.REFERO_HTTP_PORT?.trim() || process.env.PORT?.trim() || '3000'
    const port = Number.parseInt(raw, 10)

    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
        throw new Error(`Invalid port: expected 0-65535, got "${raw}"`)
    }

    return port
}

/** Loopback by default; the container image sets `REFERO_HTTP_HOST=0.0.0.0`. */
const HOST = process.env.REFERO_HTTP_HOST?.trim() || '127.0.0.1'

class PayloadTooLargeError extends Error {
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of req) {
        const buffer = chunk as Buffer
        size += buffer.length
        if (size > MAX_BODY_BYTES) throw new PayloadTooLargeError()
        chunks.push(buffer)
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function sendJson(
    res: ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
): void {
    if (res.headersSent) return

    res.writeHead(status, {
        'Content-Type': 'application/json',
        ...headers,
    }).end(JSON.stringify(body))
}

function sendRpcError(
    res: ServerResponse,
    status: number,
    code: number,
    message: string,
    headers: Record<string, string> = {},
): void {
    sendJson(res, status, {
        error: {
            code,
            message,
        },
        id: null,
        jsonrpc: '2.0',
    }, headers)
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
        sendRpcError(res, 405, -32_000, 'Method not allowed: this server is stateless, use POST', {Allow: 'POST'})
        return
    }

    let body: unknown
    try {
        body = await readJsonBody(req)
    } catch (error) {
        if (error instanceof PayloadTooLargeError) {
            sendRpcError(res, 413, -32_600, 'Request body too large')
        } else {
            sendRpcError(res, 400, -32_700, 'Parse error: body is not valid JSON')
        }
        return
    }

    const server = createServer()
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    })

    // The transport is single-use: release both once the response is done, or
    // every request leaks a server and its handlers.
    res.on('close', () => {
        void transport.close()
        void server.close()
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, body)
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const {pathname} = new URL(req.url ?? '/', 'http://localhost')

    if (pathname === MCP_PATH) {
        await handleMcp(req, res)
        return
    }

    if (pathname === HEALTH_PATH &&
        req.method === 'GET'
    ) {
        sendJson(res, 200, {
            status: 'ok',
            version: VERSION,
        })
        return
    }

    // A body on a HEAD response is bytes the client never asked for, so none
    // is sent and no length is declared: the close delimits the response.
    // (Declaring the GET-equivalent length is RFC-legal but makes some clients
    // wait out 33 bytes that will never arrive — verified against curl.)
    if (pathname === HEALTH_PATH && req.method === 'HEAD') {
        if (!res.headersSent) {
            res.writeHead(200, {
                Connection: 'close',
                'Content-Type': 'application/json',
            })
        }
        res.end()
        return
    }

    sendJson(res, 404, {
        error: 'Not found',
        health: HEALTH_PATH,
        mcp: MCP_PATH,
    })
}

( function main(): void {
    const port = readPort()

    const httpServer = createHttpServer((req, res) => {
        route(req, res).catch((error: unknown) => {
            log(`request failed: ${String(error)}`)
            sendRpcError(res, 500, -32_603, 'Internal server error')
        })
    })

    // The default 5 s keep-alive is shorter than most proxies' idle timeout,
    // which surfaces as sporadic 502s from the proxy on a reused connection.
    httpServer.keepAliveTimeout = 65_000

    const shutdown = (signal: NodeJS.Signals): void => {
        log(`received ${signal}, shutting down`)

        httpServer.close(() => process.exit(0))
        httpServer.closeIdleConnections()
        // Streaming responses can hold a connection open; do not wait on them forever.
        setTimeout(() => process.exit(0), 5_000).unref()
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    httpServer.on('error', (error: Error) => {
        process.stderr.write(`[refero-design-mcp] fatal: ${String(error)}\n`)
        process.exit(1)
    })

    httpServer.listen(port, HOST, () => {
        const address = httpServer.address()
        const bound = typeof address === 'object' && address !== null ? address.port : port

        // Not gated on REFERO_VERBOSE: an operator needs to see where it listens.
        process.stderr.write(`[refero-design-mcp] listening on http://${HOST}:${bound}${MCP_PATH}\n`)
    })
} )()
